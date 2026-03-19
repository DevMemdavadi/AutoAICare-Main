import datetime
from .models import Invoice

def generate_invoice_number():
    """
    Generate a unique invoice number in the format INV-YYYYMMDD-XXXX.
    XXXX is a sequence number that resets daily.
    """
    today = datetime.date.today()
    date_str = today.strftime('%Y%m%d')
    prefix = f"INV-{date_str}-"
    
    # Get the last invoice created today
    last_invoice = Invoice.objects.filter(invoice_number__startswith=prefix).order_by('invoice_number').last()
    
    if last_invoice:
        # Extract the sequence number
        try:
            last_sequence = int(last_invoice.invoice_number.split('-')[-1])
            new_sequence = last_sequence + 1
        except ValueError:
            new_sequence = 1
    else:
        new_sequence = 1
        
    return f"{prefix}{new_sequence:04d}"
