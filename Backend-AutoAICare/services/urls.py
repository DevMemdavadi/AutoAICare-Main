from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServicePackageViewSet, AddOnViewSet, PublicServicePackagesView, PublicAddOnsView
from .views_parts import ServicePackagePartViewSet

router = DefaultRouter()
router.register(r'packages', ServicePackageViewSet, basename='servicepackage')
router.register(r'addons', AddOnViewSet, basename='addon')
router.register(r'package-parts', ServicePackagePartViewSet, basename='servicepackagepart')

urlpatterns = [
    path('', include(router.urls)),
    # Public (no-auth) endpoints: company-wise packages and add-ons
    path('public/packages/', PublicServicePackagesView.as_view(), name='public-service-packages'),
    path('public/addons/', PublicAddOnsView.as_view(), name='public-addons'),
]
