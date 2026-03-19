"""
WebSocket URL routing configuration.
"""

from django.urls import path, re_path
from notify.consumers import (
    NotificationConsumer,
    JobCardConsumer,
    TimerConsumer,
    DashboardConsumer,
    CustomerJobTrackingConsumer
)

websocket_urlpatterns = [
    # User notifications
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    
    # Job card specific updates (notes, tasks, status, photos)
    path('ws/jobcard/<int:jobcard_id>/', JobCardConsumer.as_asgi()),
    
    # Customer job tracking (real-time progress, approvals)
    path('ws/customer/job/<int:jobcard_id>/', CustomerJobTrackingConsumer.as_asgi()),
    
    # Timer updates (warnings, overdue alerts)
    path('ws/timers/', TimerConsumer.as_asgi()),
    
    # Dashboard updates (metrics, job lists)
    path('ws/dashboard/', DashboardConsumer.as_asgi()),
]


