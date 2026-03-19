import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Transaction, Expense

# Fix expenses that don't have payment_method on their Transactions
expense_transactions = Transaction.objects.filter(transaction_type='expense', source='expense', payment_method__isnull=True)
updated_count = 0
for tx in expense_transactions:
    if tx.expense and tx.expense.payment_method:
        tx.payment_method = tx.expense.payment_method
        tx.save()
        updated_count += 1

print(f"Updated {updated_count} expense transactions with payment method.")

# Fix income transactions that don't have payment_method (should be rare if signal worked)
income_transactions = Transaction.objects.filter(transaction_type='income', payment_method__isnull=True)
updated_income_count = 0
for tx in income_transactions:
    # Try to find payment method from related invoice's actual payments
    if tx.invoice:
        latest_payment = tx.invoice.payments.filter(payment_status='completed').first()
        if latest_payment:
            tx.payment_method = latest_payment.payment_method
            tx.save()
            updated_income_count += 1

print(f"Updated {updated_income_count} income transactions with payment method.")
