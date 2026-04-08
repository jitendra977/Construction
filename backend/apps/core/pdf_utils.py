import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from django.conf import settings
from datetime import datetime

def generate_purchase_order_pdf(material, quantity, supplier, po_number=None):
    """
    Generate a professional PDF Purchase Order for a material order.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#059669"),
        spaceAfter=20,
        alignment=1 # Center
    )
    
    elements = []
    
    # Header Information
    elements.append(Paragraph("PURCHASE ORDER", title_style))
    elements.append(Spacer(1, 12))
    
    # PO Meta info
    po_date = datetime.now().strftime("%Y-%m-%d %H:%M")
    meta_info = [
        [Paragraph(f"<b>PO Number:</b> {po_number or 'PO-' + datetime.now().strftime('%Y%m%d%H%M')}", styles['Normal']), 
         Paragraph(f"<b>Date:</b> {po_date}", styles['Normal'])]
    ]
    meta_table = Table(meta_info, colWidths=[225, 225])
    elements.append(meta_table)
    elements.append(Spacer(1, 24))
    
    # From / To section
    address_info = [
        [Paragraph("<b>ORDER FROM:</b>", styles['Normal']), Paragraph("<b>ORDER TO:</b>", styles['Normal'])],
        [Paragraph("Dream Home Construction Project<br/>Building Site 12A<br/>Kathmandu, Nepal", styles['Normal']),
         Paragraph(f"{supplier.name}<br/>{supplier.contact_person or 'N/A'}<br/>{supplier.email}<br/>{supplier.phone}", styles['Normal'])]
    ]
    address_table = Table(address_info, colWidths=[225, 225])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(address_table)
    elements.append(Spacer(1, 36))
    
    # Order Items Table
    data = [
        ['Item Description', 'Category', 'Quantity', 'Approx. Cost'],
        [material.name, material.category or 'N/A', f"{quantity} {material.get_unit_display()}", f"Rs. {material.avg_cost_per_unit or 0}"]
    ]
    
    item_table = Table(data, colWidths=[180, 100, 90, 80])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#059669")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 48))
    
    # Signature / Note
    elements.append(Paragraph("<b>Notes:</b>", styles['Heading3']))
    elements.append(Paragraph("This is an automatically generated purchase order from the Construction Management System. Please confirm receiving this order via email.", styles['Normal']))
    
    elements.append(Spacer(1, 100))
    elements.append(Paragraph("__________________________", styles['Normal']))
    elements.append(Paragraph("Authorized Signature", styles['Normal']))
    
    # Build PDF
    doc.build(elements)
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_payment_receipt_pdf(payment):
    """
    Generate a professional PDF Payment Receipt.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#0284c7"),
        spaceAfter=20,
        alignment=1 # Center
    )
    
    elements = []
    
    elements.append(Paragraph("PAYMENT RECEIPT", title_style))
    elements.append(Spacer(1, 12))
    
    meta_info = [
        [Paragraph(f"<b>Receipt No:</b> REC-{payment.id}", styles['Normal']), 
         Paragraph(f"<b>Date:</b> {payment.date.strftime('%Y-%m-%d') if payment.date else datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal'])]
    ]
    meta_table = Table(meta_info, colWidths=[225, 225])
    elements.append(meta_table)
    elements.append(Spacer(1, 24))
    
    # Recipient
    recipient = payment.expense.supplier or payment.expense.contractor
    recipient_text = "N/A"
    if recipient:
        recipient_text = f"{recipient.name}<br/>{recipient.contact_person if hasattr(recipient, 'contact_person') and recipient.contact_person else ''}<br/>{recipient.email or ''}<br/>{recipient.phone or ''}"
    
    address_info = [
        [Paragraph("<b>RECEIVED FROM:</b>", styles['Normal']), Paragraph("<b>PAID TO:</b>", styles['Normal'])],
        [Paragraph("Dream Home Construction Project<br/>Building Site 12A<br/>Kathmandu, Nepal", styles['Normal']),
         Paragraph(recipient_text, styles['Normal'])]
    ]
    address_table = Table(address_info, colWidths=[225, 225])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(address_table)
    elements.append(Spacer(1, 36))
    
    # Details Table
    data = [
        ['Description', 'Payment Method', 'Reference ID', 'Amount'],
        [payment.expense.title, payment.get_method_display(), payment.reference_id or 'N/A', f"Rs. {payment.amount}"]
    ]
    
    item_table = Table(data, colWidths=[180, 100, 90, 80])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0284c7")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 48))
    
    elements.append(Paragraph("<b>Notes:</b>", styles['Heading3']))
    if payment.notes:
        elements.append(Paragraph(payment.notes, styles['Normal']))
    elements.append(Paragraph("This is an automatically generated payment receipt.", styles['Normal']))
    
    elements.append(Spacer(1, 100))
    elements.append(Paragraph("__________________________", styles['Normal']))
    elements.append(Paragraph("Authorized Signature", styles['Normal']))
    
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_expense_report_pdf(expenses, filter_metadata=None):
    """
    Generate a professional multi-page Financial Statement / Expense Report.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor("#334155"),
        spaceAfter=10,
        alignment=0 # Left
    )
    
    elements = []
    
    # Header Section
    elements.append(Paragraph("PROJECT FINANCIAL STATEMENT", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    if filter_metadata:
        elements.append(Paragraph(f"<i>Scope: {filter_metadata}</i>", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Financial Overview Metrics
    total_amount = sum(e.amount for e in expenses)
    total_due = sum(e.balance_due for e in expenses)
    total_paid = total_amount - total_due
    
    summary_data = [
        [Paragraph("<b>TOTAL EXPENDITURE</b>", styles['Normal']), 
         Paragraph("<b>TOTAL DISBURSED</b>", styles['Normal']), 
         Paragraph("<b>OUTSTANDING DUE</b>", styles['Normal'])],
        [f"Rs. {total_amount:,.2f}", f"Rs. {total_paid:,.2f}", f"Rs. {total_due:,.2f}"]
    ]
    
    summary_table = Table(summary_data, colWidths=[175, 175, 175])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.grey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
        ('TOPPADDING', (0, 1), (-1, 1), 10),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    # Detailed Data Table
    data = [['Date', 'Description', 'Category', 'Paid To', 'Total Amount', 'Status']]
    for e in expenses:
        data.append([
            e.date.strftime('%Y-%m-%d'),
            Paragraph(e.title, styles['Normal']),
            e.category.name if e.category else 'N/A',
            e.paid_to or 'N/A',
            f"Rs. {e.amount:,.2f}",
            Paragraph(f"<font color='{'red' if e.balance_due > 0 else 'green'}'>{e.status.upper()}</font>", styles['Normal'])
        ])
    
    t = Table(data, colWidths=[65, 140, 90, 90, 80, 60], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    elements.append(t)
    
    # Footer Note
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("<i>End of Report - This document is electronically generated and verified by the Project Intelligence System.</i>", styles['Normal']))
    
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
