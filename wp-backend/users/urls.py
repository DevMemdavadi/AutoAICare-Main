from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, CustomTokenObtainPairView, LogoutView
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    UserProfileViewSet, AddressViewSet, UserPreferencesViewSet,
    ContactMessageCreateView, DistributorEnquiryCreateView,
    ContactMessageListView, DistributorEnquiryListView,
    ForgotPasswordView, ResetPasswordView, ChangePasswordView, ValidateResetTokenView
)

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'preferences', UserPreferencesViewSet, basename='preference')

urlpatterns = [
    path('', include(router.urls)),
    path('user/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/logout/', LogoutView.as_view(), name='logout'),

    # Password Reset endpoints
    path('password/forgot/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('password/reset/', ResetPasswordView.as_view(), name='reset-password'),
    path('password/change/', ChangePasswordView.as_view(), name='change-password'),
    path('password/validate-token/', ValidateResetTokenView.as_view(), name='validate-reset-token'),

    # Contact Us endpoints
    path('contact/messages/', ContactMessageCreateView.as_view(), name='contact-message-create'),
    path('admin/contact/messages/', ContactMessageListView.as_view(), name='contact-message-list'),

    # Distributor endpoints
    path('distributor/enquiries/', DistributorEnquiryCreateView.as_view(), name='distributor-enquiry-create'),
    path('admin/distributor/enquiries/', DistributorEnquiryListView.as_view(), name='distributor-enquiry-list'),
]