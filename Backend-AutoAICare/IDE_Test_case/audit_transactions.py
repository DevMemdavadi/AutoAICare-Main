import os
import django
from django.db.models import Sum

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Expense, Transaction

print("--- Transaction Detail Audit ---")
all_tx = Transaction.objects.filter(transaction_type='expense')
print(f"Total Expense Transactions Count: {all_tx.count()}")
print(f"Total Expense Transactions Amount: ₹{all_tx.aggregate(Sum('amount'))['amount__sum']}")

print("\n--- Top 20 Expense Transactions ---")
for tx in all_tx.order_by('-amount')[:20]:
    branch_name = tx.branch.name if tx.branch else "NULL"
    expense_title = tx.expense.title if tx.expense else "NO LINKED EXPENSE"
    print(f"ID={tx.id}, Date={tx.date}, Amount=₹{tx.amount}, Type={tx.transaction_type}, Source={tx.source}, Branch={branch_name}, Title={tx.description}")

print("\n--- Summary by Branch ---")
branch_totals = all_tx.values('branch__name').annotate(total=Sum('amount'))
for bt in branch_totals:
    print(f"Branch: {bt['branch__name'] or 'NULL'}, Total: ₹{bt['total']}")
