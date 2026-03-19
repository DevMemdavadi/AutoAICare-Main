# invoices/services/pdf/base.py

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


class PDFStyles:
    """Shared styles and colors for PDF generation."""

    def __init__(self):
        self.styles = getSampleStyleSheet()

        # Color scheme — K3 Car Care brand palette
        self.primary    = colors.HexColor("#1a1a1a")   # Near-black for main text
        self.secondary  = colors.HexColor("#555555")   # Medium gray for secondary text
        self.accent     = colors.HexColor("#c8102e")   # K3 brand red (logo bg)
        self.yellow     = colors.HexColor("#f5a800")   # K3 brand yellow (logo text)
        self.border     = colors.HexColor("#bbbbbb")   # Light border
        self.bg         = colors.HexColor("#f5f0e8")   # Warm beige (table header bg)
        self.white      = colors.white
        self.warning    = colors.HexColor("#f59e0b")
        self.danger     = colors.HexColor("#ef4444")
        self.success    = colors.HexColor("#059669")

        # ── TAX INVOICE title
        self.invoice_type_title = ParagraphStyle(
            "InvoiceTypeTitle",
            parent=self.styles["Normal"],
            fontSize=14,
            fontName="Helvetica-Bold",
            textColor=self.primary,
            spaceAfter=0,
            alignment=TA_LEFT,
        )

        # ── "ORIGINAL FOR RECIPIENT" badge text
        self.badge_text = ParagraphStyle(
            "BadgeText",
            parent=self.styles["Normal"],
            fontSize=8,
            fontName="Helvetica",
            textColor=self.primary,
            spaceAfter=0,
            alignment=TA_CENTER,
        )

        # ── Company name (large bold, colored)
        self.company_name = ParagraphStyle(
            "CompanyName",
            parent=self.styles["Normal"],
            fontSize=13,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#c8102e"),
            spaceAfter=3,
            alignment=TA_LEFT,
        )

        # ── Header text (small, secondary color)
        self.header_text = ParagraphStyle(
            "HeaderText",
            parent=self.styles["Normal"],
            fontSize=8,
            textColor=self.secondary,
            spaceAfter=2,
            alignment=TA_LEFT,
            fontName="Helvetica",
        )

        # ── Header value style (bold)
        self.header_value = ParagraphStyle(
            "HeaderValue",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            spaceAfter=2,
            alignment=TA_LEFT,
            fontName="Helvetica-Bold",
        )

        # ── Header value right-aligned
        self.header_value_right = ParagraphStyle(
            "HeaderValueRight",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            spaceAfter=2,
            alignment=TA_RIGHT,
            fontName="Helvetica-Bold",
        )

        # ── Section title (e.g. BILL TO, BANK DETAILS)
        self.section_title = ParagraphStyle(
            "SectionTitle",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.secondary,
            spaceAfter=4,
            fontName="Helvetica-Bold",
            alignment=TA_LEFT,
        )

        # ── Customer / body text
        self.customer_text = ParagraphStyle(
            "CustomerText",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            spaceAfter=3,
            fontName="Helvetica",
        )

        # ── Customer name (larger, bold)
        self.customer_name = ParagraphStyle(
            "CustomerName",
            parent=self.styles["Normal"],
            fontSize=10,
            textColor=self.primary,
            spaceAfter=3,
            fontName="Helvetica-Bold",
        )

        # ── Notes style
        self.notes = ParagraphStyle(
            "Notes",
            parent=self.styles["Normal"],
            fontSize=8,
            textColor=self.secondary,
            spaceAfter=4,
            fontName="Helvetica",
            leading=11,
        )

        # ── Footer
        self.footer = ParagraphStyle(
            "Footer",
            parent=self.styles["Normal"],
            fontSize=8,
            textColor=self.secondary,
            spaceAfter=0,
            alignment=TA_CENTER,
            fontName="Helvetica",
        )

        # ── Totals label (right-aligned)
        self.total_label = ParagraphStyle(
            "TotalLabel",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            alignment=TA_LEFT,
            fontName="Helvetica",
        )

        # ── Totals value (right-aligned)
        self.total_value = ParagraphStyle(
            "TotalValue",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            alignment=TA_RIGHT,
            fontName="Helvetica",
        )

        # ── Total amount label (bold)
        self.total_amount_label = ParagraphStyle(
            "TotalAmountLabel",
            parent=self.styles["Normal"],
            fontSize=10,
            textColor=self.primary,
            alignment=TA_LEFT,
            fontName="Helvetica-Bold",
        )

        # ── Total amount value (bold, right)
        self.total_amount_value = ParagraphStyle(
            "TotalAmountValue",
            parent=self.styles["Normal"],
            fontSize=10,
            textColor=self.primary,
            alignment=TA_RIGHT,
            fontName="Helvetica-Bold",
        )

        # ── Table header cell text (centered, small)
        self.table_header = ParagraphStyle(
            "TableHeader",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        )

        # ── Table cell text
        self.table_cell = ParagraphStyle(
            "TableCell",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            alignment=TA_LEFT,
            fontName="Helvetica",
        )

        # ── Table cell right-aligned
        self.table_cell_right = ParagraphStyle(
            "TableCellRight",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            alignment=TA_RIGHT,
            fontName="Helvetica",
        )

        # ── Table cell center-aligned
        self.table_cell_center = ParagraphStyle(
            "TableCellCenter",
            parent=self.styles["Normal"],
            fontSize=9,
            textColor=self.primary,
            alignment=TA_CENTER,
            fontName="Helvetica",
        )

        # ── Normal style reference
        self.normal = self.styles["Normal"]
