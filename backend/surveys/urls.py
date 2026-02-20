from django.urls import path
from . import views
from .user_views import UserListCreateView, UserDetailView

urlpatterns = [
    # Admin dashboard stats
    path('dashboard/', views.DashboardStatsView.as_view()),

    # Admin — Survey CRUD
    path('surveys/', views.SurveyListCreateView.as_view()),
    path('surveys/<int:pk>/', views.SurveyDetailView.as_view()),

    # Admin — Questions
    path('surveys/<int:survey_id>/questions/', views.QuestionCreateView.as_view()),
    path('surveys/<int:survey_id>/questions/reorder/', views.QuestionReorderView.as_view()),
    path('questions/<int:pk>/', views.QuestionDetailView.as_view()),

    # Admin — Export
    path('surveys/<int:pk>/export/csv/', views.ExportCSVView.as_view()),
    path('surveys/<int:pk>/export/pdf/', views.ExportPDFView.as_view()),

    # Admin + Public — Results
    path('surveys/<slug:slug>/results/', views.SurveyResultsView.as_view()),

    # Public — Survey view and submit
    path('public/surveys/<slug:slug>/', views.PublicSurveyView.as_view()),
    path('public/surveys/<slug:slug>/submit/', views.SubmitResponseView.as_view()),
    # Admin — User management
    path('users/', UserListCreateView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
]
