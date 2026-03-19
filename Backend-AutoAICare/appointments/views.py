from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from django.db import transaction
from datetime import timedelta, datetime

from .models import Appointment, AppointmentSlot
from .serializers import (
    AppointmentSerializer, AppointmentCreateSerializer,
    AppointmentRescheduleSerializer, AppointmentApproveSerializer,
    AppointmentRejectSerializer, AppointmentSlotSerializer,
    AppointmentListSerializer, PublicAppointmentSerializer
)
from bookings.models import Booking
from bookings.serializers import BookingSerializer
from users.models import User
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from branches.models import Branch


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing customer appointment requests.
    
    Customers can:
    - Create appointment requests
    - View their appointments
    - Reschedule pending appointments
    - Cancel pending appointments
    
    Admins can:
    - View all appointments
    - Approve/reject appointments
    - Convert to bookings
    """
    
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'vehicle_type', 'branch']
    search_fields = ['customer__user__name', 'customer__user__phone', 'vehicle__registration_number']
    ordering_fields = ['created_at', 'preferred_datetime', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related(
            'customer', 'customer__user', 'customer__lifecycle', 'vehicle', 'package', 'branch', 'reviewed_by'
        ).prefetch_related('addons', 'customer__segments')
        
        # Filter by role
        if user.role == 'customer':
            # Customers see only their appointments
            return queryset.filter(customer__user=user)
        elif user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            # Admins see appointments for their branch (or all if no branch)
            if user.role == 'company_admin' and user.company:
                return queryset.filter(branch__company=user.company)
            if user.branch:
                return queryset.filter(branch=user.branch)
            return queryset
        
        return queryset.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AppointmentCreateSerializer
        if self.action == 'list' and self.request.query_params.get('compact') == 'true':
            return AppointmentListSerializer
        return AppointmentSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new appointment request."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        
        # Send notification to admins about new appointment
        try:
            from notify.notification_service import NotificationService
            
            # Get admin recipients for this appointment's branch
            admin_recipients = NotificationService.get_recipients_for_appointment(
                appointment=appointment,
                include_customer=False,
                include_admins=True
            )
            
            if admin_recipients:
                # Calculate estimated price
                estimated_price = appointment.estimated_price
                
                # Send notification to admins
                NotificationService.send(
                    notification_type='appointment_created',
                    recipients=admin_recipients,
                    title='New Appointment Request',
                    message=f'New appointment request from {appointment.customer.user.name} for {appointment.package.name if appointment.package else "service"} on {appointment.preferred_datetime.strftime("%B %d, %Y at %I:%M %p")} - ₹{estimated_price}',
                    context_data={
                        'appointment_id': appointment.id,
                        'appointment_status': appointment.status,
                        'customer_name': appointment.customer.user.name,
                        'customer_phone': appointment.customer.user.phone,
                        'service_name': appointment.package.name if appointment.package else 'N/A',
                        'vehicle_type': appointment.vehicle_type,
                        'preferred_datetime': appointment.preferred_datetime.isoformat(),
                        'estimated_price': str(estimated_price),
                    },
                    channels=['in_app', 'email'],
                    related_appointment_id=appointment.id
                )
        except Exception as e:
            # Log error but don't fail the appointment creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send appointment notification: {str(e)}")
        
        # Return full appointment details
        output_serializer = AppointmentSerializer(appointment)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule a pending appointment (customer only)."""
        appointment = self.get_object()
        
        # Check if user owns this appointment
        if request.user.role == 'customer' and appointment.customer.user != request.user:
            return Response(
                {'error': 'You can only reschedule your own appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if can reschedule
        if not appointment.can_reschedule:
            return Response(
                {'error': 'Only pending appointments can be rescheduled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AppointmentRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        appointment.reschedule(
            preferred_datetime=serializer.validated_data['preferred_datetime'],
            alternate_datetime=serializer.validated_data.get('alternate_datetime')
        )
        
        return Response({
            'message': 'Appointment rescheduled successfully.',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending appointment (customer only)."""
        appointment = self.get_object()
        
        # Check if user owns this appointment
        if request.user.role == 'customer' and appointment.customer.user != request.user:
            return Response(
                {'error': 'You can only cancel your own appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.cancel():
            return Response({
                'message': 'Appointment cancelled successfully.',
                'appointment': AppointmentSerializer(appointment).data
            })
        else:
            return Response(
                {'error': 'Only pending appointments can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an appointment (admin only)."""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can approve appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status != 'pending':
            return Response(
                {'error': 'Only pending appointments can be approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AppointmentApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        confirmed_datetime = serializer.validated_data.get('confirmed_datetime')
        admin_notes = serializer.validated_data.get('admin_notes', '')
        
        appointment.approve(
            user=request.user,
            confirmed_datetime=confirmed_datetime
        )
        
        if admin_notes:
            appointment.admin_notes = admin_notes
            appointment.save()
        
        # TODO: Send notification to customer
        
        return Response({
            'message': 'Appointment approved successfully.',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an appointment with reason (admin only)."""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can reject appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status != 'pending':
            return Response(
                {'error': 'Only pending appointments can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AppointmentRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        appointment.reject(
            user=request.user,
            reason=serializer.validated_data['reason']
        )
        
        # TODO: Send notification to customer
        
        return Response({
            'message': 'Appointment rejected.',
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=True, methods=['post'])
    def convert_to_booking(self, request, pk=None):
        """Convert an approved appointment to a confirmed booking (admin only)."""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can convert appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment = self.get_object()
        
        if appointment.status != 'approved':
            return Response(
                {'error': 'Only approved appointments can be converted to bookings.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if appointment.booking:
            return Response(
                {'error': 'This appointment has already been converted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create booking from appointment
        booking_datetime = appointment.confirmed_datetime or appointment.preferred_datetime
        
        booking = Booking.objects.create(
            customer=appointment.customer,
            vehicle=appointment.vehicle,
            package=appointment.package,
            vehicle_type=appointment.vehicle_type,
            booking_datetime=booking_datetime,
            pickup_required=appointment.pickup_required,
            location=appointment.location,
            notes=appointment.notes,
            branch=appointment.branch,
            status='confirmed'
        )
        
        # Add addons
        if appointment.addons.exists():
            booking.addons.set(appointment.addons.all())
            booking.save()
        
        # Link appointment to booking
        appointment.booking = booking
        appointment.status = 'converted'
        appointment.save()
        
        # TODO: Send booking confirmation to customer
        
        return Response({
            'message': 'Appointment converted to booking successfully.',
            'booking': BookingSerializer(booking).data,
            'appointment': AppointmentSerializer(appointment).data
        })
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending appointments for admin dashboard."""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending').order_by('preferred_datetime')
        serializer = AppointmentListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """
        Get appointments in calendar format for a date range.
        Query params: start_date, end_date, branch_id
        """
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can access the calendar view.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_id = request.query_params.get('branch') or request.query_params.get('branch_id')
        
        if not start_date or not end_date:
            # Default to current week
            today = timezone.now().date()
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        queryset = self.get_queryset().filter(
            Q(preferred_datetime__date__gte=start_date) & Q(preferred_datetime__date__lte=end_date)
        )
        
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Group by date for calendar view
        appointments_by_date = {}
        for appointment in queryset:
            date_key = appointment.preferred_datetime.date().isoformat()
            if date_key not in appointments_by_date:
                appointments_by_date[date_key] = []
            appointments_by_date[date_key].append(
                AppointmentListSerializer(appointment).data
            )
        
        return Response({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'appointments': appointments_by_date
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get appointment statistics for dashboard."""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can access stats.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        branch_id = request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        today = timezone.now().date()
        
        stats = {
            'pending': queryset.filter(status='pending').count(),
            'approved': queryset.filter(status='approved').count(),
            'rejected': queryset.filter(status='rejected').count(),
            'converted': queryset.filter(status='converted').count(),
            'today_pending': queryset.filter(
                status='pending',
                preferred_datetime__date=today
            ).count(),
            'this_week_pending': queryset.filter(
                status='pending',
                preferred_datetime__date__gte=today,
                preferred_datetime__date__lte=today + timedelta(days=7)
            ).count(),
        }
        
        return Response(stats)


class AppointmentSlotViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing appointment slots (capacity management).
    """
    
    queryset = AppointmentSlot.objects.all()
    serializer_class = AppointmentSlotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'date', 'is_available']
    
    def get_queryset(self):
        user = self.request.user
        queryset = AppointmentSlot.objects.select_related('branch')

        # Filter by role
        if user.role == 'super_admin':
            # Can optionally filter by branch via query param
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                queryset = queryset.filter(branch_id=branch_id)
            return queryset
        elif user.role == 'company_admin' and user.company:
            # See all slots across their company's branches
            queryset = queryset.filter(branch__company=user.company)
            # Optional branch sub-filter
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                queryset = queryset.filter(branch_id=branch_id)
            return queryset
        elif user.role in ['branch_admin', 'floor_manager'] and user.branch:
            return queryset.filter(branch=user.branch)

        return queryset.none()
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available slots for a branch and date."""
        branch_id = request.query_params.get('branch_id')
        date = request.query_params.get('date')
        
        if not branch_id or not date:
            return Response(
                {'error': 'branch_id and date are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            date = datetime.strptime(date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        slots = AppointmentSlot.objects.filter(
            branch_id=branch_id,
            date=date,
            is_available=True
        )
        
        # Filter to only slots with availability
        available_slots = [
            slot for slot in slots if slot.is_slot_available
        ]
        
        serializer = AppointmentSlotSerializer(available_slots, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def generate_slots(self, request):
        """Generate default slots for a branch for a date range (admin only)."""
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Only admins can generate slots.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        branch_id = request.data.get('branch_id')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        start_time = request.data.get('start_time', '09:00')
        end_time = request.data.get('end_time', '18:00')
        slot_duration = request.data.get('slot_duration', 60)  # minutes
        max_bookings = request.data.get('max_bookings', 5)
        
        if not all([branch_id, start_date, end_date]):
            return Response(
                {'error': 'branch_id, start_date, and end_date are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from branches.models import Branch
        from datetime import time
        
        try:
            branch = Branch.objects.get(id=branch_id)

            # Company isolation: non-super_admin can only generate slots for their own company's branches
            if user.role == 'company_admin':
                if not user.company or branch.company_id != user.company.id:
                    return Response(
                        {'error': 'You can only generate slots for branches within your company.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif user.role in ['branch_admin', 'floor_manager']:
                if not user.branch or branch.id != user.branch.id:
                    return Response(
                        {'error': 'You can only generate slots for your own branch.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            start_hour, start_min = map(int, start_time.split(':'))
            end_hour, end_min = map(int, end_time.split(':'))
        except Branch.DoesNotExist:
            return Response(
                {'error': 'Branch not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_slots = []
        current_date = start_date
        
        while current_date <= end_date:
            current_time = time(start_hour, start_min)
            end_time_obj = time(end_hour, end_min)
            
            while current_time < end_time_obj:
                # Calculate slot end time
                current_datetime = datetime.combine(current_date, current_time)
                slot_end_datetime = current_datetime + timedelta(minutes=slot_duration)
                slot_end_time = slot_end_datetime.time()
                
                if slot_end_time > end_time_obj:
                    break
                
                # Create slot if doesn't exist
                slot, created = AppointmentSlot.objects.get_or_create(
                    branch=branch,
                    date=current_date,
                    start_time=current_time,
                    defaults={
                        'end_time': slot_end_time,
                        'max_bookings': max_bookings,
                        'is_available': True
                    }
                )
                
                if created:
                    created_slots.append(slot)
                
                # Move to next slot
                current_time = slot_end_time
            
            current_date += timedelta(days=1)
        
        return Response({
            'message': f'Generated {len(created_slots)} slots.',
            'slots': AppointmentSlotSerializer(created_slots, many=True).data
        })


class PublicAppointmentView(APIView):
    """
    Public endpoint for K3 website visitors to create appointment requests.
    No authentication required - creates customer and vehicle records automatically.
    """
    
    permission_classes = [AllowAny]
    
    @transaction.atomic
    def post(self, request):
        """Create appointment from public website submission."""
        from .serializers import PublicAppointmentSerializer
        
        serializer = PublicAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # 1. Get or create user — look up by phone first, then email, then create
        phone = data['customer_phone'].strip()
        name = data['customer_name'].strip()
        raw_email = data.get('customer_email', '').strip()

        # Build a safe fallback email that won't collide across users
        # (phone is unique per user so phone-based fallback is safe)
        fallback_email = f"{phone}@k3website.local"
        email = raw_email if raw_email else fallback_email

        # Priority 1: find by phone (most reliable identifier)
        user = User.objects.filter(phone=phone).first()

        # Priority 2: find by the provided email (user may have registered via email)
        if user is None and raw_email:
            user = User.objects.filter(email=raw_email).first()

        if user is None:
            # Ensure the chosen email isn't already taken by someone else
            # (e.g. a real email that belongs to a different phone number)
            if User.objects.filter(email=email).exists():
                # Fall back to phone-based email which is guaranteed unique
                email = fallback_email

            user = User.objects.create(
                phone=phone,
                email=email,
                name=name,
                role='customer',
                is_active=True,
            )
            user_created = True
        else:
            user_created = False

        # Update name if user already exists and name changed
        if not user_created and user.name != name:
            user.name = name
            user.save(update_fields=['name'])

        
        # 2. Get or create customer profile
        customer, customer_created = Customer.objects.get_or_create(
            user=user,
            defaults={
                'membership_type': 'basic'
            }
        )
        
        # 3. Get or create vehicle
        vehicle_registration = data.get('vehicle_registration', '').strip()
        if not vehicle_registration:
            # Generate a temporary registration for tracking
            import uuid
            vehicle_registration = f"TEMP-{uuid.uuid4().hex[:8].upper()}"
        
        vehicle, vehicle_created = Vehicle.objects.get_or_create(
            registration_number=vehicle_registration,
            defaults={
                'customer': customer,
                'brand': data['vehicle_brand'],
                'model': data['vehicle_model'],
                'color': 'Unknown',  # Default
                'year': data.get('vehicle_year'),
                'vehicle_type': data['vehicle_type'],
            }
        )
        
        # 4. Get package and branch
        package = ServicePackage.objects.get(id=data['package_id'])
        branch = Branch.objects.get(id=data['branch_id'])
        
        # 5. Create appointment
        appointment = Appointment.objects.create(
            customer=customer,
            vehicle=vehicle,
            package=package,
            vehicle_type=data['vehicle_type'],
            preferred_datetime=data['preferred_datetime'],
            alternate_datetime=data.get('alternate_datetime'),
            pickup_required=data.get('pickup_required', False),
            location=data.get('location', ''),
            notes=self._build_notes(data),
            branch=branch,
            status='pending'
        )
        
        # 6. Add addons if any
        addon_ids = data.get('addon_ids', [])
        if addon_ids:
            addons = AddOn.objects.filter(id__in=addon_ids, is_active=True)
            appointment.addons.set(addons)
        
        # 7. Calculate estimated price for response
        estimated_price = package.get_price_for_vehicle_type(data['vehicle_type'])
        for addon in appointment.addons.all():
            estimated_price += addon.price
        
        # Send notification to admins about new appointment
        try:
            from notify.notification_service import NotificationService
            
            # Get admin recipients for this appointment's branch
            admin_recipients = NotificationService.get_recipients_for_appointment(
                appointment=appointment,
                include_customer=False,
                include_admins=True
            )
            
            if admin_recipients:
                # Send notification to admins
                NotificationService.send(
                    notification_type='appointment_created',
                    recipients=admin_recipients,
                    title='New Appointment Request (K3 Website)',
                    message=f'New appointment request from {name} ({phone}) for {package.name} on {data["preferred_datetime"].strftime("%B %d, %Y at %I:%M %p")} - ₹{estimated_price}',
                    context_data={
                        'appointment_id': appointment.id,
                        'appointment_status': appointment.status,
                        'customer_name': name,
                        'customer_phone': phone,
                        'service_name': package.name,
                        'vehicle_type': data['vehicle_type'],
                        'vehicle_info': f"{data['vehicle_brand']} {data['vehicle_model']}",
                        'preferred_datetime': data['preferred_datetime'].isoformat(),
                        'estimated_price': str(estimated_price),
                        'source': 'K3 Website',
                    },
                    channels=['in_app', 'email'],
                    related_appointment_id=appointment.id
                )
        except Exception as e:
            # Log error but don't fail the appointment creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send appointment notification: {str(e)}")
        
        return Response({
            'success': True,
            'message': 'Appointment request submitted successfully! Our team will contact you shortly.',
            'appointment': {
                'id': appointment.id,
                'reference': f'K3-{appointment.id:06d}',
                'customer_name': name,
                'customer_phone': phone,
                'vehicle': f"{data['vehicle_brand']} {data['vehicle_model']}",
                'vehicle_type': data['vehicle_type'],
                'service': package.name,
                'branch': branch.name,
                'preferred_datetime': data['preferred_datetime'].isoformat(),
                'estimated_price': str(estimated_price),
                'status': 'pending',
                'payment_method': data.get('payment_method', 'pay_at_center'),
            }
        }, status=status.HTTP_201_CREATED)
    
    def _build_notes(self, data):
        """Build notes string from appointment data."""
        notes_parts = []
        
        if data.get('notes'):
            notes_parts.append(data['notes'])
        
        # Add payment preference to notes for admin visibility
        payment_method = data.get('payment_method', 'pay_at_center')
        if payment_method == 'online':
            notes_parts.append('[Payment: Customer prefers online payment]')
        else:
            notes_parts.append('[Payment: Pay at center]')
        
        notes_parts.append('[Source: K3 Website]')
        
        return '\n'.join(notes_parts)

