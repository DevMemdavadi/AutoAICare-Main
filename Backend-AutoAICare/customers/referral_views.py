from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404

from .referral_models import Referral, ReferralCode
from .referral_serializers import (
    ReferralSerializer, 
    ReferralCodeSerializer,
    CreateReferralCodeSerializer,
    ApplyReferralCodeSerializer,
    ReferralStatsSerializer
)
from .models import Customer
from config.permissions import IsSuperAdmin, IsAdmin

# Alias for backward compatibility
IsBranchAdmin = IsAdmin


class ReferralViewSet(viewsets.ModelViewSet):
    """ViewSet for managing referrals."""
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter referrals based on user role."""
        user = self.request.user
        queryset = Referral.objects.all()
        
        # Apply role-based filtering
        if user.role == 'super_admin':
            # Super admin sees all referrals
            queryset = Referral.objects.all()
        elif user.role == 'company_admin':
            # Company admin sees all referrals for their company
            queryset = Referral.objects.filter(
                Q(referrer__user__company=user.company) | 
                Q(referee__user__company=user.company)
            )
        elif user.role in ['branch_admin', 'floor_manager']:
            # Branch staff see referrals from their branch customers
            queryset = Referral.objects.filter(
                Q(referrer__user__branch=user.branch) | 
                Q(referee__user__branch=user.branch)
            )
        elif user.role == 'customer':
            # Customers see their own referrals
            try:
                customer = user.customer_profile
                queryset = Referral.objects.filter(
                    Q(referrer=customer) | Q(referee=customer)
                )
            except Customer.DoesNotExist:
                queryset = Referral.objects.none()
        else:
            queryset = Referral.objects.none()
        
        # Support filtering by referrer user_id (for admin viewing customer details)
        referrer_user_id = self.request.query_params.get('referrer_user_id')
        if referrer_user_id and user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            queryset = queryset.filter(referrer__user__id=referrer_user_id)
        
        # Support filtering by referrer customer_id
        referrer_id = self.request.query_params.get('referrer')
        if referrer_id and user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            queryset = queryset.filter(referrer__id=referrer_id)
        
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin | IsBranchAdmin])
    def process_reward(self, request, pk=None):
        """Manually process rewards for a completed referral."""
        referral = self.get_object()
        
        # Provide detailed status information
        if referral.status == 'rewarded':
            return Response({
                'status': 'already_rewarded',
                'message': f'Rewards already processed on {referral.rewarded_at}',
                'referrer_amount': float(referral.referrer_points_awarded),
                'referee_amount': float(referral.referee_points_awarded)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if referral.status == 'pending':
            return Response({
                'status': 'not_completed',
                'message': 'Referral must be completed before processing rewards. Referee has not completed their first job yet.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = referral.process_rewards()
        
        if success:
            return Response({
                'status': 'success',
                'message': message,
                'referral': ReferralSerializer(referral).data
            })
        else:
            return Response({
                'status': 'error',
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin | IsBranchAdmin])
    def process_all_completed(self, request):
        """Process rewards for all completed referrals that haven't been rewarded yet."""
        from django.db import transaction
        
        # Find all completed referrals without rewards
        completed_referrals = Referral.objects.filter(
            status='completed',
            referrer_points_awarded=0
        )
        
        results = {
            'total_found': completed_referrals.count(),
            'processed': 0,
            'failed': 0,
            'details': []
        }
        
        for referral in completed_referrals:
            try:
                with transaction.atomic():
                    success, message = referral.process_rewards()
                    if success:
                        results['processed'] += 1
                        results['details'].append({
                            'id': referral.id,
                            'referrer': referral.referrer.user.name,
                            'referee': referral.referee.user.name,
                            'status': 'success',
                            'message': message
                        })
                    else:
                        results['failed'] += 1
                        results['details'].append({
                            'id': referral.id,
                            'referrer': referral.referrer.user.name,
                            'referee': referral.referee.user.name,
                            'status': 'failed',
                            'message': message
                        })
            except Exception as e:
                results['failed'] += 1
                results['details'].append({
                    'id': referral.id,
                    'referrer': referral.referrer.user.name,
                    'referee': referral.referee.user.name,
                    'status': 'error',
                    'message': str(e)
                })
        
        return Response(results)


class ReferralCodeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing referral codes."""
    queryset = ReferralCode.objects.all()
    serializer_class = ReferralCodeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter referral codes based on user role."""
        user = self.request.user
        queryset = ReferralCode.objects.all()
        
        # Apply role-based filtering
        if user.role == 'super_admin':
            queryset = ReferralCode.objects.all()
        elif user.role == 'company_admin':
            queryset = ReferralCode.objects.filter(customer__user__company=user.company)
        elif user.role in ['branch_admin', 'floor_manager']:
            queryset = ReferralCode.objects.filter(customer__user__branch=user.branch)
        elif user.role == 'customer':
            try:
                customer = user.customer_profile
                queryset = ReferralCode.objects.filter(customer=customer)
            except Customer.DoesNotExist:
                queryset = ReferralCode.objects.none()
        else:
            queryset = ReferralCode.objects.none()
        
        # Support filtering by user_id (for admin viewing customer details)
        user_id = self.request.query_params.get('user_id')
        if user_id and user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            queryset = queryset.filter(customer__user__id=user_id)
        
        # Support filtering by customer_id
        customer_id = self.request.query_params.get('customer')
        if customer_id and user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            queryset = queryset.filter(customer__id=customer_id)
        
        return queryset
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_code(self, request):
        """Get the current user's referral code."""
        try:
            customer = request.user.customer_profile
            
            # Check if customer has a referral code
            if hasattr(customer, 'referral_code_obj'):
                serializer = ReferralCodeSerializer(customer.referral_code_obj)
                return Response(serializer.data)
            else:
                return Response({
                    'status': 'no_code',
                    'message': 'You do not have a referral code yet. Complete your first job to get one!'
                }, status=status.HTTP_404_NOT_FOUND)
        
        except Customer.DoesNotExist:
            return Response({
                'error': 'Customer profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_code(self, request):
        """Create a referral code for the current user."""
        try:
            customer = request.user.customer_profile
            
            # Check if customer already has a code
            if hasattr(customer, 'referral_code_obj'):
                return Response({
                    'status': 'already_exists',
                    'message': 'You already have a referral code',
                    'code': ReferralCodeSerializer(customer.referral_code_obj).data
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate input
            serializer = CreateReferralCodeSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            custom_code = serializer.validated_data.get('custom_code', None)
            
            # Create referral code
            referral_code, created = ReferralCode.create_for_customer(customer, custom_code)
            
            if created:
                return Response({
                    'status': 'success',
                    'message': 'Referral code created successfully',
                    'code': ReferralCodeSerializer(referral_code).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'status': 'error',
                    'message': 'Failed to create referral code. Code may already be taken.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Customer.DoesNotExist:
            return Response({
                'error': 'Customer profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def validate_code(self, request):
        """Validate a referral code and return discount information."""
        from config.models import ReferralSettings
        
        serializer = ApplyReferralCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        referral_code = serializer.validated_data['referral_code']
        
        # Get referral settings
        settings = ReferralSettings.load()
        
        # Calculate referee discount (for the new customer using the code)
        booking_amount = request.data.get('booking_amount', 0)
        referee_discount = settings.calculate_referee_reward(booking_amount if booking_amount else None)
        
        return Response({
            'status': 'valid',
            'message': 'Referral code is valid',
            'code': ReferralCodeSerializer(referral_code).data,
            'discount': {
                'type': settings.referee_reward_type,
                'value': float(settings.referee_reward_value),
                'amount': float(referee_discount),
                'display_text': settings.get_referee_reward_display_text()
            }
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_stats(self, request):
        """Get referral statistics for the current user."""
        try:
            customer = request.user.customer_profile
            
            # Get referral code
            referral_code = ''
            times_code_used = 0
            if hasattr(customer, 'referral_code_obj'):
                referral_code = customer.referral_code_obj.code
                times_code_used = customer.referral_code_obj.times_used
            
            # Get referral statistics
            referrals = Referral.objects.filter(referrer=customer)
            
            stats = {
                'total_referrals': referrals.count(),
                'pending_referrals': referrals.filter(status='pending').count(),
                'completed_referrals': referrals.filter(status='completed').count(),
                'rewarded_referrals': referrals.filter(status='rewarded').count(),
                'total_rewards_earned': referrals.filter(status='rewarded').aggregate(
                    total=Sum('referrer_points_awarded')
                )['total'] or 0,
                'referral_code': referral_code,
                'times_code_used': times_code_used
            }
            
            serializer = ReferralStatsSerializer(stats)
            return Response(serializer.data)
        
        except Customer.DoesNotExist:
            return Response({
                'error': 'Customer profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
