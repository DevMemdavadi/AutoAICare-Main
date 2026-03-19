"""
Test script to verify membership coupon generation.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from memberships.models import CustomerMembership, MembershipPlan, MembershipBenefitUsage, Coupon
from customers.models import Vehicle, Customer
from users.models import User
from branches.models import Branch
from django.utils import timezone
from datetime import timedelta

def test_membership_coupon_generation():
    print("=" * 60)
    print("Testing Membership Coupon Generation")
    print("=" * 60)
    
    # Get or create test user
    user, created = User.objects.get_or_create(
        phone='9999999999',
        defaults={
            'name': 'Test Customer',
            'email': 'test@example.com',
            'role': 'customer'
        }
    )
    if created:
        user.set_password('password123')
        user.save()
        print(f"✅ Created test user: {user.name}")
    else:
        print(f"✅ Using existing user: {user.name}")
    
    # Get or create Customer profile
    customer, created = Customer.objects.get_or_create(
        user=user
    )
    if created:
        print(f"✅ Created customer profile")
    else:
        print(f"✅ Using existing customer profile")
    
    # Get or create test vehicle
    vehicle, created = Vehicle.objects.get_or_create(
        registration_number='TEST1234',
        defaults={
            'customer': customer,
            'brand': 'Toyota',
            'model': 'Camry',
            'vehicle_type': 'sedan'
        }
    )
    if created:
        print(f"✅ Created test vehicle: {vehicle.registration_number}")
    else:
        print(f"✅ Using existing vehicle: {vehicle.registration_number}")
    
    # Get branch
    branch = Branch.objects.first()
    if not branch:
        print("❌ No branch found. Please create a branch first.")
        return
    
    # Get Lifetime Membership Plan
    plan = MembershipPlan.objects.filter(name='Lifetime Membership Card').first()
    if not plan:
        print("❌ Lifetime Membership Plan not found. Run create_membership_seed.py first.")
        return
    
    print(f"\n✅ Found plan: {plan.name}")
    print(f"   Benefits: {plan.benefits.count()}")
    
    # Check if customer already has an active membership
    existing = CustomerMembership.objects.filter(
        customer=user,
        plan=plan,
        status='active'
    ).first()
    
    if existing:
        print(f"\n⚠️  Customer already has active membership: {existing.membership_id}")
        membership = existing
    else:
        # Create membership
        purchase_price = plan.sedan_price
        gst_amount = (purchase_price * plan.gst_rate) / 100
        total_paid = purchase_price + gst_amount
        
        membership = CustomerMembership.objects.create(
            customer=user,
            vehicle=vehicle,
            plan=plan,
            vehicle_type='sedan',
            branch=branch,
            purchase_price=purchase_price,
            gst_amount=gst_amount,
            total_paid=total_paid,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=plan.get_duration_in_days()),
            status='active',
            payment_method='test',
            payment_reference='TEST123'
        )
        
        print(f"\n✅ Created membership: {membership.membership_id}")
        print(f"   Status: {membership.status}")
        print(f"   Valid until: {membership.end_date}")
    
    # Check benefit usages
    print(f"\n📊 Benefit Usages:")
    benefit_usages = membership.benefit_usages.all()
    print(f"   Total: {benefit_usages.count()}")
    
    for bu in benefit_usages:
        print(f"\n   🎟️  {bu.benefit.title}")
        print(f"      Type: {bu.benefit.get_benefit_type_display()}")
        print(f"      Coupons Allocated: {bu.total_coupons_allocated}")
        print(f"      Coupons Used: {bu.coupons_used}")
        print(f"      Coupons Remaining: {bu.coupons_remaining}")
        print(f"      One-time: {bu.is_one_time}")
        print(f"      Available: {bu.is_available}")
    
    # Check generated coupons
    print(f"\n🎫 Generated Coupons:")
    coupons = Coupon.objects.filter(source_membership=membership)
    print(f"   Total: {coupons.count()}")
    
    for coupon in coupons[:5]:  # Show first 5
        print(f"\n   Code: {coupon.code}")
        print(f"   Type: {coupon.get_coupon_type_display()}")
        print(f"   Discount: {coupon.discount_percentage}% / ₹{coupon.discount_amount}")
        print(f"   Status: {coupon.status}")
        print(f"   Valid until: {coupon.valid_until.date()}")
        if coupon.benefit_usage:
            print(f"   Benefit: {coupon.benefit_usage.benefit.title}")
    
    if coupons.count() > 5:
        print(f"\n   ... and {coupons.count() - 5} more coupons")
    
    print("\n" + "=" * 60)
    print("✅ Test completed successfully!")
    print("=" * 60)

if __name__ == '__main__':
    test_membership_coupon_generation()
