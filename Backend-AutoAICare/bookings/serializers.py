from rest_framework import serializers
from django.utils import timezone
from .models import Booking
from customers.serializers import VehicleSerializer, CustomerSerializer
from services.serializers import ServicePackageSerializer, AddOnSerializer
from services.models import ServicePackage
from branches.serializers import BranchListSerializer, ServiceBaySerializer
from users.validators import validate_phone_number


class BookingListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view - includes nested structures for frontend compatibility."""
    # Keep flat fields for optimization
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)
    has_jobcard = serializers.ReadOnlyField()
    
    # Add lightweight nested structures for frontend compatibility
    customer_details = serializers.SerializerMethodField()
    vehicle_details = serializers.SerializerMethodField()
    packages_details = serializers.SerializerMethodField()
    branch_details = serializers.SerializerMethodField()
    bay_details = serializers.SerializerMethodField()
    jobcard = serializers.SerializerMethodField()
    price_breakdown = serializers.SerializerMethodField()
    addon_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = (
            'id', 'customer_name', 'customer_details', 'vehicle_details',
            'packages_details', 'addon_details', 'branch_details', 'assigned_bay', 'bay_details',
            'booking_datetime', 'status', 'vehicle_type',
            'subtotal', 'gst_amount', 'discount_amount', 'total_price',
            'price_breakdown', 'has_jobcard', 'jobcard',
            'created_at', 'vehicle_arrived_at'
        )
    
    def get_packages_details(self, obj):
        """Get list of package details for all services in this booking."""
        packages = obj.get_packages_list()
        return [
            {
                'id': pkg.id,
                'name': pkg.name,
                'category': pkg.category,
                'duration': pkg.duration,
            }
            for pkg in packages
        ]
    
    def get_price_breakdown(self, obj):
        """Get detailed price breakdown."""
        return obj.get_price_breakdown()

    def get_customer_details(self, obj):
        """Get lightweight customer details."""
        if obj.customer and obj.customer.user:
            return {
                'id': obj.customer.id,
                'user': {
                    'id': obj.customer.user.id,
                    'name': obj.customer.user.name,
                    'phone': obj.customer.user.phone,
                    'email': obj.customer.user.email
                }
            }
        return None
    
    def get_branch_details(self, obj):
        """Get lightweight branch details."""
        if obj.branch:
            return {
                'id': obj.branch.id,
                'name': obj.branch.name,
                'code': getattr(obj.branch, 'code', None)
            }
        return None
    
    def get_bay_details(self, obj):
        """Get lightweight bay details."""
        if obj.assigned_bay:
            return {
                'id': obj.assigned_bay.id,
                'name': obj.assigned_bay.name,
                'bay_type': obj.assigned_bay.bay_type,
                'bay_type_display': obj.assigned_bay.get_bay_type_display()
            }
        return None

    def get_vehicle_details(self, obj):
        """Get lightweight vehicle details."""
        if obj.vehicle:
            return {
                'id': obj.vehicle.id,
                'registration_number': obj.vehicle.registration_number,
                'brand': obj.vehicle.brand,
                'model': obj.vehicle.model,
                'vehicle_type': obj.vehicle.vehicle_type
            }
        return None

    def get_addon_details(self, obj):
        """Get lightweight addon details."""
        return [
            {'id': addon.id, 'name': addon.name, 'price': str(addon.price)}
            for addon in obj.addons.all()
        ]

    def get_jobcard(self, obj):
        """Get lightweight jobcard details."""
        try:
            if hasattr(obj, 'jobcard') and obj.jobcard:
                return {
                    'id': obj.jobcard.id,
                    'status': obj.jobcard.status,
                    'floor_manager_details': {
                        'id': obj.jobcard.floor_manager.id,
                        'name': obj.jobcard.floor_manager.name
                    } if obj.jobcard.floor_manager else None
                }
        except:
            pass
        return None


class BookingSerializer(serializers.ModelSerializer):
    """Serializer for Booking model with vehicle-type pricing."""
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    packages_details = serializers.SerializerMethodField()
    addon_details = AddOnSerializer(source='addons', many=True, read_only=True)
    customer_details = CustomerSerializer(source='customer', read_only=True)
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)
    branch_details = BranchListSerializer(source='branch', read_only=True)
    bay_details = ServiceBaySerializer(source='assigned_bay', read_only=True)
    has_jobcard = serializers.ReadOnlyField()
    jobcard = serializers.SerializerMethodField()
    checked_in_by_details = serializers.SerializerMethodField()
    pickup_request_details = serializers.SerializerMethodField()
    customer_stats = serializers.SerializerMethodField()
    coupon_details = serializers.SerializerMethodField()
    payment_details = serializers.SerializerMethodField()

    # New computed fields
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    price_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            'id', 'customer_name', 'customer_details', 'vehicle', 'vehicle_details',
            'packages_details', 'addons', 'addon_details', 'branch', 'branch_details',
            'assigned_bay', 'bay_details',
            'vehicle_type', 'vehicle_type_display',
            'booking_datetime', 'status', 'pickup_required', 'location',
            'subtotal', 'gst_amount', 'discount_amount', 'total_price',
            'price_breakdown', 'pickup_request_details',
            'notes', 'created_at', 'updated_at', 'has_jobcard', 'jobcard',
            'vehicle_arrived_at', 'checked_in_by', 'checked_in_by_details',
            'initial_photos', 'initial_damages', 'check_in_notes',
            'customer_stats', 'coupon_details', 'payment_details',
        )
        read_only_fields = ('customer', 'subtotal', 'gst_amount', 'total_price', 'created_at', 'updated_at', 'vehicle_arrived_at', 'checked_in_by')


    def get_packages_details(self, obj):
        """Get list of all packages in this booking."""
        return [
            {
                'id': pkg.id,
                'name': pkg.name,
                'category': pkg.category,
                'duration': pkg.duration,
            }
            for pkg in obj.get_packages_list()
        ]
    
    def get_checked_in_by_details(self, obj):
        """Get checked in by user details."""
        if obj.checked_in_by:
            from users.serializers import UserSerializer
            return UserSerializer(obj.checked_in_by).data
        return None

    def get_jobcard(self, obj):
        """Get job card details."""
        try:
            if hasattr(obj, 'jobcard'):
                from jobcards.serializers import JobCardEmbeddedSerializer
                return JobCardEmbeddedSerializer(obj.jobcard).data
        except:
            pass
        return None
    
    def get_price_breakdown(self, obj):
        """Get detailed price breakdown."""
        return obj.get_price_breakdown()
    
    def get_pickup_request_details(self, obj):
        """Get pickup/drop request details if exists."""
        try:
            if hasattr(obj, 'pickup_request') and obj.pickup_request:
                return {
                    'id': obj.pickup_request.id,
                    'pickup_time': obj.pickup_request.pickup_time,
                    'drop_time': obj.pickup_request.drop_time,
                    'status': obj.pickup_request.status,
                    'pickup_notes': obj.pickup_request.pickup_notes,
                    'drop_notes': obj.pickup_request.drop_notes,
                    'driver': {
                        'id': obj.pickup_request.driver.id,
                        'name': obj.pickup_request.driver.name,
                        'phone': obj.pickup_request.driver.phone
                    } if obj.pickup_request.driver else None
                }
        except:
            pass
        return None

    def get_customer_stats(self, obj):
        """Return visit count, last visit, and active membership for this customer."""
        try:
            customer = obj.customer
            bookings_qs = Booking.objects.filter(customer=customer).exclude(id=obj.id)
            total_visits = bookings_qs.count() + 1  # +1 for current booking
            last_visit = (
                bookings_qs.order_by('-booking_datetime')
                .values_list('booking_datetime', flat=True)
                .first()
            )
            # Active membership
            membership_info = None
            try:
                from memberships.models import CustomerMembership
                active = CustomerMembership.objects.filter(
                    customer=customer.user,
                    status='active'
                ).select_related('plan').first()
                if active:
                    membership_info = {
                        'plan_name': active.plan.name,
                        'end_date': active.end_date.isoformat() if active.end_date else None,
                        'washes_remaining': getattr(active, 'washes_remaining', None),
                    }
            except Exception:
                pass
            return {
                'total_visits': total_visits,
                'last_visit': last_visit.date().isoformat() if last_visit else None,
                'membership': membership_info,
            }
        except Exception:
            return None

    def get_coupon_details(self, obj):
        """Return details of the coupon applied to this booking, if any."""
        try:
            if obj.coupon:
                return {
                    'code': obj.coupon.code,
                    'discount_type': obj.coupon.discount_type,
                    'discount_value': str(obj.coupon.discount_value),
                    'name': getattr(obj.coupon, 'name', obj.coupon.code),
                }
        except Exception:
            pass
        return None

    def get_payment_details(self, obj):
        """Return the most recent payment for this booking."""
        try:
            # Prefer a completed payment; fall back to most recent of any status
            payment = (
                obj.payments.filter(payment_status='completed').order_by('-created_at').first()
                or obj.payments.order_by('-created_at').first()
            )
            if payment:
                return {
                    'id': payment.id,
                    'amount': str(payment.amount),
                    'payment_method': payment.payment_method,
                    'status': payment.payment_status,
                    'created_at': payment.payment_date or payment.created_at,
                    'reference_number': payment.reference_number,
                    'notes': payment.notes,
                }
        except Exception:
            pass
        return None


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings with vehicle-type pricing."""
    addon_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    vehicle_type = serializers.ChoiceField(
        choices=Booking.VEHICLE_TYPE_CHOICES,
        required=True,
        help_text='Vehicle type for pricing (hatchback, sedan, suv)'
    )
    
    class Meta:
        model = Booking
        fields = ('vehicle', 'package', 'coupon', 'addon_ids', 'assigned_bay', 'vehicle_type', 'booking_datetime', 'pickup_required', 'location', 'notes', 'discount_amount')
    
    def validate(self, attrs):
        # Validate that the selected service package is compatible with the vehicle type
        package = attrs.get('package')
        vehicle_type = attrs.get('vehicle_type')
        
        if package and vehicle_type:
            # Handle both ServicePackage object and ID
            if isinstance(package, ServicePackage):
                # Already a ServicePackage object
                package_obj = package
            else:
                # It's an ID, fetch the object
                try:
                    package_obj = ServicePackage.objects.get(id=package)
                except ServicePackage.DoesNotExist:
                    raise serializers.ValidationError("Invalid service package selected.")
            
            if not package_obj.is_compatible_with_vehicle_type(vehicle_type):
                raise serializers.ValidationError(
                    f"Selected service '{package_obj.name}' is not compatible with vehicle type '{vehicle_type}'. "
                    f"Bike services can only be booked for bikes, and car services can only be booked for cars."
                )
            
        # Validate coupon if provided
        coupon = attrs.get('coupon')
        if coupon:
            request = self.context.get('request')
            customer = request.user if request else None
            
            is_valid, message = coupon.is_valid(customer=customer)
            if not is_valid:
                raise serializers.ValidationError({"coupon": message})
            
            # Check if coupon is applicable to this service
            if coupon.applicable_services.exists() and package_obj.id not in [p.id for p in coupon.applicable_services.all()]:
                raise serializers.ValidationError({"coupon": "This coupon is not applicable to the selected service package."})
        
        return attrs
    
    def create(self, validated_data):
        addon_ids = validated_data.pop('addon_ids', [])
        # Create booking without saving to database yet
        booking = Booking(**validated_data)
        
        # Get addons for price calculation
        addons = []
        if addon_ids:
            from services.models import AddOn
            addons = list(AddOn.objects.filter(id__in=addon_ids))  # type: ignore
        
        # Price will be calculated in the model's save method based on vehicle_type
        # Now save the booking to get an ID, passing addons for price calculation
        booking.save(addons=addons)
        
        # Now we can set the many-to-many relationship
        if addon_ids:
            booking.addons.set(addons)
        
        # Handle washing plan usage
        # Check if this is a car wash service and customer has active washing plan
        if booking.package and 'wash' in booking.package.name.lower():
            try:
                from memberships.models import CustomerMembership
                # Get active washing plan for this customer
                # Note: washes_remaining is a computed property, not a field
                active_memberships = CustomerMembership.objects.filter(
                    customer=booking.customer.user,
                    status='active'
                ).select_related('plan')
                
                # Find a membership with remaining washes
                active_membership = None
                for membership in active_memberships:
                    if membership.washes_remaining > 0:
                        active_membership = membership
                        break
                
                if active_membership:
                    # Increment washes_used (this decrements washes_remaining)
                    active_membership.washes_used += 1
                    active_membership.save()
            except Exception as e:
                # Don't fail the booking if membership update fails
                pass
        
        # Handle coupon usage tracking
        if booking.coupon:
            try:
                from memberships.models import CouponUsage
                
                # Increment times_used counter
                booking.coupon.times_used += 1
                
                # Check if usage limit reached and mark as inactive
                if booking.coupon.usage_limit > 0 and booking.coupon.times_used >= booking.coupon.usage_limit:
                    booking.coupon.status = 'inactive'
                
                booking.coupon.save()
                
                # Create CouponUsage record for tracking
                CouponUsage.objects.create(
                    coupon=booking.coupon,
                    customer=booking.customer.user,
                    booking=booking,
                    discount_applied=booking.discount_amount or 0,
                    order_value=booking.subtotal or 0,
                    used_at=timezone.now()
                )
            except Exception as e:
                # Don't fail the booking if coupon tracking fails
                # But log the error for debugging
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to track coupon usage: {str(e)}")
        
        return booking


class AdminWalkInBookingSerializer(serializers.Serializer):
    """Serializer for admin walk-in booking creation with vehicle-type pricing."""
    # Customer data
    customer = serializers.DictField(required=True)
    
    # Vehicle data
    vehicle = serializers.DictField(required=True)
    
    # Service data — accepts one OR MORE package IDs
    package_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        min_length=1,
        help_text='List of one or more ServicePackage IDs'
    )
    addon_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    # Vehicle type for pricing
    vehicle_type = serializers.ChoiceField(
        choices=Booking.VEHICLE_TYPE_CHOICES,
        required=True,
        help_text='Vehicle type for pricing (hatchback, sedan, suv)'
    )
    
    # Booking data
    booking_datetime = serializers.DateTimeField(required=True)
    assigned_bay = serializers.IntegerField(required=False, allow_null=True)
    pickup_required = serializers.BooleanField(default=False)
    location = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    # Referral code (optional)
    referral_code = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Referral code from existing customer'
    )
    
    # Branch (for super admin)
    branch = serializers.IntegerField(required=False)
    
    def validate_customer(self, value):
        """Validate customer data, specifically phone number."""
        if 'phone' in value:
            try:
                validate_phone_number(value['phone'])
            except Exception as e:
                raise serializers.ValidationError(f"Invalid phone number. Phone number should be exactly 10 digits.")
        return value
    
    def validate(self, attrs):
        """Validate the entire serializer data."""
        # Validate customer data if it exists and doesn't have an ID (new customer)
        customer_data = attrs.get('customer', {})
        if customer_data and 'id' not in customer_data:
            self.validate_customer(customer_data)

        # Validate that EACH selected service package is compatible with the vehicle type
        package_ids = attrs.get('package_ids', [])
        vehicle_type = attrs.get('vehicle_type')

        if package_ids and vehicle_type:
            from services.models import ServicePackage
            for pkg_id in package_ids:
                try:
                    package = ServicePackage.objects.get(id=pkg_id)
                    if not package.is_compatible_with_vehicle_type(vehicle_type):
                        raise serializers.ValidationError(
                            f"Service '{package.name}' is not compatible with vehicle type '{vehicle_type}'. "
                            f"Bike services can only be booked for bikes, and car services for cars."
                        )
                except ServicePackage.DoesNotExist:
                    raise serializers.ValidationError(f"Invalid service package ID: {pkg_id}")

        # Validate referral code if provided
        referral_code = attrs.get('referral_code', '').strip()
        if referral_code:
            from customers.referral_models import ReferralCode
            try:
                code_obj = ReferralCode.objects.get(code=referral_code.upper(), is_active=True)
                attrs['_validated_referral_code'] = code_obj
            except ReferralCode.DoesNotExist:
                raise serializers.ValidationError({
                    'referral_code': f'Referral code "{referral_code}" is invalid or inactive.'
                })

        return attrs