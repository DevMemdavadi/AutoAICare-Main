import os
import django
from django.db.models import Sum

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Transaction, Expense
from users.models import User
from branches.models import Branch

print("--- System Branch & User Audit ---")
branches = Branch.objects.all()
for b in branches:
    print(f"Branch: ID={b.id}, Name={b.name}")

users = User.objects.filter(is_staff=True)
for u in users:
    branch_name = u.branch.name if u.branch else "NULL"
    print(f"User: {u.name}, Role={u.role}, Branch={branch_name}")

print("\n--- Expense Branch Totals ---")
e_totals = Expense.objects.values('branch_id', 'branch__name').annotate(total=Sum('amount'))
for et in e_totals:
    print(f"Branch ID={et['branch_id']} ({et['branch__name'] or 'NULL'}): Total=₹{et['total']}")

print("\n--- Transaction Branch Totals (Expense Type) ---")
t_totals = Transaction.objects.filter(transaction_type='expense').values('branch_id', 'branch__name').annotate(total=Sum('amount'))
for tt in t_totals:
    print(f"Branch ID={tt['branch_id']} ({tt['branch__name'] or 'NULL'}): Total=₹{tt['total']}")

# Let's try to simulate the summary calculation for a specific branch
target_branch = Branch.objects.first()
if target_branch:
    print(f"\n--- Simulating Summary for Branch: {target_branch.name} ---")
    # Simulation based on non-superuser logic
    from django.db.models import Q
    qs = Transaction.objects.filter(Q(branch=target_branch) | Q(branch__isnull=True))
    t_inc = qs.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0
    t_exp = qs.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0
    print(f"Simulated (Branch OR NULL): Income=₹{t_inc}, Expense=₹{t_exp}")
    
    # Simulation based on superuser specific branch logic
    qs_strict = Transaction.objects.filter(branch=target_branch)
    t_inc_s = qs_strict.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0
    t_exp_s = qs_strict.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0
    print(f"Simulated (STRICT Branch): Income=₹{t_inc_s}, Expense=₹{t_exp_s}")
