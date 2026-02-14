"""
Email utility functions for sending notifications to contractors and suppliers.
"""
from django.core.mail import EmailMultiAlternatives, send_mail
from django.utils.html import strip_tags
from django.template.loader import render_to_string
from django.conf import settings
from datetime import datetime

from .pdf_utils import generate_purchase_order_pdf

def send_material_order_email(material, quantity, user_email=None, custom_subject=None, custom_body=None):
    """
    Send an enhanced HTML email with PDF PO to a supplier to order material.
    """
    if not material.supplier:
        raise ValueError("Material has no supplier assigned")
    
    if not material.supplier.email:
        raise ValueError(f"Supplier '{material.supplier.name}' has no email address")
    
    # Subject handling
    subject = custom_subject or f"Purchase Order: {material.name} - Dream Home Construction"
    
    # Template context
    context = {
        'supplier_name': material.supplier.contact_person or material.supplier.name,
        'material_name': material.name,
        'category': material.category or 'General Construction',
        'quantity': quantity,
        'unit': material.get_unit_display(),
        'custom_message': custom_body or "Please confirm availability and providing a quote at your earliest convenience.",
        'project_name': "Dream Home Construction"
    }
    
    # Render HTML content
    html_content = render_to_string('emails/order_email.html', context)
    text_content = strip_tags(html_content) # Fallback for non-HTML clients
    
    # Generate PDF PO
    try:
        pdf_content = generate_purchase_order_pdf(material, quantity, material.supplier)
    except Exception as pdf_err:
        print(f"Failed to generate PDF: {pdf_err}")
        pdf_content = None

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[material.supplier.email],
            reply_to=[user_email] if user_email else None
        )
        email.attach_alternative(html_content, "text/html")
        
        if pdf_content:
            po_filename = f"PurchaseOrder_{material.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
            email.attach(po_filename, pdf_content, 'application/pdf')
            
        email.send()
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


def send_contractor_notification(contractor, subject, message):
    """
    Send a notification email to a contractor.
    
    Args:
        contractor: Contractor instance
        subject: Email subject
        message: Email message body
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not contractor.email:
        raise ValueError(f"Contractor '{contractor.name}' has no email address")
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[contractor.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False
