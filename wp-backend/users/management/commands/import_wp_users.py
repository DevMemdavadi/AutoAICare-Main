import csv
from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from datetime import datetime
from users.models import User, UserProfile, Address

class Command(BaseCommand):
    help = "Import WooCommerce users from CSV"

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str)

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        with open(csv_file, newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                email = row['user_email']
                if not email:
                    continue

                if User.objects.filter(email=email).exists():
                    self.stdout.write(f"⚠️ Skipping existing user: {email}")
                    continue

                # Create User
                user = User.objects.create(
                    username=row['user_login'],
                    email=email,
                    phone=row.get('billing_phone') or '',
                    role='customer',
                    created_at=make_aware(datetime.strptime(row['user_registered'], "%Y-%m-%d %H:%M:%S")),
                )
                user.set_unusable_password()
                user.save()

                # Create Profile
                full_name = f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
                UserProfile.objects.create(
                    user=user,
                    full_name=full_name,
                    phone=row.get('billing_phone') or '',
                )

                # Create Billing Address
                Address.objects.create(
                    user=user,
                    address_line1=row.get('billing_address_1', ''),
                    address_line2=row.get('billing_address_2', ''),
                    city=row.get('billing_city', ''),
                    state=row.get('billing_state', ''),
                    postal_code=row.get('billing_postcode', ''),
                    country=row.get('billing_country', ''),
                    is_default=True,
                )

                # Optional: Create Shipping Address
                if row.get('shipping_address_1'):
                    Address.objects.create(
                        user=user,
                        address_line1=row.get('shipping_address_1', ''),
                        address_line2=row.get('shipping_address_2', ''),
                        city=row.get('shipping_city', ''),
                        state=row.get('shipping_state', ''),
                        postal_code=row.get('shipping_postcode', ''),
                        country=row.get('shipping_country', ''),
                        is_default=False,
                    )

                self.stdout.write(self.style.SUCCESS(f"✅ Imported: {email}"))
