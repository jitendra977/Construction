from django.db import models
from django.conf import settings
from decimal import Decimal

class Supplier(models.Model):
    """
    Suppliers for materials (e.g., Hardware shops, Brick kilns).
    """
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20)
    address = models.TextField(null=True, blank=True)
    photo = models.ImageField(upload_to='suppliers/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    category = models.CharField(max_length=100, help_text="e.g., Civil Materials, Electrical, Plumbing")
    
    # Advanced Fields
    pan_number = models.CharField(max_length=20, blank=True, verbose_name="PAN/VAT Number")
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    branch = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_billed(self):
        return sum(exp.amount for exp in self.expenses.all())

    @property
    def total_paid(self):
        return sum(exp.total_paid for exp in self.expenses.all())

    @property
    def balance_due(self):
        return self.total_billed - self.total_paid

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
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='contractor_profile',
        null=True, 
        blank=True,
        help_text="Linked user account for this contractor"
    )

    name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    photo = models.ImageField(upload_to='contractors/', null=True, blank=True)
    
    # Advanced Fields
    citizenship_number = models.CharField(max_length=50, blank=True)
    bank_details = models.TextField(blank=True, help_text="Bank, Account No, Branch")
    skills = models.TextField(blank=True, help_text="Comma separated skills")
    
    rate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Contract Amount", null=True, blank=True)
    daily_wage = models.DecimalField(max_digits=10, decimal_places=2, help_text="Daily Wage (Jyaala) for laborers", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    joined_date = models.DateField(auto_now_add=True)

    @property
    def display_name(self):
        if self.user:
            full_name = f"{self.user.first_name} {self.user.last_name}".strip()
            return full_name or self.name or self.user.username
        return self.name

    @property
    def display_email(self):
        return self.user.email if self.user else self.email

    @property
    def display_phone(self):
        return self.user.phone_number if self.user else self.phone

    @property
    def total_amount(self):
        return sum(exp.amount for exp in self.expenses.all())

    @property
    def total_paid(self):
        return sum(exp.total_paid for exp in self.expenses.all())

    @property
    def balance_due(self):
        return self.total_amount - self.total_paid

    @property
    def name_display(self):
        if self.user:
            full_name = f"{self.user.first_name} {self.user.last_name}".strip()
            return full_name or self.user.username
        return self.name

    def __str__(self):
        return f"{self.name_display} - {self.get_role_display()}"

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
    total_wasted = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock_level = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="General alert level")
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Critical level to trigger reorder warning")
    
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
        from decimal import Decimal
        
        # 1. Total Purchased (IN)
        self.quantity_purchased = self.transactions.filter(transaction_type='IN', status='RECEIVED').aggregate(total=Sum('quantity'))['total'] or Decimal('0.00')
        
        # 2. Total Used (OUT - actual work)
        self.quantity_used = self.transactions.filter(transaction_type='OUT', status='RECEIVED').aggregate(total=Sum('quantity'))['total'] or Decimal('0.00')
        
        # 3. Total Wasted (WASTAGE - loss)
        self.total_wasted = self.transactions.filter(transaction_type='WASTAGE', status='RECEIVED').aggregate(total=Sum('quantity'))['total'] or Decimal('0.00')
        
        # 4. Current Stock (Purchased - Used - Wasted)
        self.current_stock = self.quantity_purchased - (self.quantity_used + self.total_wasted)
        
        # 5. Average Cost (from purchases)
        self.avg_cost_per_unit = self.transactions.filter(transaction_type='IN', status='RECEIVED').aggregate(avg=Avg('unit_price'))['avg'] or Decimal('0.00')
        
        self.save()

    def save(self, *args, **kwargs):
        # Ensure current_stock is always updated before save if fields were changed manually
        if not kwargs.get('update_fields') or 'current_stock' not in kwargs.get('update_fields'):
             self.current_stock = self.quantity_purchased - (self.quantity_used + self.total_wasted)
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
    phase = models.ForeignKey('core.ConstructionPhase', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_usage')
    
    purpose = models.CharField(max_length=200, blank=True, help_text="e.g., Ground Floor Slab, Kitchen Walls")
    notes = models.TextField(blank=True)
    create_expense = models.BooleanField(default=True, help_text="Uncheck for Opening Stock or Gifts (No Expense created)")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.quantity} {self.material.name}"

class Document(models.Model):
    """
    Storage for blueprints, permits, and bills.
    """
    TYPE_CHOICES = [
        ('NAKSHA', 'Naksha (Blueprint/Map)'),
        ('LALPURJA', 'Lalpurja (Land Cert)'),
        ('NAGRIKTA', 'Nagrikta (Citizenship)'),
        ('TIRO', 'Tiro Rasid (Tax Receipt)'),
        ('CHARKILLA', 'Charkilla (Boundary)'),
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

class WastageThreshold(models.Model):
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='thresholds')
    warning_pct = models.FloatField(default=8.0)
    critical_pct = models.FloatField(default=15.0)
    notify_owner = models.BooleanField(default=True)
    notify_engineer = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.material.name} - Warn: {self.warning_pct}% Crit: {self.critical_pct}%"

class WastageAlert(models.Model):
    SEVERITY = [('WARNING', 'Warning'), ('CRITICAL', 'Critical')]
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='alerts')
    threshold = models.ForeignKey(WastageThreshold, on_delete=models.CASCADE)
    transaction = models.ForeignKey(MaterialTransaction, on_delete=models.CASCADE)
    severity = models.CharField(max_length=10, choices=SEVERITY)
    wastage_pct = models.FloatField()
    is_resolved = models.BooleanField(default=False)
    resolved_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.severity}] {self.material.name} - {self.wastage_pct}%"
