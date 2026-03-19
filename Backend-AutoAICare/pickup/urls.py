from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PickupDropRequestViewSet

router = DefaultRouter()
router.register(r'', PickupDropRequestViewSet, basename='pickup')

urlpatterns = [
    path('', include(router.urls)),
]
