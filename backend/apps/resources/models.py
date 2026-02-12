from django.db import models
from decimal import Decimal

class Supplier(models.Model):
    """
    Suppliers for materials (e.g., Hardware shops, Brick kilns).
    """
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    category = models.CharField(max_length=100, help_text="e.g., Civil Materials, Electrical, Plumbing")
    
    # Advanced Fields
    pan_number = models.CharField(max_length=20, blank=True, verbose_name="PAN/VAT Number")
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    branch = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Contractor(models.Model):
    """
    Labor and contractors (Thekedaar, Mistri, Labour).
    """
    ROLE_CHOICES = [
        ('THEKEDAAR', 'Thekedaar (Contractor)'),
        ('ENGINEER', 'Civil Engineer'),
        ('MISTRI', 'Mistri (Mason)'),
        ('LABOUR', 'Labour (Helper)'),
        ('ELECTRICIAN', 'Electrician'),
        ('PLUMBER', 'Plumber'),
        ('CARPENTER', 'Carpenter/Kaath Mistri'),
        ('PAINTER', 'Painter'),
        ('TILE_MISTRI', 'Tile/Marble Mistri'),
        ('WELDER', 'Welder/Grill Mistri'),
        ('OTHER', 'Other'),
    ]

    name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    
    # Advanced Fields
    citizenship_number = models.CharField(max_length=50, blank=True)
    bank_details = models.TextField(blank=True, help_text="Bank, Account No, Branch")
    skills = models.TextField(blank=True, help_text="Comma separated skills")
    
    rate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Daily Wages or Contract Amount", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    joined_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.get_role_display()}"

class Material(models.Model):
    """
    Inventory of Nepali construction materials.
    """
    UNIT_CHOICES = [
        ('TIPPER', 'Tipper'),
        ('TRACTOR', 'Tractor'),
        ('BORA', 'Bora (Sack)'),
        ('BUNDLE', 'Bundle'),
        ('PCS', 'Pieces'),
        ('KG', 'Kilograms (Kg)'),
        ('TON', 'Ton'),
        ('LITER', 'Liter'),
        ('SQFT', 'Sq. Ft.'),
        ('CFT', 'Cu. Ft.'),
        ('TRUCK', 'Truck Load'),
    ]

    name = models.CharField(max_length=100, help_text="e.g., OPC Cement, Baluwa (Sand), Gitti (Aggregates)")
    category = models.CharField(max_length=50, blank=True, help_text="e.g., Civil, Plumbing, Electrical")
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='materials')
    budget_category = models.ForeignKey('finance.BudgetCategory', on_delete=models.SET_NULL, null=True, blank=True, related_name='materials')
    image = models.ImageField(upload_to='materials/', null=True, blank=True)
    
    quantity_estimated = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_purchased = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_used = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock_level = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Alert level")
    
    avg_cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    @property
    def current_stock_calculated(self):
        """
        Dynamically calculate stock from transactions to verify against current_stock field.
        Only counts 'RECEIVED' transactions.
        """
        from django.db.models import Sum
        in_qty = self.transactions.filter(transaction_type='IN', status='RECEIVED').aggregate(total=Sum('quantity'))['total'] or 0
        out_qty = self.transactions.filter(transaction_type__in=['OUT', 'WASTAGE'], status='RECEIVED').aggregate(total=Sum('quantity'))['total'] or 0
        return in_qty - out_qty

    def recalculate_stock(self):
        """
        Audit method to reset stock and totals from transaction history.
        Only counts 'RECEIVED' transactions.
        """
        from django.db.models import Sum, Avg
        self.quantity_purchased = self.transactions.filter(transaction_type='IN', status='RECEIVED').aggregate(total=Sum('quantity'))['total'] or 0
        self.quantity_used = self.transactions.filter(transaction_type__in=['OUT', 'WASTAGE'], status='RECEIVED').aggregate(total=Sum('quantity'))['total'] or 0
        self.current_stock = self.quantity_purchased - self.quantity_used
        
        # Recalculate average cost
        self.avg_cost_per_unit = self.transactions.filter(transaction_type='IN', status='RECEIVED').aggregate(avg=Avg('unit_price'))['avg'] or 0
        self.save()

    def save(self, *args, **kwargs):
        self.current_stock = self.quantity_purchased - self.quantity_used
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.get_unit_display()} left)"

class MaterialTransaction(models.Model):
    """
    Tracks every In/Out movement of materials.
    """
    TYPE_CHOICES = [
        ('IN', 'Stock In (Purchase)'),
        ('OUT', 'Stock Out (Used)'),
        ('RETURN', 'Supplier Return'),
        ('WASTAGE', 'Wastage/Loss'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending Order'),
        ('RECEIVED', 'Received'),
        ('CANCELLED', 'Cancelled'),
    ]

    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RECEIVED')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date = models.DateField()
    
    # Related entities
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='material_transactions')
    expense = models.ForeignKey('finance.Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_transactions')
    funding_source = models.ForeignKey('finance.FundingSource', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_transactions')
    room = models.ForeignKey('core.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_usage')
    
    purpose = models.CharField(max_length=200, blank=True, help_text="e.g., Ground Floor Slab, Kitchen Walls")
    notes = models.TextField(blank=True)
    create_expense = models.BooleanField(default=True, help_text="Uncheck for Opening Stock or Gifts (No Expense created)")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_transaction = None
        if not is_new:
            old_transaction = MaterialTransaction.objects.get(pk=self.pk)
        
        # 1. Update Linked Expense for Stock IN
        if self.transaction_type == 'IN' and self.create_expense and self.status == 'RECEIVED':
            from django.apps import apps
            Expense = apps.get_model('finance', 'Expense')
            
            if is_new and not self.expense:
                # Auto-create Expense
                category = self.material.budget_category
                if not category:
                    BudgetCategory = apps.get_model('finance', 'BudgetCategory')
                    category, _ = BudgetCategory.objects.get_or_create(name="Miscellaneous Materials", defaults={'allocation': 0})

                new_expense = Expense(
                    title=f"Purchase: {self.quantity} {self.material.get_unit_display()} {self.material.name}",
                    amount=self.quantity * (self.unit_price or 0),
                    expense_type='MATERIAL',
                    category=category,
                    material=self.material,
                    quantity=self.quantity,
                    unit_price=self.unit_price,
                    supplier=self.supplier,
                    funding_source=self.funding_source,
                    date=self.date,
                    paid_to=self.supplier.name if self.supplier else "Cash Purchase",
                    is_paid=True,
                    notes=f"Auto-generated from Material Transaction"
                )
                new_expense._from_transaction = True
                new_expense.save()
                self.expense = new_expense
            elif self.expense:
                # Sync existing expense
                exp = self.expense
                exp.amount = self.quantity * (self.unit_price or 0)
                exp.material = self.material
                exp.quantity = self.quantity
                exp.unit_price = self.unit_price
                exp.funding_source = self.funding_source
                exp.supplier = self.supplier
                exp.date = self.date
                exp._from_transaction = True
                exp.save()

        # 2. Adjust Material Stock (Atomic-ish)
        mat = self.material
        
        # Reverse old transaction impact if updating
        if not is_new and old_transaction.status == 'RECEIVED':
            if old_transaction.transaction_type == 'IN':
                mat.quantity_purchased -= old_transaction.quantity
            elif old_transaction.transaction_type in ['OUT', 'WASTAGE']:
                mat.quantity_used -= old_transaction.quantity
            elif old_transaction.transaction_type == 'RETURN':
                mat.quantity_purchased += old_transaction.quantity # Return means we had it, now we don't

        # Apply new/updated transaction impact ONLY IF RECEIVED
        if self.status == 'RECEIVED':
            if self.transaction_type == 'IN':
                mat.quantity_purchased += self.quantity
                # Update Average Cost on Purchase
                if self.unit_price:
                    # Simple weighted average
                    total_purchased = mat.quantity_purchased
                    if total_purchased > 0:
                        current_avg = mat.avg_cost_per_unit or Decimal('0')
                        new_avg = ((mat.quantity_purchased - self.quantity) * current_avg + (self.quantity * self.unit_price)) / total_purchased
                        mat.avg_cost_per_unit = new_avg
            elif self.transaction_type in ['OUT', 'WASTAGE']:
                # Negative Stock Guard
                current_available = mat.quantity_purchased - mat.quantity_used
                if self.quantity > current_available:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(f"Insufficient stock! Available: {current_available} {mat.get_unit_display()}, Requested: {self.quantity}")
                    
                mat.quantity_used += self.quantity
            elif self.transaction_type == 'RETURN':
                mat.quantity_purchased -= self.quantity

        mat.save()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Reverse stock adjustment before deleting IF it was RECEIVED
        mat = self.material
        if self.status == 'RECEIVED':
            if self.transaction_type == 'IN':
                mat.quantity_purchased -= self.quantity
                # If it's a purchase, optionally delete linked expense
                if self.expense:
                    self.expense.delete()
            elif self.transaction_type in ['OUT', 'WASTAGE']:
                mat.quantity_used -= self.quantity
            elif self.transaction_type == 'RETURN':
                mat.quantity_purchased += self.quantity
            
            mat.save()
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type} - {self.quantity} {self.material.name}"

class Document(models.Model):
    """
    Storage for blueprints, permits, and bills.
    """
    TYPE_CHOICES = [
        ('NAKSHA', 'Naksha (Blueprint/Map)'),
        ('LALPURJA', 'Lalpurja (Land Cert)'),
        ('PERMIT', 'Nagar Palika Permit'),
        ('BILL', 'Bill/Invoice'),
        ('PHOTO', 'Site Photo'),
        ('AGREEMENT', 'Samjhauta Patra (Contract)'),
        ('OTHER', 'Other'),
    ]

    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/%Y/%m/')
    document_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"
