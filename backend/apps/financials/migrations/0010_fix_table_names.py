from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('financials', '0009_billitem_budget_category_expense_budget_category'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterModelTable(name='account', table='fin_account'),
                migrations.AlterModelTable(name='bill', table='fin_bill'),
                migrations.AlterModelTable(name='billitem', table='fin_billitem'),
                migrations.AlterModelTable(name='billpayment', table='fin_billpayment'),
                migrations.AlterModelTable(name='budgetallocation', table='fin_budgetallocation'),
                migrations.AlterModelTable(name='budgetcategory', table='fin_budgetcategory'),
                migrations.AlterModelTable(name='cashtransfer', table='fin_cashtransfer'),
                migrations.AlterModelTable(name='contractorcontract', table='fin_contractorcontract'),
                migrations.AlterModelTable(name='contractorinstallment', table='fin_contractorinstallment'),
                migrations.AlterModelTable(name='expense', table='fin_expense'),
                migrations.AlterModelTable(name='installmentpayment', table='fin_installmentpayment'),
                migrations.AlterModelTable(name='journalentry', table='fin_journalentry'),
                migrations.AlterModelTable(name='journalline', table='fin_journalline'),
                migrations.AlterModelTable(name='loandisbursement', table='fin_loandisbursement'),
                migrations.AlterModelTable(name='loanemipayment', table='fin_loanemipayment'),
            ],
            database_operations=[]
        )
    ]
