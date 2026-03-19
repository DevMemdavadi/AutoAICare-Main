"""
Comprehensive Accounting System Test Script
Tests all accounting endpoints and identifies issues
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from accounting.models import (
    Expense, Transaction, Vendor, EmployeeSalaryStructure,
    Payroll, PettyCash, RecurringExpense, BranchBudget
)
from billing.models import Invoice
from branches.models import Branch

User = get_user_model()


class AccountingSystemTester:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.successes = []
        
    def log_issue(self, category, message):
        self.issues.append(f"❌ [{category}] {message}")
        
    def log_warning(self, category, message):
        self.warnings.append(f"⚠️  [{category}] {message}")
        
    def log_success(self, category, message):
        self.successes.append(f"✅ [{category}] {message}")
    
    def test_models_exist(self):
        """Test that all accounting models are accessible"""
        print("\n" + "="*60)
        print("TESTING: Model Accessibility")
        print("="*60)
        
        models = [
            ('Expense', Expense),
            ('Transaction', Transaction),
            ('Vendor', Vendor),
            ('EmployeeSalaryStructure', EmployeeSalaryStructure),
            ('Payroll', Payroll),
            ('PettyCash', PettyCash),
            ('RecurringExpense', RecurringExpense),
            ('BranchBudget', BranchBudget),
        ]
        
        for name, model in models:
            try:
                count = model.objects.count()
                self.log_success("Models", f"{name} model accessible ({count} records)")
            except Exception as e:
                self.log_issue("Models", f"{name} model error: {str(e)}")
    
    def test_data_integrity(self):
        """Test data integrity and relationships"""
        print("\n" + "="*60)
        print("TESTING: Data Integrity")
        print("="*60)
        
        # Test Expenses
        expenses = Expense.objects.all()
        expenses_without_branch = expenses.filter(branch__isnull=True).count()
        expenses_without_recorded_by = expenses.filter(recorded_by__isnull=True).count()
        
        if expenses_without_branch > 0:
            self.log_warning("Expenses", f"{expenses_without_branch} expenses without branch assignment")
        else:
            self.log_success("Expenses", "All expenses have branch assignment")
            
        if expenses_without_recorded_by > 0:
            self.log_warning("Expenses", f"{expenses_without_recorded_by} expenses without recorded_by")
        else:
            self.log_success("Expenses", "All expenses have recorded_by")
        
        # Test Transactions
        transactions = Transaction.objects.all()
        orphan_transactions = transactions.filter(invoice__isnull=True, expense__isnull=True).count()
        
        if orphan_transactions > 0:
            self.log_warning("Transactions", f"{orphan_transactions} transactions not linked to invoice or expense")
        else:
            self.log_success("Transactions", "All transactions properly linked")
        
        # Test Vendors
        vendors = Vendor.objects.all()
        vendors_with_expenses = vendors.annotate(
            expense_count=Count('expenses')
        ).filter(expense_count__gt=0).count()
        
        self.log_success("Vendors", f"{vendors_with_expenses}/{vendors.count()} vendors have expenses")
        
        # Test Payroll
        payrolls = Payroll.objects.all()
        payrolls_without_structure = payrolls.filter(salary_structure__isnull=True).count()
        
        if payrolls_without_structure > 0:
            self.log_warning("Payroll", f"{payrolls_without_structure} payrolls without salary structure")
        else:
            self.log_success("Payroll", "All payrolls have salary structure")
    
    def test_financial_calculations(self):
        """Test financial calculations and aggregations"""
        print("\n" + "="*60)
        print("TESTING: Financial Calculations")
        print("="*60)
        
        # Test income calculation
        try:
            total_income = Transaction.objects.filter(
                transaction_type='income'
            ).aggregate(total=Sum('amount'))['total'] or 0
            self.log_success("Calculations", f"Total Income: ₹{total_income:,.2f}")
        except Exception as e:
            self.log_issue("Calculations", f"Income calculation failed: {str(e)}")
        
        # Test expense calculation
        try:
            total_expense = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0
            self.log_success("Calculations", f"Total Expenses: ₹{total_expense:,.2f}")
        except Exception as e:
            self.log_issue("Calculations", f"Expense calculation failed: {str(e)}")
        
        # Test net profit
        try:
            total_income = Transaction.objects.filter(
                transaction_type='income'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            total_expense = Transaction.objects.filter(
                transaction_type='expense'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            net_profit = total_income - total_expense
            self.log_success("Calculations", f"Net Profit: ₹{net_profit:,.2f}")
        except Exception as e:
            self.log_issue("Calculations", f"Net profit calculation failed: {str(e)}")
        
        # Test receivables
        try:
            receivables = Invoice.objects.filter(
                status__in=['pending', 'partial']
            ).aggregate(
                total=Sum('total_amount')
            )['total'] or 0
            self.log_success("Calculations", f"Receivables: ₹{receivables:,.2f}")
        except Exception as e:
            self.log_issue("Calculations", f"Receivables calculation failed: {str(e)}")
        
        # Test pending salaries
        try:
            pending_salaries = Payroll.objects.filter(
                status__in=['pending', 'approved']
            ).aggregate(total=Sum('net_salary'))['total'] or 0
            self.log_success("Calculations", f"Pending Salaries: ₹{pending_salaries:,.2f}")
        except Exception as e:
            self.log_issue("Calculations", f"Pending salaries calculation failed: {str(e)}")
    
    def test_expense_categories(self):
        """Test expense category breakdown"""
        print("\n" + "="*60)
        print("TESTING: Expense Categories")
        print("="*60)
        
        try:
            category_breakdown = Expense.objects.values(
                'category'
            ).annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('-total')
            
            if category_breakdown:
                for item in category_breakdown:
                    category_display = dict(Expense.CATEGORY_CHOICES).get(
                        item['category'], item['category']
                    )
                    self.log_success(
                        "Categories",
                        f"{category_display}: ₹{item['total']:,.2f} ({item['count']} expenses)"
                    )
            else:
                self.log_warning("Categories", "No expense data available")
        except Exception as e:
            self.log_issue("Categories", f"Category breakdown failed: {str(e)}")
    
    def test_branch_wise_data(self):
        """Test branch-wise financial data"""
        print("\n" + "="*60)
        print("TESTING: Branch-wise Data")
        print("="*60)
        
        try:
            branches = Branch.objects.all()
            
            for branch in branches:
                # Branch expenses
                branch_expenses = Expense.objects.filter(
                    branch=branch
                ).aggregate(total=Sum('amount'))['total'] or 0
                
                # Branch income (from transactions)
                branch_income = Transaction.objects.filter(
                    branch=branch,
                    transaction_type='income'
                ).aggregate(total=Sum('amount'))['total'] or 0
                
                net = branch_income - branch_expenses
                
                self.log_success(
                    "Branches",
                    f"{branch.name}: Income ₹{branch_income:,.2f}, Expenses ₹{branch_expenses:,.2f}, Net ₹{net:,.2f}"
                )
        except Exception as e:
            self.log_issue("Branches", f"Branch-wise calculation failed: {str(e)}")
    
    def test_petty_cash_balance(self):
        """Test petty cash balance calculations"""
        print("\n" + "="*60)
        print("TESTING: Petty Cash")
        print("="*60)
        
        try:
            branches = Branch.objects.all()
            
            for branch in branches:
                latest_transaction = PettyCash.objects.filter(
                    branch=branch
                ).order_by('-date', '-created_at').first()
                
                if latest_transaction:
                    self.log_success(
                        "Petty Cash",
                        f"{branch.name}: Current Balance ₹{latest_transaction.balance_after:,.2f}"
                    )
                else:
                    self.log_warning("Petty Cash", f"{branch.name}: No petty cash transactions")
        except Exception as e:
            self.log_issue("Petty Cash", f"Petty cash balance failed: {str(e)}")
    
    def test_recurring_expenses(self):
        """Test recurring expenses"""
        print("\n" + "="*60)
        print("TESTING: Recurring Expenses")
        print("="*60)
        
        try:
            active_recurring = RecurringExpense.objects.filter(is_active=True)
            total_monthly_recurring = 0
            
            for recurring in active_recurring:
                # Calculate monthly equivalent
                if recurring.frequency == 'monthly':
                    monthly_amount = recurring.amount
                elif recurring.frequency == 'yearly':
                    monthly_amount = recurring.amount / 12
                elif recurring.frequency == 'quarterly':
                    monthly_amount = recurring.amount / 3
                elif recurring.frequency == 'weekly':
                    monthly_amount = recurring.amount * 4
                elif recurring.frequency == 'daily':
                    monthly_amount = recurring.amount * 30
                else:
                    monthly_amount = 0
                
                total_monthly_recurring += monthly_amount
                
                self.log_success(
                    "Recurring",
                    f"{recurring.title}: ₹{recurring.amount:,.2f} ({recurring.get_frequency_display()})"
                )
            
            self.log_success(
                "Recurring",
                f"Total Monthly Recurring: ₹{total_monthly_recurring:,.2f}"
            )
        except Exception as e:
            self.log_issue("Recurring", f"Recurring expenses test failed: {str(e)}")
    
    def test_salary_structures(self):
        """Test salary structures and payroll"""
        print("\n" + "="*60)
        print("TESTING: Salary & Payroll")
        print("="*60)
        
        try:
            # Test salary structures
            structures = EmployeeSalaryStructure.objects.filter(is_active=True)
            total_monthly_salary = 0
            
            for structure in structures:
                net_salary = structure.calculate_net_salary()
                total_monthly_salary += net_salary
                
                self.log_success(
                    "Salary",
                    f"{structure.employee.name}: Base ₹{structure.base_salary:,.2f}, Net ₹{net_salary:,.2f}"
                )
            
            self.log_success(
                "Salary",
                f"Total Monthly Salary Obligation: ₹{total_monthly_salary:,.2f}"
            )
            
            # Test payroll records
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            current_payrolls = Payroll.objects.filter(
                month=current_month,
                year=current_year
            )
            
            if current_payrolls.exists():
                self.log_success(
                    "Payroll",
                    f"Current month payroll: {current_payrolls.count()} records"
                )
            else:
                self.log_warning(
                    "Payroll",
                    f"No payroll records for current month ({current_month}/{current_year})"
                )
        except Exception as e:
            self.log_issue("Salary", f"Salary/Payroll test failed: {str(e)}")
    
    def test_invoice_integration(self):
        """Test invoice integration with accounting"""
        print("\n" + "="*60)
        print("TESTING: Invoice Integration")
        print("="*60)
        
        try:
            # Check if invoices create transactions
            invoices_with_transactions = Invoice.objects.annotate(
                transaction_count=Count('transactions')
            ).filter(transaction_count__gt=0).count()
            
            total_invoices = Invoice.objects.count()
            
            if total_invoices > 0:
                percentage = (invoices_with_transactions / total_invoices) * 100
                self.log_success(
                    "Integration",
                    f"{invoices_with_transactions}/{total_invoices} invoices have transactions ({percentage:.1f}%)"
                )
                
                if percentage < 50:
                    self.log_warning(
                        "Integration",
                        "Low invoice-transaction integration rate"
                    )
            else:
                self.log_warning("Integration", "No invoices found")
            
            # Check payment status consistency
            paid_invoices = Invoice.objects.filter(status='paid')
            for invoice in paid_invoices[:5]:  # Check first 5
                transactions = invoice.transactions.filter(transaction_type='income')
                if not transactions.exists():
                    self.log_warning(
                        "Integration",
                        f"Invoice {invoice.invoice_number} marked paid but no income transaction"
                    )
        except Exception as e:
            self.log_issue("Integration", f"Invoice integration test failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("\n" + "="*60)
        print("ACCOUNTING SYSTEM COMPREHENSIVE TEST")
        print("="*60)
        print(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run all tests
        self.test_models_exist()
        self.test_data_integrity()
        self.test_financial_calculations()
        self.test_expense_categories()
        self.test_branch_wise_data()
        self.test_petty_cash_balance()
        self.test_recurring_expenses()
        self.test_salary_structures()
        self.test_invoice_integration()
        
        # Generate summary report
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        print(f"\n✅ Successes: {len(self.successes)}")
        for success in self.successes:
            print(f"  {success}")
        
        if self.warnings:
            print(f"\n⚠️  Warnings: {len(self.warnings)}")
            for warning in self.warnings:
                print(f"  {warning}")
        
        if self.issues:
            print(f"\n❌ Issues: {len(self.issues)}")
            for issue in self.issues:
                print(f"  {issue}")
        
        print("\n" + "="*60)
        print("RECOMMENDATIONS")
        print("="*60)
        
        # Generate recommendations based on findings
        recommendations = []
        
        if any("without branch" in w for w in self.warnings):
            recommendations.append("• Assign branches to all expenses for proper tracking")
        
        if any("without recorded_by" in w for w in self.warnings):
            recommendations.append("• Ensure all expenses have recorded_by field populated")
        
        if any("not linked" in w for w in self.warnings):
            recommendations.append("• Link orphan transactions to invoices or expenses")
        
        if any("integration rate" in w for w in self.warnings):
            recommendations.append("• Improve invoice-transaction integration via signals")
        
        if any("No payroll" in w for w in self.warnings):
            recommendations.append("• Generate payroll for current month")
        
        if recommendations:
            for rec in recommendations:
                print(rec)
        else:
            print("✅ No critical issues found!")
        
        print("\n" + "="*60)
        print(f"Test Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)


if __name__ == '__main__':
    tester = AccountingSystemTester()
    tester.run_all_tests()
