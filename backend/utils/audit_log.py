import requests
from user_agents import parse
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

def resolve_ip_location(ip):
    """
    Resolves IP to geographic location using ip-api.com.
    Returns {city, region, country}
    """
    if not ip or ip in ['127.0.0.1', 'localhost', '::1'] or ip.startswith('192.168.') or ip.startswith('10.'):
        return {'city': 'Internal Workspace', 'region': 'Developer Sandbox', 'country': 'Local Access'}
    
    try:
        # Using ip-api.com (free, no key required for low volume)
        response = requests.get(f"http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city", timeout=2)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    'city': data.get('city'),
                    'region': data.get('regionName'),
                    'country': data.get('country')
                }
    except Exception as e:
        print(f"IP Resolution Failed for {ip}: {e}")
        
    return {'city': 'Unknown', 'region': 'Unknown', 'country': 'Unknown'}

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
        ip = get_client_ip(request) if request else None
        
        # Resolve geographic location
        location = resolve_ip_location(ip) if ip else {'city': 'System', 'region': 'Process', 'country': 'Internal'}
        
        # Parse User Agent for human-readable browser details
        ua_string = request.META.get('HTTP_USER_AGENT', '') if request else ""
        if ua_string:
            ua = parse(ua_string)
            browser_info = f"{ua.browser.family} {ua.browser.version_string}"
            os_info = f"{ua.os.family} {ua.os.version_string}"
            device_type = "Mobile" if ua.is_mobile else "Tablet" if ua.is_tablet else "PC" if ua.is_pc else "Bot" if ua.is_bot else "Other"
        else:
            browser_info = "Internal Engine"
            os_info = "System Core"
            device_type = "Server"

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
            ip_address=ip,
            city=location.get('city'),
            region=location.get('region'),
            country=location.get('country'),
            user_agent=f"{browser_info} | {os_info} ({device_type})", # Store human readable by default or raw? Let's do human
            endpoint=request.path if request else f"INTERNAL_SIGNAL_{model_name}",
            method=request.method if request else "SIGNAL",
            success=True
        )
    except Exception as e:
        print(f"FAILED TO LOG AUTOMATED ACTIVITY: {e}")
