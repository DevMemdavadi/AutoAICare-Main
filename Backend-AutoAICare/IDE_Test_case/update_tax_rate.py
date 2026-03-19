"""
Update all unpaid invoices to use 18% GST rate and recalculate totals.
"""
from billing.models import Invoice
from decimal import Decimal

def update_invoices_to_18_percent():
    # Get all unpaid invoices with 10% tax rate
    invoices_to_update = Invoice.objects.filter(tax_rate=10).exclude(status='paid')
    
    print(f"Found {invoices_to_update.count()} unpaid invoices with 10% GST\n")
    
    updated_count = 0
    for invoice in invoices_to_update:
        old_tax_rate = invoice.tax_rate
        old_tax_amount = invoice.tax_amount
        old_total = invoice.total_amount
        
        # Update tax rate to 18%
        invoice.tax_rate = Decimal('18.00')
        invoice.save(update_fields=['tax_rate'])
        
        # Recalculate totals
        invoice.calculate_totals()
        
        updated_count += 1
        
        print(f"✅ Invoice {invoice.invoice_number}")
        print(f"   Customer: {invoice.customer.user.name}")
        print(f"   Subtotal: ₹{invoice.subtotal}")
        print(f"   Tax: {old_tax_rate}% (₹{old_tax_amount}) → 18% (₹{invoice.tax_amount})")
        print(f"   Total: ₹{old_total} → ₹{invoice.total_amount}")
        print(f"   Difference: ₹{invoice.total_amount - old_total}")
        print(f"   Status: {invoice.status}")
        print()
    
    # Show summary of paid invoices (not updated)
    paid_invoices_10_percent = Invoice.objects.filter(tax_rate=10, status='paid')
    if paid_invoices_10_percent.exists():
        print(f"\n⚠️  Note: {paid_invoices_10_percent.count()} paid invoice(s) with 10% GST were NOT updated")
        print("   (Paid invoices are kept as-is for accounting accuracy)")
    
    print(f"\n✅ Summary:")
    print(f"   Updated: {updated_count} invoices")
    print(f"   New default tax rate: 18%")
    print(f"   All new invoices will use 18% GST")
    
    return updated_count

if __name__ == '__main__':
    update_invoices_to_18_percent()
