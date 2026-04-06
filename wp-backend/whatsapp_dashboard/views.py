from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, views
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.core.cache import cache
from channels.layers import get_channel_layer
from rest_framework.views import APIView

from core.pagination import CustomPagination
from whatsapp.models import WhatsAppMessage, ScheduledMessage
from whatsapp.services import WhatsAppService
import logging
from .serializers import WhatsAppMessageSerializer, ScheduledMessageSerializer, SendMessageSerializer
from .models import Contact, ContactGroup, BroadcastCampaign, BroadcastRecipient, AutoReplyKeyword, DripCampaign, DripMessage, DripRecipient, DripMessageLog, ChatAssignment, AgentAvailability, ChatQueue
from .serializers import ContactSerializer, ContactGroupSerializer, BroadcastCampaignSerializer, CreateBroadcastCampaignSerializer, AutoReplyKeywordSerializer, DripCampaignSerializer, DripMessageSerializer, DripRecipientSerializer, DripMessageLogSerializer, CreateDripCampaignSerializer, DripCampaignStatsSerializer, ChatAssignmentSerializer, CreateChatAssignmentSerializer, UpdateChatAssignmentSerializer, ChatTransferSerializer, AgentAvailabilitySerializer, UpdateAgentStatusSerializer, ChatQueueSerializer, TeamInboxStatsSerializer, ChatListSerializer, BroadcastCampaignReportSerializer
from users.models import User

logger = logging.getLogger(__name__)

# Create your views here.

# @api_view(['GET'])
# # @permission_classes([IsAdminUser])
# def overview_stats(request):
#     """
#     Provides a high-level overview of WhatsApp message statistics.
#     """
#     stats = WhatsAppMessage.objects.aggregate(
#         total_messages=Count('id'),
#         sent=Count('id', filter=Q(status='sent')),
#         delivered=Count('id', filter=Q(status='delivered')),
#         read=Count('id', filter=Q(status='read')),
#         failed=Count('id', filter=Q(status='failed')),
#         received=Count('id', filter=Q(status='received'))
#     )
#     return Response(stats)


@api_view(['GET'])
def overview_stats(request):
    now = timezone.now()
    start_current = now - timedelta(days=7)
    start_previous = now - timedelta(days=14)
    end_previous = start_current

    # Current period
    current_qs = WhatsAppMessage.objects.filter(timestamp__gte=start_current)
    # Previous period
    previous_qs = WhatsAppMessage.objects.filter(timestamp__gte=start_previous, timestamp__lt=end_previous)

    def get_count(qs, status=None):
        if status:
            return qs.filter(status=status).count()
        return qs.count()

    def get_change(current, previous):
        if previous == 0:
            return 0 if current == 0 else 100
        return round((current - previous) / previous * 100)

    stats = {}
    for key, status in [
        ("total_messages", None),
        ("sent", "sent"),
        ("delivered", "delivered"),
        ("failed", "failed"),
    ]:
        current = get_count(current_qs, status)
        previous = get_count(previous_qs, status)
        stats[key] = {
            "value": current,
            "change": get_change(current, previous)
        }

    return Response(stats)

@api_view(['GET'])
# @permission_classes([IsAdminUser])
def today_stats(request):
    """
    Provides statistics for WhatsApp messages sent and received today.
    """
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    stats = WhatsAppMessage.objects.filter(timestamp__gte=today_start).aggregate(
        total_today=Count('id'),
        sent_today=Count('id', filter=Q(status='sent')),
        delivered_today=Count('id', filter=Q(status='delivered')),
        read_today=Count('id', filter=Q(status='read')),
        failed_today=Count('id', filter=Q(status='failed')),
        received_today=Count('id', filter=Q(status='received'))
    )
    return Response(stats)

@api_view(['GET'])
# @permission_classes([IsAdminUser])
def timeline_stats(request):
    """
    Provides a timeline of message counts over the last 30 days.
    """
    thirty_days_ago = timezone.now() - timedelta(days=30)
    timeline = WhatsAppMessage.objects.filter(timestamp__gte=thirty_days_ago) \
        .extra(select={'date': 'date(timestamp)'}) \
        .values('date') \
        .annotate(count=Count('id')) \
        .order_by('date')
    
    return Response(timeline)

class SendMessageAPIView(views.APIView):
    """
    Send a WhatsApp message (text, media, template, or reply).
    """
    def post(self, request, *args, **kwargs):
        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        phone_number = data.get('recipient_phone_number')
        contact_id = data.get('recipient_contact_id')
        media_file = data.get('media_file')
        
        if contact_id:
            try:
                contact = Contact.objects.get(id=contact_id)
                phone_number = contact.phone_number
            except Contact.DoesNotExist:
                return Response({'error': 'Contact not found'}, status=404)
        print('media_file', media_file)
        media_path = None
        if media_file:
            # Save the uploaded file temporarily to pass its path to the service
            from django.core.files.storage import default_storage
            file_name = default_storage.save(media_file.name, media_file)
            media_path = default_storage.path(file_name)

        try:
            whatsapp_service = WhatsAppService()
            result = whatsapp_service.send_message(
                to_phone=phone_number,
                message_type=data.get('message_type'),
                content=data.get('content'),
                template_name=data.get('template_name'),
                template_params=data.get('template_params'),
                media_path=media_path,
                reply_to_message_id=data.get('reply_to_message_id')
            )
            
            response_data = {
                'status': 'success',
                'message': 'Message sent successfully',
                'data': result
            }
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Failed to send message from dashboard: {e}")
            return Response({'error': str(e)}, status=500)
        
        finally:
            # Clean up the temporary media file
            if media_path:
                default_storage.delete(file_name)

@api_view(['GET'])
# @permission_classes([IsAdminUser])
def list_templates_view(request):
    """
    List all available WhatsApp message templates.
    """
    try:
        whatsapp_service = WhatsAppService()
        templates = whatsapp_service.get_available_templates()
        return Response({
            'status': 'success',
            'templates': templates
        })
    except Exception as e:
        logger.error(f"Failed to list templates from dashboard: {str(e)}")
        return Response({'error': str(e)}, status=500)

class WhatsAppMessagePagination(CustomPagination):
    page_size = 5  # Set page size to 5 for WhatsAppMessageViewSet
    max_page_size = 50  # Optional: Adjust max page size if needed

class WhatsAppMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows WhatsApp messages to be viewed.
    Provides list with pagination, search, and ordering.
    """
    queryset = WhatsAppMessage.objects.all()
    serializer_class = WhatsAppMessageSerializer
    # permission_classes = [IsAdminUser]
    pagination_class = WhatsAppMessagePagination
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['phone_number', 'message_content', 'template_name']
    ordering_fields = ['timestamp', 'status']
    ordering = ['-timestamp']
    filterset_fields = ['status']

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Returns the count of unread incoming messages.
        """
        count = WhatsAppMessage.objects.filter(status='sent', is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Marks a specific message as read.
        """
        message = self.get_object()
        if message.status == 'sent' and not message.is_read:
            message.is_read = True
            message.save()
            return Response({'status': 'success', 'message': 'Message marked as read.'})
        return Response({'status': 'no_change', 'message': 'Message was not unread or was not an incoming message.'})

@api_view(['GET'])
# @permission_classes([IsAdminUser])
def get_whatsapp_settings(request):
    """
    Returns non-sensitive WhatsApp configuration settings.
    """
    settings_data = {
        'phone_number_id': settings.WHATSAPP_PHONE_NUMBER_ID,
        'business_account_id': settings.WHATSAPP_BUSINESS_ACCOUNT_ID,
        'webhook_url': "/api/whatsapp/webhook/", # Assuming this is the path
    }
    return Response(settings_data)

@api_view(['GET'])
# @permission_classes([IsAdminUser])
def get_system_health(request):
    """
    Checks the health of system components like Redis and the channel layer.
    """
    # Check Redis connection
    redis_ok = False
    try:
        cache.set('health_check', 'ok', timeout=5)
        redis_ok = cache.get('health_check') == 'ok'
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        redis_ok = False

    # Check channel layer
    channel_layer = get_channel_layer()
    channel_ok = channel_layer is not None

    health_data = {
        'redis_status': 'ok' if redis_ok else 'error',
        'channel_layer_status': 'ok' if channel_ok else 'error',
    }
    return Response(health_data)

class ContactGroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing contact groups.
    """
    queryset = ContactGroup.objects.all()
    serializer_class = ContactGroupSerializer
    permission_classes = [IsAdminUser]

class ContactViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing contacts.
    """
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    # permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'phone_number', 'email']
    ordering_fields = ['name', 'created_at', 'last_message_at']
    ordering = ['-created_at']
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        contact = self.get_object()
        messages = WhatsAppMessage.objects.filter(phone_number=contact.phone_number)
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = WhatsAppMessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = WhatsAppMessageSerializer(messages, many=True)
        return Response(serializer.data)

@api_view(['GET'])
# @permission_classes([IsAdminUser])
def contact_stats(request):
    """
    Provides statistics about contacts.
    """
    total_contacts = Contact.objects.count()
    active_contacts = Contact.objects.filter(status='active').count()
    total_groups = ContactGroup.objects.count()

    # Calculate response rate: % of contacts who have sent at least one message
    contacts_with_received_messages = WhatsAppMessage.objects.filter(
        status='received',
        phone_number__in=Contact.objects.values_list('phone_number', flat=True)
    ).values('phone_number').distinct().count()

    response_rate = 0
    if total_contacts > 0:
        response_rate = round((contacts_with_received_messages / total_contacts) * 100)

    stats = {
        'total_contacts': total_contacts,
        'active_contacts': active_contacts,
        'contact_groups': total_groups,
        'response_rate': response_rate,
    }
    return Response(stats)

class ScheduledMessageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing scheduled messages.
    """
    queryset = ScheduledMessage.objects.all()
    serializer_class = ScheduledMessageSerializer
    # permission_classes = [IsAdminUser] # You might want to enforce permissions
    pagination_class = CustomPagination

class RetryFailedMessageAPIView(APIView):
    def post(self, request):
        """
        Retry sending a failed WhatsApp message.
        POST body: { "message_id": "<id>" }
        """
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'error': 'message_id is required'}, status=400)
        try:
            msg = WhatsAppMessage.objects.get(message_id=message_id, status='failed')
        except WhatsAppMessage.DoesNotExist:
            return Response({'error': 'Failed message not found'}, status=404)

        service = WhatsAppService()
        try:
            result = service.send_message(
                to_phone=msg.phone_number,
                message_type=msg.message_type,
                content=msg.message_content,
                template_name=msg.template_name,
            )
            msg.status = 'sent'
            msg.save()
            return Response({'status': 'success', 'result': result})
        except Exception as e:
            msg.status = 'failed'
            msg.save()
            return Response({'error': str(e)}, status=500)

class BulkRetryFailedMessagesAPIView(APIView):
    def post(self, request):
        """
        Retry multiple failed WhatsApp messages.
        POST body: { "message_ids": [id1, id2, ...] } or { "all": true }
        """
        message_ids = request.data.get('message_ids', [])
        retry_all = request.data.get('all', False)

        if retry_all:
            messages = WhatsAppMessage.objects.filter(status='failed')
        else:
            messages = WhatsAppMessage.objects.filter(message_id__in=message_ids, status='failed')

        service = WhatsAppService()
        results = []
        for msg in messages:
            try:
                result = service.send_message(
                    to_phone=msg.phone_number,
                    message_type=msg.message_type,
                    content=msg.message_content,
                    template_name=msg.template_name,
                )
                msg.status = 'sent'
                msg.save()
                results.append({'message_id': msg.message_id, 'status': 'success'})
            except Exception as e:
                msg.status = 'failed'
                msg.save()
                results.append({'message_id': msg.message_id, 'status': 'failed', 'error': str(e)})

        return Response({'results': results, 'total': len(results)})

class BroadcastCampaignViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing broadcast campaigns.
    """
    queryset = BroadcastCampaign.objects.all()
    serializer_class = BroadcastCampaignSerializer
    pagination_class = CustomPagination

    def create(self, request, *args, **kwargs):
        """
        Create a new broadcast campaign and start sending messages.
        """
        serializer = CreateBroadcastCampaignSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        
        # Create the campaign
        campaign = BroadcastCampaign.objects.create(
            name=data['name'],
            message_type=data['message_type'],
            message_content=data.get('message_content'),
            template_name=data.get('template_name'),
            scheduled_at=data.get('scheduled_at'),
            status='pending'
        )

        # Get contacts to send to
        contacts = []
        if data.get('contact_ids'):
            contacts.extend(Contact.objects.filter(id__in=data['contact_ids']))
        
        if data.get('group_ids'):
            group_contacts = Contact.objects.filter(groups__id__in=data['group_ids']).distinct()
            contacts.extend(group_contacts)

        # Remove duplicates
        contacts = list(set(contacts))

        # Create recipients
        recipients = []
        for contact in contacts:
            recipient = BroadcastRecipient.objects.create(
                campaign=campaign,
                contact=contact,
                status='pending'
            )
            recipients.append(recipient)

        # If scheduled for later, don't start sending yet
        if data.get('scheduled_at'):
            campaign.status = 'scheduled'
            campaign.save()
        else:
            # Start sending immediately via Celery task
            from .tasks import send_broadcast_campaign
            send_broadcast_campaign.delay(campaign.id)

        return Response({
            'status': 'success',
            'campaign_id': campaign.id,
            'recipients_count': len(recipients),
            'message': 'Broadcast campaign created successfully'
        }, status=201)

    @action(detail=True, methods=['post'])
    def retry_failed(self, request, pk=None):
        """
        Retry sending to failed recipients in this campaign.
        """
        campaign = self.get_object()
        failed_recipients = campaign.recipients.filter(status='failed')
        
        if not failed_recipients.exists():
            return Response({'message': 'No failed recipients to retry'})

        from .tasks import send_broadcast_campaign
        send_broadcast_campaign.delay(campaign.id, retry_failed_only=True)
        
        return Response({
            'message': f'Retrying {failed_recipients.count()} failed recipients'
        })

    @action(detail=True, methods=['get'])
    def recipients(self, request, pk=None):
        """
        Get all recipients for this campaign with their status.
        """
        campaign = self.get_object()
        recipients = campaign.recipients.all()
        
        from .serializers import BroadcastRecipientSerializer
        serializer = BroadcastRecipientSerializer(recipients, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='report')
    def report(self, request, pk=None):
        """
        Get a report for a specific broadcast campaign.
        """
        campaign = self.get_object()
        total_recipients = campaign.recipients.count()
        sent_count = campaign.recipients.filter(status='sent').count()
        failed_count = campaign.recipients.filter(status='failed').count()
        pending_count = total_recipients - sent_count - failed_count

        report_data = {
            'total_recipients': total_recipients,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'pending_count': pending_count,
            'sent_percentage': (sent_count / total_recipients * 100) if total_recipients > 0 else 0,
            'failed_percentage': (failed_count / total_recipients * 100) if total_recipients > 0 else 0,
        }
        
        serializer = BroadcastCampaignReportSerializer(data=report_data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)

class AutoReplyKeywordViewSet(viewsets.ModelViewSet):
    queryset = AutoReplyKeyword.objects.all()
    serializer_class = AutoReplyKeywordSerializer
    # Optionally add permissions

# Drip Campaign Views

class DripCampaignViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing drip campaigns.
    """
    queryset = DripCampaign.objects.all()
    serializer_class = DripCampaignSerializer
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']
    filterset_fields = ['status']

    def create(self, request, *args, **kwargs):
        """
        Create a new drip campaign with initial setup.
        """
        serializer = CreateDripCampaignSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        
        # Create the campaign
        campaign = DripCampaign.objects.create(
            name=data['name'],
            description=data.get('description', ''),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            contact_ids=data.get('contact_ids', []),
            group_ids=data.get('group_ids', [])
        )
        
        # Create messages if provided
        if data.get('messages'):
            for message_data in data['messages']:
                DripMessage.objects.create(
                    campaign=campaign,
                    **message_data
                )
        
        # Create recipients
        self._create_recipients(campaign, data.get('contact_ids', []), data.get('group_ids', []))
        
        serializer = DripCampaignSerializer(campaign)
        return Response(serializer.data, status=201)

    def _create_recipients(self, campaign, contact_ids, group_ids):
        """Helper method to create recipients for a campaign"""
        recipients = []
        
        # Add individual contacts
        if contact_ids:
            contacts = Contact.objects.filter(id__in=contact_ids)
            for contact in contacts:
                recipients.append(DripRecipient(
                    campaign=campaign,
                    contact=contact
                ))
        
        # Add contacts from groups
        if group_ids:
            group_contacts = Contact.objects.filter(groups__id__in=group_ids).distinct()
            for contact in group_contacts:
                # Avoid duplicates
                if not any(r.contact_id == contact.id for r in recipients):
                    recipients.append(DripRecipient(
                        campaign=campaign,
                        contact=contact
                    ))
        
        if recipients:
            DripRecipient.objects.bulk_create(recipients)
            campaign.total_recipients = len(recipients)
            campaign.save()

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a drip campaign"""
        campaign = self.get_object()
        
        if campaign.status != 'draft':
            return Response({'error': 'Only draft campaigns can be activated'}, status=400)
        
        if not campaign.messages.exists():
            return Response({'error': 'Campaign must have at least one message'}, status=400)
        
        campaign.status = 'active'
        campaign.started_at = timezone.now()
        campaign.save()
        
        # Start the campaign processing
        from .tasks import start_drip_campaign
        start_drip_campaign.delay(campaign.id)
        
        return Response({'status': 'Campaign activated successfully'})

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a drip campaign"""
        campaign = self.get_object()
        campaign.status = 'paused'
        campaign.save()
        return Response({'status': 'Campaign paused successfully'})

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused drip campaign"""
        campaign = self.get_object()
        if campaign.status != 'paused':
            return Response({'error': 'Only paused campaigns can be resumed'}, status=400)
        
        campaign.status = 'active'
        campaign.save()
        
        # Resume the campaign processing
        from .tasks import resume_drip_campaign
        resume_drip_campaign.delay(campaign.id)
        
        return Response({'status': 'Campaign resumed successfully'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a drip campaign"""
        campaign = self.get_object()
        campaign.status = 'cancelled'
        campaign.save()
        return Response({'status': 'Campaign cancelled successfully'})

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get detailed statistics for a drip campaign"""
        campaign = self.get_object()
        
        recipients = campaign.recipients.all()
        message_logs = DripMessageLog.objects.filter(recipient__campaign=campaign)
        
        stats = {
            'total_recipients': recipients.count(),
            'active_recipients': recipients.filter(status='active').count(),
            'completed_recipients': recipients.filter(status='completed').count(),
            'failed_recipients': recipients.filter(status='failed').count(),
            'paused_recipients': recipients.filter(status='paused').count(),
            'unsubscribed_recipients': recipients.filter(status='unsubscribed').count(),
            'total_messages_sent': message_logs.filter(status='sent').count(),
            'total_messages_failed': message_logs.filter(status='failed').count(),
        }
        
        # Calculate completion rate
        if stats['total_recipients'] > 0:
            stats['completion_rate'] = (stats['completed_recipients'] / stats['total_recipients']) * 100
        else:
            stats['completion_rate'] = 0
        
        # Calculate average messages per recipient
        if stats['total_recipients'] > 0:
            stats['average_messages_per_recipient'] = stats['total_messages_sent'] / stats['total_recipients']
        else:
            stats['average_messages_per_recipient'] = 0
        
        serializer = DripCampaignStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def recipients(self, request, pk=None):
        """Get all recipients for a drip campaign"""
        campaign = self.get_object()
        recipients = campaign.recipients.all()
        serializer = DripRecipientSerializer(recipients, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def message_logs(self, request, pk=None):
        """Get message logs for a drip campaign"""
        campaign = self.get_object()
        logs = DripMessageLog.objects.filter(recipient__campaign=campaign)
        serializer = DripMessageLogSerializer(logs, many=True)
        return Response(serializer.data)

class DripMessageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing drip campaign messages.
    """
    queryset = DripMessage.objects.all()
    serializer_class = DripMessageSerializer
    pagination_class = CustomPagination

    def get_queryset(self):
        """Filter messages by campaign if campaign_id is provided"""
        queryset = DripMessage.objects.all()
        campaign_id = self.request.query_params.get('campaign_id', None)
        if campaign_id is not None:
            queryset = queryset.filter(campaign_id=campaign_id)
        return queryset

class DripRecipientViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing drip campaign recipients.
    """
    queryset = DripRecipient.objects.all()
    serializer_class = DripRecipientSerializer
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['contact__name', 'contact__phone_number', 'contact__email']
    ordering_fields = ['created_at', 'status', 'messages_sent']
    filterset_fields = ['status', 'campaign']

    @action(detail=True, methods=['post'])
    def unsubscribe(self, request, pk=None):
        """Unsubscribe a recipient from the drip campaign"""
        recipient = self.get_object()
        recipient.status = 'unsubscribed'
        recipient.unsubscribed_at = timezone.now()
        recipient.unsubscribe_reason = request.data.get('reason', '')
        recipient.save()
        return Response({'status': 'Recipient unsubscribed successfully'})

    @action(detail=True, methods=['get'])
    def message_logs(self, request, pk=None):
        """Get message logs for a specific recipient"""
        recipient = self.get_object()
        logs = recipient.message_logs.all()
        serializer = DripMessageLogSerializer(logs, many=True)
        return Response(serializer.data)

# Multi-Agent Team Inbox Views

class ChatAssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing chat assignments.
    """
    queryset = ChatAssignment.objects.all()
    serializer_class = ChatAssignmentSerializer
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['phone_number', 'notes']
    ordering_fields = ['assigned_at', 'last_activity_at', 'priority']
    ordering = ['-last_activity_at']
    filterset_fields = ['status', 'priority', 'assigned_agent', 'branch_id']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateChatAssignmentSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateChatAssignmentSerializer
        return ChatAssignmentSerializer

    def get_queryset(self):
        """Filter queryset based on user permissions and role"""
        queryset = ChatAssignment.objects.all()
        
        # If user is not admin, only show their assigned chats
        if not self.request.user.is_staff:
            queryset = queryset.filter(assigned_agent=self.request.user)
        
        return queryset

    @action(detail=False, methods=['get'])
    def my_chats(self, request):
        """Get chats assigned to the current user"""
        chats = self.get_queryset().filter(assigned_agent=request.user, status='active')
        serializer = self.get_serializer(chats, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unassigned(self, request):
        """Get unassigned chats"""
        chats = self.get_queryset().filter(assigned_agent__isnull=True, status='active')
        serializer = self.get_serializer(chats, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_to_me(self, request, pk=None):
        """Assign a chat to the current user"""
        chat = self.get_object()
        if chat.assigned_agent:
            return Response({'error': 'Chat is already assigned'}, status=400)
            
    @action(detail=True, methods=['post'])
    def create_appointment(self, request, pk=None):
        """Smart Action to trigger an appointment in CRM"""
        chat = self.get_object()
        from whatsapp.models import Workspace
        workspace = Workspace.objects.filter(is_active=True).first()
        if workspace and workspace.webhook_url:
            crm_url = workspace.webhook_url.replace('/api/whatsapp/webhook/', '/api/appointments/create/')
            payload = {
                "phone_number": chat.phone_number,
                "customer_info": chat.customer_info if hasattr(chat, 'customer_info') else {},
                "notes": request.data.get("notes", "")
            }
            # For this MVP, we simulate success response logic
            # response = requests.post(crm_url, json=payload, headers={"X-API-Key": workspace.api_key})
            
            # Tag the chat to mark it has an active appointment workflow
            if not isinstance(chat.tags, list):
                chat.tags = []
            if '#appointment' not in chat.tags:
                chat.tags.append('#appointment')
                chat.save()
            return Response({"status": "success", "message": "Appointment creation triggered in CRM."})
        return Response({"error": "CRM configuration not found"}, status=400)
        
        chat.assigned_agent = request.user
        chat.assigned_by = request.user
        chat.save()
        
        # Update agent's chat count
        availability, _ = AgentAvailability.objects.get_or_create(agent=request.user)
        availability.update_chat_count()
        
        serializer = self.get_serializer(chat)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        """Transfer a chat to another agent"""
        chat = self.get_object()
        serializer = ChatTransferSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        try:
            new_agent = User.objects.get(id=serializer.validated_data['new_agent_id'])
        except User.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=404)
        
        # Check if new agent is available
        availability, _ = AgentAvailability.objects.get_or_create(agent=new_agent)
        if not availability.is_available:
            return Response({'error': 'Agent is not available'}, status=400)
        
        # Transfer the chat
        chat.transfer_to_agent(new_agent, request.user)
        
        # Update chat counts for both agents
        old_availability, _ = AgentAvailability.objects.get_or_create(agent=chat.assigned_by)
        old_availability.update_chat_count()
        availability.update_chat_count()
        
        serializer = self.get_serializer(chat)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_resolved(self, request, pk=None):
        """Mark a chat as resolved"""
        chat = self.get_object()
        chat.mark_resolved()
        
        # Update agent's chat count
        if chat.assigned_agent:
            availability, _ = AgentAvailability.objects.get_or_create(agent=chat.assigned_agent)
            availability.update_chat_count()
        
        serializer = self.get_serializer(chat)
        return Response(serializer.data)

class AgentAvailabilityViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing agent availability.
    """
    queryset = AgentAvailability.objects.all()
    serializer_class = AgentAvailabilitySerializer
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['agent__username', 'agent__email']
    ordering_fields = ['status', 'current_chat_count', 'last_activity']
    filterset_fields = ['status']

    def get_queryset(self):
        """Filter queryset based on user permissions"""
        queryset = AgentAvailability.objects.all()
        
        # If user is not admin, only show their own availability
        if not self.request.user.is_staff:
            queryset = queryset.filter(agent=self.request.user)
        
        return queryset

    @action(detail=False, methods=['get'])
    def available_agents(self, request):
        """Get list of available agents for chat assignment"""
        agents = AgentAvailability.objects.filter(is_available=True)
        serializer = self.get_serializer(agents, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update agent status"""
        availability = self.get_object()
        serializer = UpdateAgentStatusSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        availability.status = serializer.validated_data['status']
        if 'max_concurrent_chats' in serializer.validated_data:
            availability.max_concurrent_chats = serializer.validated_data['max_concurrent_chats']
        
        availability.save()
        
        serializer = self.get_serializer(availability)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_activity(self, request, pk=None):
        """Update agent's last activity timestamp"""
        availability = self.get_object()
        availability.last_activity = timezone.now()
        availability.save()
        
        serializer = self.get_serializer(availability)
        return Response(serializer.data)

class ChatQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing chat queue.
    """
    queryset = ChatQueue.objects.all()
    serializer_class = ChatQueueSerializer
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['phone_number']
    ordering_fields = ['queued_at', 'priority']
    ordering = ['priority', 'queued_at']
    filterset_fields = ['status', 'priority']

    def get_queryset(self):
        """Only show waiting chats"""
        return ChatQueue.objects.filter(status='waiting')

    @action(detail=True, methods=['post'])
    def assign_to_agent(self, request, pk=None):
        """Assign a queued chat to an agent"""
        queue_item = self.get_object()
        agent_id = request.data.get('agent_id')
        
        if not agent_id:
            return Response({'error': 'agent_id is required'}, status=400)
        
        try:
            agent = User.objects.get(id=agent_id)
        except User.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=404)
        
        # Check if agent is available
        availability, _ = AgentAvailability.objects.get_or_create(agent=agent)
        if not availability.is_available:
            return Response({'error': 'Agent is not available'}, status=400)
        
        # Create chat assignment
        assignment = ChatAssignment.objects.create(
            phone_number=queue_item.phone_number,
            assigned_agent=agent,
            assigned_by=request.user,
            priority=queue_item.priority
        )
        
        # Update queue status
        queue_item.status = 'assigned'
        queue_item.assigned_at = timezone.now()
        queue_item.save()
        
        # Update agent's chat count
        availability.update_chat_count()
        
        serializer = ChatAssignmentSerializer(assignment)
        return Response(serializer.data)

@api_view(['GET'])
def team_inbox_stats(request):
    """
    Provides statistics for the team inbox.
    """
    now = timezone.now()
    today = now.date()
    start_of_week = today - timedelta(days=today.weekday())

    # Total chats
    total_chats_today = ChatAssignment.objects.filter(assigned_at__date=today).count()
    total_chats_this_week = ChatAssignment.objects.filter(assigned_at__date__gte=start_of_week).count()

    # Agent stats
    agents_by_status = AgentAvailability.objects.values('status').annotate(count=Count('id'))
    agents_by_status_dict = {item['status']: item['count'] for item in agents_by_status}

    online_agents = agents_by_status_dict.get('online', 0)
    busy_agents = agents_by_status_dict.get('busy', 0)

    # Top agents by chat count (all time)
    top_agents_query = ChatAssignment.objects.values('assigned_agent') \
        .annotate(chat_count=Count('id')) \
        .order_by('-chat_count')[:5]

    top_agents_data = []
    for agent_data in top_agents_query:
        agent = User.objects.get(id=agent_data['assigned_agent'])
        top_agents_data.append({
            'agent_id': agent.id,
            'agent_name': agent.username,
            'chat_count': agent_data['chat_count']
        })

    # Other stats
    active_chats = ChatAssignment.objects.filter(status='active').count()
    unassigned_chats = ChatQueue.objects.filter(status='waiting').count()
    chats_by_priority = ChatAssignment.objects.values('priority').annotate(count=Count('id'))
    chats_by_priority_dict = {item['priority']: item['count'] for item in chats_by_priority}

    stats = {
        'total_active_chats': active_chats,
        'total_unassigned_chats': unassigned_chats,
        'total_agents_online': online_agents,
        'total_agents_busy': busy_agents,
        'chats_by_priority': chats_by_priority_dict,
        'agents_by_status': agents_by_status_dict,
        'total_chats_today': total_chats_today,
        'total_chats_this_week': total_chats_this_week,
        'top_agents': top_agents_data,
    }

    serializer = TeamInboxStatsSerializer(data=stats)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.validated_data)

@api_view(['GET'])
def chat_list(request):
    """
    Get real-time chat list for the team inbox.
    """
    # Get all active chats with their latest information
    active_chats = ChatAssignment.objects.filter(status='active').select_related('assigned_agent')
    
    chat_list_data = []
    for chat in active_chats:
        # Get contact name and id
        try:
            contact = Contact.objects.get(phone_number=chat.phone_number)
            contact_id = contact.id
            contact_name = contact.name
        except Contact.DoesNotExist:
            contact_id = None
            contact_name = "Unknown"
        
        # Get last message preview
        last_message = chat.last_message
        last_message_preview = ""
        if last_message:
            content = last_message.message_content or ""
            last_message_preview = content[:100] + "..." if len(content) > 100 else content
        
        # Calculate wait time for unassigned chats
        wait_time_minutes = 0
        if not chat.assigned_agent:
            queue_item = ChatQueue.objects.filter(
                phone_number=chat.phone_number,
                status='waiting'
            ).first()
            if queue_item:
                wait_time_minutes = int(queue_item.wait_time.total_seconds() / 60)
        
        chat_data = {
            'contact_id': contact_id,
            'phone_number': chat.phone_number,
            'contact_name': contact_name,
            'assigned_agent': chat.assigned_agent.username if chat.assigned_agent else None,
            'status': chat.status,
            'priority': chat.priority,
            'unread_count': chat.unread_count,
            'last_message_preview': last_message_preview,
            'last_activity_at': chat.last_activity_at,
            'wait_time_minutes': wait_time_minutes,
        }
        chat_list_data.append(chat_data)
    
    # Sort by priority and last activity
    chat_list_data.sort(key=lambda x: (
        {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}[x['priority']],
        x['last_activity_at']
    ), reverse=True)
    
    serializer = ChatListSerializer(chat_list_data, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def auto_assign_chat(request):
    """
    Automatically assign an unassigned chat to an available agent.
    """
    # Find unassigned active chats
    unassigned_chats = ChatAssignment.objects.filter(
        assigned_agent__isnull=True,
        status='active'
    ).order_by('priority', 'assigned_at')
    
    if not unassigned_chats.exists():
        return Response({'message': 'No unassigned chats available'})
    
    # Find available agents
    available_agents = AgentAvailability.objects.filter(is_available=True).order_by('current_chat_count')
    
    if not available_agents.exists():
        return Response({'error': 'No available agents'}, status=400)
    
    # Assign chats to agents using round-robin
    assignments_made = []
    for chat in unassigned_chats:
        # Find the agent with the least number of chats
        best_agent = min(available_agents, key=lambda a: a.current_chat_count)
        
        if best_agent.capacity_remaining > 0:
            # Assign the chat
            chat.assigned_agent = best_agent.agent
            chat.assigned_by = request.user
            chat.save()
            
            # Update agent's chat count
            best_agent.update_chat_count()
            
            assignments_made.append({
                'chat_id': chat.id,
                'phone_number': chat.phone_number,
                'assigned_to': best_agent.agent.username
            })
    
    return Response({
        'message': f'Assigned {len(assignments_made)} chats',
        'assignments': assignments_made
    })

@api_view(['POST'])
def bulk_assign_chats(request):
    """
    Bulk assign multiple chats to agents.
    """
    chat_ids = request.data.get('chat_ids', [])
    agent_id = request.data.get('agent_id')
    
    if not chat_ids:
        return Response({'error': 'chat_ids is required'}, status=400)
    
    if not agent_id:
        return Response({'error': 'agent_id is required'}, status=400)
    
    try:
        agent = User.objects.get(id=agent_id)
    except User.DoesNotExist:
        return Response({'error': 'Agent not found'}, status=404)
    
    # Check if agent is available
    availability, _ = AgentAvailability.objects.get_or_create(agent=agent)
    if not availability.is_available:
        return Response({'error': 'Agent is not available'}, status=400)
    
    # Assign chats
    chats = ChatAssignment.objects.filter(id__in=chat_ids, assigned_agent__isnull=True)
    assigned_count = 0
    
    for chat in chats:
        if availability.capacity_remaining > 0:
            chat.assigned_agent = agent
            chat.assigned_by = request.user
            chat.save()
            assigned_count += 1
    
    # Update agent's chat count
    availability.update_chat_count()
    
    return Response({
        'message': f'Assigned {assigned_count} chats to {agent.username}',
        'assigned_count': assigned_count
    })
