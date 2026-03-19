import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from billing.models import Invoice
from billing.services.pdf.builder import InvoicePDFBuilder

# Get the first invoice
invoice = Invoice.objects.first()
if invoice:
    print(f"Found invoice: {invoice.invoice_number}")
    print(f"Customer: {invoice.customer.user.name if invoice.customer else 'N/A'}")
    print(f"Total: ₹{invoice.total_amount}")
    
    # Generate PDF
    builder = InvoicePDFBuilder()
    pdf_bytes = builder.build(invoice)
    
    # Save to file
    pdf_path = f"test_invoice_{invoice.invoice_number}.pdf"
    with open(pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    
    print(f"\nPDF generated successfully at: {os.path.abspath(pdf_path)}")
else:
    print("No invoices found in database")
