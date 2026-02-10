from django.db import models

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
    image = models.ImageField(upload_to='materials/', null=True, blank=True)
    
    quantity_estimated = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_purchased = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_used = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock_level = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Alert level")
    
    avg_cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def save(self, *args, **kwargs):
        # In a real system, current_stock should be calculated from Transactions
        # But we keep this for legacy/direct updates if needed
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

    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date = models.DateField()
    
    # Related entities
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='material_transactions')
    expense = models.ForeignKey('finance.Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_transactions')
    room = models.ForeignKey('core.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_usage')
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_transaction = None
        if not is_new:
            old_transaction = MaterialTransaction.objects.get(pk=self.pk)
        
        super().save(*args, **kwargs)
        
        # Update Material Stock
        mat = self.material
        if self.transaction_type == 'IN':
            mat.quantity_purchased += self.quantity
            if not is_new: mat.quantity_purchased -= old_transaction.quantity
        elif self.transaction_type == 'OUT' or self.transaction_type == 'WASTAGE':
            mat.quantity_used += self.quantity
            if not is_new: mat.quantity_used -= old_transaction.quantity
        elif self.transaction_type == 'RETURN':
            mat.quantity_purchased -= self.quantity
            if not is_new: mat.quantity_purchased += old_transaction.quantity
            
        mat.save()

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
