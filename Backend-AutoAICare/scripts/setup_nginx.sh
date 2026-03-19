#!/bin/bash
# Initial Nginx setup on VPS (one-time)
# Run this script on your VPS to set up Nginx for wildcard subdomain support

set -e

echo "🚀 Setting up Nginx for AutoAICare multi-tenant SaaS..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    exit 1
fi

# Copy Nginx configuration
echo -e "${BLUE}Copying Nginx configuration...${NC}"
cp /var/www/autoaicare/backend/nginx/autoaicare.conf /etc/nginx/sites-available/autoaicare

# Create symlink
echo -e "${BLUE}Enabling site...${NC}"
ln -sf /etc/nginx/sites-available/autoaicare /etc/nginx/sites-enabled/autoaicare

# Remove default site if exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo -e "${BLUE}Removing default site...${NC}"
    rm /etc/nginx/sites-enabled/default
fi

# Test configuration
echo -e "${BLUE}Testing Nginx configuration...${NC}"
nginx -t

# Reload Nginx
echo -e "${BLUE}Reloading Nginx...${NC}"
systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured successfully!${NC}"
echo ""
echo "Wildcard configuration active for: *.autoaicare.com"
echo "New tenants will work automatically - no reload needed!"
