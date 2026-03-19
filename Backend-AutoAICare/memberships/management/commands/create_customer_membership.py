"""
Create a membership for a specific customer by phone number.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from users.models import User
from customers.models import Vehicle
from memberships.models import MembershipPlan, CustomerMembership
from memberships.services import MembershipCouponService


class Command(BaseCommand):
    help = 'Create a membership for a customer by phone number'

    def add_arguments(self, parser):
        parser.add_argument('phone', type=str, help='Customer phone number')

    def handle(self, *args, **options):
        phone = options['phone']
        
        try:
            # Find customer
            customer = User.objects.get(phone=phone, role='customer')
            self.stdout.write(f'Found customer: {customer.name} (ID: {customer.id})')
            
            # Find customer's vehicle
            vehicle = Vehicle.objects.filter(customer__user=customer).first()
            if not vehicle:
                self.stdout.write(self.style.ERROR(f'No vehicle found for customer {customer.name}'))
                return
            
            self.stdout.write(f'Found vehicle: {vehicle.registration_number}')
            
            # Get K3 membership plan
            plan = MembershipPlan.objects.get(name='K3 Car Care Membership Card')
            self.stdout.write(f'Using plan: {plan.name}')
            
            # Check if customer already has an active membership
            existing = CustomerMembership.objects.filter(
                customer=customer,
                status='active'
            ).first()
            
            if existing:
                self.stdout.write(self.style.WARNING(f'Customer already has active membership: {existing.membership_id}'))
                return
            
            # Create membership
            membership = CustomerMembership.objects.create(
                customer=customer,
                vehicle=vehicle,
                plan=plan,
                vehicle_type='sedan',
                purchase_price=Decimal('1500'),
                gst_amount=Decimal('270'),
                total_paid=Decimal('1770'),
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(days=365),
                status='active',
                payment_method='cash',
                payment_reference='MANUAL-CREATION',
                branch=customer.branch,
                notes='Manually created for testing'
            )
            
            self.stdout.write(self.style.SUCCESS(f'Created membership: {membership.membership_id}'))
            
            # Generate coupons
            result = MembershipCouponService.generate_coupons_for_membership(membership)
            self.stdout.write(self.style.SUCCESS(
                f'Generated {result["coupons_generated"]} coupons for {customer.name}'
            ))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Customer with phone {phone} not found'))
        except MembershipPlan.DoesNotExist:
            self.stdout.write(self.style.ERROR('K3 Car Care Membership Card plan not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
