from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from .models import Contractor

User = get_user_model()

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
