"""
Email utility functions for sending notifications to contractors and suppliers.
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string


def send_material_order_email(material, quantity, user_email=None):
    """
    Send an email to a supplier to order material.
    
    Args:
        material: Material instance
        quantity: Quantity to order
        user_email: Email of the person placing the order (optional)
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not material.supplier:
        raise ValueError("Material has no supplier assigned")
    
    if not material.supplier.email:
        raise ValueError(f"Supplier '{material.supplier.name}' has no email address")
    
    # Email subject
    subject = f"Material Order Request - {material.name}"
    
    # Email body
    message = f"""
Dear {material.supplier.contact_person or material.supplier.name},

We would like to place an order for the following material:

Material: {material.name}
Category: {material.category or 'N/A'}
Quantity Requested: {quantity} {material.get_unit_display()}
Current Stock Level: {material.current_stock} {material.get_unit_display()}

Supplier Details:
Company: {material.supplier.name}
Contact: {material.supplier.contact_person or 'N/A'}
Phone: {material.supplier.phone}

Please confirm availability and provide a quote at your earliest convenience.

Best regards,
Construction Management Team
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[material.supplier.email],
            fail_silently=False,
        )
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
