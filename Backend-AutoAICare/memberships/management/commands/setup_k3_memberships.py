"""
Management command to set up the two official K3 Car Care membership plans with correct
pricing and benefits from the November 2025 WhatsApp pricing messages.

Since customers already have active subscriptions on the existing plans (IDs 9 & 10),
we UPDATE them in-place rather than creating new ones, to avoid breaking existing data.

Run:
    python manage.py setup_k3_memberships
    python manage.py setup_k3_memberships --dry-run   (preview only)
    python manage.py setup_k3_memberships --force-new  (create brand-new plans, ignoring duplicates)
"""

from django.core.management.base import BaseCommand
from django.db import transaction

K3_COMPANY_ID = 9   # K3 Car Care
PLAN1_ID = 9        # Lifetime Membership Card
PLAN2_ID = 10       # Annual Wash Plan


class Command(BaseCommand):
    help = "Update K3 Car Care membership plans with correct pricing and benefits."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without saving to the database.",
        )
        parser.add_argument(
            "--force-new",
            action="store_true",
            help="Create brand-new plans with unique names instead of updating existing ones.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force_new = options["force_new"]

        from memberships.models import MembershipPlan, MembershipBenefit
        from companies.models import Company

        try:
            company = Company.objects.get(id=K3_COMPANY_ID)
        except Company.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"Company ID {K3_COMPANY_ID} not found."))
            return

        self.stdout.write(f"\n🏢  Company: {company.name} (ID {company.id})\n")

        # ──────────────────────────────────────────────────────────────────────
        # PLAN 1 — Lifetime Membership Card
        # ──────────────────────────────────────────────────────────────────────
        plan1_fields = dict(
            name="Lifetime Membership Card",
            tier="gold",
            description=(
                "One-time lifetime membership. Enjoy exclusive discounts on all K3 Car Care services "
                "including washes, detailing, coatings, and mechanical work. "
                "Savings up to ₹13,048 on SUV!"
            ),
            hatchback_price=1500,
            sedan_price=1500,
            suv_price=1500,
            gst_applicable=True,
            gst_rate=18,
            duration_value=99,
            duration_unit="years",
            discount_percentage=0,
            priority_booking=False,
            is_active=True,
            is_popular=True,
            display_order=1,
            is_global=False,
        )

        # (title, benefit_type, discount_pct, fixed_amount, coupon_count, categories)
        plan1_benefits = [
            ("Normal Car Wash",      "discount", 30,  None, 5, ["wash"]),
            ("Body Polish",          "discount",  0,   400, 3, ["exterior"]),
            ("Interior Clean",       "discount", 20,  None, 2, ["interior"]),
            ("Exterior Detailing",   "discount", 20,  None, 2, ["exterior"]),
            ("Car Makeover Service", "discount", 25,  None, 2, ["makeover"]),
            ("AC Vent Clean",        "discount",  0,   100, 2, ["ac_service"]),
            ("Ceramic Coating",      "discount", 10,  None, 1, ["coating"]),
            ("Mechanical Service",   "discount", 25,  None, 2, ["mechanical"]),
        ]

        # ──────────────────────────────────────────────────────────────────────
        # PLAN 2 — Annual Wash Plan
        # ──────────────────────────────────────────────────────────────────────
        plan2_fields = dict(
            name="Annual Wash Plan",
            tier="silver",
            description=(
                "Annual car wash membership — 12 Normal Car Washes + 4 Bonus Washes = 16 total. "
                "Each wash includes Interior Vacuum & Polish, Exterior Foaming Wash, Tyre Polish, Fibre Polish. "
                "Sedan/Hatchback: ₹6,000/year | SUV: ₹8,400/year (+18% GST)."
            ),
            hatchback_price=6000,
            sedan_price=6000,
            suv_price=8400,
            gst_applicable=True,
            gst_rate=18,
            duration_value=12,
            duration_unit="months",
            discount_percentage=0,
            free_washes_count=16,
            priority_booking=False,
            is_active=True,
            is_popular=False,
            display_order=2,
            is_global=False,
        )

        plan2_benefits = [
            ("Annual Normal Car Wash", "free_service", 100, None, 12, ["wash"]),
            ("Bonus Wash (Free Gift)", "free_service", 100, None,  4, ["wash"]),
        ]

        if dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN — nothing will be saved ──\n"))
            mode = "CREATE NEW" if force_new else "UPDATE existing (ID 9)"
            self._preview_plan(f"[{mode}] Lifetime Membership Card", plan1_fields, plan1_benefits)
            mode = "CREATE NEW" if force_new else "UPDATE existing (ID 10)"
            self._preview_plan(f"[{mode}] Annual Wash Plan", plan2_fields, plan2_benefits)
            self.stdout.write(self.style.WARNING("\nDry run complete. Run without --dry-run to save.\n"))
            return

        if force_new:
            # Create brand-new plans (appending "(v2)" to avoid unique constraint)
            plan1_fields["name"] = "Lifetime Membership Card (v2)"
            plan2_fields["name"] = "Annual Wash Plan (v2)"
            plan1 = MembershipPlan.objects.create(company=company, **plan1_fields)
            plan2 = MembershipPlan.objects.create(company=company, **plan2_fields)
            self.stdout.write(self.style.SUCCESS(f"✅  Created NEW plan: {plan1.name} (ID {plan1.id})"))
            self.stdout.write(self.style.SUCCESS(f"✅  Created NEW plan: {plan2.name} (ID {plan2.id})"))
        else:
            # Update existing plans in-place (preserves active subscriptions)
            plan1 = self._update_plan(MembershipPlan, PLAN1_ID, company, plan1_fields)
            plan2 = self._update_plan(MembershipPlan, PLAN2_ID, company, plan2_fields)

        # Recreate benefits for both plans
        for plan, benefits in [(plan1, plan1_benefits), (plan2, plan2_benefits)]:
            old_count = MembershipBenefit.objects.filter(plan=plan).count()
            MembershipBenefit.objects.filter(plan=plan).delete()
            self.stdout.write(f"\n   🗑   Deleted {old_count} old benefit(s) for plan '{plan.name}'")
            self._create_benefits(plan, benefits, company)

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉  Done!\n"
                f"    Plan 1 — ID {plan1.id}: {plan1.name}  ({len(plan1_benefits)} benefits)\n"
                f"    Plan 2 — ID {plan2.id}: {plan2.name}  ({len(plan2_benefits)} benefits)\n"
            )
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _update_plan(self, Model, plan_id, company, fields):
        try:
            plan = Model.objects.get(id=plan_id)
            for k, v in fields.items():
                setattr(plan, k, v)
            plan.company = company
            plan.save()
            self.stdout.write(self.style.SUCCESS(f"✅  Updated plan: {plan.name} (ID {plan.id})"))
            return plan
        except Model.DoesNotExist:
            plan = Model.objects.create(company=company, **fields)
            self.stdout.write(self.style.SUCCESS(f"✅  Created plan: {plan.name} (ID {plan.id})"))
            return plan

    def _create_benefits(self, plan, benefits, company):
        from memberships.models import MembershipBenefit

        for title, benefit_type, pct, fixed_amt, count, categories in benefits:
            MembershipBenefit.objects.create(
                company=company,
                plan=plan,
                benefit_type=benefit_type,
                title=title,
                discount_percentage=pct,
                discount_fixed_amount=fixed_amt or 0,
                coupon_count=count,
                is_one_time=False,
                applicable_categories=categories,
                is_active=True,
            )
            label = (
                "100% OFF (free)"
                if pct == 100
                else (f"{pct}% OFF" if pct else f"₹{fixed_amt} OFF")
            )
            self.stdout.write(
                f"   ➕  {title:35} | {label:18} | {count} coupon(s) | {categories}"
            )

    def _preview_plan(self, header, data, benefits):
        self.stdout.write(f"\n📋  {header}")
        self.stdout.write(
            f"    Prices — Hatchback: ₹{data['hatchback_price']}  "
            f"Sedan: ₹{data['sedan_price']}  SUV: ₹{data['suv_price']}"
        )
        self.stdout.write(f"    Duration: {data['duration_value']} {data['duration_unit']}")
        self.stdout.write("    Benefits:")
        for title, btype, pct, fixed_amt, count, cats in benefits:
            label = "100% OFF (free)" if pct == 100 else (f"{pct}% OFF" if pct else f"₹{fixed_amt} OFF")
            self.stdout.write(f"      - {title:35} | {label:18} | {count} coupon(s) | {cats}")
