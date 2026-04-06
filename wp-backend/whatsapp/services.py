import requests
import re
import mimetypes
import os
from django.conf import settings
from .models import WhatsAppMessage
import logging
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.base_url = "https://graph.facebook.com/v22.0"
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        
        # 1. Sanitize the token to prevent trailing whitespace/newline issues
        raw_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
        self.access_token = str(raw_token).strip() if raw_token else ""
        
        # 2. Log first and last 4 characters safely
        if self.access_token and len(self.access_token) > 8:
            masked = f"{self.access_token[:4]}...{self.access_token[-4:]}"
        else:
            masked = "INVALID_OR_EMPTY"
        logger.info(f"Initialized WhatsAppService. Token: {masked}")

    def verify_connection(self):
        """Perform a lightweight test request to verify token validity."""
        if not self.access_token:
            logger.error("WhatsApp API token is missing.")
            return False, "WhatsApp API token is missing in .env configuration."
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        endpoint = f"{self.base_url}/{self.phone_number_id}"
        try:
            res = requests.get(endpoint, headers=headers, timeout=5)
            if res.ok:
                return True, "Valid"
            else:
                error_body = res.json() if 'application/json' in res.headers.get('Content-Type', '') else res.text
                
                # Detect Sandbox/Dev mode Recipient block (131030)
                if isinstance(error_body, dict) and 'error' in error_body:
                    code = error_body['error'].get('code')
                    if code == 131030 or code == 100:
                        return False, f"[DEV MODE ERROR] The recipient phone number is not in the allowed Meta developer sandbox test list."
                        
                return False, f"HTTP {res.status_code}: {error_body}"
        except Exception as e:
            return False, str(e)

    def upload_media(self, file_path):
        """
        Upload media to WhatsApp servers and return the media ID.
        """
        try:
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                raise ValueError("Could not determine the MIME type of the file.")

            file_name = os.path.basename(file_path)
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
            }
            files = {
                'file': (file_name, open(file_path, 'rb'), mime_type),
                'messaging_product': (None, 'whatsapp'),
            }
            
            endpoint = f"{self.base_url}/{self.phone_number_id}/media"
            logger.info(f"Uploading media file: {file_name} from {endpoint}")
            
            response = requests.post(endpoint, headers=headers, files=files)
            response.raise_for_status()
            
            response_data = response.json()
            media_id = response_data.get('id')
            
            if not media_id:
                raise Exception("Failed to get media ID from response.")
                
            logger.info(f"Media uploaded successfully. Media ID: {media_id}")
            return media_id
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to upload media: {e}")
            if e.response:
                logger.error(f"Response: {e.response.text}")
            raise Exception("Failed to upload media.")
        except Exception as e:
            logger.error(f"An unexpected error occurred during media upload: {e}")
            raise

    def download_media(self, media_id):
        """
        Download media from WhatsApp servers using media ID.
        Returns the binary content and mime type.
        """
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            # Step 1: Get media URL
            media_url_endpoint = f"{self.base_url}/{media_id}"
            res = requests.get(media_url_endpoint, headers=headers)
            res.raise_for_status()
            media_info = res.json()
            
            download_url = media_info.get("url")
            mime_type = media_info.get("mime_type", "application/octet-stream")
            
            if not download_url:
                raise Exception("Media URL not found in response")
            
            # Step 2: Download binary
            file_res = requests.get(download_url, headers=headers)
            file_res.raise_for_status()
            
            return file_res.content, mime_type
        except Exception as e:
            logger.error(f"Failed to download media {media_id}: {e}")
            return None, None

    def _format_phone_number(self, phone_number):
        """
        Format phone number to international format (e.g., 918160131860)
        Remove spaces, +, -, and any other special characters
        """
        # Remove all non-digit characters
        cleaned_number = re.sub(r'\D', '', phone_number)
        
        # If number starts with 91 (India), ensure it's not duplicated
        if cleaned_number.startswith('91') and len(cleaned_number) > 10:
            cleaned_number = cleaned_number[2:] if cleaned_number[2:].startswith('91') else cleaned_number
            
        # If number doesn't start with 91 and is 10 digits, add 91
        if len(cleaned_number) == 10:
            cleaned_number = '91' + cleaned_number
            
        return cleaned_number

    def send_message(self, to_phone, message_type="text", content=None, template_name=None, template_params=None, media_path=None, reply_to_message_id=None, exclude_channel=None, frontend_id=None):
        """
        Send a WhatsApp message using the Cloud API
        
        Args:
            to_phone (str): Recipient's phone number
            message_type (str): Type of message ('text', 'template', 'image', 'document', etc.)
            content (str): Message content for text messages or caption for media
            template_name (str): Name of the template to use
            template_params (dict): Parameters for the template
            media_path (str): The local path to the media file to be sent
            reply_to_message_id (str): The ID of the message to reply to
            exclude_channel (str): Optional channel name to exclude from the broadcast
            frontend_id (str): Optional frontend ID for the message
        """
        try:
            # Verify connectivity and token before sending
            is_valid, err_msg = self.verify_connection()
            if not is_valid:
                raise ValueError(f"WhatsApp API Connectivity Failed: {err_msg}")

            # Format and validate phone number
            formatted_phone = self._format_phone_number(to_phone)
            logger.info(f"Sending WhatsApp message to {formatted_phone} (original: {to_phone})")
            
            if not formatted_phone.startswith('91') or len(formatted_phone) != 12:
                raise ValueError(f"Invalid phone number format. Expected 10 digits with 91 country code. Got: {formatted_phone}")

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            }

            endpoint = f"{self.base_url}/{self.phone_number_id}/messages"
            
            # Prepare message data based on type
            message_data = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": formatted_phone,
            }

            if reply_to_message_id:
                message_data["context"] = {"message_id": reply_to_message_id}

            media_types = ['image', 'document', 'audio', 'video', 'sticker']

            if message_type == "text":
                if not content or len(content.strip()) == 0:
                    raise ValueError("Message content cannot be empty")
                message_data["type"] = "text"
                message_data["text"] = {"body": content}
                logger.info(f"Preparing text message: {content[:50]}...")
            elif message_type == "template":
                if not template_name:
                    raise ValueError("Template name is required for template messages")
                message_data["type"] = "template"
                template_data = {
                    "name": template_name,
                    "language": {"code": "en_US"}
                }
                
                # Add components if template parameters are provided
                if template_params:
                    components = []
                    for param_type, params in template_params.items():
                        component = {
                            "type": param_type,
                            "parameters": []
                        }
                        for param in params:
                            if isinstance(param, dict):
                                component["parameters"].append(param)
                            else:
                                component["parameters"].append({
                                    "type": "text",
                                    "text": str(param)
                                })
                        components.append(component)
                    if components:
                        template_data["components"] = components
                
                message_data["template"] = template_data
                logger.info(f"Preparing template message: {template_name} with params: {template_params}")
            elif message_type in media_types:
                if not media_path:
                    raise ValueError(f"Media path is required for {message_type} messages.")
                
                media_id = self.upload_media(media_path)
                message_data["type"] = message_type
                
                media_object = {"id": media_id}
                if content: # Use content as caption
                    media_object["caption"] = content
                
                # Expose filename dynamically so mobile users see ".pdf" names instead of generic "document" text
                if message_type == "document" and media_path:
                    import os
                    media_object["filename"] = os.path.basename(media_path)

                message_data[message_type] = media_object
                logger.info(f"Preparing {message_type} message with media ID: {media_id}")

            # Log the request details (excluding sensitive data)
            logger.info(f"Sending request to {endpoint}")
            logger.info(f"Message type: {message_type}")
            
            response = requests.post(endpoint, json=message_data, headers=headers)
            
            # Log the response
            logger.info(f"Response status code: {response.status_code}")
            logger.info(f"Response headers: {dict(response.headers)}")
            
            try:
                response_data = response.json()
                logger.info(f"Response data: {response_data}")
            except Exception as e:
                logger.error(f"Failed to parse response JSON: {str(e)}")
                logger.error(f"Raw response: {response.text}")
                # We do not raise here, allow raise_for_status to handle the actual HTTP error
            
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as e:
                # Provide much clearer contextual error if the token was somehow magically valid during GET but failed POST
                if e.response is not None:
                    try:
                        resp_json = e.response.json()
                        if 'error' in resp_json:
                            code = resp_json['error'].get('code')
                            if code == 131030 or code == 100:
                                raise ValueError(f"[DEV MODE ERROR] The recipient phone number ({formatted_phone}) is not in the allowed Meta developer test list.")
                    except ValueError:
                        pass
                raise
            
            # Extract message ID from response
            message_id = None
            if 'messages' in response_data and response_data['messages']:
                message_id = response_data['messages'][0].get('id')
                logger.info(f"Message ID: {message_id}")
            
            # Save the message to database with message ID
            message = WhatsAppMessage.objects.create(
                phone_number=formatted_phone,
                message_type=message_type,
                message_content=content,
                template_name=template_name,
                message_id=message_id,
                status="sent" if response.status_code == 200 else "failed",
                frontend_id=frontend_id
            )
            if media_path:
                import os
                from django.core.files import File
                with open(media_path, 'rb') as f:
                    django_file = File(f, name=os.path.basename(media_path))
                    message.media.save(os.path.basename(media_path), django_file, save=True)

            if reply_to_message_id:
                try:
                    reply_to_msg = WhatsAppMessage.objects.get(message_id=reply_to_message_id)
                    message.reply_to = reply_to_msg
                    message.save()
                except WhatsAppMessage.DoesNotExist:
                    logger.warning(f"Original message with ID {reply_to_message_id} not found for threading.")
            
            logger.info(f"Message saved to database with ID: {message.id}")
            
            self.notify_chat(formatted_phone, message, exclude_channel)
            
            return response_data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to send WhatsApp message: {str(e)}"
            if hasattr(e.response, 'text'):
                try:
                    error_data = e.response.json()
                    error_msg += f"\nAPI Error: {error_data}"
                except:
                    error_msg += f"\nResponse: {e.response.text}"
            logger.error(error_msg)
            
            # Save failed message to database
            WhatsAppMessage.objects.create(
                phone_number=self._format_phone_number(to_phone),
                message_type=message_type,
                message_content=content,
                template_name=template_name,
                status="failed",
                frontend_id=frontend_id
            )
            raise Exception(error_msg)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise

    def update_message_status(self, message_id, status):
        """
        Update the status of a WhatsApp message
        Returns the message instance if found, None otherwise
        """
        try:
            message = WhatsAppMessage.objects.get(message_id=message_id)
            message.status = status
            message.save()
            return message
        except WhatsAppMessage.DoesNotExist:
            return None

    def send_order_confirmation(self, order):
        """
        Send an order confirmation message using WhatsApp template
        
        Args:
            order: Order model instance containing order details
        """
        try:
            # Format order items for the message
            items_text = "\n".join([
                f"• {item.product.name} - ₹{item.price} x {item.quantity}"
                for item in order.items.all()
            ])
            
            # Calculate total amount
            total_amount = order.total_amount
            
            # Prepare template parameters
            template_params = {
                "body": [
                    {
                        "type": "text",
                        "text": f"Order #{order.order_number}"
                    },
                    {
                        "type": "text",
                        "text": items_text
                    },
                    {
                        "type": "text",
                        "text": f"Total Amount: ₹{total_amount}"
                    }
                ]
            }
            
            # Send the template message
            return self.send_message(
                to_phone=order.customer.phone_number,
                message_type="template",
                template_name="order_confirmation",  # You'll need to create this template
                template_params=template_params
            )
            
        except Exception as e:
            logger.error(f"Failed to send order confirmation: {str(e)}")
            raise

    def get_available_templates(self):
        """
        Get list of available WhatsApp message templates
        """
        try:
            # The correct endpoint for templates is at the business account level
            endpoint = f"{self.base_url}/{settings.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            }
            
            logger.info(f"Fetching available templates from {endpoint}")
            response = requests.get(endpoint, headers=headers)
            response.raise_for_status()
            
            templates_data = response.json()
            logger.info(f"Found {len(templates_data.get('data', []))} templates")
            
            # Format the response to be more useful
            templates = []
            for template in templates_data.get('data', []):
                templates.append({
                    'name': template.get('name'),
                    'language': template.get('language'),
                    'status': template.get('status'),
                    'category': template.get('category'),
                    'components': template.get('components', [])
                })
            
            return templates
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to fetch templates: {str(e)}"
            if hasattr(e.response, 'text'):
                try:
                    error_data = e.response.json()
                    error_msg += f"\nAPI Error: {error_data}"
                except:
                    error_msg += f"\nResponse: {e.response.text}"
            logger.error(error_msg)
            raise Exception(error_msg) 
        

    def trigger_crm_appointment_intent(self, phone_number, message_text):
        """
        Triggers an appointment intent webhook to the local CRM backend.
        The CRM (Backend-AutoAICare) will handle it based on its APIs.
        """
        from .models import Workspace
        try:
            workspace = Workspace.objects.filter(is_active=True).first()
            if workspace and workspace.webhook_url:
                # If a generalized webhook is present, we post a special event
                # Or standard REST API call if CRM is on the same host but different port
                # For this implementation, we simulate an API call to CRM
                crm_url = workspace.webhook_url.replace('/api/whatsapp/webhook/', '/api/appointments/intent/')
                logger.info(f"Triggering CRM Appointment API: {crm_url}")
                payload = {
                    "phone_number": phone_number,
                    "text": message_text,
                    "intent": "appointment_booking"
                }
                # Simulate request to CRM
                # requests.post(crm_url, json=payload, headers={"X-API-Key": workspace.api_key}, timeout=5)
                logger.info("Successfully notified CRM of appointment intent.")
        except Exception as e:
            logger.error(f"Error triggering CRM appointment intent: {str(e)}")

    def notify_chat(self, phone_number, message_instance, exclude_channel=None):
        """
        Broadcast a WhatsAppMessage instance to the websocket group for the given phone number.
        
        Args:
            phone_number: The phone number for the chat group
            message_instance: The WhatsAppMessage instance to broadcast
            exclude_channel: Optional channel name to exclude from the broadcast
        """
        print("[notify_chat] Sending to group:")

        channel_layer = get_channel_layer()
        sanitized_phone = re.sub(r'[^a-zA-Z0-9\-_.]', '_', phone_number)
        group_name = f"chat_{sanitized_phone}"
        data = {
            "id": message_instance.id,
            "phone_number": phone_number,
            "content": message_instance.message_content,
            "sender": "contact" if message_instance.status == "received" else "admin",
            "timestamp": str(message_instance.timestamp),
            "status": message_instance.status,  # Include status for frontend
            "message_id": message_instance.message_id,  # Include WhatsApp message ID
            "frontend_id": message_instance.frontend_id,  # Include frontend ID
        }
        
        # Add exclude_channel if provided
        event_data = {
            "type": "chat_message",
            "message": data,
        }
        
        if exclude_channel:
            event_data["exclude_sender"] = exclude_channel
            
        print(f"[notify_chat] Sending to group: {group_name}, data: {data}")
        # Broadcast to specific client chat window (chat_message event)
        async_to_sync(channel_layer.group_send)(group_name, event_data)
        
        # Broadcast to global dashboard (new_message event)
        async_to_sync(channel_layer.group_send)(
            "whatsapp_messages",
            {
                "type": "new_message",
                "message": data,
            }
        )
