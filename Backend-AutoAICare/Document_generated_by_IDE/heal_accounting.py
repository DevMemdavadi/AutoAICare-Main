import os
import django
from django.utils import timezone
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Expense, Transaction

print("--- Healing Accounting Ledger ---")
all_expenses = Expense.objects.all()
created_count = 0

for expense in all_expenses:
    # Check if transaction exists
    if not Transaction.objects.filter(expense=expense).exists():
        # Create backdated transaction
        # Convert date to datetime
        naive_datetime = datetime.combine(expense.date, datetime.min.time())
        aware_datetime = timezone.make_aware(naive_datetime)
        
        Transaction.objects.create(
            transaction_type='expense',
            source='expense',
            amount=expense.amount,
            description=f"{expense.title} - {expense.get_category_display()}",
            reference_id=str(expense.id),
            expense=expense,
            branch=expense.branch,
            payment_method=expense.payment_method,
            date=aware_datetime
        )
        created_count += 1
        print(f"CREATED: TX for Expense ID {expense.id} ({expense.title}) dated {expense.date}")

print(f"--- Done! Created {created_count} missing transactions ---")
