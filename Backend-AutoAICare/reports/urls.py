"""
Reports URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, ScheduledReportViewSet

router = DefaultRouter()
router.register(r'scheduled', ScheduledReportViewSet, basename='scheduled-report')

urlpatterns = [
    # Report generation endpoints
    path('generate/revenue/pdf/', ReportViewSet.as_view({'get': 'revenue_pdf'}), name='revenue-pdf'),
    path('generate/revenue/excel/', ReportViewSet.as_view({'get': 'revenue_excel'}), name='revenue-excel'),
    path('generate/customer/pdf/', ReportViewSet.as_view({'get': 'customer_pdf'}), name='customer-pdf'),
    path('generate/customer/excel/', ReportViewSet.as_view({'get': 'customer_excel'}), name='customer-excel'),
    path('generate/lead/pdf/', ReportViewSet.as_view({'get': 'lead_pdf'}), name='lead-pdf'),
    path('generate/analytics/pdf/', ReportViewSet.as_view({'get': 'analytics_summary_pdf'}), name='analytics-pdf'),
    
    # Scheduled reports
    path('', include(router.urls)),
]
