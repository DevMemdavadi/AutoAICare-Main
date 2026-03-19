from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkflowTemplateViewSet,
    WorkflowExecutionViewSet,
    WorkflowAnalyticsViewSet
)

router = DefaultRouter()
router.register(r'workflows', WorkflowTemplateViewSet, basename='workflow')
router.register(r'executions', WorkflowExecutionViewSet, basename='execution')
router.register(r'analytics', WorkflowAnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]
