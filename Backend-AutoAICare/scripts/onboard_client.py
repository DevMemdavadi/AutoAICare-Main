#!/usr/bin/env python
"""
Complete Client Onboarding Script for AutoAICare

This script automates the entire process of onboarding a new client:
1. Creates company in database
2. Adds domain mapping
3. Creates DNS record in Cloudflare
4. Optionally seeds comprehensive test data
5. Generates onboarding summary

Usage:
    python scripts/onboard_client.py
    python scripts/onboard_client.py --seed-data
    python scripts/onboard_client.py --company-name "K3 Car Care" --subdomain k3car --seed-data
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime
import argparse

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
from django.utils.text import slugify
from companies.models import Company, Domain

User = get_user_model()

# ANSI Colors
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    CYAN = '\033[0;36m'
    MAGENTA = '\033[0;35m'
    BOLD = '\033[1m'
    NC = '\033[0m'  # No Color


def print_header():
    """Print script header"""
    print(f"{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║        🚀 AutoAICare Client Onboarding System 🚀          ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.NC}\n")


def print_step(step_num, total_steps, title):
    """Print step header"""
    print(f"\n{Colors.BLUE}{'━' * 60}{Colors.NC}")
    print(f"{Colors.GREEN}{Colors.BOLD}Step {step_num}/{total_steps}: {title}{Colors.NC}")
    print(f"{Colors.BLUE}{'━' * 60}{Colors.NC}\n")


def print_success(message):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {message}{Colors.NC}")


def print_error(message):
    """Print error message"""
    print(f"{Colors.RED}❌ {message}{Colors.NC}")


def print_warning(message):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.NC}")


def print_info(message):
    """Print info message"""
    print(f"{Colors.CYAN}ℹ️  {message}{Colors.NC}")


def get_user_input(args):
    """Get user input for company details"""
    print(f"{Colors.YELLOW}Please provide the following information:{Colors.NC}\n")
    
    data = {}
    
    # Company Information
    data['company_name'] = args.company_name or input("Company Name: ").strip()
    data['company_email'] = args.company_email or input("Company Email: ").strip()
    data['company_phone'] = args.company_phone or input("Company Phone (10 digits): ").strip()
    data['city'] = args.city or input("City: ").strip()
    data['state'] = args.state or input("State: ").strip()
    
    print()
    
    # Admin Information
    data['admin_name'] = args.admin_name or input("Admin Name: ").strip()
    data['admin_email'] = args.admin_email or input("Admin Email: ").strip()
    
    if args.admin_password:
        data['admin_password'] = args.admin_password
    else:
        import getpass
        data['admin_password'] = getpass.getpass("Admin Password: ").strip()
    
    print()
    
    # Subdomain
    data['subdomain'] = args.subdomain or input("Subdomain (e.g., k3car for k3car.autoaicare.com): ").strip()
    
    # Generate slug
    data['company_slug'] = slugify(data['company_name'])
    
    return data


def confirm_details(data):
    """Display and confirm details"""
    print(f"\n{Colors.YELLOW}{'━' * 60}{Colors.NC}")
    print(f"{Colors.YELLOW}{Colors.BOLD}Please confirm the following details:{Colors.NC}")
    print(f"{Colors.YELLOW}{'━' * 60}{Colors.NC}\n")
    
    print(f"{Colors.BOLD}Company Information:{Colors.NC}")
    print(f"  Name:           {data['company_name']}")
    print(f"  Slug:           {data['company_slug']}")
    print(f"  Email:          {data['company_email']}")
    print(f"  Phone:          {data['company_phone']}")
    print(f"  City:           {data['city']}")
    print(f"  State:          {data['state']}")
    
    print(f"\n{Colors.BOLD}Admin Information:{Colors.NC}")
    print(f"  Name:           {data['admin_name']}")
    print(f"  Email:          {data['admin_email']}")
    print(f"  Password:       {'*' * len(data['admin_password'])}")
    
    print(f"\n{Colors.BOLD}Access Information:{Colors.NC}")
    print(f"  Subdomain:      {data['subdomain']}.autoaicare.com")
    print(f"  URL:            https://{data['subdomain']}.autoaicare.com")
    
    print()
    
    response = input(f"{Colors.YELLOW}Is this correct? (y/n): {Colors.NC}").strip().lower()
    return response in ['y', 'yes']


def create_company(data):
    """Create company in database"""
    print_step(1, 5, "Creating Company in Database")
    
    try:
        # Check if company already exists
        if Company.objects.filter(slug=data['company_slug']).exists():
            print_warning(f"Company with slug '{data['company_slug']}' already exists")
            company = Company.objects.get(slug=data['company_slug'])
            print_info(f"Using existing company: {company.name}")
            return company
        
        # Create company
        company = Company.objects.create(
            name=data['company_name'],
            slug=data['company_slug'],
            email=data['company_email'],
            phone=data['company_phone'],
            city=data['city'],
            state=data['state'],
            is_active=True
        )
        
        print_success(f"Company created: {company.name}")
        print_info(f"Company ID: {company.id}")
        print_info(f"Company Slug: {company.slug}")
        
        return company
        
    except Exception as e:
        print_error(f"Failed to create company: {str(e)}")
        raise


def create_admin_user(company, data):
    """Create company admin user"""
    print_step(2, 5, "Creating Admin User")
    
    try:
        # Check if admin already exists
        if User.objects.filter(email=data['admin_email']).exists():
            print_warning(f"User with email '{data['admin_email']}' already exists")
            user = User.objects.get(email=data['admin_email'])
            print_info(f"Using existing user: {user.name}")
            return user
        
        # Create admin user
        user = User.objects.create_user(
            email=data['admin_email'],
            name=data['admin_name'],
            password=data['admin_password'],
            phone=data.get('admin_phone', data['company_phone']),
            role='company_admin',
            company=company,
            is_staff=True,
            is_superuser=False,
            is_verified=True
        )
        
        print_success(f"Admin user created: {user.name}")
        print_info(f"Email: {user.email}")
        print_info(f"Role: {user.role}")
        
        return user
        
    except Exception as e:
        print_error(f"Failed to create admin user: {str(e)}")
        raise


def add_domain(company, subdomain):
    """Add domain to company"""
    print_step(3, 5, "Adding Domain Mapping")
    
    try:
        domain_name = f"{subdomain}.autoaicare.com"
        
        # Check if domain already exists
        if Domain.objects.filter(domain=domain_name).exists():
            print_warning(f"Domain '{domain_name}' already exists")
            domain = Domain.objects.get(domain=domain_name)
            print_info(f"Using existing domain: {domain.domain}")
            return domain
        
        # Create domain
        domain = Domain.objects.create(
            company=company,
            domain=domain_name,
            is_primary=True
        )
        
        print_success(f"Domain added: {domain.domain}")
        print_info(f"Primary: {domain.is_primary}")
        
        return domain
        
    except Exception as e:
        print_error(f"Failed to add domain: {str(e)}")
        raise


def create_dns_record(subdomain):
    """Create DNS record in Cloudflare"""
    print_step(4, 5, "Creating DNS Record in Cloudflare")
    
    try:
        # Import the DNS script
        from add_cloudflare_dns import add_dns_record, validate_credentials
        
        # Validate credentials
        if not validate_credentials():
            print_warning("Cloudflare credentials not configured")
            print_info("Skipping DNS record creation")
            print_info("You can create it manually later using:")
            print_info(f"  python scripts/add_cloudflare_dns.py add {subdomain}")
            return False
        
        # Create DNS record
        print_info(f"Creating A record for {subdomain}.autoaicare.com...")
        result = add_dns_record(subdomain)
        
        if result:
            print_success("DNS record created successfully")
            return True
        else:
            print_warning("DNS record creation failed")
            print_info("You may need to create it manually")
            return False
            
    except Exception as e:
        print_warning(f"DNS creation skipped: {str(e)}")
        print_info("You can create it manually later")
        return False


def seed_test_data(company):
    """Seed comprehensive test data"""
    print_step(5, 5, "Seeding Test Data")
    
    try:
        print_info("This will create:")
        print_info("  • 2 Branches with Service Bays")
        print_info("  • 5 Staff Members (Floor Manager, Supervisors, Technicians)")
        print_info("  • 5 Customers with Vehicles")
        print_info("  • 5 Service Packages")
        print_info("  • 3 Add-on Services")
        print_info("  • 10-15 Sample Bookings")
        print()
        
        # Call the seed_company_data management command
        from django.core.management import call_command
        
        call_command('seed_company_data', company=company.slug)
        
        print_success("Test data seeded successfully")
        return True
        
    except Exception as e:
        print_error(f"Failed to seed test data: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False


def print_summary(data, company, seed_data_created):
    """Print onboarding summary"""
    print(f"\n{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║              ✅ Onboarding Complete! 🎉                    ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.NC}\n")
    
    print(f"{Colors.GREEN}{Colors.BOLD}Company Details:{Colors.NC}")
    print(f"  Name:           {company.name}")
    print(f"  Slug:           {company.slug}")
    print(f"  Email:          {company.email}")
    print(f"  Phone:          {company.phone}")
    print(f"  ID:             {company.id}")
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}Admin Credentials:{Colors.NC}")
    print(f"  Name:           {data['admin_name']}")
    print(f"  Email:          {data['admin_email']}")
    print(f"  Password:       [as provided]")
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}Access Information:{Colors.NC}")
    print(f"  Subdomain:      {data['subdomain']}.autoaicare.com")
    print(f"  Frontend URL:   https://{data['subdomain']}.autoaicare.com")
    print(f"  API URL:        https://{data['subdomain']}.autoaicare.com/api/")
    print(f"  Admin Panel:    https://{data['subdomain']}.autoaicare.com/admin/")
    
    if seed_data_created:
        print(f"\n{Colors.GREEN}{Colors.BOLD}Test Data Created:{Colors.NC}")
        print(f"  ✅ Branches with Service Bays")
        print(f"  ✅ Staff Members (various roles)")
        print(f"  ✅ Customers with Vehicles")
        print(f"  ✅ Service Packages & Add-ons")
        print(f"  ✅ Sample Bookings")
        
        print(f"\n{Colors.CYAN}{Colors.BOLD}Test Credentials:{Colors.NC}")
        print(f"  Floor Manager:  floor_manager1_{company.slug}@test.com / Test@123")
        print(f"  Supervisor:     supervisor1_{company.slug}@test.com / Test@123")
        print(f"  Customer:       customer1_{company.slug}@test.com / Test@123")
    
    print(f"\n{Colors.YELLOW}{Colors.BOLD}Next Steps:{Colors.NC}")
    print(f"  1. Wait for DNS propagation (may take 5-10 minutes)")
    print(f"  2. Test login at https://{data['subdomain']}.autoaicare.com")
    print(f"  3. Verify SSL certificate is working")
    print(f"  4. Test API endpoints")
    if not seed_data_created:
        print(f"  5. Populate initial data (branches, services, etc.)")
    
    print(f"\n{Colors.CYAN}{Colors.BOLD}Quick Test Commands:{Colors.NC}")
    print(f"  # Test DNS")
    print(f"  nslookup {data['subdomain']}.autoaicare.com")
    print()
    print(f"  # Test API")
    print(f"  curl https://{data['subdomain']}.autoaicare.com/api/")
    print()
    print(f"  # Test Login")
    print(f"  curl -X POST https://{data['subdomain']}.autoaicare.com/api/auth/login/ \\")
    print(f"    -H 'Content-Type: application/json' \\")
    print(f"    -d '{{\"email\": \"{data['admin_email']}\", \"password\": \"[password]\"}}'")
    
    print(f"\n{Colors.MAGENTA}{Colors.BOLD}Onboarding Summary:{Colors.NC}")
    print(f"  Date:           {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Company ID:     {company.id}")
    print(f"  Company Slug:   {company.slug}")
    print(f"  Subdomain:      {data['subdomain']}.autoaicare.com")
    print()


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Onboard a new client to AutoAICare platform',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode
  python scripts/onboard_client.py
  
  # With seed data
  python scripts/onboard_client.py --seed-data
  
  # Non-interactive mode
  python scripts/onboard_client.py \\
    --company-name "K3 Car Care" \\
    --company-email "info@k3car.com" \\
    --company-phone "9876543210" \\
    --city "Mumbai" \\
    --state "Maharashtra" \\
    --admin-name "K3 Admin" \\
    --admin-email "admin@k3car.com" \\
    --admin-password "SecurePass@123" \\
    --subdomain "k3car" \\
    --seed-data
        """
    )
    
    # Company arguments
    parser.add_argument('--company-name', help='Company name')
    parser.add_argument('--company-email', help='Company email')
    parser.add_argument('--company-phone', help='Company phone (10 digits)')
    parser.add_argument('--city', help='City')
    parser.add_argument('--state', help='State')
    
    # Admin arguments
    parser.add_argument('--admin-name', help='Admin name')
    parser.add_argument('--admin-email', help='Admin email')
    parser.add_argument('--admin-password', help='Admin password')
    
    # Domain arguments
    parser.add_argument('--subdomain', help='Subdomain (e.g., k3car)')
    
    # Options
    parser.add_argument('--seed-data', action='store_true', 
                       help='Seed comprehensive test data')
    parser.add_argument('--skip-dns', action='store_true',
                       help='Skip DNS record creation')
    parser.add_argument('-y', '--yes', action='store_true',
                       help='Skip confirmation prompt')
    
    args = parser.parse_args()
    
    try:
        # Print header
        print_header()
        
        # Get user input
        data = get_user_input(args)
        
        # Confirm details
        if not args.yes:
            if not confirm_details(data):
                print_error("Onboarding cancelled by user")
                sys.exit(1)
        
        # Create company
        company = create_company(data)
        
        # Create admin user
        admin_user = create_admin_user(company, data)
        
        # Add domain
        domain = add_domain(company, data['subdomain'])
        
        # Create DNS record
        if not args.skip_dns:
            create_dns_record(data['subdomain'])
        else:
            print_warning("Skipping DNS record creation (--skip-dns flag)")
        
        # Seed test data
        seed_data_created = False
        if args.seed_data:
            seed_data_created = seed_test_data(company)
        else:
            print_info("\nSkipping test data seeding")
            print_info("To seed data later, run:")
            print_info(f"  python manage.py seed_company_data --company {company.slug}")
        
        # Print summary
        print_summary(data, company, seed_data_created)
        
        print_success("Client onboarding completed successfully! 🎉\n")
        
    except KeyboardInterrupt:
        print_error("\n\nOnboarding cancelled by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"\n\nOnboarding failed: {str(e)}")
        import traceback
        print(traceback.format_exc())
        sys.exit(1)


if __name__ == '__main__':
    main()
