"""
backfill_floor_manager_performance.py
======================================
One-time (safe to re-run) command that does THREE things:

  1. Backfills the new `company` field on ALL existing PerformanceMetrics
     and TeamPerformance rows (these were NULL before migration 0037).

  2. Rebuilds FloorManagerPerformance aggregate rows from existing
     PerformanceMetrics (the new table was empty before this command).

  3. Optionally rebuilds TeamPerformance as well if --rebuild-team is passed
     (useful after the company backfill so period aggregates are also correct).

Usage:
    python manage.py backfill_floor_manager_performance
    python manage.py backfill_floor_manager_performance --dry-run
    python manage.py backfill_floor_manager_performance --company-id 3
    python manage.py backfill_floor_manager_performance --rebuild-team
    python manage.py backfill_floor_manager_performance --company-id 3 --rebuild-team
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger(__name__)

DIVIDER = "─" * 66


class Command(BaseCommand):
    help = (
        "Backfill company FK on PerformanceMetrics/TeamPerformance and "
        "rebuild FloorManagerPerformance aggregates from existing data."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without writing anything to the database.",
        )
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Limit to a specific company ID (default: all companies).",
        )
        parser.add_argument(
            "--rebuild-team",
            action="store_true",
            help="Also rebuild TeamPerformance aggregates after the FM backfill.",
        )

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        from jobcards.performance_models import (
            PerformanceMetrics,
            TeamPerformance,
            FloorManagerPerformance,
        )
        from jobcards.performance_service import PerformanceTrackingService
        from users.models import User

        dry_run = options["dry_run"]
        company_id = options["company_id"]
        rebuild_team = options["rebuild_team"]

        self.stdout.write(DIVIDER)
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"  Floor Manager Performance Backfill"
                f"{'  [DRY RUN]' if dry_run else ''}"
            )
        )
        self.stdout.write(DIVIDER)

        # ──────────────────────────────────────────────────────────────
        # STEP 1 — Backfill `company` on PerformanceMetrics
        # ──────────────────────────────────────────────────────────────
        self.stdout.write(self.style.NOTICE("\n[1/3] Backfilling company on PerformanceMetrics…"))

        perf_qs = PerformanceMetrics.objects.filter(company__isnull=True).select_related(
            "branch__company"
        )
        if company_id:
            perf_qs = perf_qs.filter(branch__company_id=company_id)

        perf_total = perf_qs.count()
        self.stdout.write(f"      Found {perf_total} PerformanceMetrics row(s) with no company.")

        perf_updated = 0
        perf_skipped = 0
        for perf in perf_qs.iterator(chunk_size=500):
            co = perf.branch.company if perf.branch else None
            if not co:
                perf_skipped += 1
                continue
            if not dry_run:
                perf.company = co
                perf.save(update_fields=["company"])
            perf_updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"      ✓ Updated: {perf_updated}   ⊘ Skipped (no branch/company): {perf_skipped}"
            )
        )

        # ──────────────────────────────────────────────────────────────
        # STEP 2 — Backfill `company` on TeamPerformance
        # ──────────────────────────────────────────────────────────────
        self.stdout.write(self.style.NOTICE("\n[2/3] Backfilling company on TeamPerformance…"))

        tp_qs = TeamPerformance.objects.filter(company__isnull=True).select_related(
            "branch__company"
        )
        if company_id:
            tp_qs = tp_qs.filter(branch__company_id=company_id)

        tp_total = tp_qs.count()
        self.stdout.write(f"      Found {tp_total} TeamPerformance row(s) with no company.")

        tp_updated = 0
        tp_skipped = 0
        for tp in tp_qs.iterator(chunk_size=500):
            co = tp.branch.company if tp.branch else None
            if not co:
                tp_skipped += 1
                continue
            if not dry_run:
                tp.company = co
                tp.save(update_fields=["company"])
            tp_updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"      ✓ Updated: {tp_updated}   ⊘ Skipped (no branch/company): {tp_skipped}"
            )
        )

        # ──────────────────────────────────────────────────────────────
        # STEP 3 — Build FloorManagerPerformance from existing metrics
        # ──────────────────────────────────────────────────────────────
        self.stdout.write(self.style.NOTICE("\n[3/3] Building FloorManagerPerformance aggregates…"))

        # Find every (floor_manager, date) pair that has PerformanceMetrics data
        metrics_qs = PerformanceMetrics.objects.filter(
            floor_manager__isnull=False
        ).select_related("floor_manager__branch__company")

        if company_id:
            metrics_qs = metrics_qs.filter(branch__company_id=company_id)

        # Group by (floor_manager_id, date) to build minimal call set
        pairs = (
            metrics_qs.values_list("floor_manager_id", "job_completed_at__date")
            .distinct()
            .order_by("floor_manager_id", "job_completed_at__date")
        )

        total_pairs = pairs.count()
        self.stdout.write(
            f"      Found {total_pairs} unique (floor_manager × date) pair(s) to aggregate."
        )

        if total_pairs == 0:
            self.stdout.write(
                self.style.WARNING("      No floor-manager data found — nothing to aggregate.")
            )
        else:
            fm_done = 0
            fm_errors = 0
            seen_fms = set()

            for fm_id, job_date in pairs.iterator(chunk_size=500):
                try:
                    fm = User.objects.select_related("branch__company").get(pk=fm_id)
                except User.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"      ✗ User #{fm_id} not found — skip"))
                    fm_errors += 1
                    continue

                if not dry_run:
                    try:
                        PerformanceTrackingService.update_floor_manager_aggregates(
                            floor_manager=fm, date=job_date
                        )
                    except Exception as exc:
                        self.stdout.write(
                            self.style.ERROR(
                                f"      ✗ FM #{fm_id} ({getattr(fm, 'name', fm_id)}) "
                                f"on {job_date}: {exc}"
                            )
                        )
                        fm_errors += 1
                        continue

                if fm_id not in seen_fms:
                    seen_fms.add(fm_id)
                    self.stdout.write(
                        f"      ✓ FM #{fm_id} — {getattr(fm, 'name', str(fm_id))} "
                        f"({'dry-run' if dry_run else 'aggregated all periods'})"
                    )
                fm_done += 1

            fm_count = FloorManagerPerformance.objects.count() if not dry_run else "N/A (dry run)"
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n      Pairs processed : {fm_done}\n"
                    f"      Errors          : {fm_errors}\n"
                    f"      Total FM perf rows now in DB: {fm_count}"
                )
            )

        # ──────────────────────────────────────────────────────────────
        # STEP 4 (optional) — Rebuild TeamPerformance
        # ──────────────────────────────────────────────────────────────
        if rebuild_team:
            self.stdout.write(self.style.NOTICE("\n[4/4] Rebuilding TeamPerformance aggregates…"))

            sup_pairs = (
                PerformanceMetrics.objects.filter(supervisor__isnull=False)
                .values_list("supervisor_id", "job_completed_at__date")
                .distinct()
                .order_by("supervisor_id", "job_completed_at__date")
            )
            if company_id:
                sup_pairs = sup_pairs.filter(branch__company_id=company_id)

            sup_total = sup_pairs.count()
            self.stdout.write(
                f"      Found {sup_total} unique (supervisor × date) pair(s) to aggregate."
            )

            sup_done = 0
            sup_errors = 0
            seen_sups = set()

            for sup_id, job_date in sup_pairs.iterator(chunk_size=500):
                try:
                    sup = User.objects.get(pk=sup_id)
                except User.DoesNotExist:
                    sup_errors += 1
                    continue

                if not dry_run:
                    try:
                        PerformanceTrackingService.update_team_aggregates(
                            supervisor=sup, date=job_date
                        )
                    except Exception as exc:
                        self.stdout.write(
                            self.style.ERROR(
                                f"      ✗ Supervisor #{sup_id} on {job_date}: {exc}"
                            )
                        )
                        sup_errors += 1
                        continue

                if sup_id not in seen_sups:
                    seen_sups.add(sup_id)
                    self.stdout.write(
                        f"      ✓ Supervisor #{sup_id} — {getattr(sup, 'name', str(sup_id))}"
                    )
                sup_done += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"\n      Pairs processed : {sup_done}   Errors: {sup_errors}"
                )
            )

        # ──────────────────────────────────────────────────────────────
        # Final summary
        # ──────────────────────────────────────────────────────────────
        self.stdout.write("\n" + DIVIDER)
        self.stdout.write(
            self.style.SUCCESS(
                f"{'[DRY RUN] ' if dry_run else ''}Backfill complete.\n\n"
                f"  PerformanceMetrics — company filled : {perf_updated}\n"
                f"  TeamPerformance    — company filled : {tp_updated}\n"
                f"  FloorManagerPerformance pairs built : "
                f"{'N/A (dry run)' if dry_run else fm_done}\n"
            )
        )
        if not dry_run:
            self.stdout.write(
                "  ✅ Refresh the Performance Dashboard to see Floor Manager data."
            )
        self.stdout.write(DIVIDER + "\n")
