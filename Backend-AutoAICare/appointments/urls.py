from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, AppointmentSlotViewSet, PublicAppointmentView

# Use separate routers to avoid potential conflicts
appointment_router = DefaultRouter()
appointment_router.register(r'', AppointmentViewSet, basename='appointment')

slot_router = DefaultRouter()
slot_router.register(r'', AppointmentSlotViewSet, basename='appointment-slot')

urlpatterns = [
    # Public endpoint for K3 website (no auth required)
    path('public/', PublicAppointmentView.as_view(), name='public-appointment'),
    path('slots/', include(slot_router.urls)),
    path('', include(appointment_router.urls)),
]

