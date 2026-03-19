import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounting.models import Transaction, Payroll, PettyCash, InterBranchTransfer

print("--- Retroactive Linking of Transactions ---")

# Link Salaries
salary_txs = Transaction.objects.filter(source='salary', payroll__isnull=True)
s_count = 0
for tx in salary_txs:
    try:
        payroll = Payroll.objects.get(id=int(tx.reference_id))
        tx.payroll = payroll
        tx.save()
        s_count += 1
    except:
        pass
print(f"Linked {s_count} Salary transactions.")

# Link Petty Cash
pc_txs = Transaction.objects.filter(source='petty_cash', petty_cash__isnull=True)
p_count = 0
for tx in pc_txs:
    try:
        pc = PettyCash.objects.get(id=int(tx.reference_id))
        tx.petty_cash = pc
        tx.save()
        p_count += 1
    except:
        pass
print(f"Linked {p_count} Petty Cash transactions.")

# Link Transfers
t_txs = Transaction.objects.filter(source='transfer', transfer__isnull=True)
t_count = 0
for tx in t_txs:
    try:
        t = InterBranchTransfer.objects.get(id=int(tx.reference_id))
        tx.transfer = t
        tx.save()
        t_count += 1
    except:
        pass
print(f"Linked {t_count} Transfer transactions.")

print("--- Linking complete ---")
