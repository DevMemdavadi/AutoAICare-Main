import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Transaction, Expense

print("--- Converting Orphaned Ledger Entries to Expenses ---")
unlinked = Transaction.objects.filter(transaction_type='expense', expense__isnull=True)
converted_count = 0

for tx in unlinked:
    # Build a title/category based on source
    category = 'other'
    if tx.source == 'salary':
        category = 'salary'
    elif tx.source == 'petty_cash':
        category = 'other' # or maintenance/supplies? Let's use other
    
    # Create the Expense record
    new_expense = Expense.objects.create(
        title=tx.description or f"Legacy {tx.source.replace('_', ' ').capitalize()}",
        category=category,
        amount=tx.amount,
        date=tx.date.date(),
        description=f"Auto-generated from ledger entry ID {tx.id}",
        payment_status='paid',
        payment_method=tx.payment_method or 'cash',
        branch=tx.branch
    )
    
    # Link the transaction to the new expense
    tx.expense = new_expense
    tx.save()
    converted_count += 1
    print(f"CONVERTED: TX ID {tx.id} -> Expense ID {new_expense.id} (₹{tx.amount})")

print(f"--- Done! Converted {converted_count} entries ---")
