from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from decimal import Decimal


class ApprovalWorkflow(models.Model):
    """Approval workflow configuration for different transaction types"""
    
    MODEL_TYPE_CHOICES = [
        ('expense', 'Expense'),
        ('transfer', 'Inter-Branch Transfer'),
        ('budget', 'Branch Budget'),
        ('payroll', 'Payroll'),
    ]
    
    name = models.CharField(max_length=200, help_text="Workflow name (e.g., 'High Value Expense Approval')")
    model_type = models.CharField(max_length=50, choices=MODEL_TYPE_CHOICES)
    
    # Threshold configuration
    threshold_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        help_text="Minimum amount that triggers this workflow"
    )
    
    # Approval levels
    levels = models.IntegerField(default=1, help_text="Number of approval levels required")
    
    # Approvers (can be role-based or specific users)
    approvers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='approval_workflows',
        blank=True,
        help_text="Specific users who can approve (leave empty for role-based)"
    )
    
    # Role-based approval
    approver_roles = models.JSONField(
        default=list,
        blank=True,
        help_text="Roles that can approve (e.g., ['branch_admin', 'accountant'])"
    )
    
    # Branch-specific workflows
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='approval_workflows',
        help_text="Leave blank for global workflow"
    )
    
    # Auto-approval settings
    auto_approve_below = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Auto-approve if amount is below this value"
    )
    
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workflows'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'approval_workflows'
        ordering = ['model_type', '-threshold_amount']
        indexes = [
            models.Index(fields=['model_type', 'is_active']),
            models.Index(fields=['branch', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.get_model_type_display()} (₹{self.threshold_amount}+)"
    
    def get_approvers_for_level(self, level):
        """Get list of users who can approve at this level"""
        if self.approvers.exists():
            return self.approvers.all()
        
        # Role-based approval
        from users.models import User
        if self.approver_roles:
            return User.objects.filter(role__in=self.approver_roles, is_active=True)
        
        return User.objects.none()


class ApprovalRequest(models.Model):
    """Individual approval requests for transactions"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    workflow = models.ForeignKey(
        ApprovalWorkflow,
        on_delete=models.CASCADE,
        related_name='requests'
    )
    
    # Generic relation to any model (Expense, Transfer, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Request details
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='approval_requests_made'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    
    # Approval tracking
    current_level = models.IntegerField(default=1)
    required_levels = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'approval_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['requested_by', 'status']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"Approval Request #{self.id} - {self.status} (Level {self.current_level}/{self.required_levels})"
    
    def can_approve(self, user):
        """Check if user can approve at current level"""
        if self.status != 'pending':
            return False
        
        approvers = self.workflow.get_approvers_for_level(self.current_level)
        return user in approvers
    
    def approve(self, user, comments=''):
        """Approve the request at current level"""
        if not self.can_approve(user):
            raise ValidationError("You are not authorized to approve this request")
        
        # Create approval action
        ApprovalAction.objects.create(
            request=self,
            approver=user,
            action='approved',
            level=self.current_level,
            comments=comments
        )
        
        # Move to next level or complete
        if self.current_level >= self.required_levels:
            self.status = 'approved'
            self.completed_at = timezone.now()
            
            # Update the related object status
            self._update_object_status('approved')
        else:
            self.current_level += 1
        
        self.save()
        return True
    
    def reject(self, user, reason=''):
        """Reject the request"""
        if not self.can_approve(user):
            raise ValidationError("You are not authorized to reject this request")
        
        # Create rejection action
        ApprovalAction.objects.create(
            request=self,
            approver=user,
            action='rejected',
            level=self.current_level,
            comments=reason
        )
        
        self.status = 'rejected'
        self.completed_at = timezone.now()
        self.save()
        
        # Update the related object status
        self._update_object_status('rejected')
        return True
    
    def _update_object_status(self, approval_status):
        """Update the status of the related object"""
        obj = self.content_object
        if obj and hasattr(obj, 'approval_status'):
            obj.approval_status = approval_status
            obj.save()


class ApprovalAction(models.Model):
    """Individual approval/rejection actions"""
    
    ACTION_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    request = models.ForeignKey(
        ApprovalRequest,
        on_delete=models.CASCADE,
        related_name='actions'
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='approval_actions'
    )
    
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    level = models.IntegerField(help_text="Approval level at which action was taken")
    comments = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'approval_actions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request', 'level']),
            models.Index(fields=['approver', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.approver.name} {self.action} at Level {self.level}"


# Add approval_status field to existing models via migration
# This will be added to Expense, InterBranchTransfer, BranchBudget models
