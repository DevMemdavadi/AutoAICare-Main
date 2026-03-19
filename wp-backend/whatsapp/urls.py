from django.urls import path
from . import views

app_name = 'whatsapp'

urlpatterns = [
    path('webhook/', views.webhook, name='webhook'),
    path('send/', views.send_whatsapp_message, name='send-message'),
    path('send/template/', views.send_template_message, name='send-template'),
    path('templates/', views.list_templates, name='list-templates'),
    path('status/<str:message_id>/', views.get_message_status, name='message-status'),
] 