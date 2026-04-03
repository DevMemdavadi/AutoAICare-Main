from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import PendingWhatsAppEvent
from rest_framework import serializers

class PendingWhatsAppEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingWhatsAppEvent
        fields = '__all__'

class PendingWhatsAppEventListView(generics.ListAPIView):
    """
    List view for all pending whatsapp events for the admin panel.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PendingWhatsAppEventSerializer
    def get_queryset(self):
        queryset = PendingWhatsAppEvent.objects.all().order_by('-received_at')
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

class PendingWhatsAppEventDetailView(generics.UpdateAPIView):
    """
    Update view for a whatsapp event (e.g., mark as processed/ignored).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PendingWhatsAppEventSerializer
    queryset = PendingWhatsAppEvent.objects.all()

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from companies.models import CompanySettings
from notify.models import WhatsAppMessageLog
from .wp_client import WPClient

class SendMessageView(APIView):
    """
    Endpoint to send an outgoing WhatsApp message via the WP Gateway.
    Required POST payload:
    {
        "phone_number": "+91XXXXXXXXXX",
        "content": "Message body"
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        phone_number = request.data.get('phone_number') or request.data.get("phone")
        content = request.data.get('content')
        
        if not phone_number or not content:
            return Response({"error": "phone_number and content are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        settings = CompanySettings.objects.exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()
        if not settings or not settings.wp_api_key:
            return Response({"error": "WP Gateway API Key is not configured in settings."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Resolve WP Gateway URL from settings, fallback to port 8000 as wp-backend runs on 8000 natively
        wp_url = settings.wp_url if getattr(settings, 'wp_url', None) else "http://127.0.0.1:8000/api"
            
        wp_client = WPClient(wp_url, settings.wp_api_key)
        result = wp_client.send_message(phone_number, content)
        print(f"!!! WPCLIENT RAW RESULT: {result} !!!")
        
        if result.get('status') == 'success':
            # Safely extract message_id handling diverse formatting topologies
            raw_message_id = (
                result.get('message_id') or 
                result.get('messages', [{}])[0].get('id') or 
                result.get('id')
            )
            whatsapp_message_id = str(raw_message_id).strip() if raw_message_id else ""
            if not whatsapp_message_id:
                print(f"SEND API CRITICAL ERROR: Could not extract message_id from {result}")
                
            # Log the message so it appears in WhatsAppLogs
            WhatsAppMessageLog.objects.create(
                company=settings.company,
                recipient_phone=phone_number,
                template_name='Direct Message',
                message_content=content,
                status='SENT',
                sent_at=timezone.now(),
                whatsapp_message_id=whatsapp_message_id
            )
            return Response({"status": "success", "message": "Message sent successfully"})
        else:
            # Optionally log the failure
            WhatsAppMessageLog.objects.create(
                company=settings.company,
                recipient_phone=phone_number,
                template_name='Direct Message',
                message_content=content,
                status='FAILED',
                error_message=result.get('error', 'Failed to send message')
            )
            return Response({"error": result.get('error', 'Failed to send message')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
