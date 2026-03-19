from rest_framework import serializers
from .models import Customer, Vehicle, VehicleBrand, VehicleModel, VehicleColor
from .crm_models import (
    CustomerTag, CustomerSegment, CustomerNote, CustomerPreference,
    CustomerActivity, CustomerLifecycle, ServiceReminder, ReminderHistory
)
from users.serializers import UserSerializer
from companies.serializers import TenantSerializerMixin


class VehicleBrandSerializer(serializers.ModelSerializer):
    """Serializer for VehicleBrand model."""
    
    class Meta:
        model = VehicleBrand
        fields = ('id', 'name', 'vehicle_type', 'is_active')


class VehicleModelSerializer(serializers.ModelSerializer):
    """Serializer for VehicleModel model."""
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    
    class Meta:
        model = VehicleModel
        fields = ('id', 'brand', 'brand_name', 'name', 'vehicle_type', 'is_active')


class VehicleColorSerializer(serializers.ModelSerializer):
    """Serializer for VehicleColor model."""
    
    class Meta:
        model = VehicleColor
        fields = ('id', 'name', 'is_active')



class VehicleSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Vehicle model."""
    
    # Add display name for vehicle type
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    
    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ('company', 'customer', 'created_at', 'updated_at')
    

# CRM Serializers

class CustomerTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerTag
        fields = ['id', 'name', 'color', 'description', 'created_at']


class CustomerSegmentSerializer(serializers.ModelSerializer):
    segment_type_display = serializers.CharField(source='get_segment_type_display', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    
    class Meta:
        model = CustomerSegment
        fields = ['id', 'customer', 'segment_type', 'segment_type_display', 
                  'assigned_by', 'assigned_by_name', 'assigned_at', 'notes']
        read_only_fields = ['assigned_at']


class CustomerNoteSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = CustomerNote
        fields = ['id', 'customer', 'category', 'category_display', 'note', 
                  'is_important', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class CustomerPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPreference
        fields = ['id', 'customer', 'key', 'value', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class CustomerActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = CustomerActivity
        fields = ['id', 'customer', 'activity_type', 'activity_type_display', 
                  'description', 'reference_type', 'reference_id', 'metadata',
                  'created_by', 'created_by_name', 'timestamp']
        read_only_fields = ['timestamp']


class CustomerLifecycleSerializer(serializers.ModelSerializer):
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    previous_stage_display = serializers.CharField(source='get_previous_stage_display', read_only=True)
    
    class Meta:
        model = CustomerLifecycle
        fields = ['id', 'customer', 'current_stage', 'current_stage_display',
                  'previous_stage', 'previous_stage_display', 'stage_changed_at',
                  'acquisition_source', 'acquisition_date', 'last_interaction_date',
                  'total_lifetime_value', 'customer_score']
        read_only_fields = ['stage_changed_at']


class ServiceReminderSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)
    vehicle_number = serializers.CharField(source='vehicle.registration_number', read_only=True)
    
    class Meta:
        model = ServiceReminder
        fields = ['id', 'customer', 'customer_name', 'vehicle', 'vehicle_number',
                  'due_date', 'reminder_type', 'message', 'status', 'status_display',
                  'sent_at', 'sent_via', 'created_at']
        read_only_fields = ['created_at', 'sent_at']


class ReminderHistorySerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)
    
    class Meta:
        model = ReminderHistory
        fields = ['id', 'customer', 'customer_name', 'reminder_type', 'sent_via',
                  'sent_at', 'opened', 'opened_at', 'clicked', 'clicked_at', 'content']
        read_only_fields = ['sent_at', 'opened_at', 'clicked_at']


class CustomerSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Customer model with CRM data."""
    user = UserSerializer(read_only=True)
    vehicles = VehicleSerializer(many=True, read_only=True)
    lifecycle = CustomerLifecycleSerializer(read_only=True)
    segments = CustomerSegmentSerializer(many=True, read_only=True)
    recent_notes = serializers.SerializerMethodField()
    recent_activities = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('company', 'user', 'reward_points', 'created_at', 'updated_at')
    
    def get_recent_notes(self, obj):
        notes = obj.notes.all()[:5]
        return CustomerNoteSerializer(notes, many=True).data
    
    def get_recent_activities(self, obj):
        activities = obj.activities.all()[:10]
        return CustomerActivitySerializer(activities, many=True).data


class CustomerLightSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Lightweight serializer for Customer model (basic info only)."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Customer
        fields = ('id', 'user', 'membership_type', 'reward_points')
        read_only_fields = ('user', 'reward_points')


class VehicleCreateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating vehicles."""
    # For admin use, allow specifying customer
    customer = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Vehicle
        fields = ('registration_number', 'brand', 'model', 'color', 'year', 'vehicle_type', 'customer', 'company')
        read_only_fields = ('company',)
