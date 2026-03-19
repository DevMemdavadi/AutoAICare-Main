from rest_framework import serializers
from .models import GlobalSettings, ReferralSettings


class GlobalSettingsSerializer(serializers.ModelSerializer):
    """Serializer for GlobalSettings model with company WhatsApp settings."""
    
    # WhatsApp fields from company settings
    enable_whatsapp_notifications = serializers.SerializerMethodField()
    whatsapp_mode = serializers.SerializerMethodField()
    whatsapp_provider = serializers.SerializerMethodField()
    whatsapp_business_phone = serializers.SerializerMethodField()
    whatsapp_credentials = serializers.SerializerMethodField()
    wp_url = serializers.SerializerMethodField()
    wp_api_key = serializers.SerializerMethodField()
    
    # Other fields from company settings
    default_tax_rate = serializers.SerializerMethodField()
    tax_name = serializers.SerializerMethodField()
    booking_advance_days = serializers.SerializerMethodField()
    cancellation_hours = serializers.SerializerMethodField()
    slot_duration_minutes = serializers.SerializerMethodField()
    enable_email_notifications = serializers.SerializerMethodField()
    enable_sms_notifications = serializers.SerializerMethodField()
    
    # Business info from company model
    business_name = serializers.SerializerMethodField()
    business_email = serializers.SerializerMethodField()
    business_phone = serializers.SerializerMethodField()
    business_address = serializers.SerializerMethodField()
    
    class Meta:
        model = GlobalSettings
        fields = [
            'id',
            'default_tax_rate',
            'tax_name',
            'business_name',
            'business_email',
            'business_phone',
            'business_address',
            'currency',
            'currency_symbol',
            'booking_advance_days',
            'cancellation_hours',
            'slot_duration_minutes',
            'enable_email_notifications',
            'enable_sms_notifications',
            'enable_whatsapp_notifications',
            'whatsapp_mode',
            'whatsapp_provider',
            'whatsapp_business_phone',
            'whatsapp_credentials',
            'wp_url',
            'wp_api_key',
            'maintenance_mode',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def _get_setting(self, obj, field_name):
        """Helper to get setting with branch-specific override logic."""
        request = self.context.get('request')
        if not request:
            return getattr(obj, field_name, None)

        branch_id = request.query_params.get('branch')
        
        # 1. Check for company context
        company = None
        if hasattr(request.user, 'company') and request.user.company:
            company = request.user.company
        
        if company:
            # 2. Check for branch override in company JSON settings
            if branch_id:
                branch_overrides = company.settings.get('branch_overrides', {})
                branch_data = branch_overrides.get(str(branch_id), {})
                if field_name in branch_data:
                    return branch_data[field_name]
            
            # 3. Fallback to company settings model
            try:
                company_settings = company.company_settings
                if hasattr(company_settings, field_name):
                    return getattr(company_settings, field_name)
            except:
                pass

        # 4. Final fallback to global singleton
        return getattr(obj, field_name, None)

    def get_enable_whatsapp_notifications(self, obj):
        return self._get_setting(obj, 'enable_whatsapp_notifications')
    
    def get_whatsapp_mode(self, obj):
        return self._get_setting(obj, 'whatsapp_mode')
    
    def get_whatsapp_provider(self, obj):
        return self._get_setting(obj, 'whatsapp_provider')
    
    def get_whatsapp_business_phone(self, obj):
        return self._get_setting(obj, 'whatsapp_business_phone')

    def get_whatsapp_credentials(self, obj):
        return self._get_setting(obj, 'whatsapp_credentials')

    def get_wp_url(self, obj):
        return self._get_setting(obj, 'wp_url')

    def get_wp_api_key(self, obj):
        return self._get_setting(obj, 'wp_api_key')

    def get_default_tax_rate(self, obj):
        return self._get_setting(obj, 'default_tax_rate')

    def get_tax_name(self, obj):
        return self._get_setting(obj, 'tax_name')

    def get_booking_advance_days(self, obj):
        return self._get_setting(obj, 'booking_advance_days')

    def get_cancellation_hours(self, obj):
        return self._get_setting(obj, 'cancellation_hours')

    def get_slot_duration_minutes(self, obj):
        return self._get_setting(obj, 'slot_duration_minutes')

    def get_enable_email_notifications(self, obj):
        return self._get_setting(obj, 'enable_email_notifications')

    def get_enable_sms_notifications(self, obj):
        return self._get_setting(obj, 'enable_sms_notifications')

    def get_business_name(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'company') and request.user.company:
            return request.user.company.display_name or request.user.company.name
        return obj.business_name

    def get_business_email(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'company') and request.user.company:
            return request.user.company.email
        return obj.business_email

    def get_business_phone(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'company') and request.user.company:
            return request.user.company.phone
        return obj.business_phone

    def get_business_address(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'company') and request.user.company:
            return request.user.company.full_address
        return obj.business_address


class ReferralSettingsSerializer(serializers.ModelSerializer):
    """Serializer for ReferralSettings model."""
    
    referrer_reward_type_display = serializers.CharField(source='get_referrer_reward_type_display', read_only=True)
    referee_reward_type_display = serializers.CharField(source='get_referee_reward_type_display', read_only=True)
    referrer_reward_text = serializers.CharField(source='get_referrer_reward_display_text', read_only=True)
    referee_reward_text = serializers.CharField(source='get_referee_reward_display_text', read_only=True)
    
    class Meta:
        model = ReferralSettings
        fields = [
            'id',
            'is_enabled',
            'referrer_reward_type',
            'referrer_reward_type_display',
            'referrer_reward_value',
            'referrer_reward_text',
            'referee_reward_type',
            'referee_reward_type_display',
            'referee_reward_value',
            'referee_reward_text',
            'minimum_job_amount',
            'max_referrer_reward_cap',
            'max_referee_reward_cap',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
