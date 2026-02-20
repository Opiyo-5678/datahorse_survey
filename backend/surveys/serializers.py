from rest_framework import serializers
from .models import Survey, Question, AnswerOption, Response, Answer


class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AnswerOption
        fields = ['id', 'text', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = ['id', 'heading', 'text', 'question_type', 'order', 'is_required', 'options']


class SurveyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the admin survey list."""
    response_count = serializers.IntegerField(read_only=True)
    question_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = Survey
        fields = ['id', 'title', 'slug', 'status', 'show_results',
                  'response_count', 'question_count', 'created_by_name', 'created_at']

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return '—'


class SurveyDetailSerializer(serializers.ModelSerializer):
    """Full serializer including questions — used in builder and public view."""
    questions = QuestionSerializer(many=True, read_only=True)
    response_count = serializers.IntegerField(read_only=True)
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model  = Survey
        fields = ['id', 'title', 'description', 'slug', 'cover_image_url',
                  'status', 'show_results', 'response_count', 'questions', 'created_at']

    def get_cover_image_url(self, obj):
        request = self.context.get('request')
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None


class SurveyWriteSerializer(serializers.ModelSerializer):
    """Used for create/update operations."""
    class Meta:
        model  = Survey
        fields = ['title', 'description', 'slug', 'cover_image', 'status', 'show_results']


class QuestionWriteSerializer(serializers.ModelSerializer):
    options_data = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )

    class Meta:
        model  = Question
        fields = ['id', 'heading', 'text', 'question_type', 'order', 'is_required', 'options_data']

    def create(self, validated_data):
        options_data = validated_data.pop('options_data', [])
        question = Question.objects.create(**validated_data)
        for i, opt in enumerate(options_data):
            AnswerOption.objects.create(question=question, text=opt.get('text', ''), order=i)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options_data', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if options_data is not None:
            instance.options.all().delete()
            for i, opt in enumerate(options_data):
                AnswerOption.objects.create(question=instance, text=opt.get('text', ''), order=i)
        return instance


class AnswerSubmitSerializer(serializers.Serializer):
    question_id  = serializers.IntegerField()
    option_ids   = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    text_answer  = serializers.CharField(required=False, allow_blank=True, default='')


class ResponseSubmitSerializer(serializers.Serializer):
    answers = AnswerSubmitSerializer(many=True)
