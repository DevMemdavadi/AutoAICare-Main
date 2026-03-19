"""
Management command to create sample lead sources
"""
from django.core.management.base import BaseCommand
from leads.models import LeadSource


class Command(BaseCommand):
    help = 'Create sample lead sources'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample lead sources...')
        
        sources = [
            {
                'name': 'Website Contact Form',
                'source_type': 'website',
                'description': 'Leads from website contact form',
                'cost_per_lead': 50.00,
            },
            {
                'name': 'Walk-in Customers',
                'source_type': 'walk_in',
                'description': 'Customers who walk into the shop',
                'cost_per_lead': 0.00,
            },
            {
                'name': 'Phone Inquiry',
                'source_type': 'phone',
                'description': 'Customers who call for inquiry',
                'cost_per_lead': 0.00,
            },
            {
                'name': 'Customer Referral',
                'source_type': 'referral',
                'description': 'Referred by existing customers',
                'cost_per_lead': 100.00,
            },
            {
                'name': 'Facebook Page',
                'source_type': 'social_media',
                'description': 'Leads from Facebook page',
                'cost_per_lead': 75.00,
            },
            {
                'name': 'Instagram',
                'source_type': 'social_media',
                'description': 'Leads from Instagram',
                'cost_per_lead': 60.00,
            },
            {
                'name': 'Google Ads Campaign',
                'source_type': 'google_ads',
                'description': 'Leads from Google Ads',
                'cost_per_lead': 150.00,
            },
            {
                'name': 'Facebook Ads',
                'source_type': 'facebook_ads',
                'description': 'Leads from Facebook advertising',
                'cost_per_lead': 120.00,
            },
            {
                'name': 'Email Newsletter',
                'source_type': 'email_campaign',
                'description': 'Leads from email campaigns',
                'cost_per_lead': 30.00,
            },
            {
                'name': 'Auto Expo Event',
                'source_type': 'event',
                'description': 'Leads from auto expo and events',
                'cost_per_lead': 200.00,
            },
        ]
        
        created_count = 0
        for source_data in sources:
            source, created = LeadSource.objects.get_or_create(
                name=source_data['name'],
                defaults=source_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Created: {source.name}')
            else:
                self.stdout.write(f'  - Already exists: {source.name}')
        
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully created {created_count} lead sources!'))
