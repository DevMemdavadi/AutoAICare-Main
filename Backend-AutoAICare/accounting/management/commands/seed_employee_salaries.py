"""
Management command to seed employee salary structures and payroll data.
Creates salary structures for all staff employees and generates payroll records.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import date
from decimal import Decimal
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds employee salary structures and payroll data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing salary structures and payroll before seeding',
        )
        parser.add_argument(
            '--months',
            type=int,
            default=3,
            help='Number of months of payroll to generate (default: 3)',
        )

    def handle(self, *args, **options):
        from accounting.models import EmployeeSalaryStructure, Payroll
        
        self.stdout.write(self.style.SUCCESS('Starting employee salary seeding...'))
        
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            Payroll.objects.all().delete()
            EmployeeSalaryStructure.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared existing salary structures and payroll'))
        
        # Define salary templates by role
        salary_templates = {
            'branch_admin': {
                'base_salary': Decimal('50000.00'),
                'hra': Decimal('10000.00'),
                'transport_allowance': Decimal('3000.00'),
                'other_allowances': Decimal('5000.00'),
                'pf_deduction': Decimal('6000.00'),
                'esi_deduction': Decimal('750.00'),
                'tds_deduction': Decimal('2000.00'),
                'incentive_per_job': Decimal('0.00'),
                'incentive_per_qc_pass': Decimal('0.00'),
                'overtime_hourly_rate': Decimal('400.00'),
            },
            'floor_manager': {
                'base_salary': Decimal('35000.00'),
                'hra': Decimal('7000.00'),
                'transport_allowance': Decimal('2500.00'),
                'other_allowances': Decimal('3000.00'),
                'pf_deduction': Decimal('4200.00'),
                'esi_deduction': Decimal('525.00'),
                'tds_deduction': Decimal('1000.00'),
                'incentive_per_job': Decimal('50.00'),
                'incentive_per_qc_pass': Decimal('25.00'),
                'overtime_hourly_rate': Decimal('300.00'),
            },
            'supervisor': {
                'base_salary': Decimal('28000.00'),
                'hra': Decimal('5600.00'),
                'transport_allowance': Decimal('2000.00'),
                'other_allowances': Decimal('2000.00'),
                'pf_deduction': Decimal('3360.00'),
                'esi_deduction': Decimal('420.00'),
                'tds_deduction': Decimal('500.00'),
                'incentive_per_job': Decimal('75.00'),
                'incentive_per_qc_pass': Decimal('50.00'),
                'overtime_hourly_rate': Decimal('250.00'),
            },
            'applicator': {
                'base_salary': Decimal('18000.00'),
                'hra': Decimal('3600.00'),
                'transport_allowance': Decimal('1500.00'),
                'other_allowances': Decimal('1000.00'),
                'pf_deduction': Decimal('2160.00'),
                'esi_deduction': Decimal('270.00'),
                'tds_deduction': Decimal('0.00'),
                'incentive_per_job': Decimal('100.00'),
                'incentive_per_qc_pass': Decimal('75.00'),
                'overtime_hourly_rate': Decimal('150.00'),
            },
        }
        
        # Get all employee users (excluding customers and super_admin)
        employee_roles = ['branch_admin', 'floor_manager', 'supervisor', 'applicator']
        employees = User.objects.filter(role__in=employee_roles, is_active=True)
        
        self.stdout.write(f'Found {employees.count()} employees to process')
        
        created_structures = 0
        skipped_structures = 0
        
        # Create salary structures
        for employee in employees:
            if hasattr(employee, 'salary_structure'):
                self.stdout.write(f'  Skipping {employee.name} - already has salary structure')
                skipped_structures += 1
                continue
            
            template = salary_templates.get(employee.role)
            if not template:
                self.stdout.write(self.style.WARNING(f'  No template for role: {employee.role}'))
                continue
            
            # Add some variation to salaries (±10%)
            variation = Decimal(str(random.uniform(0.90, 1.10)))
            
            structure = EmployeeSalaryStructure.objects.create(
                employee=employee,
                base_salary=template['base_salary'] * variation,
                hra=template['hra'] * variation,
                transport_allowance=template['transport_allowance'],
                other_allowances=template['other_allowances'],
                pf_deduction=template['pf_deduction'] * variation,
                esi_deduction=template['esi_deduction'] * variation,
                tds_deduction=template['tds_deduction'],
                incentive_per_job=template['incentive_per_job'],
                incentive_per_qc_pass=template['incentive_per_qc_pass'],
                overtime_hourly_rate=template['overtime_hourly_rate'],
                effective_from=date(2024, 1, 1),
                is_active=True
            )
            created_structures += 1
            self.stdout.write(f'  Created salary structure for {employee.name} ({employee.role})')
        
        self.stdout.write(self.style.SUCCESS(
            f'Salary structures: Created {created_structures}, Skipped {skipped_structures}'
        ))
        
        # Generate payroll records
        self.stdout.write('\nGenerating payroll records...')
        
        months_to_generate = options['months']
        now = timezone.now()
        current_month = now.month
        current_year = now.year
        
        created_payrolls = 0
        skipped_payrolls = 0
        
        # Get all salary structures
        salary_structures = EmployeeSalaryStructure.objects.filter(is_active=True).select_related('employee')
        
        for month_offset in range(months_to_generate):
            # Calculate month and year
            target_month = current_month - month_offset
            target_year = current_year
            
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            
            self.stdout.write(f'\n  Processing {target_month}/{target_year}...')
            
            for structure in salary_structures:
                employee = structure.employee
                
                # Check if payroll already exists
                if Payroll.objects.filter(employee=employee, month=target_month, year=target_year).exists():
                    skipped_payrolls += 1
                    continue
                
                # Calculate payroll values
                gross = structure.calculate_gross_salary()
                deductions = structure.calculate_total_deductions()
                
                # Random performance data
                jobs_completed = random.randint(5, 30)
                qc_passed = int(jobs_completed * random.uniform(0.7, 0.95))
                overtime_hours = Decimal(str(random.uniform(0, 20)))
                
                # Calculate incentives and overtime
                incentives = (structure.incentive_per_job * jobs_completed) + (structure.incentive_per_qc_pass * qc_passed)
                overtime_amount = structure.overtime_hourly_rate * overtime_hours
                
                # Calculate net salary
                net_salary = gross - deductions + incentives + overtime_amount
                
                # Determine status based on month
                if month_offset == 0:  # Current month
                    status = 'pending'
                    payment_date = None
                    payment_method = None
                elif month_offset == 1:  # Last month
                    status = random.choice(['paid', 'approved', 'pending'])
                    if status == 'paid':
                        payment_date = date(target_year, target_month, random.randint(1, 5) if target_month < 12 else random.randint(1, 5))
                        # Fix payment date to be in the next month
                        payment_month = target_month + 1 if target_month < 12 else 1
                        payment_year = target_year if target_month < 12 else target_year + 1
                        payment_date = date(payment_year, payment_month, random.randint(1, 5))
                        payment_method = random.choice(['Bank Transfer', 'UPI', 'Cash'])
                    else:
                        payment_date = None
                        payment_method = None
                else:  # Older months
                    status = 'paid'
                    payment_month = target_month + 1 if target_month < 12 else 1
                    payment_year = target_year if target_month < 12 else target_year + 1
                    payment_date = date(payment_year, payment_month, random.randint(1, 5))
                    payment_method = random.choice(['Bank Transfer', 'UPI'])
                
                # Create payroll record
                payroll = Payroll.objects.create(
                    employee=employee,
                    salary_structure=structure,
                    month=target_month,
                    year=target_year,
                    base_salary=structure.base_salary,
                    allowances=structure.hra + structure.transport_allowance + structure.other_allowances,
                    deductions=deductions,
                    incentives=incentives,
                    overtime_hours=overtime_hours,
                    overtime_amount=overtime_amount,
                    penalties=Decimal('0.00'),
                    days_present=random.randint(22, 26),
                    days_absent=random.randint(0, 4),
                    days_leave=random.randint(0, 2),
                    jobs_completed=jobs_completed,
                    qc_pass_count=qc_passed,
                    gross_salary=gross + incentives + overtime_amount,
                    net_salary=net_salary,
                    status=status,
                    payment_date=payment_date,
                    payment_method=payment_method,
                )
                created_payrolls += 1
                self.stdout.write(f'    Created payroll for {employee.name} - ₹{net_salary:.0f} ({status})')
        
        self.stdout.write(self.style.SUCCESS(
            f'\nPayroll records: Created {created_payrolls}, Skipped {skipped_payrolls}'
        ))
        
        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Employee salary seeding completed!'))
        self.stdout.write(f'  Salary Structures: {created_structures} created, {skipped_structures} skipped')
        self.stdout.write(f'  Payroll Records: {created_payrolls} created, {skipped_payrolls} skipped')
        self.stdout.write('='*60)
