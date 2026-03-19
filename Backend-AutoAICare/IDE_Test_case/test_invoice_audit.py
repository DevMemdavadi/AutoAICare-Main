"""
Test script to audit invoices for calculation discrepancies.
"""
from billing.models import Invoice
from decimal import Decimal

def audit_invoices():
    invoices = Invoice.objects.all()
    discrepancies = []
    
    print(f"Auditing {invoices.count()} invoices...\n")
    
    for invoice in invoices:
        calculated_total = invoice.subtotal + invoice.tax_amount - invoice.discount_amount
        difference = abs(invoice.total_amount - calculated_total)
        
        # Flag if difference is more than 0.01 (1 paisa)
        if difference > Decimal('0.01'):
            discrepancies.append({
                'invoice_number': invoice.invoice_number,
                'customer': invoice.customer.user.name,
                'subtotal': invoice.subtotal,
                'tax_rate': invoice.tax_rate,
                'tax_amount': invoice.tax_amount,
                'discount': invoice.discount_amount,
                'stored_total': invoice.total_amount,
                'calculated_total': calculated_total,
                'difference': difference,
                'status': invoice.status
            })
    
    print(f"Total invoices: {invoices.count()}")
    print(f"Invoices with discrepancies: {len(discrepancies)}\n")
    
    if discrepancies:
        print("Discrepancies found:")
        print("-" * 100)
        for disc in discrepancies:
            print(f"Invoice: {disc['invoice_number']} | Customer: {disc['customer']}")
            print(f"  Subtotal: ₹{disc['subtotal']} | Tax ({disc['tax_rate']}%): ₹{disc['tax_amount']} | Discount: ₹{disc['discount']}")
            print(f"  Stored Total: ₹{disc['stored_total']} | Calculated: ₹{disc['calculated_total']} | Diff: ₹{disc['difference']}")
            print(f"  Status: {disc['status']}")
            print("-" * 100)
    else:
        print("✅ No discrepancies found! All invoices are correctly calculated.")
    
    return discrepancies

if __name__ == '__main__':
    audit_invoices()
