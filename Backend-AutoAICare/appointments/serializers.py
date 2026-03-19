from rest_framework import serializers
from .models import Appointment, AppointmentSlot
from customers.serializers import CustomerSerializer, VehicleSerializer
from services.serializers import ServicePackageSerializer, AddOnSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    """Full appointment serializer for read operations."""
    
    customer_details = CustomerSerializer(source='customer', read_only=True)
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    package_details = ServicePackageSerializer(source='package', read_only=True)
    addon_details = AddOnSerializer(source='addons', many=True, read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.name', read_only=True)
    estimated_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    can_reschedule = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'customer', 'customer_details', 'vehicle', 'vehicle_details',
            'package', 'package_details', 'addons', 'addon_details',
            'vehicle_type', 'vehicle_type_display',
            'preferred_datetime', 'alternate_datetime', 'confirmed_datetime',
            'pickup_required', 'location', 'notes',
            'branch', 'branch_name',
            'status', 'status_display',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'admin_notes',
            'booking', 'estimated_price', 'can_reschedule', 'is_expired',
            'created_at', 'updated_at', 'expires_at',
        ]
        read_only_fields = [
            'customer', 'status', 'reviewed_by', 'reviewed_at', 
            'booking', 'confirmed_datetime', 'expires_at'
        ]


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for fast customer appointment creation.
    Only essential fields required.
    """
    
    addon_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )
    
    class Meta:
        model = Appointment
        fields = [
            'vehicle', 'package', 'addon_ids', 'vehicle_type',
            'preferred_datetime', 'alternate_datetime',
            'pickup_required', 'location', 'notes'
        ]
    
    def validate_preferred_datetime(self, value):
        """Ensure preferred datetime is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Preferred datetime must be in the future.")
        return value
    
    def validate_alternate_datetime(self, value):
        """Ensure alternate datetime is in the future if provided."""
        from django.utils import timezone
        if value and value <= timezone.now():
            raise serializers.ValidationError("Alternate datetime must be in the future.")
        return value
    
    def create(self, validated_data):
        addon_ids = validated_data.pop('addon_ids', [])
        user = self.context['request'].user
        
        # Get customer
        try:
            customer = user.customer_profile
        except:
            raise serializers.ValidationError("Customer profile not found.")
        
        # Get branch from user or vehicle
        branch = user.branch
        if not branch and validated_data.get('vehicle'):
            branch = validated_data['vehicle'].customer.user.branch
        
        if not branch:
            raise serializers.ValidationError("Branch is required. Please set your preferred branch in profile.")
        
        # Create appointment
        appointment = Appointment.objects.create(
            customer=customer,
            branch=branch,
            **validated_data
        )
        
        # Add addons
        if addon_ids:
            from services.models import AddOn
            addons = AddOn.objects.filter(id__in=addon_ids)
            appointment.addons.set(addons)
        
        return appointment


class AppointmentRescheduleSerializer(serializers.Serializer):
    """Serializer for rescheduling appointments."""
    
    preferred_datetime = serializers.DateTimeField(required=True)
    alternate_datetime = serializers.DateTimeField(required=False, allow_null=True)
    
    def validate_preferred_datetime(self, value):
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Preferred datetime must be in the future.")
        return value


class AppointmentApproveSerializer(serializers.Serializer):
    """Serializer for approving appointments."""
    
    confirmed_datetime = serializers.DateTimeField(required=False)
    admin_notes = serializers.CharField(required=False, allow_blank=True)


class AppointmentRejectSerializer(serializers.Serializer):
    """Serializer for rejecting appointments."""
    
    reason = serializers.CharField(required=True, min_length=5)


class AppointmentSlotSerializer(serializers.ModelSerializer):
    """Serializer for appointment slots."""
    
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    current_bookings_count = serializers.IntegerField(read_only=True)
    available_slots = serializers.IntegerField(read_only=True)
    is_slot_available = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = AppointmentSlot
        fields = [
            'id', 'branch', 'branch_name', 'date', 'start_time', 'end_time',
            'max_bookings', 'is_available',
            'current_bookings_count', 'available_slots', 'is_slot_available'
        ]


class AvailableSlotsSerializer(serializers.Serializer):
    """Serializer for checking available slots."""
    
    branch_id = serializers.IntegerField(required=True)
    date = serializers.DateField(required=True)


class AppointmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing appointments (calendar view)."""
    
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.user.phone', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'customer_name', 'customer_phone',
            'vehicle_registration', 'package_name',
            'vehicle_type', 'preferred_datetime', 'alternate_datetime',
            'confirmed_datetime', 'status', 'status_display',
            'pickup_required', 'created_at'
        ]


class PublicAppointmentSerializer(serializers.Serializer):
    """
    Serializer for public appointment creation from K3 website.
    Creates customer, vehicle, and appointment in one request.
    """
    
    # Customer info
    customer_name = serializers.CharField(max_length=255)
    customer_phone = serializers.CharField(max_length=20)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    
    # Vehicle info
    vehicle_brand = serializers.CharField(max_length=100)
    vehicle_model = serializers.CharField(max_length=100)
    vehicle_year = serializers.IntegerField(required=False, allow_null=True)
    vehicle_type = serializers.ChoiceField(choices=['hatchback', 'sedan', 'suv', 'bike'])
    vehicle_registration = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Appointment details
    package_id = serializers.IntegerField()
    addon_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )
    branch_id = serializers.IntegerField()
    
    # Scheduling
    preferred_datetime = serializers.DateTimeField()
    alternate_datetime = serializers.DateTimeField(required=False, allow_null=True)
    
    # Additional
    pickup_required = serializers.BooleanField(default=False)
    location = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    # Payment preference (for tracking)
    payment_method = serializers.ChoiceField(
        choices=['pay_at_center', 'online'],
        default='pay_at_center',
        required=False
    )
    
    def validate_preferred_datetime(self, value):
        """Ensure preferred datetime is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Preferred datetime must be in the future.")
        return value
    
    def validate_alternate_datetime(self, value):
        """Ensure alternate datetime is in the future if provided."""
        from django.utils import timezone
        if value and value <= timezone.now():
            raise serializers.ValidationError("Alternate datetime must be in the future.")
        return value
    
    def validate_package_id(self, value):
        """Ensure package exists."""
        from services.models import ServicePackage
        if not ServicePackage.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Invalid package selected.")
        return value
    
    def validate_branch_id(self, value):
        """Ensure branch exists."""
        from branches.models import Branch
        if not Branch.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Invalid branch selected.")
        return value

