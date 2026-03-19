# Phase 2 - Quick Reference Guide

## 🎯 Quick Start

### Get Workflow Health Score

```bash
curl http://localhost:8000/api/workflow/templates/1/comprehensive-analysis/ | python -m json.tool
```

Look for `overall_health_score`:

- **80-100**: Excellent ✅
- **60-79**: Good, minor improvements needed ⚠️
- **40-59**: Fair, several issues to address 🔶
- **0-39**: Poor, immediate attention required 🚨

---

## 📊 Main Endpoints

### 1. Comprehensive Analysis (Start Here!)

```bash
GET /api/workflow/templates/{id}/comprehensive-analysis/
```

Returns everything:

- Workflow integrity
- Permission conflicts
- Path analysis
- Coverage report
- Optimization suggestions
- Overall health score

### 2. Permission Conflict Detection

```bash
GET /api/workflow/templates/{id}/detect-conflicts/
```

Find:

- Transitions with no roles (HIGH priority)
- Role inconsistencies
- Over-restrictive permissions
- Duplicate paths

### 3. Workflow Path Analysis

```bash
GET /api/workflow/templates/{id}/analyze-paths/
```

See:

- Average workflow length
- Bottlenecks (statuses all paths go through)
- Alternative routes
- Shortest vs longest paths

### 4. Coverage Report

```bash
GET /api/workflow/templates/{id}/coverage-report/
```

Shows:

- What % of actions each role can perform
- Coverage gaps (actions few can perform)
- Fully covered actions

### 5. Optimization Suggestions

```bash
GET /api/workflow/templates/{id}/optimization-suggestions/
```

Get:

- Prioritized list of improvements
- Actionable recommendations
- Specific details for each issue

---

## 🔧 Common Workflows

### Workflow 1: Validate New Template

```bash
# 1. Run comprehensive analysis
curl http://localhost:8000/api/workflow/templates/1/comprehensive-analysis/

# 2. Check health_score
# If < 70, review optimization_suggestions

# 3. Fix issues using Phase 1 tools
python manage.py sync_workflow_permissions --role branch_admin --action add

# 4. Re-validate
curl http://localhost:8000/api/workflow/templates/1/comprehensive-analysis/
```

### Workflow 2: Find Why Actions Are Blocked

```bash
# 1. Check coverage gaps
curl http://localhost:8000/api/workflow/templates/1/coverage-report/ | jq '.coverage_gaps'

# 2. Look for actions with role_count == 0 or 1

# 3. Fix using bulk sync
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --ids 12 13 14  # IDs from coverage gaps
```

### Workflow 3: Optimize Complex Workflow

```bash
# 1. Analyze paths
curl http://localhost:8000/api/workflow/templates/1/analyze-paths/

# 2. Check average_path_length
# If > 15, workflow might be too complex

# 3. Look at bottlenecks
# If many bottlenecks, consider alternative paths

# 4. Get specific suggestions
curl http://localhost:8000/api/workflow/templates/1/optimization-suggestions/
```

### Workflow 4: Audit After Bulk Changes

```bash
# After making bulk permission updates...

# 1. Detect conflicts
curl http://localhost:8000/api/workflow/templates/1/detect-conflicts/

# 2. Look for:
# - ROLE_INCONSISTENCY (similar actions with different roles)
# - DUPLICATE_PATH (multiple transitions same path)
# - OVER_PERMISSIVE (everyone has access)

# 3. Review and fix inconsistencies
```

---

## 🎨 Understanding Health Score

**Formula**:

```text
Base: 100 points

Deductions:
- Error: -10
- High-severity conflict: -10
- Medium-severity conflict: -5
- Warning: -2

Bonus:
- Good coverage: +0 to +10

Result: Max(0, Min(100, score))
```

**Examples**:

| Score | Status | What It Means |
| :--- | :--- | :--- |
| 95-100 | Excellent | Production-ready, minimal issues |
| 80-94 | Very Good | Minor warnings, safe to use |
| 65-79 | Good | Some improvements recommended |
| 50-64 | Fair | Notable issues, fix before production |
| 35-49 | Poor | Significant problems |
| 0-34 | Critical | Immediate attention required |

---

## 📈 Python Usage

### Check Health Before Deploying

```python
from jobcards.workflow_config import WorkflowEngine, WorkflowTemplate

template = WorkflowTemplate.objects.get(id=1)
report = WorkflowEngine.comprehensive_workflow_analysis(template)

if report['overall_health_score'] < 70:
    print("⚠ Workflow not ready for production!")
    print(f"Found {report['optimization_suggestions']['high_priority']} high-priority issues")
    
    for sugg in report['optimization_suggestions']['suggestions']:
        if sugg['priority'] == 'HIGH':
            print(f"  - {sugg['title']}")
else:
    print("✓ Workflow ready to deploy!")
    template.is_active = True
    template.save()
```

### Find All Permission Gaps

```python
coverage = WorkflowEngine.get_workflow_coverage_report(template)

for gap in coverage['coverage_gaps']:
    if gap['role_count'] == 0:
        print(f"CRITICAL: Nobody can perform '{gap['action']}'")
    elif gap['role_count'] == 1:
        print(f"WARNING: Only {gap['roles'][0]} can perform '{gap['action']}'")
```

### Detect Bottlenecks

```python
paths = WorkflowEngine.analyze_workflow_paths(template)

if paths['bottlenecks']:
    print(f"Found {len(paths['bottlenecks'])} bottleneck(s):")
    for bottleneck in paths['bottlenecks']:
        print(f"  - {bottleneck['status']} (100% of paths pass through)")
else:
    print("✓ No bottlenecks detected")
```

---

## 🎯 Priority Guide

### HIGH Priority (Fix Immediately)

- ❌ Transitions with no allowed roles
- ❌ Actions nobody can perform
- ❌ Broken workflow (errors from integrity check)

### MEDIUM Priority (Fix Soon)

- ⚠️ Role inconsistencies
- ⚠️ Duplicate paths
- ⚠️ Bottlenecks forcing all workflows through single status

### LOW Priority (Consider Improvements)

- 💡 Single-role restrictions
- 💡 Missing admin oversight
- 💡 Complex workflows (>15 steps)
- 💡 Low role coverage

---

## 🔍 Understanding Results

### Permission Conflict Types

| Type | Severity | What It Means | How to Fix |
|------|----------|---------------|------------|
| NO_ROLES | HIGH | Nobody can perform action | Add roles immediately |
| DUPLICATE_PATH | MEDIUM | Multiple transitions between same statuses | Review and consolidate |
| ROLE_INCONSISTENCY | MEDIUM | Similar actions have different roles | Standardize permissions |
| SINGLE_ROLE | LOW | Only one role can perform | Consider adding backup |
| OVER_PERMISSIVE | LOW | Everyone has access | Review if intentional |
| MISSING_ADMIN_ROLE | LOW | No admin oversight | Consider adding admin |

### Path Analysis Metrics

| Metric | Good | Fair | Poor |
| :--- | :--- | :--- | :--- |
| Average Path Length | < 12 | 12-15 | > 15 |
| Bottlenecks | 0-1 | 2-3 | > 3 |
| Alternative Routes | > 5 | 2-5 | 0-1 |

### Coverage Metrics

| Role Coverage % | Rating |
| :--- | :--- |
| 70-100% | Excellent |
| 50-69% | Good |
| 30-49% | Fair |
| < 30% | Limited |

---

## 💡 Tips

1. **Run comprehensive analysis weekly** to catch issues early
2. **Aim for health score > 80** for production workflows
3. **Fix HIGH priority issues immediately** before deploying
4. **Document bottlenecks** - they may be intentional checkpoints
5. **Balance coverage** - not every role needs every permission
6. **Review after bulk changes** to ensure consistency

---

## 🔗 Integration with Phase 1

### Phase 1 Tools (Fixes)

```bash
python manage.py sync_workflow_permissions --role X --action add
```

### Phase 2 Tools (Analysis)

```bash
curl /api/workflow/templates/1/comprehensive-analysis/
```

### Recommended Flow

1. **Analyze** (Phase 2) → Find issues
2. **Fix** (Phase 1) → Apply solutions  
3. **Verify** (Phase 2) → Confirm improvements
4. **Repeat** until health score is acceptable

---

## 📚 See Also

- `WORKFLOW_PHASE2_DOCUMENTATION.md` - Complete technical reference
- `WORKFLOW_PHASE1_DOCUMENTATION.md` - Diagnostic and fixes
- `WORKFLOW_QUICK_REFERENCE.md` - Phase 1 quick reference

---

## ⚡ One-Liners

```bash
# Get health score only
curl -s http://localhost:8000/api/workflow/templates/1/comprehensive-analysis/ | jq '.overall_health_score'

# List high-priority issues
curl -s http://localhost:8000/api/workflow/templates/1/optimization-suggestions/ | jq '.suggestions[] | select(.priority == "HIGH")'

# Count coverage gaps
curl -s http://localhost:8000/api/workflow/templates/1/coverage-report/ | jq '.coverage_gaps | length'

# Find bottlenecks
curl -s http://localhost:8000/api/workflow/templates/1/analyze-paths/ | jq '.bottlenecks'

# Check for conflicts
curl -s http://localhost:8000/api/workflow/templates/1/detect-conflicts/ | jq '{conflicts: .conflict_count, warnings: .warning_count}'
```

---

## 🚀 Ready to Use

Phase 2 analysis tools are production-ready. Start with:

```bash
curl http://localhost:8000/api/workflow/templates/1/comprehensive-analysis/ | python -m json.tool
```

Then review `overall_health_score` and `optimization_suggestions`! 🎯
