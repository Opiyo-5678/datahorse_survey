from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.http import HttpResponse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response as DRFResponse
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import csv
import io

from .models import Survey, Question, AnswerOption, Response, Answer
from .serializers import (
    SurveyListSerializer, SurveyDetailSerializer, SurveyWriteSerializer,
    QuestionWriteSerializer, QuestionSerializer, ResponseSubmitSerializer
)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# ─────────────────────────────────────────
# ADMIN — Survey CRUD
# ─────────────────────────────────────────

class SurveyListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        surveys = Survey.objects.all()
        serializer = SurveyListSerializer(surveys, many=True)
        return DRFResponse(serializer.data)

    def post(self, request):
        serializer = SurveyWriteSerializer(data=request.data)
        if serializer.is_valid():
            survey = serializer.save(created_by=request.user)
            return DRFResponse(SurveyDetailSerializer(survey, context={'request': request}).data,
                               status=status.HTTP_201_CREATED)
        return DRFResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SurveyDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        return get_object_or_404(Survey, pk=pk)

    def get(self, request, pk):
        survey = self.get_object(pk)
        return DRFResponse(SurveyDetailSerializer(survey, context={'request': request}).data)

    def put(self, request, pk):
        survey = self.get_object(pk)
        serializer = SurveyWriteSerializer(survey, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return DRFResponse(SurveyDetailSerializer(survey, context={'request': request}).data)
        return DRFResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        survey = self.get_object(pk)
        survey.delete()
        return DRFResponse(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────
# ADMIN — Question CRUD
# ─────────────────────────────────────────

class QuestionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, survey_id):
        survey = get_object_or_404(Survey, pk=survey_id)
        # Auto-assign order
        next_order = survey.questions.count()
        data = request.data.copy()
        data['order'] = next_order
        serializer = QuestionWriteSerializer(data=data)
        if serializer.is_valid():
            question = serializer.save(survey=survey)
            return DRFResponse(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)
        return DRFResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuestionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        question = get_object_or_404(Question, pk=pk)
        serializer = QuestionWriteSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return DRFResponse(QuestionSerializer(question).data)
        return DRFResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        question = get_object_or_404(Question, pk=pk)
        question.delete()
        return DRFResponse(status=status.HTTP_204_NO_CONTENT)


class QuestionReorderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, survey_id):
        """Expects: { "order": [q_id1, q_id2, q_id3] }"""
        order = request.data.get('order', [])
        for index, q_id in enumerate(order):
            Question.objects.filter(pk=q_id, survey_id=survey_id).update(order=index)
        return DRFResponse({'status': 'reordered'})


# ─────────────────────────────────────────
# PUBLIC — Survey by slug
# ─────────────────────────────────────────

class PublicSurveyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        survey = get_object_or_404(Survey, slug=slug, status='active')
        serializer = SurveyDetailSerializer(survey, context={'request': request})
        return DRFResponse(serializer.data)


# ─────────────────────────────────────────
# PUBLIC — Submit response
# ─────────────────────────────────────────

class SubmitResponseView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, slug):
        survey = get_object_or_404(Survey, slug=slug, status='active')
        ip = get_client_ip(request)

        # Duplicate IP check
        if Response.objects.filter(survey=survey, ip_address=ip).exists():
            return DRFResponse(
                {'detail': 'You have already submitted a response to this survey.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ResponseSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return DRFResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Save response
        response_obj = Response.objects.create(survey=survey, ip_address=ip)

        for ans_data in serializer.validated_data['answers']:
            question = get_object_or_404(Question, pk=ans_data['question_id'], survey=survey)
            answer = Answer.objects.create(
                response=response_obj,
                question=question,
                text_answer=ans_data.get('text_answer', '')
            )
            option_ids = ans_data.get('option_ids', [])
            if option_ids:
                options = AnswerOption.objects.filter(pk__in=option_ids, question=question)
                answer.options.set(options)

        return DRFResponse({'detail': 'Response submitted successfully.'}, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────
# PUBLIC + ADMIN — Results
# ─────────────────────────────────────────

class SurveyResultsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        survey = get_object_or_404(Survey, slug=slug)

        # If not admin and results hidden, block
        if not request.user.is_authenticated and not survey.show_results:
            return DRFResponse({'detail': 'Results are not public for this survey.'}, status=403)

        total_responses = survey.responses.count()
        results = []

        for question in survey.questions.all():
            q_data = {
                'id':            question.id,
                'heading':       question.heading,
                'text':          question.text,
                'question_type': question.question_type,
                'options':       [],
                'text_answers':  [],
            }

            if question.question_type in ['single', 'multiple']:
                for option in question.options.all():
                    count = Answer.objects.filter(
                        question=question,
                        options=option
                    ).count()
                    pct = round((count / total_responses * 100), 1) if total_responses > 0 else 0
                    q_data['options'].append({
                        'id':      option.id,
                        'text':    option.text,
                        'count':   count,
                        'percent': pct,
                    })
            else:
                # Open text — return all non-empty answers
                text_answers = Answer.objects.filter(
                    question=question
                ).exclude(text_answer='').values_list('text_answer', flat=True)
                q_data['text_answers'] = list(text_answers)

            results.append(q_data)

        return DRFResponse({
            'survey_title':    survey.title,
            'total_responses': total_responses,
            'results':         results,
        })


# ─────────────────────────────────────────
# ADMIN — Export CSV
# ─────────────────────────────────────────

class ExportCSVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        survey = get_object_or_404(Survey, pk=pk)
        questions = survey.questions.all()

        output = io.StringIO()
        writer = csv.writer(output)

        # Header row
        header = ['Response #', 'IP Address', 'Submitted At']
        for q in questions:
            header.append(q.text[:50])
        writer.writerow(header)

        # Data rows
        for i, resp in enumerate(survey.responses.all(), 1):
            row = [i, resp.ip_address, resp.submitted_at.strftime('%Y-%m-%d %H:%M')]
            for q in questions:
                try:
                    answer = resp.answers.get(question=q)
                    if q.question_type == 'text':
                        row.append(answer.text_answer)
                    else:
                        selected = ', '.join([opt.text for opt in answer.options.all()])
                        row.append(selected)
                except Answer.DoesNotExist:
                    row.append('')
            writer.writerow(row)

        output.seek(0)
        response = HttpResponse(output, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{survey.slug}-results.csv"'
        return response


# ─────────────────────────────────────────
# ADMIN — Export PDF
# ─────────────────────────────────────────

class ExportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import cm

        survey = get_object_or_404(Survey, pk=pk)
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                leftMargin=2*cm, rightMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)

        GREEN  = colors.HexColor('#2E7D32')
        BLUE   = colors.HexColor('#2B6CB0')
        LGRAY  = colors.HexColor('#F5F6F8')
        DTEXT  = colors.HexColor('#1A1A2E')

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('Title', fontSize=20, textColor=GREEN, spaceAfter=6, fontName='Helvetica-Bold')
        h2_style    = ParagraphStyle('H2',    fontSize=13, textColor=BLUE,  spaceAfter=4, fontName='Helvetica-Bold')
        body_style  = ParagraphStyle('Body',  fontSize=10, textColor=DTEXT, spaceAfter=4, fontName='Helvetica')
        small_style = ParagraphStyle('Small', fontSize=9,  textColor=colors.grey, fontName='Helvetica-Oblique')

        story = []
        story.append(Paragraph(f'Survey Results: {survey.title}', title_style))
        story.append(Paragraph(f'Total responses: {survey.responses.count()}', small_style))
        story.append(Spacer(1, 0.5*cm))

        for question in survey.questions.all():
            story.append(Paragraph(question.text, h2_style))
            if question.heading:
                story.append(Paragraph(question.heading, small_style))

            if question.question_type in ['single', 'multiple']:
                total = survey.responses.count()
                data = [['Option', 'Responses', '%']]
                for opt in question.options.all():
                    count = Answer.objects.filter(question=question, options=opt).count()
                    pct = f'{round(count/total*100, 1)}%' if total > 0 else '0%'
                    data.append([opt.text, str(count), pct])

                t = Table(data, colWidths=[10*cm, 3*cm, 3*cm])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), GREEN),
                    ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
                    ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE',   (0, 0), (-1, -1), 9),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LGRAY]),
                    ('GRID',       (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ]))
                story.append(t)
            else:
                answers = Answer.objects.filter(question=question).exclude(text_answer='')
                for ans in answers:
                    story.append(Paragraph(f'• {ans.text_answer}', body_style))

            story.append(Spacer(1, 0.4*cm))

        doc.build(story)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{survey.slug}-results.pdf"'
        return response


# ─────────────────────────────────────────
# ADMIN — Dashboard stats
# ─────────────────────────────────────────

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_surveys   = Survey.objects.count()
        active_surveys  = Survey.objects.filter(status='active').count()
        total_responses = Response.objects.count()
        return DRFResponse({
            'total_surveys':   total_surveys,
            'active_surveys':  active_surveys,
            'total_responses': total_responses,
        })
