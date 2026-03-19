from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from typing import Any
from django.utils import timezone
from django.db.models import Q, Prefetch

from .models import (
    JobCard, JobCardPhoto, PartUsed, QCReport, SupervisorReview, 
    FinalQCReport, CustomerApproval, VehicleDelivery, RewardSettings
)
from .serializers import (
    JobCardSerializer,
    JobCardCreateSerializer,
    JobCardListSerializer,
    JobCardPhotoSerializer,
    PartUsedSerializer
)
from .workflow_config import WorkflowEngine
from django.contrib.auth import get_user_model

from config.permissions import IsFloorManager

User = get_user_model()


def check_workflow_permission(jobcard, user, target_status=None, action_name=None):
    """
    Check if user can perform an action using the workflow engine.
    Returns (can_perform, error_response_or_none)
    
    Usage:
        can_perform, error = check_workflow_permission(jobcard, user, target_status='assigned_to_applicator')
        if not can_perform:
            return error
    """
    can_perform, error_msg = WorkflowEngine.can_user_perform_action(
        jobcard, user, action_name=action_name, target_status=target_status
    )
    
    if not can_perform:
        return False, Response(
            {'error': error_msg},
            status=status.HTTP_403_FORBIDDEN
        )
    
    return True, None

class JobCardViewSet(viewsets.ModelViewSet):
    """ViewSet for JobCard operations."""
    queryset = JobCard.objects.all()  # type: ignore
    serializer_class = JobCardSerializer
    
    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self) -> Any:
        """Return appropriate serializer class based on action."""
        if self.action == 'create':
            return JobCardCreateSerializer
        if self.action == 'list':
            return JobCardListSerializer
        return JobCardSerializer
    
    def get_serializer_context(self):
        """Add reward settings to context to avoid N+1 queries."""
        context = super().get_serializer_context()
        
        # For list-style actions, always fetch reward settings (needed for potential_reward on many cards)
        # For retrieve, only fetch if the job is in an active status that would use it
        if self.action in ['list', 'my_jobs', 'supervisor_jobs', 'floor_manager_jobs', 'applicator_jobs']:
            settings = RewardSettings.objects.filter(is_active=True)
            settings_map = {s.branch_id: s for s in settings}
            context['reward_settings_map'] = settings_map
        elif self.action == 'retrieve':
            # For a single detail view, lazily load reward settings only when needed.
            # We pass a sentinel so the serializer can fetch on demand the first time.
            context['reward_settings_map'] = None  # serializer will fetch lazily if required
            
        return context
    
    def _can_user_update_jobcard(self, user, jobcard):
        """Check if user has permission to update a job card."""
        # Super admin can update any job card
        if user.role == 'super_admin':
            return True
        
        # Company admin can update any job card in their company
        if user.role == 'company_admin' and user.company and jobcard.company == user.company:
            return True
        
        # Branch admin can update job cards in their branch
        if user.role == 'branch_admin' and user.branch == jobcard.branch:
            return True
        
        # Floor manager can update job cards they are assigned to or in their branch
        if user.role == 'floor_manager' and user.branch == jobcard.branch:
            return True
        
        # Supervisor can update job cards they are assigned to
        if user.role == 'supervisor' and jobcard.supervisor == user:
            return True
        
        # Applicator can update job cards they are assigned to
        if user.role == 'applicator' and user in jobcard.applicator_team.all():
            return True
        
        return False
    
    def get_queryset(self):
        """Filter based on user role and branch with optimized queries."""
        user = self.request.user
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return JobCard.objects.none()

        # Import Invoice model for prefetch (lazy imported to avoid circular dependencies)
        from billing.models import Invoice
        
        # Determine if this is a list view or detail view
        is_list_view = self.action in ['list', 'my_jobs', 'supervisor_jobs', 'floor_manager_jobs', 'applicator_jobs']
        
        if is_list_view:
            # Lightweight queryset for list views - only essential data
            queryset = JobCard.objects.select_related(
                'booking',
                'booking__customer',
                'booking__customer__user',
                'booking__vehicle',
                'booking__primary_package',
                'branch',
                'floor_manager',
                'supervisor'
            ).prefetch_related(
                'applicator_team',
                Prefetch(
                    'invoices',
                    queryset=Invoice.objects.only('id', 'status', 'total_amount', 'jobcard_id')
                )
            )
        else:
            # Full queryset for detail views - all related data
            from payments.models import Payment as BillingPayment
            from .models import JobCardActivity
            queryset = JobCard.objects.select_related(
                'booking', 'booking__customer', 'booking__customer__user',
                'booking__vehicle', 'booking__primary_package', 'branch',
                'floor_manager', 'supervisor', 'technician', 'qc_report',
                'qc_report__floor_manager', 'supervisor_review',
                'supervisor_review__supervisor', 'final_qc_report',
                'final_qc_report__supervisor', 'customer_approval',
                'delivery', 'delivery__delivered_by', 'booking__assigned_bay'
            ).prefetch_related(
                'booking__addons', 'booking__packages', 'rewards', 'rewards__recipient',
                'rewards__approved_by', 'applicator_team', 'photos',
                'parts_used', 'parts_used__part', 'parts_used__part__branch',
                'parts_used__service_package',
                'applicator_tasks', 'applicator_tasks__applicator', 'notes',
                'notes__created_by', 'dynamic_tasks', 'dynamic_tasks__created_by',
                'dynamic_tasks__assigned_to',
                # Limit activities to last 20 at the DB level — avoids transferring all rows
                Prefetch(
                    'activities',
                    queryset=JobCardActivity.objects.select_related('performed_by').order_by('-created_at')[:20],
                    to_attr='recent_activities_prefetched'
                ),
                Prefetch(
                    'invoices',
                    queryset=Invoice.objects.select_related('customer', 'jobcard', 'branch').prefetch_related(
                        # Prefetch recorded_by so payment.recorded_by.name never hits the DB
                        Prefetch('payments', queryset=BillingPayment.objects.select_related('recorded_by')),
                        'items'
                    )
                )
            )

        # 1. Mandatory Company Isolation for everyone except super_admin
        if not user.is_superuser:
            queryset = queryset.filter(company=company)

        # 2. Role-based filtering
        if user.role == 'customer':
            queryset = queryset.filter(booking__customer__user=user)
        elif user.role == 'supervisor':
            if user.branch:
                queryset = queryset.filter(branch=user.branch)
                # Restrict access for supervisors
                if self.action not in ['supervisor_jobs', 'list']:
                    queryset = queryset.filter(
                        Q(supervisor=user) | 
                        Q(status='qc_completed', supervisor__isnull=True)
                    )
            else:
                # Supervisor must have a branch to see anything
                return queryset.none()
        elif user.role == 'applicator':
            queryset = queryset.filter(applicator_team=user)
        elif user.role == 'company_admin':
            # company_admin sees all in their company (already filtered above)
            pass
        elif user.role in ['branch_admin', 'floor_manager']:
            if user.branch:
                queryset = queryset.filter(branch=user.branch)
                if user.role == 'floor_manager' and self.action not in ['floor_manager_jobs', 'floor_manager_summary']:
                    queryset = queryset.filter(floor_manager=user)
            else:
                return queryset.none()
        elif not user.is_superuser:
            # Any other role (staff, etc.) that isn't superuser also gets restricted to their context
            if getattr(user, 'branch', None):
                queryset = queryset.filter(branch=user.branch)
            else:
                # No branch, no jobcards (unless superuser)
                return queryset.none()
        
        # 3. Explicit branch filtering if branch parameter is provided
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            # Note: Role-based branch filters above will already limit this
            if ',' in str(branch_id):
                queryset = queryset.filter(branch_id__in=branch_id.split(','))
            else:
                queryset = queryset.filter(branch_id=branch_id)
            
        # 4. Apply status filters and ordering
        exclude_status = self.request.query_params.get('exclude_status')
        if exclude_status:
            queryset = queryset.exclude(status__in=exclude_status.split(','))

        ordering = self.request.query_params.get('ordering')
        if ordering:
            queryset = queryset.order_by(ordering)
        
        return queryset.all()
    
    def perform_create(self, serializer):
        """Set the branch automatically when creating a job card."""
        user = self.request.user
        booking = serializer.validated_data['booking']
        
        # Set branch from booking
        branch = booking.branch
        
        # For branch admin users, verify they can access this branch
        if user.role == 'branch_admin' and user.branch and user.branch != branch:
            raise PermissionDenied("You don't have permission to create job cards for this branch.")
        
        # Auto-set allowed_duration as sum of all package durations if not provided
        allowed_duration = serializer.validated_data.get('allowed_duration_minutes')
        if allowed_duration is None:
            pkg_list = booking.get_packages_list()
            total_dur = sum(p.duration for p in pkg_list if p.duration)
            if total_dur > 0:
                serializer.validated_data['allowed_duration_minutes'] = total_dur
        
        # Resolve company: prefer user.company, but fall back to booking's branch company.
        # super_admin users have no company assigned, so we derive it from the branch.
        company = getattr(user, 'company', None) or (branch.company if branch else None)
        
        jobcard = serializer.save(branch=branch, company=company)
        # Set initial status to 'created'
        if not jobcard.status or jobcard.status == 'assigned':
            jobcard.status = 'created'
            jobcard.save()
        
        # Transfer initial photos from booking to job card
        try:
            jobcard.transfer_initial_photos()
        except Exception as e:
            # Log error but don't fail job card creation
            print(f"Error transferring initial photos: {e}")
    
    def update(self, request, *args, **kwargs):
        """Override update to handle branch validation."""
        instance = self.get_object()
        user = request.user
        
        # For branch admin users, verify they can access this branch
        if user.role == 'branch_admin' and user.branch != instance.branch:
            raise PermissionDenied("You don't have permission to update job cards for this branch.")
        
        return super().update(request, *args, **kwargs)
    
    @action(detail=True, methods=['put'])
    def start(self, request, pk=None):
        """Mark job card as started and set start timestamp."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        
        # Verify user is the assigned technician or admin
        if request.user.role == 'supervisor' and jobcard.technician != request.user:
            return Response(
                {'error': 'Only the assigned technician can start this job.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Set status and start time
        jobcard.status = 'started'
        if not jobcard.job_started_at:  # Only set if not already started
            jobcard.job_started_at = timezone.now()
            # Reset warning flags when starting fresh
            jobcard.warning_sent = False
            jobcard.overdue_notification_sent = False
        
        # Auto-set allowed_duration if not set — sum all package durations
        if jobcard.allowed_duration_minutes is None:
            if jobcard.booking:
                pkg_list = jobcard.booking.get_packages_list()
                total_dur = sum(p.duration for p in pkg_list if p.duration)
                if total_dur > 0:
                    jobcard.allowed_duration_minutes = total_dur
        
        jobcard.save()
        
        return Response({
            'message': 'Job card started.',
            'job_started_at': jobcard.job_started_at.isoformat() if jobcard.job_started_at else None,
            'allowed_duration_minutes': jobcard.get_allowed_duration_minutes()
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        """Update job card status."""
        jobcard = self.get_object()
        user = request.user
        new_status = request.data.get('status')
        
        # Check if user has permission to update this job card
        if not self._can_user_update_jobcard(user, jobcard):
            return Response(
                {'error': 'You do not have permission to update this job card.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if new_status not in dict(JobCard.STATUS_CHOICES):
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
        
        jobcard.status = new_status
        jobcard.technician_notes = request.data.get('technician_notes', jobcard.technician_notes)
        jobcard.save()
        
        return Response(JobCardSerializer(jobcard).data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def add_photo(self, request, pk=None):
        """Add photo to job card."""
        jobcard = self.get_object()
        
        # Auto-pause timer for photo uploads if job is active
        timer_was_paused = False
        if jobcard.job_started_at and not jobcard.is_timer_paused:
            pause_result = jobcard.pause_timer(reason='photo_upload')
            if pause_result['success']:
                timer_was_paused = True
        
        try:
            # Pass the jobcard in the context for validation
            serializer = JobCardPhotoSerializer(data=request.data, context={'jobcard': jobcard})
            if serializer.is_valid():
                photo = serializer.save(jobcard=jobcard)
                
                # Auto-resume timer after successful upload
                if timer_was_paused:
                    jobcard.resume_timer()
                
                # 🔄 Fire background compression task — returns instantly to user
                try:
                    from .tasks import process_jobcard_photo
                    process_jobcard_photo.delay(photo.id)
                except Exception as task_err:
                    # Task dispatch failure must never break the upload response
                    import logging
                    logging.getLogger(__name__).warning(
                        f"Could not dispatch photo compression task for photo {photo.id}: {task_err}"
                    )
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            # If validation failed, resume timer before returning error
            if timer_was_paused:
                jobcard.resume_timer()
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Ensure timer is resumed even if an exception occurs
            if timer_was_paused:
                jobcard.resume_timer()
            raise e

    
    @action(detail=True, methods=['delete'])
    def delete_photo(self, request, pk=None, photo_id=None):
        """Delete a photo from job card."""
        jobcard = self.get_object()
        
        try:
            photo = jobcard.photos.get(id=photo_id)
            photo.delete()
            return Response({'message': 'Photo deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
        except JobCardPhoto.DoesNotExist:
            return Response({'error': 'Photo not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def add_part(self, request, pk=None):
        """Add part from catalog to job card."""
        from .parts_catalog import Part
        
        jobcard = self.get_object()
        user = request.user
            
        # Check if user has permission to add parts using workflow engine
        user_permissions = WorkflowEngine.get_user_permissions(user, jobcard)
        if not user_permissions.get('can_add_parts', False):
            if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
                return Response(
                    {'error': 'You do not have permission to add parts to job cards.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
        part_id = request.data.get('part')
        quantity = int(request.data.get('quantity', 1))
        
        if not part_id:
            return Response(
                {'error': 'part ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Explicitly scope part by jobcard's company for security
            part = Part.objects.get(id=part_id, company=jobcard.company)
            
            # Check if this part is already added to this job card
            existing_part_used = PartUsed.objects.filter(
                jobcard=jobcard,
                part=part
            ).first()
            
            if existing_part_used:
                # Part already exists, update the quantity
                # Check stock availability for the additional quantity
                if part.stock < quantity:
                    return Response(
                        {'error': f'Insufficient stock. Only {part.stock} {part.unit} available.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Update the existing part's quantity
                existing_part_used.quantity += quantity
                existing_part_used.save()
                
                # Deduct from stock
                part.stock -= quantity
                part.save()
                
                return Response(
                    PartUsedSerializer(existing_part_used).data, 
                    status=status.HTTP_200_OK
                )
            else:
                # Part doesn't exist, create new record
                # Check stock availability
                if part.stock < quantity:
                    return Response(
                        {'error': f'Insufficient stock. Only {part.stock} {part.unit} available.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create PartUsed record
                part_used = PartUsed.objects.create(
                    jobcard=jobcard,
                    company=jobcard.company or part.company,
                    part=part,
                    part_name=part.name,
                    quantity=quantity,
                    price=part.selling_price,
                    cost_price=part.cost_price
                )
                
                # Deduct from stock
                part.stock -= quantity
                part.save()
                
                return Response(PartUsedSerializer(part_used).data, status=status.HTTP_201_CREATED)
            
        except Part.DoesNotExist:
            return Response(
                {'error': 'Part not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error adding part: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], url_path='deduct_service_parts')
    def deduct_service_parts(self, request, pk=None):
        """
        Manually trigger automatic parts deduction for all service packages on this job card.
        Useful for job cards created before the multi-service parts fix.
        Only deducts parts that haven't already been auto-deducted (is_service_default=True).
        """
        from services.service_parts import ServicePackagePart
        
        jobcard = self.get_object()
        user = request.user
        
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can trigger parts deduction.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not jobcard.booking:
            return Response({'error': 'Job card has no associated booking.'}, status=status.HTTP_400_BAD_REQUEST)
        
        packages = jobcard.booking.get_packages_list()
        if not packages:
            return Response({'message': 'No service packages found on this booking.', 'deducted': []})
        
        vehicle_type = jobcard.booking.vehicle_type or 'sedan'
        company = jobcard.company
        
        # Remove existing auto-deducted (service default) parts to avoid duplicates
        existing_default_parts = jobcard.parts_used.filter(is_service_default=True)
        removed_count = existing_default_parts.count()
        # Restore stock for removed parts
        for pu in existing_default_parts:
            if pu.part:
                pu.part.stock += pu.quantity
                pu.part.save()
        existing_default_parts.delete()
        
        deducted = []
        skipped = []
        
        for package in packages:
            # Try company-specific parts first
            required_parts = ServicePackagePart.objects.all_companies().filter(
                package=package, is_active=True, company=company
            ).select_related('part')
            
            if not required_parts.exists():
                required_parts = ServicePackagePart.objects.all_companies().filter(
                    package=package, is_active=True, company__isnull=True
                ).select_related('part')
            
            for service_part in required_parts:
                try:
                    part_used = service_part.deduct_stock(
                        vehicle_type=vehicle_type,
                        multiplier=1,
                        jobcard=jobcard,
                        service_package=package
                    )
                    if part_used:
                        deducted.append({
                            'package': package.name,
                            'part': service_part.part.name,
                            'quantity': part_used.quantity
                        })
                    else:
                        skipped.append({'package': package.name, 'part': service_part.part.name, 'reason': 'optional, out of stock'})
                except ValueError as e:
                    skipped.append({'package': package.name, 'part': service_part.part.name, 'reason': str(e)})
        
        return Response({
            'message': f'Parts deduction complete. {len(deducted)} deducted, {len(skipped)} skipped.',
            'removed_previous': removed_count,
            'deducted': deducted,
            'skipped': skipped,
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='update_services')
    def update_services(self, request, pk=None):
        """
        Add or change service packages on an existing job card.
        Allowed up to and including work_in_progress.
        
        Body:
          {
            "package_ids": [1, 2, 3],
            "restore_parts": true  # Optional: restore stock for removed services (default false)
          }
        
        Permissions: branch_admin, company_admin, super_admin only.
        """
        from services.models import ServicePackage
        from services.service_parts import ServicePackagePart

        jobcard = self.get_object()
        user = request.user

        # -- Permission check (floor_manager excluded) --
        allowed_roles = ['branch_admin', 'company_admin', 'super_admin']
        if user.role not in allowed_roles:
            return Response(
                {'error': 'Only company/branch admins can change services on a job card.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # -- Status gate: blocked once work_completed or later --
        blocked_statuses = [
            'work_completed', 'final_qc_pending', 'final_qc_passed', 'final_qc_failed',
            'floor_manager_final_qc_confirmed', 'customer_approval_pending', 'customer_approved',
            'customer_revision_requested', 'ready_for_billing', 'billed',
            'ready_for_delivery', 'delivered', 'closed',
        ]
        if jobcard.status in blocked_statuses:
            return Response(
                {'error': f'Cannot change services once job is in "{jobcard.get_status_display()}" status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # -- Invoice gate: block if paid invoice exists --
        paid_invoice = jobcard.invoices.filter(status='paid').first()
        if paid_invoice:
            return Response(
                {'error': 'Cannot change services — a paid invoice already exists for this job card.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # -- Validate package_ids --
        package_ids = request.data.get('package_ids', [])
        if not package_ids:
            return Response({'error': 'package_ids is required and cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        restore_parts = request.data.get('restore_parts', False)

        # Fetch the new packages (scoped to company)
        new_packages = list(ServicePackage.objects.filter(id__in=package_ids).select_related())
        if len(new_packages) != len(package_ids):
            return Response({'error': 'One or more package IDs are invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        booking = jobcard.booking
        vehicle_type = booking.vehicle_type or 'sedan'
        company = jobcard.company

        # Track which packages are being added vs removed
        previous_package_ids = set(booking.packages.values_list('id', flat=True))
        new_package_ids = set(p.id for p in new_packages)
        added_ids = new_package_ids - previous_package_ids
        removed_ids = previous_package_ids - new_package_ids
        removed_package_names = [p.name for p in booking.packages.filter(id__in=removed_ids)]
        is_work_in_progress = jobcard.status == 'work_in_progress'

        # -- Update booking.packages (M2M) --
        booking.packages.set(new_packages)
        booking.primary_package = new_packages[0] if new_packages else None

        # Recalculate prices
        booking.subtotal, booking.gst_amount, booking.total_price = booking.calculate_prices()
        booking.save(skip_calculation=True)

        # -- Update job card duration & reset buffer --
        total_duration = sum(p.duration for p in new_packages if p.duration)
        if total_duration > 0:
            jobcard.allowed_duration_minutes = total_duration
        jobcard.buffer_minutes_allocated = 10
        jobcard.save(update_fields=['allowed_duration_minutes', 'buffer_minutes_allocated'])

        # -- Parts handling --
        parts_log = {'deducted': [], 'skipped': [], 'restored': [], 'removed': []}

        if is_work_in_progress:
            # Mid-work: only touch parts for added/removed packages
            if restore_parts and removed_ids:
                # Restore stock for explicitly removed-service default parts
                removed_parts = jobcard.parts_used.filter(
                    is_service_default=True,
                    service_package_id__in=removed_ids
                )
                for pu in removed_parts:
                    if pu.part:
                        pu.part.stock += int(pu.quantity)
                        pu.part.save()
                        parts_log['restored'].append({'part': pu.part_name, 'qty': pu.quantity})
                removed_parts.delete()

            # Remove PartUsed records for removed services (without restoring stock if not restore_parts)
            elif removed_ids:
                removed_parts_qs = jobcard.parts_used.filter(
                    is_service_default=True,
                    service_package_id__in=removed_ids
                )
                for pu in removed_parts_qs:
                    parts_log['removed'].append({'part': pu.part_name, 'note': 'not restocked (assumed in use)'})
                removed_parts_qs.delete()

            # Deduct parts for newly added services only
            for package in new_packages:
                if package.id not in added_ids:
                    continue  # Skip unchanged packages
                required_parts = ServicePackagePart.objects.all_companies().filter(
                    package=package, is_active=True, company=company
                ).select_related('part')
                if not required_parts.exists():
                    required_parts = ServicePackagePart.objects.all_companies().filter(
                        package=package, is_active=True, company__isnull=True
                    ).select_related('part')
                for sp in required_parts:
                    try:
                        pu = sp.deduct_stock(vehicle_type=vehicle_type, jobcard=jobcard, service_package=package)
                        if pu:
                            parts_log['deducted'].append({'package': package.name, 'part': sp.part.name})
                        else:
                            parts_log['skipped'].append({'package': package.name, 'part': sp.part.name, 'reason': 'optional/out of stock'})
                    except ValueError as e:
                        parts_log['skipped'].append({'package': package.name, 'part': sp.part.name, 'reason': str(e)})

        else:
            # Not yet in progress: full reset — remove all default parts, deduct for all new packages
            existing_defaults = jobcard.parts_used.filter(is_service_default=True)
            if restore_parts:
                for pu in existing_defaults:
                    if pu.part:
                        pu.part.stock += int(pu.quantity)
                        pu.part.save()
                        parts_log['restored'].append({'part': pu.part_name, 'qty': pu.quantity})
            existing_defaults.delete()

            for package in new_packages:
                required_parts = ServicePackagePart.objects.all_companies().filter(
                    package=package, is_active=True, company=company
                ).select_related('part')
                if not required_parts.exists():
                    required_parts = ServicePackagePart.objects.all_companies().filter(
                        package=package, is_active=True, company__isnull=True
                    ).select_related('part')
                for sp in required_parts:
                    try:
                        pu = sp.deduct_stock(vehicle_type=vehicle_type, jobcard=jobcard, service_package=package)
                        if pu:
                            parts_log['deducted'].append({'package': package.name, 'part': sp.part.name})
                        else:
                            parts_log['skipped'].append({'package': package.name, 'part': sp.part.name, 'reason': 'optional/out of stock'})
                    except ValueError as e:
                        parts_log['skipped'].append({'package': package.name, 'part': sp.part.name, 'reason': str(e)})

        # -- Sync draft invoice line items --
        draft_invoice = jobcard.invoices.filter(status='draft').first()
        if draft_invoice:
            try:
                from billing.models import InvoiceItem
                draft_invoice.items.filter(item_type='service').delete()
                for pkg in new_packages:
                    pkg_price = pkg.get_price_for_vehicle_type(vehicle_type)
                    pkg_gst = pkg.calculate_gst(pkg_price)
                    InvoiceItem.objects.create(
                        invoice=draft_invoice,
                        item_type='service',
                        description=f'Service Package: {pkg.name}',
                        quantity=1,
                        unit_price=pkg_price,
                        tax_rate=pkg.gst_rate if pkg.gst_applicable else 0,
                        tax_amount=pkg_gst,
                        total_amount=pkg_price + pkg_gst,
                    )
                draft_invoice.calculate_totals()
                draft_invoice.save()
            except Exception as e:
                pass  # Invoice sync failure is non-fatal

        # -- Log Activity --
        from .models import JobCardActivity
        added_package_names = [p.name for p in new_packages if p.id in added_ids]
        
        description = f"Services/Pricing updated. New Total: ₹{booking.total_price}"
        if added_package_names:
            description += f" | Added: {', '.join(added_package_names)}"
        if removed_package_names:
            description += f" | Removed: {', '.join(removed_package_names)}"
        
        JobCardActivity.objects.create(
            jobcard=jobcard,
            activity_type='service_update',
            performed_by=user,
            description=description,
            metadata={
                'added_ids': list(added_ids),
                'removed_ids': list(removed_ids),
                'new_total': float(booking.total_price),
                'parts_log': parts_log
            }
        )

        return Response({
            'message': f'Services updated successfully. {len(parts_log["deducted"])} new parts deducted.',
            'new_packages': [{'id': p.id, 'name': p.name} for p in new_packages],
            'total_price': str(booking.total_price),
            'allowed_duration_minutes': jobcard.allowed_duration_minutes,
            'parts': parts_log,
            'mid_work': is_work_in_progress,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='parts/(?P<part_used_id>[^/.]+)')
    def update_part(self, request, pk=None, part_used_id=None):
        """Update quantity of a part used in job card."""
        from .parts_catalog import Part
        
        jobcard = self.get_object()
        user = request.user
        
        # Check permission
        user_permissions = WorkflowEngine.get_user_permissions(user, jobcard)
        if not user_permissions.get('can_add_parts', False):
            if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
                return Response(
                    {'error': 'You do not have permission to update parts in job cards.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            part_used = PartUsed.objects.get(id=part_used_id, jobcard=jobcard)
            new_quantity = int(request.data.get('quantity', part_used.quantity))
            
            if new_quantity <= 0:
                return Response(
                    {'error': 'Quantity must be greater than 0.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # If part is from catalog, update stock
            if part_used.part:
                part = part_used.part
                quantity_diff = new_quantity - part_used.quantity
                
                # Check if we have enough stock
                if quantity_diff > 0 and part.stock < quantity_diff:
                    return Response(
                        {'error': f'Insufficient stock. Only {part.stock} {part.unit} available to add.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Update stock
                part.stock -= quantity_diff
                part.save()
            
            # Update part_used
            part_used.quantity = new_quantity
            part_used.save()
            
            return Response(PartUsedSerializer(part_used).data, status=status.HTTP_200_OK)
            
        except PartUsed.DoesNotExist:
            return Response(
                {'error': 'Part usage record not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error updating part: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['delete'], url_path='parts/(?P<part_used_id>[^/.]+)')
    def remove_part(self, request, pk=None, part_used_id=None):
        """Remove a part from job card and restore stock."""
        jobcard = self.get_object()
        user = request.user
        
        # Check permission
        user_permissions = WorkflowEngine.get_user_permissions(user, jobcard)
        if not user_permissions.get('can_add_parts', False):
            if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
                return Response(
                    {'error': 'You do not have permission to remove parts from job cards.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            part_used = PartUsed.objects.get(id=part_used_id, jobcard=jobcard)
            
            # If part is from catalog, restore stock
            if part_used.part:
                part = part_used.part
                part.stock += part_used.quantity
                part.save()
            
            # Delete the part_used record
            part_used.delete()
            
            return Response(
                {'message': 'Part removed successfully and stock restored.'},
                status=status.HTTP_200_OK
            )
            
        except PartUsed.DoesNotExist:
            return Response(
                {'error': 'Part usage record not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error removing part: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark job as completed."""
        jobcard = self.get_object()
        user = request.user
        
        # Verify user is the assigned technician or applicator
        if user != jobcard.technician and user not in jobcard.applicator_team.all():
            return Response(
                {'error': 'Only the assigned technician or applicator team members can complete this job'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify at least one after photo exists
        after_photos = jobcard.photos.filter(photo_type='after').count()
        if after_photos == 0:
            return Response(
                {'error': 'Please upload at least one after photo before completing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        jobcard.status = 'completed'
        # Reset warning flags when job is completed
        jobcard.warning_sent = False
        jobcard.overdue_notification_sent = False
        jobcard.save()
        
        return Response({'message': 'Job completed successfully'}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def my_jobs(self, request):
        """Get jobs assigned to current technician (applicator, supervisor, etc.)."""
        if request.user.role not in ['applicator', 'supervisor']:
            return Response(
                {'error': 'Only technicians can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='supervisor/jobs')
    def supervisor_jobs(self, request):
        """Get jobs that need supervisor review with bucket filtering."""
        if request.user.role != 'supervisor':
            return Response(
                {'error': 'Only supervisors can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        bucket = request.query_params.get('bucket', 'pending_review')

        # Logic: Supervisors see jobs that are EITHER:
        # 1. Unassigned (supervisor=None) - available for any supervisor in branch to pick up
        # 2. Assigned to THEM (supervisor=user)
        # 3. We ALREADY filter by branch in get_queryset, so that's covered.
        
        # Base filter for supervisor visibility
        queryset = queryset.filter(Q(supervisor=request.user) | Q(supervisor__isnull=True))

        if bucket == 'pending_review':
            # Jobs with QC completed waiting for review
            queryset = queryset.filter(status='qc_completed')
        elif bucket == 'approved':
            # Jobs approved by supervisor but arguably waiting for assignment or further steps
            # "Pending Assignment" logic usually falls here
            queryset = queryset.filter(status__in=['supervisor_approved', 'floor_manager_confirmed'])
        elif bucket == 'rejected':
            # Jobs rejected by supervisor
            queryset = queryset.filter(status='qc_rejected')
        elif bucket == 'assigned':
            # Jobs assigned to applicators (WIP lifecycle)
            queryset = queryset.filter(status__in=[
                'assigned_to_applicator', 
                'work_in_progress', 
                'work_completed', 
                'final_qc_pending',
                'final_qc_failed', 
                'final_qc_passed',
                'floor_manager_final_qc_confirmed'
            ])
        elif bucket == 'recent':
            # Jobs updated in the last 24 hours
            from django.utils import timezone
            from datetime import timedelta
            yesterday = timezone.now() - timedelta(hours=24)
            queryset = queryset.filter(updated_at__gte=yesterday)
        elif bucket == 'all_my':
            # Returns all distinct jobs for this supervisor/branch that are visible
            pass
        else:
            return Response(
                {'error': 'Invalid bucket. Use pending_review, approved, rejected, assigned, or all_my.'},
                status=status.HTTP_400_BAD_REQUEST
            )


        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='supervisor/summary')
    def supervisor_summary(self, request):
        """Return summary statistics for supervisor dashboard."""
        if request.user.role != 'supervisor':
            return Response(
                {'error': 'Only supervisors can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        queryset = self.get_queryset()
        
        # Base filter for supervisor visibility
        queryset = queryset.filter(Q(supervisor=user) | Q(supervisor__isnull=True))
        
        summary = {
            'pending_qc_review': queryset.filter(status='qc_completed').count(),
            'ready_for_assignment': queryset.filter(
                status__in=['supervisor_approved', 'floor_manager_confirmed']
            ).count(),
            'work_in_progress': queryset.filter(
                status__in=['assigned_to_applicator', 'work_in_progress']
            ).count(),
            'qc_failed': queryset.filter(
                status__in=['qc_rejected', 'final_qc_failed']
            ).count(),
            'final_qc_pending': queryset.filter(status='work_completed').count(),
            'ready_for_billing': queryset.filter(status='ready_for_billing').count(),
        }
        
        return Response(summary, status=status.HTTP_200_OK)
    

    @action(detail=True, methods=['put'], permission_classes=[permissions.IsAuthenticated])
    def set_duration(self, request, pk=None):
        """Admin endpoint to set allowed duration for a job."""
        jobcard = self.get_object()
        user = request.user
        
        # Only branch admin and super_admin can set duration
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can set job duration.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For branch admins, verify they can access this branch
        if user.role == 'branch_admin' and user.branch != jobcard.branch:
            return Response(
                {'error': 'You can only set duration for jobs in your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        duration_minutes = request.data.get('duration_minutes')
        
        if duration_minutes is None:
            return Response(
                {'error': 'duration_minutes is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            duration_minutes = int(duration_minutes)
            if duration_minutes <= 0:
                return Response(
                    {'error': 'Duration must be a positive number.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid duration value. Must be a number.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_duration = jobcard.allowed_duration_minutes
        jobcard.allowed_duration_minutes = duration_minutes
        
        # If duration was increased and job is active, reset warning flags
        if jobcard.job_started_at and duration_minutes > (old_duration or 0):
            jobcard.warning_sent = False
            jobcard.overdue_notification_sent = False
        
        jobcard.save()
        
        serializer = self.get_serializer(jobcard)
        return Response({
            'message': f'Duration set to {duration_minutes} minutes.',
            'jobcard': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def active_timers(self, request):
        """Get all active jobs with timers for admin/technician tracking."""
        user = request.user
        
        # For admin users (branch_admin, floor_manager, super_admin), get all active jobs
        # without the restrictive individual job filtering
        if user.role in ['company_admin', 'branch_admin', 'floor_manager', 'super_admin']:
            queryset = JobCard.objects.all()
            
            # Apply company filtering for company admin
            if user.role == 'company_admin':
                if user.company:
                    queryset = queryset.filter(company=user.company)
                else:
                    queryset = queryset.none()
            
            # Apply branch filtering for branch level roles
            elif user.role == 'branch_admin' or user.role == 'floor_manager':
                if user.branch:
                    queryset = queryset.filter(branch=user.branch)
                else:
                    queryset = queryset.none()
            
            # Apply branch filtering if branch parameter is provided (for super_admin or company_admin)
            branch_id = self.request.query_params.get('branch')
            if branch_id and user.role in ['super_admin', 'company_admin']:
                if ',' in str(branch_id):
                    queryset = queryset.filter(branch_id__in=branch_id.split(','))
                else:
                    queryset = queryset.filter(branch_id=branch_id)
        else:
            # For other roles, use the standard filtering
            queryset = self.get_queryset()
        
        # Only show active jobs (started or in_progress)
        queryset = queryset.filter(status__in=['started', 'in_progress', 'work_in_progress'])
        
        # Only show jobs that have started
        queryset = queryset.exclude(job_started_at__isnull=True)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def check_timers(self, request):
        """Manually trigger timer check for all active jobs (admin only)."""
        user = request.user
        
        # Only branch admin and super_admin can trigger manual checks
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can trigger timer checks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Import and run the check
        from .tasks import check_job_timers
        check_job_timers.delay()  # Run asynchronously
        
        return Response({
            'message': 'Timer check triggered successfully. Notifications will be sent if any warnings are needed.'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def pause_timer(self, request, pk=None):
        """Pause the job timer with a specified reason."""
        jobcard = self.get_object()
        user = request.user
        
        # Check if user has permission to pause timer
        # Floor managers, supervisors, applicators assigned to the job, and admins can pause
        allowed_roles = ['branch_admin', 'company_admin', 'super_admin', 'floor_manager', 'supervisor', 'applicator']
        if user.role not in allowed_roles:
            return Response(
                {'error': 'You do not have permission to pause the timer.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For non-admin users, verify they are assigned to this job
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            is_assigned = (
                user == jobcard.floor_manager or
                user == jobcard.supervisor or
                user in jobcard.applicator_team.all()
            )
            if not is_assigned:
                return Response(
                    {'error': 'You are not assigned to this job card.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get pause reason from request
        reason = request.data.get('reason', 'manual')
        valid_reasons = ['photo_upload', 'qc_review', 'manual', 'technical_issue']
        
        if reason not in valid_reasons:
            return Response(
                {'error': f'Invalid reason. Must be one of: {", ".join(valid_reasons)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Attempt to pause the timer
        result = jobcard.pause_timer(reason=reason)
        
        if result['success']:
            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='status_change',
                performed_by=user,
                description=f'Timer paused: {reason}',
                metadata={'reason': reason, 'remaining_buffer': result.get('remaining_buffer')}
            )
            
            # Broadcast timer paused event via WebSocket
            from notify.websocket_utils import broadcast_timer_event, broadcast_jobcard_updated
            broadcast_timer_event(jobcard.id, 'timer_paused', {
                'jobcard_id': jobcard.id,
                'is_timer_paused': True,
                'pause_started_at': result['paused_at'].isoformat() if result.get('paused_at') else None,
                'pause_reason': reason,
                'remaining_buffer_minutes': result['remaining_buffer'],
                'total_pause_duration_seconds': jobcard.total_pause_duration_seconds,
            })
            broadcast_jobcard_updated(jobcard.id, reason='timer_paused')
            
            return Response({
                'message': result['message'],
                'paused_at': result['paused_at'],
                'remaining_buffer_minutes': result['remaining_buffer'],
                'reason': reason
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['message']},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def resume_timer(self, request, pk=None):
        """Resume a paused job timer."""
        jobcard = self.get_object()
        user = request.user
        
        # Check if user has permission to resume timer
        # Same permissions as pause
        allowed_roles = ['branch_admin', 'company_admin', 'super_admin', 'floor_manager', 'supervisor', 'applicator']
        if user.role not in allowed_roles:
            return Response(
                {'error': 'You do not have permission to resume the timer.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For non-admin users, verify they are assigned to this job
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            is_assigned = (
                user == jobcard.floor_manager or
                user == jobcard.supervisor or
                user in jobcard.applicator_team.all()
            )
            if not is_assigned:
                return Response(
                    {'error': 'You are not assigned to this job card.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Attempt to resume the timer
        result = jobcard.resume_timer()
        
        if result['success']:
            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='status_change',
                performed_by=user,
                description=f'Timer resumed after {result["pause_duration_minutes"]} minutes',
                metadata={
                    'pause_duration_seconds': result['pause_duration_seconds'],
                    'pause_duration_minutes': result['pause_duration_minutes'],
                    'previous_reason': result.get('previous_reason')
                }
            )
            
            # Broadcast timer resumed event via WebSocket
            from notify.websocket_utils import broadcast_timer_event, broadcast_jobcard_updated
            broadcast_timer_event(jobcard.id, 'timer_resumed', {
                'jobcard_id': jobcard.id,
                'is_timer_paused': False,
                'pause_duration_seconds': result['pause_duration_seconds'],
                'total_pause_duration_seconds': result['total_pause_duration_seconds'],
                'remaining_buffer_minutes': result['remaining_buffer'],
            })
            broadcast_jobcard_updated(jobcard.id, reason='timer_resumed')
            
            return Response({
                'message': result['message'],
                'pause_duration_seconds': result['pause_duration_seconds'],
                'pause_duration_minutes': result['pause_duration_minutes'],
                'total_pause_duration_seconds': result['total_pause_duration_seconds'],
                'remaining_buffer_minutes': result['remaining_buffer']
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': result['message']},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def request_buffer_extension(self, request, pk=None):
        """Request additional buffer time for a job (requires admin approval)."""
        jobcard = self.get_object()
        user = request.user
        
        # Only floor managers and supervisors can request buffer extensions
        if user.role not in ['floor_manager', 'supervisor']:
            return Response(
                {'error': 'Only floor managers and supervisors can request buffer extensions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify user is assigned to this job
        if user != jobcard.floor_manager and user != jobcard.supervisor:
            return Response(
                {'error': 'You are not assigned to this job card.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get extension details
        additional_minutes = request.data.get('additional_minutes')
        reason = request.data.get('reason', '')
        
        if not additional_minutes:
            return Response(
                {'error': 'additional_minutes is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            additional_minutes = int(additional_minutes)
            if additional_minutes <= 0:
                return Response(
                    {'error': 'additional_minutes must be a positive number.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid additional_minutes value.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reason:
            return Response(
                {'error': 'Reason for buffer extension is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a note for the buffer extension request
        from .models import JobCardNote
        note = JobCardNote.objects.create(
            jobcard=jobcard,
            created_by=user,
            note_type='issue',
            content=f'Buffer Extension Request: {additional_minutes} minutes\nReason: {reason}',
            is_pinned=True
        )
        
        # Log activity
        from .models import JobCardActivity
        JobCardActivity.objects.create(
            jobcard=jobcard,
            activity_type='note_added',
            performed_by=user,
            description=f'Requested {additional_minutes} minutes buffer extension',
            metadata={
                'additional_minutes': additional_minutes,
                'reason': reason,
                'note_id': note.id
            }
        )
        
        # Send notification to admins
        from .buffer_monitoring import BufferMonitoringService
        BufferMonitoringService.notify_buffer_extension_request(
            jobcard=jobcard,
            requested_by=user,
            additional_minutes=additional_minutes,
            reason=reason,
            note_id=note.id
        )
        
        return Response({
            'message': 'Buffer extension request submitted successfully. Waiting for admin approval.',
            'request': {
                'additional_minutes': additional_minutes,
                'reason': reason,
                'requested_by': user.name,
                'note_id': note.id
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def buffer_analytics(self, request):
        """Get buffer usage analytics (admin only)."""
        user = request.user
        
        # Only admins can access analytics
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can access buffer analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get query parameters
        days = int(request.query_params.get('days', 30))
        branch_id = request.query_params.get('branch_id')
        
        # Branch admins can only see their own branch
        if user.role == 'branch_admin':
            branch_id = user.branch_id
        elif user.role == 'company_admin' and branch_id:
            # Validate branch belongs to company_admin's company
            from branches.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
                if branch.company != user.company:
                    return Response(
                        {'error': 'Cannot access other company data.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Branch.DoesNotExist:
                return Response(
                    {'error': 'Branch not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Validate days parameter
        if days < 1 or days > 365:
            return Response(
                {'error': 'Days must be between 1 and 365.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get analytics
        from .buffer_monitoring import BufferMonitoringService
        
        try:
            analytics = BufferMonitoringService.get_buffer_analytics(
                branch_id=branch_id,
                days=days
            )
            
            return Response(analytics, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error generating analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    
    @action(detail=True, methods=['post'], url_path='update-booking-date')
    def update_booking_date(self, request, pk=None):
        """Update the booking date and time for this job card."""
        jobcard = self.get_object()
        user = request.user
        
        # Only admins can update booking date
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can update booking date.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        booking_datetime_str = request.data.get('booking_datetime')
        if not booking_datetime_str:
            return Response(
                {'error': 'booking_datetime is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            from datetime import datetime
            from django.utils import timezone
            # Handle standard ISO or datetime-local format
            if 'T' in booking_datetime_str:
                date_part, time_part = booking_datetime_str.split('T')
                naive_datetime = datetime.strptime(f'{date_part} {time_part}', '%Y-%m-%d %H:%M')
                booking_datetime = timezone.make_aware(naive_datetime)
            else:
                booking_datetime = timezone.make_aware(datetime.fromisoformat(booking_datetime_str))
                
            booking = jobcard.booking
            old_date = booking.booking_datetime.strftime('%d %b %Y, %I:%M %p') if booking.booking_datetime else 'None'
            booking.booking_datetime = booking_datetime
            booking.save()
            
            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='date_update',
                performed_by=user,
                description=f'Booking date updated from {old_date} to {booking_datetime.strftime("%d %b %Y, %I:%M %p")}',
                metadata={
                    'old_date': old_date,
                    'new_date': booking_datetime.isoformat()
                }
            )
            
            return Response({
                'message': 'Booking date updated successfully.',
                'booking_datetime': booking_datetime.isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error updating booking date: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def assign_supervisor(self, request, pk=None):
        """Assign Supervisor to job card (standalone action)."""
        jobcard = self.get_object()
        user = request.user
        
        # Only branch admins, super admins, and floor managers can assign supervisor
        if user.role not in ['branch_admin', 'company_admin', 'super_admin', 'floor_manager']:
            return Response(
                {'error': 'Only branch admins, super admins, and floor managers can assign supervisors.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        supervisor_id = request.data.get('supervisor_id')
        if not supervisor_id:
            return Response(
                {'error': 'supervisor_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            supervisor = User.objects.get(id=supervisor_id, role='supervisor')
            
            # Verify supervisor is within the user's scope
            if user.role == 'company_admin' and user.company:
                if supervisor.company != user.company:
                    return Response(
                        {'error': 'Supervisor must be from your company.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif user.role in ['branch_admin', 'floor_manager'] and user.branch:
                if supervisor.branch != user.branch:
                    return Response(
                        {'error': 'Supervisor must be from your branch.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            jobcard.supervisor = supervisor
            jobcard.save()

            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='assignment',
                performed_by=user,
                description=f'Supervisor assigned: {supervisor.name}',
                metadata={'supervisor_id': supervisor.id, 'supervisor_name': supervisor.name}
            )
            
            return Response({
                'message': 'Supervisor assigned successfully.',
                'jobcard': self.get_serializer(jobcard).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {'error': 'Supervisor not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def assign_floor_manager(self, request, pk=None):
        """Assign Floor Manager to job card (Phase 3)."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Only branch admins and super admins can assign floor manager
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response(
                {'error': 'Only branch admins and super admins can assign floor managers.'},
                status=status.HTTP_403_FORBIDDEN
            )
        

        
        floor_manager_id = request.data.get('floor_manager_id')
        if not floor_manager_id:
            return Response(
                {'error': 'floor_manager_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            floor_manager = User.objects.get(id=floor_manager_id, role='floor_manager')
            # console.log(floor_manager.branch, user.branch)
            if user.role == 'branch_admin' and floor_manager.branch != user.branch:
                return Response(
                    {'error': 'Floor manager must be from your branch.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            jobcard.floor_manager = floor_manager
            jobcard.status = 'qc_pending'
            jobcard.save()

            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='assignment',
                performed_by=user,
                description=f'Floor Manager assigned: {floor_manager.name}',
                metadata={'floor_manager_id': floor_manager.id, 'floor_manager_name': floor_manager.name}
            )
            
            return Response({
                'message': 'Floor manager assigned successfully.',
                'jobcard': self.get_serializer(jobcard).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {'error': 'Floor manager not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def complete_qc(self, request, pk=None):
        """Floor Manager completes QC check - permissions from workflow."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Dynamic permission check from workflow
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status='qc_completed'
        )
        if not can_perform:
            return error
        
        # Auto-pause timer for QC review if job is active
        timer_was_paused = False
        if jobcard.job_started_at and not jobcard.is_timer_paused:
            pause_result = jobcard.pause_timer(reason='qc_review')
            if pause_result['success']:
                timer_was_paused = True
        
        try:
            # Create or update QC report
            qc_report, created = QCReport.objects.get_or_create(
                jobcard=jobcard,
                defaults={'floor_manager': user}
            )
            
            if not created:
                qc_report.floor_manager = user
            
            # Update QC report data
            qc_report.scratches = request.data.get('scratches', qc_report.scratches)
            qc_report.dents = request.data.get('dents', qc_report.dents)
            qc_report.before_photos = request.data.get('before_photos', qc_report.before_photos)
            qc_report.checklist_points = request.data.get('checklist_points', qc_report.checklist_points)
            qc_report.required_parts = request.data.get('required_parts', qc_report.required_parts)
            qc_report.additional_tasks = request.data.get('additional_tasks', qc_report.additional_tasks)
            qc_report.additional_tasks_price = request.data.get('additional_tasks_price', 0)
            qc_report.notes = request.data.get('notes', qc_report.notes)
            qc_report.is_completed = True
            qc_report.completed_at = timezone.now()
            qc_report.save()
            
            # Check if a supervisor is being assigned
            supervisor_id = request.data.get('supervisor_id')
            if supervisor_id:
                try:
                    supervisor = User.objects.get(id=supervisor_id, role='supervisor')
                    # Verify supervisor is in the same branch
                    if jobcard.branch and supervisor.branch != jobcard.branch:
                        # Resume timer before returning error
                        if timer_was_paused:
                            jobcard.resume_timer()
                        return Response(
                            {'error': 'Supervisor must be from the same branch as the job card.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    jobcard.supervisor = supervisor
                except User.DoesNotExist:
                    # Resume timer before returning error
                    if timer_was_paused:
                        jobcard.resume_timer()
                    return Response(
                        {'error': 'Supervisor not found.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Optionally assign applicator team during QC completion
            applicator_ids = request.data.get('applicator_ids', [])
            if applicator_ids:
                from django.contrib.auth import get_user_model
                UserModel = get_user_model()
                applicators = UserModel.objects.filter(
                    id__in=applicator_ids, role='applicator'
                ).select_related('branch')
                if applicators.count() != len(applicator_ids):
                    if timer_was_paused:
                        jobcard.resume_timer()
                    return Response(
                        {'error': 'Some applicator IDs are invalid.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                jobcard.applicator_team.set(applicators)
            
            # Update job card status
            jobcard.status = 'qc_completed'
            jobcard.save()
            
            # Auto-resume timer after QC completion
            if timer_was_paused:
                jobcard.resume_timer()
            
            return Response({
                'message': 'QC completed successfully. Waiting for supervisor review.',
                'qc_report': {
                    'id': qc_report.id,
                    'scratches': qc_report.scratches,
                    'dents': qc_report.dents,
                    'before_photos': qc_report.before_photos,
                    'checklist_points': qc_report.checklist_points,
                    'required_parts': qc_report.required_parts,
                    'additional_tasks': qc_report.additional_tasks,
                    'additional_tasks_price': float(qc_report.additional_tasks_price),
                    'notes': qc_report.notes,
                    'completed_at': qc_report.completed_at.isoformat() if qc_report.completed_at else None
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            # Ensure timer is resumed even if an exception occurs
            if timer_was_paused:
                jobcard.resume_timer()
            raise e
    
    @action(detail=True, methods=['post'])
    def supervisor_review(self, request, pk=None):
        """Supervisor review - permissions from workflow configuration."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        action_type = request.data.get('action', 'approve')
        
        # Determine target status based on action
        target_status = 'supervisor_approved' if action_type == 'approve' else 'supervisor_rejected'
        
        # Dynamic permission check from workflow
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status=target_status
        )
        if not can_perform:
            return error
        
        action = request.data.get('action')  # 'approve' or 'reject'
        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Action must be either "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update supervisor review
        review, created = SupervisorReview.objects.get_or_create(
            jobcard=jobcard,
            defaults={'supervisor': user}
        )
        
        if not created:
            review.supervisor = user
        
        if action == 'approve':
            review.status = 'approved'
            review.review_notes = request.data.get('review_notes', '')
            review.stock_availability_checked = request.data.get('stock_availability_checked', False)
            review.pricing_confirmed = request.data.get('pricing_confirmed', False)
            review.reviewed_at = timezone.now()
            review.save()
            
            # Update job card
            jobcard.supervisor = user
            jobcard.status = 'supervisor_approved'
            jobcard.save()
            
            return Response({
                'message': 'QC approved. Ready for floor manager confirmation.',
                'review': {
                    'id': review.id,
                    'status': review.status,
                    'review_notes': review.review_notes,
                    'reviewed_at': review.reviewed_at.isoformat() if review.reviewed_at else None
                }
            }, status=status.HTTP_200_OK)
        else:  # reject
            rejection_reason = request.data.get('rejection_reason', '')
            if not rejection_reason:
                return Response(
                    {'error': 'Rejection reason is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            review.status = 'rejected'
            review.rejection_reason = rejection_reason
            review.review_notes = request.data.get('review_notes', '')
            review.reviewed_at = timezone.now()
            review.save()
            
            # Update job card - goes back to floor manager
            jobcard.supervisor = user
            jobcard.status = 'qc_rejected'
            jobcard.save()            
            return Response({
                'message': 'QC rejected. Job card sent back to floor manager for correction.',
                'review': {
                    'id': review.id,
                    'status': review.status,
                    'rejection_reason': review.rejection_reason,
                    'reviewed_at': review.reviewed_at.isoformat() if review.reviewed_at else None
                }
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def assign_applicator_team(self, request, pk=None):
        """Assign applicator team - permissions from workflow configuration."""
        jobcard = self.get_object()
        user = request.user
        
        # Dynamic permission check from workflow
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status='assigned_to_applicator'
        )
        if not can_perform:
            return error
        
        applicator_ids = request.data.get('applicator_ids', [])
        if not applicator_ids:
            return Response(
                {'error': 'applicator_ids list is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Optimize: select_related to avoid N+1 on branch
            applicators = User.objects.filter(
                id__in=applicator_ids, 
                role='applicator'
            ).select_related('branch')
            
            if applicators.count() != len(applicator_ids):
                return Response(
                    {'error': 'Some applicator IDs are invalid.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Assign applicator team
            jobcard.applicator_team.set(applicators)
            jobcard.status = 'assigned_to_applicator'
            jobcard.save()

            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='assignment',
                performed_by=user,
                description=f'Applicator team assigned: {len(applicator_ids)} members',
                metadata={'applicator_ids': applicator_ids, 'count': len(applicator_ids)}
            )
            
            # Return lightweight response to avoid full serialization
            return Response({
                'message': 'Applicator team assigned successfully.',
                'status': jobcard.status,
                'applicator_count': len(applicator_ids)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error assigning applicator team: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def assign_floor_manager_admin(self, request, pk=None):
        """Admin standalone action to assign/change floor manager without status change."""
        jobcard = self.get_object()
        user = request.user
        
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response({'error': 'Only admins can perform this action.'}, status=status.HTTP_403_FORBIDDEN)
        
        floor_manager_id = request.data.get('floor_manager_id')
        if not floor_manager_id:
            return Response({'error': 'floor_manager_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            floor_manager = User.objects.select_related('branch').get(
                id=floor_manager_id, 
                role='floor_manager'
            )
            if user.role == 'branch_admin' and floor_manager.branch_id != user.branch_id:
                return Response({'error': 'Floor manager must be from your branch.'}, status=status.HTTP_403_FORBIDDEN)
            
            jobcard.floor_manager = floor_manager
            jobcard.save()

            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='assignment',
                performed_by=user,
                description=f'Floor Manager updated by Admin: {floor_manager.name}',
                metadata={'floor_manager_id': floor_manager.id, 'floor_manager_name': floor_manager.name}
            )

            return Response({
                'message': 'Floor manager updated successfully.', 
                'floor_manager_id': floor_manager.id,
                'floor_manager_name': floor_manager.name
            })
        except User.DoesNotExist:
            return Response({'error': 'Floor manager not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def assign_applicators_admin(self, request, pk=None):
        """Admin standalone action to assign/change applicator team without status change."""
        jobcard = self.get_object()
        user = request.user
        
        if user.role not in ['branch_admin', 'company_admin', 'super_admin', 'floor_manager']:
            return Response({'error': 'Only admins and floor managers can perform this action.'}, status=status.HTTP_403_FORBIDDEN)
        
        applicator_ids = request.data.get('applicator_ids', [])
        if not applicator_ids:
            return Response({'error': 'applicator_ids is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            applicators = User.objects.filter(
                id__in=applicator_ids, 
                role='applicator'
            ).select_related('branch')
            
            if applicators.count() != len(applicator_ids):
                return Response({'error': 'Some applicator IDs are invalid.'}, status=status.HTTP_400_BAD_REQUEST)
            
            jobcard.applicator_team.set(applicators)
            jobcard.save()

            # Log activity
            from .models import JobCardActivity
            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='assignment',
                performed_by=user,
                description=f'Applicator team updated by Admin: {len(applicator_ids)} members',
                metadata={'applicator_ids': applicator_ids, 'count': len(applicator_ids)}
            )

            return Response({
                'message': 'Applicator team updated successfully.', 
                'applicator_count': len(applicator_ids)
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def floor_manager_approval(self, request, pk=None):
        """Floor Manager approves or rejects job after supervisor approval."""
        jobcard = self.get_object()
        user = request.user
        action = request.data.get('action')  # 'approve' or 'reject'
        
        # # Only floor manager assigned to this job can approve/reject
        # if user.role != 'floor_manager' or jobcard.floor_manager != user:
        #     return Response(
        #         {'error': 'Only the assigned floor manager can approve or reject this job.'},
        #         status=status.HTTP_403_FORBIDDEN
        #     )
        
        # Job must be in supervisor_approved status
        if jobcard.status != 'supervisor_approved':
            return Response(
                {'error': 'Job card must be supervisor approved for floor manager approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Action must be either "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action == 'reject':
            rejection_reason = request.data.get('rejection_reason', '')
            if not rejection_reason:
                return Response(
                    {'error': 'Rejection reason is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update supervisor review to indicate floor manager rejection
            try:
                supervisor_review = jobcard.supervisor_review
                supervisor_review.status = 'rejected'
                supervisor_review.rejection_reason = f'Floor Manager QC Reject: {rejection_reason}'
                supervisor_review.reviewed_at = timezone.now()
                supervisor_review.save()
            except SupervisorReview.DoesNotExist:
                # Create a supervisor review record if it doesn't exist
                supervisor = getattr(jobcard, 'supervisor', None)
                SupervisorReview.objects.create(
                    jobcard=jobcard,
                    supervisor=supervisor,
                    status='rejected',
                    rejection_reason=f'Floor Manager QC Reject: {rejection_reason}',
                    reviewed_at=timezone.now()
                )
            
            # Update job card status back to work_completed for re-work
            jobcard.status = 'work_completed'
            jobcard.save()
            
            return Response({
                'message': 'Job rejected and sent back for re-work.',
                'jobcard': self.get_serializer(jobcard).data
            }, status=status.HTTP_200_OK)
        else:  # approve
            # Update job card status to floor_manager_confirmed
            jobcard.status = 'floor_manager_confirmed'
            jobcard.save()
            
            return Response({
                'message': 'Job approved by floor manager.',
                'jobcard': self.get_serializer(jobcard).data
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def start_work(self, request, pk=None):
        """Start work - permissions from workflow configuration."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Dynamic permission check from workflow
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status='work_in_progress'
        )
        if not can_perform:
            return error
        
        # Optional: assign applicator team when starting work
        applicator_ids = request.data.get('applicator_ids', [])
        if applicator_ids:
            from django.contrib.auth import get_user_model
            UserModel = get_user_model()
            applicators = UserModel.objects.filter(
                id__in=applicator_ids, role='applicator'
            ).select_related('branch')
            if applicators.count() != len(applicator_ids):
                return Response(
                    {'error': 'Some applicator IDs are invalid.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            jobcard.applicator_team.set(applicators)
        
        jobcard.status = 'work_in_progress'
        if not jobcard.job_started_at:
            jobcard.job_started_at = timezone.now()
        jobcard.save()
        
        # Return lightweight response
        return Response({
            'message': 'Work started successfully.',
            'status': jobcard.status,
            'job_started_at': jobcard.job_started_at.isoformat() if jobcard.job_started_at else None
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def assign_applicator_task(self, request, pk=None):
        """Supervisor assigns individual task to an applicator."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Allow admins or supervisors to assign tasks
        if user.role not in ['supervisor', 'branch_admin', 'super_admin', 'floor_manager']:
            return Response(
                {'error': 'Only supervisors, floor managers, or admins can assign tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        applicator_id = request.data.get('applicator_id')
        task_description = request.data.get('task_description')
        
        if not applicator_id or not task_description:
            return Response(
                {'error': 'applicator_id and task_description are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            applicator = User.objects.get(id=applicator_id, role='applicator')
            
            # Check if applicator is in the job card team
            if applicator not in jobcard.applicator_team.all():
                return Response(
                    {'error': 'Applicator is not assigned to this job card team.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the task
            from .models import ApplicatorTask
            task = ApplicatorTask.objects.create(
                jobcard=jobcard,
                applicator=applicator,
                task_description=task_description
            )
            
            return Response({
                'message': 'Task assigned successfully.',
                'task_id': task.id
            }, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response(
                {'error': 'Applicator not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error assigning task: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def add_task_note(self, request, pk=None):
        """Supervisor adds note to an applicator task."""
        jobcard = self.get_object()
        user = request.user
        
        # Only supervisors can add notes
        if user.role != 'supervisor':
            return Response(
                {'error': 'Only supervisors can add task notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task_id = request.data.get('task_id')
        note = request.data.get('note')
        
        if not task_id or not note:
            return Response(
                {'error': 'task_id and note are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import ApplicatorTask
            task = ApplicatorTask.objects.get(id=task_id, jobcard=jobcard)
            
            # Update the supervisor notes
            task.supervisor_notes = note
            task.save()
            
            return Response({
                'message': 'Note added successfully.',
                'task_id': task.id
            }, status=status.HTTP_200_OK)
        except ApplicatorTask.DoesNotExist:
            return Response(
                {'error': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error adding note: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def start_applicator_task(self, request, pk=None):
        """Applicator starts their individual task."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Only applicators can start their tasks
        if user.role != 'applicator':
            return Response(
                {'error': 'Only applicators can start tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if job card is in the right status
        if jobcard.status not in ['assigned_to_applicator', 'work_in_progress']:
            return Response(
                {'error': 'Job card must be assigned to applicator team or in work_in_progress status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task_id = request.data.get('task_id')
        if not task_id:
            return Response(
                {'error': 'task_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import ApplicatorTask
            task = ApplicatorTask.objects.get(id=task_id, jobcard=jobcard, applicator=user)
            
            # Check if task is already started
            if task.started_at:
                return Response(
                    {'error': 'Task already started.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Start the task
            task.started_at = timezone.now()
            task.save()
            
            # If this is the first task being started, update job card status
            if jobcard.status == 'assigned_to_applicator':
                jobcard.status = 'work_in_progress'
                jobcard.save()
            
            return Response({
                'message': 'Task started successfully.',
                'task_id': task.id,
                'status': task.status
            }, status=status.HTTP_200_OK)
        except ApplicatorTask.DoesNotExist:
            return Response(
                {'error': 'Task not found or not assigned to you.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error starting task: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def complete_applicator_task(self, request, pk=None):
        """Applicator completes their individual task."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Only applicators can complete their tasks
        if user.role != 'applicator':
            return Response(
                {'error': 'Only applicators can complete tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if job card is in the right status
        if jobcard.status not in ['assigned_to_applicator', 'work_in_progress']:
            return Response(
                {'error': 'Job card must be assigned to applicator team or in work_in_progress status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task_id = request.data.get('task_id')
        if not task_id:
            return Response(
                {'error': 'task_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import ApplicatorTask
            task = ApplicatorTask.objects.get(id=task_id, jobcard=jobcard, applicator=user)
            
            # Check if task is started
            if not task.started_at:
                return Response(
                    {'error': 'Task must be started before completing.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if task is already completed
            if task.completed_at:
                return Response(
                    {'error': 'Task already completed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Complete the task
            task.completed_at = timezone.now()
            task.save()
            
            # Check if all tasks are completed
            all_tasks = ApplicatorTask.objects.filter(jobcard=jobcard)
            if all_tasks.exists() and all(t.completed_at for t in all_tasks):
                # All tasks completed, update job card status
                jobcard.status = 'work_completed'
                jobcard.save()
            
            return Response({
                'message': 'Task completed successfully.',
                'task_id': task.id,
                'status': task.status
            }, status=status.HTTP_200_OK)
        except ApplicatorTask.DoesNotExist:
            return Response(
                {'error': 'Task not found or not assigned to you.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error completing task: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def complete_work(self, request, pk=None):
        """Complete work - permissions from workflow configuration."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Dynamic permission check from workflow
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status='work_completed'
        )
        if not can_perform:
            return error
        
        # Require at least one after photo before completing work
        after_photos = request.data.get('after_photos', [])
        if not after_photos:
            # Check if job card already has after photos
            existing_after_photos = jobcard.photos.filter(photo_type='after').count()
            if existing_after_photos == 0:
                return Response(
                    {'error': 'Please upload at least one after photo before completing work.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update notes
        jobcard.technician_notes = request.data.get('notes', jobcard.technician_notes)
        jobcard.status = 'work_completed'
        jobcard.save()
        
        return Response({
            'message': 'Work completed. Waiting for supervisor final QC.',
            'jobcard': self.get_serializer(jobcard).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def update_work_checklist(self, request, pk=None):
        """Supervisor updates work execution checklist items (Phase 6)."""
        jobcard = self.get_object()
        user = request.user
        
        # Allow admins, floor managers, or supervisors to update work checklist
        if user.role not in ['supervisor', 'branch_admin', 'super_admin', 'floor_manager']:
            return Response(
                {'error': 'Only supervisors, floor managers, or admins can update work checklist.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if jobcard.status not in ['assigned_to_applicator', 'work_in_progress']:
            return Response(
                {'error': 'Job card must be assigned to applicator team or in work_in_progress status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get checklist items from request data
        checklist_items = request.data.get('checklist_items', [])
        
        # Store checklist items in jobcard notes as JSON for now
        # In a production system, you might want to create a separate model for this
        import json
        jobcard.technician_notes = json.dumps(checklist_items) if checklist_items else jobcard.technician_notes
        jobcard.save()
        
        return Response({
            'message': 'Work checklist updated successfully.',
            'checklist_items': checklist_items
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def add_work_part(self, request, pk=None):
        """Supervisor adds part used during work execution (Phase 6)."""
        jobcard = self.get_object()
        user = request.user
        
        # Check if user has permission to add parts using workflow engine
        user_permissions = WorkflowEngine.get_user_permissions(user, jobcard)
        if not user_permissions.get('can_add_parts', False):
            return Response(
                {'error': 'Only authorized staff can add parts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if jobcard.status not in ['assigned_to_applicator', 'work_in_progress']:
            return Response(
                {'error': 'Job card must be assigned to applicator team or in work_in_progress status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        part_name = request.data.get('part_name')
        quantity = request.data.get('quantity', 1)
        price = request.data.get('price')
        
        if not part_name or not price:
            return Response(
                {'error': 'part_name and price are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quantity = int(quantity)
            price = float(price)
        except (ValueError, TypeError):
            return Response(
                {'error': 'quantity must be an integer and price must be a number.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create part used
        part = PartUsed.objects.create(
            jobcard=jobcard,
            company=jobcard.company,
            part_name=part_name,
            quantity=quantity,
            price=price
        )
        
        return Response(PartUsedSerializer(part).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'])
    def remove_work_part(self, request, pk=None, part_id=None):
        """Supervisor removes part used during work execution (Phase 6)."""
        jobcard = self.get_object()
        user = request.user
        
        # Check if user has permission to add parts using workflow engine
        user_permissions = WorkflowEngine.get_user_permissions(user, jobcard)
        if not user_permissions.get('can_add_parts', False):
            return Response(
                {'error': 'Only authorized staff can remove parts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if jobcard.status not in ['assigned_to_applicator', 'work_in_progress']:
            return Response(
                {'error': 'Job card must be assigned to applicator team or in work_in_progress status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            part = PartUsed.objects.get(id=part_id, jobcard=jobcard)
            part.delete()
            return Response({'message': 'Part removed successfully.'}, status=status.HTTP_200_OK)
        except PartUsed.DoesNotExist:
            return Response({'error': 'Part not found.'}, status=status.HTTP_404_NOT_FOUND)    
    
    @action(detail=True, methods=['patch', 'delete'], url_path='parts/(?P<part_id>[^/.]+)')
    def part_operations(self, request, pk=None, part_id=None):
        """Handle operations on a specific part in job card (update/delete)."""
        try:
            jobcard = self.get_object()
            user = request.user
            
            # Check if user has permission to add parts using workflow engine
            user_permissions = WorkflowEngine.get_user_permissions(user, jobcard)
            if not user_permissions.get('can_add_parts', False):
                # For other roles, check if they are assigned technician or applicator team member
                if user.role not in ['branch_admin', 'company_admin', 'super_admin', 'floor_manager', 'supervisor', 'applicator']:
                    if user != jobcard.technician and user not in jobcard.applicator_team.all():
                        if request.method == 'PATCH':
                            return Response(
                                {'error': 'Only assigned technicians, applicator team members, or authorized staff can update parts.'},
                                status=status.HTTP_403_FORBIDDEN
                            )
                        elif request.method == 'DELETE':
                            return Response(
                                {'error': 'Only assigned technicians, applicator team members, or authorized staff can delete parts.'},
                                status=status.HTTP_403_FORBIDDEN
                            )
            
            # Validate part_id
            if not part_id:
                return Response({'error': 'Part ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                part_id_int = int(part_id)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid part ID format.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                part = PartUsed.objects.get(id=part_id_int, jobcard=jobcard)
                
                if request.method == 'PATCH':
                    # Update allowed fields
                    if 'quantity' in request.data:
                        part.quantity = request.data.get('quantity')
                    if 'price' in request.data:
                        part.price = request.data.get('price')
                    if 'part_name' in request.data:
                        part.part_name = request.data.get('part_name')
                    
                    part.save()
                    return Response(PartUsedSerializer(part).data, status=status.HTTP_200_OK)
                elif request.method == 'DELETE':
                    part.delete()
                    return Response({'message': 'Part deleted successfully.'}, status=status.HTTP_200_OK)
                    
            except PartUsed.DoesNotExist:
                error_msg = f'Part with ID {part_id_int} not found for this job card.'
                if request.method == 'PATCH':
                    error_msg = f'Part with ID {part_id_int} not found for this job card.'
                elif request.method == 'DELETE':
                    error_msg = f'Part with ID {part_id_int} not found for this job card.'
                return Response({'error': error_msg}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            # Log the actual error for debugging
            import logging
            logging.error(f"Error in part operations: {str(e)}")
            if request.method == 'PATCH':
                error_msg = f'Error updating part: {str(e)}'
            elif request.method == 'DELETE':
                error_msg = f'Error deleting part: {str(e)}'
            return Response({'error': error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def final_qc(self, request, pk=None):
        """Final QC - permissions from workflow configuration.
        
        This endpoint handles two scenarios:
        1. Submit for Final QC: work_completed → final_qc_pending
        2. Perform Final QC: final_qc_pending → final_qc_passed/failed
        """
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        action_type = request.data.get('action', 'pass')
        
        # Scenario 1: Submit for Final QC (work_completed → final_qc_pending)
        if jobcard.status == 'work_completed':
            # Check permission to transition to final_qc_pending
            can_perform, error = check_workflow_permission(
                jobcard, user, target_status='final_qc_pending'
            )
            if not can_perform:
                return error
            
            # Create or update final QC report with pending status
            final_qc, created = FinalQCReport.objects.get_or_create(
                jobcard=jobcard,
                defaults={'supervisor': user, 'status': 'pending'}
            )
            
            if not created:
                final_qc.supervisor = user
                final_qc.status = 'pending'
                final_qc.save()
            
            # Update job card status to final_qc_pending
            jobcard.status = 'final_qc_pending'
            jobcard.save()
            
            return Response({
                'message': 'Job submitted for Final QC successfully.',
                'final_qc': {
                    'id': final_qc.id,
                    'status': final_qc.status,
                }
            }, status=status.HTTP_200_OK)
        
        # Scenario 2: Perform Final QC (final_qc_pending → final_qc_passed/failed)
        elif jobcard.status == 'final_qc_pending':
            # Determine target status based on action
            target_status = 'final_qc_passed' if action_type == 'pass' else 'final_qc_failed'
            
            # Dynamic permission check from workflow
            can_perform, error = check_workflow_permission(
                jobcard, user, target_status=target_status
            )
            if not can_perform:
                return error
            
            action = request.data.get('action')  # 'pass' or 'fail'
            if action not in ['pass', 'fail']:
                return Response(
                    {'error': 'Action must be either "pass" or "fail".'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create final QC report
            final_qc, created = FinalQCReport.objects.get_or_create(
                jobcard=jobcard,
                defaults={'supervisor': user}
            )
            
            if not created:
                final_qc.supervisor = user
            
            if action == 'pass':
                final_qc.status = 'passed'
                final_qc.after_photos = request.data.get('after_photos', [])
                final_qc.checklist_verified = request.data.get('checklist_verified', False)
                final_qc.parts_verified = request.data.get('parts_verified', False)
                final_qc.quality_notes = request.data.get('quality_notes', '')
                final_qc.completed_at = timezone.now()
                final_qc.save()
                
                # Update job card
                jobcard.status = 'final_qc_passed'
                jobcard.save()
                
                return Response({
                    'message': 'Final QC passed. Ready for customer approval.',
                    'final_qc': {
                        'id': final_qc.id,
                        'status': final_qc.status,
                        'completed_at': final_qc.completed_at.isoformat() if final_qc.completed_at else None
                    }
                }, status=status.HTTP_200_OK)
            else:  # fail
                failure_reason = request.data.get('failure_reason', '')
                if not failure_reason:
                    return Response(
                        {'error': 'Failure reason is required.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                final_qc.status = 'failed'
                final_qc.failure_reason = failure_reason
                final_qc.issues_found = request.data.get('issues_found', '')
                final_qc.completed_at = timezone.now()
                final_qc.save()
                
                # Update job card - goes back to applicators
                jobcard.status = 'final_qc_failed'
                jobcard.save()
                
                return Response({
                    'message': 'Final QC failed. Job card sent back to applicator team.',
                    'final_qc': {
                        'id': final_qc.id,
                        'status': final_qc.status,
                        'failure_reason': final_qc.failure_reason,
                        'completed_at': final_qc.completed_at.isoformat() if final_qc.completed_at else None
                    }
                }, status=status.HTTP_200_OK)
        else:
            # Invalid status for final QC
            return Response(
                {'error': f'Cannot perform final QC from status "{jobcard.status}". Job must be in "work_completed" or "final_qc_pending" status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # ---------------------------
    # Applicator Dashboard
    # ---------------------------

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='applicator/jobs',
    )
    def applicator_jobs(self, request):
        """
        List jobs for Applicator dashboard.
        
        Query param `bucket` controls which list to return:
        - assigned: Jobs assigned to this applicator team
        - in_progress: Jobs currently in progress by this applicator team
        - completed: Jobs completed by this applicator team
        - all_my: All jobs assigned to this applicator team
        """
        user = request.user
        
        # Only applicators can access this endpoint
        if user.role != 'applicator':
            return Response(
                {'error': 'Only applicators can access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get job cards where this user is in the applicator team
        queryset = JobCard.objects.filter(applicator_team=user)
        
        bucket = request.query_params.get('bucket', 'assigned')

        if bucket == 'assigned':
            # Jobs assigned to this applicator team
            queryset = queryset.filter(status='assigned_to_applicator')
        elif bucket == 'in_progress':
            # Jobs currently in progress by this applicator team
            queryset = queryset.filter(status='work_in_progress')
        elif bucket == 'completed':
            # Jobs completed by this applicator team
            queryset = queryset.filter(status='work_completed')
        elif bucket == 'all_my':
            # All jobs assigned to this applicator team
            queryset = queryset.filter(status__in=['assigned_to_applicator', 'work_in_progress', 'work_completed'])
        else:
            return Response(
                {'error': 'Invalid bucket. Use assigned, in_progress, completed, or all_my.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(queryset.order_by('-created_at'), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def customer_approval(self, request, pk=None):
        """Customer approves or requests revision (Phase 8)."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Allow customer or admins to approve
        is_admin = user.role in ['super_admin', 'company_admin', 'branch_admin']
        is_customer = user.role == 'customer' and jobcard.booking.customer.user == user
        
        if not is_admin and not is_customer:
            return Response(
                {'error': 'Only the customer or admins can approve this job.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if jobcard.status != 'final_qc_passed':
            return Response(
                {'error': 'Job card must pass final QC before customer approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        action = request.data.get('action')  # 'approve' or 'request_revision'
        if action not in ['approve', 'request_revision']:
            return Response(
                {'error': 'Action must be either "approve" or "request_revision".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update customer approval
        approval, created = CustomerApproval.objects.get_or_create(
            jobcard=jobcard,
            defaults={'customer': jobcard.booking.customer}
        )
        
        if action == 'approve':
            approval.status = 'approved'
            approval.approval_notes = request.data.get('approval_notes', '')
            approval.photos_viewed = request.data.get('photos_viewed', False)
            approval.tasks_reviewed = request.data.get('tasks_reviewed', False)
            approval.qc_report_viewed = request.data.get('qc_report_viewed', False)
            approval.approved_at = timezone.now()
            approval.save()
            
            # Update job card
            jobcard.status = 'customer_approved'
            jobcard.save()
            
            return Response({
                'message': 'Customer approved. Ready for billing.',
                'approval': {
                    'id': approval.id,
                    'status': approval.status,
                    'approved_at': approval.approved_at.isoformat() if approval.approved_at else None
                }
            }, status=status.HTTP_200_OK)
        else:  # request_revision
            revision_notes = request.data.get('revision_notes', '')
            if not revision_notes:
                return Response(
                    {'error': 'Revision notes are required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            approval.status = 'revision_requested'
            approval.revision_notes = revision_notes
            approval.save()
            
            # Update job card - goes back to supervisor/applicators
            jobcard.status = 'customer_revision_requested'
            jobcard.save()
            
            return Response({
                'message': 'Revision requested. Job card sent back for correction.',
                'approval': {
                    'id': approval.id,
                    'status': approval.status,
                    'revision_notes': approval.revision_notes
                }
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def mark_ready_for_billing(self, request, pk=None):
        """Mark ready for billing - permissions from workflow configuration."""
        jobcard = self.get_object()
        user = request.user
        
        # Dynamic permission check from workflow
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status='ready_for_billing'
        )
        if not can_perform:
            return error
        
        jobcard.status = 'ready_for_billing'
        jobcard.save()
        
        # Return lightweight response
        return Response({
            'message': 'Job card marked as ready for billing.',
            'status': jobcard.status
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def deliver_vehicle(self, request, pk=None):
        """Deliver vehicle - permissions from workflow configuration."""
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Dynamic permission check from workflow
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status='delivered'
        )
        if not can_perform:
            return error
        
        # Create or update delivery record
        delivery, created = VehicleDelivery.objects.get_or_create(jobcard=jobcard)
        delivery.delivered_by = user
        delivery.delivery_notes = request.data.get('delivery_notes', '')
        delivery.customer_satisfaction_confirmed = request.data.get('customer_satisfaction_confirmed', False)
        delivery.keys_delivered = request.data.get('keys_delivered', False)
        delivery.final_walkthrough_completed = request.data.get('final_walkthrough_completed', False)
        delivery.delivered_at = timezone.now()
        delivery.save()
        
        # Update job card
        jobcard.status = 'delivered'
        jobcard.save()
        
        # Update booking status
        jobcard.booking.status = 'completed'
        jobcard.booking.save()
        
        return Response({
            'message': 'Vehicle delivered successfully. Job closed.',
            'delivery': {
                'id': delivery.id,
                'delivered_at': delivery.delivered_at.isoformat() if delivery.delivered_at else None
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def close_job(self, request, pk=None):
        """Close job card (final step)."""
        jobcard = self.get_object()
        user = request.user
        print('user', user)
        print('user.role', user.role)
        # Only admin can close jobs
        if user.role not in ['branch_admin', 'company_admin', 'super_admin']:
            return Response(
                {'error': 'Only admins can close jobs.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if jobcard.status != 'delivered':
            return Response(
                {'error': 'Job card must be delivered before closing.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        jobcard.status = 'closed'
        jobcard.save()
        
        return Response({
            'message': 'Job closed successfully.',
            'jobcard': self.get_serializer(jobcard).data
        }, status=status.HTTP_200_OK)

    # ---------------------------
    # Floor Manager Dashboard
    # ---------------------------

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated, IsFloorManager],
        url_path='floor-manager/summary',
    )
    def floor_manager_summary(self, request):
        """
        Summary cards for Floor Manager dashboard.

        Returns counts for:
        - pending_qc: Jobs assigned to this floor manager that are waiting for QC
        - completed_today: QC reports completed by this floor manager today
        - awaiting_supervisor_review: Jobs where QC is completed and waiting for supervisor
        """
        user = request.user

        # Safety check – permission class should already enforce this
        if user.role not in ['floor_manager', 'branch_admin', 'super_admin']:
            return Response(
                {'error': 'Only floor managers or admins can access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()

        base_qs = JobCard.objects.all()
        if user.branch:
            base_qs = base_qs.filter(branch=user.branch)

        # Jobs assigned to this floor manager waiting for QC (or sent back)
        pending_qc = base_qs.filter(
            floor_manager=user,
            status__in=['qc_pending', 'qc_rejected'],
        ).count()

        # QC completed today by this floor manager
        completed_today = QCReport.objects.filter(
            floor_manager=user,
            is_completed=True,
            completed_at__date=today,
        ).count()

        # Jobs where QC is completed and waiting for supervisor review
        awaiting_supervisor_review = base_qs.filter(
            floor_manager=user,
            status='qc_completed',
        ).count()

        return Response(
            {
                'pending_qc': pending_qc,
                'completed_today': completed_today,
                'awaiting_supervisor_review': awaiting_supervisor_review,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated, IsFloorManager],
        url_path='floor-manager/jobs',
    )
    def floor_manager_jobs(self, request):
        """
        List jobs for Floor Manager dashboard.

        Query param `bucket` controls which list to return:
        - waiting_qc: Jobs assigned to this floor manager and waiting for QC (or sent back)
        - for_supervisor: Jobs where QC is completed and waiting for supervisor review
        - completed_today: Jobs where this floor manager completed QC today
        - all_my: All jobs assigned to this floor manager (any QC status)
        """
        user = request.user
        bucket = request.query_params.get('bucket', 'waiting_qc')

        if user.role not in ['floor_manager', 'branch_admin', 'super_admin']:
            return Response(
                {'error': 'Only floor managers or admins can access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = JobCard.objects.all()
        if user.branch:
            queryset = queryset.filter(branch=user.branch)

        today = timezone.localdate()

        if bucket == 'waiting_qc':
            queryset = queryset.filter(
                floor_manager=user,
                status__in=['qc_pending', 'qc_rejected'],
            )
        elif bucket == 'for_supervisor':
            queryset = queryset.filter(
                floor_manager=user,
                status='qc_completed',
            )
        elif bucket == 'completed_today':
            # Join through QCReport as the source of truth for when QC was done
            queryset = queryset.filter(
                qc_report__floor_manager=user,
                qc_report__is_completed=True,
                qc_report__completed_at__date=today,
            )
        elif bucket == 'all_my':
            queryset = queryset.filter(floor_manager=user)
        else:
            return Response(
                {'error': 'Invalid bucket. Use waiting_qc, for_supervisor, completed_today, or all_my.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(queryset.order_by('-created_at'), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def floor_manager_final_qc_approval(self, request, pk=None):
        """Floor Manager approves or rejects job after final QC passed."""
        jobcard = self.get_object()
        user = request.user
        action = request.data.get('action')  # 'approve' or 'reject'
        
        # Dynamic permission check from workflow
        target_status = 'floor_manager_final_qc_confirmed' if action == 'approve' else 'work_completed'
        can_perform, error = check_workflow_permission(
            jobcard, user, target_status=target_status
        )
        if not can_perform:
            return error
        
        # Job must be in final_qc_passed status
        if jobcard.status != 'final_qc_passed':
            return Response(
                {'error': 'Job card must be in final QC passed status for floor manager approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Action must be either "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action == 'reject':
            rejection_reason = request.data.get('rejection_reason', '')
            if not rejection_reason:
                return Response(
                    {'error': 'Rejection reason is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update supervisor review to indicate floor manager rejection
            try:
                supervisor_review = jobcard.supervisor_review
                supervisor_review.status = 'rejected'
                supervisor_review.rejection_reason = f'Floor Manager QC Reject: {rejection_reason}'
                supervisor_review.reviewed_at = timezone.now()
                supervisor_review.save()
            except SupervisorReview.DoesNotExist:
                # Create a supervisor review record if it doesn't exist
                supervisor = getattr(jobcard, 'supervisor', None)
                SupervisorReview.objects.create(
                    jobcard=jobcard,
                    supervisor=supervisor,
                    status='rejected',
                    rejection_reason=f'Floor Manager QC Reject: {rejection_reason}',
                    reviewed_at=timezone.now()
                )
            
            # Update job card status back to work_completed for re-work
            jobcard.status = 'work_completed'
            jobcard.save()
            
            return Response({
                'message': 'Job rejected and sent back for re-work.',
                'jobcard': self.get_serializer(jobcard).data
            }, status=status.HTTP_200_OK)
        else:  # approve
            # Update job card status to floor_manager_final_qc_confirmed
            jobcard.status = 'floor_manager_final_qc_confirmed'
            jobcard.save()
            
            # Return lightweight response
            return Response({
                'message': 'Job approved by floor manager.',
                'status': jobcard.status
            }, status=status.HTTP_200_OK)

    # ---------------------------
    # Supervisor Dashboard
    # ---------------------------

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAuthenticated],
        url_path='supervisor/jobs',
    )
    def supervisor_jobs(self, request):
        """
        List jobs for Supervisor dashboard.
        
        Query param `bucket` controls which list to return:
        - pending_review: Jobs with QC completed and waiting for supervisor review
        - approved: Jobs approved by this supervisor
        - rejected: Jobs rejected by this supervisor
        - all_my: All jobs reviewed by this supervisor
        - assigned: Jobs assigned to this supervisor or to applicator teams they're part of
        """
        user = request.user
        
        # Only supervisors can access this endpoint
        if user.role != 'supervisor':
            return Response(
                {'error': 'Only supervisors can access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = JobCard.objects.all()
        
        # Filter by branch if user has one
        if user.branch:
            queryset = queryset.filter(branch=user.branch)

        bucket = request.query_params.get('bucket', 'pending_review')

        if bucket == 'pending_review':
            # Jobs with QC completed and waiting for supervisor review
            # Only show jobs assigned to this supervisor or unassigned jobs
            queryset = queryset.filter(status='qc_completed').filter(
                Q(supervisor=user) | Q(supervisor__isnull=True)
            )
        elif bucket == 'approved':
            # Jobs approved by this supervisor
            queryset = queryset.filter(
                supervisor=user,
                status__in=['supervisor_approved', 'assigned_to_applicator', 'work_in_progress', 
                           'work_completed', 'final_qc_pending', 'final_qc_passed', 
                           'final_qc_failed', 'customer_approval_pending', 'customer_approved', 
                           'customer_revision_requested', 'ready_for_billing', 'billed', 
                           'delivered', 'closed']
            )
        elif bucket == 'rejected':
            # Jobs rejected by this supervisor
            queryset = queryset.filter(
                supervisor=user,
                status='qc_rejected'
            )
        elif bucket == 'assigned':
            # Jobs assigned to this supervisor or to applicator teams they're part of
            queryset = queryset.filter(
                Q(supervisor=user) | Q(applicator_team=user)
            ).exclude(status__in=['closed', 'delivered'])
        elif bucket == 'all_my':
            # All jobs reviewed by this supervisor or assigned to applicator teams they're part of
            queryset = queryset.filter(
                Q(supervisor=user) | Q(applicator_team=user)
            )
        else:
            return Response(
                {'error': 'Invalid bucket. Use pending_review, approved, rejected, assigned, or all_my.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(queryset.order_by('-created_at'), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ==================== Collaborative Features Endpoints ====================
    
    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Add a note to a job card."""
        from .models import JobCardNote, JobCardActivity
        from .serializers import JobCardNoteSerializer
        
        jobcard = self.get_object()
        user = request.user
        
        # Only staff members (not customers) can add notes for now
        if user.role not in ['branch_admin', 'company_admin', 'super_admin', 'floor_manager', 'supervisor', 'applicator']:
            return Response(
                {'error': 'You do not have permission to add notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        note_type = request.data.get('note_type', 'internal')
        content = request.data.get('content', '').strip()
        is_pinned = request.data.get('is_pinned', False)
        visible_to_customer = request.data.get('visible_to_customer', False)
        
        if not content:
            return Response(
                {'error': 'Note content is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create note
        note = JobCardNote.objects.create(
            jobcard=jobcard,
            created_by=user,
            note_type=note_type,
            content=content,
            is_pinned=is_pinned,
            visible_to_customer=visible_to_customer
        )
        
        # Log activity
        JobCardActivity.objects.create(
            jobcard=jobcard,
            activity_type='note_added',
            performed_by=user,
            description=f'{user.name} added a {note.get_note_type_display().lower()}',
            metadata={
                'note_id': note.id,
                'note_type': note_type,
                'is_pinned': is_pinned
            }
        )
        
        return Response(
            JobCardNoteSerializer(note).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def notes(self, request, pk=None):
        """Get all notes for a job card."""
        from .serializers import JobCardNoteSerializer
        
        jobcard = self.get_object()
        user = request.user
        
        # Get all notes for the job card
        notes = jobcard.notes.all()
        
        # Filter based on role: customers only see customer-visible notes
        if user.role == 'customer':
            notes = notes.filter(visible_to_customer=True)
        
        serializer = JobCardNoteSerializer(notes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def add_dynamic_task(self, request, pk=None):
        """Add a dynamic task (extra work) to a job card."""
        from .models import DynamicTask, JobCardActivity
        from .serializers import DynamicTaskSerializer
        
        jobcard = self.get_object()
        user = request.user
        
        # Only staff members can add dynamic tasks
        if user.role not in ['branch_admin', 'company_admin', 'super_admin', 'floor_manager', 'supervisor', 'applicator']:
            return Response(
                {'error': 'You do not have permission to add tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()
        estimated_price = request.data.get('estimated_price', 0)
        requires_approval = request.data.get('requires_approval', True)
        assigned_to_id = request.data.get('assigned_to')
        
        if not title:
            return Response(
                {'error': 'Task title is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create dynamic task
        task_data = {
            'jobcard': jobcard,
            'created_by': user,
            'title': title,
            'description': description,
            'estimated_price': estimated_price,
            'requires_approval': requires_approval
        }
        
        # Assign to applicator if specified, otherwise auto-assign to supervisor
        if assigned_to_id:
            try:
                assigned_user = User.objects.get(id=assigned_to_id, role='applicator')
                task_data['assigned_to'] = assigned_user
            except User.DoesNotExist:
                return Response(
                    {'error': 'Assigned user not found or is not an applicator.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif jobcard.supervisor:
            task_data['assigned_to'] = jobcard.supervisor
        
        task = DynamicTask.objects.create(**task_data)
        
        # Log activity
        JobCardActivity.objects.create(
            jobcard=jobcard,
            activity_type='task_added',
            performed_by=user,
            description=f'{user.name} added extra task: {title}',
            metadata={
                'task_id': task.id,
                'estimated_price': float(estimated_price),
                'requires_approval': requires_approval
            }
        )

        # Update existing invoice if present and task does not require approval
        if not requires_approval and float(estimated_price) > 0:
            try:
                from billing.models import Invoice, InvoiceItem
                invoice = Invoice.objects.filter(jobcard=jobcard).exclude(status='paid').first()
                if invoice:
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        item_type='service',
                        description=f"Extra Task: {task.title}",
                        quantity=1,
                        unit_price=task.estimated_price
                    )
                    invoice.calculate_totals()
            except Exception as e:
                print(f"Error updating invoice for new task: {e}")
        
        return Response(
            DynamicTaskSerializer(task).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['patch'], url_path='dynamic_tasks/(?P<task_id>[^/.]+)')
    def update_dynamic_task(self, request, pk=None, task_id=None):
        """Update a dynamic task status."""
        from .models import DynamicTask, JobCardActivity
        from .serializers import DynamicTaskSerializer
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        try:
            task = DynamicTask.objects.get(id=task_id, jobcard=jobcard)
        except DynamicTask.DoesNotExist:
            return Response(
                {'error': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update allowed fields
        new_status = request.data.get('status')
        if new_status and new_status in dict(DynamicTask.TASK_STATUS):
            old_status = task.status
            task.status = new_status
            
            # Set completed_at if status is completed
            if new_status == 'completed' and old_status != 'completed':
                task.completed_at = timezone.now()
            
            task.save()
            
            # Log activity
            metadata = {
                'task_id': task.id,
                'old_status': old_status,
                'new_status': new_status
            }
            
            # Add rejection reason to metadata if present (for cancelled status)
            rejection_reason = request.data.get('rejection_reason')
            if rejection_reason and new_status == 'cancelled':
                metadata['rejection_reason'] = rejection_reason

            JobCardActivity.objects.create(
                jobcard=jobcard,
                activity_type='task_updated',
                performed_by=user,
                description=f'{user.name} updated task "{task.title}" status to {task.get_status_display()}',
                metadata=metadata
            )

            # Update invoice if task becomes active/approved and wasn't before
            approving_statuses = ['approved', 'in_progress', 'completed']
            if new_status in approving_statuses and old_status not in approving_statuses:
                if task.estimated_price > 0:
                    try:
                        from billing.models import Invoice, InvoiceItem
                        invoice = Invoice.objects.filter(jobcard=jobcard).exclude(status='paid').first()
                        if invoice:
                            # Check if item already exists to avoid duplication (simple check by description)
                            # This is not perfect but prevents obvious duplicates
                            description = f"Extra Task: {task.title}"
                            if not InvoiceItem.objects.filter(invoice=invoice, description=description).exists():
                                InvoiceItem.objects.create(
                                    invoice=invoice,
                                    item_type='service',
                                    description=description,
                                    quantity=1,
                                    unit_price=task.estimated_price
                                )
                                invoice.calculate_totals()
                    except Exception as e:
                        print(f"Error updating invoice for task status change: {e}")
        
        # Update assigned_to if provided
        assigned_to_id = request.data.get('assigned_to')
        if assigned_to_id:
            try:
                assigned_user = User.objects.get(id=assigned_to_id, role='applicator')
                task.assigned_to = assigned_user
                task.save()
            except User.DoesNotExist:
                pass
        
        return Response(
            DynamicTaskSerializer(task).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], url_path='approve_dynamic_task/(?P<task_id>[^/.]+)')
    def approve_dynamic_task(self, request, pk=None, task_id=None):
        """Customer approves a dynamic task."""
        from .models import DynamicTask, JobCardActivity
        from .serializers import DynamicTaskSerializer
        from django.utils import timezone
        
        jobcard = self.get_object()
        user = request.user
        
        # Only customers can approve tasks
        if user.role != 'customer':
            return Response(
                {'error': 'Only customers can approve tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            task = DynamicTask.objects.get(id=task_id, jobcard=jobcard)
        except DynamicTask.DoesNotExist:
            return Response(
                {'error': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not task.requires_approval:
            return Response(
                {'error': 'This task does not require approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if task.approved_by_customer:
            return Response(
                {'error': 'This task has already been approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Approve the task
        task.approved_by_customer = True
        task.approval_date = timezone.now()
        task.status = 'approved'
        task.save()
        
        # Log activity
        JobCardActivity.objects.create(
            jobcard=jobcard,
            activity_type='approval',
            performed_by=user,
            description=f'Customer approved extra task: {task.title}',
            metadata={
                'task_id': task.id,
                'estimated_price': float(task.estimated_price)
            }
        )
        
        # Update existing invoice if present
        try:
            from billing.models import Invoice, InvoiceItem
            invoice = Invoice.objects.filter(jobcard=jobcard).first()
            if invoice and invoice.status != 'paid':
                InvoiceItem.objects.create(
                    invoice=invoice,
                    item_type='service',
                    description=f"Extra Task: {task.title}",
                    quantity=1,
                    unit_price=task.estimated_price
                )
                invoice.calculate_totals()
        except Exception as e:
            # Don't fail the approval if invoice update fails, just log it
            print(f"Error updating invoice for task approval: {e}")
        
        return Response(
            DynamicTaskSerializer(task).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        """Get all activities for a job card."""
        from .serializers import JobCardActivitySerializer
        
        jobcard = self.get_object()
        
        # Get all activities, optionally limit count
        limit = request.query_params.get('limit', 50)
        try:
            limit = int(limit)
        except ValueError:
            limit = 50
        
        activities = jobcard.activities.all()[:limit]
        serializer = JobCardActivitySerializer(activities, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ==================== Workflow Engine Endpoints ====================

    @action(detail=True, methods=['get'], url_path='workflow')
    def get_workflow_info(self, request, pk=None):
        """
        Get workflow information for a job card including:
        - Current status
        - Workflow template being used
        - Allowed transitions for current user
        - User permissions
        """
        from .workflow_config import WorkflowEngine
        
        jobcard = self.get_object()
        user = request.user
        
        # Get template
        template = WorkflowEngine.get_template_for_jobcard(jobcard)
        
        # Get allowed transitions
        allowed_transitions = WorkflowEngine.get_allowed_transitions(jobcard, user)
        
        # Get user permissions
        user_permissions = WorkflowEngine.get_user_permissions(user, jobcard)
        
        # Get status display name
        status_display = dict(JobCard.STATUS_CHOICES).get(jobcard.status, jobcard.status)
        
        # Get workflow settings from template
        workflow_settings = {}
        if template:
            workflow_settings = {
                'skip_customer_approval': template.skip_customer_approval,
                'skip_floor_manager_final_qc': template.skip_floor_manager_final_qc,
                'require_supervisor_review': template.require_supervisor_review,
                'auto_assign_applicators': template.auto_assign_applicators,
            }
        
        return Response({
            'current_status': jobcard.status,
            'current_status_display': status_display,
            'template_name': template.name if template else None,
            'template_id': template.id if template else None,
            'allowed_transitions': [
                {
                    'from_status': t.from_status,
                    'to_status': t.to_status,
                    'action_name': t.action_name,
                    'action_description': t.action_description,
                    'requires_notes': t.requires_notes,
                    'requires_photos': t.requires_photos,
                }
                for t in allowed_transitions
            ],
            'user_permissions': user_permissions,
            'workflow_settings': workflow_settings,
        })

    @action(detail=True, methods=['get'], url_path='workflow/diagnostic')
    def get_workflow_diagnostic(self, request, pk=None):
        """
        Get detailed diagnostic information about workflow state.
        Useful for debugging why transitions aren't appearing.
        
        This endpoint provides:
        - Template resolution details
        - All transitions from current status (active/inactive)
        - Permission check results for each trans transition
        - Detailed rejection reasons
        
        Only accessible to admin users for debugging.
        """
        from .workflow_config import WorkflowEngine
        
        jobcard = self.get_object()
        user = request.user
        
        # Only allow admins to access diagnostic info
        if user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response(
                {'error': 'Only administrators can access workflow diagnostics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get comprehensive diagnostic info
        diagnostic_info = WorkflowEngine.get_workflow_diagnostic(jobcard, user)
        
        return Response(diagnostic_info)

    @action(detail=True, methods=['post'], url_path='workflow/transition')
    def perform_workflow_transition(self, request, pk=None):
        """
        Perform a workflow transition using the dynamic workflow engine.
        
        Body:
        {
            "target_status": "qc_completed",
            "notes": "Optional notes",
            "photos": ["optional", "photo", "urls"]
        }
        """
        from .workflow_config import WorkflowEngine
        
        jobcard = self.get_object()
        user = request.user
        
        target_status = request.data.get('target_status')
        if not target_status:
            return Response(
                {'error': 'target_status is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notes = request.data.get('notes')
        photos = request.data.get('photos')
        
        # Perform the transition
        success, result = WorkflowEngine.perform_transition(
            jobcard, user, target_status, notes, photos
        )
        
        if not success:
            return Response(
                {'error': result},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Return updated job card with minimal data
        return Response({
            'message': f'Successfully transitioned to {target_status}',
            'status': result.status,
            'id': result.id
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='workflow/can-transition')
    def can_transition(self, request, pk=None):
        """
        Check if a specific transition is allowed for the current user.
        
        Query params:
        - target_status: The target status to check
        """
        from .workflow_config import WorkflowEngine
        
        jobcard = self.get_object()
        user = request.user
        target_status = request.query_params.get('target_status')
        
        if not target_status:
            return Response(
                {'error': 'target_status query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_valid, message = WorkflowEngine.validate_transition(
            jobcard, user, target_status
        )
        
        return Response({
            'can_transition': is_valid,
            'message': message,
            'current_status': jobcard.status,
            'target_status': target_status,
        })

    @action(detail=False, methods=['get'], url_path='workflow/my-permissions')
    def my_permissions(self, request):
        """
        Get workflow permissions for the current user.
        """
        from .workflow_config import WorkflowEngine
        
        user = request.user
        permissions = WorkflowEngine.get_user_permissions(user)
        
        return Response({
            'role': user.role,
            'permissions': permissions,
        })

