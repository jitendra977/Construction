"""
Seeds WastageThreshold records per material and creates realistic WASTAGE transactions
to demonstrate the alert system on first load.
"""
from datetime import date, timedelta
from decimal import Decimal


def populate():
    from apps.resources.models import Material, MaterialTransaction, WastageThreshold, WastageAlert

    # ── 1. Create Thresholds for every material ──
    threshold_config = {
        # material_name: (warning_pct, critical_pct)
        'OPC Cement':              (8.0,  15.0),
        'PPC Cement':              (8.0,  15.0),
        'Baluwa (River Sand)':     (10.0, 20.0),
        'Gitti (Aggregate)':       (10.0, 20.0),
        'Steel Rod (12mm)':        (4.0,  10.0),
        'Bricks (Number 1)':       (5.0,  12.0),
        'PVC Pipe 4 inch':         (3.0,   8.0),
        'Electrical Wire (1.5mm)': (3.0,   8.0),
    }

    for mat_name, (warn, crit) in threshold_config.items():
        mat = Material.objects.filter(name=mat_name).first()
        if not mat:
            print(f"  ⚠ Material '{mat_name}' not found — skipping threshold.")
            continue

        threshold, created = WastageThreshold.objects.get_or_create(
            material=mat,
            defaults={
                'warning_pct': warn,
                'critical_pct': crit,
                'notify_owner': True,
                'notify_engineer': True,
            }
        )
        if created:
            print(f"  ✅ Threshold: {mat_name}  warn={warn}%  crit={crit}%")
        else:
            print(f"  ⏩ Threshold already exists for {mat_name}")

    # ── 2. Extra IN (purchase) transactions so we have enough delivered stock ──
    #    The existing seed already adds 100 OPC, 20 Steel, 5000 Bricks.
    #    Let's add a second delivery batch for more materials.
    extra_purchases = [
        ('OPC Cement',          140, 750,   7),
        ('PPC Cement',          100, 650,   6),
        ('Baluwa (River Sand)',   8, 18000, 6),
        ('Gitti (Aggregate)',     6, 22000, 5),
        ('Steel Rod (12mm)',     30, 9500,  5),
        ('Bricks (Number 1)',  7000,   18,  4),
    ]

    for mat_name, qty, price, days_ago in extra_purchases:
        mat = Material.objects.filter(name=mat_name).first()
        if not mat:
            continue
        # Avoid duplicating if re-run
        already = MaterialTransaction.objects.filter(
            material=mat, transaction_type='IN', purpose__startswith='[SEED]'
        ).exists()
        if already:
            print(f"  ⏩ Extra purchase for {mat_name} already seeded.")
            continue

        MaterialTransaction.objects.create(
            material=mat,
            transaction_type='IN',
            quantity=Decimal(str(qty)),
            unit_price=Decimal(str(price)),
            date=date.today() - timedelta(days=days_ago),
            purpose=f'[SEED] Additional bulk delivery for {mat_name}',
            status='RECEIVED',
            create_expense=False,
        )
        # Update material stock
        mat.quantity_purchased += Decimal(str(qty))
        mat.save()
        print(f"  📦 Purchased {qty} {mat.unit} of {mat_name}")

    # ── 3. Wastage Transactions ──
    #    These will trigger the signal and auto-create alerts.
    wastage_data = [
        # (material_name, qty_wasted, days_ago, purpose)
        # Cement — push above 8% warning threshold
        ('OPC Cement',    8,  3, 'Spillage during foundation pour'),
        ('OPC Cement',    6,  2, 'Bags damaged by rain at site'),
        ('OPC Cement',    5,  1, 'Mortar set before use — discarded'),

        # Sand — push above 10% warning
        ('Baluwa (River Sand)', 0.5, 3, 'Swept away by site drainage'),
        ('Baluwa (River Sand)', 0.4, 1, 'Overloaded — fell during transport'),

        # Bricks — moderate wastage under 5%
        ('Bricks (Number 1)', 180, 3, 'Broken during unloading'),
        ('Bricks (Number 1)', 100, 1, 'Cutting waste for wall corners'),

        # Steel — below threshold (healthy)
        ('Steel Rod (12mm)', 0.3, 2, 'Cut-off scrap from rebar bending'),
    ]

    for mat_name, qty, days_ago, purpose in wastage_data:
        mat = Material.objects.filter(name=mat_name).first()
        if not mat:
            continue

        # Avoid duplicating if re-run
        already = MaterialTransaction.objects.filter(
            material=mat, transaction_type='WASTAGE',
            purpose=purpose,
        ).exists()
        if already:
            print(f"  ⏩ Wastage '{purpose}' already seeded.")
            continue

        MaterialTransaction.objects.create(
            material=mat,
            transaction_type='WASTAGE',
            quantity=Decimal(str(qty)),
            unit_price=None,
            date=date.today() - timedelta(days=days_ago),
            purpose=purpose,
            notes='Auto-seeded wastage for demo.',
            status='RECEIVED',
            create_expense=False,
        )
        print(f"  🗑️  Wasted {qty} {mat.unit} of {mat_name}: {purpose}")

    # ── 4. Recalculate stock for all affected materials ──
    for mat_name in set(n for n, *_ in wastage_data):
        mat = Material.objects.filter(name=mat_name).first()
        if mat:
            mat.recalculate_stock()
            print(f"  🔄 Recalculated stock for {mat_name}: stock={mat.current_stock}, wasted={mat.total_wasted}")

    # ── Summary ──
    alert_count = WastageAlert.objects.filter(is_resolved=False).count()
    print(f"\n  📊 Active wastage alerts after seeding: {alert_count}")


if __name__ == '__main__':
    populate()
