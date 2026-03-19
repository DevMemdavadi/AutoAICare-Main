from rest_framework import serializers
from .models_approval import ApprovalWorkflow, ApprovalRequest, ApprovalAction
from users.serializers import UserListSerializer


class ApprovalWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for ApprovalWorkflow"""
    approvers_details = UserListSerializer(source='approvers', many=True, read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    model_type_display = serializers.CharField(source='get_model_type_display', read_only=True)
    
    class Meta:
        model = ApprovalWorkflow
        fields = [
            'id', 'name', 'model_type', 'model_type_display',
            'threshold_amount', 'levels', 'approvers', 'approvers_details',
            'approver_roles', 'branch', 'branch_name',
            'auto_approve_below', 'is_active',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class ApprovalActionSerializer(serializers.ModelSerializer):
    """Serializer for ApprovalAction"""
    approver_details = UserListSerializer(source='approver', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = ApprovalAction
        fields = [
            'id', 'request', 'approver', 'approver_details',
            'action', 'action_display', 'level', 'comments',
            'created_at'
        ]
        read_only_fields = ['created_at']


class ApprovalRequestSerializer(serializers.ModelSerializer):
    """Serializer for ApprovalRequest"""
    workflow_details = ApprovalWorkflowSerializer(source='workflow', read_only=True)
    requested_by_details = UserListSerializer(source='requested_by', read_only=True)
    actions = ApprovalActionSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Object details
    object_type = serializers.SerializerMethodField()
    object_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'workflow', 'workflow_details',
            'content_type', 'object_id', 'object_type', 'object_details',
            'requested_by', 'requested_by_details',
            'amount', 'description',
            'current_level', 'required_levels', 'status', 'status_display',
            'actions', 'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['requested_by', 'current_level', 'status', 'created_at', 'updated_at', 'completed_at']
    
    def get_object_type(self, obj):
        """Get the type of object being approved"""
        return obj.content_type.model
    
    def get_object_details(self, obj):
        """Get basic details of the object being approved"""
        content_obj = obj.content_object
        if not content_obj:
            return None
        
        # Return different details based on object type
        if hasattr(content_obj, 'title'):
            return {
                'id': content_obj.id,
                'title': content_obj.title,
                'amount': float(content_obj.amount) if hasattr(content_obj, 'amount') else None
            }
        elif hasattr(content_obj, 'description'):
            return {
                'id': content_obj.id,
                'description': content_obj.description[:100],
                'amount': float(content_obj.amount) if hasattr(content_obj, 'amount') else None
            }
        
        return {'id': content_obj.id}


class ApprovalRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating approval requests"""
    model_type = serializers.ChoiceField(choices=['expense', 'transfer', 'budget', 'payroll'])
    object_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(max_length=500)
    
    def validate(self, data):
        """Validate that a workflow exists for this model type and amount"""
        from .models_approval import ApprovalWorkflow
        
        workflows = ApprovalWorkflow.objects.filter(
            model_type=data['model_type'],
            threshold_amount__lte=data['amount'],
            is_active=True
        ).order_by('-threshold_amount')
        
        if not workflows.exists():
            raise serializers.ValidationError(
                f"No approval workflow found for {data['model_type']} with amount ₹{data['amount']}"
            )
        
        data['workflow'] = workflows.first()
        return data


class ApprovalActionCreateSerializer(serializers.Serializer):
    """Serializer for approving/rejecting requests"""
    action = serializers.ChoiceField(choices=['approved', 'rejected'])
    comments = serializers.CharField(required=False, allow_blank=True)
