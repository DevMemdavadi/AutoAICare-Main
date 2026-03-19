import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from bookings.models import Booking
from jobcards.models import JobCard
from pickup.models import PickupDropRequest
from payments.models import Payment
from store.models import Product, Order
from feedback.models import Feedback

User = get_user_model()

print("\n=== Database Record Counts ===")
print(f"Users: {User.objects.count()}")
print(f"Customers: {Customer.objects.count()}")
print(f"Vehicles: {Vehicle.objects.count()}")
print(f"Service Packages: {ServicePackage.objects.count()}")
print(f"Add-ons: {AddOn.objects.count()}")
print(f"Bookings: {Booking.objects.count()}")
print(f"Job Cards: {JobCard.objects.count()}")
print(f"Pickup Requests: {PickupDropRequest.objects.count()}")
print(f"Payments: {Payment.objects.count()}")
print(f"Products: {Product.objects.count()}")
print(f"Orders: {Order.objects.count()}")
print(f"Feedback: {Feedback.objects.count()}")

print("\n=== Sample Data ===")
print(f"\nFirst User: {User.objects.first()}")
print(f"First Service Package: {ServicePackage.objects.first()}")
print(f"First Booking: {Booking.objects.first()}")
print("\n=== Data Seeding Verification Complete! ===\n")
