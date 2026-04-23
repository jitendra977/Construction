from decimal import Decimal
from django.db.models import Sum, Q
from ..models.budget import PhaseBudgetLine
from ..models.payables import VendorBill

class BudgetService:
    @staticmethod
    def get_variance(project_id):
        """
        Returns a list of phases with their budgeted amount vs actual spent amount.

        Spend is sourced from THREE layers and merged:

        Layer 1 – VendorBills WITH a phase FK (exact match per phase)
        Layer 2 – VendorBills WITHOUT a phase FK (unphased bills)
                  These are distributed proportionally across all phases
                  using each phase's share of the total project budget.
        Layer 3 – Legacy finance.Expense records linked to phases of this
                  project (entered via the old Expenses tab).

        This triple-source approach ensures the Finance > Budget tab reflects
        real spend regardless of which data-entry flow was used.
        """
        budgets = list(
            PhaseBudgetLine.objects.filter(project_id=project_id).select_related('phase')
        )
        if not budgets:
            return []

        # ── Layer 1: Phase-tagged VendorBills ────────────────────────────────
        phased_bills = (
            VendorBill.objects
            .filter(project_id=project_id, phase__isnull=False)
            .values('phase_id')
            .annotate(total=Sum('amount'))
        )
        phased_map = {
            item['phase_id']: item['total'] or Decimal('0.00')
            for item in phased_bills
        }

        # ── Layer 2: Unphased VendorBills — distribute proportionally ────────
        unphased_total = (
            VendorBill.objects
            .filter(project_id=project_id, phase__isnull=True)
            .aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        )

        total_budget = sum(b.budgeted_amount for b in budgets) or Decimal('1')
        # weight: each phase's share of the total project budget
        weight_map = {
            b.phase_id: (b.budgeted_amount / total_budget)
            for b in budgets
        }

        # ── Layer 3: Legacy finance.Expense records ──────────────────────────
        try:
            from apps.finance.models import Expense
            phase_ids = [b.phase_id for b in budgets]
            legacy_expenses = (
                Expense.objects
                .filter(phase_id__in=phase_ids, is_inventory_usage=False)
                .values('phase_id')
                .annotate(total=Sum('amount'))
            )
            legacy_map = {
                item['phase_id']: item['total'] or Decimal('0.00')
                for item in legacy_expenses
            }
        except Exception:
            legacy_map = {}

        # ── Build variance report ─────────────────────────────────────────────
        variance_report = []
        for b in budgets:
            phase_id = b.phase_id

            # Exact bills for this phase
            spent_phased = phased_map.get(phase_id, Decimal('0.00'))

            # Proportional share of unphased bills
            spent_unphased = (unphased_total * weight_map.get(phase_id, Decimal('0')))

            # Legacy expenses
            spent_legacy = legacy_map.get(phase_id, Decimal('0.00'))

            spent = spent_phased + spent_unphased + spent_legacy
            variance = b.budgeted_amount - spent

            if b.budgeted_amount > Decimal('0'):
                percent_used = (spent / b.budgeted_amount) * Decimal('100')
            elif spent > Decimal('0'):
                percent_used = Decimal('100.00')
            else:
                percent_used = Decimal('0.00')

            variance_report.append({
                'phase_id': phase_id,
                'phase_name': b.phase.name,
                'budgeted': b.budgeted_amount,
                'spent': round(spent, 2),
                # breakdown for debugging / future UI
                'spent_breakdown': {
                    'vendor_bills_phased':   float(round(spent_phased, 2)),
                    'vendor_bills_unphased': float(round(spent_unphased, 2)),
                    'legacy_expenses':       float(round(spent_legacy, 2)),
                },
                'variance': round(variance, 2),
                'percent_used': round(percent_used, 2),
            })

        return variance_report
