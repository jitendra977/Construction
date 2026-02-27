def verify():
    from apps.finance.models import FundingSource
    from django.db.models import Sum
    
    print("--- Final Funding Verification ---")
    total = FundingSource.objects.aggregate(total_amount=Sum('amount'))['total_amount']
    print(f"Total Funding Amount: Rs. {total:,}")
    
    sources = FundingSource.objects.all()
    for s in sources:
        print(f"- {s.name}: Rs. {s.amount:,}")
    
    if total == 10000000:
        print("VERIFICATION SUCCESS: Total is exactly 1 Crore.")
    else:
        print(f"VERIFICATION FAILURE: Total is {total}, expected 10,000,000.")
    print("--- End Verification ---")

if __name__ == '__main__':
    verify()
