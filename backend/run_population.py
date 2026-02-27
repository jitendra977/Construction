import os
import sys
import django

# Setup Django environment
# Add the current directory to sys.path so we can import apps correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def run_all():
    script_names = [
        '00_cleanup', '01_accounts', '02_core_project', '03_core_phases', '04_core_floors_rooms',
        '05_resources_suppliers', '06_resources_contractors', '07_resources_materials',
        '08_finance_categories', '09_finance_funding', '10_tasks',
        '11_finance_expenses', '12_permits'
    ]
    
    print("--- Starting Full Project Data Population ---")
    for name in script_names:
        print(f"\nRunning: {name}...")
        try:
            # Use dynamic import because filenames start with digits
            module = __import__(f'populate_raw_data.{name}', fromlist=['populate'])
            module.populate()
        except Exception as e:
            print(f"Error in {name}: {e}")
            import traceback
            traceback.print_exc()
    print("\n--- Data Population Complete ---")

if __name__ == '__main__':
    run_all()
