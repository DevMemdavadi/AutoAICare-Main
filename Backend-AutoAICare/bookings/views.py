from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from rest_framework.filters import SearchFilter, OrderingFilter
from typing import Any
from datetime import datetime
from django.db import models
from django.utils import timezone
import re
import logging

logger = logging.getLogger(__name__)

from .models import Booking
from .serializers import BookingSerializer, BookingCreateSerializer, AdminWalkInBookingSerializer, BookingListSerializer
from customers.models import Customer, Vehicle
from jobcards.models import JobCard


def generate_customer_password(name: str, phone: str) -> str:
    """
    Generate a password based on customer's name and phone number.
    Industry standard: Uses combination of name initials and phone number.
    
    Examples:
    - Name: "Prashant", Phone: "9904926409" -> "Pra4926" or "Prash4926"
    - Phone: "9904926409" -> "99049264" (last 8 digits)
    """
    # Clean phone number (remove non-digits)
    phone_clean = re.sub(r'\D', '', phone)
    
    # Clean name (remove special characters, keep only letters)
    name_clean = re.sub(r'[^a-zA-Z\s]', '', name).strip()
    
    # Strategy 1: Name (first 3-4 letters) + Phone (last 4 digits)
    if name_clean and len(name_clean) >= 3 and len(phone_clean) >= 4:
        name_part = name_clean[:4].capitalize()  # First 4 letters, capitalized
        phone_part = phone_clean[-4:]  # Last 4 digits
        return f"{name_part}{phone_part}"
    
    # Strategy 2: If name is too short, use phone only (last 8 digits)
    elif len(phone_clean) >= 8:
        return phone_clean[-8:]
    
    # Strategy 3: Fallback to last 6 digits if phone is shorter
    elif len(phone_clean) >= 6:
        return phone_clean[-6:]
    
    # Strategy 4: If phone is too short, use full phone
    else:
        return phone_clean if phone_clean else "123456"


class BookingFilter(filters.FilterSet):
    created_at_date = filters.DateFilter(field_name='created_at', lookup_expr='date')
    branch = filters.NumberFilter(field_name='branch__id')  # Allow filtering by branch ID
    
    class Meta:
        model = Booking
        fields = ['status', 'booking_datetime', 'vehicle', 'created_at_date', 'branch']
    
    def filter_queryset(self, queryset):
        """Override to add debug logging for filterset application."""
        logger.info("BookingFilter.filter_queryset() called")
        logger.info(f"Filter data: {self.data}")
        
        # Apply parent filterset
        filtered_qs = super().filter_queryset(queryset)
        
        # Log the result
        count_before = queryset.count()
        count_after = filtered_qs.count()
        logger.info(f"Filterset applied: {count_before} → {count_after} bookings")
        
        if 'branch' in self.data:
            logger.info(f"Branch filter applied: branch={self.data['branch']}")
        
        return filtered_qs

    
class BookingViewSet(viewsets.ModelViewSet):
    """ViewSet for Booking CRUD operations."""
    queryset = Booking.objects.all()  # type: ignore
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = BookingFilter
    search_fields = ['customer__user__name', 'customer__user__phone', 'vehicle__registration_number']
    ordering_fields = ['booking_datetime', 'created_at', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter bookings based on user role and branch."""
        user = self.request.user

        # Optimize queryset with select_related and prefetch_related to avoid N+1 queries
        queryset = Booking.objects.select_related(
            'customer',
            'customer__user',
            'vehicle',
            'vehicle__customer',
            'primary_package',
            'branch',
            'coupon',
            'assigned_bay',
            'checked_in_by',
            'jobcard',
            'jobcard__floor_manager',
            'jobcard__qc_report',
            'jobcard__qc_report__floor_manager',
            'jobcard__supervisor_review',
            'jobcard__supervisor_review__supervisor',
            'jobcard__final_qc_report',
            'jobcard__final_qc_report__supervisor'
        ).prefetch_related(
            'addons',
            'customer__user__memberships',
            'customer__user__memberships__plan',
            'jobcard__notes',
            'jobcard__notes__created_by'
        )

        if user.role == 'customer':
            # Customers see only their own bookings
            customer = getattr(user, 'customer_profile', None)
            if customer:
                queryset = queryset.filter(customer=customer)
            else:
                queryset = queryset.none()
        elif user.role == 'company_admin':
            # Company admin sees all bookings for their company — use direct company FK
            # (captures bookings where branch=None too)
            if user.company:
                queryset = queryset.filter(company=user.company)
            else:
                queryset = queryset.none()
        elif user.role in ['branch_admin', 'floor_manager', 'supervisor', 'applicator']:
            # Branch-scoped roles see only their branch's bookings
            if user.branch:
                queryset = queryset.filter(branch=user.branch)
            else:
                queryset = queryset.none()
        # else: super_admin sees all bookings — no filter

        # Filter out bookings that already have pickup requests if requested
        exclude_with_pickup = self.request.query_params.get('exclude_with_pickup')
        if exclude_with_pickup:
            if isinstance(exclude_with_pickup, list):
                exclude_with_pickup = exclude_with_pickup[0] if exclude_with_pickup else ''
            if isinstance(exclude_with_pickup, str) and exclude_with_pickup.lower() == 'true':
                queryset = queryset.filter(pickup_request__isnull=True)

        return queryset
    
    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self) -> Any:
        if self.action == 'create':
            return BookingCreateSerializer
        if self.action == 'list':
            return BookingListSerializer
        return BookingSerializer
    
    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def list(self, request, *args, **kwargs):
        """Override list to include job card information."""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # JobCard data is already included via prefetch_related in get_queryset
            # and handled by the serializer's get_jobcard method
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to include job card information."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        # JobCard data is already included via prefetch_related in get_queryset
        # and handled by the serializer's get_jobcard method
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Create booking for the current customer and auto-assign branch."""
        customer, created = Customer.objects.get_or_create(user=self.request.user)  # type: ignore
        
        # Auto-assign branch based on customer's branch or service package branch
        branch = None
        
        # Priority 1: Customer's assigned branch
        if self.request.user.branch:
            branch = self.request.user.branch
        # Priority 2: Service package branch (if not global)
        elif serializer.validated_data.get('package'):
            package = serializer.validated_data['package']
            if not package.is_global and package.branch:
                branch = package.branch
        
        # If still no branch, raise error asking customer to set branch
        if not branch:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'branch': 'Please set your preferred branch in your profile before booking a service.'
            })
        
        serializer.save(customer=customer, status='pending', branch=branch, company=self.request.user.company)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def service_suggestions(self, request):
        """
        Return intelligent service suggestions for a customer at a given branch.

        Query params:
          - customer_id  (int, required): The User ID of the selected customer
          - branch_id    (int, optional): Branch to scope trending/availability
        
        Response:
          {
            "customer_history": [ { id, name, category, last_booked, times_booked } ],
            "branch_trending":  [ { id, name, category, bookings_last_90_days } ]
          }
        """
        from datetime import timedelta
        from django.utils import timezone
        from django.db.models import Count, Max
        from services.models import ServicePackage
        from customers.models import Customer

        customer_id  = request.query_params.get('customer_id')
        branch_id    = request.query_params.get('branch_id')
        vehicle_type = request.query_params.get('vehicle_type')  # e.g. 'bike', 'sedan', 'suv', 'hatchback'

        # ── 1. Customer history ────────────────────────────────────────────
        customer_history = []
        if customer_id:
            try:
                # Resolve user → customer profile
                customer = Customer.objects.filter(user_id=customer_id).first()
                if not customer:
                    customer = Customer.objects.filter(id=customer_id).first()

                if customer:
                    history_qs = (
                        ServicePackage.objects
                        .filter(bookings__customer=customer, is_active=True)
                    )
                    # Filter by vehicle type compatibility if provided
                    if vehicle_type:
                        history_qs = history_qs.filter(
                            compatible_vehicle_types__contains=[vehicle_type]
                        )
                    history_qs = (
                        history_qs
                        .annotate(
                            last_booked=Max('bookings__booking_datetime'),
                            times_booked=Count('bookings'),
                        )
                        .order_by('-last_booked')[:5]
                    )
                    customer_history = [
                        {
                            'id': pkg.id,
                            'name': pkg.name,
                            'category': pkg.category,
                            'last_booked': pkg.last_booked.date().isoformat() if pkg.last_booked else None,
                            'times_booked': pkg.times_booked,
                        }
                        for pkg in history_qs
                    ]
            except Exception as e:
                logger.warning(f"service_suggestions: customer history error: {e}")

        # ── 2. Branch trending (last 90 days, fallback to all-time) ────────
        branch_trending = []
        cutoff = timezone.now() - timedelta(days=90)

        try:
            base_qs = ServicePackage.objects.filter(is_active=True)

            # Filter by vehicle type compatibility if provided
            if vehicle_type:
                base_qs = base_qs.filter(
                    compatible_vehicle_types__contains=[vehicle_type]
                )

            # Scope to branch: include global packages + this branch's packages
            if branch_id:
                from branches.models import Branch
                try:
                    branch_obj = Branch.objects.get(id=branch_id)
                    base_qs = base_qs.filter(
                        models.Q(is_global=True) | models.Q(branch=branch_obj)
                    )
                except Branch.DoesNotExist:
                    pass

            # Trending in last 90 days
            trending_qs = (
                base_qs
                .filter(bookings__booking_datetime__gte=cutoff)
                .annotate(booking_count=Count('bookings'))
                .order_by('-booking_count')[:5]
            )

            branch_trending = [
                {
                    'id': pkg.id,
                    'name': pkg.name,
                    'category': pkg.category,
                    'bookings_last_90_days': pkg.booking_count,
                }
                for pkg in trending_qs
            ]

            # Fallback: if fewer than 3 results use all-time
            if len(branch_trending) < 3:
                trending_qs = (
                    base_qs
                    .annotate(booking_count=Count('bookings'))
                    .order_by('-booking_count')[:5]
                )
                branch_trending = [
                    {
                        'id': pkg.id,
                        'name': pkg.name,
                        'category': pkg.category,
                        'bookings_last_90_days': pkg.booking_count,
                    }
                    for pkg in trending_qs
                ]
        except Exception as e:
            logger.warning(f"service_suggestions: trending error: {e}")

        # Remove from trending any packages that already appear in customer history
        history_ids = {s['id'] for s in customer_history}
        branch_trending = [s for s in branch_trending if s['id'] not in history_ids]

        return Response({
            'customer_history': customer_history,
            'branch_trending': branch_trending,
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def admin_create(self, request):
        """Create booking for walk-in customer by admin."""
        user = request.user
        

        # Check if user is branch_admin or super_admin
        if user.role not in ['company_admin', 'branch_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can create walk-in bookings.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate and serialize input data
        serializer = AdminWalkInBookingSerializer(data=request.data)
        if not serializer.is_valid():
            # Extract the first error message and return it in the expected format
            error_messages = []
            for field, messages in serializer.errors.items():
                if isinstance(messages, list) and len(messages) > 0:
                    error_messages.append(f"{field}: {messages[0]}")
                else:
                    error_messages.append(f"{field}: {str(messages)}")
            
            error_message = '; '.join(error_messages) if error_messages else 'Invalid input data'
            return Response({'error': error_message}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate branch
        branch = None
        if user.role == 'branch_admin':
            branch = user.branch
            if not branch:
                return Response(
                    {'error': 'Admin must be assigned to a branch to create bookings.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.data.get('branch')
            if not branch_id:
                return Response(
                    {'error': 'Branch selection is required.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                from branches.models import Branch
                # If company admin, ensure branch belongs to their company
                if user.role == 'company_admin':
                    branch = Branch.objects.filter(id=branch_id, company=user.company).first()
                    if not branch:
                        return Response(
                            {'error': 'Invalid branch selected for your company.'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    # Super admin can pick any branch
                    branch = Branch.objects.get(id=branch_id)
            except (Branch.DoesNotExist, ValueError):
                return Response(
                    {'error': 'Invalid branch ID.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get or create customer
        customer_data = request.data.get('customer')
        if not customer_data:
            return Response(
                {'error': 'Customer data is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        customer = None
        generated_password = None  # Track password for new customers
        if 'id' in customer_data:
            # Use existing customer
            try:
                # First try to get customer by customer ID
                customer = Customer.objects.get(id=customer_data['id'])
            except Customer.DoesNotExist:
                # If that fails, try to get customer by user ID
                try:
                    customer = Customer.objects.get(user_id=customer_data['id'])
                except Customer.DoesNotExist:
                    return Response(
                        {'error': 'Customer not found.'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
        else:
            # Create new customer
            from users.models import User
            from django.contrib.auth.hashers import make_password
            
            # Generate password based on customer name and phone
            customer_name = customer_data.get('name', '')
            customer_phone = customer_data.get('phone', '')
            generated_password = generate_customer_password(customer_name, customer_phone)
            
            # Handle email: if it's a walk-in email (auto-generated), make it unique per branch
            customer_email = customer_data.get('email', '')
            if customer_email and customer_email.endswith('@walkin.local'):
                # Generate unique walk-in email by including branch ID
                # Pattern: phone_branchID@walkin.local (e.g., 9878768767_65@walkin.local)
                if branch:
                    customer_email = f"{customer_phone}_{branch.id}@walkin.local"
                else:
                    customer_email = f"{customer_phone}@walkin.local"         
            # Create user for customer
            user_data = {
                'name': customer_name,
                'phone': customer_phone,
                'email': customer_email,
                'password': generated_password,  # Plain text password for create_user to hash
                'role': 'customer'
            }
            
            # Check if a user with this phone number already exists ANYWHERE in the system
            # If so, reuse them — don't create a duplicate user
            existing_user = User.objects.filter(
                phone=customer_phone,
                role='customer'
            ).first()
            if existing_user:
                # Reuse the existing user — get or create their Customer profile
                customer, _ = Customer.objects.get_or_create(
                    user=existing_user,
                    defaults={'company': request.user.company}
                )
                generated_password = None  # Existing customer — no password to display
                # Skip the rest of the "create new user" block
            else:
                # Proceed with creating a brand new user
                try:
                    # Use create_user method which properly triggers validation
                    # Auto-assign branch for admin-created customers
                    if 'branch' not in user_data and request.user and request.user.is_authenticated:
                        # For branch admin, use their assigned branch
                        if request.user.role == 'branch_admin' and request.user.branch:
                            user_data['branch'] = request.user.branch
                        # For super admin and company admin, use the branch from the request
                        elif request.user.role in ['super_admin', 'company_admin']:
                            # We already validated and fetched the 'branch' object above
                            if branch:
                                user_data['branch'] = branch
                    
                    # Set company for the new user
                    user_data['company'] = request.user.company
                    
                    user_instance = User.objects.create_user(**user_data)
                    user_instance.is_verified = True  # Admin-created customers should be verified
                    user_instance.save()
                    
                    # Create customer profile with the same company
                    customer = Customer.objects.create(
                        user=user_instance,
                        company=request.user.company
                    )
                except Exception as e:
                    # Handle validation errors and other exceptions during user creation
                    error_message = str(e)
                    if 'phone' in error_message.lower():
                        return Response(
                            {'error': 'Please enter a valid phone number. Phone number should be exactly 10 digits.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    elif 'email' in error_message.lower():
                        return Response(
                            {'error': 'Please enter a valid email address.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    else:
                        return Response(
                            {'error': f'Error creating customer: {error_message}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )        
        # Get or create vehicle
        vehicle_data = request.data.get('vehicle')
        if not vehicle_data:
            return Response(
                {'error': 'Vehicle data is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        vehicle = None
        if 'id' in vehicle_data:
            # Use existing vehicle
            try:
                vehicle = Vehicle.objects.get(id=vehicle_data['id'])
                # Verify vehicle belongs to customer
                if vehicle.customer != customer:
                    return Response(
                        {'error': 'Selected vehicle does not belong to this customer.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Vehicle.DoesNotExist:
                return Response(
                    {'error': 'Vehicle not found.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Create new vehicle — sanitize fields before saving
            vehicle_data['customer'] = customer
            # year must be an integer or None; empty string causes a DB error
            raw_year = vehicle_data.get('year')
            if raw_year == '' or raw_year is None:
                vehicle_data['year'] = None
            else:
                try:
                    vehicle_data['year'] = int(raw_year)
                except (ValueError, TypeError):
                    vehicle_data['year'] = None
            # Ensure color is never None (CharField)
            if not vehicle_data.get('color'):
                vehicle_data['color'] = ''
            # Auto-assign company
            vehicle_data.setdefault('company', request.user.company)
            try:
                vehicle = Vehicle.objects.create(**vehicle_data)
            except Exception as e:
                return Response(
                    {'error': f'Error creating vehicle: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate packages — accept package_ids (list) OR legacy single `package` key
        package_ids = request.data.get('package_ids')
        if not package_ids:
            # Backward compat: support single `package` key
            single_pkg = request.data.get('package')
            if single_pkg:
                package_ids = [single_pkg]

        if not package_ids:
            return Response(
                {'error': 'At least one service package is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        packages = []
        try:
            from services.models import ServicePackage
            for pkg_id in package_ids:
                try:
                    pkg = ServicePackage.objects.get(id=pkg_id)
                    # Check if package belongs to branch (if not global)
                    if not pkg.is_global and pkg.branch != branch:
                        return Response(
                            {'error': f'Service "{pkg.name}" is not available at this branch.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    packages.append(pkg)
                except ServicePackage.DoesNotExist:
                    return Response(
                        {'error': f'Package with ID {pkg_id} not found.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
        except Exception as e:
            return Response(
                {'error': f'Error validating packages: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get addons
        addon_ids = request.data.get('addon_ids', [])
        addons = []
        if addon_ids:
            try:
                from services.models import AddOn
                addons = list(AddOn.objects.filter(id__in=addon_ids))
                
                # Validate that all requested addons were found
                found_addon_ids = [addon.id for addon in addons]
                missing_addon_ids = [aid for aid in addon_ids if aid not in found_addon_ids]
                if missing_addon_ids:
                    return Response(
                        {'error': f'Add-ons with IDs {missing_addon_ids} not found.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate addon branch assignment
                for addon in addons:
                    if not addon.is_global and addon.branch != branch:
                        return Response(
                            {'error': f'Add-on "{addon.name}" is not available at this branch.'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
            except Exception as e:
                return Response(
                    {'error': f'Error processing add-ons: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create booking
        # Parse booking datetime string to datetime object
        booking_datetime_str = request.data.get('booking_datetime')
        try:
            # Handle datetime-local format from frontend (YYYY-MM-DDTHH:MM)
            if isinstance(booking_datetime_str, str) and 'T' in booking_datetime_str:
                # Split date and time parts
                date_part, time_part = booking_datetime_str.split('T')
                # Parse to datetime object
                naive_datetime = datetime.strptime(f'{date_part} {time_part}', '%Y-%m-%d %H:%M')
                # Make timezone aware
                booking_datetime = timezone.make_aware(naive_datetime)
            else:
                # Fallback to fromisoformat for other formats
                naive_datetime = datetime.fromisoformat(booking_datetime_str)
                # Make timezone aware
                booking_datetime = timezone.make_aware(naive_datetime)
        except (ValueError, TypeError) as e:
            return Response(
                {'error': f'Invalid datetime format: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        
        # Get vehicle type for pricing
        # Priority 1: Use explicitly provided vehicle_type
        # Priority 2: Use vehicle's stored vehicle_type
        # Priority 3: Default to 'sedan'
        vehicle_type = request.data.get('vehicle_type')
        if not vehicle_type and vehicle:
            vehicle_type = vehicle.vehicle_type
        if not vehicle_type:
            vehicle_type = 'sedan'
            
        if vehicle_type not in ['hatchback', 'sedan', 'suv', 'bike']:
            return Response(
                {'error': 'vehicle_type must be one of: hatchback, sedan, suv, bike'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Handle coupon if provided
        coupon = None
        coupon_code = request.data.get('coupon_code')
        if coupon_code:
            try:
                from memberships.models import Coupon
                # Get the coupon by code
                coupon = Coupon.objects.filter(code=coupon_code.upper()).first()
                if not coupon:
                    return Response(
                        {'error': f'Coupon code "{coupon_code}" not found.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate coupon for this customer
                is_valid, message = coupon.is_valid(customer=customer.user)
                if not is_valid:
                    return Response(
                        {'error': f'Coupon validation failed: {message}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if coupon is applicable to any of the selected services
                applicable_pkg_ids = [p.id for p in coupon.applicable_services.all()]
                if coupon.applicable_services.exists():
                    selected_pkg_ids = [p.id for p in packages]
                    if not any(pid in applicable_pkg_ids for pid in selected_pkg_ids):
                        return Response(
                            {'error': 'This coupon is not applicable to any of the selected services.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # Check category-based applicability (at least one package must match)
                if coupon.applicable_categories and len(coupon.applicable_categories) > 0:
                    package_categories = [p.category for p in packages]
                    if not any(cat in coupon.applicable_categories for cat in package_categories):
                        return Response(
                            {'error': 'This coupon is not applicable to any of the selected service categories.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            except Exception as e:
                return Response(
                    {'error': f'Error validating coupon: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        # Handle referral code if provided
        referral_code = None
        # Check both in customer data (new customer) and top level dispatch
        if isinstance(request.data.get('customer'), dict):
            referral_code = request.data.get('customer', {}).get('referral_code')
        
        if not referral_code:
            referral_code = request.data.get('referral_code')
            
        validated_referral_code = None
        if referral_code:
            try:
                from customers.referral_models import ReferralCode
                
                # Check if this could be customer's first booking
                # If it's a new customer (no ID in customer_data), it's definitely first
                is_first_booking = 'id' not in (request.data.get('customer') or {})
                if not is_first_booking:
                    is_first_booking = Booking.objects.filter(customer=customer).count() == 0
                
                if is_first_booking:
                    try:
                        code_obj = ReferralCode.objects.get(code=referral_code.upper(), is_active=True)
                        # Prevent self-referral
                        if code_obj.customer != customer:
                            validated_referral_code = referral_code.upper()
                    except ReferralCode.DoesNotExist:
                        pass
            except Exception:
                pass

        booking_data = {
            'customer': customer,
            'vehicle': vehicle,
            'vehicle_type': vehicle_type,
            'booking_datetime': booking_datetime,
            'pickup_required': request.data.get('pickup_required', False),
            'location': request.data.get('location', ''),
            'notes': request.data.get('notes', ''),
            'branch': branch,
            'status': 'pending',
            'coupon': coupon,
            'referral_code_used': validated_referral_code,
            'discount_amount': request.data.get('discount_amount', 0),
            'company': request.user.company
        }
        
        try:
            # Create booking — packages M2M assigned after first save
            booking = Booking(**booking_data)
            booking.save(addons=addons)  # save first (needs PK for M2M)

            # Assign packages M2M
            booking.packages.set(packages)
            # Also set primary_package (first package) for legacy compatibility
            if packages:
                booking.primary_package = packages[0]
                booking.save(skip_calculation=True)

            # Re-calculate prices now that M2M is fully set
            subtotal, gst_amount, total_price = booking.calculate_prices(addons=addons)
            booking.subtotal = subtotal
            booking.gst_amount = gst_amount
            booking.total_price = total_price
            booking.save(skip_calculation=True)

            # Add addons to M2M
            if addons:
                booking.addons.set(addons)

            # Handle washing plan usage (check all selected packages for wash)
            wash_packages = [p for p in packages if 'wash' in p.name.lower()]
            if wash_packages:
                try:
                    from memberships.models import CustomerMembership

                    active_memberships = CustomerMembership.objects.filter(
                        customer=customer.user,
                        status='active'
                    ).select_related('plan')

                    active_membership = None
                    for membership in active_memberships:
                        if membership.washes_remaining > 0:
                            active_membership = membership
                            break

                    if active_membership:
                        active_membership.washes_used += 1
                        active_membership.save()
                except Exception:
                    pass

            # Handle coupon usage tracking
            if coupon:
                try:
                    from memberships.models import CouponUsage

                    coupon.times_used += 1
                    if coupon.usage_limit > 0 and coupon.times_used >= coupon.usage_limit:
                        coupon.status = 'inactive'
                    coupon.save()

                    CouponUsage.objects.create(
                        coupon=coupon,
                        customer=customer.user,
                        booking=booking,
                        discount_applied=booking.discount_amount or 0,
                        order_value=booking.subtotal or 0,
                        used_at=timezone.now()
                    )
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to track coupon usage in admin_create: {str(e)}")

            # Handle appointment linking
            appointment_id = request.data.get('appointment_id')
            if appointment_id:
                try:
                    from appointments.models import Appointment
                    appointment = Appointment.objects.get(id=appointment_id)
                    appointment.booking = booking
                    appointment.status = 'converted'
                    if not appointment.reviewed_by:
                        appointment.reviewed_by = request.user
                        appointment.reviewed_at = timezone.now()
                    appointment.save()
                except Appointment.DoesNotExist:
                    pass
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to link appointment to booking: {str(e)}")

            # Create Referral record if code was validated
            if validated_referral_code:
                try:
                    from customers.referral_models import ReferralCode, Referral
                    code_obj = ReferralCode.objects.get(code=validated_referral_code)
                    Referral.objects.create(
                        referrer=code_obj.customer,
                        referee=customer,
                        referral_code=validated_referral_code,
                        status='pending'
                    )
                    code_obj.increment_usage()
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to create referral record: {str(e)}")

            # Handle pickup request creation
            if booking.pickup_required:
                pickup_time_str = request.data.get('pickup_time')
                if pickup_time_str:
                    try:
                        from pickup.models import PickupDropRequest
                        if isinstance(pickup_time_str, str) and 'T' in pickup_time_str:
                            date_part, time_part = pickup_time_str.split('T')
                            naive_datetime = datetime.strptime(f'{date_part} {time_part}', '%Y-%m-%d %H:%M')
                            pickup_time = timezone.make_aware(naive_datetime)
                        else:
                            naive_datetime = datetime.fromisoformat(pickup_time_str)
                            pickup_time = timezone.make_aware(naive_datetime)

                        PickupDropRequest.objects.create(
                            booking=booking,
                            pickup_time=pickup_time,
                            status='pending',
                            request_type='pickup'
                        )
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Failed to create pickup request: {str(e)}")

            # Serialize and return response
            serializer = BookingSerializer(booking, context={'request': request})
            response_data = serializer.data

            if generated_password:
                response_data['customer_password'] = generated_password
                response_data['customer_phone'] = customer_data.get('phone', '')
                response_data['customer_name'] = customer_data.get('name', '')

            if appointment_id:
                response_data['linked_appointment_id'] = appointment_id

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"admin_create error: {str(e)}\n{traceback.format_exc()}")
            return Response(
                {'error': f'Error creating booking: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


    @action(detail=True, methods=['patch'], url_path='admin_update')
    def admin_update(self, request, pk=None):
        """Allow admins to edit booking details after creation."""
        user = request.user
        if user.role not in ['company_admin', 'branch_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can update booking details.'},
                status=status.HTTP_403_FORBIDDEN
            )

        booking = self.get_object()

        # Don't allow editing cancelled bookings
        if booking.status == 'cancelled':
            return Response(
                {'error': 'Cannot edit a cancelled booking.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- booking_datetime ---
        booking_datetime_str = request.data.get('booking_datetime')
        if booking_datetime_str:
            try:
                if isinstance(booking_datetime_str, str) and 'T' in booking_datetime_str:
                    date_part, time_part = booking_datetime_str.split('T')
                    # Handle seconds if present (e.g. HH:MM:SS)
                    time_part = time_part[:5]
                    naive_dt = datetime.strptime(f'{date_part} {time_part}', '%Y-%m-%d %H:%M')
                    booking.booking_datetime = timezone.make_aware(naive_dt)
                else:
                    naive_dt = datetime.fromisoformat(booking_datetime_str)
                    booking.booking_datetime = timezone.make_aware(naive_dt)
            except (ValueError, TypeError) as e:
                return Response({'error': f'Invalid datetime format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        # --- vehicle_type ---
        vehicle_type = request.data.get('vehicle_type')
        if vehicle_type:
            if vehicle_type not in ['hatchback', 'sedan', 'suv', 'bike']:
                return Response({'error': 'vehicle_type must be one of: hatchback, sedan, suv, bike'}, status=status.HTTP_400_BAD_REQUEST)
            booking.vehicle_type = vehicle_type

        # --- notes / pickup / location ---
        if 'notes' in request.data:
            booking.notes = request.data.get('notes', '')
        if 'pickup_required' in request.data:
            booking.pickup_required = bool(request.data.get('pickup_required', False))
        if 'location' in request.data:
            booking.location = request.data.get('location', '')

        # --- branch ---
        branch_id = request.data.get('branch_id')
        if branch_id:
            from branches.models import Branch
            try:
                # Super admin can set any branch
                if user.role == 'super_admin':
                    booking.branch = Branch.objects.get(id=branch_id)
                # Company admin can only set branch within their company
                elif user.role == 'company_admin' and user.company:
                    booking.branch = Branch.objects.get(id=branch_id, company=user.company)
                # Branch admin shouldn't really change the branch unless to a branch they own? 
                # For now allow branch admin to change it if it's within their company (if they have company FK)
                # But usually branch admins stay in their branch. 
                # Let's keep it simple: super_admin and company_admin can change branch.
            except Branch.DoesNotExist:
                return Response({'error': 'Branch not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        # --- packages ---
        package_ids = request.data.get('package_ids')
        new_packages = None
        if package_ids is not None:
            from services.models import ServicePackage
            new_packages = []
            for pkg_id in package_ids:
                try:
                    pkg = ServicePackage.objects.get(id=pkg_id)
                    new_packages.append(pkg)
                except ServicePackage.DoesNotExist:
                    return Response({'error': f'Package with ID {pkg_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

        # --- addons ---
        addon_ids = request.data.get('addon_ids')
        new_addons = None
        if addon_ids is not None:
            from services.models import AddOn
            new_addons = list(AddOn.objects.filter(id__in=addon_ids))

        # Save scalar fields first
        booking.save(skip_calculation=True)

        # Update M2M: packages
        if new_packages is not None:
            booking.packages.set(new_packages)
            if new_packages:
                booking.primary_package = new_packages[0]
                booking.save(skip_calculation=True)

        # Update M2M: addons
        if new_addons is not None:
            booking.addons.set(new_addons)

        # Recalculate prices
        current_addons = list(booking.addons.all())
        subtotal, gst_amount, total_price = booking.calculate_prices(addons=current_addons)
        booking.subtotal = subtotal
        booking.gst_amount = gst_amount
        booking.total_price = total_price
        booking.save(skip_calculation=True)

        booking.refresh_from_db()
        serializer = BookingSerializer(booking, context={'request': request})
        return Response({
            'message': 'Booking updated successfully.',
            'booking': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['put'])
    def check_in(self, request, pk=None):
        """Check-in vehicle arrival (Phase 2)."""
        from django.utils import timezone
        
        booking = self.get_object()
        user = request.user
        
        # Only reception, floor manager, or admin can check in
        if user.role not in ['company_admin', 'branch_admin', 'floor_manager', 'super_admin']:
            return Response(
                {'error': 'Only reception staff, floor managers, or admins can check in vehicles.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify branch access for branch-scoped roles
        if user.role == 'branch_admin' and user.branch and booking.branch and user.branch != booking.branch:
            return Response(
                {'error': 'You can only check in vehicles for your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == 'floor_manager' and user.branch and booking.branch and user.branch != booking.branch:
            return Response(
                {'error': 'You can only check in vehicles for your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == 'company_admin' and user.company and booking.branch and booking.branch.company != user.company:
            return Response(
                {'error': 'You can only check in vehicles for your company.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already checked in
        if booking.status == 'vehicle_arrived':
            return Response(
                {'error': 'Vehicle has already been checked in.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate and clean initial photos data
        initial_photos = request.data.get('initial_photos', [])
        cleaned_photos = []
        
        if initial_photos:
            for photo in initial_photos:
                # Ensure photo is a string and a valid data URL
                if isinstance(photo, str):
                    # Check if it's already a clean data URL
                    if photo.startswith('data:image/'):
                        cleaned_photos.append(photo)
                    # Check if it contains HTTP response metadata and extract the actual data
                    elif 'data:image/' in photo:
                        # Extract the actual base64 data part
                        try:
                            # Find the data URL within the corrupted string
                            start_idx = photo.find('data:image/')
                            if start_idx != -1:
                                # Look for the end of the data URL (either end of string or a new line)
                                end_idx = photo.find('\n', start_idx)
                                if end_idx == -1:
                                    end_idx = len(photo)
                                
                                # Extract the clean data URL
                                clean_photo = photo[start_idx:end_idx].strip()
                                # Additional validation to ensure it's a proper data URL
                                if clean_photo.startswith('data:image/') and ';' in clean_photo and 'base64,' in clean_photo:
                                    cleaned_photos.append(clean_photo)
                        except Exception:
                            # If we can't parse it, skip this photo
                            pass
                    # Handle HTTP URLs (external images)
                    elif photo.startswith('http'):
                        cleaned_photos.append(photo)
        
        # Update booking with check-in data
        booking.vehicle_arrived_at = timezone.now()
        booking.checked_in_by = user
        booking.status = 'vehicle_arrived'
        booking.initial_photos = cleaned_photos
        booking.initial_damages = request.data.get('initial_damages', '')
        booking.check_in_notes = request.data.get('check_in_notes', '')
        booking.save()
        
        serializer = self.get_serializer(booking)
        return Response({
            'message': 'Vehicle checked in successfully.',
            'booking': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['put'])
    def cancel(self, request, pk=None):
        """Cancel a booking."""
        booking = self.get_object()
        
        # Only the customer or branch admin can cancel
        if booking.customer.user != request.user and request.user.role not in ['super_admin', 'branch_admin']:
            return Response({'error': 'You do not have permission to cancel this booking.'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        if booking.status in ['completed', 'cancelled']:
            return Response({'error': 'Cannot cancel a completed or already cancelled booking.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        booking.status = 'cancelled'
        booking.save()
        
        return Response({'message': 'Booking cancelled successfully.'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign_floor_manager(self, request, pk=None):
        """Assign a floor manager and create/update job card (Phase 3)."""
        booking = self.get_object()
        user = request.user
        
        # Only company admin, branch admin or super admin can assign floor manager
        if user.role not in ['company_admin', 'branch_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can assign floor managers.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify branch/company access
        if user.role == 'branch_admin' and user.branch and booking.branch and user.branch != booking.branch:
            return Response(
                {'error': 'You can only assign floor managers for bookings in your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == 'company_admin' and user.company and booking.branch and booking.branch.company != user.company:
            return Response(
                {'error': 'You can only assign floor managers for bookings in your company.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        floor_manager_id = request.data.get('floor_manager_id')
        if not floor_manager_id:
            return Response(
                {'error': 'floor_manager_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            floor_manager = User.objects.get(id=floor_manager_id, role='floor_manager')
            
            # Ensure floor manager belongs to the same branch as the booking
            if booking.branch and floor_manager.branch != booking.branch:
                return Response(
                    {'error': 'Floor manager must be from the same branch as the booking.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Resolve company: prefer user's company, fallback to booking's branch company
            company = getattr(user, 'company', None) or (booking.branch.company if booking.branch else None)
            
            # Create or update job card for this booking
            jobcard, created = JobCard.objects.get_or_create(
                booking=booking,
                defaults={
                    'floor_manager': floor_manager,
                    'branch': booking.branch,
                    'company': company,
                    'status': 'qc_pending',
                    # Explicitly set warning fields to prevent NOT NULL constraint violations
                    'warning_sent': False,
                    'warning_15min_sent': False,
                    'warning_10min_sent': False,
                    'warning_7min_sent': False,
                    'warning_5min_sent': False,
                    'warning_3min_sent': False,
                    'warning_2min_sent': False,
                    'warning_1min_sent': False,
                    'overdue_notification_sent': False,
                }
            )
            
            if not created:
                jobcard.floor_manager = floor_manager
                jobcard.branch = booking.branch
                if not jobcard.company:
                    jobcard.company = company
                jobcard.status = 'qc_pending'
                jobcard.save()
            
            # Update booking status to reflect that job card has been assigned to floor manager
            # This ensures the booking status accurately reflects operational progress
            booking.status = 'assigned_to_fm'  # or another appropriate status
            booking.save()
            
            # Refresh booking to get updated jobcard relationship
            booking.refresh_from_db()
            
            return Response(
                {
                    'message': 'Floor manager assigned successfully and job card is ready for QC.',
                    'booking': BookingSerializer(booking, context=self.get_serializer_context()).data
                },
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Floor manager not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error assigning floor manager: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign_technician(self, request, pk=None):
        """Assign a technician to a booking."""
        booking = self.get_object()
        user = request.user
        
        # Check permissions - only branch_admin, floor_manager, supervisor, and super_admin can assign technicians
        if user.role not in ['company_admin', 'branch_admin', 'super_admin', 'floor_manager', 'supervisor', 'applicator']:
            return Response({'error': 'You do not have permission to assign technicians.'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # For branch admins, floor managers, supervisors, and applicators, ensure they can only assign technicians from their branch
        if user.role in ['company_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator'] and user.role != 'company_admin' and user.branch:
            if booking.branch != user.branch:
                return Response({'error': 'You can only assign technicians to bookings in your branch.'}, 
                              status=status.HTTP_403_FORBIDDEN)
        
        technician_id = request.data.get('technician_id')
        if not technician_id:
            return Response({'error': 'Technician ID is required.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            technician = User.objects.get(id=technician_id, role='supervisor')
            
            # For branch admins, ensure technician belongs to their branch
            if user.role == 'branch_admin' and user.branch:
                if technician.branch != user.branch:
                    return Response({'error': 'You can only assign technicians from your branch.'}, 
                                  status=status.HTTP_403_FORBIDDEN)
            
            # For supervisor users, they can only assign themselves
            if user.role == 'supervisor' and technician.id != user.id:
                return Response({'error': 'Staff can only assign themselves to bookings.'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            # Update the booking status to confirmed when assigning a technician
            booking.status = 'confirmed'
            booking.save()
            
            # Create or update job card for this booking
            from jobcards.models import JobCard
            # Resolve company: prefer user's company, fallback to booking's branch company
            company = getattr(user, 'company', None) or (booking.branch.company if booking.branch else None)
            
            jobcard, created = JobCard.objects.get_or_create(
                booking=booking,
                defaults={
                    'technician': technician,
                    'supervisor': technician,  # Set supervisor as well for compatibility
                    'status': 'created',
                    'branch': booking.branch,  # Add branch from booking
                    'company': company,
                    # Explicitly set warning fields to prevent NOT NULL constraint violations
                    'warning_sent': False,
                    'warning_15min_sent': False,
                    'warning_10min_sent': False,
                    'warning_7min_sent': False,
                    'warning_5min_sent': False,
                    'warning_3min_sent': False,
                    'warning_2min_sent': False,
                    'warning_1min_sent': False,
                    'overdue_notification_sent': False,
                }
            )
            
            if not created:
                jobcard.technician = technician
                jobcard.supervisor = technician  # Set supervisor as well
                if jobcard.status == 'assigned' or not jobcard.status:
                    jobcard.status = 'created'
                jobcard.branch = booking.branch  # Ensure branch is set
                if not jobcard.company:
                    jobcard.company = company
                jobcard.save()
            
            # Send notification to customer about technician assignment
            try:
                from notify.utils import create_in_app_notification
                technician_name = technician.get_full_name() or technician.name or 'Technician'
                vehicle_info = f"{booking.vehicle.brand} {booking.vehicle.model}" if booking.vehicle else "your vehicle"
                
                create_in_app_notification(
                    user_id=booking.customer.user.id,
                    notification_type='technician_assigned',
                    title='Technician Assigned',
                    message=f'Technician {technician_name} has been assigned to your booking #{booking.id} for {vehicle_info}. Service will begin shortly.',
                    related_booking_id=booking.id,
                    related_jobcard_id=jobcard.id,
                    extra_data={
                        'technician_id': technician.id,
                        'technician_name': technician_name,
                        'vehicle': vehicle_info
                    }
                )
            except Exception as e:
                # Don't fail the assignment if notification fails
                pass
            
            return Response({
                'message': f'Technician {technician.get_full_name() or technician.username} assigned successfully.',
                'booking': BookingSerializer(booking, context=self.get_serializer_context()).data
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({'error': 'Technician not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'Error assigning technician: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)