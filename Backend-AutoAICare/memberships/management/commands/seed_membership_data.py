"""
Seed data for Membership Plans based on K3 Car Care Membership Card.

Card Rate: ₹1500/- + GST = ₹1770/- Only

Membership Benefits:
✅ Normal Car Wash — 30% OFF (5 Coupons)
✅ Body Polish — ₹400/- FREE (3 Coupons)
✅ Interior Clean — 20% OFF (2 Coupons)
✅ Exterior Detailing — 20% OFF (2 Coupons)
✅ Car Makeover Service — 25% OFF (2 Coupons)
✅ AC Vent Clean — ₹100/- OFF (2 Coupons)
✅ Ceramic Coating — 10% OFF (1 Coupon)
✅ Mechanical Service — 25% OFF (2 Coupons)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from memberships.models import MembershipPlan, MembershipBenefit, CustomerMembership
from services.models import ServicePackage
from branches.models import Branch
from users.models import User
from customers.models import Vehicle


class Command(BaseCommand):
    help = 'Seeds membership plans with K3 Car Care membership card benefits'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing membership data before seeding',
        )
        parser.add_argument(
            '--create-sample-memberships',
            action='store_true',
            help='Create sample customer memberships for testing',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting membership data seeding...'))

        if options['clear']:
            self.stdout.write('Clearing existing membership data...')
            self.clear_membership_data()

        # Create the K3 Car Care membership plan
        self.stdout.write('Creating K3 Car Care Membership Plan...')
        plan = self.create_k3_membership_plan()

        # Create benefits for the plan
        self.stdout.write('Creating membership benefits...')
        benefits = self.create_membership_benefits(plan)

        # Optionally create sample customer memberships
        if options['create_sample_memberships']:
            self.stdout.write('Creating sample customer memberships...')
            self.create_sample_memberships(plan)

        self.stdout.write(self.style.SUCCESS('Membership data seeding completed successfully!'))
        self.stdout.write(f'Created:')
        self.stdout.write(f'  - 1 Membership Plan: {plan.name}')
        self.stdout.write(f'  - {len(benefits)} Membership Benefits')

    def clear_membership_data(self):
        """Clear existing membership data"""
        from memberships.models import (
            MembershipBenefitUsage, 
            CustomerMembership, 
            MembershipBenefit, 
            MembershipPlan,
            Coupon,
            CouponUsage
        )
        
        CouponUsage.objects.all().delete()
        Coupon.objects.filter(is_membership_coupon=True).delete()
        MembershipBenefitUsage.objects.all().delete()
        CustomerMembership.objects.all().delete()
        MembershipBenefit.objects.all().delete()
        MembershipPlan.objects.all().delete()
        self.stdout.write(self.style.WARNING('  Cleared all existing membership data'))

    def create_k3_membership_plan(self):
        """Create the K3 Car Care membership plan"""
        
        # Base price is ₹1500 (same for all vehicle types for this card)
        base_price = Decimal('1500.00')
        
        plan = MembershipPlan.objects.create(
            name='K3 Car Care Membership Card',
            tier='gold',
            description='Annual membership card with exclusive discounts and free services. '
                       'Includes 19 coupons for various services with discounts ranging from 10% to 30% '
                       'and special free services worth ₹400.',
            
            # Pricing - same for all vehicle types
            hatchback_price=base_price,
            sedan_price=base_price,
            suv_price=base_price,
            
            # GST
            gst_applicable=True,
            gst_rate=Decimal('18.00'),  # 18% GST = ₹270, Total = ₹1770
            
            # Duration - 12 months
            duration_value=12,
            duration_unit='months',
            
            # General benefits
            discount_percentage=Decimal('0'),  # Individual benefits have their own discounts
            free_washes_count=0,  # Using coupon-based system instead
            free_interior_cleaning_count=0,  # Using coupon-based system instead
            
            # No monthly coupon generation (all coupons generated upfront)
            coupons_per_month=0,
            coupon_discount_percentage=Decimal('0'),
            
            # Priority
            priority_booking=True,
            
            # Status
            is_active=True,
            is_popular=True,
            display_order=1,
            
            # Global plan
            is_global=True,
            branch=None
        )
        
        return plan

    def create_membership_benefits(self, plan):
        """Create all benefits for the K3 membership plan"""
        
        benefits = []
        
        # Get service packages (if they exist)
        try:
            normal_wash = ServicePackage.objects.filter(name__icontains='Normal Car Wash').first()
            interior_clean = ServicePackage.objects.filter(name__icontains='Interior Cleaning').first()
            exterior_detail = ServicePackage.objects.filter(name__icontains='Exterior').first()
            makeover = ServicePackage.objects.filter(name__icontains='Makeover').first()
            ceramic_coating = ServicePackage.objects.filter(name__icontains='Ceramic Coating').first()
        except:
            normal_wash = interior_clean = exterior_detail = makeover = ceramic_coating = None
        
        # 1. Normal Car Wash — 30% OFF (5 Coupons)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='Normal Car Wash — 30% OFF',
            description='Get 30% discount on normal car wash service. 5 coupons included.',
            service_package=normal_wash,
            service_count=0,
            discount_percentage=Decimal('30.00'),
            discount_fixed_amount=Decimal('0'),
            coupon_count=5,
            is_one_time=False,
            is_active=True,
            applicable_categories=['wash']  # Category-based filtering
        ))
        
        # 2. Body Polish — ₹400/- FREE (3 Coupons)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='Body Polish — ₹400/- FREE',
            description='Get ₹400 off on body polish service. 3 coupons included.',
            service_package=None,  # Can be applied to any polish service
            service_count=0,
            discount_percentage=Decimal('0'),
            discount_fixed_amount=Decimal('400.00'),
            coupon_count=3,
            is_one_time=False,
            is_active=True,
            applicable_categories=['polish']  # Category-based filtering
        ))
        
        # 3. Interior Clean — 20% OFF (2 Coupons)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='Interior Clean — 20% OFF',
            description='Get 20% discount on interior cleaning service. 2 coupons included.',
            service_package=interior_clean,
            service_count=0,
            discount_percentage=Decimal('20.00'),
            discount_fixed_amount=Decimal('0'),
            coupon_count=2,
            is_one_time=False,
            is_active=True,
            applicable_categories=['interior']  # Category-based filtering
        ))
        
        # 4. Exterior Detailing — 20% OFF (2 Coupons)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='Exterior Detailing — 20% OFF',
            description='Get 20% discount on exterior detailing service. 2 coupons included.',
            service_package=exterior_detail,
            service_count=0,
            discount_percentage=Decimal('20.00'),
            discount_fixed_amount=Decimal('0'),
            coupon_count=2,
            is_one_time=False,
            is_active=True,
            applicable_categories=['exterior']  # Category-based filtering
        ))
        
        # 5. Car Makeover Service — 25% OFF (2 Coupons)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='Car Makeover Service — 25% OFF',
            description='Get 25% discount on car makeover service. 2 coupons included.',
            service_package=makeover,
            service_count=0,
            discount_percentage=Decimal('25.00'),
            discount_fixed_amount=Decimal('0'),
            coupon_count=2,
            is_one_time=False,
            is_active=True,
            applicable_categories=['makeover']  # Category-based filtering
        ))
        
        # 6. AC Vent Clean — ₹100/- OFF (2 Coupons)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='AC Vent Clean — ₹100/- OFF',
            description='Get ₹100 off on AC vent cleaning service. 2 coupons included.',
            service_package=None,  # Can be applied to any AC service
            service_count=0,
            discount_percentage=Decimal('0'),
            discount_fixed_amount=Decimal('100.00'),
            coupon_count=2,
            is_one_time=False,
            is_active=True,
            applicable_categories=['ac_service']  # Category-based filtering
        ))
        
        # 7. Ceramic Coating — 10% OFF (1 Coupon)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='Ceramic Coating — 10% OFF',
            description='Get 10% discount on ceramic coating service. 1 coupon included.',
            service_package=ceramic_coating,
            service_count=0,
            discount_percentage=Decimal('10.00'),
            discount_fixed_amount=Decimal('0'),
            coupon_count=1,
            is_one_time=False,
            is_active=True,
            applicable_categories=['coating']  # Category-based filtering
        ))
        
        # 8. Mechanical Service — 25% OFF (2 Coupons)
        benefits.append(MembershipBenefit.objects.create(
            plan=plan,
            benefit_type='discount',
            title='Mechanical Service — 25% OFF',
            description='Get 25% discount on mechanical service. 2 coupons included.',
            service_package=None,  # Can be applied to any mechanical service
            service_count=0,
            discount_percentage=Decimal('25.00'),
            discount_fixed_amount=Decimal('0'),
            coupon_count=2,
            is_one_time=False,
            is_active=True,
            applicable_categories=['mechanical']  # Category-based filtering
        ))
        
        return benefits

    def create_sample_memberships(self, plan):
        """Create sample customer memberships for testing"""
        
        # Get first branch
        branch = Branch.objects.first()
        if not branch:
            self.stdout.write(self.style.WARNING('  No branches found. Skipping sample memberships.'))
            return
        
        # Get some customers
        customers = User.objects.filter(role='customer')[:5]
        if not customers:
            self.stdout.write(self.style.WARNING('  No customers found. Skipping sample memberships.'))
            return
        
        created_count = 0
        for customer in customers:
            # Get customer's first vehicle
            vehicle = Vehicle.objects.filter(customer__user=customer).first()
            if not vehicle:
                continue
            
            # Calculate pricing
            vehicle_type = vehicle.vehicle_type if hasattr(vehicle, 'vehicle_type') else 'sedan'
            purchase_price = plan.get_price_for_vehicle_type(vehicle_type)
            gst_amount = (purchase_price * plan.gst_rate) / Decimal('100')
            total_paid = purchase_price + gst_amount
            
            # Create membership
            start_date = timezone.now().date()
            end_date = start_date + timedelta(days=plan.get_duration_in_days())
            
            membership = CustomerMembership.objects.create(
                customer=customer,
                vehicle=vehicle,
                plan=plan,
                vehicle_type=vehicle_type,
                purchase_price=purchase_price,
                gst_amount=gst_amount,
                total_paid=total_paid,
                purchase_date=timezone.now(),
                start_date=start_date,
                end_date=end_date,
                status='active',
                payment_method='online',
                payment_reference=f'TEST-{timezone.now().timestamp()}',
                branch=branch,
                notes='Sample membership created by seed script'
            )
            
            # Generate coupons for this membership
            from memberships.services import MembershipCouponService
            result = MembershipCouponService.generate_coupons_for_membership(membership)
            
            created_count += 1
            self.stdout.write(f'  Created membership for {customer.name} - {result.get("coupons_generated", 0)} coupons generated')
        
        self.stdout.write(self.style.SUCCESS(f'  Created {created_count} sample memberships'))
