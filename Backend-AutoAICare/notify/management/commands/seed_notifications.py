from django.core.management.base import BaseCommand
from notify.models import NotificationTemplate


class Command(BaseCommand):
    help = 'Seed notification templates'
    
    def handle(self, *args, **options):
        templates = [
            {
                'name': 'Booking Created',
                'notification_type': 'booking_created',
                'channel': 'both',
                'email_subject': 'Booking Confirmation - #{booking_id}',
                'email_body': '''Dear {{customer_name}},

Your booking has been successfully created!

Booking Details:
- Booking ID: #{{booking_id}}
- Service: {{package_name}}
- Date & Time: {{booking_datetime}}
- Total Amount: ₹{{total_price}}

We'll send you a confirmation once your booking is confirmed by our team.

Thank you for choosing our service!

Best regards,
Car Service Team''',
                'sms_body': 'Hi {{customer_name}}, your booking #{{booking_id}} for {{package_name}} on {{booking_datetime}} is confirmed. Total: ₹{{total_price}}',
            },
            {
                'name': 'Booking Confirmed',
                'notification_type': 'booking_confirmed',
                'channel': 'both',
                'email_subject': 'Booking Confirmed - #{booking_id}',
                'email_body': '''Dear {{customer_name}},

Great news! Your booking has been confirmed by our team.

Booking ID: #{{booking_id}}
Scheduled Date & Time: {{booking_datetime}}

Please arrive 10 minutes before your scheduled time.

Best regards,
Car Service Team''',
                'sms_body': 'Hi {{customer_name}}, your booking #{{booking_id}} is CONFIRMED for {{booking_datetime}}. See you soon!',
            },
            {
                'name': 'Job Started',
                'notification_type': 'job_started',
                'channel': 'both',
                'email_subject': 'Work Started on Your Vehicle',
                'email_body': '''Dear {{customer_name}},

Our technician has started working on your {{vehicle}}.

Job ID: #{{job_id}}
Technician: {{technician_name}}

We'll keep you updated on the progress.

Best regards,
Car Service Team''',
                'sms_body': 'Hi {{customer_name}}, work on your {{vehicle}} has started. Job #{{job_id}} - Technician: {{technician_name}}',
            },
            {
                'name': 'Job Completed',
                'notification_type': 'job_completed',
                'channel': 'both',
                'email_subject': 'Your Vehicle is Ready!',
                'email_body': '''Dear {{customer_name}},

Excellent news! Your {{vehicle}} is ready for pickup.

Job ID: #{{job_id}}
Estimated Delivery: {{estimated_delivery}}

Please collect your vehicle at your earliest convenience.

Best regards,
Car Service Team''',
                'sms_body': 'Hi {{customer_name}}, your {{vehicle}} is ready! Job #{{job_id}} completed. Pickup: {{estimated_delivery}}',
            },
            {
                'name': 'Technician Assigned',
                'notification_type': 'technician_assigned',
                'channel': 'both',
                'email_subject': 'New Job Assigned - #{{job_id}}',
                'email_body': '''Dear {{technician_name}},

You have been assigned a new job.

Job ID: #{{job_id}}
Customer: {{customer_name}}
Vehicle: {{vehicle}}
Service: {{service_name}}

Please review the job details and get started.

Best regards,
Car Service Team''',
                'sms_body': 'Hi {{technician_name}}, you have been assigned job #{{job_id}} for {{customer_name}} - {{vehicle}}. Please review details.',
            },
            {
                'name': 'Job Created',
                'notification_type': 'job_created',
                'channel': 'both',
                'email_subject': 'New Job Created - #{{job_id}}',
                'email_body': '''Dear {{admin_name}},

A new job has been created in your branch.

Job ID: #{{job_id}}
Customer: {{customer_name}}
Vehicle: {{vehicle}}
Service: {{service_name}}
Technician: {{technician_name}}

Please monitor the progress of this job.

Best regards,
Car Service Team''',
                'sms_body': 'New job #{{job_id}} created for {{customer_name}} - {{vehicle}}. Technician: {{technician_name}}.',
            },
            {
                'name': 'Job Warning',
                'notification_type': 'job_warning',
                'channel': 'both',
                'email_subject': 'Job Time Warning - #{{job_id}}',
                'email_body': '''Dear {{technician_name}},

Time is running low for job #{{job_id}}.

Vehicle: {{vehicle}}
Customer: {{customer_name}}
Remaining Time: {{remaining_minutes}} minutes

Please wrap up the job soon or request an extension.

Best regards,
Car Service Team''',
                'sms_body': 'Warning: Job #{{job_id}} for {{customer_name}} has only {{remaining_minutes}} minutes remaining. Please complete soon.',
            },
            {
                'name': 'Job Overdue',
                'notification_type': 'job_overdue',
                'channel': 'both',
                'email_subject': 'Job Overdue Alert - #{{job_id}}',
                'email_body': '''Dear {{technician_name}},

Job #{{job_id}} is overdue by {{overdue_minutes}} minutes.

Vehicle: {{vehicle}}
Customer: {{customer_name}}

Please complete this job as soon as possible or update the status.

Best regards,
Car Service Team''',
                'sms_body': 'Alert: Job #{{job_id}} for {{customer_name}} is {{overdue_minutes}} minutes overdue. Please complete immediately.',
            },
            {
                'name': 'Payment Success',
                'notification_type': 'payment_success',
                'channel': 'both',
                'email_subject': 'Payment Received - Invoice #{payment_id}',
                'email_body': '''Dear {{customer_name}},

We have successfully received your payment.

Payment ID: #{{payment_id}}
Amount: ₹{{amount}}
Payment Method: {{payment_method}}

Thank you for your payment!

Best regards,
Car Service Team''',
                'sms_body': 'Payment of ₹{{amount}} received successfully. Payment #{{payment_id}}. Thank you!',
            },
            {
                'name': 'Invoice Created',
                'notification_type': 'invoice_created',
                'channel': 'email',
                'email_subject': 'Invoice Generated - {{invoice_number}}',
                'email_body': '''Dear {{customer_name}},

Your invoice has been generated.

Invoice Number: {{invoice_number}}
{% if total_amount > 0 %}Total Amount: ₹{{total_amount}}
{% endif %}{% if due_date != 'N/A' %}Due Date: {{due_date}}
{% endif %}
Please proceed with payment at your earliest convenience.

Best regards,
Car Service Team''',
                'sms_body': 'Invoice {{invoice_number}} generated.{% if total_amount > 0 %} Amount: ₹{{total_amount}}.{% endif %}',
            },
            {
                'name': 'Feedback Request',
                'notification_type': 'feedback_request',
                'channel': 'email',
                'email_subject': 'How was your experience?',
                'email_body': '''Dear {{customer_name}},

Thank you for choosing our service!

We'd love to hear about your experience with job #{{job_id}}.

Your feedback helps us improve our services.

Best regards,
Car Service Team''',
                'sms_body': 'Hi {{customer_name}}, please share your feedback for job #{{job_id}}. We value your opinion!',
            },
            {
                'name': 'Google Review Request',
                'notification_type': 'google_review_request',
                'channel': 'both',
                'email_subject': 'Review Your Experience with Car Service Team',
                'email_body': '''Dear {{customer_name}},

Thank you for choosing our service! We hope you are satisfied with the work done on your {{vehicle}}.

If you have a moment, we would love to get your feedback on Google:
{{review_url}}

Your review helps us improve and serve you better.

Best regards,
Car Service Team''',
                'sms_body': 'Hi {{customer_name}}, thanks for visiting! Please rate your experience with us on Google: {{review_url}}',
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for template_data in templates:
            template, created = NotificationTemplate.objects.update_or_create(
                notification_type=template_data['notification_type'],
                defaults=template_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created template: {template.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Updated template: {template.name}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nSeeding complete!'))
        self.stdout.write(self.style.SUCCESS(f'Created: {created_count} templates'))
        self.stdout.write(self.style.SUCCESS(f'Updated: {updated_count} templates'))
