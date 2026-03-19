"""
Enable Supervisor Review in Default Template

This script enables the supervisor review step in the workflow,
so supervisors review QC reports before work starts.
"""
import os
import django


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.workflow_config import WorkflowTemplate

print("\n" + "="*80)
print("  ENABLE SUPERVISOR REVIEW")
print("="*80 + "\n")

# Get default template
template = WorkflowTemplate.objects.filter(is_default=True).first()

if not template:
    print("❌ No default template found!")
    templates = WorkflowTemplate.objects.filter(is_active=True)
    print(f"\nActive templates ({templates.count()}):")
    for t in templates:
        print(f"  - {t.name} (ID: {t.id}, is_default={t.is_default})")
    exit(1)

print(f"Default Template: {template.name}")
print(f"Current Configuration:")
print(f"  - require_supervisor_review: {template.require_supervisor_review}")
print(f"  - skip_floor_manager_final_qc: {template.skip_floor_manager_final_qc}")
print(f"  - skip_customer_approval: {template.skip_customer_approval}")

if template.require_supervisor_review:
    print(f"\n✅ Supervisor review is already ENABLED")
    print(f"   No changes needed.")
else:
    print(f"\n⚙️  Enabling supervisor review...")
    template.require_supervisor_review = True
    template.save()
    
    print(f"✅ SUCCESS! Supervisor review is now ENABLED")
    print(f"\n📋 Updated workflow:")
    print(f"   1. Floor Manager completes QC")
    print(f"   2. ✅ Supervisor reviews and approves/rejects QC")
    print(f"   3. Floor Manager confirms supervisor decision")
    print(f"   4. Assign applicator team")
    print(f"   5. Work execution")
    print(f"   6. ✅ Supervisor performs final QC")
    print(f"   7. Delivery")
    
    print(f"\n⚠️  IMPORTANT: Run this command to create the transitions:")
    print(f"   python fix_missing_transitions.py")

print("\n" + "="*80 + "\n")
