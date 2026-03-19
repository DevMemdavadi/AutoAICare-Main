from rest_framework import serializers
from .models import Branch, ServiceBay
from django.contrib.auth import get_user_model

User = get_user_model()


class StaffSerializer(serializers.ModelSerializer):
    """Serializer for staff details."""
    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'phone', 'role')
        read_only_fields = ('id', 'name', 'email', 'phone', 'role')


class ServiceBaySerializer(serializers.ModelSerializer):
    """Serializer for Service Bay."""
    bay_type_display = serializers.CharField(source='get_bay_type_display', read_only=True)
    current_occupancy = serializers.SerializerMethodField()

    class Meta:
        model = ServiceBay
        fields = ('id', 'name', 'branch', 'bay_type', 'bay_type_display', 'is_active', 'current_occupancy')
    
    def get_current_occupancy(self, obj):
        # Find if there is an active booking in this bay right now
        active_booking = obj.bookings.filter(
            status__in=['vehicle_arrived', 'in_progress', 'work_in_progress', 'qc_pending']
        ).first()
        if active_booking:
            return {
                'booking_id': active_booking.id,
                'customer_name': active_booking.customer.user.name,
                'vehicle_number': active_booking.vehicle.registration_number,
                'status': active_booking.get_status_display()
            }
        return None


class BranchSerializer(serializers.ModelSerializer):
    """Serializer for Branch model."""
    staff_members = serializers.SerializerMethodField()
    bays = ServiceBaySerializer(many=True, read_only=True)
    
    class Meta:
        model = Branch
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def get_staff_members(self, obj):
        """Return only staff and admin members for this branch."""
        staff_users = obj.user_set.filter(role__in=['branch_admin', 'floor_manager', 'supervisor', 'applicator'])
        return StaffSerializer(staff_users, many=True).data


class BranchListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing branches."""
    staff_count = serializers.SerializerMethodField()
    bay_count = serializers.IntegerField(source='bays.count', read_only=True)
    
    class Meta:
        model = Branch
        fields = ('id', 'name', 'code', 'city', 'phone', 'is_active', 'staff_count', 'bay_count', 'address', 'opening_time', 'closing_time', 'google_review_url')
    
    def get_staff_count(self, obj):
        return obj.user_set.filter(role__in=['branch_admin', 'floor_manager', 'supervisor', 'applicator']).count()