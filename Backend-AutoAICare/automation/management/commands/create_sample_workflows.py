"""
Management command to create sample workflow templates
"""
from django.core.management.base import BaseCommand
from automation.models import WorkflowTemplate, WorkflowTrigger, WorkflowAction


class Command(BaseCommand):
    help = 'Create sample workflow templates for common use cases'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample workflow templates...')
        
        # 1. Booking Confirmation Workflow
        self.create_booking_confirmation()
        
        # 2. Service Reminder Workflow
        self.create_service_reminder()
        
        # 3. Payment Reminder Workflow
        self.create_payment_reminder()
        
        # 4. Birthday Wishes Workflow
        self.create_birthday_wishes()
        
        # 5. Post-Service Follow-up Workflow
        self.create_post_service_followup()
        
        # 6. Review Request Workflow
        self.create_review_request()
        
        # 7. Inactive Customer Re-engagement
        self.create_inactive_customer_reengagement()
        
        # 8. Membership Expiry Reminder
        self.create_membership_expiry_reminder()
        
        # 9. Payment Received Confirmation
        self.create_payment_confirmation()
        
        # 10. Appointment Reminder
        self.create_appointment_reminder()
        
        self.stdout.write(self.style.SUCCESS('Successfully created 10 sample workflow templates!'))
    
    def create_booking_confirmation(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Booking Confirmation',
            defaults={
                'description': 'Send confirmation when booking is created',
                'trigger_type': 'booking_created',
                'is_active': True
            }
        )
        
        if created:
            # Create trigger
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='booking_created',
                conditions={},
                delay_minutes=0
            )
            
            # Create actions
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='Hi {{customer.name}}, your booking #{{booking.id}} is confirmed for {{booking.date}}. We look forward to serving you! - DetailEase',
                delay_minutes=0,
                order=1
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='create_notification',
                channel='notification',
                template_content='Booking #{{booking.id}} confirmed for {{customer.name}}',
                delay_minutes=0,
                order=2
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_service_reminder(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Service Reminder',
            defaults={
                'description': 'Send reminder 1 day before appointment',
                'trigger_type': 'appointment_reminder',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='appointment_reminder',
                conditions={},
                delay_minutes=0
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_sms',
                channel='sms',
                template_content='Reminder: Your car service appointment is tomorrow at {{appointment.time}}. See you soon! - DetailEase',
                delay_minutes=0,
                order=1
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_payment_reminder(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Payment Reminder',
            defaults={
                'description': 'Send reminder when invoice is overdue',
                'trigger_type': 'invoice_overdue',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='invoice_overdue',
                conditions={},
                delay_minutes=0
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='Hi {{customer.name}}, your invoice #{{invoice.number}} of ₹{{invoice.amount}} is pending. Please make payment at your earliest convenience. - DetailEase',
                delay_minutes=0,
                order=1
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_email',
                channel='email',
                template_content='Payment reminder for invoice #{{invoice.number}}',
                delay_minutes=1440,  # 1 day later
                order=2
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_birthday_wishes(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Birthday Wishes',
            defaults={
                'description': 'Send birthday wishes with special offer',
                'trigger_type': 'customer_birthday',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='customer_birthday',
                conditions={},
                delay_minutes=0
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='🎉 Happy Birthday {{customer.name}}! 🎂 Enjoy a special 20% discount on your next service. Valid for 7 days. - DetailEase Team',
                delay_minutes=0,
                order=1
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_post_service_followup(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Post-Service Follow-up',
            defaults={
                'description': 'Send thank you message 2 days after service',
                'trigger_type': 'service_completed',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='service_completed',
                conditions={},
                delay_minutes=2880  # 2 days
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='Hi {{customer.name}}, thank you for choosing DetailEase! We hope you are satisfied with our service. Feel free to reach out if you need anything. 🚗✨',
                delay_minutes=0,
                order=1
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_review_request(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Review Request',
            defaults={
                'description': 'Request review 3 days after service',
                'trigger_type': 'service_completed',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='service_completed',
                conditions={},
                delay_minutes=4320  # 3 days
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='Hi {{customer.name}}, we would love to hear your feedback! Please take a moment to review our service. Your opinion helps us improve. 🌟',
                delay_minutes=0,
                order=1
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_inactive_customer_reengagement(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Inactive Customer Re-engagement',
            defaults={
                'description': 'Re-engage customers inactive for 60 days',
                'trigger_type': 'inactive_customer',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='inactive_customer',
                conditions={'days_inactive': 60},
                delay_minutes=0
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='Hi {{customer.name}}, we miss you! 😊 Get 15% off on your next service. Book now and give your car the care it deserves! - DetailEase',
                delay_minutes=0,
                order=1
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_membership_expiry_reminder(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Membership Expiry Reminder',
            defaults={
                'description': 'Remind 7 days before membership expires',
                'trigger_type': 'membership_expiry',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='membership_expiry',
                conditions={'days_before': 7},
                delay_minutes=0
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='Hi {{customer.name}}, your {{membership.type}} membership expires on {{membership.expiry_date}}. Renew now to continue enjoying exclusive benefits! - DetailEase',
                delay_minutes=0,
                order=1
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_payment_confirmation(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Payment Received Confirmation',
            defaults={
                'description': 'Confirm payment receipt',
                'trigger_type': 'payment_received',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='payment_received',
                conditions={},
                delay_minutes=0
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_sms',
                channel='sms',
                template_content='Payment of ₹{{payment.amount}} received. Thank you! Invoice: {{invoice.number}} - DetailEase',
                delay_minutes=0,
                order=1
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_email',
                channel='email',
                template_content='Payment confirmation and receipt for invoice #{{invoice.number}}',
                delay_minutes=5,
                order=2
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
    
    def create_appointment_reminder(self):
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Appointment Reminder - 1 Day Before',
            defaults={
                'description': 'Remind customer 1 day before appointment',
                'trigger_type': 'appointment_reminder',
                'is_active': True
            }
        )
        
        if created:
            WorkflowTrigger.objects.create(
                workflow=workflow,
                event_type='appointment_reminder',
                conditions={'hours_before': 24},
                delay_minutes=0
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_whatsapp',
                channel='whatsapp',
                template_content='Hi {{customer.name}}, this is a reminder for your appointment tomorrow at {{appointment.time}} for {{service.name}}. See you soon! 🚗 - DetailEase',
                delay_minutes=0,
                order=1
            )
            
            WorkflowAction.objects.create(
                workflow=workflow,
                action_type='send_sms',
                channel='sms',
                template_content='Reminder: Appointment tomorrow at {{appointment.time}}. - DetailEase',
                delay_minutes=60,  # 1 hour later
                order=2
            )
            
            self.stdout.write(f'  ✓ Created: {workflow.name}')
