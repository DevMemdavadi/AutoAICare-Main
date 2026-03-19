from django.db import models
from django.contrib.auth import get_user_model
from customers.models import Customer

User = get_user_model()


class WorkflowTemplate(models.Model):
    """Template for automated workflows"""
    
    TRIGGER_TYPES = [
        ('booking_created', 'Booking Created'),
        ('booking_confirmed', 'Booking Confirmed'),
        ('service_completed', 'Service Completed'),
        ('payment_received', 'Payment Received'),
        ('invoice_overdue', 'Invoice Overdue'),
        ('customer_birthday', 'Customer Birthday'),
        ('customer_anniversary', 'Customer Anniversary'),
        ('membership_expiry', 'Membership Expiry'),
        ('inactive_customer', 'Inactive Customer'),
        ('appointment_reminder', 'Appointment Reminder'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_TYPES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='automation_workflows_created')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Workflow Template'
        verbose_name_plural = 'Workflow Templates'
    
    def __str__(self):
        return f"{self.name} ({self.get_trigger_type_display()})"


class WorkflowTrigger(models.Model):
    """Defines when a workflow should be triggered"""
    
    workflow = models.OneToOneField(WorkflowTemplate, on_delete=models.CASCADE, related_name='trigger')
    event_type = models.CharField(max_length=50)
    conditions = models.JSONField(default=dict, blank=True, help_text="JSON conditions for triggering")
    delay_minutes = models.IntegerField(default=0, help_text="Delay before executing workflow (in minutes)")
    
    def __str__(self):
        return f"Trigger for {self.workflow.name}"


class WorkflowAction(models.Model):
    """Actions to be performed when workflow is triggered"""
    
    ACTION_TYPES = [
        ('send_email', 'Send Email'),
        ('send_sms', 'Send SMS'),
        ('send_whatsapp', 'Send WhatsApp'),
        ('create_notification', 'Create Notification'),
        ('update_status', 'Update Status'),
        ('assign_task', 'Assign Task'),
    ]
    
    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'),
        ('notification', 'In-App Notification'),
        ('system', 'System Action'),
    ]
    
    workflow = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='actions')
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    template_id = models.IntegerField(null=True, blank=True, help_text="ID of the message template")
    template_content = models.TextField(blank=True, help_text="Template content with variables")
    delay_minutes = models.IntegerField(default=0, help_text="Delay after previous action (in minutes)")
    order = models.IntegerField(default=0, help_text="Execution order")
    config = models.JSONField(default=dict, blank=True, help_text="Additional configuration")
    
    class Meta:
        ordering = ['workflow', 'order']
        verbose_name = 'Workflow Action'
        verbose_name_plural = 'Workflow Actions'
    
    def __str__(self):
        return f"{self.workflow.name} - {self.get_action_type_display()} ({self.order})"


class WorkflowExecution(models.Model):
    """Record of workflow execution"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    workflow = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='executions')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='workflow_executions', null=True, blank=True)
    reference_type = models.CharField(max_length=50, blank=True, help_text="Type of object that triggered (booking, invoice, etc)")
    reference_id = models.IntegerField(null=True, blank=True, help_text="ID of the object that triggered")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    triggered_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    context_data = models.JSONField(default=dict, blank=True, help_text="Context data for template rendering")
    
    class Meta:
        ordering = ['-triggered_at']
        verbose_name = 'Workflow Execution'
        verbose_name_plural = 'Workflow Executions'
        indexes = [
            models.Index(fields=['workflow', 'status']),
            models.Index(fields=['customer', 'triggered_at']),
        ]
    
    def __str__(self):
        return f"{self.workflow.name} - {self.status} ({self.triggered_at.strftime('%Y-%m-%d %H:%M')})"


class WorkflowLog(models.Model):
    """Detailed log of each action in workflow execution"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]
    
    execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE, related_name='logs')
    action = models.ForeignKey(WorkflowAction, on_delete=models.CASCADE, related_name='logs')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True)
    error_details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    execution_time_ms = models.IntegerField(null=True, blank=True, help_text="Execution time in milliseconds")
    
    class Meta:
        ordering = ['execution', 'action__order', 'timestamp']
        verbose_name = 'Workflow Log'
        verbose_name_plural = 'Workflow Logs'
    
    def __str__(self):
        return f"{self.execution.workflow.name} - {self.action.action_type} - {self.status}"


class WorkflowAnalytics(models.Model):
    """Analytics data for workflow performance"""
    
    workflow = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='analytics')
    date = models.DateField()
    total_executions = models.IntegerField(default=0)
    successful_executions = models.IntegerField(default=0)
    failed_executions = models.IntegerField(default=0)
    average_execution_time_ms = models.IntegerField(default=0)
    total_customers_reached = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-date']
        verbose_name = 'Workflow Analytics'
        verbose_name_plural = 'Workflow Analytics'
        unique_together = ['workflow', 'date']
        indexes = [
            models.Index(fields=['workflow', 'date']),
        ]
    
    def __str__(self):
        return f"{self.workflow.name} - {self.date}"
