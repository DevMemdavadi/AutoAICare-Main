from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PurchaseViewSet,
    PurchaseItemViewSet,
    PurchaseReturnViewSet,
    PurchasePaymentViewSet,
    SupplierLedgerViewSet,
    StockMovementViewSet,
    PurchaseReportsViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'items', PurchaseItemViewSet, basename='purchase-item')
router.register(r'returns', PurchaseReturnViewSet, basename='purchase-return')
router.register(r'payments', PurchasePaymentViewSet, basename='purchase-payment')
router.register(r'supplier-ledger', SupplierLedgerViewSet, basename='supplier-ledger')
router.register(r'stock-movements', StockMovementViewSet, basename='stock-movement')
router.register(r'reports', PurchaseReportsViewSet, basename='purchase-reports')

urlpatterns = [
    path('', include(router.urls)),
]
