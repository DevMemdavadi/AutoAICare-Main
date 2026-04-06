import logging
import re
from django.utils import timezone
from .wp_client import WPClient

logger = logging.getLogger(__name__)

def normalize_phone_number(phone):
    """
    Normalizes a phone number to standard E.164 without the plus sign for WhatsApp.
    Ensures that Indian 10-digit numbers automatically get the '91' country code.
    """
    if not phone:
        return ""
    
    # Remove all non-digit characters (including spaces, dashes, plus signs)
    cleaned = re.sub(r'\D', '', str(phone))
    
    # If it's exactly 10 digits, assume Indian number and prepend 91
    if len(cleaned) == 10:
        return "91" + cleaned
        
    return cleaned

def send_booking_confirmation_whatsapp(booking, generated_password=None, user_id=None):
    """
    Sends an automated WhatsApp booking confirmation to the customer.
    Handles missing data gracefully by providing defaults.
    """
    try:
        from companies.models import CompanySettings
        from notify.models import WhatsAppMessageLog
        
        # 1. Fetch Company Settings to get WP Credentials
        settings = None
        if booking.company:
            settings = CompanySettings.objects.filter(company=booking.company).exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()
            
        # Fallback for single-tenant or Dev test bookings that don't have a company assigned
        if not settings:
            settings = CompanySettings.objects.exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()
            
        if not settings or not settings.wp_api_key:
            logger.warning(f"Skipping WhatsApp confirmation for Booking {booking.id}: No WP Gateway API Key configured.")
            return False

        # 2. Extract Customer Phone Number
        raw_phone = None
        if getattr(booking, 'customer', None) and getattr(booking.customer, 'user', None):
            raw_phone = getattr(booking.customer.user, 'phone', None)
        
        if not raw_phone:
            logger.warning(f"Skipping WhatsApp confirmation for Booking {booking.id}: No customer phone number.")
            return False
            
        normalized_phone = normalize_phone_number(raw_phone)
        if not normalized_phone:
            logger.warning(f"Skipping WhatsApp confirmation for Booking {booking.id}: Invalid phone number after normalization.")
            return False
            
        customer_name = booking.customer.user.name or "Valued Customer"

        # 3. Extract Booking Details with Graceful Fallbacks
        booking_id = f"#{booking.id}"
        
        # Get Service Name and Category
        service_name = "Auto Care Services"
        category_name = "General"
        if booking.packages.exists():
            service_name = booking.packages.first().name
            try:
                cats = list(booking.packages.values_list('category', flat=True))
                cats = [str(c).capitalize() for c in set(cats) if c]
                if cats:
                    category_name = ', '.join(cats)
            except Exception:
                pass
        else:
            if getattr(booking, 'primary_package', None):
                service_name = booking.primary_package.name
                if getattr(booking.primary_package, 'category', None):
                    category_name = str(booking.primary_package.category).capitalize()
            
        # Get Date and Time
        try:
            booking_date = booking.booking_datetime.strftime('%d %b %Y')
            booking_time = booking.booking_datetime.strftime('%I:%M %p')
        except Exception:
            booking_date = "your scheduled date"
            booking_time = "your scheduled time"
            
        # Get Location and Contact
        location = "Our Service Center"
        contact_number = "our support team"
        if booking.branch:
            location = booking.branch.name
            if booking.branch.phone:
                contact_number = booking.branch.phone
        elif booking.company and booking.company.phone:
            contact_number = booking.company.phone

        # 4. Generate Standard Booking Confirmation (Text Message mimicking a Template)
        # Using message_type="text" to ensure it sends without requiring prior Meta approval 
        # (Ideal for standard operational updates)
        
        # Add-on Services details
        addons_list = booking.addons.all() if booking.id else []
        if addons_list:
            addon_text = "\n".join([f"• {addon.name}" for addon in addons_list])
            addon_section = f"Add-on Services:\n{addon_text}\n\n"
        else:
            addon_section = ""
        
        # Credentials details
        credentials_section = ""
        if generated_password:
            # use phone as user id if not provided explicitly
            uid = user_id if user_id else (raw_phone or "")
            customer_email = booking.customer.user.email if getattr(booking, 'customer', None) and getattr(booking.customer, 'user', None) and booking.customer.user.email else "Not provided"
            credentials_section = (
                f"Login Credentials:\n"
                f"Name: {customer_name}\n"
                f"Email: {customer_email}\n"
                f"Phone: {uid}\n"
                f"Password: {generated_password}\n\n"
            )

        message_content = (
            f"*Auto AI Care - Booking Confirmed*\n\n"
            f"Dear {customer_name},\n\n"
            f"Your booking has been successfully scheduled.\n\n"
            f"Details:\n"
            f"• Booking ID: {booking_id}\n"
            f"• Category: {category_name}\n"
            f"• Service: {service_name}\n"
            f"• Date: {booking_date}\n"
            f"• Time: {booking_time}\n"
            f"• Location: {location}\n\n"
            f"{addon_section}"
            f"{credentials_section}"
            f"For support, contact {contact_number}\n"
            f"Ref: {int(timezone.now().timestamp())}"
        )

        # Resolve WP Gateway URL from settings, fallback to port 8000 as wp-backend runs on 8000 natively
        wp_url = settings.wp_url if getattr(settings, 'wp_url', None) else "http://127.0.0.1:8000/api"
        wp_client = WPClient(wp_url, settings.wp_api_key)
        
        # Now that connectivity is proven and the API issues are fixed,
        # we revert back to sending the full detailed text confirmation!
        result = wp_client.send_message(
            phone_number=normalized_phone, 
            content=message_content, 
            message_type='text'
        )

        # 6. Fallback logging company ID safely for walk-ins
        log_company = booking.company if booking.company else (settings.company if settings else None)

        if result.get('status') == 'success':
            # Extract underlying message ID gracefully
            raw_message_id = (
                result.get('message_id') or 
                result.get('messages', [{}])[0].get('id') or 
                result.get('id')
            )
            whatsapp_message_id = str(raw_message_id).strip() if raw_message_id else ""
            
            # Log success
            WhatsAppMessageLog.objects.create(
                company=log_company,
                recipient_phone=normalized_phone,
                template_name='Booking Confirmation',
                message_content=message_content,
                status='SENT',
                sent_at=timezone.now(),
                whatsapp_message_id=whatsapp_message_id
            )
            logger.info(f"Successfully sent WhatsApp confirmation for Booking {booking.id}")
            return True
        else:
            # Log failure
            error_msg = str(result.get('error', 'Unknown Error'))
            
            # Incorporate raw API status code and body for easier debugging
            resp_code = result.get('response_code')
            resp_body = result.get('response_body')
            
            if resp_code or resp_body:
                error_msg += f"\n[Diagnostic] HTTP {resp_code}: {resp_body}"
                
            WhatsAppMessageLog.objects.create(
                company=log_company,
                recipient_phone=normalized_phone,
                template_name='Booking Confirmation',
                message_content=message_content,
                status='FAILED',
                error_message=error_msg
            )
            logger.error(f"Failed to send WhatsApp confirmation for Booking {booking.id}: {error_msg}")
            return False

    except Exception as e:
        logger.error(f"Exception while sending WhatsApp confirmation for Booking {booking.id}: {str(e)}")
        # We catch all exceptions deliberately so this NEVER blocks the actual booking creation transaction
        return False
