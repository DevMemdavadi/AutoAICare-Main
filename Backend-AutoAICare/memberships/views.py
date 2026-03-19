"""
Views for Membership module.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import random
import string

from .models import (
    MembershipPlan,
    MembershipBenefit,
    CustomerMembership,
    MembershipBenefitUsage,
    Coupon,
    CouponUsage,
    MembershipCouponGeneration
)
from .serializers import (
    MembershipPlanSerializer,
    MembershipPlanListSerializer,
    MembershipBenefitSerializer,
    MembershipBenefitUsageSerializer,
    CustomerMembershipSerializer,
    CustomerMembershipDetailSerializer,
    CustomerMembershipCreateSerializer,
    CouponSerializer,
    CouponCreateSerializer,
    CouponValidateSerializer,
    CouponUsageSerializer,
    MembershipCouponGenerationSerializer
)
from .services import MembershipCouponService


class MembershipPlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing membership plans.
    """
    queryset = MembershipPlan.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MembershipPlanListSerializer
        return MembershipPlanSerializer
    
    def get_queryset(self):
        queryset = MembershipPlan.objects.all()
        user = self.request.user

        if user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(
                Q(company=user.company) | Q(is_global=True, company__isnull=True)
            )
        elif user.role == 'customer':
            # IMPORTANT: check customer role BEFORE generic branch check,
            # because customers can also have a branch assigned.
            # Customers see plans from their company + global plans.
            customer_company = getattr(user, 'company', None)
            if customer_company:
                queryset = queryset.filter(
                    Q(company=customer_company) | Q(is_global=True, company__isnull=True),
                    is_active=True
                )
            else:
                queryset = queryset.filter(is_global=True, is_active=True)
        elif hasattr(user, 'branch') and user.branch:
            # Staff / branch-level users see plans scoped to their branch or company-globals
            queryset = queryset.filter(
                Q(branch=user.branch) | Q(is_global=True, company=user.branch.company) | Q(is_global=True, company__isnull=True)
            )
        else:
            queryset = queryset.none()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by tier
        tier = self.request.query_params.get('tier')
        if tier:
            queryset = queryset.filter(tier=tier)
        
        # Filter by branch
        branch = self.request.query_params.get('branch')
        if branch:
            queryset = queryset.filter(Q(is_global=True) | Q(branch_id=branch))
        
        return queryset.order_by('display_order', 'tier')
    
    def perform_create(self, serializer):
        """Set company on new membership plan."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public(self, request):
        """Get active membership plans for public display."""
        if not request.user or not request.user.is_authenticated:
            # Start with global plans (visible to everyone)
            queryset = MembershipPlan.objects.filter(is_active=True, is_global=True)

            # Also include company-specific plans when a company param is provided
            company_id = request.query_params.get('company')
            if company_id:
                from django.db.models import Q
                try:
                    company_id = int(company_id)
                    queryset = MembershipPlan.objects.filter(
                        Q(is_global=True) | Q(company_id=company_id),
                        is_active=True
                    )
                except (ValueError, TypeError):
                    pass
        else:
            queryset = self.get_queryset().filter(is_active=True)
        serializer = MembershipPlanListSerializer(queryset, many=True)
        return Response(serializer.data)


class MembershipBenefitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing membership benefits.
    """
    queryset = MembershipBenefit.objects.all()
    serializer_class = MembershipBenefitSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = MembershipBenefit.objects.select_related('plan')
        
        if user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(plan__company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(
                Q(plan__branch=user.branch) | Q(plan__is_global=True, plan__company=user.branch.company)
            )
        else:
            queryset = queryset.none()
        
        plan = self.request.query_params.get('plan')
        if plan:
            queryset = queryset.filter(plan_id=plan)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set company on new membership benefit."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)


class CustomerMembershipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing customer memberships.
    """
    queryset = CustomerMembership.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerMembershipCreateSerializer
        return CustomerMembershipSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = CustomerMembership.objects.select_related(
            'customer', 'vehicle', 'plan', 'branch'
        )
        
        if user.role == 'customer':
            queryset = queryset.filter(customer=user)
        elif user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(branch=user.branch)
        else:
            queryset = queryset.none()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by customer
        customer = self.request.query_params.get('customer')
        if customer:
            queryset = queryset.filter(customer_id=customer)
        
        # Filter by branch
        branch = self.request.query_params.get('branch')
        if branch:
            queryset = queryset.filter(branch_id=branch)
        
        # Filter active only
        active_only = self.request.query_params.get('active_only')
        if active_only and active_only.lower() == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                status='active',
                start_date__lte=today,
                end_date__gte=today
            )
        
        return queryset.order_by('-purchase_date')
    
    def perform_create(self, serializer):
        """Set company and created_by on new customer membership."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(created_by=user, company=company)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a pending membership."""
        membership = self.get_object()
        
        if membership.status != 'pending':
            return Response(
                {'error': 'Only pending memberships can be activated'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        membership.status = 'active'
        membership.save(update_fields=['status'])
        
        # Generate initial coupons if plan has monthly coupons
        if membership.plan.coupons_per_month > 0:
            self._generate_monthly_coupons(membership)
        
        serializer = CustomerMembershipSerializer(membership)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a membership."""
        membership = self.get_object()
        
        if membership.status in ['cancelled', 'expired']:
            return Response(
                {'error': 'Membership is already cancelled or expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        membership.status = 'cancelled'
        membership.save(update_fields=['status'])
        
        serializer = CustomerMembershipSerializer(membership)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def use_free_wash(self, request, pk=None):
        """Use a free wash from membership."""
        membership = self.get_object()
        
        if not membership.is_active:
            return Response(
                {'error': 'Membership is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if membership.use_free_wash():
            return Response({
                'success': True,
                'message': 'Free wash used successfully',
                'washes_remaining': membership.washes_remaining
            })
        else:
            return Response(
                {'error': 'No free washes remaining'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def use_free_interior_cleaning(self, request, pk=None):
        """Use a free interior cleaning from membership."""
        membership = self.get_object()
        
        if not membership.is_active:
            return Response(
                {'error': 'Membership is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if membership.use_free_interior_cleaning():
            return Response({
                'success': True,
                'message': 'Free interior cleaning used successfully',
                'interior_cleanings_remaining': membership.interior_cleanings_remaining
            })
        else:
            return Response(
                {'error': 'No free interior cleanings remaining'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def generate_coupons(self, request, pk=None):
        """Manually generate monthly coupons for a membership."""
        membership = self.get_object()
        
        if not membership.is_active:
            return Response(
                {'error': 'Membership is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        coupons = self._generate_monthly_coupons(membership)
        
        return Response({
            'success': True,
            'message': f'{len(coupons)} coupons generated',
            'coupons': CouponSerializer(coupons, many=True).data
        })
    
    @action(detail=True, methods=['get'])
    def coupons(self, request, pk=None):
        """Get all coupons for a membership."""
        membership = self.get_object()
        coupons = membership.generated_coupons.all()
        serializer = CouponSerializer(coupons, many=True)
        return Response(serializer.data)
    
    def _generate_monthly_coupons(self, membership):
        """Generate monthly coupons for a membership."""
        now = timezone.now()
        month = now.month
        year = now.year
        
        # Check if already generated for this month
        existing = MembershipCouponGeneration.objects.filter(
            membership=membership,
            month=month,
            year=year
        ).first()
        
        if existing:
            return []
        
        # Generate coupons
        coupons = []
        for _ in range(membership.plan.coupons_per_month):
            coupon = Coupon.objects.create(
                code=Coupon.generate_code(prefix='MEM'),
                coupon_type='percentage',
                discount_percentage=membership.plan.coupon_discount_percentage,
                valid_from=now,
                valid_until=now + timedelta(days=30),
                usage_limit=1,
                is_single_user=True,
                customer=membership.customer,
                source_membership=membership,
                is_membership_coupon=True,
                branch=membership.branch,
                company=membership.company,
                description=f'Membership coupon from {membership.plan.name}'
            )
            coupons.append(coupon)
        
        # Record generation
        MembershipCouponGeneration.objects.create(
            membership=membership,
            month=month,
            year=year,
            coupons_generated=len(coupons)
        )
        
        return coupons
    
    @action(detail=True, methods=['get'])
    def available_benefits(self, request, pk=None):
        """Get all available benefits with remaining counts for a membership."""
        membership = self.get_object()
        
        if not membership.is_active:
            return Response(
                {'error': 'Membership is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all benefit usages for this membership
        benefit_usages = membership.benefit_usages.filter(
            benefit__is_active=True
        ).select_related('benefit', 'benefit__service_package')
        
        # Filter only available benefits
        available = [bu for bu in benefit_usages if bu.is_available]
        
        serializer = MembershipBenefitUsageSerializer(available, many=True, context={'request': request})
        
        return Response({
            'membership_id': membership.membership_id,
            'plan_name': membership.plan.name,
            'benefits': serializer.data,
            'total_benefits': len(available)
        })
    
    @action(detail=True, methods=['post'])
    def apply_benefit(self, request, pk=None):
        """Apply a benefit to a booking."""
        membership = self.get_object()
        benefit_usage_id = request.data.get('benefit_usage_id')
        service_package_id = request.data.get('service_package_id')
        booking_amount = request.data.get('booking_amount')
        
        if not benefit_usage_id:
            return Response(
                {'error': 'benefit_usage_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            benefit_usage = MembershipBenefitUsage.objects.get(
                id=benefit_usage_id,
                customer_membership=membership
            )
        except MembershipBenefitUsage.DoesNotExist:
            return Response(
                {'error': 'Benefit usage not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not benefit_usage.is_available:
            return Response(
                {'error': 'Benefit is no longer available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate discount
        from decimal import Decimal
        benefit = benefit_usage.benefit
        booking_amount = Decimal(str(booking_amount)) if booking_amount else Decimal('0')
        
        if benefit.discount_percentage > 0:
            discount = (booking_amount * benefit.discount_percentage) / Decimal('100')
        elif benefit.discount_fixed_amount > 0:
            discount = min(benefit.discount_fixed_amount, booking_amount)
        else:
            discount = Decimal('0')
        
        return Response({
            'success': True,
            'benefit': MembershipBenefitSerializer(benefit).data,
            'discount_amount': str(discount),
            'final_amount': str(booking_amount - discount),
            'benefit_usage_id': benefit_usage.id
        })
    
    @action(detail=True, methods=['get'])
    def benefit_usage_history(self, request, pk=None):
        """Get history of benefit usage for a membership."""
        membership = self.get_object()
        
        benefit_usages = membership.benefit_usages.select_related(
            'benefit', 'benefit__service_package'
        ).order_by('-last_used_at')
        
        serializer = MembershipBenefitUsageSerializer(benefit_usages, many=True, context={'request': request})
        
        return Response({
            'membership_id': membership.membership_id,
            'usage_history': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def my_memberships(self, request):
        """Get current user's memberships."""
        memberships = self.get_queryset().filter(customer=request.user)
        serializer = CustomerMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_active_membership(self, request):
        """Get current user's active membership."""
        today = timezone.now().date()
        membership = self.get_queryset().filter(
            customer=request.user,
            status='active',
            start_date__lte=today,
            end_date__gte=today
        ).first()
        
        if membership:
            serializer = CustomerMembershipSerializer(membership)
            return Response(serializer.data)
        
        return Response(
            {
                'has_membership': False,
                'membership': None,
                'message': 'You do not have an active membership. Explore our plans to get started!'
            },
            status=status.HTTP_200_OK
        )


class CouponViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing coupons.
    """
    queryset = Coupon.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CouponCreateSerializer
        if self.action == 'validate':
            return CouponValidateSerializer
        return CouponSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Coupon.objects.select_related('customer', 'source_membership', 'branch')
        
        if user.role == 'customer':
            queryset = queryset.filter(
                Q(customer=user) | Q(customer__isnull=True, is_single_user=False)
            )
        elif user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(
                Q(branch=user.branch) | Q(is_global=True, company=user.branch.company)
            )
        else:
            queryset = queryset.none()
        
        # Filter by customer (for admin/staff to view specific customer's coupons)
        customer_id = self.request.query_params.get('customer')
        if customer_id and user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor']:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by type
        coupon_type = self.request.query_params.get('type')
        if coupon_type:
            queryset = queryset.filter(coupon_type=coupon_type)
        
        # Filter by membership coupons
        membership_only = self.request.query_params.get('membership_only')
        if membership_only and membership_only.lower() == 'true':
            queryset = queryset.filter(is_membership_coupon=True)
        
        # Filter by branch
        branch = self.request.query_params.get('branch')
        if branch:
            queryset = queryset.filter(Q(is_global=True) | Q(branch_id=branch))
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Set company on manually created coupons."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company, created_by=user)
    
    @action(detail=False, methods=['post'])
    def validate(self, request):
        """Validate a coupon code."""
        serializer = CouponValidateSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            coupon = serializer.validated_data['coupon']
            response_data = {
                'valid': True,
                'coupon': CouponSerializer(coupon).data
            }
            if 'discount' in serializer.validated_data:
                response_data['discount'] = serializer.validated_data['discount']
            # Include membership vehicle details when present
            if 'membership_vehicle_id' in serializer.validated_data:
                response_data['membership_vehicle_id'] = serializer.validated_data['membership_vehicle_id']
                response_data['membership_vehicle_type'] = serializer.validated_data['membership_vehicle_type']
            return Response(response_data)
        
        return Response({
            'valid': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply a coupon to an order."""
        coupon = self.get_object()
        order_value = request.data.get('order_value')
        
        if not order_value:
            return Response(
                {'error': 'order_value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order_value = float(order_value)
        except ValueError:
            return Response(
                {'error': 'Invalid order_value'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_valid, message = coupon.is_valid(customer=request.user, order_value=order_value)
        
        if not is_valid:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        from decimal import Decimal
        discount = coupon.calculate_discount(Decimal(str(order_value)))
        
        return Response({
            'success': True,
            'coupon_code': coupon.code,
            'discount': str(discount),
            'final_amount': str(Decimal(str(order_value)) - discount)
        })
    
    @action(detail=True, methods=['post'])
    def use(self, request, pk=None):
        """Mark coupon as used and create usage record."""
        coupon = self.get_object()
        order_value = request.data.get('order_value', 0)
        booking_id = request.data.get('booking_id')
        
        is_valid, message = coupon.is_valid(customer=request.user, order_value=order_value)
        
        if not is_valid:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        from decimal import Decimal
        discount = coupon.calculate_discount(Decimal(str(order_value)))
        
        # Create usage record
        usage = CouponUsage.objects.create(
            coupon=coupon,
            customer=request.user,
            booking_id=booking_id,
            discount_applied=discount,
            order_value=order_value
        )
        
        # Mark coupon as used
        coupon.use()
        
        return Response({
            'success': True,
            'usage': CouponUsageSerializer(usage).data
        })
    
    @action(detail=False, methods=['get'])
    def my_coupons(self, request):
        """Get current user's available coupons."""
        now = timezone.now()
        coupons = self.get_queryset().filter(
            Q(customer=request.user) | Q(customer__isnull=True, is_single_user=False),
            status='active',
            valid_from__lte=now,
            valid_until__gte=now
        )
        serializer = CouponSerializer(coupons, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_for_service(self, request):
        """Get available coupons for a specific service."""
        service_id = request.query_params.get('service_id')
        booking_amount = request.query_params.get('booking_amount')
        
        if not service_id:
            return Response(
                {'error': 'service_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        now = timezone.now()
        
        # Get user's coupons
        coupons = self.get_queryset().filter(
            Q(customer=request.user) | Q(customer__isnull=True, is_single_user=False),
            status='active',
            valid_from__lte=now,
            valid_until__gte=now
        )
        
        # Filter by applicable services
        coupons = coupons.filter(
            Q(applicable_services__id=service_id) | Q(applicable_services__isnull=True)
        ).distinct()
        
        # Calculate discount for each coupon if booking_amount provided
        coupon_data = []
        for coupon in coupons:
            data = CouponSerializer(coupon).data
            
            if booking_amount:
                from decimal import Decimal
                amount = Decimal(str(booking_amount))
                discount = coupon.calculate_discount(amount)
                data['calculated_discount'] = str(discount)
                data['final_amount'] = str(amount - discount)
            
            coupon_data.append(data)
        
        # Sort by discount amount (highest first)
        if booking_amount:
            coupon_data.sort(
                key=lambda x: float(x.get('calculated_discount', 0)),
                reverse=True
            )
        
        return Response({
            'service_id': service_id,
            'coupons': coupon_data,
            'total_coupons': len(coupon_data)
        })
    
    @action(detail=False, methods=['get'])
    def my_coupon_usage(self, request):
        """Get current customer's coupon usage history."""
        user = request.user
        
        # Only customers can access their own usage
        if user.role != 'customer':
            return Response(
                {'error': 'This endpoint is only for customers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        usages = CouponUsage.objects.filter(
            customer=user
        ).select_related(
            'coupon', 'booking', 'booking__primary_package'
        ).order_by('-used_at')
        
        serializer = CouponUsageSerializer(usages, many=True)
        
        # Calculate total savings
        total_savings = sum(float(usage.discount_applied) for usage in usages)
        
        return Response({
            'usages': serializer.data,
            'total_usages': usages.count(),
            'total_savings': total_savings
        })
    
    @action(detail=False, methods=['get'])
    def usage_report(self, request):
        """Get coupon usage report for admins."""
        user = request.user
        
        # Only admins can access usage reports
        if user.role not in ['admin', 'company_admin', 'branch_admin', 'super_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can access usage reports'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get filter parameters
        customer_id = request.query_params.get('customer_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_id = request.query_params.get('branch')
        
        usages = CouponUsage.objects.all()
        
        # Apply role-based filtering first
        if user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            usages = usages.filter(coupon__company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            usages = usages.filter(coupon__branch=user.branch)
        else:
            usages = usages.none()
        
        # Apply additional filters
        if customer_id:
            usages = usages.filter(customer_id=customer_id)
        if start_date:
            usages = usages.filter(used_at__gte=start_date)
        if end_date:
            usages = usages.filter(used_at__lte=end_date)
        if branch_id:
            usages = usages.filter(coupon__branch_id=branch_id)
        
        usages = usages.select_related(
            'coupon', 'customer', 'booking', 'booking__primary_package'
        ).order_by('-used_at')
        
        serializer = CouponUsageSerializer(usages, many=True)
        
        # Calculate statistics
        total_discounts = sum(float(usage.discount_applied) for usage in usages)
        total_redemptions = usages.count()
        
        return Response({
            'usages': serializer.data,
            'statistics': {
                'total_redemptions': total_redemptions,
                'total_discounts': total_discounts,
                'average_discount': total_discounts / total_redemptions if total_redemptions > 0 else 0
            }
        })



class CouponUsageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing coupon usage history.
    """
    queryset = CouponUsage.objects.all()
    serializer_class = CouponUsageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = CouponUsage.objects.select_related('coupon', 'customer', 'booking')
        
        if user.role == 'customer':
            queryset = queryset.filter(customer=user)
        elif user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(coupon__company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(coupon__branch=user.branch)
        else:
            queryset = queryset.none()
        
        # Filter by coupon
        coupon = self.request.query_params.get('coupon')
        if coupon:
            queryset = queryset.filter(coupon_id=coupon)
        
        # Filter by customer
        customer = self.request.query_params.get('customer')
        if customer:
            queryset = queryset.filter(customer_id=customer)
        
        return queryset.order_by('-used_at')
