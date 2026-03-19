from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import PickupDropRequest
from .serializers import PickupDropRequestSerializer, PickupDropCreateSerializer


class PickupDropRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for PickupDropRequest operations with branch filtering."""
    queryset = PickupDropRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter pickup requests by branch based on user role."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # For update/delete/retrieve operations, allow access to all items for admin
        if self.action in ['update', 'partial_update', 'destroy', 'retrieve', 'assign_driver', 'update_status']:
            # Admin can access items from their branch
            if user.is_authenticated and (user.is_staff or user.role in ['admin', 'super_admin']):
                # Branch admins/staff can only access their branch's pickup requests
                if user.role == 'company_admin' and user.company:
                    return queryset.filter(booking__company=user.company)
                if user.role in ['admin', 'staff'] and user.branch:
                    return queryset.filter(booking__branch=user.branch)
                # Super admin can access all
                return queryset
        
        # For list operation, apply branch filtering
        if user.role == 'branch_admin' and user.branch:
            # Branch admin sees only their branch's pickup requests
            queryset = queryset.filter(booking__branch=user.branch)
        elif user.role in ['floor_manager', 'supervisor'] and user.branch:
            # Floor manager and supervisor see only their branch's pickup requests
            queryset = queryset.filter(booking__branch=user.branch)
        elif user.role in ['super_admin', 'company_admin']:
            # Super admin or company admin can filter by branch via query param
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                queryset = queryset.filter(booking__branch_id=branch_id)
            elif user.role == 'company_admin':
                queryset = queryset.filter(booking__company=user.company)
        elif user.role == 'customer':
            # Customer sees only their own pickup requests
            queryset = queryset.filter(booking__customer__user=user)
        
        return queryset.select_related(
            'booking',
            'booking__branch',
            'booking__customer',
            'booking__customer__user',
            'driver'
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PickupDropCreateSerializer
        return PickupDropRequestSerializer
    
    def create(self, request, *args, **kwargs):
        """Override create to properly handle driver assignment."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Save the pickup request
        pickup_request = serializer.save()
        
        # If a driver was provided, update the status
        if pickup_request.driver:
            pickup_request.status = 'driver_assigned'
            pickup_request.save()
        
        # Return the full serialized object
        response_serializer = PickupDropRequestSerializer(pickup_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'])
    def assign_driver(self, request, pk=None):
        """Assign driver to pickup request (must be from same branch)."""
        pickup_request = self.get_object()
        driver_id = request.data.get('driver_id')
        
        from users.models import User
        try:
            # Get the driver
            driver = User.objects.get(id=driver_id, role='supervisor')
            
            # Verify driver belongs to the same branch as the booking
            if pickup_request.booking.branch and driver.branch:
                if pickup_request.booking.branch != driver.branch:
                    return Response({
                        'error': f'Driver must be from {pickup_request.booking.branch.name} branch.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            pickup_request.driver = driver
            pickup_request.status = 'driver_assigned'
            pickup_request.save()
            return Response(PickupDropRequestSerializer(pickup_request).data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Invalid driver ID.'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        """Update pickup request status."""
        pickup_request = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(PickupDropRequest.STATUS_CHOICES):
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
        
        pickup_request.status = new_status
        if new_status == 'picked_up' and request.data.get('pickup_time'):
            from django.utils.dateparse import parse_datetime
            pickup_request.pickup_time = parse_datetime(request.data['pickup_time'])
        elif new_status == 'delivered' and request.data.get('drop_time'):
            from django.utils.dateparse import parse_datetime
            pickup_request.drop_time = parse_datetime(request.data['drop_time'])
        
        pickup_request.save()
        return Response(PickupDropRequestSerializer(pickup_request).data, status=status.HTTP_200_OK)