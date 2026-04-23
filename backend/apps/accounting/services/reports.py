import datetime
from decimal import Decimal
from django.db.models import Sum, Q
from ..models.ledger import JournalLine, Account, AccountType, EntryType
from ..models.payables import VendorBill

class ReportService:
    @staticmethod
    def cash_flow_summary(project_id=None, months=6):
        """
        Returns monthly cash inflows (credits to bank) and outflows (debits from bank)
        for the past N months based on JournalLines.
        """
        today = datetime.date.today()
        result = []
        
        # Get all bank/asset account IDs
        asset_account_ids = list(
            Account.objects.filter(account_type=AccountType.ASSET).values_list('id', flat=True)
        )
        
        for i in range(months - 1, -1, -1):
            # Calculate month start/end
            month_date = today.replace(day=1) - datetime.timedelta(days=i * 28)
            month_date = month_date.replace(day=1)
            if month_date.month == 12:
                month_end = month_date.replace(year=month_date.year + 1, month=1, day=1) - datetime.timedelta(days=1)
            else:
                month_end = month_date.replace(month=month_date.month + 1, day=1) - datetime.timedelta(days=1)
            
            # Inflows = Credits to liability/equity (capital injections)
            inflows_qs = JournalLine.objects.filter(
                entry_type=EntryType.DEBIT,
                account__account_type=AccountType.ASSET,
                journal_entry__date__gte=month_date,
                journal_entry__date__lte=month_end,
            )
            
            # Outflows = Debits from expense accounts
            outflows_qs = JournalLine.objects.filter(
                entry_type=EntryType.DEBIT,
                account__account_type=AccountType.EXPENSE,
                journal_entry__date__gte=month_date,
                journal_entry__date__lte=month_end,
            )
            
            if project_id:
                inflows_qs = inflows_qs.filter(project_id=project_id)
                outflows_qs = outflows_qs.filter(project_id=project_id)
            
            inflows = inflows_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            outflows = outflows_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            result.append({
                'month': month_date.strftime('%b %Y'),
                'month_key': month_date.strftime('%Y-%m'),
                'inflows': float(inflows),
                'outflows': float(outflows),
                'net': float(inflows - outflows),
            })
        
        return result

    @staticmethod
    def balance_sheet():
        """Returns asset, liability, equity totals from the GL."""
        accounts = Account.objects.all()
        
        assets = Decimal('0.00')
        liabilities = Decimal('0.00')
        equity = Decimal('0.00')
        
        for acc in accounts:
            bal = acc.balance
            if acc.account_type == AccountType.ASSET:
                assets += bal
            elif acc.account_type == AccountType.LIABILITY:
                liabilities += bal
            elif acc.account_type == AccountType.EQUITY:
                equity += bal
        
        return {
            'total_assets': float(assets),
            'total_liabilities': float(liabilities),
            'total_equity': float(equity),
            'net_position': float(assets - liabilities),
        }

    @staticmethod
    def phase_cost_summary(project_id):
        """Returns actual spend per phase for a project."""
        from ..models.budget import PhaseBudgetLine
        
        # Get budget lines for this project which includes the phase link
        budgets = PhaseBudgetLine.objects.filter(project_id=project_id).select_related('phase').order_by('phase__order')
        
        bills_by_phase = (
            VendorBill.objects.filter(project_id=project_id)
            .values('phase_id')
            .annotate(total=Sum('amount'))
        )
        spend_map = {b['phase_id']: float(b['total'] or 0) for b in bills_by_phase}
        
        result = []
        for b in budgets:
            spent = spend_map.get(b.phase_id, 0.0)
            budgeted = float(b.budgeted_amount)
            result.append({
                'phase_id': b.phase_id,
                'phase_name': b.phase.name,
                'budgeted': budgeted,
                'spent': spent,
                'variance': budgeted - spent,
                'percent_used': round((spent / budgeted * 100) if budgeted > 0 else 0, 1),
            })
        
        return result
