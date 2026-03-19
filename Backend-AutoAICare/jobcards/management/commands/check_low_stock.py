from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.db import models
from jobcards.parts_catalog import Part
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Check for low stock parts and send reorder alerts'

    def handle(self, *args, **options):
        # Get all active parts with low stock
        low_stock_parts = Part.objects.filter(
            is_active=True,
            stock__lte=models.F('min_stock_level')
        ).select_related('branch')

        if not low_stock_parts.exists():
            self.stdout.write(self.style.SUCCESS('No low stock parts found'))
            return

        # Group parts by branch
        parts_by_branch = {}
        for part in low_stock_parts:
            branch_key = part.branch.id if part.branch else 'global'
            if branch_key not in parts_by_branch:
                parts_by_branch[branch_key] = []
            parts_by_branch[branch_key].append(part)

        # Send notifications
        total_sent = 0
        
        for branch_key, parts in parts_by_branch.items():
            # Get admins for this branch
            if branch_key == 'global':
                admins = User.objects.filter(role__in=['super_admin', 'branch_admin'], is_active=True)
            else:
                admins = User.objects.filter(
                    branch_id=branch_key,
                    role__in=['branch_admin', 'company_admin', 'super_admin'],
                    is_active=True
                )

            # Create notification message
            out_of_stock = [p for p in parts if p.stock == 0]
            low_stock = [p for p in parts if p.stock > 0]

            message_parts = []
            if out_of_stock:
                message_parts.append(f"{len(out_of_stock)} parts are OUT OF STOCK")
            if low_stock:
                message_parts.append(f"{len(low_stock)} parts are running low")

            subject = f"⚠️ Parts Inventory Alert - {', '.join(message_parts)}"
            
            # Build email body
            email_body = self._build_email_body(parts, out_of_stock, low_stock)

            # Send to each admin
            for admin in admins:
                if admin.email:
                    try:
                        send_mail(
                            subject=subject,
                            message=email_body,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[admin.email],
                            fail_silently=False,
                        )
                        total_sent += 1
                        self.stdout.write(f"Sent alert to {admin.email}")
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f"Failed to send to {admin.email}: {str(e)}")
                        )

                # Create in-app notification
                try:
                    from notify.models import InAppNotification
                    InAppNotification.objects.create(
                        user=admin,
                        title="Low Stock Alert",
                        message=f"{len(parts)} parts need reordering. Check Parts Management for details.",
                        notification_type='alert',
                        link='/admin/parts?stock_status=low_stock'
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f"Failed to create in-app notification: {str(e)}")
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Sent {total_sent} email alerts for {low_stock_parts.count()} low stock parts'
            )
        )

    def _build_email_body(self, all_parts, out_of_stock, low_stock):
        """Build the email body with part details."""
        lines = [
            "Parts Inventory Alert",
            "=" * 50,
            "",
        ]

        if out_of_stock:
            lines.append("🔴 OUT OF STOCK (Immediate Action Required):")
            lines.append("-" * 50)
            for part in out_of_stock:
                lines.append(f"  • {part.name} ({part.sku})")
                lines.append(f"    Current: 0 {part.unit} | Min Level: {part.min_stock_level} {part.unit}")
                lines.append(f"    Suggested Order: {part.min_stock_level * 2} {part.unit}")
                lines.append("")

        if low_stock:
            lines.append("🟠 LOW STOCK (Reorder Soon):")
            lines.append("-" * 50)
            for part in low_stock:
                lines.append(f"  • {part.name} ({part.sku})")
                lines.append(f"    Current: {part.stock} {part.unit} | Min Level: {part.min_stock_level} {part.unit}")
                suggested_order = max(part.min_stock_level * 2 - part.stock, part.min_stock_level)
                lines.append(f"    Suggested Order: {suggested_order} {part.unit}")
                lines.append("")

        lines.extend([
            "",
            "=" * 50,
            "Please log in to the admin panel to manage parts inventory.",
            "Go to: Admin Panel > Parts Management",
            "",
            "This is an automated alert from your Car Detailing Management System.",
        ])

        return "\n".join(lines)
