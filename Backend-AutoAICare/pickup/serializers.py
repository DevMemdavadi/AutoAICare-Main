from rest_framework import serializers
from .models import PickupDropRequest
from bookings.serializers import BookingSerializer
from users.serializers import UserSerializer


class PickupDropRequestSerializer(serializers.ModelSerializer):
    """Serializer for PickupDropRequest model."""
    booking_details = BookingSerializer(source='booking', read_only=True)
    driver_details = UserSerializer(source='driver', read_only=True)
    
    class Meta:
        model = PickupDropRequest
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def to_representation(self, instance):
        """Ensure driver_details is properly serialized."""
        data = super().to_representation(instance)
        # Make sure driver_details is included even if driver is assigned through admin
        if instance.driver and not data.get('driver_details'):
            data['driver_details'] = UserSerializer(instance.driver).data
        return data


class PickupDropCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating pickup requests."""
    class Meta:
        model = PickupDropRequest
        fields = ('booking', 'driver', 'request_type')