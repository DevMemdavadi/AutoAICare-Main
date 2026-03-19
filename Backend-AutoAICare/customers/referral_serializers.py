from rest_framework import serializers
from .referral_models import Referral, ReferralCode
from .models import Customer


class ReferralCodeSerializer(serializers.ModelSerializer):
    """Serializer for ReferralCode."""
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)
    
    class Meta:
        model = ReferralCode
        fields = ('id', 'code', 'customer', 'customer_name', 'is_active', 'times_used', 'created_at')
        read_only_fields = ('id', 'customer', 'times_used', 'created_at')


class ReferralSerializer(serializers.ModelSerializer):
    """Serializer for Referral."""
    referrer_name = serializers.CharField(source='referrer.user.name', read_only=True)
    referrer_phone = serializers.CharField(source='referrer.user.phone', read_only=True)
    referee_name = serializers.CharField(source='referee.user.name', read_only=True)
    referee_phone = serializers.CharField(source='referee.user.phone', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Referral
        fields = (
            'id', 'referrer', 'referrer_name', 'referrer_phone',
            'referee', 'referee_name', 'referee_phone',
            'referral_code', 'status', 'status_display',
            'referrer_points_awarded', 'referee_points_awarded',
            'created_at', 'completed_at', 'rewarded_at'
        )
        read_only_fields = (
            'id', 'referrer_points_awarded', 'referee_points_awarded',
            'created_at', 'completed_at', 'rewarded_at'
        )


class CreateReferralCodeSerializer(serializers.Serializer):
    """Serializer for creating a custom referral code."""
    custom_code = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        help_text='Optional custom referral code (leave empty for auto-generation)'
    )
    
    def validate_custom_code(self, value):
        """Validate custom code format and uniqueness."""
        if value:
            value = value.upper().strip()
            # Check if code already exists
            if ReferralCode.objects.filter(code=value).exists():
                raise serializers.ValidationError("This referral code is already taken.")
            # Validate format (alphanumeric only)
            if not value.isalnum():
                raise serializers.ValidationError("Referral code must contain only letters and numbers.")
            if len(value) < 4 or len(value) > 20:
                raise serializers.ValidationError("Referral code must be between 4 and 20 characters.")
        return value


class ApplyReferralCodeSerializer(serializers.Serializer):
    """Serializer for applying a referral code during registration."""
    referral_code = serializers.CharField(
        max_length=50,
        required=True,
        help_text='Referral code from existing customer'
    )
    
    def validate_referral_code(self, value):
        """Validate referral code exists and is active."""
        value = value.upper().strip()
        try:
            referral_code = ReferralCode.objects.get(code=value, is_active=True)
            return referral_code
        except ReferralCode.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive referral code.")


class ReferralStatsSerializer(serializers.Serializer):
    """Serializer for referral statistics."""
    total_referrals = serializers.IntegerField()
    pending_referrals = serializers.IntegerField()
    completed_referrals = serializers.IntegerField()
    rewarded_referrals = serializers.IntegerField()
    total_rewards_earned = serializers.DecimalField(max_digits=10, decimal_places=2)
    referral_code = serializers.CharField()
    times_code_used = serializers.IntegerField()
