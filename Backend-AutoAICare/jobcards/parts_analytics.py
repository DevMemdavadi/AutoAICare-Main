from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F, Avg
from django.db.models.functions import TruncDate
from datetime import datetime, timedelta
from jobcards.models import PartUsed
from jobcards.parts_catalog import Part


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parts_usage_analytics(request):
    """
    Get comprehensive parts usage analytics.
    Query params:
    - days: Number of days to analyze (default: 30)
    - branch: Filter by branch ID
    """
    days = int(request.query_params.get('days', 30))
    branch_id = request.query_params.get('branch')
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Base queryset
    parts_used_qs = PartUsed.objects.filter(
        created_at__gte=start_date,
        created_at__lte=end_date
    ).select_related('part', 'jobcard', 'jobcard__branch')
    
    # Filter by branch if specified
    if branch_id:
        parts_used_qs = parts_used_qs.filter(jobcard__branch_id=branch_id)
    
    # Top 10 most used parts (by quantity)
    top_parts_by_quantity = parts_used_qs.values(
        'part_name',
        'part__sku',
        'part__unit'
    ).annotate(
        total_quantity=Sum('quantity'),
        times_used=Count('id'),
        total_revenue=Sum(F('quantity') * F('price')),
        total_cost=Sum(F('quantity') * F('cost_price'))
    ).order_by('-total_quantity')[:10]
    
    # Top 10 most profitable parts
    top_parts_by_profit = parts_used_qs.values(
        'part_name',
        'part__sku'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('price')),
        total_cost=Sum(F('quantity') * F('cost_price')),
        profit=Sum(F('quantity') * (F('price') - F('cost_price'))),
        times_used=Count('id')
    ).order_by('-profit')[:10]
    
    # Parts usage by category
    parts_by_category = parts_used_qs.filter(
        part__isnull=False
    ).values(
        'part__category'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('price')),
        parts_count=Count('id', distinct=True)
    ).order_by('-total_revenue')
    
    # Daily usage trend
    daily_usage = parts_used_qs.annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        parts_used=Count('id'),
        total_value=Sum(F('quantity') * F('price')),
        total_quantity=Sum('quantity')
    ).order_by('date')
    
    # Parts running low that are frequently used
    frequently_used_parts = parts_used_qs.filter(
        part__isnull=False
    ).values('part_id').annotate(
        usage_count=Count('id')
    ).filter(usage_count__gte=3)  # Used at least 3 times
    
    frequently_used_part_ids = [item['part_id'] for item in frequently_used_parts]
    
    critical_low_stock = Part.objects.filter(
        id__in=frequently_used_part_ids,
        stock__lte=F('min_stock_level'),
        is_active=True
    ).values(
        'id', 'name', 'sku', 'stock', 'min_stock_level', 'unit'
    ).annotate(
        usage_count=Count('usage_records')
    ).order_by('stock')[:10]
    
    # Overall statistics
    total_parts_used = parts_used_qs.aggregate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('price')),
        total_cost=Sum(F('quantity') * F('cost_price')),
        unique_parts=Count('part_name', distinct=True),
        total_transactions=Count('id')
    )
    
    # Calculate profit
    if total_parts_used['total_revenue'] and total_parts_used['total_cost']:
        total_parts_used['total_profit'] = (
            total_parts_used['total_revenue'] - total_parts_used['total_cost']
        )
        total_parts_used['profit_margin_percent'] = (
            (total_parts_used['total_profit'] / total_parts_used['total_revenue']) * 100
        )
    else:
        total_parts_used['total_profit'] = 0
        total_parts_used['profit_margin_percent'] = 0
    
    return Response({
        'period': {
            'start_date': start_date.date(),
            'end_date': end_date.date(),
            'days': days
        },
        'summary': total_parts_used,
        'top_parts_by_quantity': list(top_parts_by_quantity),
        'top_parts_by_profit': list(top_parts_by_profit),
        'usage_by_category': list(parts_by_category),
        'daily_trend': list(daily_usage),
        'critical_low_stock': list(critical_low_stock)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def part_detail_analytics(request, part_id):
    """
    Get detailed analytics for a specific part.
    """
    try:
        part = Part.objects.get(id=part_id)
    except Part.DoesNotExist:
        return Response({'error': 'Part not found'}, status=404)
    
    days = int(request.query_params.get('days', 90))
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Usage history
    usage_history = PartUsed.objects.filter(
        part=part,
        created_at__gte=start_date
    ).select_related('jobcard', 'jobcard__booking').values(
        'created_at',
        'quantity',
        'price',
        'jobcard__id',
        'jobcard__booking__customer__user__name'
    ).order_by('-created_at')[:50]
    
    # Usage statistics
    usage_stats = PartUsed.objects.filter(
        part=part,
        created_at__gte=start_date
    ).aggregate(
        total_quantity=Sum('quantity'),
        times_used=Count('id'),
        avg_quantity_per_use=Avg('quantity'),
        total_revenue=Sum(F('quantity') * F('price')),
        total_cost=Sum(F('quantity') * F('cost_price'))
    )
    
    # Calculate average usage per month
    months = days / 30
    if usage_stats['total_quantity'] and months > 0:
        usage_stats['avg_monthly_usage'] = usage_stats['total_quantity'] / months
        # Estimate when stock will run out
        if part.stock > 0 and usage_stats['avg_monthly_usage'] > 0:
            months_until_empty = part.stock / usage_stats['avg_monthly_usage']
            usage_stats['estimated_days_until_empty'] = int(months_until_empty * 30)
        else:
            usage_stats['estimated_days_until_empty'] = 0
    else:
        usage_stats['avg_monthly_usage'] = 0
        usage_stats['estimated_days_until_empty'] = 0
    
    # Suggested reorder quantity
    if usage_stats['avg_monthly_usage']:
        # Suggest 2 months worth of stock
        suggested_reorder = max(
            int(usage_stats['avg_monthly_usage'] * 2),
            part.min_stock_level * 2
        )
    else:
        suggested_reorder = part.min_stock_level * 2
    
    return Response({
        'part': {
            'id': part.id,
            'name': part.name,
            'sku': part.sku,
            'current_stock': part.stock,
            'min_stock_level': part.min_stock_level,
            'unit': part.unit,
            'cost_price': str(part.cost_price),
            'selling_price': str(part.selling_price)
        },
        'usage_stats': usage_stats,
        'suggested_reorder_quantity': suggested_reorder,
        'recent_usage': list(usage_history)
    })
