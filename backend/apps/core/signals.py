from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ConstructionPhase, UserGuide, UserGuideStep, UserGuideFAQ
from utils.audit_log import log_activity_automated, get_model_diff
import threading

# Use threading local to store the current request if available
# But since signals don't have access to request by default without middleware, 
# we'll log as "System" or pass the user if we can.
# A more advanced way is to use a middleware that stores the current request/user.

_thread_locals = threading.local()

class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        _thread_locals.user = request.user
        response = self.get_response(request)
        return response

def get_current_user():
    return getattr(_thread_locals, 'user', None)

def get_current_request():
    return getattr(_thread_locals, 'request', None)

@receiver(post_save, sender=ConstructionPhase)
@receiver(post_save, sender=UserGuide)
@receiver(post_save, sender=UserGuideStep)
@receiver(post_save, sender=UserGuideFAQ)
def audit_log_save(sender, instance, created, **kwargs):
    action = 'CREATE' if created else 'UPDATE'
    user = get_current_user()
    request = get_current_request()
    
    # For updates, we'd ideally want the old instance to calculate diff.
    # post_save doesn't have the old instance, so we'd need pre_save to cache it.
    
    log_activity_automated(
        request, user, action, instance, 
        description=f"{action} {sender.__name__}: {str(instance)}"
    )

@receiver(post_delete, sender=ConstructionPhase)
@receiver(post_delete, sender=UserGuide)
@receiver(post_delete, sender=UserGuideStep)
@receiver(post_delete, sender=UserGuideFAQ)
def audit_log_delete(sender, instance, **kwargs):
    user = get_current_user()
    request = get_current_request()
    
    log_activity_automated(
        request, user, 'DELETE', instance,
        description=f"DELETED {sender.__name__}: {str(instance)}"
    )
