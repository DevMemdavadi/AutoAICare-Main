import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.db import transaction

from .models import PendingWhatsAppEvent

logger = logging.getLogger(__name__)

class WPWebhookReceiverView(APIView):
    """
    Receives Webhooks from the WP Gateway (e.g. new messages, status updates).
    Also handles Meta's URL verification handshake via GET.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        """
        Meta Webhook Verification (hub.challenge)
        """
        from django.http import HttpResponse
        
        hub_mode = request.GET.get("hub.mode")
        hub_challenge = request.GET.get("hub.challenge")
        
        if hub_mode == "subscribe" and hub_challenge:
            print(f"WEBHOOK VERIFICATION SUCCESS - Challenge: {hub_challenge}")
            return HttpResponse(hub_challenge, status=200)
            
        return Response({"error": "Invalid verification request"}, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request, *args, **kwargs):
        payload = request.data
        print("FULL WEBHOOK PAYLOAD:", payload)
        
        # Unwrap wp-backend middleware payloads gracefully
        if isinstance(payload, dict) and 'event' in payload and 'data' in payload:
            event_type = payload.get('event')
            data = payload.get('data', {})
            
            print(f"WEBHOOK UNWRAPPER ACTIVATED - Event: {event_type}")
            
            if event_type == "message_status":
                message_id = data.get('message_id')
                status_value = data.get('status')
                if message_id and status_value:
                    status_obj = {'id': message_id, 'status': status_value}
                    if 'error' in data:
                        status_obj['errors'] = [data['error']]
                    payload = {'statuses': [status_obj]}
                    
            elif event_type == "message_received":
                phone = data.get('phone_number')
                message_id = data.get('message_id')
                text = data.get('text', '')
                if phone and message_id:
                    msg_obj = {
                        'from': phone,
                        'id': message_id,
                        'text': {'body': text}
                    }
                    payload = {'messages': [msg_obj]}

        try:
            # 1. Extract statuses dynamically based on Format 1 or Format 2
            statuses = []
            if 'statuses' in payload and isinstance(payload['statuses'], list):
                statuses = payload['statuses']
            elif 'entry' in payload and isinstance(payload['entry'], list) and len(payload['entry']) > 0:
                changes = payload['entry'][0].get('changes', [])
                if len(changes) > 0:
                    value = changes[0].get('value', {})
                    if 'statuses' in value and isinstance(value['statuses'], list):
                        statuses = value['statuses']
            
            # 2. Process extracted statuses
            if statuses and len(statuses) > 0:
                for status_obj in statuses:
                    message_id = status_obj.get('id', '').strip()
                    status_value = status_obj.get('status', '').strip()
                    
                    if message_id and status_value:
                        print(f"WEBHOOK EXTRACTED - ID: {message_id}, STATUS: {status_value}")
                        from notify.models import WhatsAppMessageLog
                        import django.utils.timezone as timezone
                        
                        try:
                            log = WhatsAppMessageLog.objects.filter(whatsapp_message_id=message_id).first()
                            if log:
                                print(f"WEBHOOK DB MATCH FOUND: Log ID {log.id}")
                                status_map = {
                                    'sent': 'SENT',
                                    'delivered': 'DELIVERED',
                                    'read': 'READ',
                                    'failed': 'FAILED'
                                }
                                mapped_status = status_map.get(status_value.lower())
                                if mapped_status:
                                    log.status = mapped_status
                                    if mapped_status == 'DELIVERED':
                                        log.delivered_at = timezone.now()
                                    elif mapped_status == 'READ':
                                        log.read_at = timezone.now()
                                    elif mapped_status == 'FAILED':
                                        error_data = status_obj.get('errors', [{}])[0]
                                        log.error_message = error_data.get('title') or error_data.get('details') or ''
                                        log.error_code = error_data.get('code', '')
                                    
                                    update_fields = ['status']
                                    if log.delivered_at: update_fields.append('delivered_at')
                                    if log.read_at: update_fields.append('read_at')
                                    if log.error_message: update_fields.extend(['error_message', 'error_code'])
                                    
                                    log.save(update_fields=update_fields)
                                    print(f"WEBHOOK UPDATE SUCCESS - New Status: {log.status}")
                                else:
                                    print(f"WEBHOOK UNMAPPED STATUS: {status_value}")
                            else:
                                print(f"WEBHOOK DB MISMATCH: No record found for ID {message_id}")
                                logger.error(f"WhatsApp message ID mismatch: {message_id}")
                        except Exception as e:
                            logger.error(f"Error updating WhatsApp message status: {e}")
                            print(f"WEBHOOK UPDATE EXCEPTION: {e}")
                            
            # 3. Extract incoming messages gracefully (Format 1 and Format 2)
            messages_list = []
            if 'messages' in payload and isinstance(payload['messages'], list):
                messages_list = payload['messages']
            elif 'entry' in payload and isinstance(payload['entry'], list) and len(payload['entry']) > 0:
                changes = payload['entry'][0].get('changes', [])
                if len(changes) > 0:
                    value = changes[0].get('value', {})
                    if 'messages' in value and isinstance(value['messages'], list):
                        messages_list = value['messages']
                        
            if messages_list and len(messages_list) > 0:
                for message_obj in messages_list:
                    phone = message_obj.get('from', '')
                    
                    # Extract text
                    message_content = ''
                    if 'text' in message_obj:
                        message_content = message_obj['text'].get('body', '')
                    
                    message_type = "incoming"
                    
                    print(f"Webhook received incoming: {phone} {message_content}")
                    
                    # Find active company
                    try:
                        from companies.models import CompanySettings
                        settings = CompanySettings.objects.exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()
                        company = settings.company if settings else None
                    except Exception:
                        company = None
                        
                    # Save to PendingWhatsAppEvent
                    PendingWhatsAppEvent.objects.create(
                        company=company,
                        event_type=message_type,
                        phone_number=phone,
                        message_type='text',
                        message_content=message_content,
                        message_id=message_obj.get('id', ''),
                        raw_payload=payload
                    )
            
            return Response({"status": "success"})
            
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            print(f"WEBHOOK EXCEPTION: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
