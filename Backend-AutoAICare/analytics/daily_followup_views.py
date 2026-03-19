"""
Daily Follow-up Dashboard Views
Centralized API for all daily follow-up tasks
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Sum, Count, Max, F
from datetime import timedelta

from customers.models import Customer, Vehicle
from customers.crm_models import ServiceReminder
from leads.models import Lead, LeadFollowUp
from billing.models import Invoice
from jobcards.parts_catalog import Part
from bookings.models import Booking
from config.permissions import IsStaff


class DailyFollowUpDashboardView(APIView):
    """
    Centralized dashboard for all daily follow-up tasks
    Returns all pending tasks that need attention today
    """
    permission_classes = [IsAuthenticated, IsStaff]
    
    def get(self, request):
        """Get all follow-up tasks for today"""
        today = timezone.now().date()
        user = request.user

        # ── Company guard ─────────────────────────────────────────────────────
        # Every non-super_admin user must belong to a company.
        # If they don't, return an empty dashboard immediately.
        company = getattr(user, 'company', None)
        if user.role != 'super_admin' and not company:
            return Response({
                'date': today.isoformat(),
                'summary': {
                    'total_tasks': 0,
                    'high_priority': 0,
                    'birthdays_count': 0,
                    'anniversaries_count': 0,
                    'pending_enquiries_count': 0,
                    'scheduled_followups_count': 0,
                    'pending_payments_count': 0,
                    'overdue_payments_count': 0,
                    'service_reminders_count': 0,
                    'low_stock_count': 0,
                    'irregular_clients_count': 0,
                    'pending_bookings_count': 0,
                },
                'tasks': {
                    'birthdays': [],
                    'anniversaries': [],
                    'pending_enquiries': [],
                    'scheduled_followups': [],
                    'pending_payments': [],
                    'overdue_payments': [],
                    'service_reminders': [],
                    'low_stock_items': [],
                    'irregular_clients': [],
                    'pending_bookings': [],
                }
            })

        # ── Branch filtering ──────────────────────────────────────────────────
        branch_filter = {}
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and hasattr(user, 'branch') and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id and branch_id != 'null':
                branch_filter['branch_id'] = branch_id

        # 1. BIRTHDAYS - Customers with birthdays today
        birthdays = self._get_birthdays(today, branch_filter, company)
        
        # 2. ANNIVERSARIES - Customers with anniversaries today
        anniversaries = self._get_anniversaries(today, branch_filter, company)
        
        # 3. PENDING ENQUIRIES - New leads that need follow-up
        pending_enquiries = self._get_pending_enquiries(today, branch_filter, company)
        
        # 4. SCHEDULED FOLLOW-UPS - Lead follow-ups due today
        scheduled_followups = self._get_scheduled_followups(today, branch_filter, company)
        
        # 5. PENDING PAYMENTS - Invoices/payments pending
        pending_payments = self._get_pending_payments(branch_filter, company)
        
        # 6. OVERDUE PAYMENTS - Payments past due date
        overdue_payments = self._get_overdue_payments(today, branch_filter, company)
        
        # 7. SERVICE REMINDERS - Vehicles due for service
        service_reminders = self._get_service_reminders(today, branch_filter, company)
        
        # 8. LOW STOCK ALERTS - Inventory items below threshold
        low_stock_items = self._get_low_stock_items(branch_filter, company)
        
        # 9. IRREGULAR CLIENTS - Customers who haven't visited in 90+ days
        irregular_clients = self._get_irregular_clients(today, branch_filter, company)
        
        # 10. PENDING BOOKINGS - Bookings awaiting confirmation
        pending_bookings = self._get_pending_bookings(branch_filter, company)
        
        # Calculate summary stats
        total_tasks = (
            len(birthdays) + len(anniversaries) + len(pending_enquiries) +
            len(scheduled_followups) + len(pending_payments) + len(overdue_payments) +
            len(service_reminders) + len(low_stock_items) + len(irregular_clients) +
            len(pending_bookings)
        )
        
        high_priority_tasks = len(overdue_payments) + len(pending_enquiries) + len(scheduled_followups)
        
        return Response({
            'date': today.isoformat(),
            'summary': {
                'total_tasks': total_tasks,
                'high_priority': high_priority_tasks,
                'birthdays_count': len(birthdays),
                'anniversaries_count': len(anniversaries),
                'pending_enquiries_count': len(pending_enquiries),
                'scheduled_followups_count': len(scheduled_followups),
                'pending_payments_count': len(pending_payments),
                'overdue_payments_count': len(overdue_payments),
                'service_reminders_count': len(service_reminders),
                'low_stock_count': len(low_stock_items),
                'irregular_clients_count': len(irregular_clients),
                'pending_bookings_count': len(pending_bookings),
            },
            'tasks': {
                'birthdays': birthdays,
                'anniversaries': anniversaries,
                'pending_enquiries': pending_enquiries,
                'scheduled_followups': scheduled_followups,
                'pending_payments': pending_payments,
                'overdue_payments': overdue_payments,
                'service_reminders': service_reminders,
                'low_stock_items': low_stock_items,
                'irregular_clients': irregular_clients,
                'pending_bookings': pending_bookings,
            }
        })
    
    def _get_birthdays(self, today, branch_filter, company):
        """Get customers with birthdays today"""
        qs = Customer.objects.filter(
            user__birthday__month=today.month,
            user__birthday__day=today.day,
        ).select_related('user')

        if company:
            qs = qs.filter(company=company)

        if branch_filter:
            qs = qs.filter(
                bookings__branch=branch_filter.get('branch') or branch_filter.get('branch_id')
            ).distinct()
        
        return [{
            'id': customer.id,
            'name': customer.user.name,
            'phone': customer.user.phone,
            'email': customer.user.email,
            'birthday': customer.user.birthday.isoformat() if customer.user.birthday else None,
            'membership_type': customer.membership_type,
            'total_visits': customer.bookings.count(),
        } for customer in qs[:20]]  # Limit to 20
    
    def _get_anniversaries(self, today, branch_filter, company):
        """Get customers with anniversaries today"""
        qs = Customer.objects.filter(
            user__anniversary__month=today.month,
            user__anniversary__day=today.day,
        ).select_related('user')

        if company:
            qs = qs.filter(company=company)

        if branch_filter:
            qs = qs.filter(
                bookings__branch=branch_filter.get('branch') or branch_filter.get('branch_id')
            ).distinct()
        
        return [{
            'id': customer.id,
            'name': customer.user.name,
            'phone': customer.user.phone,
            'email': customer.user.email,
            'anniversary': customer.user.anniversary.isoformat() if customer.user.anniversary else None,
            'membership_type': customer.membership_type,
        } for customer in qs[:20]]
    
    def _get_pending_enquiries(self, today, branch_filter, company):
        """Get new leads that need follow-up"""
        filters = {'status': 'new', **branch_filter}
        if company:
            filters['company'] = company

        leads = Lead.objects.filter(**filters).select_related('source', 'assigned_to')
        
        return [{
            'id': lead.id,
            'customer_name': lead.name,
            'phone': lead.phone,
            'email': lead.email,
            'source': lead.source.name if lead.source else 'Unknown',
            'service_interest': lead.interested_services,
            'assigned_to': lead.assigned_to.name if lead.assigned_to else None,
            'created_at': lead.created_at.isoformat(),
            'score': lead.score,
            'priority': 'high' if lead.score >= 80 else 'medium' if lead.score >= 50 else 'low',
        } for lead in leads[:20]]
    
    def _get_scheduled_followups(self, today, branch_filter, company):
        """Get lead follow-ups scheduled for today"""
        qs = LeadFollowUp.objects.filter(
            due_date__date=today,
            status='pending'
        ).select_related('lead', 'assigned_to')

        if company:
            qs = qs.filter(lead__company=company)

        if branch_filter:
            qs = qs.filter(lead__branch=branch_filter.get('branch') or branch_filter.get('branch_id'))
        
        return [{
            'id': followup.id,
            'lead_id': followup.lead.id,
            'customer_name': followup.lead.name,
            'phone': followup.lead.phone,
            'email': followup.lead.email,
            'due_date': followup.due_date.isoformat(),
            'assigned_to': followup.assigned_to.name if followup.assigned_to else None,
            'notes': followup.notes,
            'lead_status': followup.lead.status,
        } for followup in qs[:20]]
    
    def _get_pending_payments(self, branch_filter, company):
        """Get pending payments/invoices"""
        invoice_filter = {'status': 'pending'}
        if company:
            invoice_filter['company'] = company
        if branch_filter:
            invoice_filter['booking__branch'] = branch_filter.get('branch') or branch_filter.get('branch_id')

        invoices = Invoice.objects.filter(
            **invoice_filter
        ).select_related('booking', 'booking__customer__user')
        
        return [{
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'customer_name': invoice.booking.customer.user.name,
            'phone': invoice.booking.customer.user.phone,
            'amount': float(invoice.total_amount),
            'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
            'booking_id': invoice.booking.id,
            'created_at': invoice.created_at.isoformat(),
        } for invoice in invoices[:20]]
    
    def _get_overdue_payments(self, today, branch_filter, company):
        """Get overdue payments"""
        invoice_filter = {'status': 'pending', 'due_date__lt': today}
        if company:
            invoice_filter['company'] = company
        if branch_filter:
            invoice_filter['booking__branch'] = branch_filter.get('branch') or branch_filter.get('branch_id')

        invoices = Invoice.objects.filter(
            **invoice_filter
        ).select_related('booking', 'booking__customer__user')
        
        return [{
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'customer_name': invoice.booking.customer.user.name,
            'phone': invoice.booking.customer.user.phone,
            'amount': float(invoice.total_amount),
            'due_date': invoice.due_date.isoformat(),
            'days_overdue': (today - invoice.due_date).days,
            'booking_id': invoice.booking.id,
            'priority': 'urgent',
        } for invoice in invoices[:20]]
    
    def _get_service_reminders(self, today, branch_filter, company):
        """Get vehicles due for service"""
        end_date = today + timedelta(days=7)

        qs = ServiceReminder.objects.filter(
            status='pending',
            due_date__lte=end_date
        ).select_related('customer__user', 'vehicle')

        # ServiceReminder has no direct company field — go through customer
        if company:
            qs = qs.filter(customer__company=company)
        
        if branch_filter:
            branch = branch_filter.get('branch') or branch_filter.get('branch_id')
            qs = qs.filter(customer__bookings__branch=branch).distinct()
        
        return [{
            'id': reminder.id,
            'customer_name': reminder.customer.user.name,
            'phone': reminder.customer.user.phone,
            'vehicle': f"{reminder.vehicle.brand} {reminder.vehicle.model} ({reminder.vehicle.registration_number})" if reminder.vehicle else 'N/A',
            'due_date': reminder.due_date.isoformat(),
            'days_until_due': (reminder.due_date - today).days,
            'reminder_type': reminder.reminder_type,
            'status': reminder.status,
            'priority': 'urgent' if (reminder.due_date - today).days <= 0 else 'high' if (reminder.due_date - today).days <= 3 else 'medium',
        } for reminder in qs[:20]]
    
    def _get_low_stock_items(self, branch_filter, company):
        """Get inventory items below minimum stock level"""
        part_filter = Q(stock__lte=F('min_stock_level')) & Q(is_active=True)

        if company:
            part_filter &= Q(company=company)

        if branch_filter:
            branch = branch_filter.get('branch') or branch_filter.get('branch_id')
            part_filter &= (Q(is_global=True) | Q(branch=branch))
        
        items = Part.objects.filter(part_filter)
        
        return [{
            'id': item.id,
            'name': item.name,
            'sku': item.sku,
            'category': item.get_category_display(),
            'current_quantity': item.stock,
            'minimum_stock_level': item.min_stock_level,
            'unit': item.get_unit_display(),
            'priority': 'urgent' if item.stock == 0 else 'high' if item.stock <= item.min_stock_level / 2 else 'medium',
        } for item in items[:20]]
    
    def _get_irregular_clients(self, today, branch_filter, company):
        """Get customers who haven't visited in 90+ days"""
        ninety_days_ago = today - timedelta(days=90)
        
        qs = Customer.objects.annotate(
            last_booking_date=Max('bookings__created_at')
        ).filter(
            last_booking_date__lt=ninety_days_ago
        ).select_related('user')

        if company:
            qs = qs.filter(company=company)

        if branch_filter:
            qs = qs.filter(
                bookings__branch=branch_filter.get('branch') or branch_filter.get('branch_id')
            )
        
        qs = qs.distinct()
        
        result = []
        for customer in qs[:20]:
            last_booking = customer.bookings.order_by('-created_at').first()
            if last_booking:
                days_since_visit = (today - last_booking.created_at.date()).days
                result.append({
                    'id': customer.id,
                    'name': customer.user.name,
                    'phone': customer.user.phone,
                    'email': customer.user.email,
                    'last_visit': last_booking.created_at.date().isoformat(),
                    'days_since_visit': days_since_visit,
                    'total_visits': customer.bookings.count(),
                    'membership_type': customer.membership_type,
                    'priority': 'high' if days_since_visit >= 180 else 'medium',
                })
        
        return result
    
    def _get_pending_bookings(self, branch_filter, company):
        """Get bookings awaiting confirmation"""
        filters = {'status': 'pending', **branch_filter}
        if company:
            filters['company'] = company

        bookings = Booking.objects.filter(**filters).select_related('customer__user', 'primary_package', 'vehicle')
        
        return [{
            'id': booking.id,
            'customer_name': booking.customer.user.name,
            'phone': booking.customer.user.phone,
            'service': booking.primary_package.name if booking.primary_package else 'N/A',
            'vehicle': f"{booking.vehicle.brand} {booking.vehicle.model}" if booking.vehicle else booking.vehicle_type,
            'booking_datetime': booking.booking_datetime.isoformat(),
            'created_at': booking.created_at.isoformat(),
            'total_price': float(booking.total_price) if booking.total_price else 0,
        } for booking in bookings[:20]]


class FollowUpStatsView(APIView):
    """Get follow-up statistics for the dashboard"""
    permission_classes = [IsAuthenticated, IsStaff]
    
    def get(self, request):
        """Get follow-up completion stats"""
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        user = request.user

        # ── Company guard ─────────────────────────────────────────────────────
        company = getattr(user, 'company', None)
        if user.role != 'super_admin' and not company:
            return Response({
                'followup_completion_rate': 0,
                'lead_conversion_rate': 0,
                'total_followups_this_week': 0,
                'completed_followups_this_week': 0,
                'total_leads_this_month': 0,
                'converted_leads_this_month': 0,
            })

        # ── Branch filtering ──────────────────────────────────────────────────
        followup_filter = {}
        lead_filter = {}
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and hasattr(user, 'branch') and user.branch:
            followup_filter['lead__branch'] = user.branch
            lead_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id and branch_id != 'null':
                followup_filter['lead__branch_id'] = branch_id
                lead_filter['branch_id'] = branch_id

        # Apply company filter
        if company:
            followup_filter['lead__company'] = company
            lead_filter['company'] = company

        # Follow-up completion rate
        total_followups_week = LeadFollowUp.objects.filter(
            due_date__date__gte=week_ago,
            due_date__date__lte=today,
            **followup_filter
        ).count()
        
        completed_followups_week = LeadFollowUp.objects.filter(
            due_date__date__gte=week_ago,
            due_date__date__lte=today,
            status='completed',
            **followup_filter
        ).count()
        
        completion_rate = 0
        if total_followups_week > 0:
            completion_rate = round((completed_followups_week / total_followups_week) * 100, 2)
        
        # Lead conversion rate
        total_leads_month = Lead.objects.filter(
            created_at__date__gte=month_ago,
            **lead_filter
        ).count()
        
        converted_leads_month = Lead.objects.filter(
            created_at__date__gte=month_ago,
            status='won',
            **lead_filter
        ).count()
        
        conversion_rate = 0
        if total_leads_month > 0:
            conversion_rate = round((converted_leads_month / total_leads_month) * 100, 2)
        
        return Response({
            'followup_completion_rate': completion_rate,
            'lead_conversion_rate': conversion_rate,
            'total_followups_this_week': total_followups_week,
            'completed_followups_this_week': completed_followups_week,
            'total_leads_this_month': total_leads_month,
            'converted_leads_this_month': converted_leads_month,
        })
