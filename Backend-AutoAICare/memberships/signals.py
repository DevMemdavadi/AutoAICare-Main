"""
Signals for Membership module.

Handles automatic coupon generation, membership expiry, and benefit tracking.
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import CustomerMembership, MembershipBenefitUsage, Coupon
from .services import MembershipCouponService


@receiver(post_save, sender=CustomerMembership)
def generate_membership_coupons(sender, instance, created, **kwargs):
    """
    Auto-generate coupons and benefit usage records when membership is activated.
    
    Triggered when:
    - Membership status changes to 'active'
    - Coupons haven't been generated yet
    """
    # Only generate if status is active and coupons haven't been generated
    if instance.status == 'active':
        # Check if benefit usages already exist
        if not instance.benefit_usages.exists():
            # Generate coupons
            result = MembershipCouponService.generate_coupons_for_membership(instance)
            
            # if result['success']:
            #     print(f"✅ Generated {result['coupons_generated']} coupons for membership {instance.membership_id}")
            #     print(f"   Benefits processed: {result['benefits_processed']}")
            # else:
            #     print(f"❌ Failed to generate coupons: {result.get('error')}")


@receiver(pre_save, sender=CustomerMembership)
def check_membership_expiry(sender, instance, **kwargs):
    """
    Automatically update membership status to 'expired' if end date has passed.
    """
    if instance.pk:  # Only for existing memberships
        today = timezone.now().date()
        
        # Check if membership has expired
        if instance.end_date < today and instance.status == 'active':
            instance.status = 'expired'
            print(f"⏰ Membership {instance.membership_id} automatically expired")


@receiver(post_save, sender=CustomerMembership)
def expire_membership_coupons(sender, instance, **kwargs):
    """
    Mark all unused coupons as expired when membership expires.
    """
    if instance.status == 'expired':
        # Get all active coupons for this membership
        active_coupons = Coupon.objects.filter(
            source_membership=instance,
            status='active'
        )
        
        # Mark them as expired
        expired_count = active_coupons.update(status='expired')
        
        if expired_count > 0:
            print(f"🔒 Expired {expired_count} unused coupons for membership {instance.membership_id}")
