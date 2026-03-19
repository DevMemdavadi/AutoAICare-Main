from django.core.management.base import BaseCommand
from django.utils import timezone
from accounting.models import EmployeeSalaryStructure, Payroll
from users.models import User


class Command(BaseCommand):
    help = 'Generate payroll for all employees with active salary structures'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=int,
            help='Month (1-12). Default: current month',
        )
        parser.add_argument(
            '--year',
            type=int,
            help='Year. Default: current year',
        )
        parser.add_argument(
            '--employee',
            type=int,
            help='Specific employee ID (optional)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating anything',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration even if payroll already exists',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        # Get month and year
        now = timezone.now()
        month = options.get('month') or now.month
        year = options.get('year') or now.year
        
        self.stdout.write(f"Generating payroll for {month}/{year}")
        
        # Get salary structures
        salary_structures = EmployeeSalaryStructure.objects.filter(is_active=True)
        
        employee_id = options.get('employee')
        if employee_id:
            salary_structures = salary_structures.filter(employee_id=employee_id)
            self.stdout.write(f"Processing only employee ID: {employee_id}")
        
        self.stdout.write(f"Found {salary_structures.count()} employees with salary structures")
        
        created = []
        skipped = []
        errors = []
        
        for structure in salary_structures:
            employee = structure.employee
            
            # Check if payroll already exists
            existing = Payroll.objects.filter(
                employee=employee,
                month=month,
                year=year
            ).first()
            
            if existing and not force:
                skipped.append(f"{employee.name} (Already exists)")
                continue
            
            if dry_run:
                gross = structure.calculate_gross_salary()
                deductions = structure.calculate_total_deductions()
                net = gross - deductions
                
                self.stdout.write(
                    self.style.WARNING(
                        f"[DRY RUN] Would create payroll for {employee.name}: "
                        f"Gross: ₹{gross}, Deductions: ₹{deductions}, Net: ₹{net}"
                    )
                )
                created.append(employee.name)
            else:
                try:
                    # Calculate payroll amounts
                    gross = structure.calculate_gross_salary()
                    deductions = structure.calculate_total_deductions()
                    net = gross - deductions
                    
                    # You can enhance this with attendance and performance data
                    # For now, using basic calculation
                    
                    if existing and force:
                        # Update existing
                        existing.base_salary = structure.base_salary
                        existing.allowances = structure.hra + structure.transport_allowance + structure.other_allowances
                        existing.deductions = deductions
                        existing.gross_salary = gross
                        existing.net_salary = net
                        existing.save()
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Updated payroll for {employee.name}: ₹{net} (ID: {existing.id})"
                            )
                        )
                        created.append(employee.name)
                    else:
                        # Create new
                        payroll = Payroll.objects.create(
                            employee=employee,
                            salary_structure=structure,
                            month=month,
                            year=year,
                            base_salary=structure.base_salary,
                            allowances=structure.hra + structure.transport_allowance + structure.other_allowances,
                            deductions=deductions,
                            gross_salary=gross,
                            net_salary=net,
                            status='pending'
                        )
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Created payroll for {employee.name}: ₹{net} (ID: {payroll.id})"
                            )
                        )
                        created.append(employee.name)
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Error creating payroll for {employee.name}: {str(e)}"
                        )
                    )
                    errors.append(f"{employee.name} (Error: {str(e)})")
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"Created/Updated: {len(created)} payrolls"))
        self.stdout.write(self.style.WARNING(f"Skipped: {len(skipped)} payrolls"))
        if errors:
            self.stdout.write(self.style.ERROR(f"Errors: {len(errors)}"))
            for error in errors:
                self.stdout.write(self.style.ERROR(f"  - {error}"))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN MODE] - No changes were made"))
        
        self.stdout.write("="*60)
