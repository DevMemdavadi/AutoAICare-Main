from rest_framework import serializers
from .models import Payment
from bookings.serializers import BookingSerializer


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""
    booking_details = BookingSerializer(source='booking', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.name', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, allow_null=True)
    status = serializers.CharField(source='payment_status', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'payment_date', 'recorded_by')
    
    def validate_amount(self, value):
        """Validate payment amount is positive."""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value
    
    def validate(self, data):
        """Validate payment doesn't exceed invoice remaining balance."""
        invoice = data.get('invoice')
        amount = data.get('amount')
        
        if invoice and amount:
            # For new payments, check against remaining balance
            if not self.instance:  # Creating new payment
                remaining = invoice.remaining_balance
                if amount > remaining:
                    raise serializers.ValidationError({
                        'amount': f'Payment amount ₹{amount} exceeds remaining balance ₹{remaining:.2f}'
                    })
        
        return data


class PaymentInitiateSerializer(serializers.Serializer):
    """Serializer for initiating payment."""
    booking_id = serializers.IntegerField(required=True)
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES, required=True)
