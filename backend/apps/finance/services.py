from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
from .models import Payment, FundingTransaction, Expense

class FinanceService:
    @staticmethod
    @transaction.atomic
    def process_payment(expense, amount, date, method, funding_source=None, reference_id="", notes="", proof_photo=None):
        """
        Creates a payment for an expense, adjusts funding source balance, 
        and creates a funding transaction atomically.
        """
        if amount <= 0:
            raise ValidationError("Payment amount must be positive.")
            
        if funding_source and funding_source.current_balance < amount:
            # We allow it, but maybe log it? For now, following existing logic 
            # which just subtracts it anyway.
            pass

        # 1. Create the Payment
        payment = Payment.objects.create(
            expense=expense,
            funding_source=funding_source,
            amount=amount,
            date=date,
            method=method,
            reference_id=reference_id,
            notes=notes,
            proof_photo=proof_photo
        )

        # 2. Update Funding Source
        if funding_source:
            funding_source.current_balance -= amount
            funding_source.save(update_fields=['current_balance'])
            
            # 3. Create Debit Transaction
            FundingTransaction.objects.create(
                funding_source=funding_source,
                amount=amount,
                transaction_type='DEBIT',
                date=date,
                description=f"Payment for: {expense.title}",
                payment=payment
            )

        # 4. Sync Expense Status
        expense.is_paid = (expense.total_paid >= expense.amount)
        expense.save(update_fields=['is_paid'])

        return payment

    @staticmethod
    @transaction.atomic
    def update_payment(payment, **kwargs):
        """
        Updates an existing payment and adjusts associated funding sources and transactions.
        """
        old_amount = payment.amount
        old_source = payment.funding_source
        
        # Apply updates to the fields
        for field, value in kwargs.items():
            setattr(payment, field, value)
        
        new_amount = payment.amount
        new_source = payment.funding_source

        # Handle Funding Source changes
        if old_source != new_source or old_amount != new_amount:
            # Refund old source
            if old_source:
                old_source.current_balance += old_amount
                old_source.save(update_fields=['current_balance'])
                payment.funding_transactions.all().delete()
            
            # Charge new source
            if new_source:
                new_source.current_balance -= new_amount
                new_source.save(update_fields=['current_balance'])
                FundingTransaction.objects.create(
                    funding_source=new_source,
                    amount=new_amount,
                    transaction_type='DEBIT',
                    date=payment.date,
                    description=f"Payment for: {payment.expense.title}",
                    payment=payment
                )

        payment.save()

        # Sync Expense status
        expense = payment.expense
        expense.is_paid = (expense.total_paid >= expense.amount)
        expense.save(update_fields=['is_paid'])
        
        return payment

    @staticmethod
    @transaction.atomic
    def delete_payment(payment):
        """
        Deletes a payment and reverses all side effects.
        """
        expense = payment.expense
        amount = payment.amount
        funding_source = payment.funding_source

        if funding_source:
            funding_source.current_balance += amount
            funding_source.save(update_fields=['current_balance'])
        
        payment.delete()

        # Sync Expense status
        if expense:
            expense.is_paid = (expense.total_paid >= expense.amount)
            expense.save(update_fields=['is_paid'])
