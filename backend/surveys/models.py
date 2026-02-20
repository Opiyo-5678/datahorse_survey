from django.db import models
from django.contrib.auth.models import User
import uuid


class Survey(models.Model):
    STATUS_CHOICES = [
        ('draft',   'Draft'),
        ('active',  'Active'),
        ('closed',  'Closed'),
    ]

    title        = models.CharField(max_length=255)
    description  = models.TextField(blank=True)
    slug         = models.SlugField(max_length=120, unique=True)
    cover_image  = models.ImageField(upload_to='survey_covers/', blank=True, null=True)
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    show_results = models.BooleanField(default=True, help_text='Show results to respondents after submitting')
    created_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def response_count(self):
        return self.responses.count()


class Question(models.Model):
    TYPE_CHOICES = [
        ('single',   'Single Choice'),
        ('multiple', 'Multiple Choice'),
        ('text',     'Open Text'),
    ]

    survey        = models.ForeignKey(Survey, related_name='questions', on_delete=models.CASCADE)
    heading       = models.CharField(max_length=255, blank=True, help_text='Optional heading above the question')
    text          = models.TextField(help_text='The main question text')
    question_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='single')
    order         = models.PositiveIntegerField(default=0)
    is_required   = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"[{self.survey.title}] Q{self.order}: {self.text[:60]}"


class AnswerOption(models.Model):
    question = models.ForeignKey(Question, related_name='options', on_delete=models.CASCADE)
    text     = models.CharField(max_length=500)
    order    = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text


class Response(models.Model):
    survey       = models.ForeignKey(Survey, related_name='responses', on_delete=models.CASCADE)
    ip_address   = models.GenericIPAddressField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']
        # One IP per survey
        unique_together = ['survey', 'ip_address']

    def __str__(self):
        return f"Response to '{self.survey.title}' from {self.ip_address}"


class Answer(models.Model):
    response     = models.ForeignKey(Response, related_name='answers', on_delete=models.CASCADE)
    question     = models.ForeignKey(Question, on_delete=models.CASCADE)
    # For choice questions — can have multiple for multiple-choice
    options      = models.ManyToManyField(AnswerOption, blank=True)
    # For open text questions
    text_answer  = models.TextField(blank=True)

    def __str__(self):
        return f"Answer to Q{self.question.order}"
