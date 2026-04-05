from datetime import date
from decimal import Decimal

def populate():
    from apps.finance.models import FundingSource
    
    sources = [
        {'name': 'Personal Savings (Nabil Bank)', 'type': 'OWN_MONEY', 'amount': 4000000.00, 'date': date(2025, 1, 1)},
        {'name': 'Home Loan (NIC Asia)', 'type': 'LOAN', 'amount': 5000000.00, 'date': date(2025, 3, 15), 'interest': 11.5},
        {'name': 'Borrowed from Family (Saapathi)', 'type': 'BORROWED', 'amount': 1000000.00, 'date': date(2025, 4, 1)},
    ]

    for s_data in sources:
        source, created = FundingSource.objects.get_or_create(
            name=s_data['name'],
            defaults={
                'source_type': s_data['type'],
                'amount': Decimal(str(s_data['amount'])),
                'received_date': s_data['date'],
                'interest_rate': Decimal(str(s_data.get('interest', 0.00))),
                'default_payment_method': 'BANK_TRANSFER' if s_data['type'] == 'LOAN' else 'CASH'
            }
        )
        if created:
            print(f"Created funding source: {source.name}")
        else:
            source.source_type = s_data['type']
            source.amount = Decimal(str(s_data['amount']))
            source.received_date = s_data['date']
            source.interest_rate = Decimal(str(s_data.get('interest', 0.00)))
            source.default_payment_method = 'BANK_TRANSFER' if s_data['type'] == 'LOAN' else 'CASH'
            source.save()
            print(f"Updated funding source: {source.name}")

if __name__ == '__main__':
    populate()
