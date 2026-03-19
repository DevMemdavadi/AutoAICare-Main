from rest_framework import serializers
from .models import Feedback
from bookings.serializers import BookingSerializer


class FeedbackSerializer(serializers.ModelSerializer):
    """Serializer for Feedback model."""
    booking_details = BookingSerializer(source='booking', read_only=True)
    customer_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Feedback
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'helpful_count')
    
    def get_customer_details(self, obj):
        """Get customer details from booking."""
        if obj.booking and obj.booking.customer:
            from customers.serializers import CustomerSerializer
            return CustomerSerializer(obj.booking.customer).data
        return None


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating feedback."""
    class Meta:
        model = Feedback
        fields = ('booking', 'rating', 'review', 'category', 'suggestions')
