from celery import shared_task
from django.utils import timezone
from .models import ScheduledMessage, BroadcastCampaign, DripCampaign, DripRecipient, DripMessageLog
from .services import WhatsAppService
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_scheduled_messages():
    """
    Celery task to send scheduled WhatsApp messages.
    """
    now = timezone.now()
    # Get all pending messages that are due to be sent
    messages_to_send = ScheduledMessage.objects.filter(
        scheduled_at__lte=now,
        status='pending'
    )

    if not messages_to_send.exists():
        logger.info("No scheduled messages to send.")
        return "No scheduled messages to send."

    logger.info(f"Found {messages_to_send.count()} scheduled messages to send.")
    
    service = WhatsAppService()

    for message in messages_to_send:
        try:
            media_path = message.media_file.path if message.media_file else None
            
            service.send_message(
                to_phone=message.recipient_number,
                message_type=message.message_type,
                content=message.message_content,
                template_name=message.template_name,
                template_params=message.template_params,
                media_path=media_path,
            )
            message.status = 'sent'
            logger.info(f"Successfully sent scheduled message {message.id} to {message.recipient_number}")
        
        except Exception as e:
            message.status = 'failed'
            logger.error(f"Failed to send scheduled message {message.id} to {message.recipient_number}. Error: {e}")
        
        finally:
            message.save()

    return f"Processed {messages_to_send.count()} scheduled messages."

@shared_task
def send_broadcast_campaign(campaign_id, retry_failed_only=False):
    """
    Celery task to send a broadcast campaign to all recipients.
    """
    try:
        campaign = BroadcastCampaign.objects.get(id=campaign_id)
        
        if retry_failed_only:
            recipients = campaign.recipients.filter(status='failed')
        else:
            recipients = campaign.recipients.filter(status='pending')
        
        if not recipients.exists():
            logger.info(f"No recipients to send for campaign {campaign_id}")
            return "No recipients to send"
        
        logger.info(f"Sending broadcast campaign {campaign.name} to {recipients.count()} recipients")
        
        service = WhatsAppService()
        sent_count = 0
        failed_count = 0
        
        for recipient in recipients:
            try:
                result = service.send_message(
                    to_phone=recipient.contact.phone_number,
                    message_type=campaign.message_type,
                    content=campaign.message_content,
                    template_name=campaign.template_name,
                )
                
                # Extract message ID from result
                message_id = None
                if result.get('messages') and result['messages']:
                    message_id = result['messages'][0].get('id')
                
                recipient.status = 'sent'
                recipient.message_id = message_id
                recipient.sent_at = timezone.now()
                recipient.save()
                sent_count += 1
                
                logger.info(f"Sent broadcast message to {recipient.contact.phone_number}")
                
            except Exception as e:
                recipient.status = 'failed'
                recipient.error = str(e)
                recipient.save()
                failed_count += 1
                
                logger.error(f"Failed to send broadcast message to {recipient.contact.phone_number}: {e}")
        
        # Update campaign status
        if not retry_failed_only:
            if failed_count == 0:
                campaign.status = 'completed'
            elif sent_count > 0:
                campaign.status = 'partial'
            else:
                campaign.status = 'failed'
            campaign.save()
        
        logger.info(f"Broadcast campaign {campaign.name} completed: {sent_count} sent, {failed_count} failed")
        return f"Sent: {sent_count}, Failed: {failed_count}"
        
    except BroadcastCampaign.DoesNotExist:
        logger.error(f"Broadcast campaign {campaign_id} not found")
        return "Campaign not found"
    except Exception as e:
        logger.error(f"Error in broadcast campaign {campaign_id}: {e}")
        return f"Error: {e}"

@shared_task
def send_scheduled_broadcast_campaigns():
    """
    Celery task to send scheduled broadcast campaigns.
    """
    now = timezone.now()
    scheduled_campaigns = BroadcastCampaign.objects.filter(
        scheduled_at__lte=now,
        status='scheduled'
    )
    
    for campaign in scheduled_campaigns:
        campaign.status = 'pending'
        campaign.save()
        send_broadcast_campaign.delay(campaign.id)
    
    return f"Started {scheduled_campaigns.count()} scheduled campaigns"

# Drip Campaign Tasks

@shared_task
def start_drip_campaign(campaign_id):
    """
    Start a drip campaign by initializing recipients and scheduling the first messages.
    """
    try:
        campaign = DripCampaign.objects.get(id=campaign_id, status='active')
        logger.info(f"Starting drip campaign: {campaign.name}")
        
        # Get all active recipients
        recipients = campaign.recipients.filter(status='pending')
        
        if not recipients.exists():
            logger.info(f"No pending recipients for campaign {campaign_id}")
            return "No pending recipients"
        
        # Get the first message in the sequence
        first_message = campaign.messages.filter(is_active=True).order_by('sequence_number').first()
        
        if not first_message:
            logger.error(f"No active messages found for campaign {campaign_id}")
            campaign.status = 'failed'
            campaign.save()
            return "No active messages found"
        
        # Schedule first message for all recipients
        scheduled_count = 0
        for recipient in recipients:
            try:
                # Calculate when to send the first message
                send_time = timezone.now()
                if campaign.start_date and campaign.start_date > send_time:
                    send_time = campaign.start_date
                
                # Create message log entry
                message_log = DripMessageLog.objects.create(
                    recipient=recipient,
                    message=first_message,
                    sequence_number=first_message.sequence_number,
                    message_type=first_message.message_type,
                    content=first_message.content,
                    template_name=first_message.template_name,
                    template_params=first_message.template_params,
                    scheduled_at=send_time
                )
                
                # Update recipient status
                recipient.status = 'active'
                recipient.current_message_index = 0
                recipient.next_message_at = send_time
                recipient.save()
                
                scheduled_count += 1
                
            except Exception as e:
                logger.error(f"Failed to schedule first message for recipient {recipient.id}: {e}")
                recipient.status = 'failed'
                recipient.save()
        
        # Update campaign statistics
        campaign.active_recipients = scheduled_count
        campaign.save()
        
        logger.info(f"Started drip campaign {campaign.name}: {scheduled_count} recipients scheduled")
        return f"Scheduled {scheduled_count} recipients"
        
    except DripCampaign.DoesNotExist:
        logger.error(f"Drip campaign {campaign_id} not found")
        return "Campaign not found"
    except Exception as e:
        logger.error(f"Error starting drip campaign {campaign_id}: {e}")
        return f"Error: {e}"

@shared_task
def process_drip_campaign_messages():
    """
    Process and send drip campaign messages that are due to be sent.
    """
    now = timezone.now()
    
    # Get all message logs that are due to be sent
    pending_logs = DripMessageLog.objects.filter(
        status='pending',
        scheduled_at__lte=now
    ).select_related('recipient', 'recipient__contact', 'recipient__campaign', 'message')
    
    if not pending_logs.exists():
        return "No drip messages to send"
    
    logger.info(f"Processing {pending_logs.count()} drip campaign messages")
    
    service = WhatsAppService()
    sent_count = 0
    failed_count = 0
    
    for log in pending_logs:
        try:
            # Check if recipient is still active
            if log.recipient.status not in ['active', 'paused']:
                log.status = 'failed'
                log.error = f"Recipient status is {log.recipient.status}"
                log.save()
                failed_count += 1
                continue
            
            # Check if campaign is still active
            if log.recipient.campaign.status != 'active':
                log.status = 'failed'
                log.error = f"Campaign status is {log.recipient.campaign.status}"
                log.save()
                failed_count += 1
                continue
            
            # Send the message
            media_path = log.message.media_file.path if log.message.media_file else None
            
            result = service.send_message(
                to_phone=log.recipient.contact.phone_number,
                message_type=log.message_type,
                content=log.content,
                template_name=log.template_name,
                template_params=log.template_params,
                media_path=media_path,
            )
            
            # Extract message ID from result
            message_id = None
            if result.get('messages') and result['messages']:
                message_id = result['messages'][0].get('id')
            
            # Update message log
            log.status = 'sent'
            log.whatsapp_message_id = message_id
            log.sent_at = timezone.now()
            log.save()
            
            # Update recipient statistics
            recipient = log.recipient
            recipient.messages_sent += 1
            recipient.last_message_sent_at = log.sent_at
            recipient.current_message_index += 1
            recipient.save()
            
            sent_count += 1
            logger.info(f"Sent drip message {log.sequence_number} to {recipient.contact.phone_number}")
            
            # Schedule next message if available
            schedule_next_drip_message.delay(recipient.id)
            
        except Exception as e:
            log.status = 'failed'
            log.error = str(e)
            log.save()
            
            # Update recipient statistics
            recipient = log.recipient
            recipient.messages_failed += 1
            recipient.save()
            
            failed_count += 1
            logger.error(f"Failed to send drip message {log.sequence_number} to {log.recipient.contact.phone_number}: {e}")
    
    logger.info(f"Drip campaign processing completed: {sent_count} sent, {failed_count} failed")
    return f"Sent: {sent_count}, Failed: {failed_count}"

@shared_task
def schedule_next_drip_message(recipient_id):
    """
    Schedule the next message in a drip campaign sequence for a specific recipient.
    """
    try:
        recipient = DripRecipient.objects.get(id=recipient_id)
        
        # Check if recipient is still active
        if recipient.status not in ['active', 'paused']:
            return f"Recipient {recipient_id} is not active (status: {recipient.status})"
        
        # Check if campaign is still active
        if recipient.campaign.status != 'active':
            return f"Campaign {recipient.campaign.id} is not active (status: {recipient.campaign.status})"
        
        # Get the next message in sequence
        next_message = recipient.campaign.messages.filter(
            is_active=True,
            sequence_number__gt=recipient.current_message_index
        ).order_by('sequence_number').first()
        
        if not next_message:
            # No more messages, mark recipient as completed
            recipient.status = 'completed'
            recipient.save()
            
            # Update campaign statistics
            campaign = recipient.campaign
            campaign.completed_recipients += 1
            campaign.active_recipients -= 1
            campaign.save()
            
            logger.info(f"Recipient {recipient.contact.phone_number} completed drip campaign {campaign.name}")
            return "Recipient completed"
        
        # Calculate when to send the next message
        delay_minutes = next_message.total_delay_minutes
        next_send_time = timezone.now() + timezone.timedelta(minutes=delay_minutes)
        
        # Create message log entry
        message_log = DripMessageLog.objects.create(
            recipient=recipient,
            message=next_message,
            sequence_number=next_message.sequence_number,
            message_type=next_message.message_type,
            content=next_message.content,
            template_name=next_message.template_name,
            template_params=next_message.template_params,
            scheduled_at=next_send_time
        )
        
        # Update recipient
        recipient.next_message_at = next_send_time
        recipient.save()
        
        logger.info(f"Scheduled next message {next_message.sequence_number} for {recipient.contact.phone_number} at {next_send_time}")
        return f"Scheduled message {next_message.sequence_number}"
        
    except DripRecipient.DoesNotExist:
        logger.error(f"Drip recipient {recipient_id} not found")
        return "Recipient not found"
    except Exception as e:
        logger.error(f"Error scheduling next message for recipient {recipient_id}: {e}")
        return f"Error: {e}"

@shared_task
def resume_drip_campaign(campaign_id):
    """
    Resume a paused drip campaign.
    """
    try:
        campaign = DripCampaign.objects.get(id=campaign_id, status='active')
        logger.info(f"Resuming drip campaign: {campaign.name}")
        
        # Get all paused recipients
        paused_recipients = campaign.recipients.filter(status='paused')
        
        if not paused_recipients.exists():
            logger.info(f"No paused recipients for campaign {campaign_id}")
            return "No paused recipients"
        
        resumed_count = 0
        for recipient in paused_recipients:
            try:
                # Check if there's a pending message log
                pending_log = recipient.message_logs.filter(status='pending').first()
                
                if pending_log:
                    # Resume the pending message
                    recipient.status = 'active'
                    recipient.save()
                    resumed_count += 1
                else:
                    # Schedule the next message
                    schedule_next_drip_message.delay(recipient.id)
                    resumed_count += 1
                
            except Exception as e:
                logger.error(f"Failed to resume recipient {recipient.id}: {e}")
        
        logger.info(f"Resumed drip campaign {campaign.name}: {resumed_count} recipients resumed")
        return f"Resumed {resumed_count} recipients"
        
    except DripCampaign.DoesNotExist:
        logger.error(f"Drip campaign {campaign_id} not found")
        return "Campaign not found"
    except Exception as e:
        logger.error(f"Error resuming drip campaign {campaign_id}: {e}")
        return f"Error: {e}"

@shared_task
def cleanup_completed_drip_campaigns():
    """
    Clean up completed drip campaigns and update statistics.
    """
    try:
        # Find campaigns that should be marked as completed
        active_campaigns = DripCampaign.objects.filter(status='active')
        completed_count = 0
        
        for campaign in active_campaigns:
            # Check if all recipients are completed, failed, or unsubscribed
            active_recipients = campaign.recipients.filter(status__in=['active', 'paused'])
            
            if not active_recipients.exists():
                campaign.status = 'completed'
                campaign.completed_at = timezone.now()
                campaign.save()
                completed_count += 1
                logger.info(f"Marked drip campaign {campaign.name} as completed")
        
        return f"Completed {completed_count} campaigns"
        
    except Exception as e:
        logger.error(f"Error cleaning up drip campaigns: {e}")
        return f"Error: {e}" 