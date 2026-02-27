from datetime import date
from decimal import Decimal

def populate():
    from apps.finance.models import Expense, Payment, BudgetCategory, FundingSource
    from apps.core.models import ConstructionPhase
    
    civil_cat = BudgetCategory.objects.filter(name='Civil Materials').first()
    own_funds = FundingSource.objects.filter(source_type='OWN_MONEY').first()
    phase1 = ConstructionPhase.objects.filter(order=1).first()
    
    expenses = [
        {'title': 'Site Cleaning & leveling', 'amount': 25000, 'type': 'LABOR', 'cat': civil_cat, 'phase': phase1, 'paid_to': 'Local Labour Group'},
        {'title': 'Cement for temporary shed (10 bags)', 'amount': 7500, 'type': 'MATERIAL', 'cat': civil_cat, 'phase': phase1, 'paid_to': 'Hardware Shop'},
    ]

    for e_data in expenses:
        expense, created = Expense.objects.get_or_create(
            title=e_data['title'],
            defaults={
                'amount': Decimal(str(e_data['amount'])),
                'expense_type': e_data['type'],
                'category': e_data['cat'],
                'phase': e_data['phase'],
                'funding_source': own_funds,
                'date': date.today(),
                'paid_to': e_data['paid_to'],
                'is_paid': True
            }
        )
        if created:
            print(f"Created expense: {expense.title}")
            # Create payment
            Payment.objects.create(
                expense=expense,
                funding_source=own_funds,
                amount=expense.amount,
                date=date.today(),
                method='CASH'
            )
            print(f"  Created full payment for: {expense.title}")

if __name__ == '__main__':
    populate()
