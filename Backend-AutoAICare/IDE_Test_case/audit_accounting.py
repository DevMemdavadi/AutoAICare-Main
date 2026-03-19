import os
import django
from django.db.models import Sum

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Expense, Transaction

print("--- Expense vs Transaction Audit ---")
all_expenses = Expense.objects.all()
expense_count = all_expenses.count()
expense_total = all_expenses.aggregate(Sum('amount'))['amount__sum'] or 0

print(f"Total Expenses in DB: {expense_count}")
print(f"Total Expense Amount: ₹{expense_total}")

expenses_with_tx = 0
for e in all_expenses:
    if Transaction.objects.filter(expense=e).exists():
        expenses_with_tx += 1
    else:
        print(f"MISSING TRANSACTION: ID={e.id}, Date={e.date}, Title={e.title}, Amount={e.amount}")

print(f"Expenses with Transactions: {expenses_with_tx}")
print(f"Expenses WITHOUT Transactions: {expense_count - expenses_with_tx}")

all_expense_tx = Transaction.objects.filter(transaction_type='expense')
tx_count = all_expense_tx.count()
tx_total = all_expense_tx.aggregate(Sum('amount'))['amount__sum'] or 0

print(f"Total Expense Transactions in DB: {tx_count}")
print(f"Total Transaction Amount: ₹{tx_total}")

# Date mismatch check
latest_tx = Transaction.objects.filter(transaction_type='expense').order_by('-date').first()
if latest_tx:
    print(f"Latest Transaction Date: {latest_tx.date}")

# Check if any transaction date is greatly different from expense date
sample_mismatch = []
for tx in all_expense_tx:
    if tx.expense:
        if tx.date.date() != tx.expense.date:
            sample_mismatch.append((tx.id, tx.date.date(), tx.expense.date, tx.amount))

print(f"Found {len(sample_mismatch)} date mismatches (TX date != Expense date)")
if sample_mismatch:
    print("Sample mismatches (TX Date, Expense Date, Amount):")
    for m in sample_mismatch[:5]:
        print(f"  TX {m[0]}: DB Date {m[1]} vs Expense Date {m[2]} (₹{m[3]})")
