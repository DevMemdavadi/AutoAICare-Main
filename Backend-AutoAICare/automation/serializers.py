from rest_framework import serializers
from .models import (
    WorkflowTemplate, WorkflowTrigger, WorkflowAction,
    WorkflowExecution, WorkflowLog, WorkflowAnalytics
)


class WorkflowTriggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowTrigger
        fields = ['id', 'event_type', 'conditions', 'delay_minutes']


class WorkflowActionSerializer(serializers.ModelSerializer):
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    
    class Meta:
        model = WorkflowAction
        fields = [
            'id', 'action_type', 'action_type_display', 'channel', 'channel_display',
            'template_id', 'template_content', 'delay_minutes', 'order', 'config'
        ]


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    trigger = WorkflowTriggerSerializer(read_only=True)
    actions = WorkflowActionSerializer(many=True, read_only=True)
    trigger_type_display = serializers.CharField(source='get_trigger_type_display', read_only=True)
    action_count = serializers.IntegerField(source='actions.count', read_only=True)
    execution_count = serializers.IntegerField(source='executions.count', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'trigger_type', 'trigger_type_display',
            'is_active', 'trigger', 'actions', 'action_count', 'execution_count',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class WorkflowTemplateCreateSerializer(serializers.ModelSerializer):
    trigger = WorkflowTriggerSerializer()
    actions = WorkflowActionSerializer(many=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'name', 'description', 'trigger_type', 'is_active',
            'trigger', 'actions'
        ]
    
    def create(self, validated_data):
        trigger_data = validated_data.pop('trigger')
        actions_data = validated_data.pop('actions')
        
        # Create workflow
        workflow = WorkflowTemplate.objects.create(**validated_data)
        
        # Create trigger
        WorkflowTrigger.objects.create(workflow=workflow, **trigger_data)
        
        # Create actions
        for action_data in actions_data:
            WorkflowAction.objects.create(workflow=workflow, **action_data)
        
        return workflow
    
    def update(self, instance, validated_data):
        trigger_data = validated_data.pop('trigger', None)
        actions_data = validated_data.pop('actions', None)
        
        # Update workflow
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update trigger
        if trigger_data:
            WorkflowTrigger.objects.update_or_create(
                workflow=instance,
                defaults=trigger_data
            )
        
        # Update actions
        if actions_data is not None:
            # Delete existing actions
            instance.actions.all().delete()
            # Create new actions
            for action_data in actions_data:
                WorkflowAction.objects.create(workflow=instance, **action_data)
        
        return instance


class WorkflowLogSerializer(serializers.ModelSerializer):
    action_type = serializers.CharField(source='action.action_type', read_only=True)
    action_type_display = serializers.CharField(source='action.get_action_type_display', read_only=True)
    
    class Meta:
        model = WorkflowLog
        fields = [
            'id', 'action', 'action_type', 'action_type_display',
            'status', 'message', 'error_details', 'timestamp', 'execution_time_ms'
        ]


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    logs = WorkflowLogSerializer(many=True, read_only=True)
    duration_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowExecution
        fields = [
            'id', 'workflow', 'workflow_name', 'customer', 'customer_name', 'customer_phone',
            'reference_type', 'reference_id', 'status', 'status_display',
            'triggered_at', 'started_at', 'completed_at', 'duration_seconds',
            'error_message', 'context_data', 'logs'
        ]
    
    def get_duration_seconds(self, obj):
        if obj.started_at and obj.completed_at:
            delta = obj.completed_at - obj.started_at
            return round(delta.total_seconds(), 2)
        return None


class WorkflowExecutionListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = WorkflowExecution
        fields = [
            'id', 'workflow', 'workflow_name', 'customer', 'customer_name',
            'status', 'status_display', 'triggered_at', 'completed_at'
        ]


class WorkflowAnalyticsSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    success_rate = serializers.SerializerMethodField()
    failure_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowAnalytics
        fields = [
            'id', 'workflow', 'workflow_name', 'date',
            'total_executions', 'successful_executions', 'failed_executions',
            'success_rate', 'failure_rate', 'average_execution_time_ms',
            'total_customers_reached'
        ]
    
    def get_success_rate(self, obj):
        if obj.total_executions > 0:
            return round((obj.successful_executions / obj.total_executions) * 100, 2)
        return 0
    
    def get_failure_rate(self, obj):
        if obj.total_executions > 0:
            return round((obj.failed_executions / obj.total_executions) * 100, 2)
        return 0


class WorkflowTestSerializer(serializers.Serializer):
    """Serializer for testing workflows"""
    customer_id = serializers.IntegerField()
    context_data = serializers.JSONField(required=False, default=dict)
