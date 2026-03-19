from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from config.permissions import IsSuperAdmin
from .models import GlobalSettings, ReferralSettings
from .serializers import GlobalSettingsSerializer, ReferralSettingsSerializer


class GlobalSettingsView(APIView):
    """
    API endpoint for managing global system settings.
    - super_admin: can update all GlobalSettings fields.
    - company_admin: can ONLY update their own company's WhatsApp/notification settings
      (stored in CompanySettings, not the global singleton).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get global settings."""
        settings = GlobalSettings.load()
        serializer = GlobalSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        """Update settings — access level depends on role."""
        user = request.user

        # Whitelist of fields a company_admin is allowed to update (their own company settings)
        COMPANY_ADMIN_SETTINGS_FIELDS = {
            'enable_whatsapp_notifications',
            'whatsapp_mode',
            'whatsapp_provider',
            'whatsapp_business_phone',
            'whatsapp_credentials',
            'default_tax_rate',
            'tax_name',
            'enable_email_notifications',
            'enable_sms_notifications',
            'booking_advance_days',
            'cancellation_hours',
            'slot_duration_minutes',
            'wp_url',
            'wp_api_key',
        }

        if user.role == 'super_admin':
            # super_admin: split out WhatsApp keys, update global settings + optionally company settings
            # Read WhatsApp fields from request data (read-only — do not mutate request.data)
            whatsapp_data = {
                key: request.data[key]
                for key in COMPANY_ADMIN_SETTINGS_FIELDS
                if key in request.data
            }
            # Build non-whatsapp/non-setting payload for GlobalSettings: Actually, super_admin should save ALL valid GlobalSettings fields to the global instance
            global_data = request.data.copy()

            settings = GlobalSettings.load()
            
            # Fields that are actually on GlobalSettings model
            GLOBAL_SETTINGS_MODEL_FIELDS = [
                'default_tax_rate', 'tax_name', 'business_name', 'business_email',
                'business_phone', 'business_address', 'currency', 'currency_symbol',
                'booking_advance_days', 'cancellation_hours', 'slot_duration_minutes',
                'enable_email_notifications', 'enable_sms_notifications',
                'maintenance_mode'
            ]
            
            # Update fields on GlobalSettings manually
            for key in GLOBAL_SETTINGS_MODEL_FIELDS:
                if key in request.data:
                    # Handle decimal fields properly
                    if key == 'default_tax_rate':
                        try:
                            from decimal import Decimal
                            setattr(settings, key, Decimal(request.data[key]))
                        except:
                            return Response({'error': 'Invalid default_tax_rate'}, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        setattr(settings, key, request.data[key])
            
            settings.save()

            if whatsapp_data and hasattr(user, 'company') and user.company:
                try:
                    company_settings = user.company.company_settings
                    for key, value in whatsapp_data.items():
                        setattr(company_settings, key, value)
                    company_settings.save()
                except Exception as e:
                    return Response(
                        {'error': f'Failed to update WhatsApp settings: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            updated_serializer = GlobalSettingsSerializer(settings, context={'request': request})
            return Response(updated_serializer.data)

        elif user.role == 'company_admin':
            # company_admin: may ONLY update their own company's WhatsApp/notification settings
            if not (hasattr(user, 'company') and user.company):
                return Response(
                    {'error': 'No company associated with your account.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Only allow whitelisted fields
            setting_data = {
                key: request.data[key]
                for key in COMPANY_ADMIN_SETTINGS_FIELDS
                if key in request.data
            }
            if not setting_data:
                return Response(
                    {'error': 'Company admins can only update their own settings.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            branch_id = request.query_params.get('branch')
            if branch_id:
                # Save to branch overrides in company JSON settings
                company = user.company
                overrides = company.settings.get('branch_overrides', {})
                if str(branch_id) not in overrides:
                    overrides[str(branch_id)] = {}
                overrides[str(branch_id)].update(setting_data)
                company.settings['branch_overrides'] = overrides
                company.save()
                return Response({'message': f'Branch settings updated for branch {branch_id}.'})

            try:
                company_settings = user.company.company_settings
                for key, value in setting_data.items():
                    setattr(company_settings, key, value)
                company_settings.save()
                return Response({'message': 'Company settings updated successfully.'})
            except Exception as e:
                return Response(
                    {'error': f'Failed to update company settings: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        else:
            return Response(
                {'error': 'Only super admin or company admin can update settings.'},
                status=status.HTTP_403_FORBIDDEN
            )

    def patch(self, request):
        """Partial update of settings (same access rules as PUT)."""
        return self.put(request)


class ReferralSettingsView(APIView):
    """
    API endpoint for managing referral program settings.
    Only super admin can update settings (global singleton — affects all companies).
    Any authenticated user can view to see current rewards.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get referral settings."""
        settings = ReferralSettings.load()
        serializer = ReferralSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        """Update referral settings (super admin only)."""
        if request.user.role != 'super_admin':
            return Response(
                {'error': 'Only super admin can update referral settings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings = ReferralSettings.load()
        serializer = ReferralSettingsSerializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        """Partial update of referral settings (super admin only)."""
        return self.put(request)

