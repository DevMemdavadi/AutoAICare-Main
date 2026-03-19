"""
Quick test script to verify Phase 1 workflow improvements.

Run from Backend-AutoAICare directory:
python test_workflow_diagnostics.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.models import JobCard
from jobcards.workflow_config import WorkflowEngine
from django.contrib.auth import get_user_model

User = get_user_model()

def test_workflow_diagnostics():
    """Test the new workflow diagnostic features."""
    
    print("=" * 60)
    print("WORKFLOW DIAGNOSTIC TEST")
    print("=" * 60)
    print()
    
    # Get a sample job card and user
    jobcard = JobCard.objects.first()
    if not jobcard:
        print("❌ No job cards found. Create a job card first.")
        return
    
    user = User.objects.filter(role__in=['branch_admin', 'company_admin', 'super_admin']).first()
    if not user:
        print("❌ No admin users found.")
        return
    
    print(f"Testing with:")
    print(f"  Job Card: #{jobcard.id} (Status: {jobcard.status})")
    print(f"  User: {user.email} (Role: {user.role})")
    print()
    
    # Test 1: Get diagnostic info
    print("-" * 60)
    print("TEST 1: Workflow Diagnostic")
    print("-" * 60)
    
    diagnostic = WorkflowEngine.get_workflow_diagnostic(jobcard, user)
    
    print(f"✓ Template Found: {diagnostic['template_found']}")
    if diagnostic['template_found']:
        print(f"  Template: {diagnostic['template_name']} (ID: {diagnostic['template_id']})")
    
    print(f"✓ Transitions from '{jobcard.status}':")
    print(f"  Total: {diagnostic['transitions_from_status']}")
    print(f"  Active: {diagnostic['active_transitions']}")
    print(f"  Allowed: {diagnostic['allowed_transitions']}")
    print()
    
    if diagnostic['allowed_transition_details']:
        print("Allowed Transitions:")
        for t in diagnostic['allowed_transition_details']:
            print(f"  ✓ {t['action_name']}: {t['to_status']}")
            print(f"    Roles: {', '.join(t['allowed_roles'])}")
    
    if diagnostic['rejected_transitions']:
        print()
        print("Rejected Transitions:")
        for t in diagnostic['rejected_transitions']:
            print(f"  ✗ {t['action_name']}: {t['to_status']}")
            print(f"    Reason: {t['rejection_reason']}")
    
    print()
    
    # Test 2: Bulk permission methods exist
    print("-" * 60)
    print("TEST 2: Bulk Permission Methods")
    print("-" * 60)
    
    methods = [
        'bulk_update_transition_permissions',
        'sync_role_across_workflow_types',
        'get_workflow_diagnostic'
    ]
    
    for method in methods:
        if hasattr(WorkflowEngine, method):
            print(f"✓ {method} - Available")
        else:
            print(f"✗ {method} - Missing")
    
    print()
    
    # Test 3: Workflow transition count
    print("-" * 60)
    print("TEST 3: Workflow Statistics")
    print("-" * 60)
    
    from jobcards.workflow_config import WorkflowTemplate, WorkflowTransition
    
    templates = WorkflowTemplate.objects.filter(is_active=True)
    print(f"Active Templates: {templates.count()}")
    
    for template in templates:
        transitions = WorkflowTransition.objects.filter(template=template, is_active=True)
        print(f"  - {template.name}: {transitions.count()} active transitions")
    
    print()
    print("=" * 60)
    print("✓ All tests completed!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Test diagnostic endpoint via API")
    print("2. Try bulk permission updates")
    print("3. Check WORKFLOW_QUICK_REFERENCE.md for examples")


if __name__ == '__main__':
    test_workflow_diagnostics()
