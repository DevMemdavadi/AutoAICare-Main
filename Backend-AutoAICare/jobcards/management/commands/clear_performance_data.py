from django.core.management.base import BaseCommand
from django.db import transaction
from jobcards.performance_models import PerformanceMetrics, TeamPerformance
from branches.models import Branch


class Command(BaseCommand):
    help = 'Clear performance data for a specific branch'

    def add_arguments(self, parser):
        parser.add_argument(
            '--branch-name',
            type=str,
            help='Name of the branch to clear performance data for (partial match)',
        )
        parser.add_argument(
            '--branch-id',
            type=int,
            help='ID of the branch to clear performance data for',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear all performance data (use with caution!)',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm the deletion',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        branch_name = options.get('branch_name')
        branch_id = options.get('branch_id')
        clear_all = options.get('all')
        confirm = options.get('confirm')

        # Find the branch
        branch = None
        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
                self.stdout.write(f"Found branch: {branch.name} (ID: {branch.id})")
            except Branch.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Branch with ID {branch_id} not found"))
                return
        elif branch_name:
            branches = Branch.objects.filter(name__icontains=branch_name)
            if branches.count() == 0:
                self.stdout.write(self.style.ERROR(f"No branch found matching '{branch_name}'"))
                return
            elif branches.count() > 1:
                self.stdout.write(self.style.WARNING(f"Multiple branches found matching '{branch_name}':"))
                for b in branches:
                    self.stdout.write(f"  - {b.name} (ID: {b.id})")
                self.stdout.write(self.style.WARNING("Please use --branch-id to specify exact branch"))
                return
            else:
                branch = branches.first()
                self.stdout.write(f"Found branch: {branch.name} (ID: {branch.id})")
        elif clear_all:
            if not confirm:
                self.stdout.write(self.style.WARNING("⚠️  WARNING: This will delete ALL performance data!"))
                self.stdout.write("Add --confirm flag to proceed")
                return
        else:
            self.stdout.write(self.style.ERROR("Please provide --branch-name, --branch-id, or --all"))
            return

        # Count records to be deleted
        if branch:
            perf_count = PerformanceMetrics.objects.filter(branch=branch).count()
            team_count = TeamPerformance.objects.filter(branch=branch).count()
        else:
            perf_count = PerformanceMetrics.objects.count()
            team_count = TeamPerformance.objects.count()

        # Show what will be deleted
        self.stdout.write("\n" + "="*60)
        if branch:
            self.stdout.write(f"Branch: {branch.name}")
        else:
            self.stdout.write("Scope: ALL BRANCHES")
        self.stdout.write(f"Performance Metrics to delete: {perf_count}")
        self.stdout.write(f"Team Performance records to delete: {team_count}")
        self.stdout.write("="*60 + "\n")

        if perf_count == 0 and team_count == 0:
            self.stdout.write(self.style.SUCCESS("No performance data found. Nothing to delete."))
            return

        # Confirm deletion
        if not confirm:
            self.stdout.write(self.style.WARNING("Add --confirm flag to proceed with deletion"))
            return

        # Delete the records
        self.stdout.write("Deleting performance data...")
        
        if branch:
            deleted_perf = PerformanceMetrics.objects.filter(branch=branch).delete()
            deleted_team = TeamPerformance.objects.filter(branch=branch).delete()
        else:
            deleted_perf = PerformanceMetrics.objects.all().delete()
            deleted_team = TeamPerformance.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(f"\n✅ Successfully deleted:"))
        self.stdout.write(f"  - {deleted_perf[0]} Performance Metrics records")
        self.stdout.write(f"  - {deleted_team[0]} Team Performance records")
        
        if branch:
            self.stdout.write(f"\nPerformance data cleared for branch: {branch.name}")
            self.stdout.write("You can now test with real job completions!")
        else:
            self.stdout.write(f"\nAll performance data has been cleared")
