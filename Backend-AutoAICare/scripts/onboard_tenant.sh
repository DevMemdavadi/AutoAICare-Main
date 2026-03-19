#!/bin/bash
# Complete tenant onboarding automation script
# This script automates the entire process of onboarding a new client

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        AutoAICare Tenant Onboarding Automation            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to print step header
print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Step $1: $2${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to print success message
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error message
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning message
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Get input from user
echo -e "${YELLOW}Please provide the following information:${NC}"
echo ""

read -p "Company Name: " COMPANY_NAME
read -p "Company Email: " COMPANY_EMAIL
read -p "Company Phone: " COMPANY_PHONE
read -p "City: " CITY
read -p "State: " STATE
echo ""
read -p "Admin Name: " ADMIN_NAME
read -p "Admin Email: " ADMIN_EMAIL
read -sp "Admin Password: " ADMIN_PASSWORD
echo ""
echo ""
read -p "Subdomain (e.g., k3car for k3car.autoaicare.com): " SUBDOMAIN

# Confirm details
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Please confirm the following details:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Company Name:    $COMPANY_NAME"
echo "Company Email:   $COMPANY_EMAIL"
echo "Company Phone:   $COMPANY_PHONE"
echo "City:            $CITY"
echo "State:           $STATE"
echo ""
echo "Admin Name:      $ADMIN_NAME"
echo "Admin Email:     $ADMIN_EMAIL"
echo ""
echo "Subdomain:       ${SUBDOMAIN}.autoaicare.com"
echo ""

read -p "Is this correct? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    print_error "Onboarding cancelled"
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

# Step 1: Create Company
print_step "1/5" "Creating Company in Database"

python manage.py create_company \
    --name "$COMPANY_NAME" \
    --email "$COMPANY_EMAIL" \
    --phone "$COMPANY_PHONE" \
    --city "$CITY" \
    --state "$STATE" \
    --admin-email "$ADMIN_EMAIL" \
    --admin-name "$ADMIN_NAME" \
    --admin-password "$ADMIN_PASSWORD"

if [ $? -eq 0 ]; then
    print_success "Company created successfully"
else
    print_error "Failed to create company"
    exit 1
fi

# Get company slug (auto-generated from name)
COMPANY_SLUG=$(python -c "from django.utils.text import slugify; print(slugify('$COMPANY_NAME'))")
print_success "Company slug: $COMPANY_SLUG"

# Step 2: Add Domain
print_step "2/5" "Adding Domain to Company"

python manage.py add_domain \
    --company "$COMPANY_SLUG" \
    --domain "${SUBDOMAIN}.autoaicare.com" \
    --primary

if [ $? -eq 0 ]; then
    print_success "Domain added successfully"
else
    print_error "Failed to add domain"
    exit 1
fi

# Step 3: Create DNS Record (Cloudflare)
print_step "3/5" "Creating DNS Record in Cloudflare"

# Check if Cloudflare credentials are set
if [ -z "$CLOUDFLARE_API_KEY" ] || [ -z "$CLOUDFLARE_EMAIL" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    print_warning "Cloudflare credentials not found in environment"
    print_warning "Skipping DNS record creation"
    print_warning "Please create DNS record manually or set credentials in .env"
else
    python scripts/add_cloudflare_dns.py add "$SUBDOMAIN"
    
    if [ $? -eq 0 ]; then
        print_success "DNS record created successfully"
    else
        print_warning "Failed to create DNS record - you may need to create it manually"
    fi
fi

# Step 4: Test DNS Resolution (optional)
print_step "4/5" "Testing DNS Resolution"

print_warning "Waiting 10 seconds for DNS propagation..."
sleep 10

if command -v nslookup &> /dev/null; then
    echo "Testing DNS resolution for ${SUBDOMAIN}.autoaicare.com..."
    nslookup "${SUBDOMAIN}.autoaicare.com" || print_warning "DNS not yet propagated (this is normal)"
else
    print_warning "nslookup not available - skipping DNS test"
fi

# Step 5: Reload Nginx (if running)
print_step "5/5" "Reloading Nginx"

if command -v nginx &> /dev/null; then
    # Test nginx configuration
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        # Reload nginx
        sudo systemctl reload nginx
        print_success "Nginx reloaded successfully"
    else
        print_error "Nginx configuration test failed"
        print_warning "Please check your Nginx configuration"
    fi
else
    print_warning "Nginx not found - skipping reload"
    print_warning "If you're using Nginx, please reload it manually"
fi

# Summary
echo ""
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║              ✅ Onboarding Complete!                       ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}Company Details:${NC}"
echo "  Name:           $COMPANY_NAME"
echo "  Slug:           $COMPANY_SLUG"
echo "  Email:          $COMPANY_EMAIL"
echo "  Phone:          $COMPANY_PHONE"
echo ""
echo -e "${GREEN}Admin Credentials:${NC}"
echo "  Name:           $ADMIN_NAME"
echo "  Email:          $ADMIN_EMAIL"
echo "  Password:       [hidden]"
echo ""
echo -e "${GREEN}Access Information:${NC}"
echo "  Subdomain:      ${SUBDOMAIN}.autoaicare.com"
echo "  URL:            https://${SUBDOMAIN}.autoaicare.com"
echo "  API URL:        https://${SUBDOMAIN}.autoaicare.com/api/"
echo "  Admin Panel:    https://${SUBDOMAIN}.autoaicare.com/admin/"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Wait for DNS propagation (may take up to 48 hours)"
echo "  2. Test login at https://${SUBDOMAIN}.autoaicare.com"
echo "  3. Verify SSL certificate is working"
echo "  4. Test API endpoints"
echo "  5. Populate initial data (branches, services, etc.)"
echo ""
echo -e "${GREEN}Quick Test Commands:${NC}"
echo "  # Test DNS"
echo "  nslookup ${SUBDOMAIN}.autoaicare.com"
echo ""
echo "  # Test API"
echo "  curl https://${SUBDOMAIN}.autoaicare.com/api/"
echo ""
echo "  # Test Login"
echo "  curl -X POST https://${SUBDOMAIN}.autoaicare.com/api/auth/login/ \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\": \"$ADMIN_EMAIL\", \"password\": \"[password]\"}'"
echo ""
