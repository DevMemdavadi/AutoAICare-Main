import os
import django
from django.db.models import Sum

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Transaction

unlinked = Transaction.objects.filter(transaction_type='expense', expense__isnull=True)
print(f"Count: {unlinked.count()}")
for tx in unlinked:
    print(f"ID={tx.id}, Date={tx.date}, Amount=₹{tx.amount}, Source={tx.source}, Desc={tx.description}")
print(f"Total: ₹{unlinked.aggregate(Sum('amount'))['amount__sum']}")
