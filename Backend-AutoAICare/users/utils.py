import random
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


def generate_otp():
    """Generate a 6-digit OTP."""
    return str(random.randint(100000, 999999))


def send_otp_email(user, otp):
    """Send OTP via email."""
    subject = 'Your OTP for Car Service Management'
    message = f'Your OTP is: {otp}\n\nThis OTP is valid for 10 minutes.'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [user.email]
    
    try:
        send_mail(subject, message, from_email, recipient_list)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_otp_sms(phone, otp):
    """Send OTP via SMS using MSG91."""
    # Implement MSG91 integration here
    # For now, just print the OTP
    print(f"SMS OTP to {phone}: {otp}")
    return True


def verify_otp(user, otp):
    """Verify if the OTP is correct and not expired."""
    if not user.otp or not user.otp_created_at:
        return False
    
    # Check if OTP matches
    if user.otp != otp:
        return False
    
    # Check if OTP is expired (10 minutes)
    expiry_time = user.otp_created_at + timedelta(minutes=10)
    if timezone.now() > expiry_time:
        return False
    
    return True


def create_and_send_otp(user, via_email=True, via_sms=False):
    """Create OTP and send it to user."""
    otp = generate_otp()
    user.otp = otp
    user.otp_created_at = timezone.now()
    user.save()
    
    success = False
    if via_email:
        success = send_otp_email(user, otp)
    if via_sms and user.phone:
        success = send_otp_sms(user.phone, otp)
    
    return success
