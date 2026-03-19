"""
Fix Missing Workflow Transitions - Focused on Supervisor Final QC
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.workflow_config import WorkflowTemplate, WorkflowTransition

print("\n" + "="*80)
print("  FIXING MISSING WORKFLOW TRANSITIONS")
print("="*80 + "\n")

# Get all active templates
templates = WorkflowTemplate.objects.filter(is_active=True)
print(f"Active Templates: {templates.count()}\n")

for template in templates:
    print(f"\n{'='*80}")
    print(f"Template: {template.name}")
    print(f"  - ID: {template.id}")
    print(f"  - Is Default: {template.is_default}")
    print(f"  - Require Supervisor Review: {template.require_supervisor_review}")
    print(f"{'='*80}\n")
    
    # Critical transitions to ensure exist
    critical_transitions = [
        # Supervisor Final QC - ALWAYS REQUIRED
        {
            'from_status': 'work_completed',
            'to_status': 'final_qc_passed',
            'action_name': 'Final QC Pass',
            'description': 'Supervisor performs final quality check and passes',
            'allowed_roles': ['supervisor', 'super_admin'],
            'requires_assignment': False,
            'order': 70
        },
        {
            'from_status': 'work_completed',
            'to_status': 'final_qc_failed',
            'action_name': 'Final QC Fail',
            'description': 'Supervisor performs final quality check and fails',
            'allowed_roles': ['supervisor', 'super_admin'],
            'requires_assignment': False,
            'order': 71
        },
        # Supervisor Review - Only if required
        {
            'from_status': 'qc_completed',
            'to_status': 'supervisor_approved',
            'action_name': 'Approve QC',
            'description': 'Supervisor approves the QC report',
            'allowed_roles': ['supervisor', 'super_admin'],
            'requires_assignment': False,
            'order': 20,
            'skip_if': not template.require_supervisor_review
        },
        {
            'from_status': 'qc_completed',
            'to_status': 'qc_rejected',
            'action_name': 'Reject QC',
            'description': 'Supervisor rejects QC report',
            'allowed_roles': ['supervisor', 'super_admin'],
            'requires_assignment': False,
            'order': 21,
            'skip_if': not template.require_supervisor_review
        },
    ]
    
    created = 0
    updated = 0
    skipped = 0
    
    for trans_data in critical_transitions:
        # Check if should skip
        if trans_data.get('skip_if', False):
            print(f"  ⏭️  SKIP: {trans_data['action_name']} (not required by template)")
            skipped += 1
            continue
        
        # Check if exists
        existing = WorkflowTransition.objects.filter(
            template=template,
            from_status=trans_data['from_status'],
            to_status=trans_data['to_status']
        ).first()
        
        if existing:
            # Update if needed
            needs_update = False
            if existing.action_name != trans_data['action_name']:
                existing.action_name = trans_data['action_name']
                needs_update = True
            if existing.allowed_roles != trans_data['allowed_roles']:
                existing.allowed_roles = trans_data['allowed_roles']
                needs_update = True
            if not existing.is_active:
                existing.is_active = True
                needs_update = True
            
            if needs_update:
                existing.save()
                print(f"  🔄 UPDATED: {trans_data['action_name']}")
                print(f"      {trans_data['from_status']} → {trans_data['to_status']}")
                updated += 1
            else:
                print(f"  ✅ EXISTS: {trans_data['action_name']}")
        else:
            # Create new
            WorkflowTransition.objects.create(
                template=template,
                from_status=trans_data['from_status'],
                to_status=trans_data['to_status'],
                action_name=trans_data['action_name'],
                action_description=trans_data['description'],
                allowed_roles=trans_data['allowed_roles'],
                requires_assignment=trans_data['requires_assignment'],
                is_active=True,
                order=trans_data['order']
            )
            print(f"  ✨ CREATED: {trans_data['action_name']}")
            print(f"      {trans_data['from_status']} → {trans_data['to_status']}")
            print(f"      Roles: {', '.join(trans_data['allowed_roles'])}")
            created += 1
    
    print(f"\n  Summary for {template.name}:")
    print(f"    Created: {created}, Updated: {updated}, Skipped: {skipped}")

print("\n" + "="*80)
print("  VERIFICATION")
print("="*80 + "\n")

# Verify final QC transitions exist for all templates
all_good = True
for template in templates:
    final_qc_pass = WorkflowTransition.objects.filter(
        template=template,
        from_status='work_completed',
        to_status='final_qc_passed',
        is_active=True
    ).exists()
    
    final_qc_fail = WorkflowTransition.objects.filter(
        template=template,
        from_status='work_completed',
        to_status='final_qc_failed',
        is_active=True
    ).exists()
    
    print(f"{template.name}:")
    print(f"  {'✅' if final_qc_pass else '❌'} Final QC Pass transition")
    print(f"  {'✅' if final_qc_fail else '❌'} Final QC Fail transition")
    
    if not final_qc_pass or not final_qc_fail:
        all_good = False

print("\n" + "="*80)
if all_good:
    print("✅ SUCCESS: All critical transitions are configured!")
else:
    print("❌ ERROR: Some transitions are still missing!")
print("="*80 + "\n")
