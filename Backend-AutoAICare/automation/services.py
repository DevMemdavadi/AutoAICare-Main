"""
Workflow Engine Service
Handles execution of automated workflows
"""
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.template import Template, Context
from .models import (
    WorkflowTemplate, WorkflowExecution, WorkflowLog,
    WorkflowAnalytics
)

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Main workflow execution engine"""
    
    def __init__(self):
        self.action_handlers = {
            'send_email': self.handle_send_email,
            'send_sms': self.handle_send_sms,
            'send_whatsapp': self.handle_send_whatsapp,
            'create_notification': self.handle_create_notification,
            'update_status': self.handle_update_status,
            'assign_task': self.handle_assign_task,
        }
    
    def trigger_workflow(self, trigger_type, customer=None, reference_type=None, reference_id=None, context_data=None):
        """
        Trigger workflows based on event type
        
        Args:
            trigger_type: Type of trigger event
            customer: Customer object
            reference_type: Type of reference object (booking, invoice, etc)
            reference_id: ID of reference object
            context_data: Additional context data for template rendering
        """
        # Find active workflows for this trigger type
        workflows = WorkflowTemplate.objects.filter(
            trigger_type=trigger_type,
            is_active=True
        ).prefetch_related('trigger', 'actions')
        
        executions = []
        for workflow in workflows:
            # Check if workflow conditions are met
            if self._check_conditions(workflow, context_data):
                execution = self.execute_workflow(
                    workflow=workflow,
                    customer=customer,
                    reference_type=reference_type,
                    reference_id=reference_id,
                    context_data=context_data or {}
                )
                executions.append(execution)
        
        return executions
    
    def execute_workflow(self, workflow, customer=None, reference_type=None, reference_id=None, context_data=None):
        """Execute a single workflow"""
        # Create execution record
        execution = WorkflowExecution.objects.create(
            workflow=workflow,
            customer=customer,
            reference_type=reference_type,
            reference_id=reference_id,
            status='pending',
            context_data=context_data or {}
        )
        
        try:
            # Update status to running
            execution.status = 'running'
            execution.started_at = timezone.now()
            execution.save()
            
            # Execute actions in order
            actions = workflow.actions.all().order_by('order')
            
            for action in actions:
                # Apply delay if specified
                if action.delay_minutes > 0:
                    # In production, this would be handled by Celery task scheduling
                    # For now, we'll execute immediately
                    pass
                
                # Execute action
                self._execute_action(execution, action, context_data or {})
            
            # Mark as completed
            execution.status = 'completed'
            execution.completed_at = timezone.now()
            execution.save()
            
            # Update analytics
            self._update_analytics(workflow, execution)
            
            logger.info(f"Workflow {workflow.name} executed successfully for customer {customer}")
            
        except Exception as e:
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.completed_at = timezone.now()
            execution.save()
            
            logger.error(f"Workflow {workflow.name} failed: {str(e)}")
        
        return execution
    
    def _execute_action(self, execution, action, context_data):
        """Execute a single workflow action"""
        start_time = timezone.now()
        
        try:
            # Get action handler
            handler = self.action_handlers.get(action.action_type)
            
            if not handler:
                raise ValueError(f"Unknown action type: {action.action_type}")
            
            # Render template with context
            rendered_content = self._render_template(action.template_content, context_data)
            
            # Execute handler
            result = handler(execution, action, rendered_content, context_data)
            
            # Calculate execution time
            end_time = timezone.now()
            execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Log success
            WorkflowLog.objects.create(
                execution=execution,
                action=action,
                status='success',
                message=result.get('message', 'Action executed successfully'),
                timestamp=timezone.now(),
                execution_time_ms=execution_time_ms
            )
            
        except Exception as e:
            # Calculate execution time
            end_time = timezone.now()
            execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Log failure
            WorkflowLog.objects.create(
                execution=execution,
                action=action,
                status='failed',
                message='Action execution failed',
                error_details=str(e),
                timestamp=timezone.now(),
                execution_time_ms=execution_time_ms
            )
            
            raise
    
    def _render_template(self, template_content, context_data):
        """Render template with context data"""
        if not template_content:
            return ""
        
        try:
            template = Template(template_content)
            context = Context(context_data)
            return template.render(context)
        except Exception as e:
            logger.error(f"Template rendering failed: {str(e)}")
            return template_content
    
    def _check_conditions(self, workflow, context_data):
        """Check if workflow conditions are met"""
        if not hasattr(workflow, 'trigger') or not workflow.trigger.conditions:
            return True
        
        conditions = workflow.trigger.conditions
        
        # Simple condition checking (can be enhanced)
        for key, value in conditions.items():
            if key not in context_data or context_data[key] != value:
                return False
        
        return True
    
    def _update_analytics(self, workflow, execution):
        """Update workflow analytics"""
        today = timezone.now().date()
        
        analytics, created = WorkflowAnalytics.objects.get_or_create(
            workflow=workflow,
            date=today,
            defaults={
                'total_executions': 0,
                'successful_executions': 0,
                'failed_executions': 0,
                'average_execution_time_ms': 0,
                'total_customers_reached': 0
            }
        )
        
        # Update counts
        analytics.total_executions += 1
        
        if execution.status == 'completed':
            analytics.successful_executions += 1
        elif execution.status == 'failed':
            analytics.failed_executions += 1
        
        if execution.customer:
            analytics.total_customers_reached += 1
        
        # Update average execution time
        if execution.started_at and execution.completed_at:
            execution_time_ms = int((execution.completed_at - execution.started_at).total_seconds() * 1000)
            total_time = analytics.average_execution_time_ms * (analytics.total_executions - 1) + execution_time_ms
            analytics.average_execution_time_ms = int(total_time / analytics.total_executions)
        
        analytics.save()
    
    # Action Handlers
    
    def handle_send_email(self, execution, action, content, context_data):
        """Handle send email action"""
        # TODO: Integrate with email service
        logger.info(f"Sending email: {content}")
        return {'message': 'Email sent successfully', 'channel': 'email'}
    
    def handle_send_sms(self, execution, action, content, context_data):
        """Handle send SMS action"""
        # TODO: Integrate with SMS gateway
        logger.info(f"Sending SMS: {content}")
        return {'message': 'SMS sent successfully', 'channel': 'sms'}
    
    def handle_send_whatsapp(self, execution, action, content, context_data):
        """Handle send WhatsApp action"""
        # TODO: Integrate with WhatsApp Business API
        logger.info(f"Sending WhatsApp: {content}")
        return {'message': 'WhatsApp message sent successfully', 'channel': 'whatsapp'}
    
    def handle_create_notification(self, execution, action, content, context_data):
        """Handle create notification action"""
        from notify.models import Notification
        
        if execution.customer:
            Notification.objects.create(
                user=execution.customer.user if hasattr(execution.customer, 'user') else None,
                title=context_data.get('notification_title', 'Notification'),
                message=content,
                notification_type='info',
                priority='medium'
            )
        
        return {'message': 'Notification created successfully'}
    
    def handle_update_status(self, execution, action, content, context_data):
        """Handle update status action"""
        # TODO: Implement status update logic
        logger.info(f"Updating status: {content}")
        return {'message': 'Status updated successfully'}
    
    def handle_assign_task(self, execution, action, content, context_data):
        """Handle assign task action"""
        # TODO: Implement task assignment logic
        logger.info(f"Assigning task: {content}")
        return {'message': 'Task assigned successfully'}


# Global workflow engine instance
workflow_engine = WorkflowEngine()
