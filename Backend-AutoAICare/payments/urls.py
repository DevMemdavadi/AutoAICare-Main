from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, PaymentInitiateView, PaymentVerifyView, StripeWebhookView, WalletViewSet

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'wallet', WalletViewSet, basename='wallet')

urlpatterns = [
    path('initiate/', PaymentInitiateView.as_view(), name='payment-initiate'),
    path('verify/', PaymentVerifyView.as_view(), name='payment-verify'),
    path('webhook/', StripeWebhookView.as_view(), name='payment-webhook'),
    path('', include(router.urls)),
]
