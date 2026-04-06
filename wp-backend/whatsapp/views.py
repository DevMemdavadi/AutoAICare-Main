from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from datetime import datetime
from .services import WhatsAppService
from .models import WhatsAppMessage, Workspace
import json
import logging
import threading
import requests

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from whatsapp_dashboard.models import AutoReplyKeyword


logger = logging.getLogger(__name__)

class IsAuthenticatedOrHasAPIKey(BasePermission):
    """
    Allows access if user is authenticated OR request provides a valid Workspace API Key in X-API-Key header.
    """
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True
        api_key = request.headers.get('X-API-Key')
        if api_key:
            return Workspace.objects.filter(api_key=api_key, is_active=True).exists()
        return False

def dispatch_webhook(event_type, payload):
    """
    Dispatches events to all active Workspace webhooks in a background thread.
    """
    def send():
        workspaces = Workspace.objects.filter(is_active=True, webhook_active=True).exclude(webhook_url__isnull=True).exclude(webhook_url__exact='')
        for workspace in workspaces:
            try:
                data = {
                    "event": event_type,
                    "data": payload
                }
                headers = {"Content-Type": "application/json"}
                # If you need to verify on CRM end, you could add X-Hub-Signature or just pass the workspace ID
                requests.post(workspace.webhook_url, json=data, headers=headers, timeout=5)
            except Exception as e:
                logger.error(f"Failed to push webhook to {workspace.name}: {e}")
    threading.Thread(target=send, daemon=True).start()

# Create your views here.

@csrf_exempt
def webhook(request):
    if request.method == 'GET':
        # Handle webhook verification from WhatsApp
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode and token:
            if mode == 'subscribe' and token == settings.WHATSAPP_VERIFY_TOKEN:
                return HttpResponse(challenge)
            return HttpResponse('Forbidden', status=403)

    elif request.method == 'POST':
        data = json.loads(request.body.decode('utf-8'))
        
        try:
            # 💡 Log raw data to terminal for now
            print("Incoming Webhook Payload:", json.dumps(data, indent=2))

            if 'entry' in data and data['entry']:
                for entry in data['entry']:
                    if 'changes' in entry and entry['changes']:
                        for change in entry['changes']:
                            value = change.get('value', {})

                            # 💬 Handle status updates
                            if 'statuses' in value:
                                for status in value['statuses']:
                                    print("Received status update:", status)
                                    handle_status_update(status)

                            # 💬 Handle incoming messages
                            if 'messages' in value:
                                for message in value['messages']:
                                    print("Received incoming message:", message)
                                    msg_obj = handle_incoming_message(message)
                                    
                                    # Use unified notify_chat for WebSocket pushes
                                    if msg_obj:
                                        WhatsAppService().notify_chat(message['from'], msg_obj)
                                        
                                    print(f"✅ WebSocket broadcasts completed for {message['from']}")

            return HttpResponse('OK')
        except Exception as e:
            print("Webhook Error:", str(e))
            return HttpResponse(str(e), status=500)

    return HttpResponse('Method not allowed', status=405)

def handle_status_update(status):
    """
    Process WhatsApp message status updates and broadcast to WebSocket
    """
    try:
        message_id = status.get('id')
        status_type = status.get('status')
        recipient_id = status.get('recipient_id')
        
        if message_id and status_type:
            # Map WhatsApp status to our status
            status_mapping = {
                'sent': 'sent',
                'delivered': 'delivered',
                'read': 'read',
                'failed': 'failed'
            }
            
            mapped_status = status_mapping.get(status_type, 'pending')
            whatsapp_service = WhatsAppService()
            
            # Update message status in database and get the message instance
            message_instance = whatsapp_service.update_message_status(message_id, mapped_status)
            
            if message_instance and recipient_id:
                # Broadcast status update to WebSocket
                channel_layer = get_channel_layer()
                
                # Prepare status update data
                status_data = {
                    "message_id": message_id,
                    "status": mapped_status,
                    "phone_number": recipient_id,
                    "timestamp": timezone.now().isoformat(),
                }
                
                # Add frontend_id if available
                if message_instance.frontend_id:
                    status_data["frontend_id"] = message_instance.frontend_id
                
                # Broadcast to general whatsapp_messages group (for dashboard)
                async_to_sync(channel_layer.group_send)(
                    "whatsapp_messages",
                    {
                        "type": "status_update",
                        "message": status_data
                    }
                )
                
                # Broadcast to specific chat group
                import re
                sanitized_phone = re.sub(r'[^a-zA-Z0-9\-_.]', '_', recipient_id)
                chat_group_name = f"chat_{sanitized_phone}"
                
                print(f"📡 Broadcasting status update to chat group: {chat_group_name}")
                print(f"📡 Status: {message_id} -> {mapped_status}")
                if message_instance.frontend_id:
                    print(f"📡 Frontend ID: {message_instance.frontend_id}")
                
                async_to_sync(channel_layer.group_send)(
                    chat_group_name,
                    {
                        "type": "status_update",
                        "message": status_data
                    }
                )
                
                print(f"✅ Status update broadcast completed for {message_id}: {mapped_status}")

                # Dispatch Webhook
                dispatch_webhook("message_status", status_data)
            
    except Exception as e:
        print(f"Error processing status update: {str(e)}")


def handle_incoming_message(message):
    phone = message.get("from")
    message_id = message.get("id")
    msg_type = message.get("type")
    timestamp = message.get("timestamp")

    if not phone or not message_id:
        return

    # Convert UNIX timestamp to datetime
    timestamp_dt = datetime.fromtimestamp(int(timestamp))

    # Handle different message types
    media_id = None
    filename = None
    if msg_type == "text":
        text = message.get("text", {}).get("body", "")
    elif msg_type == "image":
        media_id = message.get("image", {}).get("id")
        text = message.get("image", {}).get("caption", "[Image message received]")
    elif msg_type == "video":
        media_id = message.get("video", {}).get("id")
        text = message.get("video", {}).get("caption", "[Video message received]")
    elif msg_type == "document":
        media_id = message.get("document", {}).get("id")
        # Do not use default string for filename; let it be None if missing, so CRM defaults gracefully.
        filename = message.get("document", {}).get("filename")
        text = message.get("document", {}).get("caption", filename if filename else "[Document]")
    elif msg_type == "audio":
        media_id = message.get("audio", {}).get("id")
        text = "[Audio message received]"
    elif msg_type == "sticker":
        media_id = message.get("sticker", {}).get("id")
        text = "[Sticker message received]"
    elif msg_type == "location":
        text = "[Location message received]"
    elif msg_type == "contacts":
        text = "[Contacts message received]"
    elif msg_type == "interactive":
        text = "[Interactive message received]"
    else:
        text = f"[{msg_type.capitalize()} message received]"

    # Save to database
    msg_obj = WhatsAppMessage.objects.create(
        phone_number=phone,
        message_type=msg_type,
        message_content=text,
        message_id=message_id,
        status="received",
        timestamp=timestamp_dt,
        is_read=False,
    )

    if media_id:
        try:
            from django.core.files.base import ContentFile
            import mimetypes
            import uuid
            service = WhatsAppService()
            media_data, mime_type = service.download_media(media_id)
            if media_data:
                ext = mimetypes.guess_extension(mime_type) or '.bin'
                file_name = f"{media_id}_{uuid.uuid4().hex[:8]}{ext}"
                msg_obj.media.save(file_name, ContentFile(media_data), save=True)
        except Exception as e:
            print(f"❌ Failed to process media {media_id}: {e}")

    print(f"✅ Saved {msg_type} message from {phone}: {text}")

    webhook_payload = {
        "phone_number": phone,
        "message_id": message_id,
        "message_type": msg_type,
        "text": text,
        "timestamp": timezone.now().isoformat()
    }
    
    if media_id and msg_obj.media:
        webhook_payload["media_url"] = f"/api/whatsapp/media/{message_id}/"
    if filename:
        webhook_payload["filename"] = filename

    # Dispatch Webhook
    dispatch_webhook("message_received", webhook_payload)

    # --- Auto-reply logic (database-driven) & Intent Detection ---
    if msg_type == "text" and text:
        normalized = text.lower().strip()
        
        # Intent Detection for appointments
        import re
        if re.search(r'\b(appointment|booking|schedule|service)\b', normalized):
            try:
                service = WhatsAppService()
                service.trigger_crm_appointment_intent(phone, text)
                
                from whatsapp_dashboard.models import ChatAssignment
                assignment = ChatAssignment.objects.filter(phone_number=phone).first()
                if assignment:
                    if not isinstance(assignment.tags, list):
                        assignment.tags = []
                    if '#appointment' not in assignment.tags:
                        assignment.tags.append('#appointment')
                        assignment.save()
            except Exception as e:
                print(f"Failed to process appointment intent: {e}")

        # Find all active keywords
        keywords = AutoReplyKeyword.objects.filter(is_active=True)
        for kw in keywords:
            if kw.keyword.lower() in normalized:
                service = WhatsAppService()
                service.send_message(
                    to_phone=phone,
                    message_type="text",
                    content=kw.reply_text
                )
                print(f"🤖 Auto-replied to {phone} for keyword '{kw.keyword}'")
                break
                
    return msg_obj


@api_view(['POST'])
@permission_classes([IsAuthenticatedOrHasAPIKey])
def send_whatsapp_message(request):
    """
    Send a WhatsApp message
    
    Request body:
    {
        "phone_number": "+91XXXXXXXXXX",
        "message_type": "text" or "template",
        "content": "Message content" (for text messages),
        "template_name": "template_name" (for template messages),
        "template_params": {
            "header": ["param1", "param2"],
            "body": ["param1", "param2"],
            "button": ["param1"]
        }
    }
    """
    try:
        phone_number = request.data.get('phone_number')
        message_type = request.data.get('message_type', 'text')
        content = request.data.get('content')
        template_name = request.data.get('template_name')
        template_params = request.data.get('template_params')
        media_path = request.data.get('media_path')

        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=400)

        if message_type == 'text' and not content:
            return Response({'error': 'Content is required for text messages'}, status=400)
        
        if message_type == 'template':
            if not template_name:
                return Response({'error': 'Template name is required for template messages'}, status=400)
            if not template_params:
                logger.warning('No template parameters provided for template message')

        whatsapp_service = WhatsAppService()
        result = whatsapp_service.send_message(
            to_phone=phone_number,
            message_type=message_type,
            content=content,
            template_name=template_name,
            template_params=template_params,
            media_path=media_path
        )
        
        # Note: WhatsAppService().send_message ALREADY calls self.notify_chat,
        # so we DO NOT manually broadcast double and incorrectly-formatted messages here.
        
        # Return a more informative response
        response_data = {
            'status': 'success',
            'message': 'Message sent successfully',
            'message_id': result.get('messages', [{}])[0].get('id') if result.get('messages') else None,
            'wa_id': result.get('contacts', [{}])[0].get('wa_id') if result.get('contacts') else None,
            'message_type': message_type
        }
        
        return Response(response_data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrHasAPIKey])
def get_message_status(request, message_id):
    """
    Get the current status of a WhatsApp message
    """
    try:
        message = WhatsAppMessage.objects.get(message_id=message_id)
        response_data = {
            'message_id': message.message_id,
            'phone_number': message.phone_number,
            'status': message.status,
            'status_updated_at': message.status_updated_at,
            'message_type': message.message_type,
            'timestamp': message.timestamp
        }
        return Response(response_data)
    except WhatsAppMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticatedOrHasAPIKey])
def send_template_message(request):
    """
    Send a WhatsApp template message
    
    Request body:
    {
        "phone_number": "+91XXXXXXXXXX",
        "template_name": "hello_world",
        "template_params": {
            "header": ["param1"],
            "body": ["param1", "param2"],
            "button": ["param1"]
        }
    }
    """
    try:
        phone_number = request.data.get('phone_number')
        template_name = request.data.get('template_name')
        template_params = request.data.get('template_params')

        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=400)
        
        if not template_name:
            return Response({'error': 'Template name is required'}, status=400)

        # Log the template message attempt
        logger.info(f"Attempting to send template message '{template_name}' to {phone_number}")

        whatsapp_service = WhatsAppService()
        result = whatsapp_service.send_message(
            to_phone=phone_number,
            message_type="template",
            template_name=template_name,
            template_params=template_params
        )
        
        # Return a more informative response
        response_data = {
            'status': 'success',
            'message': 'Template message sent successfully',
            'message_id': result.get('messages', [{}])[0].get('id') if result.get('messages') else None,
            'wa_id': result.get('contacts', [{}])[0].get('wa_id') if result.get('contacts') else None,
            'template_name': template_name
        }
        
        logger.info(f"Template message sent successfully. Message ID: {response_data['message_id']}")
        return Response(response_data)
    except Exception as e:
        logger.error(f"Failed to send template message: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrHasAPIKey])
def list_templates(request):
    """
    List all available WhatsApp message templates
    """
    try:
        whatsapp_service = WhatsAppService()
        templates = whatsapp_service.get_available_templates()
        return Response({
            'status': 'success',
            'templates': templates
        })
    except Exception as e:
        logger.error(f"Failed to list templates: {str(e)}")
        return Response({'error': str(e)}, status=500)

from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def get_media(request, message_id):
    """
    Securely serve a media file attached to a WhatsApp message.
    Opened to AllowAny so <img src="..."> tags safely load natively without forcing Authorization headers across the DOM.
    """
    from django.http import FileResponse, Http404
    try:
        message = WhatsAppMessage.objects.get(message_id=message_id)
        if not message.media:
            raise Http404("Media not found for this message")
        return FileResponse(message.media.open('rb'))
    except WhatsAppMessage.DoesNotExist:
        raise Http404("Message not found")
