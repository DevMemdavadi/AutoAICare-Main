# invoices/services/pdf/builder.py

from io import BytesIO
from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch

from .invoice_template import InvoiceTemplate


class InvoicePDFBuilder:
    """Builds invoice PDF using a modular template system."""
    
    def __init__(self):
        self.page_size = A4  # A4 is taller than letter (297mm vs 279mm)
        self.margins = {
            "left": 0.5 * inch,
            "right": 0.5 * inch,
            "top": 0.5 * inch,
            "bottom": 0.5 * inch,
        }
    
    def build(self, invoice):
        """Return PDF bytes generated from invoice."""
        buffer = BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            leftMargin=self.margins["left"],
            rightMargin=self.margins["right"],
            topMargin=self.margins["top"],
            bottomMargin=self.margins["bottom"],
        )
        
        template = InvoiceTemplate(invoice)
        story = template.build_story()
        
        doc.build(
            story,
            onFirstPage=template.on_page,
            onLaterPages=template.on_page
        )
        
        pdf = buffer.getvalue()
        buffer.close()
        return pdf

