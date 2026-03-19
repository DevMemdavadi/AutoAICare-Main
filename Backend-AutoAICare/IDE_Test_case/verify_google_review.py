import os
import django
import sys
from django.utils import timezone

# Setup Django environment
sys.path.append('d:\\Car_Software\\Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from customers.models import Customer
from branches.models import Branch
from bookings.models import Booking, Vehicle, ServicePackage
from jobcards.models import JobCard
from notify.models import NotificationLog, NotificationTemplate, InAppNotification

def verify_google_review_notification():
    User = get_user_model()
    
    # 1. Setup Test Data
    print("Setting up test data...")
    
    # Create or get user
    user, _ = User.objects.get_or_create(
        email='test_reviewer@example.com',
        defaults={'name': 'Test Reviewer', 'phone': '9999999999', 'role': 'customer'}
    )
    
    # Create customer profile
    customer, _ = Customer.objects.get_or_create(user=user)
    
    # Create Branch with Google Review URL
    branch, _ = Branch.objects.get_or_create(
        name='Test Branch',
        code='TB001',
        defaults={
            'address': '123 Test St',
            'city': 'Test City',
            'state': 'TS',
            'pincode': '123456',
            'phone': '1234567890',
            'google_review_url': 'https://g.page/r/test-review'
        }
    )
    # Ensure URL is set (in case it existed without it)
    branch.google_review_url = 'https://g.page/r/test-review'
    branch.save()
    
    # Create Vehicle
    vehicle, _ = Vehicle.objects.get_or_create(
        registration_number='TS01AB1234',
        customer=customer,
        defaults={'brand': 'Toyota', 'model': 'Camry', 'color': 'White'}
    )
    
    # Create Package
    package, _ = ServicePackage.objects.get_or_create(
        name='Test Package',
        defaults={'price': 1000, 'duration': 60, 'description': 'Test'}
    )
    
    # Create Booking
    booking, _ = Booking.objects.get_or_create(
        customer=customer,
        vehicle=vehicle,
        package=package,
        defaults={
            'total_price': 1000, 
            'status': 'confirmed', 
            'vehicle_type': 'sedan',
            'booking_datetime': timezone.now()
        }
    )
    
    # Create JobCard
    jobcard, created = JobCard.objects.get_or_create(
        booking=booking,
        defaults={'branch': branch, 'status': 'work_completed'}
    )
    
    if not created:
        jobcard.branch = branch
        jobcard.status = 'work_completed'
        jobcard.save()

    # 2. Trigger the Event
    print("Simulating Job Delivery...")
    # Update status to delivered to trigger signal
    jobcard.status = 'delivered'
    jobcard.save()
    
    # 3. Verify Notification
    print("Verifying notification generation...")
    
    # Check InAppNotification (Synchronous)
    notifications = InAppNotification.objects.filter(
        recipient=user,
        notification_type='google_review_request'
    ).order_by('-created_at')
    
    if notifications.exists():
        notif = notifications.first()
        print(f"SUCCESS: In-App Notification generated!")
        print(f"Title: {notif.title}")
        print(f"Message: {notif.message}")
        print(f"Extra Data: {notif.extra_data}")
        
        if 'review_url' in notif.extra_data and notif.extra_data['review_url'] == 'https://g.page/r/test-review':
             print("SUCCESS: Google Review URL found in extra_data!")
        else:
             print("WARNING: Google Review URL NOT found in extra_data.")
             
    else:
        print("FAILURE: No In-App Notification found for 'google_review_request'.")
        
    # Verify Branch without URL does NOT send notification
    print("\nVerifying Branch WITHOUT URL does not send notification...")
    branch_no_url, _ = Branch.objects.get_or_create(
        name='No URL Branch',
        code='NB001',
        defaults={
            'address': '456 Test St',
            'city': 'Test City',
            'state': 'TS',
            'pincode': '123456',
            'phone': '0987654321',
            'google_review_url': '' # Empty URL
        }
    )
    
    jobcard.branch = branch_no_url
    jobcard.status = 'ready_for_billing' # Reset status
    jobcard.save()
    
    # Clear logs count
    initial_count = InAppNotification.objects.filter(
        recipient=user,
        notification_type='google_review_request'
    ).count()
    
    jobcard.status = 'delivered'
    jobcard.save()
    
    final_count = InAppNotification.objects.filter(
        recipient=user,
        notification_type='google_review_request'
    ).count()
    
    if final_count == initial_count:
        print("SUCCESS: No new notification generated for branch without URL.")
    else:
        print("FAILURE: Notification generated even when branch nas no URL!")

if __name__ == '__main__':
    try:
        verify_google_review_notification()
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
