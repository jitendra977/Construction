from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from .models import Contractor, MaterialTransaction, WastageAlert

User = get_user_model()

def send_in_app_notification(material, severity, pct):
    # Placeholder for in-app notification system
    print(f"[NOTIFICATION] {severity} Wastage Alert! {material.name} wastage is at {pct}%")

@receiver(post_save, sender=MaterialTransaction)
def sync_material_stock_on_save(sender, instance, **kwargs):
    """
    Synchronizes material current_stock, usage, and wastage totals whenever
    a transaction is added or updated.
    """
    mat = instance.material
    # Sync all fields from the full history for absolute accuracy
    mat.recalculate_stock()
    
    # If it's a wastage transaction, check if it breaches thresholds
    if instance.transaction_type in ['WASTED', 'WASTAGE']:
        if mat.quantity_purchased == 0:
            return

        pct = (float(mat.total_wasted) / float(mat.quantity_purchased)) * 100

        for threshold in mat.thresholds.all():
            if pct >= threshold.critical_pct:
                _create_alert(mat, threshold, instance, pct, 'CRITICAL')
            elif pct >= threshold.warning_pct:
                _create_alert(mat, threshold, instance, pct, 'WARNING')

def _create_alert(material, threshold, txn, pct, severity):
    already_open = WastageAlert.objects.filter(
        material=material, severity=severity, is_resolved=False
    ).exists()
    
    if not already_open:
        WastageAlert.objects.create(
            material=material, threshold=threshold,
            transaction=txn, severity=severity, wastage_pct=round(pct, 2)
        )
        if threshold.notify_owner:
            send_in_app_notification(material, severity, pct)



@receiver(post_save, sender=User)
def sync_contractor_profile(sender, instance, created, **kwargs):
    """
    Automatically create or update a Contractor profile if a user has the CONTRACTOR role.
    """
    if instance.role and instance.role.code == Role.CONTRACTOR:
        # Use get_or_create to handle both creation and existing users
        contractor, created_now = Contractor.objects.get_or_create(
            user=instance,
            defaults={
                'name': f"{instance.first_name} {instance.last_name}".strip() or instance.username,
                'email': instance.email,
                'phone': instance.phone_number or '',
                'role': 'THEKEDAAR'  # Default role
            }
        )
        
        # If not just created, sync updated info from User
        if not created_now:
            full_name = f"{instance.first_name} {instance.last_name}".strip() or instance.username
            updated = False
            
            if contractor.name != full_name:
                contractor.name = full_name
                updated = True
            
            if contractor.email != instance.email:
                contractor.email = instance.email
                updated = True
                
            if instance.phone_number and contractor.phone != instance.phone_number:
                contractor.phone = instance.phone_number
                updated = True
                
            if updated:
                contractor.save()
