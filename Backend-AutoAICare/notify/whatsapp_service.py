"""
WhatsApp Service using Meta Cloud API

Handles WhatsApp message sending via Meta's Cloud API.
Supports company-specific credentials and template messages.
"""

import requests
import logging
import re
from typing import Dict, Any, Optional, List
from django.conf import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """
    Service for sending WhatsApp messages via Meta Cloud API.
    Each company can have their own WhatsApp Business Account credentials.
    """
    
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    @classmethod
    def get_company_credentials(cls, company) -> Optional[Dict[str, str]]:
        """
        Get WhatsApp credentials for a specific company.
        
        Args:
            company: Company instance
            
        Returns:
            Dict with 'access_token', 'phone_number_id', 'business_account_id'
            or None if not configured
        """
        try:
            company_settings = company.company_settings
            
            if not company_settings.enable_whatsapp_notifications:
                logger.info(f"WhatsApp notifications disabled for company {company.name}")
                return None
            
            credentials = company_settings.whatsapp_credentials
            
            if not credentials or credentials.get('provider') != 'meta':
                logger.warning(f"WhatsApp credentials not configured for company {company.name}")
                return None
            
            required_fields = ['access_token', 'phone_number_id']
            if not all(field in credentials for field in required_fields):
                logger.error(f"Missing required WhatsApp credentials for company {company.name}")
                return None
            
            return {
                'access_token': credentials['access_token'],
                'phone_number_id': credentials['phone_number_id'],
                'business_account_id': credentials.get('business_account_id', ''),
            }
        except Exception as e:
            logger.error(f"Error getting WhatsApp credentials for company {company.name}: {str(e)}")
            return None
    
    @classmethod
    def validate_phone_number(cls, phone: str) -> Optional[str]:
        """
        Validate and format phone number for WhatsApp.
        
        Args:
            phone: Phone number string
            
        Returns:
            Formatted phone number (E.164 format) or None if invalid
        """
        if not phone:
            return None
        
        # Remove all non-digit characters
        phone = re.sub(r'\D', '', phone)
        
        # Check if it starts with country code
        if not phone.startswith('+'):
            # Assume India (+91) if no country code
            if len(phone) == 10:
                phone = '91' + phone
            elif not phone.startswith('91') and len(phone) == 10:
                phone = '91' + phone
        
        # Remove + if present
        phone = phone.replace('+', '')
        
        # Validate length (should be between 10-15 digits)
        if len(phone) < 10 or len(phone) > 15:
            logger.warning(f"Invalid phone number length: {phone}")
            return None
        
        return phone
    
    @classmethod
    def send_template_message(
        cls,
        company,
        phone: str,
        template_name: str,
        language_code: str = 'en',
        header_params: Optional[List[str]] = None,
        body_params: Optional[List[str]] = None,
        button_params: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send a WhatsApp template message.
        
        Args:
            company: Company instance
            phone: Recipient phone number
            template_name: Name of the approved WhatsApp template
            language_code: Template language code (default: 'en')
            header_params: List of header parameter values
            body_params: List of body parameter values
            button_params: List of button parameter values
            
        Returns:
            Dict with 'status', 'message_id', and optional 'error'
        """
        # Get company credentials
        credentials = cls.get_company_credentials(company)
        if not credentials:
            return {
                'status': 'failed',
                'error': 'WhatsApp not configured for this company'
            }
        
        # Validate phone number
        formatted_phone = cls.validate_phone_number(phone)
        if not formatted_phone:
            return {
                'status': 'failed',
                'error': f'Invalid phone number: {phone}'
            }
        
        # Build template components
        components = []
        
        # Header component
        if header_params:
            components.append({
                "type": "header",
                "parameters": [{"type": "text", "text": param} for param in header_params]
            })
        
        # Body component
        if body_params:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": str(param)} for param in body_params]
            })
        
        # Button component
        if button_params:
            components.append({
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [{"type": "text", "text": param} for param in button_params]
            })
        
        # Build request payload
        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                },
                "components": components
            }
        }
        
        # Send request to Meta Cloud API
        url = f"{cls.BASE_URL}/{credentials['phone_number_id']}/messages"
        headers = {
            "Authorization": f"Bearer {credentials['access_token']}",
            "Content-Type": "application/json"
        }
        
        try:
            logger.info(f"Sending WhatsApp template '{template_name}' to {formatted_phone} for company {company.name}")
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response_data = response.json()
            
            if response.status_code == 200:
                message_id = response_data.get('messages', [{}])[0].get('id')
                logger.info(f"WhatsApp message sent successfully. Message ID: {message_id}")
                return {
                    'status': 'success',
                    'message_id': message_id,
                    'phone': formatted_phone
                }
            else:
                error_message = response_data.get('error', {}).get('message', 'Unknown error')
                logger.error(f"WhatsApp API error: {error_message}")
                return {
                    'status': 'failed',
                    'error': error_message,
                    'error_code': response_data.get('error', {}).get('code'),
                    'phone': formatted_phone
                }
        
        except requests.exceptions.Timeout:
            logger.error("WhatsApp API request timeout")
            return {
                'status': 'failed',
                'error': 'Request timeout'
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsApp API request failed: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error sending WhatsApp message: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    @classmethod
    def send_text_message(
        cls,
        company,
        phone: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send a plain text WhatsApp message.
        Note: This only works within 24 hours of user-initiated conversation.
        
        Args:
            company: Company instance
            phone: Recipient phone number
            message: Text message to send
            
        Returns:
            Dict with 'status', 'message_id', and optional 'error'
        """
        # Get company credentials
        credentials = cls.get_company_credentials(company)
        if not credentials:
            return {
                'status': 'failed',
                'error': 'WhatsApp not configured for this company'
            }
        
        # Validate phone number
        formatted_phone = cls.validate_phone_number(phone)
        if not formatted_phone:
            return {
                'status': 'failed',
                'error': f'Invalid phone number: {phone}'
            }
        
        # Build request payload
        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        # Send request to Meta Cloud API
        url = f"{cls.BASE_URL}/{credentials['phone_number_id']}/messages"
        headers = {
            "Authorization": f"Bearer {credentials['access_token']}",
            "Content-Type": "application/json"
        }
        
        try:
            logger.info(f"Sending WhatsApp text message to {formatted_phone} for company {company.name}")
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response_data = response.json()
            
            if response.status_code == 200:
                message_id = response_data.get('messages', [{}])[0].get('id')
                logger.info(f"WhatsApp text message sent successfully. Message ID: {message_id}")
                return {
                    'status': 'success',
                    'message_id': message_id,
                    'phone': formatted_phone
                }
            else:
                error_message = response_data.get('error', {}).get('message', 'Unknown error')
                logger.error(f"WhatsApp API error: {error_message}")
                return {
                    'status': 'failed',
                    'error': error_message,
                    'error_code': response_data.get('error', {}).get('code'),
                    'phone': formatted_phone
                }
        
        except Exception as e:
            logger.error(f"Error sending WhatsApp text message: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e)
            }
