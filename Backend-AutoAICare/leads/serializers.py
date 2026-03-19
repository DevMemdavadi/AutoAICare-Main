from rest_framework import serializers
from .models import (
    LeadSource, Lead, LeadActivity, LeadConversion,
    LeadScore, LeadFollowUp
)


class LeadSourceSerializer(serializers.ModelSerializer):
    lead_count = serializers.SerializerMethodField()
    conversion_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = LeadSource
        fields = ['id', 'name', 'source_type', 'description', 'is_active', 
                  'cost_per_lead', 'lead_count', 'conversion_rate', 'created_at']
        read_only_fields = ['created_at']
    
    def get_lead_count(self, obj):
        return obj.leads.count()
    
    def get_conversion_rate(self, obj):
        total = obj.leads.count()
        if total == 0:
            return 0
        converted = obj.leads.filter(converted_to_customer=True).count()
        return round((converted / total) * 100, 2)


class LeadActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = LeadActivity
        fields = ['id', 'lead', 'activity_type', 'activity_type_display', 'description',
                  'outcome', 'duration_minutes', 'scheduled_at', 'completed_at',
                  'metadata', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_at']


class LeadFollowUpSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = LeadFollowUp
        fields = ['id', 'lead', 'assigned_to', 'assigned_to_name', 'due_date',
                  'task', 'status', 'status_display', 'priority', 'priority_display',
                  'completed_at', 'completed_by', 'notes', 'is_overdue', 'created_at']
        read_only_fields = ['created_at', 'completed_at']
    
    def get_is_overdue(self, obj):
        return obj.status == 'overdue' or (obj.status == 'pending' and obj.check_overdue())


class LeadScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadScore
        fields = ['id', 'lead', 'score', 'factors', 'calculated_at']
        read_only_fields = ['calculated_at']


class LeadConversionSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    
    class Meta:
        model = LeadConversion
        fields = ['id', 'lead', 'lead_name', 'customer_id', 'booking_id',
                  'converted_at', 'conversion_value', 'conversion_days']
        read_only_fields = ['conversion_days', 'converted_at']


class LeadListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lead lists"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    source_name = serializers.CharField(source='source.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    days_old = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = ['id', 'name', 'phone', 'email', 'organization', 'status', 'status_display',
                  'priority', 'priority_display', 'score', 'source_name', 'assigned_to_name',
                  'last_contacted_at', 'days_old', 'created_at']
    
    def get_days_old(self, obj):
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        return delta.days


class LeadDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with all related data"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    source = LeadSourceSerializer(read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    activities = LeadActivitySerializer(many=True, read_only=True)
    follow_ups = LeadFollowUpSerializer(many=True, read_only=True)
    recent_activities = serializers.SerializerMethodField()
    pending_follow_ups = serializers.SerializerMethodField()
    days_old = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'converted_at', 'score']
    
    def get_recent_activities(self, obj):
        activities = obj.activities.all()[:10]
        return LeadActivitySerializer(activities, many=True).data
    
    def get_pending_follow_ups(self, obj):
        follow_ups = obj.follow_ups.filter(status='pending').order_by('due_date')[:5]
        return LeadFollowUpSerializer(follow_ups, many=True).data
    
    def get_days_old(self, obj):
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        return delta.days


class LeadCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating leads"""
    
    class Meta:
        model = Lead
        fields = ['name', 'phone', 'email', 'organization', 'source', 'status', 'priority',
                  'assigned_to', 'branch', 'interested_services', 'vehicle_info',
                  'budget_range', 'expected_close_date', 'notes', 'metadata']
    
    def create(self, validated_data):
        lead = Lead.objects.create(**validated_data)
        # Calculate initial score
        lead.calculate_score()
        return lead
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # Recalculate score on update
        instance.calculate_score()
        return instance


class LeadConvertSerializer(serializers.Serializer):
    """Serializer for converting lead to customer"""
    customer_id = serializers.IntegerField()
    booking_id = serializers.IntegerField(required=False)
    conversion_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


class LeadStatsSerializer(serializers.Serializer):
    """Serializer for lead statistics"""
    total_leads = serializers.IntegerField()
    new_leads = serializers.IntegerField()
    contacted_leads = serializers.IntegerField()
    qualified_leads = serializers.IntegerField()
    converted_leads = serializers.IntegerField()
    lost_leads = serializers.IntegerField()
    conversion_rate = serializers.FloatField()
    average_score = serializers.FloatField()
    average_conversion_days = serializers.FloatField()
