"""
Tax compliance service - Business logic for tax calculations
"""
from decimal import Decimal
from django.db.models import Sum
from ..models import TaxSlab, TaxDeclaration, Form16, Payroll


class TaxService:
    """Service class for tax compliance operations"""
    
    @staticmethod
    def calculate_tds(annual_income, tax_declaration=None, financial_year='2024-25'):
        """
        Calculate TDS based on income and tax declaration
        
        Args:
            annual_income: Annual gross income
            tax_declaration: TaxDeclaration object (optional)
            financial_year: Financial year for tax slabs
        
        Returns:
            dict with tax calculation details
        """
        regime = 'new'
        total_deductions = Decimal('0')
        
        if tax_declaration:
            regime = tax_declaration.regime
            total_deductions = tax_declaration.total_deductions
        else:
            # Default standard deduction for new regime
            total_deductions = Decimal('50000')
        
        # Calculate taxable income
        taxable_income = annual_income - total_deductions
        
        # Get tax slabs
        tax_slabs = TaxSlab.objects.filter(
            regime=regime,
            financial_year=financial_year,
            is_active=True
        ).order_by('min_income')
        
        # Calculate tax
        total_tax = Decimal('0')
        slab_wise_tax = []
        
        for slab in tax_slabs:
            if taxable_income <= 0:
                break
            
            # Determine taxable amount in this slab
            slab_min = slab.min_income
            slab_max = slab.max_income if slab.max_income else Decimal('999999999')
            
            if taxable_income > slab_min:
                taxable_in_slab = min(taxable_income - slab_min, slab_max - slab_min)
                tax_in_slab = (taxable_in_slab * slab.tax_rate) / Decimal('100')
                total_tax += tax_in_slab
                
                slab_wise_tax.append({
                    'slab': f"₹{slab_min} - ₹{slab_max if slab.max_income else 'Above'}",
                    'rate': float(slab.tax_rate),
                    'taxable_amount': float(taxable_in_slab),
                    'tax': float(tax_in_slab)
                })
        
        # Add education cess (4%)
        education_cess = total_tax * Decimal('0.04')
        total_tax_liability = total_tax + education_cess
        
        # Calculate monthly TDS
        monthly_tds = total_tax_liability / Decimal('12')
        
        return {
            'regime': regime,
            'annual_income': float(annual_income),
            'total_deductions': float(total_deductions),
            'taxable_income': float(taxable_income),
            'tax_before_cess': float(total_tax),
            'education_cess': float(education_cess),
            'total_tax_liability': float(total_tax_liability),
            'monthly_tds': float(monthly_tds),
            'slab_wise_breakdown': slab_wise_tax
        }
    
    @staticmethod
    def calculate_monthly_tds(employee, month, year):
        """Calculate TDS for a specific month"""
        # Get employee's annual salary
        salary_structure = employee.salary_structure
        monthly_gross = salary_structure.calculate_gross_salary()
        annual_gross = monthly_gross * Decimal('12')
        
        # Get tax declaration for the financial year
        financial_year = TaxService._get_financial_year(month, year)
        tax_declaration = TaxDeclaration.objects.filter(
            employee=employee,
            financial_year=financial_year,
            status='verified'
        ).first()
        
        # Calculate TDS
        tds_calc = TaxService.calculate_tds(annual_gross, tax_declaration, financial_year)
        
        return tds_calc['monthly_tds']
    
    @staticmethod
    def _get_financial_year(month, year):
        """Get financial year string (e.g., '2024-25')"""
        if month >= 4:  # April onwards
            return f"{year}-{str(year + 1)[-2:]}"
        else:  # Jan-March
            return f"{year - 1}-{str(year)[-2:]}"
    
    @staticmethod
    def generate_form16(employee, financial_year):
        """Generate Form 16 for an employee"""
        from django.db import transaction
        
        # Parse financial year
        start_year = int(financial_year.split('-')[0])
        
        # Get all payrolls for the financial year (April to March)
        payrolls = Payroll.objects.filter(
            employee=employee,
            year__in=[start_year, start_year + 1],
            status='paid'
        ).filter(
            models.Q(year=start_year, month__gte=4) |
            models.Q(year=start_year + 1, month__lte=3)
        )
        
        # Calculate totals
        gross_salary = Decimal('0')
        allowances = Decimal('0')
        total_tds = Decimal('0')
        
        for payroll in payrolls:
            gross_salary += payroll.gross_salary
            allowances += payroll.allowances
            total_tds += payroll.tds_amount
        
        # Get tax declaration
        tax_declaration = TaxDeclaration.objects.filter(
            employee=employee,
            financial_year=financial_year
        ).first()
        
        chapter_via_deductions = Decimal('0')
        if tax_declaration:
            chapter_via_deductions = tax_declaration.total_deductions
        
        # Calculate taxable income
        total_salary = gross_salary + allowances
        standard_deduction = Decimal('50000')
        total_deductions = standard_deduction
        taxable_income = total_salary - total_deductions - chapter_via_deductions
        
        # Calculate tax
        tds_calc = TaxService.calculate_tds(
            total_salary,
            tax_declaration,
            financial_year
        )
        
        # Create Form 16
        with transaction.atomic():
            form16, created = Form16.objects.update_or_create(
                employee=employee,
                financial_year=financial_year,
                defaults={
                    'employer_tan': 'DELC12345D',  # TODO: Get from settings
                    'employer_pan': 'AABCC1234D',  # TODO: Get from settings
                    'employee_pan': employee.email[:10].upper(),  # TODO: Get actual PAN
                    'gross_salary': gross_salary,
                    'allowances': allowances,
                    'perquisites': Decimal('0'),
                    'total_salary': total_salary,
                    'standard_deduction': standard_deduction,
                    'professional_tax': Decimal('0'),
                    'other_deductions': Decimal('0'),
                    'total_deductions': total_deductions,
                    'chapter_via_deductions': chapter_via_deductions,
                    'taxable_income': Decimal(str(tds_calc['taxable_income'])),
                    'tax_on_income': Decimal(str(tds_calc['tax_before_cess'])),
                    'education_cess': Decimal(str(tds_calc['education_cess'])),
                    'total_tax_liability': Decimal(str(tds_calc['total_tax_liability'])),
                    'tds_deducted': total_tds,
                    'net_tax_payable': Decimal(str(tds_calc['total_tax_liability'])) - total_tds,
                    'is_issued': False
                }
            )
        
        return form16
    
    @staticmethod
    def generate_pf_esi_report(start_date, end_date, branch=None):
        """Generate PF/ESI report for a period"""
        from django.db.models import Q
        
        # Get all payrolls in the period
        payrolls = Payroll.objects.filter(
            status='paid',
            payment_date__gte=start_date,
            payment_date__lte=end_date
        )
        
        if branch:
            payrolls = payrolls.filter(employee__branch=branch)
        
        report_data = []
        total_pf = Decimal('0')
        total_esi = Decimal('0')
        
        for payroll in payrolls.select_related('employee', 'salary_structure'):
            salary_structure = payroll.salary_structure
            
            pf_amount = salary_structure.pf_deduction if salary_structure else Decimal('0')
            esi_amount = salary_structure.esi_deduction if salary_structure else Decimal('0')
            
            total_pf += pf_amount
            total_esi += esi_amount
            
            report_data.append({
                'employee_name': payroll.employee.name,
                'employee_email': payroll.employee.email,
                'month': payroll.month,
                'year': payroll.year,
                'gross_salary': float(payroll.gross_salary),
                'pf_deduction': float(pf_amount),
                'esi_deduction': float(esi_amount),
                'net_salary': float(payroll.net_salary)
            })
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_employees': len(report_data),
                'total_pf': float(total_pf),
                'total_esi': float(total_esi),
                'total_gross_salary': float(sum(Decimal(str(r['gross_salary'])) for r in report_data))
            },
            'details': report_data
        }
    
    @staticmethod
    def compare_tax_regimes(annual_income, tax_declaration):
        """Compare tax liability between old and new regimes"""
        # Calculate for old regime
        old_declaration = tax_declaration
        old_declaration.regime = 'old'
        old_tax = TaxService.calculate_tds(
            annual_income,
            old_declaration,
            tax_declaration.financial_year
        )
        
        # Calculate for new regime (only standard deduction)
        new_declaration = TaxDeclaration(
            regime='new',
            financial_year=tax_declaration.financial_year,
            standard_deduction=Decimal('50000')
        )
        new_tax = TaxService.calculate_tds(
            annual_income,
            new_declaration,
            tax_declaration.financial_year
        )
        
        savings = Decimal(str(old_tax['total_tax_liability'])) - Decimal(str(new_tax['total_tax_liability']))
        
        return {
            'old_regime': old_tax,
            'new_regime': new_tax,
            'savings_with_new_regime': float(savings),
            'recommended_regime': 'new' if savings > 0 else 'old'
        }


# Import models at the bottom to avoid circular imports
from django.db import models
