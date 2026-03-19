"""
Membership Services for K3 Car Care System

This module contains business logic for:
- Coupon generation from membership benefits
- Benefit usage tracking
- Membership activation and management
"""

from django.utils import timezone
from django.db import transaction, models
from datetime import timedelta
import re
from decimal import Decimal

from .models import (
    MembershipPlan,
    MembershipBenefit,
    CustomerMembership,
    MembershipBenefitUsage,
    Coupon
)


class MembershipCouponService:
    """Service class for handling membership coupon generation and management."""
    
    @staticmethod
    def generate_coupons_for_membership(customer_membership):
        """
        Generate all coupons and benefit usage records when membership is activated.
        
        Args:
            customer_membership: CustomerMembership instance
            
        Returns:
            dict: Summary of generated coupons and benefits
        """
        if customer_membership.status != 'active':
            return {
                'success': False,
                'error': 'Membership must be active to generate coupons'
            }
        
        # Check if coupons already generated
        if customer_membership.benefit_usages.exists():
            return {
                'success': False,
                'error': 'Coupons already generated for this membership'
            }
        
        summary = {
            'success': True,
            'benefits_processed': 0,
            'coupons_generated': 0,
            'benefit_usages_created': 0,
            'details': []
        }
        
        with transaction.atomic():
            # Get all active benefits for this membership plan
            benefits = customer_membership.plan.benefits.filter(is_active=True)
            
            for benefit in benefits:
                # Create benefit usage record
                benefit_usage = MembershipBenefitUsage.objects.create(
                    customer_membership=customer_membership,
                    benefit=benefit,
                    total_coupons_allocated=benefit.coupon_count,
                    is_one_time=benefit.is_one_time
                )
                summary['benefit_usages_created'] += 1
                
                # Generate coupons if coupon_count > 0
                if benefit.coupon_count > 0:
                    coupons_created = MembershipCouponService._generate_coupons_for_benefit(
                        benefit=benefit,
                        customer_membership=customer_membership,
                        benefit_usage=benefit_usage,
                        count=benefit.coupon_count
                    )
                    summary['coupons_generated'] += coupons_created
                    
                    summary['details'].append({
                        'benefit': benefit.title,
                        'coupons_generated': coupons_created,
                        'type': benefit.get_benefit_type_display()
                    })
                else:
                    # For benefits without coupons (like washing plans with direct counters)
                    summary['details'].append({
                        'benefit': benefit.title,
                        'coupons_generated': 0,
                        'type': 'Direct Counter (No Coupons)',
                        'note': 'Uses membership wash counter'
                    })
                
                summary['benefits_processed'] += 1
        
        return summary
    
    @staticmethod
    def _generate_coupons_for_benefit(benefit, customer_membership, benefit_usage, count):
        """
        Generate individual coupons for a specific benefit.
        
        Args:
            benefit: MembershipBenefit instance
            customer_membership: CustomerMembership instance
            benefit_usage: MembershipBenefitUsage instance
            count: Number of coupons to generate
            
        Returns:
            int: Number of coupons created
        """
        coupons_created = 0
        
        # Determine coupon type and discount
        if benefit.discount_percentage > 0:
            coupon_type = 'percentage'
            discount_percentage = benefit.discount_percentage
            discount_amount = Decimal('0')
        elif benefit.discount_fixed_amount > 0:
            coupon_type = 'fixed'
            discount_percentage = Decimal('0')
            discount_amount = benefit.discount_fixed_amount
        elif benefit.benefit_type == 'free_service':
            coupon_type = 'free_service'
            discount_percentage = Decimal('100')  # 100% off
            discount_amount = Decimal('0')
        else:
            # Default to percentage if no discount specified
            coupon_type = 'percentage'
            discount_percentage = Decimal('10')
            discount_amount = Decimal('0')
        
        # Generate coupons
        for i in range(count):
            # Generate unique code
            code = Coupon.generate_code(prefix='K3MB')
            
            # Create description
            if benefit.is_one_time:
                description = f"One-time benefit: {benefit.title}"
            else:
                description = f"Membership benefit ({i+1}/{count}): {benefit.title}"
            
            coupon = Coupon.objects.create(
                code=code,
                coupon_type=coupon_type,
                discount_percentage=discount_percentage,
                discount_amount=discount_amount,
                valid_from=customer_membership.start_date,
                valid_until=timezone.make_aware(
                    timezone.datetime.combine(
                        customer_membership.end_date,
                        timezone.datetime.max.time()
                    )
                ),
                usage_limit=1,  # Each coupon can be used once
                is_single_user=True,
                customer=customer_membership.customer,
                source_membership=customer_membership,
                source_benefit=benefit,
                benefit_usage=benefit_usage,
                is_membership_coupon=True,
                branch=customer_membership.branch,
                is_global=False,
                description=description,
                terms_conditions=f"Valid for {benefit.service_package.name if benefit.service_package else 'applicable services'} only. Cannot be combined with other offers.",
                applicable_categories=benefit.applicable_categories  # Copy categories from benefit
            )
            
            # Link to specific service if applicable
            if benefit.service_package:
                coupon.applicable_services.add(benefit.service_package)
            
            # Set free service if applicable
            if coupon_type == 'free_service' and benefit.service_package:
                coupon.free_service = benefit.service_package
                coupon.save()
            
            coupons_created += 1
        
        return coupons_created
    
    @staticmethod
    def get_available_benefits_for_customer(customer, service_package=None):
        """
        Get all available benefits for a customer, optionally filtered by service.
        
        Args:
            customer: User instance
            service_package: Optional ServicePackage to filter benefits
            
        Returns:
            list: Available benefit usages with coupon details
        """
        # Get active memberships
        active_memberships = CustomerMembership.objects.filter(
            customer=customer,
            status='active',
            start_date__lte=timezone.now().date(),
            end_date__gte=timezone.now().date()
        ).select_related('plan').prefetch_related('benefit_usages__benefit')
        
        available_benefits = []
        
        for membership in active_memberships:
            for benefit_usage in membership.benefit_usages.filter(benefit__is_active=True):
                # Skip if not available
                if not benefit_usage.is_available:
                    continue
                
                # Filter by service if specified
                if service_package and benefit_usage.benefit.service_package:
                    if benefit_usage.benefit.service_package.id != service_package.id:
                        continue
                
                # Get available coupons for this benefit
                available_coupons = Coupon.objects.filter(
                    benefit_usage=benefit_usage,
                    status='active',
                    valid_from__lte=timezone.now(),
                    valid_until__gte=timezone.now(),
                    times_used__lt=models.F('usage_limit')
                ).order_by('valid_until')
                
                available_benefits.append({
                    'membership': membership,
                    'benefit': benefit_usage.benefit,
                    'benefit_usage': benefit_usage,
                    'coupons_remaining': benefit_usage.coupons_remaining,
                    'available_coupons': list(available_coupons),
                    'discount_type': 'percentage' if benefit_usage.benefit.discount_percentage > 0 else 'fixed',
                    'discount_value': benefit_usage.benefit.discount_percentage or benefit_usage.benefit.discount_fixed_amount
                })
        
        # Sort by discount value (highest first)
        available_benefits.sort(
            key=lambda x: float(x['discount_value']),
            reverse=True
        )
        
        return available_benefits
    
    @staticmethod
    def apply_best_benefit_to_booking(customer, service_package, booking_amount):
        """
        Find and return the best applicable benefit for a booking.
        
        Args:
            customer: User instance
            service_package: ServicePackage instance
            booking_amount: Decimal amount of the booking
            
        Returns:
            dict: Best benefit details or None
        """
        available_benefits = MembershipCouponService.get_available_benefits_for_customer(
            customer=customer,
            service_package=service_package
        )
        
        if not available_benefits:
            return None
        
        best_benefit = None
        max_discount = Decimal('0')
        
        for benefit_info in available_benefits:
            benefit = benefit_info['benefit']
            
            # Calculate potential discount
            if benefit.discount_percentage > 0:
                discount = (booking_amount * benefit.discount_percentage) / Decimal('100')
            elif benefit.discount_fixed_amount > 0:
                discount = min(benefit.discount_fixed_amount, booking_amount)
            else:
                discount = Decimal('0')
            
            if discount > max_discount:
                max_discount = discount
                best_benefit = benefit_info
        
        if best_benefit:
            best_benefit['calculated_discount'] = max_discount
        
        return best_benefit
    
    @staticmethod
    def use_benefit_coupon(benefit_usage, coupon=None):
        """
        Mark a benefit coupon as used.
        
        Args:
            benefit_usage: MembershipBenefitUsage instance
            coupon: Optional specific Coupon to use
            
        Returns:
            dict: Result of the operation
        """
        if not benefit_usage.is_available:
            return {
                'success': False,
                'error': 'Benefit is no longer available'
            }
        
        with transaction.atomic():
            # Mark benefit usage
            success = benefit_usage.use_coupon()
            
            if not success:
                return {
                    'success': False,
                    'error': 'Failed to use benefit coupon'
                }
            
            # Mark specific coupon as used if provided
            if coupon:
                coupon.use()
            
            return {
                'success': True,
                'benefit_usage': benefit_usage,
                'coupons_remaining': benefit_usage.coupons_remaining
            }
