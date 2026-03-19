from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Avg, F, Q, DecimalField, ExpressionWrapper, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal

from jobcards.parts_catalog import Part
from jobcards.models import PartUsed, JobCard
from config.permissions import IsAdmin


class PartsAnalyticsView(APIView):
    """API endpoint for parts usage and inventory analytics."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        period = request.query_params.get('period', 'month')
        today = timezone.now().date()
        
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            except ValueError:
                start_date = today - timedelta(days=30)
                end_date = today
        else:
            end_date = today
            if period == 'week':
                start_date = today - timedelta(days=7)
            elif period == 'month':
                start_date = today - timedelta(days=30)
            else:  # year
                start_date = today - timedelta(days=365)

        # Apply branch / company filtering
        user = request.user
        branch_filter = {}          # For Part model (direct branch/company FK)
        jobcard_branch_filter = {}  # For PartUsed (reached via jobcard__branch__)
        part_company_filter = {}    # For Part company-level filter

        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
            jobcard_branch_filter['jobcard__branch'] = user.branch
        elif user.role == 'company_admin' and user.company:
            # company_admin sees all branches within their company
            branch_filter['company'] = user.company
            jobcard_branch_filter['jobcard__branch__company'] = user.company
            part_company_filter['company'] = user.company
        elif user.role == 'super_admin':
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
                jobcard_branch_filter['jobcard__branch_id'] = branch_id

        # 1. Most Used Parts (Top 10)
        # First annotate with calculated fields, then aggregate
        most_used_parts_qs = PartUsed.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **jobcard_branch_filter
        ).annotate(
            line_revenue=ExpressionWrapper(F('quantity') * F('price'), output_field=DecimalField(max_digits=10, decimal_places=2)),
            line_cost=ExpressionWrapper(F('quantity') * F('cost_price'), output_field=DecimalField(max_digits=10, decimal_places=2))
        )
        
        most_used_parts = most_used_parts_qs.values(
            'part__id',
            'part__name',
            'part_name'
        ).annotate(
            total_quantity=Sum('quantity'),
            usage_count=Count('id'),
            total_revenue=Sum('line_revenue'),
            total_cost=Sum('line_cost')
        ).order_by('-total_quantity')[:10]
        
        top_parts = []
        for part_data in most_used_parts:
            part_name = part_data['part__name'] or part_data['part_name']
            total_revenue = float(part_data['total_revenue'] or 0)
            total_cost = float(part_data['total_cost'] or 0)
            profit = total_revenue - total_cost
            
            top_parts.append({
                'part_id': part_data['part__id'],
                'name': part_name,
                'quantity_used': part_data['total_quantity'],
                'usage_count': part_data['usage_count'],
                'revenue': total_revenue,
                'cost': total_cost,
                'profit': profit,
                'profit_margin': round((profit / total_revenue * 100), 2) if total_revenue > 0 else 0
            })

        # 2. Parts Revenue Analysis
        parts_revenue_qs = PartUsed.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **jobcard_branch_filter
        ).annotate(
            line_revenue=ExpressionWrapper(F('quantity') * F('price'), output_field=DecimalField(max_digits=10, decimal_places=2)),
            line_cost=ExpressionWrapper(F('quantity') * F('cost_price'), output_field=DecimalField(max_digits=10, decimal_places=2))
        )
        
        parts_revenue = parts_revenue_qs.aggregate(
            total_revenue=Sum('line_revenue'),
            total_cost=Sum('line_cost'),
            total_parts_used=Sum('quantity')
        )
        
        total_revenue = float(parts_revenue['total_revenue'] or 0)
        total_cost = float(parts_revenue['total_cost'] or 0)
        total_profit = total_revenue - total_cost
        
        # 3. Low Stock Alerts
        low_stock_parts = []
        if user.role == 'super_admin':
            # Super admin sees all low stock parts
            parts_query = Part.objects.filter(is_active=True)
            if branch_filter.get('branch_id'):
                parts_query = parts_query.filter(
                    Q(branch_id=branch_filter['branch_id']) | Q(is_global=True)
                )
        elif user.role == 'company_admin' and user.company:
            # Company admin sees their company's parts + global parts
            parts_query = Part.objects.filter(
                Q(company=user.company) | Q(is_global=True),
                is_active=True
            )
        else:
            # Branch users see their branch parts + global parts
            parts_query = Part.objects.filter(
                Q(**branch_filter) | Q(is_global=True),
                is_active=True
            )
        
        low_stock = parts_query.filter(
            stock__lte=F('min_stock_level')
        ).order_by('stock')[:10]
        
        for part in low_stock:
            low_stock_parts.append({
                'id': part.id,
                'name': part.name,
                'sku': part.sku,
                'current_stock': part.stock,
                'min_stock_level': part.min_stock_level,
                'stock_status': part.stock_status,
                'unit': part.unit,
                'cost_price': float(part.cost_price),
                'selling_price': float(part.selling_price),
                'is_global': part.is_global,
                'branch_name': part.branch.name if part.branch else 'Global'
            })

        # 4. Parts by Category
        parts_by_category = Part.objects.filter(is_active=True)

        if user.role == 'super_admin':
            if branch_filter.get('branch_id'):
                parts_by_category = parts_by_category.filter(
                    Q(branch_id=branch_filter['branch_id']) | Q(is_global=True)
                )
        elif user.role == 'company_admin' and user.company:
            parts_by_category = parts_by_category.filter(
                Q(company=user.company) | Q(is_global=True)
            )
        else:
            parts_by_category = parts_by_category.filter(
                Q(**branch_filter) | Q(is_global=True)
            )
        
        # Annotate first, then aggregate
        category_stats = parts_by_category.annotate(
            stock_value=ExpressionWrapper(F('stock') * F('cost_price'), output_field=DecimalField(max_digits=10, decimal_places=2))
        ).values('category').annotate(
            count=Count('id'),
            total_stock=Sum('stock'),
            total_value=Sum('stock_value')
        ).order_by('-count')
        
        categories = []
        for cat in category_stats:
            categories.append({
                'category': cat['category'],
                'category_label': dict(Part.CATEGORY_CHOICES).get(cat['category'], cat['category']),
                'parts_count': cat['count'],
                'total_stock': cat['total_stock'],
                'inventory_value': float(cat['total_value'] or 0)
            })

        # 5. Parts Usage Trend
        usage_trend_qs = PartUsed.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **jobcard_branch_filter
        ).annotate(
            date=TruncDate('created_at'),
            line_revenue=ExpressionWrapper(F('quantity') * F('price'), output_field=DecimalField(max_digits=10, decimal_places=2))
        )
        
        usage_trend_data = usage_trend_qs.values('date').annotate(
            quantity=Sum('quantity'),
            revenue=Sum('line_revenue')
        ).order_by('date')
        
        usage_trend = []
        for item in usage_trend_data:
            usage_trend.append({
                'date': item['date'].strftime('%Y-%m-%d'),
                'quantity': item['quantity'],
                'revenue': float(item['revenue'] or 0)
            })

        # 6. Inventory Summary
        inventory_parts = parts_query.annotate(
            stock_value=ExpressionWrapper(F('stock') * F('cost_price'), output_field=DecimalField(max_digits=10, decimal_places=2))
        )
        
        inventory_summary = inventory_parts.aggregate(
            total_parts=Count('id'),
            total_stock_value=Sum('stock_value'),
            out_of_stock=Count('id', filter=Q(stock=0)),
            low_stock=Count('id', filter=Q(stock__lte=F('min_stock_level'), stock__gt=0))
        )

        # 7. Most Profitable Parts
        most_profitable_qs = PartUsed.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **jobcard_branch_filter
        ).annotate(
            line_revenue=ExpressionWrapper(F('quantity') * F('price'), output_field=DecimalField(max_digits=10, decimal_places=2)),
            line_cost=ExpressionWrapper(F('quantity') * F('cost_price'), output_field=DecimalField(max_digits=10, decimal_places=2)),
            line_profit=ExpressionWrapper(F('quantity') * (F('price') - F('cost_price')), output_field=DecimalField(max_digits=10, decimal_places=2))
        )
        
        most_profitable = most_profitable_qs.values(
            'part__id',
            'part__name',
            'part_name'
        ).annotate(
            total_revenue=Sum('line_revenue'),
            total_cost=Sum('line_cost'),
            profit=Sum('line_profit')
        ).order_by('-profit')[:10]
        
        profitable_parts = []
        for part_data in most_profitable:
            part_name = part_data['part__name'] or part_data['part_name']
            total_revenue = float(part_data['total_revenue'] or 0)
            total_cost = float(part_data['total_cost'] or 0)
            profit = float(part_data['profit'] or 0)
            
            profitable_parts.append({
                'part_id': part_data['part__id'],
                'name': part_name,
                'revenue': total_revenue,
                'cost': total_cost,
                'profit': profit,
                'profit_margin': round((profit / total_revenue * 100), 2) if total_revenue > 0 else 0
            })

        return Response({
            'summary': {
                'total_revenue': total_revenue,
                'total_cost': total_cost,
                'total_profit': total_profit,
                'profit_margin': round((total_profit / total_revenue * 100), 2) if total_revenue > 0 else 0,
                'total_parts_used': parts_revenue['total_parts_used'] or 0
            },
            'inventory': {
                'total_parts': inventory_summary['total_parts'],
                'total_value': float(inventory_summary['total_stock_value'] or 0),
                'out_of_stock': inventory_summary['out_of_stock'],
                'low_stock': inventory_summary['low_stock']
            },
            'top_used_parts': top_parts,
            'most_profitable_parts': profitable_parts,
            'low_stock_alerts': low_stock_parts,
            'parts_by_category': categories,
            'usage_trend': usage_trend
        })
