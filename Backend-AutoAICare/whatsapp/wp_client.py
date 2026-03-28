import requests
import logging

logger = logging.getLogger(__name__)

class WPClient:
    """
    Client for interacting with the WP Messaging Gateway API.
    """
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/') if base_url else None
        # Ensure there are no hidden newlines or spaces crashing Python's HTTP library
        self.api_key = str(api_key).strip() if api_key else None
        
    def _get_headers(self):
        return {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key
        }

    def is_configured(self):
        return bool(self.base_url and self.api_key)

    def send_message(self, phone_number, content, message_type='text', template_name=None, template_params=None):
        if not self.is_configured():
            logger.error("WP Client not configured. Cannot send message.")
            return {"status": "error", "error": "WP Gateway not configured for this company."}
            
        url = f"{self.base_url}/whatsapp/send/"
        if message_type == 'template':
            url = f"{self.base_url}/whatsapp/send/template/"
            
        payload = {
            "phone_number": phone_number,
            "message_type": message_type,
            "content": content,
        }
        
        if template_name:
            payload["template_name"] = template_name
        if template_params:
            payload["template_params"] = template_params
            
        try:
            response = requests.post(url, json=payload, headers=self._get_headers(), timeout=10)
            if not response.ok:
                error_body = response.json() if 'application/json' in response.headers.get('Content-Type', '') else response.text
                error_msg = error_body.get('error') if isinstance(error_body, dict) else error_body
                logger.error(f"Failed to send message via WP Gateway: {error_msg}")
                return {
                    "status": "error", 
                    "error": str(error_msg),
                    "response_code": response.status_code,
                    "response_body": str(error_body)
                }
                
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send message via WP Gateway: {e}")
            
            # Extract response details if available
            resp_code = None
            resp_body = None
            if hasattr(e, 'response') and e.response is not None:
                resp_code = e.response.status_code
                resp_body = e.response.text
                
            return {
                "status": "error", 
                "error": str(e),
                "response_code": resp_code,
                "response_body": resp_body
            }
