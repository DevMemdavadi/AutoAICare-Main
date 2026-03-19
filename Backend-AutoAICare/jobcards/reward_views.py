from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.utils import timezone
from .models import RewardSettings, SupervisorReward, JobCard
from .serializers import RewardSettingsSerializer, SupervisorRewardSerializer
from .reward_service import RewardCalculationService


class RewardSettingsViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing reward settings
    Admin only
    """
    queryset = RewardSettings.objects.all()
    serializer_class = RewardSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter settings by company."""
        user = self.request.user

        # Determine company context
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return RewardSettings.objects.none()

        if user.role == 'super_admin' or user.is_superuser:
            return RewardSettings.objects.all()

        elif user.role == 'company_admin':
            # Company admin sees:
            #   - Company-wide setting (branch=NULL, company=this company)
            #   - All branch-specific settings for this company
            return RewardSettings.objects.filter(
                company=company,
            )

        elif user.role == 'branch_admin' and user.branch:
            # Branch admin sees their branch setting + company-wide default
            return RewardSettings.objects.filter(
                models.Q(company=company, branch=user.branch) |
                models.Q(company=company, branch__isnull=True)
            )

        # Supervisors / applicators / floor_managers — read-only, company scope
        if company:
            return RewardSettings.objects.filter(company=company)

        return RewardSettings.objects.none()
    
    def perform_create(self, serializer):
        """Auto-associate settings with user's company."""
        user = self.request.user
        branch = serializer.validated_data.get('branch')

        # Company admin or branch admin — force their company
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )

            # Security Check: If a branch is provided, it MUST belong to the user's company
            if branch and branch.company != company:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"branch": "Branch does not belong to your company."})

            serializer.save(company=company)
        else:
            # Superuser can set any company or none (global)
            serializer.save()

    def create(self, request, *args, **kwargs):
        """Only admins can create settings"""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can create reward settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Validate branch-company association on update."""
        user = self.request.user
        branch = serializer.validated_data.get('branch')

        if not user.is_superuser and branch:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if branch.company != company:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"branch": "Branch does not belong to your company."})

        serializer.save()
    
    def update(self, request, *args, **kwargs):
        """Only admins can update settings"""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can update reward settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Only super admins can delete settings"""
        if request.user.role != 'super_admin':
            return Response(
                {'error': 'Only super admins can delete reward settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def active_settings(self, request):
        """Get active settings for current branch/company context"""
        user = request.user
        branch = getattr(user, 'branch', None)
        company = getattr(user, 'company', None) or (
            branch.company if branch else None
        )
        settings = RewardCalculationService.get_active_settings(
            branch=branch, company=company
        )

        if settings:
            serializer = self.get_serializer(settings)
            return Response(serializer.data)

        return Response(
            {'error': 'No active reward settings found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'])
    def simulate(self, request, pk=None):
        """
        Simulate reward calculation for given parameters.
        Body (percentage mode):  { "job_value": 12000, "allowed_minutes": 60, "actual_minutes": 45 }
        Body (fixed-amount mode): { "allowed_minutes": 60, "actual_minutes": 45 }
        """
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can simulate rewards'},
                status=status.HTTP_403_FORBIDDEN
            )

        from decimal import Decimal
        settings = self.get_object()
        allowed = request.data.get('allowed_minutes', 60)
        actual  = request.data.get('actual_minutes', 60)
        time_diff = allowed - actual  # positive = early

        result = {
            'time_difference_minutes': time_diff,
            'status': 'on_time',
            'transaction_type': None,
            'total_amount': 0,
            'supervisor_amount': 0,
            'applicator_pool': 0,
            'tier': None,
            'reward_percentage': None,
            'base_reward': 0,
            'time_bonus': 0,
        }

        # ── Percentage-based path ────────────────────────────────────────────
        if getattr(settings, 'use_percentage_based_rewards', False):
            job_value = Decimal(str(request.data.get('job_value', 0)))

            # Determine tier
            tier = None
            reward_pct = Decimal('0')
            if job_value >= settings.tier_4_job_value_min:
                tier, reward_pct = 'tier_4', settings.tier_4_reward_percentage
            elif job_value >= settings.tier_3_job_value_min:
                tier, reward_pct = 'tier_3', settings.tier_3_reward_percentage
            elif job_value >= settings.tier_2_job_value_min:
                tier, reward_pct = 'tier_2', settings.tier_2_reward_percentage
            elif job_value >= settings.tier_1_job_value_min:
                tier, reward_pct = 'tier_1', settings.tier_1_reward_percentage

            if tier:
                base_reward = (job_value * reward_pct) / Decimal('100')
                time_bonus  = Decimal('0')

                if settings.apply_time_bonus and time_diff > 0:
                    intervals = time_diff // settings.time_bonus_interval_minutes
                    if intervals > 0:
                        bonus_pct  = settings.time_bonus_percentage * Decimal(intervals)
                        time_bonus = (job_value * bonus_pct) / Decimal('100')

                total = base_reward + time_bonus
                applicator_pct = settings.applicator_share_percentage / Decimal('100')

                result.update({
                    'status': 'early' if time_diff > 0 else 'on_time',
                    'transaction_type': 'reward',
                    'tier': tier,
                    'reward_percentage': float(reward_pct),
                    'base_reward': float(base_reward),
                    'time_bonus': float(time_bonus),
                    'total_amount': float(total),
                    'supervisor_amount': float(total * (Decimal('1') - applicator_pct)),
                    'applicator_pool': float(total * applicator_pct),
                })

            # Deductions still apply (late completion)
            elif time_diff < 0 and settings.deduction_enabled:
                minutes_late = abs(time_diff)
                if minutes_late >= settings.deduction_threshold_minutes:
                    deduction = min(
                        Decimal(minutes_late) * settings.deduction_per_minute,
                        settings.max_deduction_per_job
                    )
                    applicator_pct = settings.applicator_share_percentage / Decimal('100')
                    result.update({
                        'status': 'late',
                        'transaction_type': 'deduction',
                        'total_amount': float(deduction),
                        'supervisor_amount': float(deduction * (Decimal('1') - applicator_pct)),
                        'applicator_pool': float(deduction * applicator_pct)
                            if settings.apply_deduction_to_applicators else 0,
                    })

        # ── Fixed-amount path (legacy) ───────────────────────────────────────
        else:
            if time_diff > 0:
                if time_diff >= settings.tier_3_minutes:
                    result.update({'status': 'early', 'transaction_type': 'reward',
                                   'total_amount': float(settings.tier_3_amount), 'tier': 'tier_3'})
                elif time_diff >= settings.tier_2_minutes:
                    result.update({'status': 'early', 'transaction_type': 'reward',
                                   'total_amount': float(settings.tier_2_amount), 'tier': 'tier_2'})
                elif time_diff >= settings.tier_1_minutes:
                    result.update({'status': 'early', 'transaction_type': 'reward',
                                   'total_amount': float(settings.tier_1_amount), 'tier': 'tier_1'})

                if result['total_amount'] > 0:
                    pct = float(settings.applicator_share_percentage) / 100
                    result['supervisor_amount'] = result['total_amount'] * (1 - pct)
                    result['applicator_pool']   = result['total_amount'] * pct

            elif time_diff < 0 and settings.deduction_enabled:
                minutes_late = abs(time_diff)
                if minutes_late >= settings.deduction_threshold_minutes:
                    deduction = min(
                        minutes_late * float(settings.deduction_per_minute),
                        float(settings.max_deduction_per_job)
                    )
                    result.update({'status': 'late', 'transaction_type': 'deduction',
                                   'total_amount': deduction})
                    if settings.apply_deduction_to_applicators:
                        pct = float(settings.applicator_share_percentage) / 100
                        result['supervisor_amount'] = deduction * (1 - pct)
                        result['applicator_pool']   = deduction * pct
                    else:
                        result['supervisor_amount'] = deduction

        return Response(result)

    @action(detail=True, methods=['post'])
    def recalculate_rewards(self, request, pk=None):
        """
        Re-run reward calculation for all PENDING SupervisorReward records
        associated with this setting's company/branch.

        Only 'pending' records are touched — approved/paid records are never mutated.

        Returns: { "updated": N, "skipped": M, "errors": [...] }
        """
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can recalculate rewards'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings_obj = self.get_object()

        # Find all pending supervisor rewards scoped to this setting's company/branch
        pending_qs = SupervisorReward.objects.filter(status='pending')

        if settings_obj.branch:
            # Branch-level setting → limit to that branch's job cards
            pending_qs = pending_qs.filter(jobcard__branch=settings_obj.branch)
        elif settings_obj.company:
            # Company-level setting → all branches of the company
            pending_qs = pending_qs.filter(jobcard__company=settings_obj.company)

        updated = 0
        skipped = 0
        errors  = []

        for reward in pending_qs.select_related('jobcard', 'jobcard__booking__primary_package',
                                                'jobcard__branch'):
            try:
                jobcard = reward.jobcard
                if not jobcard.job_started_at:
                    skipped += 1
                    continue

                transaction_type, amount, tier, time_diff = \
                    RewardCalculationService.calculate_reward_or_deduction(
                        jobcard, settings=settings_obj
                    )

                if not transaction_type or amount == 0:
                    skipped += 1
                    continue

                # Determine this recipient's actual share
                if not reward.is_applicator_share:
                    # Supervisor share
                    applicator_pct = settings_obj.applicator_share_percentage / 100
                    final_amount = amount * (1 - applicator_pct)
                else:
                    # Applicator share — preserve split percentage
                    applicator_pct = settings_obj.applicator_share_percentage / 100
                    applicator_pool = amount * applicator_pct
                    split_pct = (reward.split_percentage or 100) / 100
                    final_amount = applicator_pool * split_pct

                reward.amount             = final_amount
                reward.transaction_type   = transaction_type
                reward.tier               = tier
                reward.time_difference_minutes = time_diff
                reward.calculation_notes  = (
                    f"[Recalculated {timezone.now().strftime('%Y-%m-%d %H:%M')}] "
                    f"Job completed {abs(time_diff)} min "
                    f"{'early' if time_diff > 0 else 'late'}"
                )
                reward.save(update_fields=[
                    'amount', 'transaction_type', 'tier',
                    'time_difference_minutes', 'calculation_notes'
                ])
                updated += 1

            except Exception as e:
                errors.append({'reward_id': reward.id, 'error': str(e)})

        return Response({
            'updated': updated,
            'skipped': skipped,
            'errors':  errors,
            'message': f'{updated} pending reward record(s) recalculated successfully.'
        })


class SupervisorRewardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for viewing supervisor rewards
    """
    queryset = SupervisorReward.objects.all()
    serializer_class = SupervisorRewardSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter rewards by company and branch."""
        user = self.request.user
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return SupervisorReward.objects.none()

        # Admins can see all within their scope
        if user.is_superuser or user.role == 'super_admin':
            queryset = SupervisorReward.objects.all_companies()
        elif user.role == 'company_admin':
            queryset = SupervisorReward.objects.filter(jobcard__company=company)
        elif user.role == 'branch_admin' and user.branch:
            queryset = SupervisorReward.objects.filter(jobcard__branch=user.branch)
        # Supervisors and applicators see their own
        elif user.role in ['supervisor', 'applicator']:
            queryset = SupervisorReward.objects.filter(recipient=user)
        else:
            queryset = SupervisorReward.objects.none()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by transaction type
        type_filter = self.request.query_params.get('transaction_type')
        if type_filter:
            queryset = queryset.filter(transaction_type=type_filter)
        
        # Filter by jobcard
        jobcard_id = self.request.query_params.get('jobcard_id')
        if jobcard_id:
            queryset = queryset.filter(jobcard_id=jobcard_id)
        
        return queryset.select_related('jobcard', 'recipient', 'payroll', 'approved_by')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get reward summary for current user"""
        user = request.user
        
        rewards = SupervisorReward.objects.filter(
            recipient=user,
            transaction_type='reward'
        )
        
        deductions = SupervisorReward.objects.filter(
            recipient=user,
            transaction_type='deduction'
        )
        
        summary = {
            'total_rewards': {
                'pending': float(rewards.filter(status='pending').aggregate(
                    total=models.Sum('amount'))['total'] or 0),
                'approved': float(rewards.filter(status='approved').aggregate(
                    total=models.Sum('amount'))['total'] or 0),
                'paid': float(rewards.filter(status='paid').aggregate(
                    total=models.Sum('amount'))['total'] or 0),
            },
            'total_deductions': {
                'pending': float(deductions.filter(status='pending').aggregate(
                    total=models.Sum('amount'))['total'] or 0),
                'approved': float(deductions.filter(status='approved').aggregate(
                    total=models.Sum('amount'))['total'] or 0),
                'paid': float(deductions.filter(status='paid').aggregate(
                    total=models.Sum('amount'))['total'] or 0),
            },
            'count': {
                'rewards': rewards.count(),
                'deductions': deductions.count()
            },
            'net_pending': float(
                (rewards.filter(status='pending').aggregate(total=models.Sum('amount'))['total'] or 0) -
                (deductions.filter(status='pending').aggregate(total=models.Sum('amount'))['total'] or 0)
            ),
            'net_approved': float(
                (rewards.filter(status='approved').aggregate(total=models.Sum('amount'))['total'] or 0) -
                (deductions.filter(status='approved').aggregate(total=models.Sum('amount'))['total'] or 0)
            )
        }
        
        return Response(summary)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a reward/deduction (admin only)"""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can approve rewards'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reward = self.get_object()
        
        if reward.status != 'pending':
            return Response(
                {'error': f'Cannot approve reward with status: {reward.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reward.status = 'approved'
        reward.approved_by = request.user
        reward.approved_at = timezone.now()
        reward.save()
        
        serializer = self.get_serializer(reward)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a reward/deduction (admin only)"""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can cancel rewards'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reward = self.get_object()
        
        if reward.status == 'paid':
            return Response(
                {'error': 'Cannot cancel a reward that has been paid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reward.status = 'cancelled'
        reward.save()
        
        serializer = self.get_serializer(reward)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        """Bulk approve rewards (admin only)"""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can approve rewards'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reward_ids = request.data.get('reward_ids', [])
        if not reward_ids:
            return Response(
                {'error': 'reward_ids list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rewards = self.get_queryset().filter(
            id__in=reward_ids,
            status='pending'
        )
        
        updated_count = rewards.update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count} rewards approved successfully',
            'approved_count': updated_count
        })
    
    @action(detail=False, methods=['get'])
    def potential_reward(self, request):
        """Get potential reward for an active job"""
        jobcard_id = request.query_params.get('jobcard_id')
        if not jobcard_id:
            return Response(
                {'error': 'jobcard_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        try:
            # Explicitly scope jobcard by company for security
            if user.is_superuser:
                jobcard = JobCard.objects.get(id=jobcard_id)
            else:
                jobcard = JobCard.objects.get(id=jobcard_id, company=company)
        except JobCard.DoesNotExist:
            return Response(
                {'error': 'Job card not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'supervisor', 'applicator']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user.role in ['supervisor', 'applicator']:
            if jobcard.supervisor != request.user and request.user not in jobcard.applicator_team.all():
                return Response(
                    {'error': 'You are not assigned to this job'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        potential = RewardCalculationService.get_potential_reward(jobcard)
        
        if potential:
            return Response(potential)
        else:
            return Response({
                'message': 'No reward or deduction applicable at this time',
                'time_difference_minutes': jobcard.get_remaining_minutes()
            })
