"""
Management command to generate mock performance data for testing

Usage:
    python manage.py generate_performance_data
    python manage.py generate_performance_data --jobs 50
    python manage.py generate_performance_data --days 30
    python manage.py generate_performance_data --branch 1
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import datetime, timedelta, date
from decimal import Decimal
import random

from jobcards.models import JobCard, RewardSettings, SupervisorReward
from jobcards.performance_models import PerformanceMetrics, TeamPerformance
from jobcards.performance_service import PerformanceTrackingService
from jobcards.reward_service import RewardCalculationService
from accounting.services.performance_service import PerformanceService
from users.models import User
from branches.models import Branch
from bookings.models import Booking
from services.models import ServicePackage, AddOn


class Command(BaseCommand):
    help = 'Generate mock performance data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--jobs',
            type=int,
            default=30,
            help='Number of job cards to create (default: 30)'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to spread data across (default: 30)'
        )
        parser.add_argument(
            '--branch',
            type=int,
            help='Branch ID to create data for (optional, creates for all branches if not specified)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing performance data before generating new data'
        )
        parser.add_argument(
            '--mode',
            choices=['mock', 'real'],
            default='mock',
            help='Generation mode: "mock" (synthetic) or "real" (from existing job cards)'
        )
        parser.add_argument(
            '--recalculate-accounting',
            action='store_true',
            help='Recalculate monthly accounting performance metrics'
        )

    def handle(self, *args, **options):
        num_jobs = options['jobs']
        num_days = options['days']
        branch_id = options['branch']
        clear_data = options['clear']
        mode = options['mode']
        recalculate_accounting = options['recalculate_accounting']

        self.stdout.write(self.style.SUCCESS(f'Starting performance data generation (Mode: {mode})...'))

        # Clear existing data if requested
        if clear_data:
            self.stdout.write(self.style.WARNING('Clearing existing performance data...'))
            PerformanceMetrics.objects.all().delete()
            TeamPerformance.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared existing data'))

        # Get branches
        if branch_id:
            branches = Branch.objects.filter(id=branch_id)
            if not branches.exists():
                self.stdout.write(self.style.ERROR(f'Branch with ID {branch_id} not found'))
                return
        else:
            branches = Branch.objects.all()

        if not branches.exists():
            self.stdout.write(self.style.ERROR('No branches found. Please create at least one branch first.'))
            return

        # Get or create reward settings
        for branch in branches:
            settings, created = RewardSettings.objects.get_or_create(
                branch=branch,
                is_active=True,
                defaults={
                    'use_percentage_based_rewards': True,
                    'tier_1_job_value_min': Decimal('5000'),
                    'tier_1_reward_percentage': Decimal('1.00'),
                    'tier_2_job_value_min': Decimal('10000'),
                    'tier_2_reward_percentage': Decimal('1.50'),
                    'tier_3_job_value_min': Decimal('12000'),
                    'tier_3_reward_percentage': Decimal('1.80'),
                    'tier_4_job_value_min': Decimal('15000'),
                    'tier_4_reward_percentage': Decimal('2.00'),
                    'apply_time_bonus': True,
                    'time_bonus_percentage': Decimal('0.50'),
                    'time_bonus_interval_minutes': 15,
                    'applicator_share_percentage': Decimal('50.00'),
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created reward settings for {branch.name}'))

        if mode == 'real':
            # Process existing jobs
            self.stdout.write('Processing existing job cards...')
            total_processed = self._process_existing_jobs(branches, num_days)
            self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully processed {total_processed} existing job cards!'))
        else:
            # Generate mock data (Standard flow)
            total_created = 0
            for branch in branches:
                self.stdout.write(f'\nGenerating mock data for branch: {branch.name}')
                
                # Get staff members
                floor_managers = User.objects.filter(branch=branch, role='floor_manager', is_active=True)
                supervisors = User.objects.filter(branch=branch, role='supervisor', is_active=True)
                applicators = User.objects.filter(branch=branch, role='applicator', is_active=True)

                if not supervisors.exists():
                    self.stdout.write(self.style.WARNING(f'  ⚠ No supervisors found for {branch.name}, skipping...'))
                    continue

                if not applicators.exists():
                    self.stdout.write(self.style.WARNING(f'  ⚠ No applicators found for {branch.name}, skipping...'))
                    continue

                # Get packages
                packages = ServicePackage.objects.filter(is_active=True)
                if not packages.exists():
                    self.stdout.write(self.style.WARNING(f'  ⚠ No service packages found, skipping...'))
                    continue

                # Generate jobs
                jobs_created = self._generate_jobs_for_branch(
                    branch=branch,
                    floor_managers=list(floor_managers),
                    supervisors=list(supervisors),
                    applicators=list(applicators),
                    packages=list(packages),
                    num_jobs=num_jobs,
                    num_days=num_days
                )

                total_created += jobs_created
                self.stdout.write(self.style.SUCCESS(f'  ✓ Created {jobs_created} mock job cards with performance data'))

            self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully generated {total_created} mock records!'))

        # Update team aggregates (Common for both modes)
        self.stdout.write('\nUpdating team aggregates...')
        self._update_team_aggregates(branches, num_days)

        # Recalculate accounting metrics if requested
        if recalculate_accounting:
            self.stdout.write('\nRecalculating monthly accounting metrics...')
            self._recalculate_accounting_metrics(branches)

        self.stdout.write(self.style.SUCCESS('\n✨ Generation complete!'))
        self.stdout.write(self.style.SUCCESS('You can now view the data in the admin panel or via API endpoints.'))

    def _process_existing_jobs(self, branches, num_days):
        """Generate performance records from actual JobCards"""
        completed_statuses = ['work_completed', 'final_qc_passed', 'ready_for_billing', 'billed', 'delivered', 'closed']
        
        # Filter job cards
        queryset = JobCard.objects.filter(status__in=completed_statuses, job_started_at__isnull=False)
        if branches:
            queryset = queryset.filter(branch__in=branches)
        
        if num_days:
            start_date = timezone.now() - timedelta(days=num_days)
            queryset = queryset.filter(updated_at__gte=start_date)

        processed_count = 0
        for jobcard in queryset:
            try:
                # 1. Record performance (this handles metrics and team aggregates)
                performance = PerformanceTrackingService.record_job_completion(jobcard)
                if performance:
                    # 2. Calculate and create rewards (this updates performance with amounts)
                    RewardCalculationService.create_reward_records(jobcard)
                    processed_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗ Error processing JobCard #{jobcard.id}: {str(e)}'))
        
        return processed_count

    def _recalculate_accounting_metrics(self, branches):
        """Recalculate monthly accounting performance for all staff"""
        today = date.today()
        # Process current and previous month to be safe
        months_to_process = [
            (today.month, today.year),
            ((today.month - 1) if today.month > 1 else 12, today.year if today.month > 1 else today.year - 1)
        ]
        
        for month, year in months_to_process:
            self.stdout.write(f"  Recalculating metrics for {month}/{year}...")
            # Get all staff
            staff_roles = ['floor_manager', 'supervisor', 'applicator']
            staff_qs = User.objects.filter(role__in=staff_roles, is_active=True)
            if branches:
                staff_qs = staff_qs.filter(branch__in=branches)
            
            for employee in staff_qs:
                PerformanceService.calculate_monthly_metrics(employee, month, year)
            
            # Update rankings
            PerformanceService.calculate_rankings(month, year)
        
        self.stdout.write(self.style.SUCCESS('  ✓ Accounting metrics recalculated'))

    @transaction.atomic
    def _generate_jobs_for_branch(self, branch, floor_managers, supervisors, applicators, packages, num_jobs, num_days):
        """Generate job cards with performance data for a branch"""
        created_count = 0
        end_date = date.today()
        start_date = end_date - timedelta(days=num_days)

        for i in range(num_jobs):
            try:
                # Random date within range
                random_days = random.randint(0, num_days - 1)
                job_date = start_date + timedelta(days=random_days)

                # Random package
                package = random.choice(packages)
                
                # Random team
                supervisor = random.choice(supervisors)
                floor_manager = random.choice(floor_managers) if floor_managers else None
                team_size = random.randint(1, min(3, len(applicators)))
                team = random.sample(applicators, team_size)

                # Calculate job value (use sedan price as default)
                package_value = package.sedan_price or package.price
                
                # Random add-ons (30% chance)
                addons_value = Decimal('0')
                if random.random() < 0.3:
                    addons = AddOn.objects.filter(is_active=True)
                    if addons.exists():
                        num_addons = random.randint(1, 2)
                        selected_addons = random.sample(list(addons), min(num_addons, addons.count()))
                        addons_value = sum(addon.price for addon in selected_addons)

                # Random parts value (20% chance)
                parts_value = Decimal('0')
                if random.random() < 0.2:
                    parts_value = Decimal(random.randint(500, 2000))

                job_value = package_value + addons_value + parts_value

                # Time tracking
                scheduled_duration = package.duration or 90
                
                # 70% chance of completing on time or early
                if random.random() < 0.7:
                    # Early completion (saved time)
                    time_saved = random.randint(5, 45)
                    actual_duration = scheduled_duration - time_saved
                    time_difference = time_saved
                    completed_on_time = True
                else:
                    # Late completion (delayed)
                    time_delayed = random.randint(5, 30)
                    actual_duration = scheduled_duration + time_delayed
                    time_difference = -time_delayed
                    completed_on_time = False

                # Timestamps
                job_started_at = timezone.make_aware(
                    datetime.combine(job_date, datetime.min.time().replace(hour=random.randint(9, 15)))
                )
                job_completed_at = job_started_at + timedelta(minutes=actual_duration)

                # Quality metrics (random but realistic)
                quality_score = random.randint(7, 10) if completed_on_time else random.randint(5, 9)
                customer_satisfaction = random.randint(7, 10) if quality_score >= 8 else random.randint(5, 8)

                # Calculate reward (simplified - using tier logic)
                reward_percentage = self._get_reward_percentage(job_value)
                base_reward = (job_value * reward_percentage) / Decimal('100')
                
                # Time bonus
                time_bonus = Decimal('0')
                if time_difference > 0:
                    bonus_intervals = time_difference // 15
                    if bonus_intervals > 0:
                        time_bonus = (job_value * Decimal('0.50') * bonus_intervals) / Decimal('100')
                
                reward_amount = base_reward + time_bonus

                # Create performance metrics directly (without jobcard for testing)
                # Note: In production, these would be linked to actual JobCard instances
                performance = PerformanceMetrics.objects.create(
                    branch=branch,
                    floor_manager=floor_manager,
                    supervisor=supervisor,
                    scheduled_duration_minutes=scheduled_duration,
                    actual_duration_minutes=actual_duration,
                    time_difference_minutes=time_difference,
                    job_value=job_value,
                    package_value=package_value,
                    addons_value=addons_value,
                    parts_value=parts_value,
                    completed_on_time=completed_on_time,
                    quality_score=quality_score,
                    customer_satisfaction=customer_satisfaction,
                    reward_amount=reward_amount,
                    reward_percentage=reward_percentage,
                    job_started_at=job_started_at,
                    job_completed_at=job_completed_at
                )

                # Add applicators
                performance.applicators.set(team)

                created_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗ Error creating job {i+1}: {str(e)}'))
                continue

        return created_count

    def _get_reward_percentage(self, job_value):
        """Get reward percentage based on job value"""
        if job_value >= 15000:
            return Decimal('2.00')
        elif job_value >= 12000:
            return Decimal('1.80')
        elif job_value >= 10000:
            return Decimal('1.50')
        elif job_value >= 5000:
            return Decimal('1.00')
        else:
            return Decimal('0')

    def _update_team_aggregates(self, branches, num_days):
        """Update team performance aggregates"""
        end_date = date.today()
        start_date = end_date - timedelta(days=num_days)

        for branch in branches:
            supervisors = User.objects.filter(branch=branch, role='supervisor', is_active=True)
            
            for supervisor in supervisors:
                # Get all performance metrics for this supervisor
                metrics = PerformanceMetrics.objects.filter(
                    supervisor=supervisor,
                    job_completed_at__date__gte=start_date,
                    job_completed_at__date__lte=end_date
                )

                if not metrics.exists():
                    continue

                # Group by date and create daily aggregates
                dates = metrics.values_list('job_completed_at__date', flat=True).distinct()
                
                for job_date in dates:
                    try:
                        PerformanceTrackingService.update_team_aggregates(
                            supervisor=supervisor,
                            date=job_date
                        )
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'  ✗ Error updating aggregates for {supervisor.name} on {job_date}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS('  ✓ Team aggregates updated'))
