from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BranchViewSet, ServiceBayViewSet, PublicBranchesView

router = DefaultRouter()
router.register(r'bays', ServiceBayViewSet, basename='service-bay')
router.register(r'', BranchViewSet, basename='branch')

urlpatterns = [
    # Public (no-auth) endpoint: returns active branches for a given company
    path('public/', PublicBranchesView.as_view(), name='public-branches'),
    path('', include(router.urls)),
]
