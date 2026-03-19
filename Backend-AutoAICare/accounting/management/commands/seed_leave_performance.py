from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random

from accounting.models import (
    LeaveType, LeaveBalance, LeaveRequest, LeaveEncashment,
    TaxSlab, PerformanceMetrics
)
from users.models import User


class Command(BaseCommand):
    help = 'Seed Leave Types, Balances, Tax Slabs, and sample data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            LeaveEncashment.objects.all().delete()
            LeaveRequest.objects.all().delete()
            LeaveBalance.objects.all().delete()
            LeaveType.objects.all().delete()
            TaxSlab.objects.all().delete()
            PerformanceMetrics.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared existing data'))

        self.stdout.write(self.style.SUCCESS('Starting seed process...'))
        
        # Step 1: Create Leave Types
        self.create_leave_types()
        
        # Step 2: Create Tax Slabs
        self.create_tax_slabs()
        
        # Step 3: Initialize Leave Balances for all employees
        self.initialize_leave_balances()
        
        # Step 4: Create sample leave requests
        self.create_sample_leave_requests()
        
        # Step 5: Create sample performance metrics
        # TODO: Fix field names for PerformanceMetrics model
        # self.create_sample_performance_metrics()
        
        self.stdout.write(self.style.SUCCESS('\n✓ Seed process completed successfully!'))

    def create_leave_types(self):
        self.stdout.write('\n1. Creating Leave Types...')
        
        leave_types_data = [
            {
                'name': 'Casual Leave',
                'code': 'CL',
                'description': 'Leave for casual or personal matters',
                'annual_quota': 12,
                'max_consecutive_days': 3,
                'min_notice_days': 1,
                'requires_approval': True,
                'is_paid': True,
                'is_carry_forward': True,
                'max_carry_forward_days': 5,
                'is_encashable': False,
                'is_active': True,
            },
            {
                'name': 'Sick Leave',
                'code': 'SL',
                'description': 'Leave for medical reasons',
                'annual_quota': 12,
                'max_consecutive_days': 7,
                'min_notice_days': 0,
                'requires_approval': True,
                'requires_document': True,
                'is_paid': True,
                'is_carry_forward': True,
                'max_carry_forward_days': 3,
                'is_encashable': False,
                'is_active': True,
            },
            {
                'name': 'Earned Leave',
                'code': 'EL',
                'description': 'Leave earned through service, can be accumulated',
                'annual_quota': 24,
                'max_consecutive_days': 15,
                'min_notice_days': 7,
                'requires_approval': True,
                'is_paid': True,
                'is_carry_forward': True,
                'max_carry_forward_days': 30,
                'is_encashable': True,
                'is_active': True,
            },
            {
                'name': 'Privilege Leave',
                'code': 'PL',
                'description': 'Privilege leave for planned vacations',
                'annual_quota': 15,
                'max_consecutive_days': 10,
                'min_notice_days': 15,
                'requires_approval': True,
                'is_paid': True,
                'is_carry_forward': True,
                'max_carry_forward_days': 10,
                'is_encashable': True,
                'is_active': True,
            },
            {
                'name': 'Maternity Leave',
                'code': 'ML',
                'description': 'Leave for maternity (Female employees only)',
                'annual_quota': 180,
                'max_consecutive_days': 180,
                'min_notice_days': 30,
                'requires_approval': True,
                'requires_document': True,
                'is_paid': True,
                'is_carry_forward': False,
                'is_encashable': False,
                'is_active': True,
            },
            {
                'name': 'Paternity Leave',
                'code': 'PTL',
                'description': 'Leave for paternity (Male employees only)',
                'annual_quota': 15,
                'max_consecutive_days': 15,
                'min_notice_days': 7,
                'requires_approval': True,
                'requires_document': True,
                'is_paid': True,
                'is_carry_forward': False,
                'is_encashable': False,
                'is_active': True,
            },
            {
                'name': 'Compensatory Off',
                'code': 'CO',
                'description': 'Compensatory leave for working on holidays',
                'annual_quota': 12,
                'max_consecutive_days': 2,
                'min_notice_days': 1,
                'requires_approval': True,
                'is_paid': True,
                'is_carry_forward': True,
                'max_carry_forward_days': 3,
                'is_encashable': False,
                'is_active': True,
            },
            {
                'name': 'Loss of Pay',
                'code': 'LOP',
                'description': 'Unpaid leave',
                'annual_quota': 365,
                'max_consecutive_days': 30,
                'min_notice_days': 3,
                'requires_approval': True,
                'is_paid': False,
                'is_carry_forward': False,
                'is_encashable': False,
                'is_active': True,
            }
        ]
        
        created_count = 0
        for leave_data in leave_types_data:
            leave_type, created = LeaveType.objects.get_or_create(
                code=leave_data['code'],
                defaults=leave_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Created: {leave_type.name} ({leave_type.code})')
            else:
                self.stdout.write(f'  - Exists: {leave_type.name} ({leave_type.code})')
        
        self.stdout.write(self.style.SUCCESS(f'\n  Created {created_count} leave types'))

    def create_tax_slabs(self):
        self.stdout.write('\n2. Creating Tax Slabs...')
        
        current_year = timezone.now().year
        financial_year = f"{current_year}-{str(current_year + 1)[2:]}"  # e.g., "2024-25"
        
        # Old Tax Regime Slabs (FY 2024-25)
        old_regime_slabs = [
            {'min_income': 0, 'max_income': 250000, 'rate': 0, 'regime': 'old', 'description': 'No tax'},
            {'min_income': 250000, 'max_income': 500000, 'rate': 5, 'regime': 'old', 'description': '5% tax'},
            {'min_income': 500000, 'max_income': 1000000, 'rate': 20, 'regime': 'old', 'description': '20% tax'},
            {'min_income': 1000000, 'max_income': None, 'rate': 30, 'regime': 'old', 'description': '30% tax'},
        ]
        
        # New Tax Regime Slabs (FY 2024-25)
        new_regime_slabs = [
            {'min_income': 0, 'max_income': 300000, 'rate': 0, 'regime': 'new', 'description': 'No tax'},
            {'min_income': 300000, 'max_income': 600000, 'rate': 5, 'regime': 'new', 'description': '5% tax'},
            {'min_income': 600000, 'max_income': 900000, 'rate': 10, 'regime': 'new', 'description': '10% tax'},
            {'min_income': 900000, 'max_income': 1200000, 'rate': 15, 'regime': 'new', 'description': '15% tax'},
            {'min_income': 1200000, 'max_income': 1500000, 'rate': 20, 'regime': 'new', 'description': '20% tax'},
            {'min_income': 1500000, 'max_income': None, 'rate': 30, 'regime': 'new', 'description': '30% tax'},
        ]
        
        created_count = 0
        for slab_data in old_regime_slabs + new_regime_slabs:
            slab, created = TaxSlab.objects.get_or_create(
                financial_year=financial_year,
                regime=slab_data['regime'],
                min_income=slab_data['min_income'],
                defaults={
                    'max_income': slab_data['max_income'],
                    'tax_rate': slab_data['rate']
                }
            )
            if created:
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'  Created {created_count} tax slabs'))


    def initialize_leave_balances(self):
        self.stdout.write('\n3. Initializing Leave Balances...')
        
        # Get all active employees (excluding customer role)
        employees = User.objects.filter(
            is_active=True
        ).exclude(role='customer')
        
        # Get all active leave types
        leave_types = LeaveType.objects.filter(is_active=True)
        
        created_count = 0
        current_year = timezone.now().year
        
        for employee in employees:
            for leave_type in leave_types:
                # Create or get leave balance
                balance, created = LeaveBalance.objects.get_or_create(
                    employee=employee,
                    leave_type=leave_type,
                    year=current_year,
                    defaults={
                        'opening_balance': 0,
                        'credited': leave_type.annual_quota,
                        'used': 0,
                        'encashed': 0,
                        'lapsed': 0
                    }
                )
                
                if created:
                    created_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'  Created {created_count} leave balance records for {employees.count()} employees'
        ))

    def create_sample_leave_requests(self):
        self.stdout.write('\n4. Creating sample leave requests...')
        
        # Get some employees
        employees = User.objects.filter(is_active=True).exclude(role='customer')[:5]
        if not employees:
            self.stdout.write(self.style.WARNING('  No employees found, skipping leave requests'))
            return
        
        casual_leave = LeaveType.objects.filter(code='CL').first()
        sick_leave = LeaveType.objects.filter(code='SL').first()
        
        if not casual_leave or not sick_leave:
            self.stdout.write(self.style.WARNING('  Leave types not found, skipping'))
            return
        
        created_count = 0
        statuses = ['pending', 'approved', 'approved', 'rejected']
        
        for i, employee in enumerate(employees):
            # Create 1-2 leave requests per employee
            for j in range(random.randint(1, 2)):
                start_date = timezone.now().date() + timedelta(days=random.randint(-30, 30))
                total_days = random.randint(1, 3)
                end_date = start_date + timedelta(days=total_days - 1)
                
                leave_type = random.choice([casual_leave, sick_leave])
                status = random.choice(statuses)
                
                request = LeaveRequest.objects.create(
                    employee=employee,
                    leave_type=leave_type,
                    start_date=start_date,
                    end_date=end_date,
                    total_days=total_days,
                    reason=f'Sample {leave_type.name} request for testing',
                    status=status,
                    contact_during_leave=f'+91-98765{4320 + i}'
                )
                
                # If approved/rejected, add approval info
                if status in ['approved', 'rejected']:
                    admin = User.objects.filter(role__in=['super_admin', 'branch_admin']).first()
                    if admin:
                        request.approved_by = admin
                        request.approval_date = timezone.now()
                        if status == 'rejected':
                            request.rejection_reason = 'Sample rejection for testing'
                        request.save()
                
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'  Created {created_count} sample leave requests'))

    def create_sample_performance_metrics(self):
        self.stdout.write('\n5. Creating sample performance metrics...')
        
        # Get employees (excluding admins and customers)
        employees = User.objects.filter(
            is_active=True,
            role__in=['floor_manager', 'supervisor', 'applicator']
        )[:10]
        
        if not employees:
            self.stdout.write(self.style.WARNING('  No employees found, skipping'))
            return
        
        created_count = 0
        current_date = timezone.now().date()
        
        for employee in employees:
            # Create metrics for last 3 months
            for months_ago in range(3):
                month = (current_date.month - months_ago - 1) % 12 + 1
                year = current_date.year if months_ago == 0 else current_date.year - ((current_date.month - months_ago - 1) // 12)
                
                # Random performance data
                jobs_assigned = random.randint(15, 35)
                jobs_completed = random.randint(12, jobs_assigned)
                qc_passed = random.randint(int(jobs_completed * 0.7), jobs_completed)
                qc_failed = jobs_completed - qc_passed
                
                early_completions = random.randint(0, int(jobs_completed * 0.3))
                late_completions = random.randint(0, int(jobs_completed * 0.2))
                
                time_saved_minutes = early_completions * random.randint(10, 30)
                time_overrun_minutes = late_completions * random.randint(5, 20)
                
                avg_completion_time = random.randint(45, 120)
                efficiency_score = round(random.uniform(60, 95), 2)
                
                # Calculate rewards and deductions
                early_completion_reward = Decimal(early_completions * 100)
                late_completion_penalty = Decimal(late_completions * 50)
                qc_pass_bonus = Decimal(qc_passed * 50)
                qc_fail_penalty = Decimal(qc_failed * 75)
                
                total_rewards = early_completion_reward + qc_pass_bonus
                total_deductions = late_completion_penalty + qc_fail_penalty
                net_incentive = total_rewards - total_deductions
                
                metrics, created = PerformanceMetrics.objects.get_or_create(
                    employee=employee,
                    month=month,
                    year=year,
                    defaults={
                        'jobs_assigned': jobs_assigned,
                        'jobs_completed': jobs_completed,
                        'qc_passed': qc_passed,
                        'qc_failed': qc_failed,
                        'early_completions': early_completions,
                        'late_completions': late_completions,
                        'time_saved_minutes': time_saved_minutes,
                        'time_overrun_minutes': time_overrun_minutes,
                        'avg_completion_time_minutes': avg_completion_time,
                        'efficiency_score': efficiency_score,
                        'total_rewards': total_rewards,
                        'total_deductions': total_deductions,
                        'net_incentive': net_incentive,
                        'avg_customer_rating': round(random.uniform(3.5, 5.0), 2)
                    }
                )
                
                if created:
                    created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'  Created {created_count} performance metrics records'))
