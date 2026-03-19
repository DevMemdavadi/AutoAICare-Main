# invoices/services/pdf/components.py

from decimal import Decimal

from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from .base import PDFStyles

# Default HSN/SAC code for car care / detailing services
DEFAULT_HSN = "998714"


def _get_company_data(invoice):
    """
    Returns a unified dict with all the company info needed for PDF rendering.

    Priority:
      - Branding / logo / address / GST → config.models.CompanySettings (global singleton)
      - Bank details (bank_name, account_number, ifsc_code, account_holder_name)
          → companies.models.CompanySettings (per-company, linked via invoice.company)
            with fallback to config.models.CompanySettings if not set there
    """
    from config.models import CompanySettings as GlobalSettings

    global_cfg = GlobalSettings.load()

    # Per-company bank details
    bank_name = ""
    account_number = ""
    ifsc_code = ""
    account_holder_name = ""
    branch_address = getattr(global_cfg, "branch_address", "")
    footer_message = getattr(global_cfg, "footer_message", "****THANK YOU. PLEASE VISIT AGAIN****")

    try:
        if invoice.company and hasattr(invoice.company, "company_settings"):
            cs = invoice.company.company_settings
            bank_name = cs.bank_name or ""
            account_number = cs.account_number or ""
            ifsc_code = cs.ifsc_code or ""
            account_holder_name = cs.account_holder_name or ""
            if hasattr(cs, "invoice_footer") and cs.invoice_footer:
                footer_message = cs.invoice_footer
    except Exception:
        pass

    # Fall back to global singleton if per-company fields are still blank
    if not bank_name:
        bank_name = getattr(global_cfg, "bank_name", "") or ""
    if not account_number:
        account_number = getattr(global_cfg, "account_number", "") or ""
    if not ifsc_code:
        ifsc_code = getattr(global_cfg, "ifsc_code", "") or ""
    if not account_holder_name:
        account_holder_name = getattr(global_cfg, "account_holder_name", "") or ""

    # Company display name: prefer invoice.company for multi-tenant accuracy
    company_name = getattr(global_cfg, "company_name", "K3 CAR CARE")
    branch_name = getattr(global_cfg, "branch_name", "")
    try:
        if invoice.company:
            company_name = invoice.company.display_name or invoice.company.name or company_name
    except Exception:
        pass

    return {
        "global": global_cfg,           # full global singleton (logo, address, GST, etc.)
        "company_name": company_name,
        "branch_name": branch_name,
        "bank_name": bank_name,
        "account_number": account_number,
        "ifsc_code": ifsc_code,
        "account_holder_name": account_holder_name,
        "branch_address": branch_address,
        "footer_message": footer_message,
        "signature": getattr(global_cfg, "signature", None),  # signature image field
    }


def _fmt_inr(amount):
    """Format a number as Indian Rupee with Rs. prefix."""
    try:
        return f"Rs. {float(amount):,.2f}"
    except Exception:
        return f"Rs. {amount}"


def _fmt_date(dt):
    """Format a date or datetime as DD/MM/YYYY (cross-platform)"""
    if not dt:
        return "N/A"
    try:
        d = dt.strftime("%d/%m/%Y")
        if d.startswith("0"):
            d = d[1:]
        return d
    except Exception:
        return str(dt)


def _fmt_datetime(dt):
    """Format a datetime as DD/MM/YYYY H:MM AM/PM (cross-platform)"""
    if not dt:
        return "N/A"
    try:
        d = dt.strftime("%d/%m/%Y")
        t = dt.strftime("%I:%M %p")
        if d.startswith("0"):
            d = d[1:]
        if t.startswith("0"):
            t = t[1:]
        return f"{d} {t}"
    except Exception:
        return str(dt)


class TitleBarComponent:
    """
    Top bar: 'TAX INVOICE' (bold) + 'ORIGINAL FOR RECIPIENT' badge.
    """

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        # Badge cell styled with a box border
        badge_style = ParagraphStyle(
            "Badge",
            parent=self.s.badge_text.parent if hasattr(self.s.badge_text, 'parent') else self.s.normal,
            fontSize=8,
            fontName="Helvetica",
            textColor=self.s.primary,
            alignment=TA_CENTER,
        )

        title_para = Paragraph("<b>TAX INVOICE</b>", self.s.invoice_type_title)
        badge_para = Paragraph("ORIGINAL FOR RECIPIENT", badge_style)

        badge_table = Table([[badge_para]], colWidths=[1.8 * inch])
        badge_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))

        # TitleBar + badge layout — full A4 width
        bar = Table([[title_para, badge_table]], colWidths=[5.47 * inch, 1.8 * inch])
        bar.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return bar


class HeaderComponent:
    """
    Main header: K3 logo + company info LEFT | Invoice No/Date/Vehicle RIGHT.
    """

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        from config.models import CompanySettings
        from reportlab.platypus import Image
        from django.conf import settings
        import os

        company = CompanySettings.load()

        # ─── Left: Logo + company info ────────────────────────────────────
        left_cells = []

        # Logo
        logo_added = False
        if company.logo:
            try:
                logo_path = os.path.join(settings.MEDIA_ROOT, company.logo.name)
                if os.path.exists(logo_path):
                    logo = Image(logo_path, width=0.85 * inch, height=0.85 * inch)
                    logo_added = True
            except Exception:
                logo_added = False

        company_display_name = company.company_name
        if company.branch_name:
            company_display_name += f" {company.branch_name}"

        company_name_para = Paragraph(company_display_name, self.s.company_name)
        # Build address, filtering out blank parts to avoid leading commas
        addr_parts = [p for p in [
            company.address_line1,
            company.address_line2,
            f"{company.city}, {company.state} {company.pincode}".strip(", "),
        ] if p and p.strip()]
        full_address = ", ".join(addr_parts) if addr_parts else ""
        address_para = Paragraph(full_address, self.s.header_text) if full_address else None

        # GSTIN + Mobile + Email
        gstin_line = ""
        if company.gst_number:
            gstin_line += f"<b>GSTIN:</b> {company.gst_number}"
        if company.phone:
            gstin_line += f"&nbsp;&nbsp;&nbsp;<b>Mobile:</b> {company.phone}"
        gstin_para = Paragraph(gstin_line, self.s.header_text) if gstin_line else None

        email_para = None
        if company.email:
            email_para = Paragraph(f"<b>Email:</b> {company.email}", self.s.header_text)

        if logo_added:
            # Logo left, company text right — inside a mini table
            text_items = [company_name_para]
            if address_para:
                text_items.append(address_para)
            if gstin_para:
                text_items.append(gstin_para)
            if email_para:
                text_items.append(email_para)

            left_inner = Table(
                [[logo, text_items]],
                colWidths=[0.9 * inch, 3.1 * inch]
            )
            left_inner.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            left_content = left_inner
        else:
            text_items = [company_name_para]
            if address_para:
                text_items.append(address_para)
            if gstin_para:
                text_items.append(gstin_para)
            if email_para:
                text_items.append(email_para)
            left_content = Table([[text_items]], colWidths=[4.0 * inch])
            left_content.setStyle(TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))

        # ─── Right: Invoice details box ───────────────────────────────────
        # Invoice date — issued_date is DateField; use created_at for time
        issued_str = _fmt_datetime(self.invoice.created_at) if self.invoice.created_at else _fmt_date(self.invoice.issued_date)

        # Vehicle info
        vehicle_model = ""
        vehicle_no = ""
        if self.invoice.jobcard and self.invoice.jobcard.booking:
            vehicle = self.invoice.jobcard.booking.vehicle
            if vehicle:
                brand = getattr(vehicle, "brand", "")
                model = getattr(vehicle, "model", "")
                vehicle_model = f"{brand} {model}".strip() or "N/A"
                vehicle_no = getattr(vehicle, "registration_number", "") or "N/A"

        # Grid: [Label, Value] rows in the right box
        right_data = [
            [
                Paragraph("<b>Invoice No.</b>", self.s.header_value),
                Paragraph("<b>Invoice Date</b>", self.s.header_value_right),
            ],
            [
                Paragraph(self.invoice.invoice_number, self.s.table_cell),
                Paragraph(issued_str, self.s.table_cell_right),
            ],
        ]
        if vehicle_model or vehicle_no:
            right_data += [
                [
                    Paragraph("<b>Vehicle Model</b>", self.s.header_value),
                    Paragraph("<b>Vehicle No.</b>", self.s.header_value_right),
                ],
                [
                    Paragraph(vehicle_model, self.s.table_cell),
                    Paragraph(vehicle_no, self.s.table_cell_right),
                ],
            ]

        right_table = Table(right_data, colWidths=[1.5 * inch, 1.5 * inch])
        right_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
            ("LINEBELOW", (0, 1), (-1, 1), 0.5, self.s.border),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        # ─── Combine left + right ─────────────────────────────────────────
        header_table = Table(
            [[left_content, right_table]],
            colWidths=[4.27 * inch, 3.0 * inch]
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
        ]))

        return header_table


class BillToComponent:
    """
    BILL TO / SHIP TO two-column layout.
    """

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        customer = self.invoice.customer

        customer_name = customer.user.name if customer and customer.user else "N/A"
        phone = customer.user.phone if customer and customer.user else ""
        email = customer.user.email if customer and customer.user else ""

        # Place of Supply for GST purposes = state where the service is rendered
        # Priority: (1) branch state, (2) company settings state, (3) omit
        place_of_supply = ""
        try:
            if self.invoice.branch and self.invoice.branch.state:
                place_of_supply = self.invoice.branch.state
        except Exception:
            pass
        if not place_of_supply:
            try:
                from config.models import CompanySettings
                cfg = CompanySettings.load()
                place_of_supply = cfg.state or ""
            except Exception:
                pass

        def _build_side(label):
            data = [
                [Paragraph(label, self.s.section_title)],
                [Paragraph(customer_name, self.s.customer_name)],
            ]
            if phone:
                data.append([Paragraph(f"Mobile:  {phone}", self.s.customer_text)])
            if place_of_supply:
                data.append([Paragraph(f"Place of Supply:  {place_of_supply}", self.s.customer_text)])
            return data

        bill_to_data = _build_side("BILL TO")
        ship_to_data = _build_side("SHIP TO")

        # Pad shorter list so tables are equal height
        while len(bill_to_data) < len(ship_to_data):
            bill_to_data.append([Paragraph("", self.s.customer_text)])
        while len(ship_to_data) < len(bill_to_data):
            ship_to_data.append([Paragraph("", self.s.customer_text)])

        bill_table = Table(bill_to_data, colWidths=[3.535 * inch])
        bill_table.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))

        ship_table = Table(ship_to_data, colWidths=[3.535 * inch])
        ship_table.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))

        combined = Table([[bill_table, ship_table]], colWidths=[3.635 * inch, 3.635 * inch])
        combined.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
            ("LINEBEFORE", (1, 0), (1, -1), 0.8, self.s.border),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return combined


class ItemsTableComponent:
    """
    Line items table: S.NO | ITEMS | QTY. | RATE | TAX | AMOUNT
    """

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def _item_tax(self, item):
        """
        Compute the tax amount for a single item.
        Items are already stored EXCLUSIVE of tax (unit_price is pre-tax).
        Tax = item.total * tax_rate / 100
        """
        try:
            tax_rate = float(self.invoice.tax_rate or 0)
            item_total = float(item.total or 0)
            return item_total * tax_rate / 100, tax_rate
        except Exception:
            return 0.0, 0.0

    def build(self):
        # Header row
        col_headers = ["S.NO.", "ITEMS", "QTY.", "RATE", "TAX", "AMOUNT"]
        header_row = [Paragraph(f"<b>{h}</b>", self.s.table_header) for h in col_headers]

        items_data = [header_row]

        for idx, item in enumerate(self.invoice.items.all(), 1):
            tax_amt, tax_rate = self._item_tax(item)

            item_main = item.description or ""
            # Build description: main bold + optional subtype label below
            type_label = {
                "service": "Service",
                "part": "Part / Spare",
                "addon": "Add-on",
                "product": "Product",
                "other": "Other",
            }.get(item.item_type, "")

            desc_para = Paragraph(
                f"<b>{item_main}</b><br/>"
                f'<font size="7" color="#777777">{type_label}</font>',
                self.s.table_cell,
            )

            tax_str = (
                f"{_fmt_inr(tax_amt)}<br/>"
                f'<font size="7" color="#777777">({int(tax_rate) if tax_rate == int(tax_rate) else tax_rate}%)</font>'
                if tax_rate > 0
                else f"Rs. 0<br/><font size=\"7\" color=\"#777777\">(0%)</font>"
            )

            items_data.append([
                Paragraph(str(idx), self.s.table_cell_center),
                desc_para,
                Paragraph(str(item.quantity), self.s.table_cell_center),
                Paragraph(_fmt_inr(item.unit_price), self.s.table_cell_right),
                Paragraph(tax_str, self.s.table_cell_right),
                Paragraph(f"<b>{_fmt_inr(item.total)}</b>", self.s.table_cell_right),
            ])

        # Column widths: S.No, Description, Qty, Rate, Tax, Amount — total 7.27"
        col_widths = [0.45 * inch, 3.07 * inch, 0.6 * inch, 1.0 * inch, 1.0 * inch, 1.15 * inch]

        table = Table(items_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            # Header
            ("BACKGROUND", (0, 0), (-1, 0), self.s.bg),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("TOPPADDING", (0, 0), (-1, 0), 5),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
            # Data rows
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
            ("TOPPADDING", (0, 1), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
            # Grid
            ("GRID", (0, 0), (-1, -1), 0.5, self.s.border),
            # Alignment
            ("ALIGN", (0, 0), (0, -1), "CENTER"),   # S.No
            ("ALIGN", (1, 0), (1, -1), "LEFT"),      # Description
            ("ALIGN", (2, 0), (2, -1), "CENTER"),    # Qty
            ("ALIGN", (3, 0), (5, -1), "RIGHT"),     # Rate, Tax, Amount
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))

        return table


class TotalsComponent:
    """
    Totals section:
    - Right-aligned summary table (Total, Received, Balance)
    - GST breakdown table (HSN/SAC, Taxable Value, CGST, SGST, Total Tax)
    - Amount in words
    """

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def _amount_paid(self):
        """
        Sum all completed payments for this invoice.

        Payments can be linked in two ways:
          1. payment.invoice = this invoice  (direct FK)
          2. payment.booking = this booking, invoice FK not set  (older style)

        We fetch both sets, de-duplicate by ID, then sum.
        """
        try:
            seen_ids = set()
            total_paid = 0.0

            # Source 1: payments directly linked to invoice
            for p in self.invoice.payments.all():
                if p.payment_status == "completed" and p.id not in seen_ids:
                    total_paid += float(p.amount)
                    seen_ids.add(p.id)

            # Source 2: payments linked to the booking (invoice FK may be null)
            if self.invoice.booking_id:
                try:
                    for p in self.invoice.booking.payments.all():
                        if p.payment_status == "completed" and p.id not in seen_ids:
                            total_paid += float(p.amount)
                            seen_ids.add(p.id)
                except Exception:
                    pass

            return total_paid
        except Exception:
            return 0.0

    def build(self):
        invoice = self.invoice
        total = float(invoice.total_amount or 0)
        received = self._amount_paid()
        balance = max(0.0, total - received)

        # ─── Summary rows ──────────────────────────────────────────────────
        summary_rows = [
            [Paragraph("Total", self.s.total_label), Paragraph(_fmt_inr(total), self.s.total_value)],
            [Paragraph("Received Amount", self.s.total_label), Paragraph(_fmt_inr(received), self.s.total_value)],
            [Paragraph("<b>Pending Amount</b>", self.s.total_amount_label), Paragraph(f"<b>{_fmt_inr(balance)}</b>", self.s.total_amount_value)],
        ]

        summary_table = Table(summary_rows, colWidths=[1.7 * inch, 1.3 * inch])
        summary_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
            ("LINEABOVE", (0, -1), (-1, -1), 1.0, self.s.primary),
            ("BACKGROUND", (0, -1), (-1, -1), self.s.bg),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        # Right-align wrapper — full A4 width
        wrapper = Table([[summary_table]], colWidths=[7.27 * inch])
        wrapper.setStyle(TableStyle([
            ("ALIGN", (0, 0), (0, 0), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        # ─── GST Breakdown table ───────────────────────────────────────────
        subtotal = float(invoice.subtotal or 0)
        tax_rate = float(invoice.tax_rate or 0)
        cgst_rate = tax_rate / 2
        sgst_rate = tax_rate / 2
        tax_total = float(invoice.tax_amount or 0)
        cgst_amt = tax_total / 2
        sgst_amt = tax_total / 2

        gst_col_widths = [0.95 * inch, 1.22 * inch, 0.9 * inch, 0.97 * inch, 0.9 * inch, 0.97 * inch, 1.36 * inch]

        gst_header = [
            Paragraph("<b>HSN/SAC</b>", self.s.table_header),
            Paragraph("<b>Taxable Value</b>", self.s.table_header),
            Paragraph("<b>CGST Rate</b>", self.s.table_header),
            Paragraph("<b>CGST Amt</b>", self.s.table_header),
            Paragraph("<b>SGST Rate</b>", self.s.table_header),
            Paragraph("<b>SGST Amt</b>", self.s.table_header),
            Paragraph("<b>Total Tax Amt</b>", self.s.table_header),
        ]
        gst_row = [
            Paragraph(DEFAULT_HSN, self.s.table_cell_center),
            Paragraph(_fmt_inr(subtotal), self.s.table_cell_right),
            Paragraph(f"{cgst_rate:.1f}%", self.s.table_cell_center),
            Paragraph(_fmt_inr(cgst_amt), self.s.table_cell_right),
            Paragraph(f"{sgst_rate:.1f}%", self.s.table_cell_center),
            Paragraph(_fmt_inr(sgst_amt), self.s.table_cell_right),
            Paragraph(_fmt_inr(tax_total), self.s.table_cell_right),
        ]
        # Totals footer row
        gst_total_row = [
            Paragraph("<b>Total</b>", self.s.table_header),
            Paragraph(f"<b>{_fmt_inr(subtotal)}</b>", self.s.table_header),
            Paragraph("", self.s.table_header),
            Paragraph(f"<b>{_fmt_inr(cgst_amt)}</b>", self.s.table_header),
            Paragraph("", self.s.table_header),
            Paragraph(f"<b>{_fmt_inr(sgst_amt)}</b>", self.s.table_header),
            Paragraph(f"<b>{_fmt_inr(tax_total)}</b>", self.s.table_header),
        ]

        gst_table = Table([gst_header, gst_row, gst_total_row], colWidths=gst_col_widths)
        gst_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), self.s.bg),
            ("BACKGROUND", (0, -1), (-1, -1), self.s.bg),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, self.s.border),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("ALIGN", (5, 0), (5, -1), "RIGHT"),
            ("ALIGN", (6, 0), (6, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        return [wrapper, Spacer(1, 10), gst_table]


class AmountInWordsComponent:
    """Amount in words row."""

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        from .utils import number_to_words_indian

        amount_words = number_to_words_indian(float(self.invoice.total_amount or 0))

        data = [[Paragraph(f"<b>Total Amount (in words):</b>  {amount_words}", self.s.customer_text)]]

        table = Table(data, colWidths=[7.27 * inch])
        table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
            ("BACKGROUND", (0, 0), (-1, -1), self.s.bg),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        return table


class BankAndSignatoryComponent:
    """
    Bank Details (left) + Authorised Signatory (right), side by side.
    """

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        cd = _get_company_data(self.invoice)
        company = cd["global"]  # branding / address

        # ─── Bank details ──────────────────────────────────────────────────
        bank_name          = cd["bank_name"] or "N/A"
        account_number     = cd["account_number"] or "N/A"
        ifsc_code          = cd["ifsc_code"] or "N/A"
        account_holder_name = cd["account_holder_name"] or "N/A"
        branch_address     = cd["branch_address"]

        bank_rows = [
            [Paragraph("<b>BANK DETAILS</b>", self.s.section_title)],
            [Paragraph(f"<b>Name:</b> {account_holder_name}", self.s.customer_text)],
            [Paragraph(f"<b>Account No:</b> {account_number}", self.s.customer_text)],
            [Paragraph(f"<b>IFSC Code:</b> {ifsc_code}", self.s.customer_text)],
            [Paragraph(f"<b>Bank:</b> {bank_name}", self.s.customer_text)],
        ]
        if branch_address:
            bank_rows.append([Paragraph(f"<b>Branch:</b> {branch_address}", self.s.customer_text)])

        bank_table = Table(bank_rows, colWidths=[3.3 * inch])
        bank_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
            ("BACKGROUND", (0, 0), (-1, 0), self.s.bg),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))

        # ─── Authorised Signatory ──────────────────────────────────────────
        company_display = cd["company_name"]
        if cd["branch_name"]:
            company_display += f" {cd['branch_name']}"

        # Try to render the signature image
        sig_content = None
        sig_field = cd.get("signature")
        if sig_field:
            try:
                from reportlab.platypus import Image as RLImage
                from django.conf import settings as django_settings
                import os
                sig_path = os.path.join(django_settings.MEDIA_ROOT, sig_field.name)
                if os.path.exists(sig_path):
                    sig_content = RLImage(sig_path, width=1.6 * inch, height=0.6 * inch)
            except Exception:
                sig_content = None

        sig_rows = [
            [Paragraph(f"<b>For {company_display}</b>", self.s.section_title)],
            [sig_content if sig_content else Spacer(1, 40)],
            [Paragraph("Authorised Signatory", self.s.customer_text)],
        ]

        sig_table = Table(sig_rows, colWidths=[3.3 * inch])
        sig_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.8, self.s.border),
            ("BACKGROUND", (0, 0), (-1, 0), self.s.bg),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (0, -1), (-1, -1), "CENTER"),
            ("LINEABOVE", (0, -1), (-1, -1), 0.5, self.s.border),
        ]))

        # Side-by-side
        combined = Table([[bank_table, sig_table]], colWidths=[3.635 * inch, 3.635 * inch])
        combined.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return combined


class NotesComponent:
    """Notes section — only rendered if there are notes."""

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        if not self.invoice.notes:
            return []
        return [
            Paragraph("<b>NOTES</b>", self.s.section_title),
            Paragraph(self.invoice.notes, self.s.notes),
        ]


class FooterComponent:
    """Footer message."""

    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        cd = _get_company_data(self.invoice)
        return Paragraph(cd["footer_message"], self.s.footer)


# ── Keep legacy names in case anything imports them ─────────────────────────
class TermsComponent:
    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        return Paragraph("", self.s.notes)


class PaymentTermsComponent:
    def __init__(self, invoice):
        self.invoice = invoice
        self.s = PDFStyles()

    def build(self):
        return []


class BankDetailsComponent(BankAndSignatoryComponent):
    """Alias kept for backward compatibility."""
    pass
