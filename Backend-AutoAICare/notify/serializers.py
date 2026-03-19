from rest_framework import serializers
from .models import NotificationTemplate, NotificationLog, InAppNotification, WhatsAppMessageLog


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for NotificationTemplate model."""
    
    class Meta:
        model = NotificationTemplate
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for NotificationLog model."""
    recipient_name = serializers.CharField(source='recipient.name', read_only=True)
    recipient_email_display = serializers.CharField(source='recipient.email', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = NotificationLog
        fields = '__all__'
        read_only_fields = ('created_at', 'sent_at')


class InAppNotificationSerializer(serializers.ModelSerializer):
    """Serializer for InAppNotification model."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = InAppNotification
        fields = [
            'id', 'notification_type', 'notification_type_display', 'title', 'message',
            'is_read', 'related_booking_id', 'related_jobcard_id', 'related_invoice_id',
            'extra_data', 'created_at', 'read_at'
        ]
        read_only_fields = ('created_at', 'read_at')


class WhatsAppMessageLogSerializer(serializers.ModelSerializer):
    """Serializer for WhatsAppMessageLog model."""
    recipient_name = serializers.CharField(source='recipient.name', read_only=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = WhatsAppMessageLog
        fields = [
            'id', 'company', 'company_name', 'template', 'template_name',
            'recipient', 'recipient_name', 'recipient_email', 'recipient_phone',
            'message_content', 'status', 'status_display', 'whatsapp_message_id',
            'error_message', 'error_code', 'related_booking_id', 'related_jobcard_id',
            'related_invoice_id', 'created_at', 'sent_at', 'delivered_at', 'read_at'
        ]
        read_only_fields = ('created_at', 'sent_at', 'delivered_at', 'read_at', 'whatsapp_message_id')
