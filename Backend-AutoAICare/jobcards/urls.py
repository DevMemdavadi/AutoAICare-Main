from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobCardViewSet
from .parts_views import PartViewSet
from .parts_analytics import parts_usage_analytics, part_detail_analytics
from .reward_views import RewardSettingsViewSet, SupervisorRewardViewSet
from .performance_views import PerformanceViewSet
from .workflow_views import (
    WorkflowTemplateViewSet,
    WorkflowStatusViewSet,
    WorkflowTransitionViewSet,
    RolePermissionViewSet
)
from .stock_views import BranchStockViewSet, StockTransferViewSet


router = DefaultRouter()

# Workflow configuration routes
router.register(r'templates', WorkflowTemplateViewSet, basename='workflow-template')
router.register(r'statuses', WorkflowStatusViewSet, basename='workflow-status')
router.register(r'transitions', WorkflowTransitionViewSet, basename='workflow-transition')
router.register(r'permissions', RolePermissionViewSet, basename='role-permission')

# Reward routes
router.register(r'reward-settings', RewardSettingsViewSet, basename='reward-settings')
router.register(r'rewards', SupervisorRewardViewSet, basename='supervisor-rewards')

# Performance analytics routes
router.register(r'performance', PerformanceViewSet, basename='performance')

# Parts catalog routes
router.register(r'parts', PartViewSet, basename='parts')

# Stock management routes
router.register(r'branch-stock', BranchStockViewSet, basename='branch-stock')
router.register(r'stock-transfers', StockTransferViewSet, basename='stock-transfers')

# Register jobcard routes last (catch-all)
router.register(r'', JobCardViewSet, basename='jobcard')

urlpatterns = [
    path('parts/analytics/usage/', parts_usage_analytics, name='parts-usage-analytics'),
    path('parts/analytics/<int:part_id>/', part_detail_analytics, name='part-detail-analytics'),
    path('', include(router.urls)),
]