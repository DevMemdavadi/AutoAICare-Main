from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from accounting.models import RecurringExpense, Expense, Transaction


class Command(BaseCommand):
    help = 'Process all active recurring expenses and create expense entries'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating anything',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.now().date()
        
        self.stdout.write(f"Processing recurring expenses for {today}")
        
        # Get all active recurring expenses
        recurring_expenses = RecurringExpense.objects.filter(
            is_active=True,
            auto_generate=True,
            start_date__lte=today
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today)
        )
        
        self.stdout.write(f"Found {recurring_expenses.count()} active recurring expenses")
        
        processed = []
        skipped = []
        
        for recurring in recurring_expenses:
            # Check if it's time to generate
            should_generate = False
            reason = ""
            
            if not recurring.last_generated_date:
                should_generate = True
                reason = "First time generation"
            else:
                days_since = (today - recurring.last_generated_date).days
                
                if recurring.frequency == 'daily' and days_since >= 1:
                    should_generate = True
                    reason = f"Daily expense, {days_since} days since last generation"
                elif recurring.frequency == 'weekly' and days_since >= 7:
                    should_generate = True
                    reason = f"Weekly expense, {days_since} days since last generation"
                elif recurring.frequency == 'monthly' and days_since >= 30:
                    should_generate = True
                    reason = f"Monthly expense, {days_since} days since last generation"
                elif recurring.frequency == 'quarterly' and days_since >= 90:
                    should_generate = True
                    reason = f"Quarterly expense, {days_since} days since last generation"
                elif recurring.frequency == 'yearly' and days_since >= 365:
                    should_generate = True
                    reason = f"Yearly expense, {days_since} days since last generation"
                else:
                    reason = f"Not yet due ({days_since} days since last generation)"
            
            if should_generate:
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[DRY RUN] Would create expense: {recurring.title} - ₹{recurring.amount} - {reason}"
                        )
                    )
                    processed.append(recurring.title)
                else:
                    try:
                        # Create expense
                        expense = Expense.objects.create(
                            company=recurring.branch.company if recurring.branch else None,
                            title=recurring.title,
                            category=recurring.category,
                            amount=recurring.amount,
                            date=today,
                            description=f"Auto-generated from recurring expense: {recurring.title}\n{recurring.description or ''}",
                            vendor=recurring.vendor,
                            branch=recurring.branch,
                            payment_status='paid'
                        )
                        
                        # Create transaction
                        Transaction.objects.create(
                            company=expense.company,
                            transaction_type='expense',
                            source='expense',
                            amount=expense.amount,
                            description=f"Recurring Expense: {expense.title}",
                            reference_id=str(expense.id),
                            expense=expense,
                            branch=expense.branch
                        )
                        
                        # Update last generated date
                        recurring.last_generated_date = today
                        recurring.save()
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Created expense: {recurring.title} - ₹{recurring.amount} (ID: {expense.id})"
                            )
                        )
                        processed.append(recurring.title)
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"✗ Error creating expense for {recurring.title}: {str(e)}"
                            )
                        )
                        skipped.append(f"{recurring.title} (Error: {str(e)})")
            else:
                skipped.append(f"{recurring.title} ({reason})")
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"Processed: {len(processed)} expenses"))
        self.stdout.write(self.style.WARNING(f"Skipped: {len(skipped)} expenses"))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN MODE] - No changes were made"))
        
        self.stdout.write("="*60)
