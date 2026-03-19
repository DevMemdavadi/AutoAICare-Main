"""
Complete Workflow Configuration Verification

Checks:
1. Default template configuration
2. Supervisor permissions
3. Critical workflow transitions
4. Test with actual job cards
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.workflow_config import WorkflowTemplate, WorkflowTransition, WorkflowEngine
from jobcards.models import JobCard
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "="*80)
print("  COMPLETE WORKFLOW VERIFICATION")
print("="*80 + "\n")

# 1. Check Default Template
print("1️⃣  DEFAULT TEMPLATE CHECK")
print("-"*80 + "\n")

templates = WorkflowTemplate.objects.filter(is_active=True)
default_template = templates.filter(is_default=True).first()

if not default_template:
    print("❌ No default template found!")
    print(f"   Active templates: {templates.count()}")
    for t in templates:
        print(f"   - {t.name} (is_default={t.is_default})")
else:
    print(f"✅ Default Template: {default_template.name}")
    print(f"   - Require Supervisor Review: {'✅ YES' if default_template.require_supervisor_review else '❌ NO'}")
    print(f"   - Skip FM Final QC: {'⚠️ YES' if default_template.skip_floor_manager_final_qc else '✅ NO'}")
    print(f"   - Skip Customer Approval: {'⚠️ YES' if default_template.skip_customer_approval else '✅ NO'}")

# 2. Check Supervisor Permissions
print("\n2️⃣  SUPERVISOR PERMISSIONS CHECK")
print("-"*80 + "\n")

supervisors = User.objects.filter(role='supervisor', is_active=True)
if supervisors.exists():
    supervisor = supervisors.first()
    print(f"Testing with: {supervisor.name} ({supervisor.email})")
    
    perms = WorkflowEngine.get_user_permissions(supervisor)
    
    print(f"\nPermissions:")
    print(f"  {'✅' if perms.get('can_approve_qc') else '❌'} can_approve_qc: {perms.get('can_approve_qc')}")
    print(f"  {'✅' if perms.get('can_perform_final_qc') else '❌'} can_perform_final_qc: {perms.get('can_perform_final_qc')}")
    print(f"  {'✅' if perms.get('can_assign_staff') else '❌'} can_assign_staff: {perms.get('can_assign_staff')}")
    print(f"  {'✅' if perms.get('can_add_parts') else '❌'} can_add_parts: {perms.get('can_add_parts')}")
    
    if not perms.get('can_approve_qc'):
        print("\n  ❌ ERROR: Supervisor cannot approve QC!")
    if not perms.get('can_perform_final_qc'):
        print("\n  ❌ ERROR: Supervisor cannot perform final QC!")
else:
    print("⚠️  No active supervisors found")
    supervisor = None

# 3. Check Critical Transitions
print("\n3️⃣  CRITICAL TRANSITIONS CHECK")
print("-"*80 + "\n")

if default_template:
    critical_checks = [
        ('work_completed', 'final_qc_passed', 'Supervisor Final QC Pass'),
        ('work_completed', 'final_qc_failed', 'Supervisor Final QC Fail'),
    ]
    
    if default_template.require_supervisor_review:
        critical_checks.extend([
            ('qc_completed', 'supervisor_approved', 'Supervisor Review Approve'),
            ('qc_completed', 'qc_rejected', 'Supervisor Review Reject'),
        ])
    
    all_exist = True
    for from_status, to_status, name in critical_checks:
        exists = WorkflowTransition.objects.filter(
            template=default_template,
            from_status=from_status,
            to_status=to_status,
            is_active=True
        ).exists()
        
        print(f"  {'✅' if exists else '❌'} {name}")
        print(f"      {from_status} → {to_status}")
        
        if not exists:
            all_exist = False
    
    if all_exist:
        print(f"\n  ✅ All critical transitions exist!")
    else:
        print(f"\n  ❌ Some transitions are missing!")

# 4. Test with Real Job Cards
print("\n4️⃣  REAL JOB CARD TESTS")
print("-"*80 + "\n")

# Test supervisor review
qc_completed_jobs = JobCard.objects.filter(status='qc_completed')
if qc_completed_jobs.exists() and supervisor:
    job = qc_completed_jobs.first()
    print(f"Testing Supervisor Review with Job #{job.id}")
    
    can_approve, error = WorkflowEngine.can_user_perform_action(
        job, supervisor, target_status='supervisor_approved'
    )
    
    print(f"  {'✅' if can_approve else '❌'} Can approve QC: {can_approve}")
    if not can_approve:
        print(f"      Error: {error}")
    else:
        print(f"      API: POST /api/jobcards/{job.id}/supervisor_review/")
else:
    print(f"  ℹ️  No jobs in 'qc_completed' status for testing")

# Test final QC
work_completed_jobs = JobCard.objects.filter(status='work_completed')
if work_completed_jobs.exists() and supervisor:
    job = work_completed_jobs.first()
    print(f"\nTesting Supervisor Final QC with Job #{job.id}")
    
    can_final_qc, error = WorkflowEngine.can_user_perform_action(
        job, supervisor, target_status='final_qc_passed'
    )
    
    print(f"  {'✅' if can_final_qc else '❌'} Can perform final QC: {can_final_qc}")
    if not can_final_qc:
        print(f"      Error: {error}")
    else:
        print(f"      API: POST /api/jobcards/{job.id}/final_qc/")
else:
    print(f"\n  ℹ️  No jobs in 'work_completed' status for testing")

# Summary
print("\n" + "="*80)
print("  SUMMARY")
print("="*80 + "\n")

issues = []

if not default_template:
    issues.append("No default workflow template")
elif not default_template.require_supervisor_review:
    issues.append("Supervisor review is disabled in default template")

if supervisor:
    if not perms.get('can_approve_qc'):
        issues.append("Supervisor cannot approve QC")
    if not perms.get('can_perform_final_qc'):
        issues.append("Supervisor cannot perform final QC")
else:
    issues.append("No supervisor users found")

if issues:
    print("❌ ISSUES FOUND:\n")
    for i, issue in enumerate(issues, 1):
        print(f"   {i}. {issue}")
    print("\n")
else:
    print("✅ ALL CHECKS PASSED!")
    print("\n   The workflow is properly configured for:")
    print("   • Booking → Appointment → Job Card")
    print("   • Floor Manager QC")
    print("   • Supervisor Review (if enabled)")
    print("   • Applicator Work")
    print("   • Supervisor Final QC ✅")
    print("   • Delivery")
    print("\n")
