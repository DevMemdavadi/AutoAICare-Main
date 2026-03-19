from django.core.management.base import BaseCommand
from billing.models import Invoice


class Command(BaseCommand):
    help = 'Recalculate all invoice totals with corrected GST formula'

    def add_arguments(self, parser):
        parser.add_argument(
            '--invoice-id',
            type=int,
            help='Recalculate specific invoice by ID',
        )
        parser.add_argument(
            '--update-tax-rate',
            action='store_true',
            help='Update tax_rate to 18% for invoices with lower rates',
        )

    def handle(self, *args, **options):
        invoice_id = options.get('invoice_id')
        update_tax_rate = options.get('update_tax_rate', False)

        if invoice_id:
            # Recalculate specific invoice
            try:
                invoice = Invoice.objects.get(id=invoice_id)
                self.recalculate_invoice(invoice, update_tax_rate)
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully recalculated invoice #{invoice.invoice_number}')
                )
            except Invoice.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Invoice with ID {invoice_id} not found')
                )
        else:
            # Recalculate all invoices
            invoices = Invoice.objects.all()
            total = invoices.count()
            
            self.stdout.write(f'Found {total} invoices to recalculate...')
            
            updated_count = 0
            for invoice in invoices:
                old_total = invoice.total_amount
                self.recalculate_invoice(invoice, update_tax_rate)
                
                if invoice.total_amount != old_total:
                    updated_count += 1
                    self.stdout.write(
                        f'  Invoice #{invoice.invoice_number}: '
                        f'₹{old_total} → ₹{invoice.total_amount}'
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully recalculated {total} invoices ({updated_count} changed)'
                )
            )

    def recalculate_invoice(self, invoice, update_tax_rate):
        """Recalculate a single invoice."""
        # Update tax_rate to 18% if requested and current rate is lower
        if update_tax_rate and invoice.tax_rate < 18:
            invoice.tax_rate = 18
            invoice.save(update_fields=['tax_rate'])
        
        # Recalculate totals
        invoice.calculate_totals()
