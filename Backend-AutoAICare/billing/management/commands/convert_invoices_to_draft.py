"""
Management command to convert existing 'pending' invoices back to 'draft' status
so they can be edited before finalizing.
"""
from django.core.management.base import BaseCommand
from billing.models import Invoice


class Command(BaseCommand):
    help = 'Convert auto-generated pending invoices to draft status for editing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--invoice-id',
            type=int,
            help='Convert specific invoice by ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Convert all auto-generated pending invoices to draft',
        )

    def handle(self, *args, **options):
        invoice_id = options.get('invoice_id')
        convert_all = options.get('all')

        if invoice_id:
            # Convert specific invoice
            try:
                invoice = Invoice.objects.get(id=invoice_id)
                if invoice.status == 'pending' and 'Auto-generated' in (invoice.notes or ''):
                    invoice.status = 'draft'
                    invoice.save(update_fields=['status'])
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ Invoice #{invoice.invoice_number} (ID: {invoice.id}) converted to draft'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️ Invoice #{invoice.invoice_number} is not auto-generated or not pending'
                        )
                    )
            except Invoice.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'❌ Invoice with ID {invoice_id} not found')
                )

        elif convert_all:
            # Convert all auto-generated pending invoices
            invoices = Invoice.objects.filter(
                status='pending',
                notes__contains='Auto-generated from Job Card'
            )
            count = invoices.count()
            
            if count == 0:
                self.stdout.write(
                    self.style.WARNING('⚠️ No auto-generated pending invoices found')
                )
                return

            self.stdout.write(f'Found {count} auto-generated pending invoice(s)')
            
            for invoice in invoices:
                invoice.status = 'draft'
                invoice.save(update_fields=['status'])
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✅ Invoice #{invoice.invoice_number} (ID: {invoice.id}) → draft'
                    )
                )

            self.stdout.write(
                self.style.SUCCESS(f'\n✅ Successfully converted {count} invoice(s) to draft status')
            )

        else:
            self.stdout.write(
                self.style.ERROR('❌ Please specify --invoice-id or --all')
            )
