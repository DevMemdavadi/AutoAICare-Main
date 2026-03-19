import os
import django
from django.db.models import Sum

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Transaction, Expense

print("--- Identifying Extra Transactions ---")
# Transactions of type 'expense'
expense_txs = Transaction.objects.filter(transaction_type='expense')
total_tx_amount = expense_txs.aggregate(Sum('amount'))['amount__sum'] or 0
print(f"Total Expense Transactions: {expense_txs.count()} (₹{total_tx_amount})")

# Linked vs Unlinked
linked = expense_txs.filter(expense__isnull=False)
unlinked = expense_txs.filter(expense__isnull=True)

print(f"Linked to Expense Objects: {linked.count()} (₹{linked.aggregate(Sum('amount'))['amount__sum'] or 0})")
print(f"Unlinked (Orphaned Ledger Entries): {unlinked.count()} (₹{unlinked.aggregate(Sum('amount'))['amount__sum'] or 0})")

if unlinked.exists():
    print("\n--- Unlinked Transactions Detail ---")
    for tx in unlinked:
        print(f"ID={tx.id}, Date={tx.date}, Amount=₹{tx.amount}, Source={tx.source}, Desc={tx.description}")

# Check for duplicates (Multiple transactions for same expense)
print("\n--- Checking for Potential Duplicates ---")
from django.db.models import Count
dup_check = expense_txs.values('expense').annotate(tx_count=Count('id')).filter(tx_count__gt=1, expense__isnull=False)
if dup_check.exists():
    for dup in dup_check:
        exp = Expense.objects.get(id=dup['expense'])
        print(f"DUPLICATE FOUND: Expense ID {exp.id} ('{exp.title}') has {dup['tx_count']} transactions in ledger.")
        txs = Transaction.objects.filter(expense=exp)
        for t in txs:
            print(f"  -> TX ID {t.id}, Date {t.date}, Amount ₹{t.amount}")
else:
    print("No duplicate transactions found for single expenses.")
