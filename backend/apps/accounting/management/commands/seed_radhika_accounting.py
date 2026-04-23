"""
Seed comprehensive real-life accounting data for Radhika Mam project (id=4).
Contract: Mrs. Radhika K.C. Khadka | Skill Sewa | NPR 12,420,286.82
"""
from decimal import Decimal
from django.core.management.base import BaseCommand

ZERO = Decimal('0.00')


class Command(BaseCommand):
    help = 'Seed real accounting data for Radhika Mam project'

    def handle(self, *args, **options):
        from apps.accounting.models import (
            BankAccount, CapitalSource, CashTransfer,
            Vendor, VendorBill, BillPayment,
            Account, JournalEntry, JournalLine,
            ContractorPaymentRequest, RetentionRelease,
            PhaseBudgetLine,
        )
        from apps.core.models import HouseProject, ConstructionPhase

        project = HouseProject.objects.get(id=4)
        phases = {ph.order: ph for ph in ConstructionPhase.objects.filter(project=project)}
        self.stdout.write(self.style.SUCCESS(f'\nProject: {project.name}'))

        # ── 1. CLEAR (strict FK order) ───────────────────────────────────
        self.stdout.write('\n[1] Clearing...')
        RetentionRelease.objects.all().delete()
        BillPayment.objects.all().delete()
        VendorBill.objects.all().delete()
        ContractorPaymentRequest.objects.all().delete()
        PhaseBudgetLine.objects.filter(project=project).delete()
        CashTransfer.objects.all().delete()
        CapitalSource.objects.all().delete()
        BankAccount.objects.all().delete()
        Vendor.objects.all().delete()
        self.stdout.write('    Done.')

        # ── 2. GL ACCOUNTS (get or create) ───────────────────────────────
        self.stdout.write('\n[2] GL accounts...')
        def gl(code, name, atype):
            obj, _ = Account.objects.get_or_create(
                code=code, defaults={'name': name, 'account_type': atype})
            return obj

        a_rbb  = gl('1101', 'Rastriya Banijya Bank - Tulsipur', 'ASSET')
        a_nbl  = gl('1102', 'Nepal Bank Ltd - Tulsipur',        'ASSET')
        a_nic  = gl('1103', 'NIC Asia Bank - Dang',             'ASSET')
        a_cash = gl('1001', 'Cash in Hand',                     'ASSET')
        a_ar   = gl('1201', 'Accounts Receivable',              'ASSET')
        a_ap   = gl('2001', 'Accounts Payable',                 'LIABILITY')
        a_loan = gl('2101', 'Bank Loan - RBB',                  'LIABILITY')
        a_eq   = gl('3001', 'Owner Equity',                     'EQUITY')
        a_fam  = gl('3002', 'Family Contribution',              'EQUITY')
        a_civ  = gl('5001', 'Civil Construction Expense',       'EXPENSE')
        a_mat  = gl('5002', 'Material Purchase',                'EXPENSE')
        a_lab  = gl('5003', 'Labor Expense',                    'EXPENSE')
        a_elec = gl('5005', 'Electrical Work',                  'EXPENSE')
        a_plmb = gl('5006', 'Plumbing Work',                    'EXPENSE')
        self.stdout.write(f'    GL accounts ready.')

        # ── 3. BANK ACCOUNTS ─────────────────────────────────────────────
        self.stdout.write('\n[3] Bank accounts...')
        rbb = BankAccount.objects.create(
            name='Rastriya Banijya Bank - Tulsipur',
            account_number='020110010023456', gl_account=a_rbb)
        nbl = BankAccount.objects.create(
            name='Nepal Bank Ltd - Tulsipur',
            account_number='010100345678901', gl_account=a_nbl)
        nic = BankAccount.objects.create(
            name='NIC Asia Bank - Dang',
            account_number='123456789012345', gl_account=a_nic)
        for b in [rbb, nbl, nic]:
            self.stdout.write(f'    {b.name}')

        # ── 4. CAPITAL SOURCES ───────────────────────────────────────────
        self.stdout.write('\n[4] Capital sources...')
        cap_data = [
            ('Owner Equity / आफ्नै पूँजी',       'SAVINGS',    a_eq,   Decimal('5000000')),
            ('RBB Home Loan / बैंक ऋण',           'LOAN',       a_loan, Decimal('7000000')),
            ('Family Contribution / परिवार',       'OTHER',      a_fam,  Decimal('800000')),
            ('Personal Savings / व्यक्तिगत बचत',  'SAVINGS',    a_eq,   Decimal('500000')),
        ]
        for name, stype, gl_acct, amt in cap_data:
            CapitalSource.objects.create(
                name=name, source_type=stype, gl_account=gl_acct, budgeted_amount=amt)
            self.stdout.write(f'    {name} | NPR {amt:,.0f}')

        # ── 5. VENDORS ───────────────────────────────────────────────────
        self.stdout.write('\n[5] Vendors...')
        skill  = Vendor.objects.create(name='Skill Sewa Construction Pvt. Ltd.', phone='9857812345', address='Tulsipur-4, Dang',  pan_number='601234567', category='Civil Contractor',    is_active=True)
        shr_hw = Vendor.objects.create(name='Shrestha Hardware & Materials',     phone='9855623456', address='Tulsipur Bazaar',   pan_number='602345678', category='Material Supplier',   is_active=True)
        thapa  = Vendor.objects.create(name='Thapa Electrical Works',            phone='9851234567', address='Ghorahi, Dang',     pan_number=None,        category='Electrical',          is_active=True)
        bhand  = Vendor.objects.create(name='Bhandari Plumbing Services',        phone='9847890123', address='Tulsipur-3, Dang',  pan_number=None,        category='Plumbing',            is_active=True)
        lumb   = Vendor.objects.create(name='Lumbini Sand & Gravel Suppliers',   phone='9856789012', address='Rapti River, Dang', pan_number='603456789', category='Material Supplier',   is_active=True)
        cement = Vendor.objects.create(name='Dang Cement Depot',                 phone='9853456789', address='Tulsipur Bazaar',   pan_number='604567890', category='Material Supplier',   is_active=True)
        iron   = Vendor.objects.create(name='Joshi Iron & Steel Store',          phone='9841234567', address='Ghorahi Bazaar',    pan_number=None,        category='Material Supplier',   is_active=True)
        labor  = Vendor.objects.create(name='Ram Bahadur Labor Contractor',      phone='9867890123', address='Tulsipur-7',        pan_number=None,        category='Labor',               is_active=True)
        for v in [skill, shr_hw, thapa, bhand, lumb, cement, iron, labor]:
            self.stdout.write(f'    {v.name} ({v.category})')

        # ── 6. VENDOR BILLS ──────────────────────────────────────────────
        self.stdout.write('\n[6] Vendor bills...')
        bills_raw = [
            # (vendor, phase_order, invoice_no, date, due_date, description, amount, expense_account, paid_amount, paid_date)
            # Phase 1 — Advance FULLY PAID
            (skill, 1, 'SS-2025-001', '2025-01-16', '2025-01-16',
             'Advance per contract clause 4.1 — Mobilization & site setup',
             Decimal('1863043.02'), a_civ, Decimal('1863043.02'), '2025-01-18'),

            # Phase 2 — Footing FULLY PAID
            (skill, 2, 'SS-2025-002', '2025-02-05', '2025-02-15',
             'Footing excavation, PCC, RCC column footing per structural drawing',
             Decimal('1242028.68'), a_civ, Decimal('1242028.68'), '2025-02-20'),
            (lumb,  2, 'LUM-2025-011', '2025-01-22', '2025-02-05',
             'River sand supply — 80 cubic meters for footing',
             Decimal('96000.00'), a_mat, Decimal('96000.00'), '2025-02-06'),
            (cement,2, 'DC-2025-031', '2025-01-25', '2025-02-10',
             'OPC Cement 43 grade — 420 bags for foundation',
             Decimal('168000.00'), a_mat, Decimal('168000.00'), '2025-02-12'),
            (iron,  2, 'JIS-2025-007', '2025-01-28', '2025-02-15',
             'Fe-500 TMT rebar 8.5 MT — column footing reinforcement',
             Decimal('127500.00'), a_mat, Decimal('100000.00'), '2025-02-16'),

            # Phase 3 — DPC IN_PROGRESS (partial)
            (skill, 3, 'SS-2025-003', '2025-03-05', '2025-03-20',
             'DPC level work — plinth beam, backfilling, compaction, PCC under slab',
             Decimal('1242028.68'), a_civ, Decimal('621014.34'), '2025-03-22'),
            (lumb,  3, 'LUM-2025-015', '2025-03-02', '2025-03-15',
             'Stone aggregate 20mm — 60 cubic meters for DPC concrete',
             Decimal('84000.00'), a_mat, Decimal('84000.00'), '2025-03-16'),
            (cement,3, 'DC-2025-038', '2025-03-08', '2025-03-25',
             'OPC Cement — 380 bags for plinth beam and DPC',
             Decimal('152000.00'), a_mat, Decimal('152000.00'), '2025-03-26'),
            (labor, 3, 'RL-2025-004', '2025-03-15', '2025-03-31',
             'Unskilled labor 240 man-days — earthwork & compaction DPC',
             Decimal('96000.00'), a_lab, Decimal('48000.00'), '2025-03-20'),

            # Phase 4 — GF Wall (upcoming / unpaid)
            (shr_hw,4, 'SHW-2025-020', '2025-04-18', '2025-05-05',
             'First class brick — 25,000 nos. for Ground Floor masonry',
             Decimal('187500.00'), a_mat, ZERO, None),
            (bhand, 4, 'BP-2025-001', '2025-04-20', '2025-05-15',
             'GI pipe & CPVC fittings — Ground Floor plumbing rough-in',
             Decimal('45000.00'), a_plmb, ZERO, None),
            (thapa, 4, 'TE-2025-001', '2025-04-22', '2025-05-15',
             'Conduit & wiring rough-in — Ground Floor electrical',
             Decimal('38000.00'), a_elec, ZERO, None),
        ]

        bill_objs = []
        for (vendor, ph_order, inv, date, due, desc, amt, exp_acct, paid, paid_date) in bills_raw:
            phase = phases.get(ph_order)
            bill = VendorBill.objects.create(
                vendor=vendor, project=project, phase=phase,
                invoice_number=inv, date=date, due_date=due,
                description=desc, amount=amt, expense_account=exp_acct,
            )
            bill_objs.append((bill, paid, paid_date))
            self.stdout.write(f'    {inv:18} | {vendor.name[:28]:28} | NPR {amt:>12,.0f}')

        # ── 7. BILL PAYMENTS ─────────────────────────────────────────────
        self.stdout.write('\n[7] Payments...')
        for bill, paid_amt, paid_date in bill_objs:
            if paid_amt and paid_amt > ZERO and paid_date:
                pay_bank = rbb if paid_amt > Decimal('500000') else nbl
                ref = f'TRF-{paid_date.replace("-","")}-{bill.invoice_number[-3:]}'
                BillPayment.objects.create(
                    bill=bill, amount=paid_amt, date=paid_date,
                    bank_account=pay_bank, reference=ref,
                    notes='Payment per contract schedule')
                self.stdout.write(f'    {bill.invoice_number} paid NPR {paid_amt:,.0f} via {pay_bank.name.split("-")[0].strip()}')

        # ── 8. CONTRACTOR PAYMENT REQUESTS ──────────────────────────────
        self.stdout.write('\n[8] Contractor payment requests...')
        for ph_order, claimed, ret_pct, comp_pct, status in [
            (1, Decimal('1863043.02'), Decimal('5'), Decimal('100'), 'APPROVED'),
            (2, Decimal('1242028.68'), Decimal('5'), Decimal('100'), 'APPROVED'),
            (3, Decimal('1242028.68'), Decimal('5'), Decimal('55'),  'PENDING'),
        ]:
            phase = phases[ph_order]
            retention = (claimed * ret_pct / 100).quantize(Decimal('0.01'))
            net = claimed - retention
            ContractorPaymentRequest.objects.create(
                project=project, phase=phase, contractor=skill,
                description=f'Milestone claim — {phase.name}',
                claimed_amount=claimed, retention_amount=retention, net_payable=net,
                work_completion_percentage=comp_pct, status=status,
            )
            self.stdout.write(f'    Phase {ph_order} | NPR {claimed:,.0f} | {status}')

        # ── 9. PHASE BUDGETS ─────────────────────────────────────────────
        self.stdout.write('\n[9] Phase budgets...')
        for order, phase in sorted(phases.items()):
            PhaseBudgetLine.objects.create(
                project=project, phase=phase,
                budgeted_amount=phase.estimated_budget)
            self.stdout.write(f'    Phase {order}: NPR {phase.estimated_budget:,.0f}')

        # ── SUMMARY ──────────────────────────────────────────────────────
        total_billed = sum(b.amount for b in VendorBill.objects.filter(project=project))
        total_paid   = sum(p.amount for p in BillPayment.objects.all())
        self.stdout.write(self.style.SUCCESS('\n' + '='*56))
        self.stdout.write(self.style.SUCCESS('✓  Seeding complete!'))
        self.stdout.write(f'  Banks:            {BankAccount.objects.count()}')
        self.stdout.write(f'  Capital Sources:  {CapitalSource.objects.count()}')
        self.stdout.write(f'  Vendors:          {Vendor.objects.count()}')
        self.stdout.write(f'  Bills:            {VendorBill.objects.filter(project=project).count()}')
        self.stdout.write(f'  Payments:         {BillPayment.objects.count()}')
        self.stdout.write(f'  PR (contractor):  {ContractorPaymentRequest.objects.filter(project=project).count()}')
        self.stdout.write(f'  Phase Budgets:    {PhaseBudgetLine.objects.filter(project=project).count()}')
        self.stdout.write(f'  Total Billed:     NPR {total_billed:>14,.2f}')
        self.stdout.write(f'  Total Paid:       NPR {total_paid:>14,.2f}')
        self.stdout.write(f'  Outstanding:      NPR {total_billed - total_paid:>14,.2f}')
