from django.contrib.auth import get_user_model
from branches.models import Branch

User = get_user_model()

print("="*60)
print("DATABASE STATUS CHECK")
print("="*60)
print(f"\nTotal users: {User.objects.count()}")
print(f"  - Super admins: {User.objects.filter(role='super_admin').count()}")
print(f"  - Branch admins: {User.objects.filter(role='branch_admin').count()}")
print(f"  - Floor managers: {User.objects.filter(role='floor_manager').count()}")
print(f"  - Supervisors: {User.objects.filter(role='supervisor').count()}")
print(f"  - Applicators: {User.objects.filter(role='applicator').count()}")
print(f"  - Customers: {User.objects.filter(role='customer').count()}")

print(f"\nBranches: {Branch.objects.count()}")
for branch in Branch.objects.all():
    print(f"  - {branch.name} ({branch.code})")

print("\n" + "="*60)
