from django.urls import path
from .views import (
    DashboardAnalyticsView,
    RevenueAnalyticsView,
    BookingsAnalyticsView,
    CustomersAnalyticsView,
    ServicesAnalyticsView,
    ExportAnalyticsView,
    TopServicesView,
    PeakHoursView,
    AnalyticsOverviewView,
    BookingTrendsView,
    JobStatusView,
    TodaysJobsView,
    BranchPerformanceView,
    RecentBookingsView,
)
from .daily_followup_views import (
    DailyFollowUpDashboardView,
    FollowUpStatsView,
)
from .parts_analytics_views import (
    PartsAnalyticsView,
)

urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='analytics-dashboard'),
    path('revenue/', RevenueAnalyticsView.as_view(), name='analytics-revenue'),
    path('bookings/', BookingsAnalyticsView.as_view(), name='analytics-bookings'),
    path('customers/', CustomersAnalyticsView.as_view(), name='analytics-customers'),
    path('services/', ServicesAnalyticsView.as_view(), name='analytics-services'),
    path('export/', ExportAnalyticsView.as_view(), name='analytics-export'),
    path('top-services/', TopServicesView.as_view(), name='analytics-top-services'),
    path('peak-hours/', PeakHoursView.as_view(), name='analytics-peak-hours'),
    path('overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('booking-trends/', BookingTrendsView.as_view(), name='booking-trends'),
    path('job-status/', JobStatusView.as_view(), name='job-status'),
    path('todays-jobs/', TodaysJobsView.as_view(), name='todays-jobs'),
    path('recent-bookings/', RecentBookingsView.as_view(), name='recent-bookings'),
    path('branch-performance/', BranchPerformanceView.as_view(), name='branch-performance'),
    
    # Parts Analytics
    path('parts/', PartsAnalyticsView.as_view(), name='parts-analytics'),
    
    # Daily Follow-up Dashboard
    path('daily-followup/', DailyFollowUpDashboardView.as_view(), name='daily-followup'),
    path('followup-stats/', FollowUpStatsView.as_view(), name='followup-stats'),
]
