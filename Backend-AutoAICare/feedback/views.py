from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count
from .models import Feedback
from .serializers import FeedbackSerializer, FeedbackCreateSerializer
from bookings.models import Booking


class FeedbackViewSet(viewsets.ModelViewSet):
    """ViewSet for Feedback operations with branch filtering."""
    queryset = Feedback.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter feedback by company/branch based on user role."""
        user = self.request.user
        queryset = Feedback.objects.select_related(
            'booking',
            'booking__branch',
            'booking__customer',
            'booking__customer__user',
            'booking__primary_package'
        )

        if user.role == 'customer':
            # Customer sees only their own feedback
            queryset = queryset.filter(booking__customer__user=user)
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(booking__company=user.company)
            # Optional branch sub-filter
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                queryset = queryset.filter(booking__branch_id=branch_id)
        elif user.role in ['branch_admin', 'floor_manager', 'supervisor', 'applicator'] and user.branch:
            queryset = queryset.filter(booking__branch=user.branch)
        elif user.role == 'super_admin':
            # Super admin can optionally filter by branch
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                queryset = queryset.filter(booking__branch_id=branch_id)
        else:
            queryset = queryset.none()

        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FeedbackCreateSerializer
        return FeedbackSerializer
    
    def perform_create(self, serializer):
        """Create feedback and ensure booking belongs to user."""
        booking = serializer.validated_data['booking']
        if booking.customer.user != self.request.user:
            raise permissions.PermissionDenied("You can only provide feedback for your own bookings.")

        if booking.status != 'completed':
            raise serializers.ValidationError("You can only provide feedback for completed bookings.")

        # Derive company from the booking
        company = getattr(booking, 'company', None) or (
            booking.branch.company if getattr(booking, 'branch', None) else None
        )
        serializer.save(company=company)
    
    @action(detail=True, methods=['post'])
    def helpful(self, request, pk=None):
        """Mark feedback as helpful (increment helpful_count)."""
        feedback = self.get_object()
        feedback.helpful_count += 1
        feedback.save()
        return Response(
            FeedbackSerializer(feedback).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get feedback summary statistics."""
        user = request.user
        
        # Apply branch filtering
        feedback_filter = {}
        if user.role == 'company_admin' and user.company:
            # Company admin sees all company data
            feedback_filter['booking__company'] = user.company
        elif user.role == 'branch_admin' and user.branch:
            # Branch admin sees only their branch data
            feedback_filter['booking__branch'] = user.branch
        elif user.role in ['floor_manager', 'supervisor', 'applicator'] and user.branch:
            # Floor manager, supervisor, and applicator see only their branch data
            feedback_filter['booking__branch'] = user.branch
        elif user.role == 'super_admin':
            # Super admin can filter by branch via query param
            branch_id = request.query_params.get('branch')
            if branch_id:
                feedback_filter['booking__branch_id'] = branch_id
        elif user.role == 'customer':
            # Customer sees only their own feedback
            feedback_filter['booking__customer__user'] = user
        
        feedback_stats = Feedback.objects.filter(**feedback_filter).aggregate(
            avg_rating=Avg('rating'),
            total_feedback=Count('id')
        )
        avg_rating = feedback_stats['avg_rating']
        total_feedback = feedback_stats['total_feedback']
        
        # Use bulk aggregation to get rating distribution in one query
        rating_counts = Feedback.objects.filter(**feedback_filter).values('rating').annotate(count=Count('rating'))
        
        # Initialize distribution with zeros
        rating_distribution = {i: 0 for i in range(1, 6)}
        
        # Update with actual counts
        for entry in rating_counts:
            rating = entry['rating']
            if rating in rating_distribution:
                rating_distribution[rating] = entry['count']
        
        return Response({
            'average_rating': avg_rating or 0,
            'total_feedback': total_feedback,
            'by_rating': rating_distribution  # Changed from rating_distribution to by_rating
        })
