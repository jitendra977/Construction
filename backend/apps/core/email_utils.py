"""
Email utility functions for sending notifications to contractors and suppliers.
"""
import logging
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

from django.core.mail import EmailMultiAlternatives, send_mail
from django.utils.html import strip_tags
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import datetime

from .pdf_utils import generate_purchase_order_pdf, generate_full_purchase_order_pdf

def send_material_order_email(material, quantity, user=None, custom_subject=None, custom_body=None):
    """
    Send an enhanced HTML email with PDF PO to a supplier to order material.
    """
    from .models import EmailLog
    recipient = material.supplier
    
    if not recipient:
        raise ValueError("Material has no supplier assigned")
    
    if not recipient.email:
        raise ValueError(f"Supplier '{recipient.name}' has no email address")
    
    subject = custom_subject or f"Purchase Order: {material.name} - Dream Home Construction"
    user_email = user.email if user and hasattr(user, 'email') else None
    
    context = {
        'supplier_name': recipient.contact_person or recipient.name,
        'material_name': material.name,
        'category': material.category or 'General Construction',
        'quantity': quantity,
        'unit': material.get_unit_display(),
        'custom_message': custom_body or "Please confirm availability and providing a quote at your earliest convenience.",
        'project_name': "Dream Home Construction"
    }
    
    html_content = render_to_string('emails/order_email.html', context)
    text_content = strip_tags(html_content)
    
    try:
        pdf_content = generate_purchase_order_pdf(material, quantity, recipient)
    except Exception as pdf_err:
        logger.error("Failed to generate PDF: %s", pdf_err)
        pdf_content = None

    log_entry = EmailLog.objects.create(
        email_type='PURCHASE_ORDER',
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=subject,
        material=material,
        sent_by=user if user and user.is_authenticated else None
    )

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient.email],
            reply_to=[user_email] if user_email else None
        )
        email.attach_alternative(html_content, "text/html")
        
        if pdf_content:
            po_filename = f"PurchaseOrder_{material.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
            email.attach(po_filename, pdf_content, 'application/pdf')
            
        email.send()
        log_entry.status = 'SENT'
        log_entry.save()
        return True
    except Exception as e:
        error_msg = str(e)
        logger.error("Error sending email: %s", error_msg)
        log_entry.status = 'FAILED'
        log_entry.error_message = error_msg
        log_entry.save()
        return False


def send_purchase_order_email(order, user=None):
    """
    Send an enhanced HTML email with PDF PO to a supplier for a full PurchaseOrder.
    """
    from .models import EmailLog
    recipient = order.supplier
    
    if not recipient:
        logger.info(f"Skipping email for PO {order.id}: no associated supplier")
        return False
    
    if not recipient.email:
        error_msg = f"Supplier '{recipient.name}' has no email address"
        logger.warning(f"Skipping email for PO {order.id}: {error_msg}")
        EmailLog.objects.create(
            email_type='PURCHASE_ORDER',
            recipient_name=recipient.name,
            recipient_email='',
            subject=f"Purchase Order: {order.order_number}",
            sent_by=user if user and getattr(user, 'is_authenticated', False) else None,
            status='FAILED',
            error_message=error_msg
        )
        return False
    
    subject = f"Purchase Order: {order.order_number or str(order.id)[:8]} - Dream Home Construction"
    user_email = user.email if user and hasattr(user, 'email') else None
    
    items_data = []
    for item in order.items.all():
        items_data.append({
            'description': item.description or (item.material.name if item.material else 'Custom Item'),
            'quantity': item.quantity,
            'unit_price': f"{item.unit_price:,.2f}",
            'total': f"{(item.quantity * item.unit_price):,.2f}"
        })
        
    context = {
        'supplier_name': recipient.contact_person or recipient.name,
        'order_number': order.order_number or str(order.id)[:8],
        'order_date': order.order_date.strftime("%Y-%m-%d") if order.order_date else datetime.now().strftime("%Y-%m-%d"),
        'expected_date': order.expected_date.strftime("%Y-%m-%d") if order.expected_date else 'TBD',
        'items': items_data,
        'total_amount': f"{order.total_amount:,.2f}",
        'notes': order.notes,
        'signature_name': order.signature_name or "Project Manager",
        'project_name': "Dream Home Construction"
    }
    
    html_content = render_to_string('emails/purchase_order_email.html', context)
    text_content = strip_tags(html_content)
    
    try:
        pdf_content = generate_full_purchase_order_pdf(order)
    except Exception as pdf_err:
        logger.error("Failed to generate PDF for full PO: %s", pdf_err)
        pdf_content = None

    log_entry = EmailLog.objects.create(
        email_type='PURCHASE_ORDER',
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=subject,
        sent_by=user if user and getattr(user, 'is_authenticated', False) else None
    )

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient.email],
            reply_to=[user_email] if user_email else None
        )
        email.attach_alternative(html_content, "text/html")
        
        if pdf_content:
            po_filename = f"PurchaseOrder_{order.order_number or str(order.id)[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
            email.attach(po_filename, pdf_content, 'application/pdf')
            
        email.send()
        log_entry.status = 'SENT'
        log_entry.save()
        return True
    except Exception as e:
        error_msg = str(e)
        logger.error("Error sending PO email: %s", error_msg)
        log_entry.status = 'FAILED'
        log_entry.error_message = error_msg
        log_entry.save()
        return False


def send_purchase_order_received_email(order, user=None):
    """
    Send an HTML confirmation email to a supplier when an order is marked as RECEIVED.
    """
    from .models import EmailLog
    recipient = order.supplier
    
    if not recipient or not recipient.email:
        error_msg = f"Supplier '{recipient.name if recipient else 'None'}' has no email address"
        logger.warning(f"Skipping received confirmation for PO {order.id}: {error_msg}")
        EmailLog.objects.create(
            email_type='PURCHASE_RECEIVED',
            recipient_name=recipient.name if recipient else 'Unknown',
            recipient_email='',
            subject=f"Order Received: {order.order_number}",
            sent_by=user if user and getattr(user, 'is_authenticated', False) else None,
            status='FAILED',
            error_message=error_msg
        )
        return False
    
    subject = f"Order Received Confirmation: {order.order_number or str(order.id)[:8]} - Dream Home Construction"
    user_email = user.email if user and hasattr(user, 'email') else None
    
    items_data = []
    for item in order.items.all():
        items_data.append({
            'description': item.description or (item.material.name if item.material else 'Custom Item'),
            'quantity': item.quantity,
        })
        
    context = {
        'supplier_name': recipient.contact_person or recipient.name,
        'order_number': order.order_number or str(order.id)[:8],
        'received_date': datetime.now().strftime("%Y-%m-%d %H:%M"),
        'items': items_data,
        'project_name': "Dream Home Construction"
    }
    
    html_content = render_to_string('emails/purchase_order_received_email.html', context)
    text_content = strip_tags(html_content)
    
    log_entry = EmailLog.objects.create(
        email_type='PURCHASE_RECEIVED',
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=subject,
        sent_by=user if user and getattr(user, 'is_authenticated', False) else None
    )

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient.email],
            reply_to=[user_email] if user_email else None
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        log_entry.status = 'SENT'
        log_entry.save()
        return True
    except Exception as e:
        log_entry.status = 'FAILED'
        log_entry.error_message = str(e)
        log_entry.save()
        return False

def send_contractor_notification(contractor, subject, message, user=None):
    """
    Send a notification email to a contractor.
    """
    from .models import EmailLog
    if not contractor.email:
        raise ValueError(f"Contractor '{contractor.name}' has no email address")
    
    log_entry = EmailLog.objects.create(
        email_type='CONTRACTOR_NOTIFICATION',
        recipient_name=contractor.name,
        recipient_email=contractor.email,
        subject=subject,
        sent_by=user if user and user.is_authenticated else None
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[contractor.email],
            fail_silently=False,
        )
        log_entry.status = 'SENT'
        log_entry.save()
        return True
    except Exception as e:
        error_msg = str(e)
        logger.error("Error sending email: %s", error_msg)
        log_entry.status = 'FAILED'
        log_entry.error_message = error_msg
        log_entry.save()
        return False

def send_payment_receipt_email(payment, user=None, custom_subject=None, custom_message=None):
    """
    Send an HTML email with PDF Payment Receipt to supplier or contractor.
    """
    from .models import EmailLog
    from .models import EmailLog
    recipient = payment.expense.supplier or payment.expense.contractor
    if not recipient:
        logger.info("Skipping email for payment %s: no associated supplier or contractor", payment.id)
        return False
        
    if not recipient.email:
        error_msg = f"Recipient '{recipient.name}' has no email address"
        logger.warning("Skipping email for payment %s: %s", payment.id, error_msg)
        EmailLog.objects.create(
            email_type='PAYMENT_RECEIPT',
            recipient_name=recipient.name,
            recipient_email='',
            subject="Payment Receipt",
            payment=payment,
            expense=payment.expense,
            sent_by=user if user and hasattr(user, 'is_authenticated') and user.is_authenticated else None,
            status='FAILED',
            error_message=error_msg
        )
        return False
    
    from .pdf_utils import generate_payment_receipt_pdf
    
    subject = custom_subject or f"Payment Receipt: REC-{payment.id} - Dream Home Construction"
    user_email = user.email if user and hasattr(user, 'email') else None
    
    context = {
        'recipient_name': getattr(recipient, 'contact_person', None) or recipient.name,
        'amount': str(payment.amount),
        'date': payment.date.strftime('%Y-%m-%d') if payment.date else datetime.now().strftime('%Y-%m-%d'),
        'method': payment.get_method_display(),
        'reference_id': payment.reference_id or 'N/A',
        'description': payment.expense.title,
        'custom_message': custom_message,
        'signature_name': payment.signature_name or "Authorized Signature",
        'project_name': "Dream Home Construction"
    }
    
    html_content = render_to_string('emails/payment_receipt_email.html', context)
    text_content = strip_tags(html_content)
    
    try:
        pdf_content = generate_payment_receipt_pdf(payment)
    except Exception as pdf_err:
        logger.error("Failed to generate PDF: %s", pdf_err)
        pdf_content = None

    logger.debug("Attempting to create EmailLog for payment %s", payment.id)
    log_entry = EmailLog.objects.create(
        email_type='PAYMENT_RECEIPT',
        recipient_name=recipient.name,
        recipient_email=recipient.email,
        subject=subject,
        payment=payment,
        expense=payment.expense,
        sent_by=user if user and user.is_authenticated else None
    )

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient.email],
            reply_to=[user_email] if user_email else None
        )
        email.attach_alternative(html_content, "text/html")
        
        if pdf_content:
            receipt_filename = f"PaymentReceipt_REC-{payment.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
            email.attach(receipt_filename, pdf_content, 'application/pdf')
            
        email.send()
        log_entry.status = 'SENT'
        log_entry.save()
        return True
    except Exception as e:
        error_msg = str(e)
        logger.error("Error sending email: %s", error_msg)
        log_entry.status = 'FAILED'
        log_entry.error_message = error_msg
        log_entry.save()
        return False


def send_worker_portal_credentials(
    recipient_email,
    worker_name,
    employee_id,
    portal_username,
    pin,
    password='',
    admin_username='',
    admin_url='',
    project_name='Construction Site',
    project_address='',
    role_name='',
    portal_url='',
    user=None,
):
    """
    Send an HTML email with Worker Portal login credentials to the given address.

    Called right after create_account (PIN is only available at creation time)
    or when resending with a freshly generated PIN.

    Returns True on success, False on failure.
    Logs to EmailLog regardless of outcome.
    """
    from .models import EmailLog

    subject = f"Your Worker Portal Access — {project_name}"

    context = {
        'worker_name':      worker_name,
        'employee_id':      employee_id,
        'portal_username':  portal_username,
        'pin':              pin,
        'password':         password,
        'admin_username':   admin_username or '',
        'admin_url':        admin_url or '',
        'has_admin_access': bool(password and admin_username),
        'project_name':     project_name,
        'project_address':  project_address or '',
        'role_name':        role_name or '',
        'portal_url':       portal_url or '#',
    }

    html_content = render_to_string('emails/worker_portal_credentials.html', context)
    text_content = strip_tags(html_content)

    log_entry = EmailLog.objects.create(
        email_type      = 'OTHER',
        recipient_name  = worker_name,
        recipient_email = recipient_email,
        subject         = subject,
        sent_by         = user if user and getattr(user, 'is_authenticated', False) else None,
    )

    try:
        email = EmailMultiAlternatives(
            subject    = subject,
            body       = text_content,
            from_email = settings.DEFAULT_FROM_EMAIL,
            to         = [recipient_email],
        )
        email.attach_alternative(html_content, 'text/html')
        email.send()

        log_entry.status = 'SENT'
        log_entry.save()
        logger.info("Portal credentials sent to %s for %s", recipient_email, worker_name)
        return True

    except Exception as e:
        error_msg = str(e)
        logger.error("Failed to send portal credentials to %s: %s", recipient_email, error_msg)
        log_entry.status        = 'FAILED'
        log_entry.error_message = error_msg
        log_entry.save()
        return False


def send_login_alert_email(user, login_details, user_agent=''):
    """
    Send a login alert email with device and location details.
    This should never interrupt the login flow if email delivery fails.
    """
    if not getattr(user, 'email', None):
        return False

    from .models import EmailLog

    subject = "New login to your ConstructPro account"

    latitude = login_details.get('latitude')
    longitude = login_details.get('longitude')
    coordinates = None
    map_url = ''
    if latitude is not None and longitude is not None:
        coordinates = f"{latitude}, {longitude}"
        map_url = f"https://maps.google.com/?q={quote_plus(coordinates)}"

    login_time = login_details.get('login_time')
    if not login_time:
        login_time = timezone.localtime().strftime('%Y-%m-%d %H:%M:%S %Z')

    context = {
        'user_name': (
            f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
            or getattr(user, 'username', '')
            or getattr(user, 'email', '')
        ),
        'user_email': user.email,
        'login_time': login_time,
        'ip_address': login_details.get('ip_address') or 'Unknown',
        'browser': login_details.get('browser') or 'Unknown',
        'os': login_details.get('os') or 'Unknown',
        'device_type': login_details.get('device_type') or 'Unknown',
        'device_name': login_details.get('device_name') or 'Unknown',
        'platform': login_details.get('platform') or 'Unknown',
        'language': login_details.get('language') or 'Unknown',
        'timezone_name': login_details.get('timezone') or 'Unknown',
        'viewport': login_details.get('viewport') or '',
        'screen_size': login_details.get('screen_size') or '',
        'coordinates': coordinates,
        'accuracy_meters': login_details.get('accuracy_meters'),
        'map_url': map_url,
        'location_label': login_details.get('location_label') or '',
        'user_agent': user_agent or login_details.get('user_agent') or '',
    }

    html_content = render_to_string('emails/login_alert.html', context)
    text_content = strip_tags(html_content)

    log_entry = EmailLog.objects.create(
        email_type='OTHER',
        recipient_name=context['user_name'],
        recipient_email=user.email,
        subject=subject,
        sent_by=user if getattr(user, 'is_authenticated', False) else None,
    )

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach_alternative(html_content, 'text/html')
        email.send()

        log_entry.status = 'SENT'
        log_entry.save(update_fields=['status'])
        return True
    except Exception as exc:
        logger.error("Failed to send login alert to %s: %s", user.email, exc)
        log_entry.status = 'FAILED'
        log_entry.error_message = str(exc)
        log_entry.save(update_fields=['status', 'error_message'])
        return False
