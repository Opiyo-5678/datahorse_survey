from django.contrib import admin
from .models import Survey, Question, AnswerOption, Response, Answer

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0

class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 0

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'status', 'response_count', 'created_at']
    inlines = [QuestionInline]
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['text', 'survey', 'question_type', 'order', 'is_required']
    inlines = [AnswerOptionInline]

@admin.register(Response)
class ResponseAdmin(admin.ModelAdmin):
    list_display = ['survey', 'ip_address', 'submitted_at']

admin.site.register(AnswerOption)
admin.site.register(Answer)
