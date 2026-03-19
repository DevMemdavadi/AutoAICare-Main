from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from .models import JobCard, SupervisorReward, RewardSettings


class RewardCalculationService:
    """Service for calculating and distributing supervisor rewards"""
    
    @staticmethod
    def get_active_settings(branch=None, company=None, service_package=None):
        """
        Get active reward settings using a 3-level priority hierarchy:

          1. Service-specific  — if the package has custom reward config
          2. Branch-specific   — company + branch both set
          3. Company-wide      — company set, branch=NULL (default for all branches)
          4. True global       — both NULL (super_admin fallback only)

        Args:
            branch:          Branch instance (optional)
            company:         Company instance (optional — auto-resolved from branch if not given)
            service_package: ServicePackage instance (optional)

        Returns:
            RewardSettings instance or service_package, or None
        """
        # Priority 1: Service-specific settings
        if service_package and getattr(service_package, 'has_custom_rewards', False):
            return service_package

        # Resolve company from branch if not explicitly passed
        if branch and not company:
            company = getattr(branch, 'company', None)

        # Priority 2: Branch-specific settings (company + branch)
        if branch:
            settings = RewardSettings.objects.filter(
                branch=branch,
                is_active=True,
            ).first()
            if settings:
                return settings

        # Priority 3: Company-wide default (company set, branch=NULL)
        if company:
            settings = RewardSettings.objects.filter(
                company=company,
                branch__isnull=True,
                is_active=True,
            ).first()
            if settings:
                return settings

        # Priority 4: True global default (both NULL — super_admin only)
        return RewardSettings.objects.filter(
            company__isnull=True,
            branch__isnull=True,
            is_active=True,
        ).first()
    
    @staticmethod
    def get_settings_for_job(jobcard):
        """Get appropriate reward settings for a specific job card"""
        service_package = None
        if jobcard.booking and jobcard.booking.package:
            service_package = jobcard.booking.package
        
        return RewardCalculationService.get_active_settings(
            branch=jobcard.branch,
            service_package=service_package
        )
    
    @staticmethod
    def calculate_percentage_based_reward(jobcard, settings):
        """
        Calculate reward based on job value percentage
        
        Args:
            jobcard: JobCard instance
            settings: RewardSettings instance
        
        Returns:
            (transaction_type, amount, tier, time_difference, reward_percentage)
        """
        # Calculate job value
        job_value = Decimal('0')
        if jobcard.booking:
            if jobcard.booking.package:
                job_value += jobcard.booking.package.price
            
            # Add add-ons
            for addon in jobcard.booking.addons.all():
                job_value += addon.price
        
        # Add parts value
        for part_used in jobcard.parts_used.all():
            job_value += part_used.total_price
        
        if job_value == 0:
            return None, Decimal('0'), None, 0, None
        
        # Determine tier based on job value
        tier = None
        reward_percentage = Decimal('0')
        
        if job_value >= settings.tier_4_job_value_min:
            tier = 'tier_4'
            reward_percentage = settings.tier_4_reward_percentage
        elif job_value >= settings.tier_3_job_value_min:
            tier = 'tier_3'
            reward_percentage = settings.tier_3_reward_percentage
        elif job_value >= settings.tier_2_job_value_min:
            tier = 'tier_2'
            reward_percentage = settings.tier_2_reward_percentage
        elif job_value >= settings.tier_1_job_value_min:
            tier = 'tier_1'
            reward_percentage = settings.tier_1_reward_percentage
        else:
            # Job value below minimum tier
            return None, Decimal('0'), None, 0, None
        
        # Calculate base reward
        base_reward = (job_value * reward_percentage) / Decimal('100')
        
        # Calculate time difference
        allowed_minutes = jobcard.get_allowed_duration_minutes()
        actual_minutes = jobcard.get_elapsed_minutes()
        time_difference = allowed_minutes - actual_minutes  # Positive = saved, Negative = delayed
        
        # Apply time bonus if enabled and time was saved
        final_reward = base_reward
        if settings.apply_time_bonus and time_difference > 0:
            # Calculate number of bonus intervals
            bonus_intervals = time_difference // settings.time_bonus_interval_minutes
            if bonus_intervals > 0:
                bonus_percentage = settings.time_bonus_percentage * Decimal(bonus_intervals)
                time_bonus = (job_value * bonus_percentage) / Decimal('100')
                final_reward += time_bonus
        
        return 'reward', final_reward, tier, time_difference, reward_percentage
    
    @staticmethod
    def calculate_reward_or_deduction(jobcard, settings=None):
        """
        Calculate reward or deduction for a completed job
        Supports both fixed amount and percentage-based systems
        
        Returns: (transaction_type, amount, tier, time_difference)
        """
        if not jobcard.job_started_at:
            return None, Decimal('0'), None, 0
        
        # Get settings (service-specific > branch > global)
        if settings is None:
            settings = RewardCalculationService.get_settings_for_job(jobcard)
            
        if not settings:
            return None, Decimal('0'), None, 0
        
        # Check if percentage-based rewards are enabled
        if hasattr(settings, 'use_percentage_based_rewards') and settings.use_percentage_based_rewards:
            transaction_type, amount, tier, time_diff, percentage = \
                RewardCalculationService.calculate_percentage_based_reward(jobcard, settings)
            return transaction_type, amount, tier, time_diff
        
        # Original fixed-amount logic
        # Calculate time difference
        allowed_minutes = jobcard.get_allowed_duration_minutes()
        actual_minutes = jobcard.get_elapsed_minutes()
        time_difference = allowed_minutes - actual_minutes  # Positive = early, Negative = late
        
        # Early completion - Reward
        if time_difference > 0:
            if time_difference >= settings.tier_3_minutes:
                return 'reward', settings.tier_3_amount, 'tier_3', time_difference
            elif time_difference >= settings.tier_2_minutes:
                return 'reward', settings.tier_2_amount, 'tier_2', time_difference
            elif time_difference >= settings.tier_1_minutes:
                return 'reward', settings.tier_1_amount, 'tier_1', time_difference
        
        # Late completion - Deduction
        elif time_difference < 0 and settings.deduction_enabled:
            minutes_late = abs(time_difference)
            if minutes_late >= settings.deduction_threshold_minutes:
                deduction = min(
                    Decimal(minutes_late) * settings.deduction_per_minute,
                    settings.max_deduction_per_job
                )
                return 'deduction', deduction, None, time_difference
        
        return None, Decimal('0'), None, time_difference
    
    @staticmethod
    @transaction.atomic
    def create_reward_records(jobcard, custom_splits=None):
        """
        Create reward/deduction records for supervisor and applicator team
        
        Args:
            jobcard: JobCard instance
            custom_splits: Dict mapping applicator_id to split_percentage (optional)
                          Example: {1: 30.0, 2: 70.0} for custom distribution
                          If None, uses equal distribution
        """
        if not jobcard.supervisor:
            return []
        
        settings = RewardCalculationService.get_settings_for_job(jobcard)
        if not settings:
            return []
        
        transaction_type, total_amount, tier, time_diff = \
            RewardCalculationService.calculate_reward_or_deduction(jobcard)
        
        if not transaction_type or total_amount == 0:
            return []
        
        records = []
        allowed_minutes = jobcard.get_allowed_duration_minutes()
        actual_minutes = jobcard.get_elapsed_minutes()
        
        # Calculate supervisor and applicator shares
        if transaction_type == 'reward':
            applicator_share_pct = settings.applicator_share_percentage / Decimal('100')
            supervisor_amount = total_amount * (Decimal('1') - applicator_share_pct)
            applicator_pool = total_amount * applicator_share_pct
        else:  # deduction
            if settings.apply_deduction_to_applicators:
                applicator_share_pct = settings.applicator_share_percentage / Decimal('100')
                supervisor_amount = total_amount * (Decimal('1') - applicator_share_pct)
                applicator_pool = total_amount * applicator_share_pct
            else:
                supervisor_amount = total_amount
                applicator_pool = Decimal('0')
        
        # Create supervisor record
        supervisor_reward = SupervisorReward.objects.create(
            jobcard=jobcard,
            recipient=jobcard.supervisor,
            transaction_type=transaction_type,
            amount=supervisor_amount,
            allowed_duration_minutes=allowed_minutes,
            actual_duration_minutes=actual_minutes,
            time_difference_minutes=time_diff,
            tier=tier,
            calculation_notes=f"Job completed {abs(time_diff)} minutes {'early' if time_diff > 0 else 'late'}",
            is_applicator_share=False,
            status='pending'
        )
        records.append(supervisor_reward)
        
        # Distribute to applicator team
        applicators = jobcard.applicator_team.all()
        if applicators.exists() and applicator_pool > 0:
            applicator_count = applicators.count()
            
            # Use custom splits if provided, otherwise equal distribution
            if custom_splits:
                # Validate custom splits sum to 100
                total_split = sum(custom_splits.values())
                if abs(total_split - 100.0) > 0.01:  # Allow small floating point errors
                    raise ValueError(f"Custom splits must sum to 100%, got {total_split}%")
                
                for applicator in applicators:
                    split_pct = Decimal(str(custom_splits.get(applicator.id, 0))) / Decimal('100')
                    per_applicator = applicator_pool * split_pct
                    
                    applicator_reward = SupervisorReward.objects.create(
                        jobcard=jobcard,
                        recipient=applicator,
                        transaction_type=transaction_type,
                        amount=per_applicator,
                        allowed_duration_minutes=allowed_minutes,
                        actual_duration_minutes=actual_minutes,
                        time_difference_minutes=time_diff,
                        tier=tier,
                        calculation_notes=f"Custom split ({split_pct * 100}%) of {tier or 'deduction'} from job #{jobcard.id}",
                        is_applicator_share=True,
                        supervisor_reward=supervisor_reward,
                        split_percentage=split_pct * Decimal('100'),
                        status='pending'
                    )
                    records.append(applicator_reward)
            else:
                # Equal distribution
                per_applicator = applicator_pool / Decimal(applicator_count)
                
                for applicator in applicators:
                    applicator_reward = SupervisorReward.objects.create(
                        jobcard=jobcard,
                        recipient=applicator,
                        transaction_type=transaction_type,
                        amount=per_applicator,
                        allowed_duration_minutes=allowed_minutes,
                        actual_duration_minutes=actual_minutes,
                        time_difference_minutes=time_diff,
                        tier=tier,
                        calculation_notes=f"Equal share of {tier or 'deduction'} from job #{jobcard.id}",
                        is_applicator_share=True,
                        supervisor_reward=supervisor_reward,
                        status='pending'
                    )
                    records.append(applicator_reward)
        
        # Update performance metrics with reward information
        if hasattr(jobcard, 'performance') and jobcard.performance:
            jobcard.performance.reward_amount = total_amount
            
            # Store reward percentage if using percentage-based system
            if hasattr(settings, 'use_percentage_based_rewards') and settings.use_percentage_based_rewards:
                _, _, _, _, reward_percentage = \
                    RewardCalculationService.calculate_percentage_based_reward(jobcard, settings)
                if reward_percentage:
                    jobcard.performance.reward_percentage = reward_percentage
            
            jobcard.performance.save()
        
        return records
    
    
    @staticmethod
    def get_potential_reward(jobcard, settings=None):
        """
        Calculate potential reward if job is completed now (for display purposes)
        Returns dict with reward info
        """
        if not jobcard.job_started_at or jobcard.status == 'work_completed':
            return None
        
        transaction_type, amount, tier, time_diff = \
            RewardCalculationService.calculate_reward_or_deduction(jobcard, settings=settings)
        
        if not transaction_type:
            return None
        
        if settings is None:
            settings = RewardCalculationService.get_settings_for_job(jobcard)
            
        if not settings:
            return None
        
        # Handle both RewardSettings and ServicePackage objects
        # ServicePackage doesn't have applicator_share_percentage, use default 50%
        applicator_share_pct = Decimal('50.00')
        apply_deduction_to_applicators = True
        
        if hasattr(settings, 'applicator_share_percentage'):
            applicator_share_pct = settings.applicator_share_percentage
        if hasattr(settings, 'apply_deduction_to_applicators'):
            apply_deduction_to_applicators = settings.apply_deduction_to_applicators
        
        if transaction_type == 'reward':
            applicator_share_pct = applicator_share_pct / Decimal('100')
            supervisor_amount = amount * (Decimal('1') - applicator_share_pct)
        else:
            if apply_deduction_to_applicators:
                applicator_share_pct = applicator_share_pct / Decimal('100')
                supervisor_amount = amount * (Decimal('1') - applicator_share_pct)
            else:
                supervisor_amount = amount
        
        return {
            'transaction_type': transaction_type,
            'total_amount': float(amount),
            'supervisor_amount': float(supervisor_amount),
            'tier': tier,
            'time_difference_minutes': time_diff,
            'status': 'early' if time_diff > 0 else 'late'
        }
