from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions

from django.shortcuts import get_object_or_404
from .models import Invoice, InvoiceItem
from .serializers import InvoiceSerializer, InvoiceCreateSerializer, InvoiceUpdateSerializer, InvoiceListSerializer
from jobcards.models import JobCard, PartUsed
from services.models import AddOn
from config.permissions import IsStaff



class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoices."""
    
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InvoiceUpdateSerializer
        elif self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer
    
    def get_queryset(self):
        """Filter invoices based on user role."""
        user = self.request.user
        if user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator']:
            # Base queryset with shared select_related
            base_queryset = Invoice.objects.select_related(
                'customer',
                'customer__user',
                'customer__wallet',
                'branch',
                'created_by'
            )

            # Action-specific prefetching
            if self.action == 'list':
                # Light prefetching for list view
                queryset = base_queryset.prefetch_related(
                    'items',
                    'payments',
                    'payments__recorded_by'
                ).all()
            else:
                # Heavy prefetching for single object/detail view
                queryset = base_queryset.prefetch_related(
                    'items',
                    'payments',
                    'payments__recorded_by',
                    'customer__vehicles',
                    'customer__lifecycle',
                    'customer__segments',
                    'customer__notes',
                    'customer__activities'
                ).all()

            # Branch / company filtering
            if not user.is_superuser:
                if user.role == 'company_admin' and user.company_id:
                    # Use the direct company FK — captures invoices where branch=None too
                    queryset = queryset.filter(company_id=user.company_id)
                elif user.role == 'branch_admin' and user.branch_id:
                    queryset = queryset.filter(branch_id=user.branch_id)
                elif user.role in ['floor_manager', 'supervisor', 'applicator'] and user.branch_id:
                    # These roles are branch-scoped
                    queryset = queryset.filter(branch_id=user.branch_id)

            # Explicit branch filtering from query parameter
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                if ',' in str(branch_id):
                    queryset = queryset.filter(branch_id__in=branch_id.split(','))
                else:
                    queryset = queryset.filter(branch_id=branch_id)

            # Job card filtering
            jobcard_id = self.request.query_params.get('jobcard')
            if jobcard_id:
                queryset = queryset.filter(jobcard_id=jobcard_id)

            # Date filtering
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')

            if start_date:
                queryset = queryset.filter(issued_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(issued_date__lte=end_date)

            # Status filtering
            status_param = self.request.query_params.get('status')
            if status_param and status_param != 'all':
                queryset = queryset.filter(status=status_param)

            # Exclude draft invoices (e.g. for accounting overview which only wants real records)
            exclude_draft = self.request.query_params.get('exclude_draft')
            if exclude_draft and exclude_draft.lower() in ('true', '1', 'yes'):
                queryset = queryset.exclude(status='draft')

            # Search
            query = self.request.query_params.get('query') or self.request.query_params.get('search')
            if query:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(invoice_number__icontains=query) |
                    Q(customer__user__name__icontains=query) |
                    Q(customer__user__phone__icontains=query)
                )

            return queryset
        else:
            # Customers see their own invoices
            return Invoice.objects.filter(customer__user=user)
    
    def get_permissions(self):
        """Only staff can create invoices."""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'mark_paid', 'add_item', 'from_jobcard', 'record_payment', 'generate_bill', 'finalize_invoice', 'update_bill_items']:
            return [IsStaff()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Set created_by and company fields, update job card status if applicable."""
        user = self.request.user
        # Derive company from user.company or user.branch.company
        company = getattr(user, 'company', None)
        if not company and getattr(user, 'branch', None):
            company = user.branch.company
        invoice = serializer.save(created_by=user, company=company)

        # Update job card status to 'billed' if invoice is created from job card
        if invoice.jobcard and invoice.jobcard.status in ['ready_for_billing', 'customer_approved', 'final_qc_passed']:
            invoice.jobcard.status = 'billed'
            invoice.jobcard.save()
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid."""
        invoice = self.get_object()
        
        if invoice.status == 'paid':
            return Response({'error': 'Invoice is already paid.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        invoice.mark_as_paid()
        
        return Response({
            'message': 'Invoice marked as paid successfully.',
            'invoice': InvoiceSerializer(invoice).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def recalculate_totals(self, request, pk=None):
        """Recalculate invoice totals (useful after fixing calculation logic)."""
        invoice = self.get_object()
        
        # Recalculate totals using the existing tax_rate
        invoice.calculate_totals()
        
        return Response({
            'message': 'Invoice totals recalculated successfully.',
            'invoice': InvoiceSerializer(invoice).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Add item to invoice."""
        invoice = self.get_object()
        
        if invoice.status == 'paid':
            return Response({'error': 'Cannot modify paid invoice.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        from .serializers import InvoiceItemSerializer
        serializer = InvoiceItemSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(invoice=invoice)
            invoice.calculate_totals()
            
            return Response({
                'message': 'Item added successfully.',
                'invoice': InvoiceSerializer(invoice).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download invoice as PDF using the modular PDF builder service."""
        try:
            from django.http import HttpResponse
            from .services.pdf.builder import InvoicePDFBuilder
        except ImportError as e:
            return Response(
                {'error': 'PDF generation is not available. Missing required library: reportlab'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        
        invoice = self.get_object()
        
        try:
            pdf = InvoicePDFBuilder().build(invoice)
        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Build a clean customer name for the filename
        customer_name = ''
        try:
            customer_name = invoice.customer.user.name.lower().replace(' ', '_')
        except Exception:
            pass
        pdf_filename = f"{invoice.invoice_number}-sales_invoice-{customer_name}.pdf" if customer_name else f"{invoice.invoice_number}-sales_invoice.pdf"

        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{pdf_filename}"'
        return response
    
    @action(detail=False, methods=['post'])
    def generate_bill(self, request):
        """Generate a draft bill from job card for editing before finalizing."""
        jobcard_id = request.data.get('jobcard_id')
        
        if not jobcard_id:
            return Response(
                {'error': 'jobcard_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            jobcard = JobCard.objects.select_related(
                'booking',
                'booking__customer',
                'booking__primary_package',
                'branch'
            ).prefetch_related(
                'parts_used',
                'booking__addons'
            ).get(id=jobcard_id)
            
            # Check if draft invoice already exists
            existing_draft = Invoice.objects.filter(jobcard=jobcard, status='draft').first()
            if existing_draft:
                return Response({
                    'message': 'Draft bill already exists for this job card',
                    'invoice': InvoiceSerializer(existing_draft).data,
                    'is_draft': True
                }, status=status.HTTP_200_OK)
            
            # Check if finalized invoice already exists
            existing_invoice = Invoice.objects.filter(jobcard=jobcard).exclude(status='draft').first()
            if existing_invoice:
                return Response({
                    'message': 'Invoice already exists for this job card',
                    'invoice': InvoiceSerializer(existing_invoice).data,
                    'is_draft': False
                }, status=status.HTTP_200_OK)
            
            # Generate invoice number and get tax rate
            from .utils import generate_invoice_number
            from config.models import GlobalSettings
            
            invoice_number = generate_invoice_number()
            # Get tax rate with branch-specific override logic
            tax_rate = 18  # Default fallback
            if jobcard.branch:
                company = jobcard.branch.company
                if company:
                    overrides = company.settings.get('branch_overrides', {})
                    branch_data = overrides.get(str(jobcard.branch.id), {})
                    if 'default_tax_rate' in branch_data:
                        tax_rate = branch_data['default_tax_rate']
                    else:
                        try:
                            tax_rate = company.company_settings.default_tax_rate
                        except:
                            settings = GlobalSettings.load()
                            tax_rate = settings.default_tax_rate if settings.default_tax_rate > 0 else 18
            else:
                settings = GlobalSettings.load()
                tax_rate = settings.default_tax_rate if settings.default_tax_rate > 0 else 18

            
            # Derive company from jobcard branch
            invoice_company = jobcard.branch.company if jobcard.branch else None

            # Create draft invoice
            invoice = Invoice.objects.create(
                customer=jobcard.booking.customer,
                booking=jobcard.booking,
                jobcard=jobcard,
                branch=jobcard.branch,
                company=invoice_company,
                invoice_number=invoice_number,
                tax_rate=tax_rate,
                status='draft',
                created_by=request.user,
                # Use system_discount_amount for booking discounts
                system_discount_amount=jobcard.booking.discount_amount if jobcard.booking.discount_amount > 0 else 0,
                discount_reason=f"Discount from Booking #{jobcard.booking.id}" if jobcard.booking.discount_amount > 0 else ""
            )
            
            # Collect all invoice items for bulk creation
            invoice_items = []
            
            # Add ALL service packages as individual line items
            # Use price_breakdown['packages'] for per-package pricing
            price_breakdown = jobcard.booking.price_breakdown if hasattr(jobcard.booking, 'price_breakdown') else {}
            packages_breakdown = price_breakdown.get('packages', [])
            if packages_breakdown:
                for pkg_data in packages_breakdown:
                    invoice_items.append(InvoiceItem(
                        invoice=invoice,
                        item_type='service',
                        description=f"Service Package: {pkg_data['name']} ({jobcard.booking.vehicle_type})",
                        quantity=1,
                        unit_price=pkg_data.get('price', 0)
                    ))
            else:
                # Fallback: iterate M2M packages directly
                for pkg in jobcard.booking.get_packages_list():
                    pkg_price = pkg.get_price_for_vehicle_type(jobcard.booking.vehicle_type)
                    invoice_items.append(InvoiceItem(
                        invoice=invoice,
                        item_type='service',
                        description=f"Service Package: {pkg.name} ({jobcard.booking.vehicle_type})",
                        quantity=1,
                        unit_price=pkg_price
                    ))
            
            # Add selected add-ons
            # Use prices from booking's price_breakdown
            if hasattr(jobcard.booking, 'price_breakdown') and jobcard.booking.price_breakdown:
                addons_data = jobcard.booking.price_breakdown.get('addons', [])
                for addon_data in addons_data:
                    invoice_items.append(InvoiceItem(
                        invoice=invoice,
                        item_type='addon',
                        description=addon_data.get('name', 'Add-on'),
                        quantity=1,
                        unit_price=addon_data.get('price', 0)
                    ))
            else:
                # Fallback to addon model prices (use prefetched data)
                addons_list = list(jobcard.booking.addons.all())
                for addon in addons_list:
                    invoice_items.append(InvoiceItem(
                        invoice=invoice,
                        item_type='addon',
                        description=addon.name,
                        quantity=1,
                        unit_price=addon.price
                    ))

            
            
            # Add dynamic tasks (approved, in progress, or completed)
            # Use prefetched data
            dynamic_tasks = [t for t in jobcard.dynamic_tasks.all() if t.status in ['approved', 'in_progress', 'completed']]
            for task in dynamic_tasks:
                invoice_items.append(InvoiceItem(
                    invoice=invoice,
                    item_type='service',
                    description=f"Extra Task: {task.title}",
                    quantity=1,
                    unit_price=task.estimated_price
                ))
            
            # Add additional tasks from QC report (if any)
            if hasattr(jobcard, 'qc_report') and jobcard.qc_report:
                if jobcard.qc_report.additional_tasks and jobcard.qc_report.additional_tasks_price:
                    if jobcard.qc_report.additional_tasks_price > 0:
                        invoice_items.append(InvoiceItem(
                            invoice=invoice,
                            item_type='service',
                            description=f"Additional Tasks: {jobcard.qc_report.additional_tasks}",
                            quantity=1,
                            unit_price=jobcard.qc_report.additional_tasks_price
                        ))
            
            # Add parts used (use prefetched data)
            # Service-default parts (auto-added from service config) have cost=0 on billing
            parts_list = list(jobcard.parts_used.all())
            for part in parts_list:
                invoice_items.append(InvoiceItem(
                    invoice=invoice,
                    item_type='part',
                    description=part.part_name,
                    quantity=part.quantity,
                    unit_price=0 if part.is_service_default else part.price
                ))
            
            # Bulk create all invoice items in a single query — propagate company
            if invoice_items:
                for item in invoice_items:
                    item.company = invoice_company
                InvoiceItem.objects.bulk_create(invoice_items)
            
            
            # Calculate totals
            invoice.calculate_totals()
            
            return Response({
                'message': 'Draft bill generated successfully',
                'invoice': InvoiceSerializer(invoice).data,
                'is_draft': True
            }, status=status.HTTP_201_CREATED)
            
        except JobCard.DoesNotExist:
            return Response(
                {'error': 'Job card not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def finalize_invoice(self, request, pk=None):
        """Finalize a draft invoice and update job card status."""
        invoice = self.get_object()
        
        if invoice.status != 'draft':
            return Response(
                {'error': 'Only draft invoices can be finalized'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update invoice status to pending
        invoice.status = 'pending'
        invoice.save()
        
        # Update job card status to 'billed'
        if invoice.jobcard and invoice.jobcard.status in ['ready_for_billing', 'customer_approved', 'final_qc_passed']:
            invoice.jobcard.status = 'billed'
            invoice.jobcard.save()
        
        return Response({
            'message': 'Invoice finalized successfully',
            'invoice': InvoiceSerializer(invoice).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['put'])
    def update_bill_items(self, request, pk=None):
        """Update bill items for any unpaid invoice (draft or pending)."""
        invoice = self.get_object()
        
        # NOTE: Paid invoices are intentionally allowed to be edited by admins
        # (e.g. to add a missed line item after the fact). The performance metrics
        # sync below handles recalculating totals and updating PerformanceMetrics.
        # The frontend skips this call on simple downloads (no destructive side-effects).

        from decimal import Decimal
        
        # Update invoice fields
        if 'tax_rate' in request.data:
            invoice.tax_rate = Decimal(str(request.data['tax_rate']))
            
        # Handle split discounts
        if 'additional_discount_type' in request.data:
            invoice.additional_discount_type = request.data['additional_discount_type']
        elif 'discount_type' in request.data:
            # Fallback for old frontend versions
            invoice.additional_discount_type = request.data['discount_type']
            
        if 'additional_discount_percentage' in request.data:
            invoice.additional_discount_percentage = Decimal(str(request.data['additional_discount_percentage']))
        elif 'discount_percentage' in request.data:
            invoice.additional_discount_percentage = Decimal(str(request.data['discount_percentage']))
            
        if 'additional_discount_amount' in request.data:
            invoice.additional_discount_amount = Decimal(str(request.data['additional_discount_amount']))
        elif 'discount_amount' in request.data:
            invoice.additional_discount_amount = Decimal(str(request.data['discount_amount']))
            
        if 'system_discount_amount' in request.data:
            invoice.system_discount_amount = Decimal(str(request.data['system_discount_amount']))
            
        if 'discount_reason' in request.data:
            invoice.discount_reason = request.data['discount_reason']
        if 'notes' in request.data:
            invoice.notes = request.data['notes']
        if 'due_date' in request.data:
            invoice.due_date = request.data['due_date']
        
        invoice.save()
        
        # Update items if provided
        if 'items' in request.data:
            from .serializers import InvoiceItemSerializer
            
            # Delete existing items
            invoice.items.all().delete()
            
            # Create new items
            for item_data in request.data['items']:
                serializer = InvoiceItemSerializer(data=item_data)
                if serializer.is_valid():
                    serializer.save(invoice=invoice)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Recalculate totals
        invoice.calculate_totals()
        
        # If this invoice is already paid, sync PerformanceMetrics so reports
        # reflect the updated total_amount (total_with_gst / gst_amount).
        if invoice.status == 'paid' and invoice.jobcard:
            try:
                from jobcards.performance_service import PerformanceTrackingService
                PerformanceTrackingService.update_on_payment(
                    jobcard=invoice.jobcard,
                    invoice=invoice,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(
                    f"Could not sync PerformanceMetrics after invoice edit "
                    f"for Invoice #{invoice.id}: {e}"
                )
        
        return Response({
            'message': 'Bill updated successfully',
            'invoice': InvoiceSerializer(invoice).data
        }, status=status.HTTP_200_OK)

    
    @action(detail=False, methods=['post'])
    def from_jobcard(self, request):
        """Auto-populate invoice from job card. Returns existing invoice if it exists, otherwise creates a new one."""
        jobcard_id = request.data.get('jobcard_id')
        
        if not jobcard_id:
            return Response(
                {'error': 'jobcard_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            jobcard = JobCard.objects.select_related(
                'booking',
                'booking__customer',
                'booking__primary_package',
                'branch'
            ).prefetch_related(
                'parts_used',
                'booking__addons'
            ).get(id=jobcard_id)
            
            # Check if ANY invoice already exists for this jobcard (including drafts)
            # This prevents creating a duplicate invoice when a draft already exists.
            existing_invoice = Invoice.objects.filter(jobcard=jobcard).order_by('-created_at').first()
            if existing_invoice:
                if existing_invoice.status == 'draft':
                    # Promote the draft to pending so it can be paid, instead of creating a new one
                    existing_invoice.status = 'pending'
                    existing_invoice.save(update_fields=['status'])
                    # Update job card status to 'billed'
                    if jobcard.status in ['ready_for_billing', 'customer_approved', 'final_qc_passed']:
                        jobcard.status = 'billed'
                        jobcard.save()
                    return Response({
                        'message': 'Draft invoice promoted to pending for this job card',
                        'invoice': InvoiceSerializer(existing_invoice).data
                    }, status=status.HTTP_200_OK)
                # If the invoice is still in 'pending' status, sync it with latest booking/job card data
                if existing_invoice.status == 'pending':
                    # Refresh booking to get latest discount_amount
                    jobcard.booking.refresh_from_db()
                    
                    # Update system discount from booking (if any)
                    existing_invoice.system_discount_amount = jobcard.booking.discount_amount if jobcard.booking.discount_amount > 0 else 0
                    if jobcard.booking.discount_amount > 0:
                        existing_invoice.discount_reason = (existing_invoice.discount_reason + f" | Sync: Booking #{jobcard.booking.id}") if existing_invoice.discount_reason else f"Discount from Booking #{jobcard.booking.id}"
                    
                    # Sync line items - for simplicity we clear and recreate them to match current job state
                    existing_invoice.items.all().delete()
                    
                    # Re-add items — one InvoiceItem per service package
                    # 1. Packages (all of them)
                    price_breakdown_sync = jobcard.booking.price_breakdown if hasattr(jobcard.booking, 'price_breakdown') else {}
                    packages_breakdown_sync = price_breakdown_sync.get('packages', [])
                    if packages_breakdown_sync:
                        for pkg_data in packages_breakdown_sync:
                            InvoiceItem.objects.create(
                                invoice=existing_invoice, item_type='service',
                                description=f"Service Package: {pkg_data['name']} ({jobcard.booking.vehicle_type})",
                                quantity=1, unit_price=pkg_data.get('price', 0)
                            )
                    else:
                        for pkg in jobcard.booking.get_packages_list():
                            pkg_price = pkg.get_price_for_vehicle_type(jobcard.booking.vehicle_type)
                            InvoiceItem.objects.create(
                                invoice=existing_invoice, item_type='service',
                                description=f"Service Package: {pkg.name} ({jobcard.booking.vehicle_type})",
                                quantity=1, unit_price=pkg_price
                            )
                    
                    # 2. Add-ons
                    if hasattr(jobcard.booking, 'price_breakdown') and jobcard.booking.price_breakdown:
                        addons_data = jobcard.booking.price_breakdown.get('addons', [])
                        for addon_data in addons_data:
                            InvoiceItem.objects.create(
                                invoice=existing_invoice, item_type='addon',
                                description=addon_data.get('name', 'Add-on'), quantity=1, unit_price=addon_data.get('price', 0)
                            )
                    else:
                        for addon in jobcard.booking.addons.all():
                            InvoiceItem.objects.create(
                                invoice=existing_invoice, item_type='addon',
                                description=addon.name, quantity=1, unit_price=addon.price
                            )
                    
                    # 3. Dynamic Tasks
                    dynamic_tasks = jobcard.dynamic_tasks.filter(status__in=['approved', 'in_progress', 'completed'])
                    for task in dynamic_tasks:
                        InvoiceItem.objects.create(
                            invoice=existing_invoice, item_type='service',
                            description=f"Extra Task: {task.title}", quantity=1, unit_price=task.estimated_price
                        )
                    
                    # 4. Parts Used — skip service-default parts (included in package price)
                    for part_used in jobcard.parts_used.all():
                        if part_used.is_service_default:
                            continue
                        InvoiceItem.objects.create(
                            invoice=existing_invoice, item_type='part',
                            description=part_used.part_name, quantity=part_used.quantity,
                            unit_price=part_used.price
                        )
                    
                    # 5. Additional items from QC
                    if hasattr(jobcard, 'qc_report') and jobcard.qc_report:
                        if jobcard.qc_report.additional_labor_cost > 0:
                            InvoiceItem.objects.create(
                                invoice=existing_invoice, item_type='service',
                                description="Additional Labor (QC Noted)", quantity=1, unit_price=jobcard.qc_report.additional_labor_cost
                            )
                        if jobcard.qc_report.additional_parts_cost > 0:
                            InvoiceItem.objects.create(
                                invoice=existing_invoice, item_type='part',
                                description="Additional Materials (QC Noted)", quantity=1, unit_price=jobcard.qc_report.additional_parts_cost
                            )

                    # Recalculate totals
                    existing_invoice.calculate_totals()
                    
                return Response({
                    'message': 'Invoice already exists for this job card',
                    'invoice': InvoiceSerializer(existing_invoice).data
                }, status=status.HTTP_200_OK)
            
            # Generate invoice number and get tax rate
            from .utils import generate_invoice_number
            from config.models import GlobalSettings
            
            invoice_number = generate_invoice_number()
            # Get tax rate with branch-specific override logic
            tax_rate = 18  # Default fallback
            if jobcard.branch:
                company = jobcard.branch.company
                if company:
                    overrides = company.settings.get('branch_overrides', {})
                    branch_data = overrides.get(str(jobcard.branch.id), {})
                    if 'default_tax_rate' in branch_data:
                        tax_rate = branch_data['default_tax_rate']
                    else:
                        try:
                            tax_rate = company.company_settings.default_tax_rate
                        except:
                            settings = GlobalSettings.load()
                            tax_rate = settings.default_tax_rate if settings.default_tax_rate > 0 else 18
            else:
                settings = GlobalSettings.load()
                tax_rate = settings.default_tax_rate if settings.default_tax_rate > 0 else 18

            # Refresh booking from DB to ensure we have the latest discount_amount
            # (in case it was calculated during save)
            jobcard.booking.refresh_from_db()

            # Derive company from jobcard branch
            invoice_company = jobcard.branch.company if jobcard.branch else None

            # Create invoice
            invoice = Invoice.objects.create(
                customer=jobcard.booking.customer,
                booking=jobcard.booking,
                jobcard=jobcard,
                branch=jobcard.branch,
                company=invoice_company,
                invoice_number=invoice_number,
                tax_rate=tax_rate,
                status='pending',
                created_by=request.user,
                # Use system_discount_amount for booking discounts
                system_discount_amount=jobcard.booking.discount_amount if jobcard.booking.discount_amount > 0 else 0,
                discount_reason=f"Discount from Booking #{jobcard.booking.id}" if jobcard.booking.discount_amount > 0 else ""
            )
            
            # Add ALL service packages as individual line items
            price_breakdown_new = jobcard.booking.price_breakdown if hasattr(jobcard.booking, 'price_breakdown') else {}
            packages_breakdown_new = price_breakdown_new.get('packages', [])
            if packages_breakdown_new:
                for pkg_data in packages_breakdown_new:
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        item_type='service',
                        description=f"Service Package: {pkg_data['name']} ({jobcard.booking.vehicle_type})",
                        quantity=1,
                        unit_price=pkg_data.get('price', 0)
                    )
            else:
                for pkg in jobcard.booking.get_packages_list():
                    pkg_price = pkg.get_price_for_vehicle_type(jobcard.booking.vehicle_type)
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        item_type='service',
                        description=f"Service Package: {pkg.name} ({jobcard.booking.vehicle_type})",
                        quantity=1,
                        unit_price=pkg_price
                    )
            
            # Add selected add-ons
            # Use prices from booking's price_breakdown
            if hasattr(jobcard.booking, 'price_breakdown') and jobcard.booking.price_breakdown:
                addons_data = jobcard.booking.price_breakdown.get('addons', [])
                for addon_data in addons_data:
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        item_type='addon',
                        description=addon_data.get('name', 'Add-on'),
                        quantity=1,
                        unit_price=addon_data.get('price', 0)
                    )
            else:
                # Fallback to addon model prices
                for addon in jobcard.booking.addons.all():
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        item_type='addon',
                        description=addon.name,
                        quantity=1,
                        unit_price=addon.price
                    )

            
            # Add dynamic tasks (approved, in progress, or completed)
            dynamic_tasks = jobcard.dynamic_tasks.filter(status__in=['approved', 'in_progress', 'completed'])
            for task in dynamic_tasks:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    item_type='service',
                    description=f"Extra Task: {task.title}",
                    quantity=1,
                    unit_price=task.estimated_price
                )
            
            # Add additional tasks from QC report (if any)
            if hasattr(jobcard, 'qc_report') and jobcard.qc_report:
                if jobcard.qc_report.additional_tasks and jobcard.qc_report.additional_tasks_price:
                    if jobcard.qc_report.additional_tasks_price > 0:
                        InvoiceItem.objects.create(
                            invoice=invoice,
                            item_type='service',
                            description=f"Additional Tasks: {jobcard.qc_report.additional_tasks}",
                            quantity=1,
                            unit_price=jobcard.qc_report.additional_tasks_price
                        )
            
            # Add parts used — skip service-default parts (included in package price)
            for part in jobcard.parts_used.all():
                if part.is_service_default:
                    continue
                InvoiceItem.objects.create(
                    invoice=invoice,
                    company=invoice_company,
                    item_type='part',
                    description=part.part_name,
                    quantity=part.quantity,
                    unit_price=part.price
                )
            
            
            # Calculate totals
            invoice.calculate_totals()
            
            # Update job card status to 'billed'
            if jobcard.status in ['ready_for_billing', 'customer_approved', 'final_qc_passed']:
                jobcard.status = 'billed'
                jobcard.save()
            
            return Response({
                'message': 'Invoice created successfully from job card',
                'invoice': InvoiceSerializer(invoice).data
            }, status=status.HTTP_201_CREATED)
            
        except JobCard.DoesNotExist:
            return Response(
                {'error': 'Job card not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def apply_discount(self, request, pk=None):
        """
        Apply or update discount on an invoice before payment.
        This allows last-minute discounts even on finalized invoices.
        """
        invoice = self.get_object()
        
        # Don't allow discount changes on fully paid invoices
        if invoice.status == 'paid':
            return Response(
                {'error': 'Cannot modify discount on a fully paid invoice'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        discount_type = request.data.get('discount_type', 'none')
        discount_percentage = request.data.get('discount_percentage', 0)
        discount_amount = request.data.get('discount_amount', 0)
        discount_reason = request.data.get('discount_reason', '')
        
        # Validate discount type
        valid_types = ['none', 'percentage', 'fixed', 'coupon']
        if discount_type not in valid_types:
            return Response(
                {'error': f'Invalid discount type. Must be one of: {", ".join(valid_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate discount values
        from decimal import Decimal, ROUND_HALF_UP
        try:
            if discount_type == 'percentage':
                discount_percentage = Decimal(str(discount_percentage)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                if discount_percentage < 0 or discount_percentage > 100:
                    return Response(
                        {'error': 'Discount percentage must be between 0 and 100'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif discount_type == 'fixed':
                discount_amount = Decimal(str(discount_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                if discount_amount < 0:
                    return Response(
                        {'error': 'Discount amount cannot be negative'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Validate discount doesn't exceed subtotal + tax
                max_discount = invoice.subtotal + invoice.tax_amount
                if discount_amount > max_discount:
                    return Response(
                        {
                            'error': 'Discount amount cannot exceed invoice subtotal + tax',
                            'max_allowed': float(max_discount),
                            'requested': float(discount_amount)
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid discount value'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update invoice additional discount fields
        invoice.additional_discount_type = discount_type
        invoice.additional_discount_percentage = discount_percentage if discount_type == 'percentage' else 0
        invoice.additional_discount_amount = discount_amount if discount_type == 'fixed' else 0
        if discount_reason:
            invoice.discount_reason = (invoice.discount_reason + " | " + discount_reason) if invoice.discount_reason else discount_reason
        
        # Determine main discount type for legacy tracking (prefer percentage if any)
        if invoice.system_discount_amount > 0 and invoice.additional_discount_amount == 0:
            invoice.discount_type = 'fixed'
        elif invoice.additional_discount_type != 'none':
            invoice.discount_type = invoice.additional_discount_type
        else:
            invoice.discount_type = 'none'
        
        # Recalculate totals
        invoice.calculate_totals()
        
        return Response({
            'message': 'Discount applied successfully',
            'invoice': InvoiceSerializer(invoice).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """
        Record a payment for this invoice (for cash/manual payments).
        Supports partial payments with full payment history tracking.
        Supports wallet balance deduction for referral rewards.
        """
        invoice = self.get_object()
        
        if invoice.status == 'paid':
            return Response(
                {'error': 'Invoice is already fully paid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payment_method = request.data.get('payment_method', 'cash')
        amount_str = request.data.get('amount')
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')
        use_wallet_balance = request.data.get('use_wallet_balance', False)
        
        # Validate amount is provided
        if not amount_str:
            return Response(
                {'error': 'Payment amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from decimal import Decimal, ROUND_HALF_UP
            # Round to 2 decimal places to handle floating point issues from frontend
            amount = Decimal(str(amount_str)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid payment amount'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate amount is positive
        if amount <= 0:
            return Response(
                {'error': 'Payment amount must be greater than zero'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate remaining amount
        amount_remaining = invoice.get_amount_remaining()
        
        # Validate payment doesn't exceed remaining balance
        if amount > amount_remaining:
            return Response(
                {
                    'error': 'Payment amount exceeds remaining balance',
                    'amount_requested': float(amount),
                    'amount_remaining': float(amount_remaining),
                    'invoice_total': float(invoice.total_amount),
                    'amount_already_paid': float(invoice.get_amount_paid())
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from payments.models import Payment
        from payments.wallet_models import Wallet
        from django.db import transaction as db_transaction
        import uuid
        
        wallet_amount_used = Decimal('0.00')
        cash_amount = amount
        customer_wallet = None
        
        # Handle wallet balance if requested
        if use_wallet_balance:
            try:
                customer_wallet = Wallet.objects.get(customer=invoice.customer)
                
                if customer_wallet.balance > 0:
                    # Use wallet balance up to the payment amount
                    wallet_amount_used = min(customer_wallet.balance, amount)
                    cash_amount = amount - wallet_amount_used
                    
            except Wallet.DoesNotExist:
                # No wallet exists, proceed with full cash payment
                pass
        
        # Create payment record with atomic transaction
        with db_transaction.atomic():
            # Derive company from invoice -> branch -> company chain
            payment_company = invoice.company if invoice.company else (
                invoice.branch.company if invoice.branch and hasattr(invoice.branch, 'company') else None
            )
            
            payment = Payment.objects.create(
                booking=invoice.booking,
                invoice=invoice,
                amount=amount,
                payment_method=payment_method,
                payment_status='completed',
                transaction_id=f"MAN-{uuid.uuid4().hex[:12].upper()}",
                reference_number=reference_number,
                notes=notes,
                recorded_by=request.user,
                wallet_amount=wallet_amount_used,
                company=payment_company
            )
            
            # Deduct from wallet if used
            if wallet_amount_used > 0 and customer_wallet:
                customer_wallet.deduct_funds(
                    wallet_amount_used,
                    f"Payment for Invoice #{invoice.invoice_number}"
                )
        
        # Signal will automatically:
        # 1. Create Transaction record
        # 2. Mark invoice as paid (if fully paid)
        
        # Refresh invoice to get updated status
        invoice.refresh_from_db()
        
        # Determine if this is a partial or full payment
        is_partial = amount < amount_remaining
        
        response_data = {
            'message': 'Payment recorded successfully',
            'payment_id': payment.id,
            'transaction_id': payment.transaction_id,
            'payment_type': 'partial' if is_partial else 'full',
            'amount_paid': float(amount),
            'invoice_total': float(invoice.total_amount),
            'amount_remaining': float(invoice.get_amount_remaining()),
            'total_paid_so_far': float(invoice.get_amount_paid()),
            'invoice_status': invoice.status,
            'is_fully_paid': invoice.is_fully_paid()
        }
        
        # Add wallet information if used
        if wallet_amount_used > 0:
            response_data['wallet_used'] = float(wallet_amount_used)
            response_data['cash_amount'] = float(cash_amount)
            response_data['remaining_wallet_balance'] = float(customer_wallet.balance)
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def audit_invoices(self, request):
        """
        Audit all invoices to find calculation discrepancies.
        Returns list of invoices where total_amount doesn't match the calculation.
        """
        from decimal import Decimal
        
        invoices = self.get_queryset()
        discrepancies = []
        
        for invoice in invoices:
            calculated_total = invoice.subtotal + invoice.tax_amount - invoice.discount_amount
            difference = abs(invoice.total_amount - calculated_total)
            
            # Flag if difference is more than 0.01 (1 paisa)
            if difference > Decimal('0.01'):
                discrepancies.append({
                    'id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'customer': invoice.customer.user.name,
                    'subtotal': float(invoice.subtotal),
                    'tax_rate': float(invoice.tax_rate),
                    'tax_amount': float(invoice.tax_amount),
                    'discount_amount': float(invoice.discount_amount),
                    'stored_total': float(invoice.total_amount),
                    'calculated_total': float(calculated_total),
                    'difference': float(difference),
                    'status': invoice.status,
                    'created_at': invoice.created_at
                })
        
        return Response({
            'total_invoices': invoices.count(),
            'invoices_with_discrepancies': len(discrepancies),
            'discrepancies': discrepancies
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def fix_all_calculations(self, request):
        """
        Recalculate totals for all invoices with discrepancies.
        Only affects unpaid invoices by default.
        """
        from decimal import Decimal
        
        only_unpaid = request.data.get('only_unpaid', True)
        
        invoices = self.get_queryset()
        if only_unpaid:
            invoices = invoices.exclude(status='paid')
        
        fixed_count = 0
        fixed_invoices = []
        
        for invoice in invoices:
            calculated_total = invoice.subtotal + invoice.tax_amount - invoice.discount_amount
            difference = abs(invoice.total_amount - calculated_total)
            
            # Fix if difference is more than 0.01 (1 paisa)
            if difference > Decimal('0.01'):
                old_total = invoice.total_amount
                invoice.calculate_totals()
                fixed_count += 1
                
                fixed_invoices.append({
                    'invoice_number': invoice.invoice_number,
                    'old_total': float(old_total),
                    'new_total': float(invoice.total_amount),
                    'difference': float(difference)
                })
        
        return Response({
            'message': f'Fixed {fixed_count} invoice(s)',
            'fixed_count': fixed_count,
            'only_unpaid': only_unpaid,
            'fixed_invoices': fixed_invoices
        }, status=status.HTTP_200_OK)
