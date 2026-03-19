# invoices/services/pdf/invoice_template.py

from reportlab.platypus import Spacer, Table, TableStyle
from reportlab.lib.units import inch

from .components import (
    TitleBarComponent,
    HeaderComponent,
    BillToComponent,
    ItemsTableComponent,
    TotalsComponent,
    AmountInWordsComponent,
    BankAndSignatoryComponent,
    NotesComponent,
    FooterComponent,
)
from .base import PDFStyles


class InvoiceTemplate:
    """Main invoice template that orchestrates all components."""

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build_story(self):
        """Build the complete PDF story (content flow)."""
        story = []

        # 1. Title bar: TAX INVOICE | ORIGINAL FOR RECIPIENT badge
        story.append(TitleBarComponent(self.invoice).build())
        story.append(Spacer(1, 4))

        # 2. Header: Company logo/info (left) + Invoice No/Date/Vehicle (right)
        story.append(HeaderComponent(self.invoice).build())

        # 3. Bill To / Ship To (two-column)
        story.append(BillToComponent(self.invoice).build())
        story.append(Spacer(1, 6))

        # 4. Line items table (with TAX column)
        story.append(ItemsTableComponent(self.invoice).build())
        story.append(Spacer(1, 6))

        # 5. Totals (right-aligned) + GST breakdown table
        totals_elements = TotalsComponent(self.invoice).build()
        story.extend(totals_elements)
        story.append(Spacer(1, 6))

        # 6. Amount in words
        story.append(AmountInWordsComponent(self.invoice).build())
        story.append(Spacer(1, 8))

        # 7. Bank details + Authorised Signatory
        story.append(BankAndSignatoryComponent(self.invoice).build())
        story.append(Spacer(1, 6))

        # 8. Notes (if any)
        notes_elements = NotesComponent(self.invoice).build()
        if notes_elements:
            story.extend(notes_elements)
            story.append(Spacer(1, 4))

        # 9. Footer
        story.append(FooterComponent(self.invoice).build())

        return story

    def on_page(self, canvas, doc):
        """Called on each page — adds DRAFT watermark if needed."""
        if self.invoice.status == "draft":
            canvas.saveState()
            canvas.setFont("Helvetica-Bold", 72)
            canvas.setFillColorRGB(0.9, 0.9, 0.9)
            canvas.setFillAlpha(0.25)
            canvas.translate(300, 400)
            canvas.rotate(35)
            canvas.drawCentredString(0, 0, "DRAFT")
            canvas.restoreState()
