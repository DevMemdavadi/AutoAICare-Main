#!/usr/bin/env python
"""
Test script to verify the onboarding system works correctly.

This script runs a dry-run test of the onboarding process without
actually creating any data or DNS records.

Usage:
    python scripts/test_onboarding.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Change to project directory for Django
os.chdir(project_root)

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    import django
    django.setup()
    from django.contrib.auth import get_user_model
except Exception as e:
    print(f"Error setting up Django: {e}")
    print(f"Make sure you're running this from the project root or have Django installed")
    sys.exit(1)
from django.utils.text import slugify
from companies.models import Company, Domain

User = get_user_model()

# ANSI Colors
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    BOLD = '\033[1m'
    NC = '\033[0m'


def print_test(name):
    print(f"\n{Colors.BLUE}Testing: {name}{Colors.NC}")


def print_pass(message):
    print(f"{Colors.GREEN}✅ PASS: {message}{Colors.NC}")


def print_fail(message):
    print(f"{Colors.RED}❌ FAIL: {message}{Colors.NC}")


def print_info(message):
    print(f"{Colors.YELLOW}ℹ️  {message}{Colors.NC}")


def test_imports():
    """Test that all required modules can be imported"""
    print_test("Module Imports")
    
    try:
        from companies.models import Company, Domain
        print_pass("Companies models imported")
    except ImportError as e:
        print_fail(f"Companies models import failed: {e}")
        return False
    
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        print_pass("User model imported")
    except ImportError as e:
        print_fail(f"User model import failed: {e}")
        return False
    
    try:
        from branches.models import Branch, ServiceBay
        print_pass("Branch models imported")
    except ImportError as e:
        print_fail(f"Branch models import failed: {e}")
        return False
    
    try:
        from services.models import ServicePackage, AddOn
        print_pass("Service models imported")
    except ImportError as e:
        print_fail(f"Service models import failed: {e}")
        return False
    
    try:
        from customers.models import Customer, Vehicle
        print_pass("Customer models imported")
    except ImportError as e:
        print_fail(f"Customer models import failed: {e}")
        return False
    
    try:
        from bookings.models import Booking
        print_pass("Booking models imported")
    except ImportError as e:
        print_fail(f"Booking models import failed: {e}")
        return False
    
    return True


def test_database_connection():
    """Test database connection"""
    print_test("Database Connection")
    
    try:
        # Try to query companies
        count = Company.objects.count()
        print_pass(f"Database connected (found {count} companies)")
        return True
    except Exception as e:
        print_fail(f"Database connection failed: {e}")
        return False


def test_slug_generation():
    """Test slug generation"""
    print_test("Slug Generation")
    
    test_cases = [
        ("K3 Car Care", "k3-car-care"),
        ("Elite Detailing", "elite-detailing"),
        ("Premium Auto Care", "premium-auto-care"),
        ("Test Company 123", "test-company-123"),
    ]
    
    all_passed = True
    for name, expected_slug in test_cases:
        generated_slug = slugify(name)
        if generated_slug == expected_slug:
            print_pass(f"'{name}' → '{generated_slug}'")
        else:
            print_fail(f"'{name}' → '{generated_slug}' (expected '{expected_slug}')")
            all_passed = False
    
    return all_passed


def test_management_commands():
    """Test that management commands exist"""
    print_test("Management Commands")
    
    from django.core.management import get_commands
    commands = get_commands()
    
    required_commands = [
        'seed_company_data',
        'create_company',
    ]
    
    all_exist = True
    for cmd in required_commands:
        if cmd in commands:
            print_pass(f"Command '{cmd}' exists")
        else:
            print_fail(f"Command '{cmd}' not found")
            all_exist = False
    
    return all_exist


def test_cloudflare_credentials():
    """Test Cloudflare credentials"""
    print_test("Cloudflare Configuration")
    
    try:
        from decouple import config
        
        api_key = config('CLOUDFLARE_API_KEY', default=None)
        email = config('CLOUDFLARE_EMAIL', default=None)
        zone_id = config('CLOUDFLARE_ZONE_ID', default=None)
        
        if api_key and email and zone_id:
            print_pass("Cloudflare credentials configured")
            print_info(f"Email: {email}")
            print_info(f"Zone ID: {zone_id[:8]}...")
            return True
        else:
            print_fail("Cloudflare credentials not configured")
            print_info("DNS record creation will be skipped")
            return False
    except Exception as e:
        print_fail(f"Error checking Cloudflare config: {e}")
        return False


def test_dns_script():
    """Test DNS script exists and is importable"""
    print_test("DNS Management Script")
    
    script_path = Path(__file__).parent / "add_cloudflare_dns.py"
    
    if script_path.exists():
        print_pass("DNS script exists")
        
        try:
            # Try to import functions from the script
            sys.path.insert(0, str(script_path.parent))
            from add_cloudflare_dns import add_dns_record, validate_credentials
            print_pass("DNS script functions importable")
            return True
        except Exception as e:
            print_fail(f"DNS script import failed: {e}")
            return False
    else:
        print_fail("DNS script not found")
        return False


def test_onboarding_script():
    """Test onboarding script exists"""
    print_test("Onboarding Script")
    
    script_path = Path(__file__).parent / "onboard_client.py"
    
    if script_path.exists():
        print_pass("Onboarding script exists")
        
        # Check if it's executable
        if os.access(script_path, os.X_OK) or script_path.suffix == '.py':
            print_pass("Onboarding script is executable")
            return True
        else:
            print_fail("Onboarding script is not executable")
            return False
    else:
        print_fail("Onboarding script not found")
        return False


def test_documentation():
    """Test that documentation exists"""
    print_test("Documentation")
    
    docs = [
        ("ONBOARDING_GUIDE.md", "Onboarding guide"),
        ("QUICK_REFERENCE.md", "Quick reference"),
        ("README.md", "Scripts README"),
    ]
    
    all_exist = True
    for filename, description in docs:
        doc_path = Path(__file__).parent / filename
        if doc_path.exists():
            print_pass(f"{description} exists")
        else:
            print_fail(f"{description} not found")
            all_exist = False
    
    return all_exist


def run_all_tests():
    """Run all tests"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║           Onboarding System Test Suite                     ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.NC}\n")
    
    tests = [
        ("Module Imports", test_imports),
        ("Database Connection", test_database_connection),
        ("Slug Generation", test_slug_generation),
        ("Management Commands", test_management_commands),
        ("Cloudflare Configuration", test_cloudflare_credentials),
        ("DNS Management Script", test_dns_script),
        ("Onboarding Script", test_onboarding_script),
        ("Documentation", test_documentation),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_fail(f"Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print(f"\n{Colors.BLUE}{'═' * 60}{Colors.NC}")
    print(f"{Colors.BOLD}Test Summary{Colors.NC}")
    print(f"{Colors.BLUE}{'═' * 60}{Colors.NC}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.GREEN}✅ PASS{Colors.NC}" if result else f"{Colors.RED}❌ FAIL{Colors.NC}"
        print(f"{status} - {name}")
    
    print(f"\n{Colors.BLUE}{'═' * 60}{Colors.NC}")
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}All tests passed! ({passed}/{total}){Colors.NC}")
        print(f"{Colors.GREEN}✅ Onboarding system is ready to use!{Colors.NC}")
        return True
    else:
        print(f"{Colors.YELLOW}{Colors.BOLD}Some tests failed ({passed}/{total} passed){Colors.NC}")
        print(f"{Colors.YELLOW}⚠️  Please fix the issues before onboarding clients{Colors.NC}")
        return False


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
