import csv
from django.core.management.base import BaseCommand
from whatsapp_dashboard.models import Contact
from django.db import transaction

def is_probably_phone(value):
    return value and value.isdigit() and len(value) >= 8

class Command(BaseCommand):
    help = 'Import contacts from a CSV file exported from wati.io (all columns)'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        created = 0
        updated = 0
        with open(csv_file, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            with transaction.atomic():
                for row in reader:
                    country_code = (row.get('CountryCode') or '').strip()
                    phone = (row.get('Phone') or '').strip()
                    phone_number = f'{country_code}{phone}' if country_code and phone else ''
                    name = (row.get('Name') or '').strip()
                    # If name is empty or looks like a phone, use phone_number as name
                    if not name or is_probably_phone(name):
                        name = phone_number
                    if not phone_number:
                        self.stdout.write(self.style.WARNING(f'Skipping row with missing phone: {row}'))
                        continue
                    # Map all fields, normalizing booleans and stripping whitespace
                    def norm_bool(val):
                        return str(val).strip().lower() == 'true'
                    defaults = {
                        'name': name,
                        'country_code': country_code,
                        'contact_status': (row.get('ContactStatus') or '').strip(),
                        'allow_broadcast': norm_bool(row.get('AllowBroadcast')),
                        'allow_sms': norm_bool(row.get('AllowSMS')),
                        'created_date': (row.get('CreatedDate') or '').strip(),
                        'amount': (row.get('amount') or '').strip(),
                        'attribute_1': (row.get('attribute_1') or '').strip(),
                        'attribute_2': (row.get('attribute_2') or '').strip(),
                        'attribute_3': (row.get('attribute_3') or '').strip(),
                        'cases': (row.get('cases') or '').strip(),
                        'city': (row.get('city') or '').strip(),
                        'invoiceamt': (row.get('invoiceamt') or '').strip(),
                        'invoiceno': (row.get('invoiceno') or '').strip(),
                        'last_cart_items': (row.get('last_cart_items') or '').strip(),
                        'last_cart_items_text': (row.get('last_cart_items_text') or '').strip(),
                        'last_cart_total_value': (row.get('last_cart_total_value') or '').strip(),
                        'last_cart_total_value_text': (row.get('last_cart_total_value_text') or '').strip(),
                        'lrno': (row.get('lrno') or '').strip(),
                        'mobile': (row.get('mobile') or '').strip(),
                        'order_number': (row.get('order_number') or '').strip(),
                        'orderdate': (row.get('orderdate') or '').strip(),
                        'orderno': (row.get('orderno') or '').strip(),
                        'reason': (row.get('reason') or '').strip(),
                        'source_id': (row.get('source_id') or '').strip(),
                        'source_url': (row.get('source_url') or '').strip(),
                        'state': (row.get('state') or '').strip(),
                        'supplymobile': (row.get('supplymobile') or '').strip(),
                        'supplyname': (row.get('supplyname') or '').strip(),
                        'tracking_link': (row.get('tracking_link') or '').strip(),
                        'tracking_number': (row.get('tracking_number') or '').strip(),
                        'tracking_provider': (row.get('tracking_provider') or '').strip(),
                        'tracking_url': (row.get('tracking_url') or '').strip(),
                        'transportname': (row.get('transportname') or '').strip(),
                        'type': (row.get('type') or '').strip(),
                        'whatsapp_916359100911': (row.get('whatsapp_916359100911') or '').strip(),
                    }
                    contact, is_created = Contact.objects.update_or_create(
                        phone_number=phone_number,
                        defaults=defaults
                    )
                    if is_created:
                        created += 1
                    else:
                        updated += 1
        self.stdout.write(self.style.SUCCESS(f'Import complete! Created: {created}, Updated: {updated}')) 