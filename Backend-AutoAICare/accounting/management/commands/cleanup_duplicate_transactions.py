"""
Management command to clean up duplicate Transaction records.
This fixes the issue where multiple transactions were created for the same payment
due to duplicate signal handlers.
"""

from django.core.management.base import BaseCommand
from accounting.models import Transaction
from payments.models import Payment


class Command(BaseCommand):
    help = 'Clean up duplicate Transaction records created by duplicate signal handlers'

    def handle(self, *args, **options):
        self.stdout.write('Checking for duplicate transactions...')
        
        # Find all payments
        payments = Payment.objects.all()
        
        duplicates_found = 0
        duplicates_removed = 0
        
        for payment in payments:
            # Find all transactions for this payment
            transactions = Transaction.objects.filter(
                source='invoice',
                reference_id=str(payment.id)
            )
            
            count = transactions.count()
            
            if count > 1:
                duplicates_found += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'Found {count} transactions for Payment #{payment.id} '
                        f'(Invoice #{payment.invoice.invoice_number if payment.invoice else "N/A"})'
                    )
                )
                
                # Keep the first one, delete the rest
                first_transaction = transactions.first()
                duplicate_transactions = transactions.exclude(id=first_transaction.id)
                
                duplicate_count = duplicate_transactions.count()
                duplicate_transactions.delete()
                
                duplicates_removed += duplicate_count
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Kept Transaction #{first_transaction.id}, '
                        f'removed {duplicate_count} duplicates'
                    )
                )
        
        if duplicates_found == 0:
            self.stdout.write(self.style.SUCCESS('✅ No duplicate transactions found!'))
        else:
            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Cleaned up {duplicates_removed} duplicate transactions '
                    f'from {duplicates_found} payments'
                )
            )
