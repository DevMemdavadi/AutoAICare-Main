"""
Management command to fix legacy invoices where job card status wasn't updated.
This handles invoices that were marked as paid before the payment system fixes.
"""

from django.core.management.base import BaseCommand
from billing.models import Invoice
from jobcards.models import JobCard


class Command(BaseCommand):
    help = 'Fix job card statuses for invoices that were marked as paid before payment system fixes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        self.stdout.write('Checking for invoices with mismatched job card statuses...')
        
        # Find all paid invoices
        paid_invoices = Invoice.objects.filter(status='paid').select_related('jobcard')
        
        updates_needed = 0
        updates_made = 0
        
        for invoice in paid_invoices:
            if not invoice.jobcard:
                continue
            
            jobcard = invoice.jobcard
            
            # Check if job card status needs updating
            if jobcard.status in ['ready_for_billing', 'customer_approved', 'final_qc_passed']:
                updates_needed += 1
                
                self.stdout.write(
                    self.style.WARNING(
                        f'Invoice {invoice.invoice_number} is PAID but '
                        f'JobCard #{jobcard.id} is still "{jobcard.status}"'
                    )
                )
                
                if not dry_run:
                    old_status = jobcard.status
                    jobcard.status = 'billed'
                    jobcard.save(update_fields=['status'])
                    updates_made += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ Updated JobCard #{jobcard.id}: {old_status} → billed'
                        )
                    )
                else:
                    self.stdout.write(
                        f'  Would update JobCard #{jobcard.id}: {jobcard.status} → billed'
                    )
        
        self.stdout.write('')
        
        if updates_needed == 0:
            self.stdout.write(self.style.SUCCESS('✅ No mismatched statuses found!'))
        else:
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f'Found {updates_needed} job cards that need status updates'
                    )
                )
                self.stdout.write('Run without --dry-run to apply changes')
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Updated {updates_made} job card statuses'
                    )
                )
