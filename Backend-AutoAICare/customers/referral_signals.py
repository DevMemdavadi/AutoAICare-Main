from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from jobcards.models import JobCard
from .referral_models import ReferralCode, Referral
from .models import Customer
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=JobCard)
def handle_jobcard_completion(sender, instance, created, **kwargs):
    """
    Handle job card completion to:
    1. Generate referral code for customer after first completed job
    2. Mark referral as completed if this is referee's first job
    3. Process rewards automatically
    """
    # Only process if job is completed
    if instance.status != 'closed':
        return
    
    try:
        customer = instance.booking.customer
        
        # 1. Generate referral code if customer doesn't have one
        if not hasattr(customer, 'referral_code_obj'):
            # Check if this is their first completed job
            completed_jobs = JobCard.objects.filter(
                booking__customer=customer,
                status='closed'
            ).count()
            
            if completed_jobs == 1:  # First completed job
                try:
                    referral_code, created = ReferralCode.create_for_customer(customer)
                    if created:
                        logger.info(f"✅ Referral code generated for {customer.user.name}: {referral_code.code}")
                        print(f"✅ Referral code generated for {customer.user.name}: {referral_code.code}")
                except Exception as e:
                    logger.error(f"❌ Failed to generate referral code for {customer.user.name}: {str(e)}")
                    print(f"❌ Failed to generate referral code for {customer.user.name}: {str(e)}")
        
        # 2. Check if this customer was referred and this is their first job
        try:
            # Find if this customer is a referee in any pending referral
            referral = Referral.objects.filter(
                referee=customer,
                status='pending'
            ).first()
            
            if referral:
                # Check if this is their first completed job
                completed_jobs = JobCard.objects.filter(
                    booking__customer=customer,
                    status='closed'
                ).count()
                
                if completed_jobs == 1:  # First completed job
                    logger.info(f"🎯 Processing referral for {customer.user.name} (first job completed)")
                    
                    # Use atomic transaction to ensure all-or-nothing processing
                    with transaction.atomic():
                        # Mark referral as completed
                        if referral.mark_completed():
                            logger.info(f"✅ Referral marked as completed: {referral}")
                            print(f"✅ Referral marked as completed: {referral}")
                        
                        # Automatically process rewards
                        success, message = referral.process_rewards()
                        if success:
                            logger.info(f"✅ Rewards processed: {message}")
                            print(f"✅ Rewards processed: {message}")
                            print(f"   Referrer ({referral.referrer.user.name}): ₹{referral.referrer_points_awarded}")
                            print(f"   Referee ({referral.referee.user.name}): ₹{referral.referee_points_awarded}")
                        else:
                            logger.warning(f"⚠️ Reward processing failed: {message}")
                            print(f"⚠️ Reward processing failed: {message}")
                            # Don't raise exception - log and continue
        
        except Exception as e:
            logger.error(f"❌ Error processing referral for {customer.user.name}: {str(e)}", exc_info=True)
            print(f"❌ Error processing referral for {customer.user.name}: {str(e)}")
    
    except Exception as e:
        logger.error(f"❌ Error in referral signal for job card {instance.id}: {str(e)}", exc_info=True)
        print(f"❌ Error in referral signal for job card {instance.id}: {str(e)}")
