from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from config.permissions import IsSuperAdmin, IsAdmin
from .models import Branch, ServiceBay
from .serializers import BranchSerializer, BranchListSerializer, ServiceBaySerializer


class BranchViewSet(viewsets.ModelViewSet):
    """ViewSet for Branch CRUD operations."""
    queryset = Branch.objects.all()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return BranchListSerializer
        return BranchSerializer
    
    def get_permissions(self):
        """
        Super admin can manage all branches.
        Anyone can view branches (for public website).
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        # Allow public access to list and retrieve for K3 website
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        """
        Custom queryset logic to handle different roles and ensure multi-tenancy.
        """
        user = self.request.user

        if not user.is_authenticated:
            # Allow public access if the permission class allows it (e.g. list/retrieve)
            # but still filter by detected company context if possible
            from companies.middleware import get_current_company
            company = get_current_company()
            if company:
                return Branch.objects.filter(company=company, is_active=True)
            return Branch.objects.none()

        # Super admin sees all branches across all companies
        if user.role == 'super_admin':
            return Branch.objects.all_companies()

        # Company admin sees all branches for their company
        if user.role == 'company_admin':
            if user.company:
                return Branch.objects.all_companies().filter(company=user.company)
            return Branch.objects.none()

        # Branch-level staff and other roles see active branches for their company
        if user.company:
            return Branch.objects.all_companies().filter(company=user.company, is_active=True)

        # No company context — return nothing rather than exposing all branches
        return Branch.objects.none()


class ServiceBayViewSet(viewsets.ModelViewSet):
    """ViewSet for Service Bay CRUD operations."""
    serializer_class = ServiceBaySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """Restrict mutations to admins; any authenticated user can read."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from config.permissions import IsAdmin
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """Filter bays by company/branch based on user role."""
        user = self.request.user
        queryset = ServiceBay.objects.select_related('branch', 'branch__company')

        # Company isolation
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif user.role == 'super_admin':
            pass  # super_admin sees all bays
        elif user.branch:
            # Branch-scoped roles see only their own branch's bays
            queryset = queryset.filter(branch=user.branch)
        elif user.company:
            queryset = queryset.filter(company=user.company)
        else:
            return queryset.none()

        # Optional branch sub-filter from query param
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        return queryset


class PublicBranchesView(APIView):
    """Public endpoint to list active branches for a given company.

    No authentication required — intended for booking widgets and
    external/public-facing apps.

    Query params:
        company_id  (required) – the Company PK

    URL: GET /api/branches/public/?company_id=<id>
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'company_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = (
            Branch.objects
            .filter(company_id=company_id, is_active=True)
            .order_by('name')
        )
        serializer = BranchListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
