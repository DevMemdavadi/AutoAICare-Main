from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerProfileView, VehicleListCreateView, VehicleDetailView, 
    AdminVehicleListCreateView, AdminVehicleDetailView, AdminVehicleListByUserView, AdminCustomerDetailView,
    VehicleBrandListCreateView, VehicleBrandRetrieveUpdateView,
    VehicleModelListCreateView, VehicleModelRetrieveUpdateView,
    VehicleColorListView, VehicleTypeDetectionView
)
from .reminder_views import (
    ServiceReminderListView, ServiceReminderActionView, ServiceReminderStatsView
)
from .referral_views import ReferralViewSet, ReferralCodeViewSet

# Router for referral viewsets
router = DefaultRouter()
router.register(r'referrals', ReferralViewSet, basename='referral')
router.register(r'referral-codes', ReferralCodeViewSet, basename='referral-code')

urlpatterns = [
    path('me/', CustomerProfileView.as_view(), name='customer-profile'),
    path('vehicles/', VehicleListCreateView.as_view(), name='vehicle-list-create'),
    path('vehicles/<int:pk>/', VehicleDetailView.as_view(), name='vehicle-detail'),
    path('admin/vehicles/', AdminVehicleListCreateView.as_view(), name='admin-vehicle-list-create'),
    path('admin/vehicles/<int:pk>/', AdminVehicleDetailView.as_view(), name='admin-vehicle-detail'),
    path('admin/vehicles/by-user/', AdminVehicleListByUserView.as_view(), name='admin-vehicle-list-by-user'),
    path('admin/customer-profile/<int:user_id>/', AdminCustomerDetailView.as_view(), name='admin-customer-detail'),
    
    # Vehicle data endpoints
    path('vehicle-brands/', VehicleBrandListCreateView.as_view(), name='vehicle-brand-list-create'),
    path('vehicle-brands/<int:pk>/', VehicleBrandRetrieveUpdateView.as_view(), name='vehicle-brand-detail'),
    path('vehicle-models/', VehicleModelListCreateView.as_view(), name='vehicle-model-list-create'),
    path('vehicle-models/<int:pk>/', VehicleModelRetrieveUpdateView.as_view(), name='vehicle-model-detail'),
    path('vehicle-models/detect-type/', VehicleTypeDetectionView.as_view(), name='vehicle-type-detection'),
    path('vehicle-colors/', VehicleColorListView.as_view(), name='vehicle-color-list'),

    # Service Reminder Endpoints
    path('reminders/', ServiceReminderListView.as_view(), name='reminder-list'),
    path('reminders/stats/', ServiceReminderStatsView.as_view(), name='reminder-stats'),
    path('reminders/<int:pk>/action/', ServiceReminderActionView.as_view(), name='reminder-action'),
]

# Include router URLs
urlpatterns += router.urls
