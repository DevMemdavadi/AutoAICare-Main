"""
backfill_payment_status.py
==========================
One-time (safe to re-run) command to back-fill `is_paid`, `paid_at`,
`total_with_gst`, and `gst_amount` on existing PerformanceMetrics records
whose associated invoice is already fully paid.

After updating individual records, TeamPerformance aggregates are
recalculated so `paid_job_value` reflects real confirmed revenue.

Usage:
    python manage.py backfill_payment_status
    python manage.py backfill_payment_status --dry-run          # preview only
    python manage.py backfill_payment_status --company-id 3     # scope to one company
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Back-fill is_paid / paid_at on PerformanceMetrics for already-paid invoices, then refresh TeamPerformance.paid_job_value'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without saving anything',
        )
        parser.add_argument(
            '--company-id',
            type=int,
            default=None,
            help='Limit to a specific company ID',
        )

    def handle(self, *args, **options):
        from billing.models import Invoice
        from jobcards.performance_models import PerformanceMetrics
        from jobcards.performance_service import PerformanceTrackingService

        dry_run = options['dry_run']
        company_id = options['company_id']

        self.stdout.write(self.style.NOTICE(
            f"\n{'[DRY RUN] ' if dry_run else ''}Starting payment status back-fill…"
        ))

        # ── Step 1: find all fully-paid invoices linked to a JobCard ──────────
        invoice_qs = Invoice.objects.filter(
            status='paid',
            jobcard__isnull=False,
        ).select_related('jobcard', 'branch')

        if company_id:
            invoice_qs = invoice_qs.filter(company_id=company_id)

        self.stdout.write(f"Found {invoice_qs.count()} paid invoice(s) with a linked job card.")

        updated_metrics = 0
        skipped = 0
        missing_perf = 0
        supervisors_to_refresh = set()  # (supervisor_id, date) pairs

        for invoice in invoice_qs.iterator(chunk_size=200):
            jobcard = invoice.jobcard

            # Find the PerformanceMetrics record for this job
            try:
                perf = PerformanceMetrics.objects.get(jobcard=jobcard)
            except PerformanceMetrics.DoesNotExist:
                missing_perf += 1
                logger.debug(f"No PerformanceMetrics for JobCard #{jobcard.id} — skipping")
                continue

            # Skip if already correctly marked paid
            if perf.is_paid:
                skipped += 1
                continue

            # Determine paid_at: prefer invoice.paid_date, fall back to invoice.updated_at
            if invoice.paid_date:
                paid_at = timezone.make_aware(
                    timezone.datetime.combine(invoice.paid_date, timezone.datetime.min.time())
                )
            else:
                paid_at = invoice.updated_at or timezone.now()

            self.stdout.write(
                f"  → JobCard #{jobcard.id} | Invoice #{invoice.invoice_number} | "
                f"total={invoice.total_amount} gst={invoice.tax_amount} paid_at={paid_at.date()}"
            )

            if not dry_run:
                with transaction.atomic():
                    perf.is_paid = True
                    perf.paid_at = paid_at
                    perf.total_with_gst = invoice.total_amount
                    perf.gst_amount = invoice.tax_amount
                    perf.save(update_fields=['is_paid', 'paid_at', 'total_with_gst', 'gst_amount'])

                if perf.supervisor_id:
                    supervisors_to_refresh.add((perf.supervisor_id, paid_at.date()))

            updated_metrics += 1

        # ── Step 2: recalculate TeamPerformance for each affected supervisor ──
        if not dry_run and supervisors_to_refresh:
            from users.models import User

            self.stdout.write(self.style.NOTICE(
                f"\nRecalculating TeamPerformance for {len(supervisors_to_refresh)} supervisor/date pair(s)…"
            ))

            for supervisor_id, date in supervisors_to_refresh:
                try:
                    supervisor = User.objects.get(pk=supervisor_id)
                    PerformanceTrackingService.update_team_aggregates(supervisor=supervisor, date=date)
                    self.stdout.write(f"  ✓ Supervisor #{supervisor_id} ({supervisor.name}) — {date}")
                except Exception as exc:
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ Supervisor #{supervisor_id} on {date}: {exc}")
                    )

        # ── Summary ────────────────────────────────────────────────────────────
        self.stdout.write("\n" + "─" * 60)
        self.stdout.write(self.style.SUCCESS(
            f"{'[DRY RUN] ' if dry_run else ''}Done.\n"
            f"  PerformanceMetrics updated : {updated_metrics}\n"
            f"  Already paid (skipped)     : {skipped}\n"
            f"  No PerformanceMetrics found: {missing_perf}\n"
            f"  TeamPerformance refreshed  : {len(supervisors_to_refresh) if not dry_run else 'N/A (dry run)'}"
        ))
