import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Expense, Transaction
from branches.models import Branch

print("--- Consolidating Orphaned Financial Data ---")
target_branch = Branch.objects.get(id=64)
print(f"Target Branch: {target_branch.name}")

# Update Expenses
e_orphans = Expense.objects.filter(branch__isnull=True)
e_count = e_orphans.count()
e_orphans.update(branch=target_branch)
print(f"Updated {e_count} orphaned Expenses to {target_branch.name}")

# Update Transactions
t_orphans = Transaction.objects.filter(branch__isnull=True)
t_count = t_orphans.count()
t_orphans.update(branch=target_branch)
print(f"Updated {t_count} orphaned Transactions to {target_branch.name}")

# Special Case: Transactions that should follow their linked Expense's branch
t_with_mismatch = 0
for tx in Transaction.objects.all():
    if tx.expense and tx.expense.branch and tx.branch != tx.expense.branch:
        tx.branch = tx.expense.branch
        tx.save()
        t_with_mismatch += 1
    elif tx.invoice and tx.invoice.branch and tx.branch != tx.invoice.branch:
        tx.branch = tx.invoice.branch
        tx.save()
        t_with_mismatch += 1

print(f"Re-synced {t_with_mismatch} Transactions to match their linked records.")
