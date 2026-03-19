"""
Serializers for Membership models.
"""

from rest_framework import serializers
from django.utils import timezone
from django.db import models
from datetime import timedelta
from .models import (
    MembershipPlan, 
    MembershipBenefit, 
    CustomerMembership,
    MembershipBenefitUsage,
    Coupon, 
    CouponUsage,
    MembershipCouponGeneration
)
from companies.serializers import TenantSerializerMixin


class MembershipBenefitSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for membership benefits."""
    
    benefit_type_display = serializers.CharField(source='get_benefit_type_display', read_only=True)
    service_name = serializers.CharField(source='service_package.name', read_only=True)
    
    class Meta:
        model = MembershipBenefit
        fields = [
            'id', 'plan', 'benefit_type', 'benefit_type_display', 'title', 'description',
            'service_package', 'service_name', 'service_count', 
            'discount_percentage', 'discount_fixed_amount', 'coupon_count',
            'applicable_categories', 'is_one_time', 'is_active'
        ]


class MembershipBenefitUsageSerializer(serializers.ModelSerializer):
    """Serializer for membership benefit usage tracking."""
    
    benefit_details = MembershipBenefitSerializer(source='benefit', read_only=True)
    membership_id = serializers.CharField(source='customer_membership.membership_id', read_only=True)
    coupons_remaining = serializers.IntegerField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    
    # Get available coupons for this benefit
    available_coupons = serializers.SerializerMethodField()
    
    class Meta:
        model = MembershipBenefitUsage
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'coupons_remaining', 'is_available')
    
    def get_available_coupons(self, obj):
        """Get list of available coupons for this benefit."""
        from .models import Coupon
        
        coupons = Coupon.objects.filter(
            benefit_usage=obj,
            status='active',
            valid_from__lte=timezone.now(),
            valid_until__gte=timezone.now()
        ).filter(
            models.Q(usage_limit=0) | models.Q(times_used__lt=models.F('usage_limit'))
        )
        
        return CouponSerializer(coupons, many=True, context=self.context).data


class MembershipPlanSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for membership plans."""
    
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    duration_unit_display = serializers.CharField(source='get_duration_unit_display', read_only=True)
    benefits = MembershipBenefitSerializer(many=True, read_only=True)
    duration_in_days = serializers.SerializerMethodField()
    
    # Price calculations with GST
    hatchback_gst = serializers.SerializerMethodField()
    hatchback_total = serializers.SerializerMethodField()
    sedan_gst = serializers.SerializerMethodField()
    sedan_total = serializers.SerializerMethodField()
    suv_gst = serializers.SerializerMethodField()
    suv_total = serializers.SerializerMethodField()
    company = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = MembershipPlan
        fields = '__all__'
        read_only_fields = ('company', 'created_at', 'updated_at')
        validators = [] # Disable UniqueTogetherValidator to avoid company requirement
    
    def get_duration_in_days(self, obj):
        return obj.get_duration_in_days()
    
    def _calculate_gst(self, obj, price):
        if obj.gst_applicable and price:
            return str((price * obj.gst_rate) / 100)
        return "0.00"
    
    def _calculate_total(self, obj, price):
        if price:
            gst = (price * obj.gst_rate) / 100 if obj.gst_applicable else 0
            return str(price + gst)
        return "0.00"
    
    def get_hatchback_gst(self, obj):
        return self._calculate_gst(obj, obj.hatchback_price)
    
    def get_hatchback_total(self, obj):
        return self._calculate_total(obj, obj.hatchback_price)
    
    def get_sedan_gst(self, obj):
        return self._calculate_gst(obj, obj.sedan_price)
    
    def get_sedan_total(self, obj):
        return self._calculate_total(obj, obj.sedan_price)
    
    def get_suv_gst(self, obj):
        return self._calculate_gst(obj, obj.suv_price)
    
    def get_suv_total(self, obj):
        return self._calculate_total(obj, obj.suv_price)


class MembershipPlanListSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Lightweight serializer for listing plans."""
    
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    duration_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MembershipPlan
        fields = [
            'id', 'name', 'tier', 'tier_display', 'description',
            'hatchback_price', 'sedan_price', 'suv_price',
            'gst_applicable', 'gst_rate',
            'duration_value', 'duration_unit', 'duration_display',
            'discount_percentage', 'free_washes_count', 'free_interior_cleaning_count',
            'coupons_per_month', 'coupon_discount_percentage',
            'priority_booking', 'is_active', 'is_popular', 'display_order'
        ]
    
    def get_duration_display(self, obj):
        return f"{obj.duration_value} {obj.get_duration_unit_display()}"


class CustomerMembershipDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for customer memberships with benefit usage."""
    
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_details = MembershipPlanSerializer(source='plan', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Benefit usages
    benefit_usages = MembershipBenefitUsageSerializer(many=True, read_only=True)
    
    # Computed fields
    is_active = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    total_savings = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerMembership
        fields = '__all__'
        read_only_fields = ('membership_id', 'created_at', 'updated_at')
    
    def get_total_savings(self, obj):
        """Calculate total savings from all coupon usages."""
        from .models import CouponUsage
        from decimal import Decimal
        
        total = CouponUsage.objects.filter(
            coupon__source_membership=obj
        ).aggregate(
            total=models.Sum('discount_applied')
        )['total'] or Decimal('0')
        
        return str(total)


class CustomerMembershipSerializer(serializers.ModelSerializer):
    """Serializer for customer memberships."""
    
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    vehicle_brand = serializers.CharField(source='vehicle.brand', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_tier = serializers.CharField(source='plan.tier', read_only=True)
    plan_details = MembershipPlanSerializer(source='plan', read_only=True)
    discount_percentage = serializers.DecimalField(source='plan.discount_percentage', max_digits=5, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Total benefits from plan (for progress display)
    total_washes = serializers.IntegerField(source='plan.free_washes_count', read_only=True)
    total_interior_cleanings = serializers.IntegerField(source='plan.free_interior_cleaning_count', read_only=True)
    
    # Computed fields
    is_active = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    washes_remaining = serializers.IntegerField(read_only=True)
    interior_cleanings_remaining = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = CustomerMembership
        fields = '__all__'
        read_only_fields = (
            'membership_id', 'created_at', 'updated_at',
            'is_active', 'days_remaining', 'washes_remaining', 'interior_cleanings_remaining'
        )


class VoucherCouponInputSerializer(serializers.Serializer):
    """Write-only serializer for voucher coupons to generate at membership creation."""
    coupon_type = serializers.ChoiceField(choices=['percentage', 'fixed'], default='percentage')
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    max_discount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, default=None)
    min_order_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    valid_days = serializers.IntegerField(min_value=1, default=30, help_text='Validity in days from today')
    count = serializers.IntegerField(min_value=1, max_value=20, default=1, help_text='Number of coupons to generate')
    description = serializers.CharField(required=False, allow_blank=True, default='')


class CustomerMembershipCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating customer memberships.
    Admins can pass customer_id to create a membership for any customer.
    voucher_coupons is an optional list of coupon configs to generate at creation time.
    """

    # Make customer and branch optional in input - they'll be auto-populated
    customer = serializers.PrimaryKeyRelatedField(read_only=True)
    branch = serializers.PrimaryKeyRelatedField(read_only=True)

    # Admin-only: create membership for a specific customer
    customer_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True,
        help_text='Pass user ID to create membership on behalf of another customer (admin only)'
    )

    # Optional voucher coupons to generate and assign at creation
    voucher_coupons = VoucherCouponInputSerializer(
        many=True, write_only=True, required=False, default=list
    )

    class Meta:
        model = CustomerMembership
        fields = [
            'customer', 'vehicle', 'plan', 'vehicle_type',
            'payment_method', 'payment_reference', 'notes', 'branch',
            'customer_id', 'voucher_coupons',
        ]

    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        admin_roles = {'super_admin', 'company_admin', 'branch_admin', 'floor_manager'}

        customer_id = data.pop('customer_id', None)
        if customer_id and user and user.role in admin_roles:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                data['_resolved_customer'] = User.objects.get(id=customer_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({'customer_id': 'Customer not found.'})
        else:
            data['_resolved_customer'] = None  # fall back to request.user

        return data

    def create(self, validated_data):
        import datetime as _dt
        from django.db import transaction
        with transaction.atomic():
            return self._do_create(validated_data)

    def _do_create(self, validated_data):
        plan = validated_data['plan']
        vehicle = validated_data['vehicle']
        vehicle_type = validated_data.get('vehicle_type', 'sedan')
        voucher_coupons_input = validated_data.pop('voucher_coupons', [])
        resolved_customer = validated_data.pop('_resolved_customer', None)

        # Determine customer
        request = self.context.get('request')
        customer = resolved_customer or request.user

        # Get branch
        branch = None
        if hasattr(vehicle, 'customer') and hasattr(vehicle.customer, 'branch'):
            branch = vehicle.customer.branch
        if branch is None and hasattr(customer, 'branch') and customer.branch:
            branch = customer.branch
        if branch is None and request and hasattr(request.user, 'branch') and request.user.branch:
            branch = request.user.branch

        # Calculate pricing
        purchase_price = plan.get_price_for_vehicle_type(vehicle_type)
        gst_amount = 0
        if plan.gst_applicable:
            gst_amount = (purchase_price * plan.gst_rate) / 100
        total_paid = purchase_price + gst_amount

        # Calculate dates
        start_date = timezone.now().date()
        duration_days = plan.get_duration_in_days()
        end_date = start_date + timedelta(days=duration_days)

        # Derive company from branch or validated data (passed via perform_create kwargs)
        company = validated_data.pop('company', None)
        if not company and branch:
            company = branch.company

        # Create membership
        membership = CustomerMembership.objects.create(
            customer=customer,
            vehicle=vehicle,
            plan=plan,
            vehicle_type=vehicle_type,
            branch=branch,
            company=company,
            purchase_price=purchase_price,
            gst_amount=gst_amount,
            total_paid=total_paid,
            start_date=start_date,
            end_date=end_date,
            status='active',
            payment_method=validated_data.get('payment_method', ''),
            payment_reference=validated_data.get('payment_reference', ''),
            notes=validated_data.get('notes', ''),
            created_by=validated_data.pop('created_by', None),
        )

        now = timezone.now()
        actor = request.user if request else None

        # ── 1. Auto-issue benefit coupons from plan's MembershipBenefit rows ──
        # This handles the K3 use case: a plan pre-defines all its service-specific
        # benefits (e.g. "30% off Normal Car Wash × 5", "₹400 off Body Polish × 3").
        # Each benefit with coupon_count > 0 gets its coupons auto-generated and
        # assigned to the customer, tracked via MembershipBenefitUsage.
        active_benefits = plan.benefits.filter(is_active=True, coupon_count__gt=0)
        for benefit in active_benefits:
            # Use get_or_create so a double-submit doesn't blow up with an IntegrityError.
            # If the usage row already exists (retry scenario) we skip coupon generation
            # for that benefit to avoid duplicates.
            benefit_usage, created = MembershipBenefitUsage.objects.get_or_create(
                customer_membership=membership,
                benefit=benefit,
                defaults=dict(
                    total_coupons_allocated=benefit.coupon_count,
                    coupons_used=0,
                    is_one_time=benefit.is_one_time,
                ),
            )
            if not created:
                # Usage row already exists — coupons were already generated on the
                # first (successful) attempt. Skip to avoid duplicates.
                continue

            # Determine coupon type and discount value based on benefit_type
            if benefit.benefit_type == 'free_service':
                # Free service = 100% discount coupon
                coupon_type = 'percentage'
                disc_pct = 100
                disc_amt = 0
            elif benefit.discount_fixed_amount and benefit.discount_fixed_amount > 0:
                coupon_type = 'fixed'
                disc_pct = 0
                disc_amt = benefit.discount_fixed_amount
            else:
                coupon_type = 'percentage'
                disc_pct = benefit.discount_percentage if benefit.discount_percentage else 0
                disc_amt = 0

            # Coupons valid for the full membership duration
            valid_until = timezone.make_aware(
                _dt.datetime.combine(end_date, _dt.time.max)
            )

            # Generate one coupon row per allocated count
            for _ in range(benefit.coupon_count):
                Coupon.objects.create(
                    code=Coupon.generate_code(prefix='BEN'),
                    coupon_type=coupon_type,
                    discount_percentage=disc_pct,
                    discount_amount=disc_amt,
                    min_order_value=0,
                    valid_from=now,
                    valid_until=valid_until,
                    usage_limit=1,
                    is_single_user=True,
                    customer=customer,
                    source_membership=membership,
                    source_benefit=benefit,
                    benefit_usage=benefit_usage,
                    is_membership_coupon=True,
                    applicable_categories=benefit.applicable_categories or [],
                    branch=branch,
                    company=company,
                    description=benefit.title or benefit.description or f'{plan.name} benefit',
                    created_by=actor,
                )

        # ── 2. Ad-hoc voucher coupons (optional – admin Step 4 extra input) ──
        # Useful for one-off welcome bonuses not captured in plan benefits.
        for spec in voucher_coupons_input:
            count = int(spec.get('count', 1))
            valid_days = int(spec.get('valid_days', 30))
            v_until = now + timedelta(days=valid_days)
            for _ in range(count):
                Coupon.objects.create(
                    code=Coupon.generate_code(prefix='VCH'),
                    coupon_type=spec.get('coupon_type', 'percentage'),
                    discount_percentage=spec.get('discount_percentage', 0),
                    discount_amount=spec.get('discount_amount', 0),
                    max_discount=spec.get('max_discount'),
                    min_order_value=spec.get('min_order_value', 0),
                    valid_from=now,
                    valid_until=v_until,
                    usage_limit=1,
                    is_single_user=True,
                    customer=customer,
                    source_membership=membership,
                    is_membership_coupon=True,
                    branch=branch,
                    company=company,
                    description=spec.get('description') or f'Welcome voucher – {plan.name}',
                    created_by=actor,
                )

        return membership


class CouponSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for coupons."""
    
    coupon_type_display = serializers.CharField(source='get_coupon_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    source_membership_id = serializers.CharField(source='source_membership.membership_id', read_only=True)
    
    # Validity check
    is_valid_now = serializers.SerializerMethodField()
    usage_remaining = serializers.SerializerMethodField()
    company = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ('company', 'code', 'times_used', 'created_at', 'updated_at')
        validators = []
    
    def get_is_valid_now(self, obj):
        is_valid, _ = obj.is_valid()
        return is_valid
    
    def get_usage_remaining(self, obj):
        if obj.usage_limit == 0:
            return 'Unlimited'
        return max(0, obj.usage_limit - obj.times_used)


class CouponCreateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating coupons."""
    
    valid_from = serializers.DateTimeField(required=False)
    
    class Meta:
        model = Coupon
        fields = [
            'coupon_type', 'discount_percentage', 'discount_amount',
            'max_discount', 'min_order_value', 'free_service',
            'valid_from', 'valid_until', 'usage_limit',
            'is_single_user', 'customer', 'is_global', 'branch',
            'description', 'terms_conditions'
        ]
    company = serializers.PrimaryKeyRelatedField(read_only=True)
    
    def create(self, validated_data):
        # Generate unique code
        validated_data['code'] = Coupon.generate_code()
        validated_data['created_by'] = self.context['request'].user
        
        # Default valid_from to now if not provided
        if 'valid_from' not in validated_data or validated_data['valid_from'] is None:
            validated_data['valid_from'] = timezone.now()
        
        return super().create(validated_data)


class CouponValidateSerializer(serializers.Serializer):
    """Serializer for validating a coupon code."""
    
    code = serializers.CharField(max_length=20)
    order_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    customer_id = serializers.IntegerField(required=False, help_text="Customer ID for admin validation")
    vehicle_id = serializers.IntegerField(required=False, help_text="Vehicle ID to validate membership coupon against")
    
    def validate_code(self, value):
        try:
            coupon = Coupon.objects.get(code=value.upper())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code")
        
        self.coupon = coupon
        return value.upper()
    
    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        
        # Determine which user to validate against
        target_user = user
        customer_id = data.get('customer_id')
        
        # If customer_id is provided (e.g., by admin for walk-in booking)
        if customer_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                target_user = User.objects.get(id=customer_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({"customer_id": "Invalid customer ID (User not found)"})
        
        order_value = data.get('order_value')
        
        # For staff/admin users validating on behalf of customers, 
        # we need to pass the target customer to the validation
        is_valid, message = self.coupon.is_valid(customer=target_user, order_value=order_value)
        
        if not is_valid:
            raise serializers.ValidationError({'code': message})
        
        # ── Vehicle-level validation for membership coupons ──────────────────
        # A membership coupon is tied to the membership's specific vehicle.
        # It must NOT be applied to a different vehicle.
        if self.coupon.is_membership_coupon:
            from memberships.models import MembershipBenefitUsage
            usage = (
                MembershipBenefitUsage.objects
                .filter(generated_coupons=self.coupon)
                .select_related('customer_membership', 'customer_membership__vehicle')
                .first()
            )
            if usage and usage.customer_membership:
                membership = usage.customer_membership
                membership_vehicle_id = membership.vehicle_id
                membership_vehicle_type = membership.vehicle_type

                vehicle_id = data.get('vehicle_id')
                if vehicle_id and membership_vehicle_id:
                    if int(vehicle_id) != int(membership_vehicle_id):
                        # Look up vehicle details for a helpful error message
                        try:
                            from customers.models import Vehicle
                            veh = Vehicle.objects.get(id=membership_vehicle_id)
                            veh_label = f"{veh.brand} {veh.model} ({veh.registration_number})"
                        except Exception:
                            veh_label = f"vehicle ID {membership_vehicle_id}"
                        raise serializers.ValidationError({
                            'code': (
                                f"This coupon is valid only for {veh_label} "
                                f"({membership_vehicle_type}). "
                                f"Please select the correct vehicle to apply this coupon."
                            )
                        })

                # Attach membership vehicle info to the response data
                data['membership_vehicle_id'] = membership_vehicle_id
                data['membership_vehicle_type'] = membership_vehicle_type

        data['coupon'] = self.coupon
        if order_value:
            data['discount'] = str(self.coupon.calculate_discount(order_value))
        
        return data



class CouponUsageSerializer(serializers.ModelSerializer):
    """Serializer for coupon usage history."""
    
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    coupon_type = serializers.CharField(source='coupon.coupon_type', read_only=True)
    coupon_type_display = serializers.CharField(source='coupon.get_coupon_type_display', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    service_name = serializers.SerializerMethodField()
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    
    class Meta:
        model = CouponUsage
        fields = [
            'id', 'coupon_code', 'coupon_type', 'coupon_type_display',
            'customer_name', 'customer_phone', 'service_name', 'booking_id',
            'discount_applied', 'order_value', 'used_at'
        ]
        read_only_fields = ('used_at',)
    
    def get_service_name(self, obj):
        """Get service name from booking."""
        if obj.booking and obj.booking.package:
            return obj.booking.package.name
        return None



class MembershipCouponGenerationSerializer(serializers.ModelSerializer):
    """Serializer for membership coupon generation tracking."""
    
    membership_id = serializers.CharField(source='membership.membership_id', read_only=True)
    
    class Meta:
        model = MembershipCouponGeneration
        fields = '__all__'
        read_only_fields = ('generated_at',)
