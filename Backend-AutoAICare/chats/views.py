from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Conversation
from .serializers import ConversationSerializer
from whatsapp.models import PendingWhatsAppEvent
from notify.models import WhatsAppMessageLog
from whatsapp.utils import normalize_phone_number
from whatsapp.wp_client import WPClient
from companies.models import CompanySettings
import logging

logger = logging.getLogger(__name__)

class ContactListAPIView(generics.ListAPIView):
    """
    Returns a paginated list of conversations mapped to contacts
    """
    serializer_class = ConversationSerializer
    
    def get_queryset(self):
        return Conversation.objects.all().order_by('-last_message_time')
        
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if queryset.count() == 0:
            print("TOTAL CONVERSATIONS:", Conversation.objects.count())
        return super().list(request, *args, **kwargs)

class MessageListAPIView(APIView):
    def get(self, request, phone_number):
        try:
            # Fetch Incoming messages
            incoming_events = PendingWhatsAppEvent.objects.filter(phone_number=phone_number)
            
            # Fetch Outgoing messages
            outgoing_logs = WhatsAppMessageLog.objects.filter(recipient_phone=phone_number)
            
            import json
            messages = []
            
            # Determine wp gateway url dynamically based on settings
            domain = 'http://127.0.0.1:8000'
            company_settings = CompanySettings.objects.exclude(wp_api_key="").first()
            if company_settings and company_settings.wp_url:
                domain = company_settings.wp_url.rstrip('/')
                
            for msg in incoming_events:
                media_url = None
                filename = None
                payload = msg.raw_payload.get('data', {}) if isinstance(msg.raw_payload, dict) else {}
                # Guard against dual http:// mappings crushing output URIs
                raw_media_url = payload.get('media_url', '')
                if raw_media_url:
                    if str(raw_media_url).startswith('http'):
                        media_url = raw_media_url
                    else:
                        media_url = f"{domain}{raw_media_url}"
                if payload.get('filename'):
                    filename = payload.get('filename')
                    
                messages.append({
                    'id': f"in_{msg.id}",
                    'content': msg.message_content,
                    'media_url': media_url,
                    'media_type': msg.message_type,
                    'filename': filename,
                    'timestamp': msg.received_at, # This is a datetime object
                    'status': msg.status,
                    'type': 'incoming'
                })
                
            for msg in outgoing_logs:
                parsed_content = msg.message_content
                media_url = None
                filename = None
                media_type = 'text'
                
                try:
                    # Attempt to parse json payload safely
                    if parsed_content.startswith('{') and 'media_url' in parsed_content:
                        parsed_json = json.loads(parsed_content)
                        parsed_content = parsed_json.get('text', '')
                        media_url = parsed_json.get('media_url')
                        media_type = parsed_json.get('media_type', 'image')
                        filename = parsed_json.get('filename')
                    elif parsed_content.startswith('http') and any(ext in parsed_content.lower() for ext in ['.jpg', '.png', '.pdf', '.mp4', '.ogg']):
                        # Graceful degradation for legacy links
                        media_url = parsed_content
                        parsed_content = ''
                        if '.pdf' in media_url.lower(): media_type = 'document'
                        elif '.mp4' in media_url.lower(): media_type = 'video'
                        elif '.ogg' in media_url.lower() or '.mp3' in media_url.lower(): media_type = 'audio'
                        else: media_type = 'image'
                except:
                    pass
                    
                messages.append({
                    'id': f"out_{msg.id}",
                    'content': parsed_content,
                    'media_url': media_url,
                    'media_type': media_type,
                    'filename': filename,
                    'timestamp': msg.created_at, # This is a datetime object
                    'status': msg.status,
                    'type': 'outgoing'
                })
                
            # Sort chronologically (oldest to newest for chatting UI)
            messages.sort(key=lambda x: x['timestamp'] if x['timestamp'] else timezone.now())
            
            print("API RESPONSE:", messages)
            return Response({"status": "success", "phone_number": phone_number, "data": messages})
        except Exception as e:
            print("API ERROR:", str(e))
            return Response({"error": str(e)}, status=500)

class SendMessageAPIView(APIView):
    def post(self, request):
        try:
            phone_number = request.data.get('phone_number')
            content = request.data.get('content', '')
            attachment = request.FILES.get('attachment')
            
            if not phone_number or (not content and not attachment):
                return Response({"status": "error", "message": "Phone number and either content or attachment is required"}, status=400)
                
            normalized_phone = normalize_phone_number(phone_number)
            
            # 1. Fetch Company Settings
            settings = None
            if hasattr(request, 'company') and request.company:
                settings = CompanySettings.objects.filter(company=request.company).exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()
                
            if not settings:
                 settings = CompanySettings.objects.exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()
                 
            if not settings or not settings.wp_api_key:
                 return Response({"status": "error", "message": "WP Gateway API Key not configured."}, status=500)
                 
            wp_url = settings.wp_url if getattr(settings, 'wp_url', None) else "http://127.0.0.1:8000/api"
            wp_client = WPClient(wp_url, settings.wp_api_key)
            
            # 2. Handle File Attachment
            message_type = 'text'
            actual_content = content
            media_path = None
            
            if attachment:
                from django.core.files.storage import default_storage
                from django.core.files.base import ContentFile
                import os
                
                # Save file locally
                path = default_storage.save(f"wp_attachments/{attachment.name}", ContentFile(attachment.read()))
                absolute_file_path = default_storage.path(path)
                
                # Determine message_type
                ext = os.path.splitext(attachment.name)[1].lower()
                if ext in ['.jpg', '.jpeg', '.png', '.webp']:
                    message_type = 'image'
                elif ext in ['.mp4']:
                    message_type = 'video'
                elif ext in ['.mp3', '.wav', '.ogg']:
                    message_type = 'audio'
                else:
                    message_type = 'document'
                    
                media_path = absolute_file_path
                actual_content = request.build_absolute_uri(default_storage.url(path))
                
            
            # 3. Send Message
            result = wp_client.send_message(
                phone_number=normalized_phone, 
                content=content, 
                message_type=message_type,
                media_path=media_path
            )
            
            log_company = getattr(request, 'company', None) or (settings.company if settings else None)
            
            if result.get('status') == 'success':
                try:
                    raw_message_id = (
                        result.get('message_id') or 
                        result.get('messages', [{}])[0].get('id') or 
                        result.get('id')
                    )
                    whatsapp_message_id = str(raw_message_id).strip() if raw_message_id else ""
                    
                    if attachment:
                        import json
                        final_content = json.dumps({
                            "text": content,
                            "media_url": actual_content,
                            "media_type": message_type,
                            "filename": getattr(attachment, 'name', "[Document]")
                        })
                    else:
                        final_content = content
    
                    created_log = WhatsAppMessageLog.objects.create(
                        company=log_company,
                        recipient_phone=normalized_phone,
                        template_name='Admin Chat Message',
                        message_content=final_content,
                        status='SENT',
                        sent_at=timezone.now(),
                        whatsapp_message_id=whatsapp_message_id
                    )
                    
                    conv, _ = Conversation.objects.get_or_create(phone_number=normalized_phone)
                    
                    preview_text = content
                    if not preview_text and attachment:
                        preview_text = f"[{message_type.capitalize()}]"
                        
                    conv.last_message = preview_text
                    conv.last_message_time = timezone.now()
                    conv.save()
                    
                    return Response({
                        "status": "success", 
                        "data": {
                            "id": f"out_{created_log.id}",
                            "content": content,
                            "media_url": actual_content if attachment else None,
                            "media_type": message_type,
                            "filename": getattr(attachment, 'name', None) if attachment else None,
                            "timestamp": created_log.created_at.isoformat(),
                            "status": "SENT",
                            "type": "outgoing"
                        }
                    })
                except Exception as e:
                    logger.error(f"Error logging sent message: {e}")
                    return Response({
                        "status": "success", 
                        "data": {
                            "id": f"out_temp_{timezone.now().timestamp()}",
                            "content": content,
                            "media_url": actual_content if attachment else None,
                            "media_type": message_type,
                            "filename": getattr(attachment, 'name', None) if attachment else None,
                            "timestamp": timezone.now().isoformat(),
                            "status": "SENT",
                            "type": "outgoing"
                        }
                    })
            else:
                logger.error(f"FAILURE IN SEND MESSAGE wp-backend block: {result}")
                return Response({"status": "error", "message": result.get('error', 'Unknown Error')}, status=500)
        except Exception as e:
            import traceback
            print("API CRASH EXCEPTION HERE:")
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
        except Exception as e:
            print("API ERROR:", str(e))
            return Response({"error": str(e)}, status=500)

class MarkReadAPIView(APIView):
    def post(self, request, phone_number):
        try:
            conv = Conversation.objects.get(phone_number=phone_number)
            conv.unread_count = 0
            conv.save()
            return Response({"status": "success", "message": "Conversation marked as read"})
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found"}, status=404)

class ClearChatAPIView(APIView):
    def post(self, request, phone_number):
        try:
            # 1. Destroy all recorded messaging entities completely
            PendingWhatsAppEvent.objects.filter(phone_number=phone_number).delete()
            WhatsAppMessageLog.objects.filter(recipient_phone=phone_number).delete()
            
            # 2. Reset the Conversation object gracefully so it does not ghost inside the contact list
            try:
                conv = Conversation.objects.get(phone_number=phone_number)
                conv.last_message = ""
                conv.unread_count = 0
                conv.save()
            except Conversation.DoesNotExist:
                pass
                
            return Response({"status": "success", "message": "Chat history permanently wiped"})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)
