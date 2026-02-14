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
