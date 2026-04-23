from decimal import Decimal
from django.db.models import Sum, Q
from ..models.budget import PhaseBudgetLine
from ..models.payables import VendorBill

class BudgetService:
    @staticmethod
    def get_variance(project_id):
        """
        Returns a list of phases with their budgeted amount vs actual spent amount.
        Actual spend is calculated by summing VendorBills tagged to that phase.
        """
        budgets = PhaseBudgetLine.objects.filter(project_id=project_id).select_related('phase')
        
        # Pre-calculate actuals per phase using VendorBills
        # This assumes any Bill mapped to a phase is an actual expense.
        # Ideally, we query the GL JournalLines, but Bills are easier for construction phase mapping.
        actuals = VendorBill.objects.filter(project_id=project_id).values('phase_id').annotate(total_spent=Sum('amount'))
        actuals_map = {item['phase_id']: item['total_spent'] or Decimal('0.00') for item in actuals if item['phase_id']}
        
        variance_report = []
        for b in budgets:
            spent = actuals_map.get(b.phase_id, Decimal('0.00'))
            variance = b.budgeted_amount - spent
            
            # Prevent DivisionByZero
            percent_used = (spent / b.budgeted_amount * 100) if b.budgeted_amount > 0 else Decimal('0.00')
            if spent > 0 and b.budgeted_amount == 0:
                percent_used = Decimal('100.00') # Over budget with 0 budget
                
            variance_report.append({
                'phase_id': b.phase_id,
                'phase_name': b.phase.name,
                'budgeted': b.budgeted_amount,
                'spent': spent,
                'variance': variance,
                'percent_used': round(percent_used, 2)
            })
            
        return variance_report
