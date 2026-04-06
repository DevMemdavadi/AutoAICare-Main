"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views import GlobalSettingsView, ReferralSettingsView
from companies.views import test_subdomain

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Test endpoint for subdomain multi-tenancy
    path('test-subdomain/', test_subdomain, name='test-subdomain'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # API Endpoints
    path('api/settings/', GlobalSettingsView.as_view(), name='global-settings'),
    path('api/settings/referral/', ReferralSettingsView.as_view(), name='referral-settings'),
    path('api/auth/', include('users.urls')),
    path('api/branches/', include('branches.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/services/', include('services.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/memberships/', include('memberships.urls')),
    path('api/jobcards/', include('jobcards.urls')),
    path('api/pickup/', include('pickup.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/store/', include('store.urls')),
    path('api/feedback/', include('feedback.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/notify/', include('notify.urls')),
    path('api/accounting/', include('accounting.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/blogs/', include('blogs.urls')),
    path('api/automation/', include('automation.urls')),
    path('api/leads/', include('leads.urls')),
    path('api/workflow/', include('jobcards.urls')),  # Workflow management endpoints
    path('api/reports/', include('reports.urls')),
    path('api/purchases/', include('purchases.urls')),  # Purchase management
    path('api/chats/', include('chats.urls')),
    path('api/', include('whatsapp.urls')),  # Added to route /api/whatsapp/events/ correctly
   # path('api/v1/', include('whatsapp.urls')),
]

def trigger_error(request):
    division_by_zero = 1 / 0

urlpatterns += [
    path('sentry-debug/', trigger_error),
]

if settings.DEBUG:
    urlpatterns += [path('silk/', include('silk.urls', namespace='silk'))]
    
    # Admin Interface Customization for Dev
    from django.utils.safestring import mark_safe
    admin.site.site_header = mark_safe(
        'DetailEase Admin | <a href="/silk/" style="color: #61afef; font-size: 0.8em; text-decoration: underline;">Silk Profiler Dashboard</a>'
    )
else:
    admin.site.site_header = 'DetailEase Admin'

admin.site.site_title = 'DetailEase Management'
admin.site.index_title = 'DetailEase Performance & Management Portal'

# Media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
