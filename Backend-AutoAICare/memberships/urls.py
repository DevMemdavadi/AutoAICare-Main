"""
URL configuration for memberships app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MembershipPlanViewSet,
    MembershipBenefitViewSet,
    CustomerMembershipViewSet,
    CouponViewSet,
    CouponUsageViewSet
)

router = DefaultRouter()
router.register(r'plans', MembershipPlanViewSet, basename='membership-plan')
router.register(r'benefits', MembershipBenefitViewSet, basename='membership-benefit')
router.register(r'subscriptions', CustomerMembershipViewSet, basename='customer-membership')
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'coupon-usage', CouponUsageViewSet, basename='coupon-usage')

urlpatterns = [
    path('', include(router.urls)),
]
