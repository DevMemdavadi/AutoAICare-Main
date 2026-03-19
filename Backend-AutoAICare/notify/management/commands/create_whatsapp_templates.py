"""
Management command to create sample WhatsApp templates for a company.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from companies.models import Company
from notify.models import WhatsAppTemplate


class Command(BaseCommand):
    help = 'Create sample WhatsApp templates for a company'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            required=True,
            help='Company slug or name'
        )
        parser.add_argument(
            '--approve',
            action='store_true',
            help='Mark templates as approved (for testing)'
        )

    def handle(self, *args, **options):
        company_identifier = options['company']
        auto_approve = options['approve']
        
        # Get company
        try:
            company = Company.objects.get(slug=company_identifier)
        except Company.DoesNotExist:
            try:
                company = Company.objects.get(name=company_identifier)
            except Company.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Company "{company_identifier}" not found'))
                return
        
        self.stdout.write(self.style.SUCCESS(f'Creating WhatsApp templates for: {company.name}'))
        
        # Sample templates
        templates = [
            {
                'template_name': 'booking_confirmed',
                'notification_type': 'booking_confirmed',
                'category': 'TRANSACTIONAL',
                'header_text': 'Booking Confirmed',
                'body_text': 'Hello {{1}}, your booking #{{2}} has been confirmed for {{3}}. We look forward to serving you!',
                'footer_text': f'{company.name}',
                'variable_mapping': {
                    '1': 'customer_name',
                    '2': 'booking_id',
                    '3': 'service_date'
                }
            },
            {
                'template_name': 'job_started',
                'notification_type': 'job_started',
                'category': 'TRANSACTIONAL',
                'header_text': 'Work Started',
                'body_text': 'Hi {{1}}, we have started working on your {{2}}. Job #{{3}}. Expected completion: {{4}}.',
                'footer_text': f'{company.name}',
                'variable_mapping': {
                    '1': 'customer_name',
                    '2': 'vehicle_info',
                    '3': 'job_id',
                    '4': 'expected_completion'
                }
            },
            {
                'template_name': 'job_completed',
                'notification_type': 'job_completed',
                'category': 'TRANSACTIONAL',
                'header_text': 'Work Completed',
                'body_text': 'Great news {{1}}! Your {{2}} is ready for pickup. Job #{{3}} has been completed. Thank you for choosing us!',
                'footer_text': f'{company.name}',
                'variable_mapping': {
                    '1': 'customer_name',
                    '2': 'vehicle_info',
                    '3': 'job_id'
                }
            },
            {
                'template_name': 'invoice_created',
                'notification_type': 'invoice_created',
                'category': 'TRANSACTIONAL',
                'header_text': 'Invoice Generated',
                'body_text': 'Hello {{1}}, your invoice #{{2}} for ₹{{3}} is ready. Please proceed with payment.',
                'footer_text': f'{company.name}',
                'variable_mapping': {
                    '1': 'customer_name',
                    '2': 'invoice_number',
                    '3': 'total_amount'
                }
            },
            {
                'template_name': 'payment_success',
                'notification_type': 'payment_success',
                'category': 'TRANSACTIONAL',
                'header_text': 'Payment Received',
                'body_text': 'Thank you {{1}}! We have received your payment of ₹{{2}} for invoice #{{3}}. Receipt: {{4}}',
                'footer_text': f'{company.name}',
                'variable_mapping': {
                    '1': 'customer_name',
                    '2': 'amount',
                    '3': 'invoice_number',
                    '4': 'receipt_number'
                }
            },
            {
                'template_name': 'appointment_approved',
                'notification_type': 'appointment_approved',
                'category': 'TRANSACTIONAL',
                'header_text': 'Appointment Approved',
                'body_text': 'Hi {{1}}, your appointment for {{2}} on {{3}} has been approved. See you soon!',
                'footer_text': f'{company.name}',
                'variable_mapping': {
                    '1': 'customer_name',
                    '2': 'service_name',
                    '3': 'appointment_date'
                }
            },
            {
                'template_name': 'feedback_request',
                'notification_type': 'feedback_request',
                'category': 'TRANSACTIONAL',
                'header_text': 'Share Your Feedback',
                'body_text': 'Hello {{1}}, we hope you enjoyed our service! Please share your feedback for job #{{2}}. Your opinion matters!',
                'footer_text': f'{company.name}',
                'variable_mapping': {
                    '1': 'customer_name',
                    '2': 'job_id'
                }
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for template_data in templates:
            template, created = WhatsAppTemplate.objects.update_or_create(
                company=company,
                template_name=template_data['template_name'],
                defaults={
                    'notification_type': template_data['notification_type'],
                    'category': template_data['category'],
                    'header_text': template_data.get('header_text', ''),
                    'body_text': template_data['body_text'],
                    'footer_text': template_data.get('footer_text', ''),
                    'variable_mapping': template_data.get('variable_mapping', {}),
                    'approval_status': 'APPROVED' if auto_approve else 'PENDING',
                    'approved_at': timezone.now() if auto_approve else None,
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Created: {template.template_name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'  ↻ Updated: {template.template_name}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nSummary:'))
        self.stdout.write(f'  Created: {created_count}')
        self.stdout.write(f'  Updated: {updated_count}')
        
        if not auto_approve:
            self.stdout.write(self.style.WARNING('\n⚠ Templates are marked as PENDING.'))
            self.stdout.write(self.style.WARNING('You need to:'))
            self.stdout.write(self.style.WARNING('1. Submit these templates to WhatsApp for approval via Meta Business Manager'))
            self.stdout.write(self.style.WARNING('2. Wait for approval (24-48 hours)'))
            self.stdout.write(self.style.WARNING('3. Update approval_status to APPROVED in Django admin'))
        else:
            self.stdout.write(self.style.SUCCESS('\n✓ Templates marked as APPROVED (for testing only)'))
            self.stdout.write(self.style.WARNING('⚠ In production, templates must be approved by WhatsApp'))
