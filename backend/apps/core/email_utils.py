"""
Email utility functions for sending notifications to contractors and suppliers.
"""
import logging

logger = logging.getLogger(__name__)

from django.core.mail import EmailMultiAlternatives, send_mail
from django.utils.html import strip_tags
from django.template.loader import render_to_string
from django.conf import settings
from datetime import datetime

from .pdf_utils import generate_purchase_order_pdf

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
