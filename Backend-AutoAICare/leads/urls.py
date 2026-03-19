from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeadSourceViewSet, LeadViewSet, LeadActivityViewSet,
    LeadFollowUpViewSet, LeadConversionViewSet
)

router = DefaultRouter()
router.register(r'sources', LeadSourceViewSet, basename='lead-source')
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'activities', LeadActivityViewSet, basename='lead-activity')
router.register(r'followups', LeadFollowUpViewSet, basename='lead-followup')
router.register(r'conversions', LeadConversionViewSet, basename='lead-conversion')

urlpatterns = [
    path('', include(router.urls)),
]
