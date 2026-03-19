from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from accounting.models import BranchBudget, InterBranchTransfer
from branches.models import Branch
from users.models import User


class Command(BaseCommand):
    help = 'Seed branch budgets and inter-branch transfers'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding branch financial data...')

        # Get branches
        branches = list(Branch.objects.all())
        if not branches:
            self.stdout.write(self.style.ERROR('No branches found. Please create branches first.'))
            return

        # Get a superuser for created_by field
        superuser = User.objects.filter(is_superuser=True).first()
        if not superuser:
            self.stdout.write(self.style.WARNING('No superuser found. Using first user.'))
            superuser = User.objects.first()

        # Clear existing data
        self.stdout.write('Clearing existing branch financial data...')
        BranchBudget.objects.all().delete()
        InterBranchTransfer.objects.all().delete()

        # Create budgets
        self.create_budgets(branches, superuser)

        # Create transfers
        self.create_transfers(branches, superuser)

        self.stdout.write(self.style.SUCCESS('Successfully seeded branch financial data!'))

    def create_budgets(self, branches, superuser):
        """Create realistic budgets for each branch"""
        self.stdout.write('Creating branch budgets...')

        today = timezone.now().date()
        
        # Budget templates by branch size
        budget_templates = {
            'large': {
                'total': 500000,
                'inventory': 150000,
                'salary': 200000,
                'utilities': 30000,
                'rent': 50000,
                'maintenance': 30000,
                'marketing': 25000,
                'other': 15000
            },
            'medium': {
                'total': 300000,
                'inventory': 90000,
                'salary': 120000,
                'utilities': 20000,
                'rent': 30000,
                'maintenance': 20000,
                'marketing': 15000,
                'other': 5000
            },
            'small': {
                'total': 150000,
                'inventory': 45000,
                'salary': 60000,
                'utilities': 10000,
                'rent': 15000,
                'maintenance': 10000,
                'marketing': 7000,
                'other': 3000
            }
        }

        budgets_created = 0

        for i, branch in enumerate(branches):
            # Assign budget size based on branch index (for variety)
            if i == 0:
                template = budget_templates['large']
            elif i % 2 == 0:
                template = budget_templates['medium']
            else:
                template = budget_templates['small']

            # Create current month budget (active)
            current_month_start = today.replace(day=1)
            if today.month == 12:
                current_month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                current_month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

            BranchBudget.objects.create(
                branch=branch,
                period_type='monthly',
                start_date=current_month_start,
                end_date=current_month_end,
                total_budget=Decimal(str(template['total'])),
                inventory_budget=Decimal(str(template['inventory'])),
                salary_budget=Decimal(str(template['salary'])),
                utilities_budget=Decimal(str(template['utilities'])),
                rent_budget=Decimal(str(template['rent'])),
                maintenance_budget=Decimal(str(template['maintenance'])),
                marketing_budget=Decimal(str(template['marketing'])),
                other_budget=Decimal(str(template['other'])),
                is_active=True,
                notes=f'Monthly budget for {branch.name} - {current_month_start.strftime("%B %Y")}',
                created_by=superuser
            )
            budgets_created += 1

            # Create previous month budget (for history)
            if today.month == 1:
                prev_month_start = today.replace(year=today.year - 1, month=12, day=1)
                prev_month_end = today.replace(day=1) - timedelta(days=1)
            else:
                prev_month_start = today.replace(month=today.month - 1, day=1)
                prev_month_end = today.replace(day=1) - timedelta(days=1)

            BranchBudget.objects.create(
                branch=branch,
                period_type='monthly',
                start_date=prev_month_start,
                end_date=prev_month_end,
                total_budget=Decimal(str(template['total'] * 0.95)),  # Slightly lower
                inventory_budget=Decimal(str(template['inventory'] * 0.95)),
                salary_budget=Decimal(str(template['salary'] * 0.95)),
                utilities_budget=Decimal(str(template['utilities'] * 0.95)),
                rent_budget=Decimal(str(template['rent'] * 0.95)),
                maintenance_budget=Decimal(str(template['maintenance'] * 0.95)),
                marketing_budget=Decimal(str(template['marketing'] * 0.95)),
                other_budget=Decimal(str(template['other'] * 0.95)),
                is_active=False,
                notes=f'Monthly budget for {branch.name} - {prev_month_start.strftime("%B %Y")}',
                created_by=superuser
            )
            budgets_created += 1

            # Create quarterly budget (active)
            # Determine current quarter
            current_quarter = (today.month - 1) // 3 + 1
            quarter_start_month = (current_quarter - 1) * 3 + 1
            quarter_start = today.replace(month=quarter_start_month, day=1)
            
            # Calculate quarter end date
            quarter_end_month = quarter_start_month + 2
            if quarter_end_month > 12:
                # Quarter spans into next year
                quarter_end_year = today.year + 1
                quarter_end_month = quarter_end_month - 12
            else:
                quarter_end_year = today.year
            
            # Get last day of the quarter's final month
            if quarter_end_month == 12:
                quarter_end = today.replace(year=quarter_end_year, month=12, day=31)
            else:
                quarter_end = today.replace(year=quarter_end_year, month=quarter_end_month + 1, day=1) - timedelta(days=1)

            BranchBudget.objects.create(
                branch=branch,
                period_type='quarterly',
                start_date=quarter_start,
                end_date=quarter_end,
                total_budget=Decimal(str(template['total'] * 3)),  # 3 months
                inventory_budget=Decimal(str(template['inventory'] * 3)),
                salary_budget=Decimal(str(template['salary'] * 3)),
                utilities_budget=Decimal(str(template['utilities'] * 3)),
                rent_budget=Decimal(str(template['rent'] * 3)),
                maintenance_budget=Decimal(str(template['maintenance'] * 3)),
                marketing_budget=Decimal(str(template['marketing'] * 3)),
                other_budget=Decimal(str(template['other'] * 3)),
                is_active=True,
                notes=f'Q{current_quarter} {today.year} budget for {branch.name}',
                created_by=superuser
            )
            budgets_created += 1

        self.stdout.write(self.style.SUCCESS(f'Created {budgets_created} budgets'))

    def create_transfers(self, branches, superuser):
        """Create sample inter-branch transfers"""
        self.stdout.write('Creating inter-branch transfers...')

        if len(branches) < 2:
            self.stdout.write(self.style.WARNING('Need at least 2 branches for transfers. Skipping...'))
            return

        today = timezone.now().date()
        transfers_created = 0

        # Create some approved fund transfers
        transfer_scenarios = [
            {
                'from_idx': 0,
                'to_idx': 1,
                'amount': 50000,
                'description': 'Emergency fund allocation for equipment repair',
                'days_ago': 15,
                'status': 'approved'
            },
            {
                'from_idx': 1,
                'to_idx': 2 if len(branches) > 2 else 0,
                'amount': 25000,
                'description': 'Marketing campaign budget reallocation',
                'days_ago': 10,
                'status': 'approved'
            },
            {
                'from_idx': 0,
                'to_idx': 2 if len(branches) > 2 else 1,
                'amount': 75000,
                'description': 'Inventory restocking fund transfer',
                'days_ago': 5,
                'status': 'approved'
            },
        ]

        # Create pending transfers
        pending_scenarios = [
            {
                'from_idx': 1,
                'to_idx': 0,
                'amount': 30000,
                'description': 'Request for additional salary budget',
                'days_ago': 2,
                'status': 'pending'
            },
            {
                'from_idx': 2 if len(branches) > 2 else 1,
                'to_idx': 0,
                'amount': 15000,
                'description': 'Utilities overage reimbursement request',
                'days_ago': 1,
                'status': 'pending'
            },
        ]

        # Create rejected transfer (for history)
        rejected_scenarios = [
            {
                'from_idx': 0,
                'to_idx': 1,
                'amount': 100000,
                'description': 'Large equipment purchase - rejected due to budget constraints',
                'days_ago': 20,
                'status': 'rejected'
            },
        ]

        all_scenarios = transfer_scenarios + pending_scenarios + rejected_scenarios

        for scenario in all_scenarios:
            from_branch = branches[scenario['from_idx']]
            to_branch = branches[scenario['to_idx']]
            transfer_date = today - timedelta(days=scenario['days_ago'])

            transfer = InterBranchTransfer.objects.create(
                from_branch=from_branch,
                to_branch=to_branch,
                transfer_type='fund',
                amount=Decimal(str(scenario['amount'])),
                date=transfer_date,
                description=scenario['description'],
                status=scenario['status'],
                created_by=superuser,
                approved_by=superuser if scenario['status'] in ['approved', 'rejected'] else None
            )
            transfers_created += 1

        # Create expense reallocation transfers
        if len(branches) >= 2:
            InterBranchTransfer.objects.create(
                from_branch=branches[0],
                to_branch=branches[1],
                transfer_type='expense_reallocation',
                amount=Decimal('12000'),
                date=today - timedelta(days=7),
                description='Reallocate shared marketing expense to correct branch',
                status='approved',
                created_by=superuser,
                approved_by=superuser
            )
            transfers_created += 1

        self.stdout.write(self.style.SUCCESS(f'Created {transfers_created} inter-branch transfers'))
