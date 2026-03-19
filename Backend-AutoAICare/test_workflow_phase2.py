"""
Test script for Phase 2 workflow validation and analysis features.

Run from Backend-AutoAICare directory:
python test_workflow_phase2.py
"""

import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.workflow_config import WorkflowTemplate, WorkflowEngine

def print_header(title):
    """Print formatted header."""
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def print_subheader(title):
    """Print formatted subheader."""
    print("\n" + "-" * 70)
    print(f" {title}")
    print("-" * 70)

def test_phase2_features():
    """Test all Phase 2 features."""
    
    print_header("WORKFLOW PHASE 2 TEST - Advanced Validation & Analysis")
    
    # Get first active template
    template = WorkflowTemplate.objects.filter(is_active=True).first()
    if not template:
        print("❌ No active workflow templates found.")
        print("   Create a workflow template first:")
        print("   python manage.py create_simplified_workflow")
        return
    
    print(f"\nTesting with template: {template.name} (ID: {template.id})")
    print(f"Company: {template.company.name if template.company else 'N/A'}")
    
    # Test 1: Permission Conflict Detection
    print_subheader("TEST 1: Permission Conflict Detection")
    try:
        conflicts = WorkflowEngine.detect_permission_conflicts(template)
        print(f"✓ Conflict detection completed")
        print(f"  - Conflicts: {conflicts['conflict_count']}")
        print(f"  - Warnings: {conflicts['warning_count']}")
        print(f"  - Recommendations: {conflicts['recommendation_count']}")
        print(f"  - Has conflicts: {'YES' if conflicts['has_conflicts'] else 'NO'}")
        
        if conflicts['conflicts']:
            print("\n  Sample conflict:")
            conflict = conflicts['conflicts'][0]
            print(f"    Type: {conflict['type']}")
            print(f"    Severity: {conflict['severity']}")
            print(f"    Message: {conflict['message']}")
    except Exception as e:
        print(f"✗ Error in conflict detection: {str(e)}")
    
    # Test 2: Workflow Path Analysis
    print_subheader("TEST 2: Workflow Path Analysis")
    try:
        paths = WorkflowEngine.analyze_workflow_paths(template)
        print(f"✓ Path analysis completed")
        print(f"  - Total paths: {paths['total_paths']}")
        print(f"  - Shortest path: {paths['shortest_path_length']} steps")
        print(f"  - Longest path: {paths['longest_path_length']} steps")
        print(f"  - Average path: {paths['average_path_length']:.1f} steps")
        print(f"  - Bottlenecks: {len(paths['bottlenecks'])}")
        print(f"  - Alternative routes: {len(paths['alternative_routes'])}")
        
        if paths['bottlenecks']:
            print("\n  Bottleneck detected:")
            for bottleneck in paths['bottlenecks'][:3]:  # Show first 3
                print(f"    - {bottleneck['status']} ({bottleneck['frequency']} paths pass through)")
    except Exception as e:
        print(f"✗ Error in path analysis: {str(e)}")
    
    # Test 3: Coverage Report
    print_subheader("TEST 3: Coverage Report")
    try:
        coverage = WorkflowEngine.get_workflow_coverage_report(template)
        print(f"✓ Coverage report generated")
        print(f"  - Total transitions: {coverage['total_transitions']}")
        print(f"  - Total roles: {coverage['total_roles']}")
        print(f"  - Coverage gaps: {len(coverage['coverage_gaps'])}")
        print(f"  - Fully covered actions: {len(coverage['fully_covered_actions'])}")
        
        print("\n  Role coverage percentages:")
        for role, data in coverage['role_coverage'].items():
            percentage = data['coverage_percentage']
            bar_length = int(percentage / 5)  # Scale to 20 chars max
            bar = '█' * bar_length + '░' * (20 - bar_length)
            print(f"    {role:20s} {bar} {percentage:5.1f}%")
        
        if coverage['coverage_gaps']:
            print(f"\n  Coverage gaps (actions with ≤1 role):")
            for gap in coverage['coverage_gaps'][:5]:  # Show first 5
                print(f"    - {gap['action']}: {gap['role_count']} role(s)")
    except Exception as e:
        print(f"✗ Error in coverage report: {str(e)}")
    
    # Test 4: Optimization Suggestions
    print_subheader("TEST 4: Optimization Suggestions")
    try:
        suggestions = WorkflowEngine.get_optimization_suggestions(template)
        print(f"✓ Optimization suggestions generated")
        print(f"  - Total suggestions: {suggestions['total_suggestions']}")
        print(f"  - High priority: {suggestions['high_priority']}")
        print(f"  - Medium priority: {suggestions['medium_priority']}")
        print(f"  - Low priority: {suggestions['low_priority']}")
        
        if suggestions['suggestions']:
            print("\n  Top suggestions:")
            for sugg in suggestions['suggestions'][:5]:  # Show first 5
                priority_icon = {
                    'HIGH': '🚨',
                    'MEDIUM': '⚠️',
                    'LOW': '💡'
                }.get(sugg['priority'], '•')
                print(f"    {priority_icon} [{sugg['priority']}] {sugg['title']}")
                print(f"       {sugg['description']}")
    except Exception as e:
        print(f"✗ Error in optimization suggestions: {str(e)}")
    
    # Test 5: Comprehensive Analysis
    print_subheader("TEST 5: Comprehensive Analysis")
    try:
        report = WorkflowEngine.comprehensive_workflow_analysis(template)
        print(f"✓ Comprehensive analysis completed")
        print(f"  - Overall health score: {report['overall_health_score']}/100")
        print(f"  - Analysis duration: {report['analysis_duration_ms']}ms")
        print(f"  - Analyzed at: {report['analyzed_at']}")
        
        # Health score interpretation
        score = report['overall_health_score']
        if score >= 80:
            status = "EXCELLENT ✅"
            emoji = "🎉"
        elif score >= 60:
            status = "GOOD ⚠️"
            emoji = "👍"
        elif score >= 40:
            status = "FAIR 🔶"
            emoji = "⚠️"
        else:
            status = "POOR 🚨"
            emoji = "❌"
        
        print(f"\n  {emoji} Workflow Status: {status}")
        
        # Show integrity summary
        integrity = report['integrity']
        print(f"\n  Integrity Check:")
        print(f"    - Valid: {'YES ✓' if integrity['is_valid'] else 'NO ✗'}")
        print(f"    - Errors: {integrity['error_count']}")
        print(f"    - Warnings: {integrity['warning_count']}")
        
        # Show permission summary
        perm = report['permission_conflicts']['summary']
        print(f"\n  Permission Conflicts:")
        print(f"    - High severity: {perm['high_severity']}")
        print(f"    - Medium severity: {perm['medium_severity']}")
        print(f"    - Low severity: {perm['low_severity']}")
        
    except Exception as e:
        print(f"✗ Error in comprehensive analysis: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print_header("TEST SUMMARY")
    print("\nPhase 2 Methods Available:")
    methods = [
        'detect_permission_conflicts',
        'analyze_workflow_paths',
        'get_workflow_coverage_report',
        'get_optimization_suggestions',
        'comprehensive_workflow_analysis'
    ]
    
    for method in methods:
        if hasattr(WorkflowEngine, method):
            print(f"  ✓ {method}")
        else:
            print(f"  ✗ {method} - MISSING")
    
    print("\n" + "=" * 70)
    print(" All Phase 2 tests completed!")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Review the health score and address high-priority issues")
    print("2. Test API endpoints via HTTP")
    print("3. Check WORKFLOW_PHASE2_QUICK_REFERENCE.md for usage examples")
    print()

if __name__ == '__main__':
    test_phase2_features()
