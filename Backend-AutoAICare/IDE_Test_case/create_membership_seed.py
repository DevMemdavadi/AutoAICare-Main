import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from memberships.models import MembershipPlan, MembershipBenefit
from services.models import ServicePackage

def create_seed_data():
    print("Creating service packages...")
    
    # Helper to get/create services
    def get_or_create_service(name, category, sedan_price_val):
        service, created = ServicePackage.objects.get_or_create(
            name=name,
            defaults={
                'category': category,
                'sedan_price': sedan_price_val,
                'hatchback_price': sedan_price_val - 100 if sedan_price_val > 100 else sedan_price_val,
                'suv_price': sedan_price_val + 100,
                'duration': 60,
                'description': f'{name} Service',
                'is_active': True,
                'gst_applicable': True,
                'gst_rate': 18.00
            }
        )
        if created:
            print(f"Created service: {name}")
        return service

    # Create Services referenced in the membership
    normal_wash = get_or_create_service('Normal Car Wash', 'wash', 600)
    body_polish = get_or_create_service('Body Polish', 'polish', 1000)
    interior_clean = get_or_create_service('Interior Cleaning', 'interior', 1000)
    exterior_detail = get_or_create_service('Exterior Detailing', 'exterior', 1500)
    car_makeover = get_or_create_service('Car Makeover Service', 'makeover', 5000)
    ac_vent_clean = get_or_create_service('AC Vent Cleaning', 'ac_service', 500)
    ceramic_coating = get_or_create_service('Ceramic Coating', 'coating', 10000)
    mechanical_service = get_or_create_service('Mechanical Service', 'mechanical', 2000)

    print("\nCreating Lifetime Membership Plan...")
    lifetime_plan, created = MembershipPlan.objects.get_or_create(
        name='Lifetime Membership Card',
        defaults={
            'tier': 'platinum',
            'description': 'Lifetime Membership with exclusive discounts and coupons.\nSavings:\n- Hatchback: ₹9,208\n- Sedan: ₹10,774\n- SUV: ₹13,048',
            'hatchback_price': 1500,
            'sedan_price': 1500,
            'suv_price': 1500,
            'gst_applicable': True,
            'gst_rate': 18.00,
            'duration_value': 99,
            'duration_unit': 'years',
            'is_active': True,
            'is_popular': True,
            'priority_booking': True,
        }
    )
    
    if not created:
        print("Updated existing Lifetime Plan")
        lifetime_plan.benefits.all().delete()
    
    # Benefits:
    # 1. First Normal Car Washing 50% OFF
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='First Normal Car Wash (50% OFF)',
        service_package=normal_wash,
        discount_percentage=50,
        coupon_count=1,
        is_one_time=True,
        description='One-time 50% discount on first wash'
    )

    # 2. Normal Car Wash — 30% OFF (5 Coupons)
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='Normal Car Wash (30% OFF - 5 Coupons)',
        service_package=normal_wash,
        discount_percentage=30,
        coupon_count=5,
        description='5 Coupons for 30% OFF'
    )

    # 3. Body Polish — ₹400/- FREE (3 Coupons)
    # Modeled as Free Service for simplicity, assuming 400 is full value or substantial part.
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='free_service',
        title='Body Polish (3 Coupons)',
        service_package=body_polish,
        service_count=3,
        coupon_count=3,
        description='Free Body Polish worth ₹400 (3 Coupons)'
    )

    # 4. Interior Clean — 20% OFF (2 Coupons)
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='Interior Clean (20% OFF - 2 Coupons)',
        service_package=interior_clean,
        discount_percentage=20,
        coupon_count=2,
        description='2 Coupons for 20% OFF'
    )

    # 5. Exterior Detailing — 20% OFF (2 Coupons)
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='Exterior Detailing (20% OFF - 2 Coupons)',
        service_package=exterior_detail,
        discount_percentage=20,
        coupon_count=2,
        description='2 Coupons for 20% OFF'
    )

    # 6. Car Makeover Service — 25% OFF (2 Coupons)
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='Car Makeover (25% OFF - 2 Coupons)',
        service_package=car_makeover,
        discount_percentage=25,
        coupon_count=2,
        description='2 Coupons for 25% OFF'
    )

    # 7. AC Vent Clean — ₹100/- OFF (2 Coupons)
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='AC Vent Clean (₹100 OFF - 2 Coupons)',
        service_package=ac_vent_clean,
        discount_fixed_amount=100,
        coupon_count=2,
        description='₹100 discount on AC Vent Cleaning (2 Coupons)'
    )

    # 8. Ceramic Coating — 10% OFF (1 Coupon)
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='Ceramic Coating (10% OFF - 1 Coupon)',
        service_package=ceramic_coating,
        discount_percentage=10,
        coupon_count=1,
        description='1 Coupon for 10% OFF'
    )

    # 9. Mechanical Service — 25% OFF (2 Coupons)
    MembershipBenefit.objects.create(
        plan=lifetime_plan,
        benefit_type='discount',
        title='Mechanical Service (25% OFF - 2 Coupons)',
        service_package=mechanical_service,
        discount_percentage=25,
        coupon_count=2,
        description='2 Coupons for 25% OFF'
    )


    print("\nCreating Yearly Washing Plans...")
    
    # Yearly Washing Plan (Sedan)
    sedan_plan, created = MembershipPlan.objects.get_or_create(
        name='Yearly Washing Plan (Sedan)',
        defaults={
            'tier': 'gold',
            'description': 'Annual Plan for Sedan Cars. 12 Normal Washes + 4 Free Washes.',
            'hatchback_price': 7200,
            'sedan_price': 7200,
            'suv_price': 7200,
            'gst_applicable': True,
            'gst_rate': 18.00,
            'duration_value': 12,
            'duration_unit': 'months',
            'free_washes_count': 16, # 12 paid + 4 free
            'is_active': True,
        }
    )
    
    if not created: 
        sedan_plan.benefits.all().delete()
    
    MembershipBenefit.objects.create(
        plan=sedan_plan,
        benefit_type='free_service',
        title='Normal Car Wash (16 Washes)',
        service_package=normal_wash,
        service_count=16,
        description='Includes Interior Vacuum & Polish/Perfume, Exterior Foaming Wash, Tyre Polish, Fibre Polish'
    )

    # Yearly Washing Plan (SUV/XUV)
    suv_plan, created = MembershipPlan.objects.get_or_create(
        name='Yearly Washing Plan (SUV/XUV)',
        defaults={
            'tier': 'gold',
            'description': 'Annual Plan for XUV/SUV Cars. 12 Normal Washes + 4 Free Washes.',
            'hatchback_price': 8400,
            'sedan_price': 8400,
            'suv_price': 8400,
            'gst_applicable': True,
            'gst_rate': 18.00,
            'duration_value': 12,
            'duration_unit': 'months',
            'free_washes_count': 16, # 12 paid + 4 free
            'is_active': True,
        }
    )
    
    if not created:
        suv_plan.benefits.all().delete()
        
    MembershipBenefit.objects.create(
        plan=suv_plan,
        benefit_type='free_service',
        title='Normal Car Wash (16 Washes)',
        service_package=normal_wash,
        service_count=16,
        description='Includes Interior Vacuum & Polish/Perfume, Exterior Foaming Wash, Tyre Polish, Fibre Polish'
    )

    print("\nSeed data creation completed successfully.")

if __name__ == '__main__':
    create_seed_data()
