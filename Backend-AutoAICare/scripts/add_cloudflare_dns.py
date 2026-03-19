#!/usr/bin/env python
"""
Add DNS record to Cloudflare for new tenant subdomain.

Usage:
    python add_cloudflare_dns.py <subdomain>
    python add_cloudflare_dns.py k3car
    python add_cloudflare_dns.py om
"""
import os
import sys
import requests
from pathlib import Path

# Add parent directory to path to import settings
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from decouple import config
except ImportError:
    print("❌ Error: python-decouple not installed")
    print("   Run: pip install python-decouple")
    sys.exit(1)


# Cloudflare API credentials
CLOUDFLARE_API_KEY = config('CLOUDFLARE_API_KEY', default='bfee4c34903f9d79ff2a253a9783bf6e1f4d2')
CLOUDFLARE_EMAIL = config('CLOUDFLARE_EMAIL', default='Technoscaffold@gmail.com')
CLOUDFLARE_ZONE_ID = config('CLOUDFLARE_ZONE_ID', default='55a075a6b5281e08463b7cdf8d7eab9c')
BASE_DOMAIN = config('BASE_DOMAIN', default='autoaicare.com')


def validate_credentials():
    """Validate that all required credentials are set."""
    missing = []
    if not CLOUDFLARE_API_KEY:
        missing.append('CLOUDFLARE_API_KEY')
    if not CLOUDFLARE_EMAIL:
        missing.append('CLOUDFLARE_EMAIL')
    if not CLOUDFLARE_ZONE_ID:
        missing.append('CLOUDFLARE_ZONE_ID')
    
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        print("\nAdd these to your .env file:")
        for var in missing:
            print(f"   {var}=your_value_here")
        return False
    return True


def check_existing_record(subdomain):
    """Check if DNS record already exists."""
    url = f'https://api.cloudflare.com/client/v4/zones/{CLOUDFLARE_ZONE_ID}/dns_records'
    
    headers = {
        'X-Auth-Email': CLOUDFLARE_EMAIL,
        'X-Auth-Key': CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json',
    }
    
    params = {
        'name': f'{subdomain}.{BASE_DOMAIN}',
        'type': 'A',
    }
    
    response = requests.get(url, headers=headers, params=params)
    result = response.json()
    
    if result.get('success') and result.get('result'):
        return result['result'][0]
    return None


def add_dns_record(subdomain, target=None, proxied=True):
    """
    Add an A record to Cloudflare.
    
    Args:
        subdomain: Subdomain to create (e.g., 'k3car')
        target: Target IP address (default: '77.37.44.137')
        proxied: Whether to proxy through Cloudflare (default: True)
    
    Returns:
        dict: DNS record data if successful, None otherwise
    """
    if not validate_credentials():
        return None
    
    if target is None:
        target = '77.37.44.137'  # Default server IP
    
    # Check if record already exists
    existing = check_existing_record(subdomain)
    if existing:
        print(f'⚠️  DNS record already exists!')
        print(f'   Subdomain: {subdomain}.{BASE_DOMAIN}')
        print(f'   Target: {existing["content"]}')
        print(f'   Proxied: {existing["proxied"]}')
        print(f'   Record ID: {existing["id"]}')
        
        response = input('\nUpdate existing record? (y/n): ')
        if response.lower() != 'y':
            return existing
        
        # Update existing record
        return update_dns_record(existing['id'], subdomain, target, proxied)
    
    # Create new record
    url = f'https://api.cloudflare.com/client/v4/zones/{CLOUDFLARE_ZONE_ID}/dns_records'
    
    headers = {
        'X-Auth-Email': CLOUDFLARE_EMAIL,
        'X-Auth-Key': CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json',
    }
    
    data = {
        'type': 'A',
        'name': subdomain,
        'content': target,
        'ttl': 1,  # Auto
        'proxied': proxied,
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        result = response.json()
        
        if result.get('success'):
            print(f'✅ DNS record created successfully!')
            print(f'   Subdomain: {subdomain}.{BASE_DOMAIN}')
            print(f'   Target: {target}')
            print(f'   Proxied: {"Yes" if proxied else "No"}')
            print(f'   Record ID: {result["result"]["id"]}')
            print(f'\n🌐 Access URL: https://{subdomain}.{BASE_DOMAIN}/')
            return result['result']
        else:
            print(f'❌ Error creating DNS record:')
            for error in result.get('errors', []):
                print(f'   {error["message"]} (Code: {error.get("code", "N/A")})')
            return None
    except requests.exceptions.RequestException as e:
        print(f'❌ Network error: {str(e)}')
        return None


def update_dns_record(record_id, subdomain, target, proxied):
    """Update an existing DNS record."""
    url = f'https://api.cloudflare.com/client/v4/zones/{CLOUDFLARE_ZONE_ID}/dns_records/{record_id}'
    
    headers = {
        'X-Auth-Email': CLOUDFLARE_EMAIL,
        'X-Auth-Key': CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json',
    }
    
    data = {
        'type': 'A',
        'name': subdomain,
        'content': target,
        'ttl': 1,
        'proxied': proxied,
    }
    
    try:
        response = requests.put(url, json=data, headers=headers)
        result = response.json()
        
        if result.get('success'):
            print(f'✅ DNS record updated successfully!')
            print(f'   Subdomain: {subdomain}.{BASE_DOMAIN}')
            print(f'   Target: {target}')
            print(f'   Proxied: {"Yes" if proxied else "No"}')
            return result['result']
        else:
            print(f'❌ Error updating DNS record:')
            for error in result.get('errors', []):
                print(f'   {error["message"]}')
            return None
    except requests.exceptions.RequestException as e:
        print(f'❌ Network error: {str(e)}')
        return None


def delete_dns_record(subdomain):
    """Delete a DNS record."""
    existing = check_existing_record(subdomain)
    if not existing:
        print(f'❌ DNS record not found: {subdomain}.{BASE_DOMAIN}')
        return False
    
    url = f'https://api.cloudflare.com/client/v4/zones/{CLOUDFLARE_ZONE_ID}/dns_records/{existing["id"]}'
    
    headers = {
        'X-Auth-Email': CLOUDFLARE_EMAIL,
        'X-Auth-Key': CLOUDFLARE_API_KEY,
    }
    
    try:
        response = requests.delete(url, headers=headers)
        result = response.json()
        
        if result.get('success'):
            print(f'✅ DNS record deleted successfully!')
            print(f'   Subdomain: {subdomain}.{BASE_DOMAIN}')
            return True
        else:
            print(f'❌ Error deleting DNS record:')
            for error in result.get('errors', []):
                print(f'   {error["message"]}')
            return False
    except requests.exceptions.RequestException as e:
        print(f'❌ Network error: {str(e)}')
        return False


def list_dns_records():
    """List all DNS records for the zone."""
    url = f'https://api.cloudflare.com/client/v4/zones/{CLOUDFLARE_ZONE_ID}/dns_records'
    
    headers = {
        'X-Auth-Email': CLOUDFLARE_EMAIL,
        'X-Auth-Key': CLOUDFLARE_API_KEY,
    }
    
    params = {
        'per_page': 100,
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        result = response.json()
        
        if result.get('success'):
            print(f'\n📋 DNS Records for {BASE_DOMAIN}:')
            print('=' * 80)
            for record in result['result']:
                proxied = '🔒 Proxied' if record.get('proxied') else '🔓 DNS Only'
                print(f'{record["name"]:40} → {record["content"]:30} {proxied}')
            print('=' * 80)
            print(f'Total: {len(result["result"])} records')
            return result['result']
        else:
            print(f'❌ Error listing DNS records:')
            for error in result.get('errors', []):
                print(f'   {error["message"]}')
            return []
    except requests.exceptions.RequestException as e:
        print(f'❌ Network error: {str(e)}')
        return []


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python add_cloudflare_dns.py <command> [subdomain]')
        print('\nCommands:')
        print('  add <subdomain>     - Add DNS record for subdomain')
        print('  delete <subdomain>  - Delete DNS record')
        print('  list                - List all DNS records')
        print('\nExamples:')
        print('  python add_cloudflare_dns.py add k3car')
        print('  python add_cloudflare_dns.py delete k3car')
        print('  python add_cloudflare_dns.py list')
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'list':
        list_dns_records()
    elif command == 'add' and len(sys.argv) >= 3:
        subdomain = sys.argv[2]
        add_dns_record(subdomain)
    elif command == 'delete' and len(sys.argv) >= 3:
        subdomain = sys.argv[2]
        delete_dns_record(subdomain)
    else:
        # Backward compatibility - assume first arg is subdomain
        subdomain = sys.argv[1]
        add_dns_record(subdomain)
