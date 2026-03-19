from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import timedelta

from .models import (
    LeadSource, Lead, LeadActivity, LeadConversion,
    LeadScore, LeadFollowUp
)
from .serializers import (
    LeadSourceSerializer, LeadListSerializer, LeadDetailSerializer,
    LeadCreateUpdateSerializer, LeadActivitySerializer, LeadConversionSerializer,
    LeadScoreSerializer, LeadFollowUpSerializer, LeadConvertSerializer,
    LeadStatsSerializer
)


class LeadSourceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing lead sources"""
    queryset = LeadSource.objects.all()
    serializer_class = LeadSourceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['source_type', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'cost_per_lead']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter lead sources by company/role."""
        user = self.request.user
        
        if user.role == 'super_admin':
            return LeadSource.objects.all()
        elif user.role == 'company_admin' and user.company:
            return LeadSource.objects.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            return LeadSource.objects.filter(
                company=user.branch.company, is_active=True
            )
        return LeadSource.objects.none()
    
    def perform_create(self, serializer):
        """Set company on new lead source."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)
    
    @action(detail=False, methods=['get'])
    def performance(self, request):
        """Get performance metrics for all lead sources"""
        sources = self.get_queryset()
        data = []
        
        for source in sources:
            total_leads = source.leads.count()
            converted = source.leads.filter(converted_to_customer=True).count()
            conversion_rate = (converted / total_leads * 100) if total_leads > 0 else 0
            
            data.append({
                'id': source.id,
                'name': source.name,
                'source_type': source.get_source_type_display(),
                'total_leads': total_leads,
                'converted_leads': converted,
                'conversion_rate': round(conversion_rate, 2),
                'cost_per_lead': float(source.cost_per_lead),
                'total_cost': float(source.cost_per_lead * total_leads),
            })
        
        return Response(data)


class LeadViewSet(viewsets.ModelViewSet):
    """ViewSet for managing leads"""
    queryset = Lead.objects.all().select_related('source', 'assigned_to', 'branch')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'source', 'assigned_to', 'branch', 'converted_to_customer']
    search_fields = ['name', 'phone', 'email', 'company']
    ordering_fields = ['created_at', 'score', 'last_contacted_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = Lead.objects.all().select_related('source', 'assigned_to', 'branch')
        user = self.request.user
        
        if user.role == 'super_admin':
            return queryset
        elif user.role == 'company_admin' and user.company:
            return queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            return queryset.filter(branch=user.branch)
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set company on new lead."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LeadListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return LeadCreateUpdateSerializer
        return LeadDetailSerializer
    
    @action(detail=True, methods=['post'])
    def calculate_score(self, request, pk=None):
        """Calculate lead score"""
        lead = self.get_object()
        score = lead.calculate_score()
        
        # Save score history
        LeadScore.objects.create(
            lead=lead,
            score=score,
            factors={'calculated_via': 'api'}
        )
        
        return Response({
            'lead_id': lead.id,
            'score': score,
            'message': 'Score calculated successfully'
        })
    
    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Convert lead to customer"""
        lead = self.get_object()
        serializer = LeadConvertSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as converted
        from customers.models import Customer
        try:
            customer = Customer.objects.get(id=serializer.validated_data['customer_id'])
            
            # Validate customer belongs to same company
            user = request.user
            if user.role == 'company_admin' and user.company:
                if customer.company != user.company:
                    return Response(
                        {'error': 'Customer does not belong to your company.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif user.role not in ['super_admin'] and hasattr(user, 'branch') and user.branch:
                if customer.company != user.branch.company:
                    return Response(
                        {'error': 'Customer does not belong to your company.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            lead.mark_as_converted(
                customer=customer,
                booking_value=serializer.validated_data.get('conversion_value')
            )
            
            return Response({
                'message': 'Lead converted successfully',
                'lead': LeadDetailSerializer(lead).data
            })
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def add_activity(self, request, pk=None):
        """Add activity to lead"""
        lead = self.get_object()
        serializer = LeadActivitySerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(lead=lead, created_by=request.user)
            
            # Update last contacted date if it's a contact activity
            if request.data.get('activity_type') in ['call_outbound', 'call_inbound', 'email_sent', 'whatsapp_sent']:
                lead.last_contacted_at = timezone.now()
                lead.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_followup(self, request, pk=None):
        """Schedule follow-up for lead"""
        lead = self.get_object()
        serializer = LeadFollowUpSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(lead=lead, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_update(self, serializer):
        # Set updated_by on instance so signals can use it
        serializer.instance._updated_by = self.request.user
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def my_leads(self, request):
        """Get leads assigned to current user"""
        leads = self.get_queryset().filter(assigned_to=request.user)
        page = self.paginate_queryset(leads)
        if page is not None:
            serializer = LeadListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = LeadListSerializer(leads, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def hot_leads(self, request):
        """Get high-priority and high-score leads"""
        leads = self.get_queryset().filter(
            Q(priority__in=['high', 'urgent']) | Q(score__gte=75),
            status__in=['new', 'contacted', 'qualified']
        ).order_by('-score', '-priority')
        
        page = self.paginate_queryset(leads)
        if page is not None:
            serializer = LeadListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = LeadListSerializer(leads, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get lead statistics"""
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        leads = self.get_queryset().filter(created_at__gte=start_date)
        
        total_leads = leads.count()
        new_leads = leads.filter(status='new').count()
        contacted_leads = leads.filter(status='contacted').count()
        qualified_leads = leads.filter(status='qualified').count()
        converted_leads = leads.filter(converted_to_customer=True).count()
        lost_leads = leads.filter(status='lost').count()
        
        conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
        average_score = leads.aggregate(Avg('score'))['score__avg'] or 0
        
        # Calculate average conversion days
        conversions = LeadConversion.objects.filter(
            lead__in=leads,
            converted_at__gte=start_date
        )
        avg_conversion_days = conversions.aggregate(Avg('conversion_days'))['conversion_days__avg'] or 0
        
        stats = {
            'total_leads': total_leads,
            'new_leads': new_leads,
            'contacted_leads': contacted_leads,
            'qualified_leads': qualified_leads,
            'converted_leads': converted_leads,
            'lost_leads': lost_leads,
            'conversion_rate': round(conversion_rate, 2),
            'average_score': round(average_score, 2),
            'average_conversion_days': round(avg_conversion_days, 2),
        }
        
        serializer = LeadStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def funnel(self, request):
        """Get lead funnel data"""
        leads = self.get_queryset()
        
        funnel = {
            'new': leads.filter(status='new').count(),
            'contacted': leads.filter(status='contacted').count(),
            'qualified': leads.filter(status='qualified').count(),
            'proposal_sent': leads.filter(status='proposal_sent').count(),
            'negotiation': leads.filter(status='negotiation').count(),
            'won': leads.filter(status='won').count(),
            'lost': leads.filter(status='lost').count(),
        }
        
        return Response(funnel)


class LeadActivityViewSet(viewsets.ModelViewSet):
    """ViewSet for lead activities"""
    queryset = LeadActivity.objects.all().select_related('lead', 'created_by')
    serializer_class = LeadActivitySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['lead', 'activity_type', 'created_by']
    search_fields = ['description', 'outcome']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = LeadActivity.objects.all().select_related('lead', 'created_by')
        user = self.request.user
        
        if user.role == 'super_admin':
            return queryset
        elif user.role == 'company_admin' and user.company:
            return queryset.filter(lead__company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            return queryset.filter(lead__branch=user.branch)
        return queryset.none()


class LeadFollowUpViewSet(viewsets.ModelViewSet):
    """ViewSet for lead follow-ups"""
    queryset = LeadFollowUp.objects.all().select_related('lead', 'assigned_to')
    serializer_class = LeadFollowUpSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['lead', 'status', 'priority', 'assigned_to']
    search_fields = ['task']
    ordering_fields = ['due_date', 'created_at']
    ordering = ['due_date']
    
    def get_queryset(self):
        queryset = LeadFollowUp.objects.all().select_related('lead', 'assigned_to')
        user = self.request.user
        
        if user.role == 'super_admin':
            return queryset
        elif user.role == 'company_admin' and user.company:
            return queryset.filter(lead__company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            return queryset.filter(lead__branch=user.branch)
        return queryset.none()
    
    @action(detail=False, methods=['get'])
    def my_followups(self, request):
        """Get follow-ups assigned to current user"""
        followups = self.get_queryset().filter(assigned_to=request.user, status='pending')
        page = self.paginate_queryset(followups)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(followups, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue follow-ups"""
        followups = self.get_queryset().filter(
            status='pending',
            due_date__lt=timezone.now()
        )
        # Update status to overdue
        for followup in followups:
            followup.check_overdue()
        
        page = self.paginate_queryset(followups)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(followups, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark follow-up as completed"""
        followup = self.get_object()
        notes = request.data.get('notes', '')
        followup.mark_as_completed(request.user, notes)
        serializer = self.get_serializer(followup)
        return Response(serializer.data)


class LeadConversionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing lead conversions"""
    queryset = LeadConversion.objects.all().select_related('lead')
    serializer_class = LeadConversionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['lead']
    ordering_fields = ['converted_at', 'conversion_days', 'conversion_value']
    ordering = ['-converted_at']
    
    def get_queryset(self):
        queryset = LeadConversion.objects.all().select_related('lead')
        user = self.request.user
        
        if user.role == 'super_admin':
            return queryset
        elif user.role == 'company_admin' and user.company:
            return queryset.filter(lead__company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            return queryset.filter(lead__branch=user.branch)
        return queryset.none()
