"""
Test script for WhatsApp integration.
Run this to verify WhatsApp setup is working correctly.

Usage:
    python test_whatsapp.py --company COMPANY_SLUG --phone +919876543210
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from companies.models import Company
from notify.whatsapp_service import WhatsAppService
import argparse


def test_whatsapp_service(company_slug, test_phone):
    """Test WhatsApp service with a company."""
    
    print("=" * 60)
    print("WhatsApp Integration Test")
    print("=" * 60)
    
    # Get company
    try:
        company = Company.objects.get(slug=company_slug)
        print(f"✓ Company found: {company.name}")
    except Company.DoesNotExist:
        print(f"✗ Company '{company_slug}' not found")
        return False
    
    # Check company settings
    try:
        settings = company.company_settings
        print(f"✓ Company settings found")
        
        if not settings.enable_whatsapp_notifications:
            print(f"✗ WhatsApp notifications not enabled for {company.name}")
            print(f"  Enable in Django Admin: Companies → Company Settings")
            return False
        print(f"✓ WhatsApp notifications enabled")
        
        if not settings.whatsapp_credentials:
            print(f"✗ WhatsApp credentials not configured")
            print(f"  Add credentials in Django Admin")
            return False
        print(f"✓ WhatsApp credentials configured")
        
    except Exception as e:
        print(f"✗ Error checking company settings: {e}")
        return False
    
    # Test credentials retrieval
    credentials = WhatsAppService.get_company_credentials(company)
    if not credentials:
        print(f"✗ Failed to retrieve WhatsApp credentials")
        return False
    print(f"✓ Credentials retrieved successfully")
    print(f"  Phone Number ID: {credentials['phone_number_id'][:10]}...")
    
    # Test phone number validation
    formatted_phone = WhatsAppService.validate_phone_number(test_phone)
    if not formatted_phone:
        print(f"✗ Invalid phone number: {test_phone}")
        return False
    print(f"✓ Phone number validated: {formatted_phone}")
    
    # Test sending a simple template message
    print("\n" + "-" * 60)
    print("Attempting to send test message...")
    print("-" * 60)
    
    # Note: This will only work if you have an approved template named 'test_message'
    # For actual testing, use an approved template from your account
    result = WhatsAppService.send_template_message(
        company=company,
        phone=test_phone,
        template_name='booking_confirmed',  # Change to your approved template
        language_code='en',
        body_params=['Test User', '123', 'Today']
    )
    
    if result['status'] == 'success':
        print(f"✓ Message sent successfully!")
        print(f"  Message ID: {result.get('message_id')}")
        print(f"  Phone: {result.get('phone')}")
        return True
    else:
        print(f"✗ Failed to send message")
        print(f"  Error: {result.get('error')}")
        if result.get('error_code'):
            print(f"  Error Code: {result.get('error_code')}")
        
        # Common error messages
        if 'template' in result.get('error', '').lower():
            print("\n  Possible solutions:")
            print("  1. Create template in Django: python manage.py create_whatsapp_templates --company", company_slug)
            print("  2. Submit template to WhatsApp for approval via Meta Business Manager")
            print("  3. Mark template as APPROVED in Django Admin after WhatsApp approval")
        
        return False


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Test WhatsApp integration')
    parser.add_argument('--company', required=True, help='Company slug')
    parser.add_argument('--phone', required=True, help='Test phone number (E.164 format)')
    
    args = parser.parse_args()
    
    success = test_whatsapp_service(args.company, args.phone)
    
    print("\n" + "=" * 60)
    if success:
        print("✓ WhatsApp integration test PASSED")
    else:
        print("✗ WhatsApp integration test FAILED")
    print("=" * 60)
    
    sys.exit(0 if success else 1)
