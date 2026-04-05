from django.db import models
from django.forms.models import model_to_dict
from apps.accounts.models import ActivityLog
from django.contrib.contenttypes.models import ContentType

def get_client_ip(request):
    if not request: return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_model_diff(old_instance, new_instance, exclude_fields=None):
    """
    Returns a dictionary of changes: { field: [old_value, new_value] }
    """
    if exclude_fields is None:
        exclude_fields = ['password', 'last_login', 'updated_at', 'created_at', 'token', 'secret']
    
    diff = {}
    
    # Get dictionaries of both instances
    old_dict = model_to_dict(old_instance) if old_instance else {}
    new_dict = model_to_dict(new_instance)
    
    # Compare fields
    for field, new_val in new_dict.items():
        if field in exclude_fields:
            continue
            
        old_val = old_dict.get(field)
        
        # Simple equality check
        if old_val != new_val:
            # Format values for readability in JSON
            diff[field] = [str(old_val), str(new_val)]
            
    return diff

def log_activity_automated(request, user, action, instance, description='', changes=None):
    """
    Automated logging service used by signals.
    """
    try:
        model_name = instance.__class__.__name__
        object_id = getattr(instance, 'pk', None)
        object_repr = str(instance)
        
        # Use existing ActivityLog model
        ActivityLog.objects.create(
            user=user if user and user.is_authenticated else None,
            username=user.username if user and user.is_authenticated else "System/Anonymous",
            action=action,
            model_name=model_name,
            object_id=str(object_id) if object_id else None,
            object_repr=object_repr[:200],
            description=description or f"{action} {model_name}: {object_repr}",
            changes=changes,
            ip_address=get_client_ip(request) if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:1000] if request else "System Signal",
            endpoint=request.path if request else f"INTERNAL_SIGNAL_{model_name}",
            method=request.method if request else "SIGNAL",
            success=True
        )
    except Exception as e:
        print(f"FAILED TO LOG AUTOMATED ACTIVITY: {e}")
