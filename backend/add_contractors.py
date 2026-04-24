import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.resources.models import Contractor
from apps.accounting.models.payables import Vendor

contractors_data = [
    {
        "name": "Shahana Devkota",
        "phone": "9705235712",
        "email": "dshahana55@gmail.com",
        "citizenship_number": "52-01-74-06811",
        "role": "OTHER",
        "position": "Accountant"
    },
    {
        "name": "Rajendra Chaudhary",
        "phone": "9857835712",
        "email": "pecoandc@gmail.com",
        "citizenship_number": "",
        "role": "OTHER",
        "position": "skill sewa Dang Branch Head"
    },
    {
        "name": "Suman Chaudhary",
        "phone": "9866608997",
        "email": "chysuman8564@gmail.com",
        "citizenship_number": "52-01-75-01685",
        "role": "ENGINEER",
        "position": "Architect"
    },
    {
        "name": "Yogesh Adhikari",
        "phone": "9822865730",
        "email": "yogeshadhikari98@gmail.com",
        "citizenship_number": "52-01-75-03736",
        "role": "ENGINEER",
        "position": "Site Engineer (Civil)"
    },
    {
        "name": "Ramesh Chaudhary",
        "phone": "9866818042",
        "email": "jaydeepchaudhary80@gmail.com",
        "citizenship_number": "",
        "role": "ENGINEER",
        "position": "Architect"
    },
    {
        "name": "Uma Bhadel",
        "phone": "9841925374",
        "email": "archi.pulsengc2010@gmail.com",
        "citizenship_number": "",
        "role": "ENGINEER",
        "position": "Senior Architect"
    },
    {
        "name": "Arjun Chaudhary",
        "phone": "9822844736",
        "email": "arjunchaudhari2056@gmail.com",
        "citizenship_number": "52-02-74-01497",
        "role": "ENGINEER",
        "position": "Civil Engineer"
    }
]

for data in contractors_data:
    # 1. Create/Update in Contractor model
    c, created = Contractor.objects.update_or_create(
        name=data['name'],
        defaults={
            'phone': data['phone'],
            'email': data['email'],
            'citizenship_number': data['citizenship_number'],
            'role': data['role'],
            'skills': data['position']  # store position here
        }
    )
    
    # 2. Create/Update in Vendor model (so they appear in Accounting/Payables dropdown)
    v, created_v = Vendor.objects.update_or_create(
        name=data['name'],
        defaults={
            'phone': data['phone'],
            'email': data['email'],
            'category': 'CONTRACTOR',
            'contact_person': data['position']
        }
    )
    print(f"Added {data['name']} to Contractor and Vendor models.")

print("Done.")
