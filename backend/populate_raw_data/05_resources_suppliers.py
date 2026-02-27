def populate():
    from apps.resources.models import Supplier
    
    suppliers = [
        {'name': 'Pashupati Hardware & Sanitaries', 'contact': 'Rajesh Pashupati', 'phone': '9851000000', 'category': 'Sanitary & Plumbing', 'address': 'Baneshwor, Kathmandu'},
        {'name': 'Bhadrakali Brick Kiln', 'contact': 'Suresh Shrestha', 'phone': '9841000001', 'category': 'Civil Materials', 'address': 'Bhaktapur'},
        {'name': 'Jagadamba Steel Depot', 'contact': 'Manish Agarwal', 'phone': '9801000002', 'category': 'Civil Materials', 'address': 'Teku, Kathmandu'},
        {'name': 'Asian Paints Authorized Dealer - New Home', 'contact': 'Prakash Rai', 'phone': '9861000003', 'category': 'Paints', 'address': 'Sukedhara, Kathmandu'},
        {'name': 'Everest Cement Traders', 'contact': 'Dipak Thapa', 'phone': '9851100004', 'category': 'Civil Materials', 'address': 'Kalanki, Kathmandu'},
        {'name': 'Lumbini Electricals', 'contact': 'Bishal Gurung', 'phone': '9841200005', 'category': 'Electrical', 'address': 'Tripureshwor, Kathmandu'},
    ]

    for s_data in suppliers:
        supplier, created = Supplier.objects.get_or_create(
            name=s_data['name'],
            defaults={
                'contact_person': s_data['contact'],
                'phone': s_data['phone'],
                'category': s_data['category'],
                'address': s_data['address'],
                'is_active': True
            }
        )
        if created:
            print(f"Created supplier: {supplier.name}")
        else:
            print(f"Supplier {supplier.name} already exists")

if __name__ == '__main__':
    populate()
