import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Setup Django
django.setup()

from django.urls import reverse, NoReverseMatch

print("Testing URL resolution...")

# Test various URL patterns
urls_to_test = [
    'invoice-mark-paid',
    'invoice-add-item',
    'invoice-detail',
    'invoice-list',
]

for url_name in urls_to_test:
    try:
        if url_name in ['invoice-mark-paid', 'invoice-add-item', 'invoice-detail']:
            # These require an ID argument
            url = reverse(url_name, args=[1])
        else:
            url = reverse(url_name)
        print(f"SUCCESS: {url_name} -> {url}")
    except NoReverseMatch as e:
        print(f"FAILED: {url_name} -> {e}")