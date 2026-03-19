import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Expense

print("--- Expense Branch Audit ---")
all_expenses = Expense.objects.all()
for e in all_expenses:
    branch_name = e.branch.name if e.branch else "NULL"
    print(f"ID={e.id}, Date={e.date}, Amount=₹{e.amount}, Branch={branch_name}, Title={e.title}")
