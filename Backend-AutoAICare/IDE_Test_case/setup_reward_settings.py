"""
Script to create default reward settings for the system.
Run this after migration to set up initial reward configuration.
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.models import RewardSettings
from branches.models import Branch

def create_default_reward_settings():
    """Create default global reward settings"""
    
    # Check if global settings already exist
    existing = RewardSettings.objects.filter(branch__isnull=True, is_active=True).first()
    
    if existing:
        print(f"✓ Global reward settings already exist (ID: {existing.id})")
        print(f"  - Tier 1: {existing.tier_1_minutes} min early = ₹{existing.tier_1_amount}")
        print(f"  - Tier 2: {existing.tier_2_minutes} min early = ₹{existing.tier_2_amount}")
        print(f"  - Tier 3: {existing.tier_3_minutes} min early = ₹{existing.tier_3_amount}")
        print(f"  - Deduction: ₹{existing.deduction_per_minute}/min (max ₹{existing.max_deduction_per_job})")
        print(f"  - Applicator share: {existing.applicator_share_percentage}%")
        return existing
    
    # Create new global settings with default values
    settings = RewardSettings.objects.create(
        branch=None,  # Global settings
        
        # Reward tiers (early completion)
        tier_1_minutes=15,
        tier_1_amount=100,
        
        tier_2_minutes=30,
        tier_2_amount=200,
        
        tier_3_minutes=45,
        tier_3_amount=300,
        
        # Deduction rules (late completion)
        deduction_enabled=True,
        deduction_threshold_minutes=15,
        deduction_per_minute=5,
        max_deduction_per_job=500,
        
        # Distribution settings
        applicator_share_percentage=50.00,  # 50% to applicators, 50% to supervisor
        apply_deduction_to_applicators=True,  # Both get deductions
        
        is_active=True
    )
    
    print("✓ Created default global reward settings:")
    print(f"  - Tier 1: Complete 15+ min early = ₹100 reward")
    print(f"  - Tier 2: Complete 30+ min early = ₹200 reward")
    print(f"  - Tier 3: Complete 45+ min early = ₹300 reward")
    print(f"  - Deduction: ₹5/min late (starts after 15 min, max ₹500)")
    print(f"  - Distribution: 50% supervisor, 50% applicator team (equal split)")
    print(f"  - Deductions apply to both supervisor and applicators")
    
    return settings


def create_branch_specific_settings():
    """Optionally create branch-specific settings"""
    
    branches = Branch.objects.all()
    
    if not branches.exists():
        print("\n⚠ No branches found. Skipping branch-specific settings.")
        return
    
    print(f"\n📍 Found {branches.count()} branch(es).")
    print("   You can create branch-specific settings later via admin panel or API.")
    
    # Example: Create settings for first branch (commented out by default)
    # first_branch = branches.first()
    # branch_settings = RewardSettings.objects.create(
    #     branch=first_branch,
    #     tier_1_minutes=10,
    #     tier_1_amount=150,
    #     # ... other settings
    #     is_active=True
    # )
    # print(f"✓ Created settings for branch: {first_branch.name}")


if __name__ == '__main__':
    print("=" * 60)
    print("Setting up Reward System - Default Configuration")
    print("=" * 60)
    print()
    
    settings = create_default_reward_settings()
    create_branch_specific_settings()
    
    print()
    print("=" * 60)
    print("✓ Reward system setup complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review settings in Django admin: /admin/jobcards/rewardsettings/")
    print("2. Adjust reward amounts and thresholds as needed")
    print("3. Create branch-specific settings if required")
    print("4. Test with a job completion to see rewards in action")
    print()
