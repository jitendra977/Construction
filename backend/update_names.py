import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.financials.models.budget import BudgetCategory

def run():
    translations = {
        "Design And Drawing": "Design And Drawing (डिजाइन र नक्सा)",
        "Levelling and Excavation Works": "Levelling and Excavation Works (खन्ने र सम्याउने कार्य)",
        "Foundation Protection and Preparation Works": "Foundation Protection and Preparation Works (जगको सुरक्षा र तयारी)",
        "RCC, Reinforcement and Shuttering Works": "RCC, Reinforcement and Shuttering Works (आर.सी.सी., डन्डी र सटरिङ)",
        "Opening Schedule": "Opening Schedule (ढोका र झ्याल)",
        "Walls / Plasters/Painting": "Walls / Plasters/Painting (पर्खाल, प्लास्टर र रङरोगन)",
        "Tiles, Marble, Screeding, Punning and Granite": "Tiles, Marble, Screeding, Punning and Granite (टायल र मार्बल कार्य)",
        "Exterior Design Section": "Exterior Design Section (बाहिरी डिजाइन कार्य)",
        "Waterproofing and Special Treatment": "Waterproofing and Special Treatment (वाटरप्रुफिङ कार्य)",
        "Other Items (Tank, Septic, Stairs, etc.)": "Other Items (Tank, Septic, Stairs, etc.) (अन्य कार्य- ट्यांकी, सेफ्टी ट्यांकी)",
        "Electrical Fittings": "Electrical Fittings (विद्युतीय जडान)",
        "Sanitary Pipes and Fittings": "Sanitary Pipes and Fittings (स्यानिटरी तथा पाइप जडान)",
        "Management Charge": "Management Charge (व्यवस्थापन खर्च)"
    }

    for cat in BudgetCategory.objects.all():
        if cat.name in translations:
            cat.name = translations[cat.name]
            cat.save()
            print(f"Updated: {cat.name}")

    print("Successfully updated category names with Nepali translations.")

run()
