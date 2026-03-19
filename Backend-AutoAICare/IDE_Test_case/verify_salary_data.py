"""Simple script to verify salary seeding data"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from accounting.models import EmployeeSalaryStructure, Payroll
from django.contrib.auth import get_user_model

User = get_user_model()

print("="*60)
print("EMPLOYEE SALARY DATA VERIFICATION")
print("="*60)

# Count employees by role
print("\n--- Employees by Role ---")
for role in ['branch_admin', 'floor_manager', 'supervisor', 'applicator']:
    count = User.objects.filter(role=role, is_active=True).count()
    print(f"  {role}: {count}")

# Count salary structures
print(f"\n--- Salary Structures ---")
print(f"  Total: {EmployeeSalaryStructure.objects.count()}")
for role in ['branch_admin', 'floor_manager', 'supervisor', 'applicator']:
    count = EmployeeSalaryStructure.objects.filter(employee__role=role).count()
    print(f"  {role}: {count}")

# Count payroll records
print(f"\n--- Payroll Records ---")
print(f"  Total: {Payroll.objects.count()}")
for status in ['pending', 'approved', 'paid']:
    count = Payroll.objects.filter(status=status).count()
    print(f"  {status}: {count}")

# Show sample salary structures
print("\n--- Sample Salary Structures ---")
for structure in EmployeeSalaryStructure.objects.select_related('employee')[:5]:
    print(f"  {structure.employee.name} ({structure.employee.role})")
    print(f"    Base: ₹{structure.base_salary:.0f}, Gross: ₹{structure.calculate_gross_salary():.0f}, Net: ₹{structure.calculate_net_salary():.0f}")

# Show sample payroll
print("\n--- Sample Payroll Records (Current Month) ---")
for payroll in Payroll.objects.filter(status='pending').select_related('employee')[:5]:
    print(f"  {payroll.employee.name}: ₹{payroll.net_salary:.0f} ({payroll.status})")

print("\n" + "="*60)
print("VERIFICATION COMPLETE")
print("="*60)
