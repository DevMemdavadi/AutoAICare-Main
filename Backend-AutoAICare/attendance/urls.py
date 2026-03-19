from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceRecordViewSet,
    AttendancePolicyViewSet,
    MonthlyAttendanceSummaryViewSet
)

router = DefaultRouter()
router.register(r'records', AttendanceRecordViewSet, basename='attendance-record')
router.register(r'policies', AttendancePolicyViewSet, basename='attendance-policy')
router.register(r'monthly-summaries', MonthlyAttendanceSummaryViewSet, basename='monthly-summary')

urlpatterns = [
    path('', include(router.urls)),
]
