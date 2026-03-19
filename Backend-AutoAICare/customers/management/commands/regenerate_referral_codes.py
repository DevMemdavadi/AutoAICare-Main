from django.core.management.base import BaseCommand
from customers.referral_models import ReferralCode
from customers.models import Customer


class Command(BaseCommand):
    help = 'Regenerate unique referral codes for all customers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regenerate codes even if customer already has one',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        self.stdout.write(self.style.WARNING('Starting referral code regeneration...'))
        
        # Get all customers
        customers = Customer.objects.select_related('user').all()
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for customer in customers:
            try:
                # Check if customer already has a code
                if hasattr(customer, 'referral_code_obj'):
                    if force:
                        # Delete old code and create new one
                        old_code = customer.referral_code_obj.code
                        customer.referral_code_obj.delete()
                        
                        # Generate new code
                        new_code = ReferralCode.generate_code(customer.user.name)
                        ReferralCode.objects.create(
                            customer=customer,
                            code=new_code
                        )
                        
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Updated: {customer.user.name} - {old_code} → {new_code}'
                            )
                        )
                    else:
                        skipped_count += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f'⊘ Skipped: {customer.user.name} - Already has code: {customer.referral_code_obj.code}'
                            )
                        )
                else:
                    # Create new code
                    code = ReferralCode.generate_code(customer.user.name)
                    ReferralCode.objects.create(
                        customer=customer,
                        code=code
                    )
                    
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Created: {customer.user.name} - {code}'
                        )
                    )
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Error for {customer.user.name}: {str(e)}'
                    )
                )
        
        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'\n📊 Summary:'))
        self.stdout.write(f'  • Created: {created_count}')
        self.stdout.write(f'  • Updated: {updated_count}')
        self.stdout.write(f'  • Skipped: {skipped_count}')
        self.stdout.write(f'  • Errors: {error_count}')
        self.stdout.write(f'  • Total: {created_count + updated_count + skipped_count + error_count}')
        self.stdout.write('='*60 + '\n')
        
        if error_count > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠ {error_count} errors occurred. Please check the output above.'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    '\n✅ Referral code regeneration completed successfully!'
                )
            )
