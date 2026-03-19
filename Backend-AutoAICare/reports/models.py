"""
Reports Models
Handles scheduled reports and report configurations
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


class ScheduledReport(models.Model):
    """Model for scheduled report generation and delivery"""
    
    REPORT_TYPE_CHOICES = [
        ('revenue', 'Revenue Report'),
        ('customer', 'Customer Report'),
        ('lead', 'Lead Report'),
        ('analytics', 'Analytics Summary'),
        ('inventory', 'Inventory Report'),
        ('staff', 'Staff Performance Report'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('both', 'Both PDF and Excel'),
    ]
    
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES)
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default='pdf')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    
    # Recipients
    email_recipients = models.TextField(help_text="Comma-separated email addresses")
    
    # Schedule settings
    is_active = models.BooleanField(default=True)
    next_run = models.DateTimeField(null=True, blank=True)
    last_run = models.DateTimeField(null=True, blank=True)
    
    # Report parameters
    parameters = models.JSONField(default=dict, blank=True, help_text="Report-specific parameters")
    
    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scheduled_reports_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"
    
    def calculate_next_run(self):
        """Calculate next run time based on frequency"""
        from datetime import timedelta
        
        if not self.last_run:
            base_time = timezone.now()
        else:
            base_time = self.last_run
        
        if self.frequency == 'daily':
            self.next_run = base_time + timedelta(days=1)
        elif self.frequency == 'weekly':
            self.next_run = base_time + timedelta(weeks=1)
        elif self.frequency == 'monthly':
            self.next_run = base_time + timedelta(days=30)
        elif self.frequency == 'quarterly':
            self.next_run = base_time + timedelta(days=90)
        
        self.save()
    
    def generate_and_send(self):
        """Generate report and send to recipients"""
        from django.core.mail import EmailMessage
        from utils.report_generators import (
            generate_revenue_report_pdf,
            generate_revenue_report_excel,
            generate_customer_report_pdf,
            generate_customer_report_excel
        )
        from bookings.models import Booking
        from customers.models import Customer
        from datetime import timedelta
        
        # Get date range based on frequency
        end_date = timezone.now().date()
        if self.frequency == 'daily':
            start_date = end_date - timedelta(days=1)
        elif self.frequency == 'weekly':
            start_date = end_date - timedelta(days=7)
        elif self.frequency == 'monthly':
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(days=90)
        
        # Generate report based on type
        attachments = []
        
        if self.report_type == 'revenue':
            bookings = Booking.objects.filter(booking_datetime__date__range=[start_date, end_date])
            
            if self.format in ['pdf', 'both']:
                pdf_buffer = generate_revenue_report_pdf(start_date, end_date, bookings)
                attachments.append((f'revenue_report_{end_date}.pdf', pdf_buffer.read(), 'application/pdf'))
            
            if self.format in ['excel', 'both']:
                excel_buffer = generate_revenue_report_excel(start_date, end_date, bookings)
                attachments.append((
                    f'revenue_report_{end_date}.xlsx',
                    excel_buffer.read(),
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ))
        
        elif self.report_type == 'customer':
            customers = Customer.objects.all()
            
            if self.format in ['pdf', 'both']:
                pdf_buffer = generate_customer_report_pdf(customers)
                attachments.append((f'customer_report_{end_date}.pdf', pdf_buffer.read(), 'application/pdf'))
            
            if self.format in ['excel', 'both']:
                excel_buffer = generate_customer_report_excel(customers)
                attachments.append((
                    f'customer_report_{end_date}.xlsx',
                    excel_buffer.read(),
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ))

        elif self.report_type == 'lead':
            from leads.models import Lead
            from utils.report_generators import PDFReportGenerator
            leads = Lead.objects.all()
            
            if self.format in ['pdf', 'both']:
                pdf = PDFReportGenerator(title="Automated Lead Report")
                pdf.add_header()
                pdf.add_section(f"Lead Summary ({start_date} to {end_date})")
                pdf.add_summary_box("Total Leads", leads.count())
                pdf.add_summary_box("Won Leads", leads.filter(status='won').count())
                
                table_data = [['Name', 'Phone', 'Source', 'Status']]
                for lead in leads[:20]:
                    table_data.append([lead.name, lead.phone, lead.source.name if lead.source else 'N/A', lead.status])
                pdf.add_table(table_data)
                
                pdf_buffer = pdf.generate()
                attachments.append((f'lead_report_{end_date}.pdf', pdf_buffer.read(), 'application/pdf'))

        elif self.report_type == 'analytics':
            from utils.report_generators import PDFReportGenerator
            pdf = PDFReportGenerator(title="Automated Business Review")
            pdf.add_header()
            pdf.add_section("Business Performance Summary")
            # Simplified summary for automation
            bookings_count = Booking.objects.filter(booking_datetime__date__range=[start_date, end_date]).count()
            pdf.add_summary_box("Range Bookings", bookings_count)
            
            pdf_buffer = pdf.generate()
            attachments.append((f'business_summary_{end_date}.pdf', pdf_buffer.read(), 'application/pdf'))
        
        # Send email with attachments
        recipients = [email.strip() for email in self.email_recipients.split(',')]
        
        email = EmailMessage(
            subject=f'{self.name} - {end_date}',
            body=f'Please find attached the {self.get_report_type_display()} for {start_date} to {end_date}.',
            from_email='reports@detailease.com',
            to=recipients
        )
        
        for filename, content, mimetype in attachments:
            email.attach(filename, content, mimetype)
        
        email.send()
        
        # Update last run
        self.last_run = timezone.now()
        self.calculate_next_run()
        self.save()


class ReportTemplate(models.Model):
    """Model for custom report templates"""
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=50)
    
    # Template configuration
    columns = models.JSONField(default=list, help_text="List of columns to include")
    filters = models.JSONField(default=dict, help_text="Default filters")
    grouping = models.JSONField(default=dict, blank=True, help_text="Grouping configuration")
    sorting = models.JSONField(default=dict, blank=True, help_text="Sorting configuration")
    
    # Styling
    header_color = models.CharField(max_length=7, default='#1e40af')
    show_summary = models.BooleanField(default=True)
    show_charts = models.BooleanField(default=False)
    
    # Metadata
    is_public = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='report_templates_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
