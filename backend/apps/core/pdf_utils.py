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
    
    # Signature Section
    elements.append(Spacer(1, 40))
    sig_data = getattr(material, 'signature_data', None) 
    sig_name = getattr(material, 'signature_name', "Authorized Signature")
    
    if sig_data:
        try:
            import base64
            from reportlab.lib.utils import ImageReader
            if ';base64,' in sig_data: sig_data = sig_data.split(';base64,')[1]
            imgdata = base64.b64decode(sig_data)
            elements.append(Image(io.BytesIO(imgdata), width=120, height=50))
        except:
            elements.append(Paragraph("__________________________", styles['Normal']))
    else:
        elements.append(Paragraph("__________________________", styles['Normal']))
        
    elements.append(Paragraph(sig_name, styles['Normal']))

    # Build PDF
    doc.build(elements)
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_full_purchase_order_pdf(order):
    """
    Generate a premium, professional PDF Purchase Order for a real construction project.
    """
    buffer = io.BytesIO()
    # Reduced margins for a more modern edge-to-edge feel where appropriate
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    brand_color = colors.HexColor("#059669") # Emerald 600
    secondary_color = colors.HexColor("#334155") # Slate 700
    light_slate = colors.HexColor("#f8fafc")
    
    h1_style = ParagraphStyle(
        'H1', parent=styles['Heading1'], fontSize=28, textColor=brand_color, 
        spaceAfter=5, fontName='Helvetica-Bold'
    )
    h3_style = ParagraphStyle(
        'H3', parent=styles['Heading3'], fontSize=12, textColor=secondary_color,
        fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=5
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'], fontSize=9, textColor=colors.grey,
        fontName='Helvetica-Bold', leading=12
    )
    value_style = ParagraphStyle(
        'Value', parent=styles['Normal'], fontSize=10, textColor=colors.black,
        fontName='Helvetica', leading=14
    )
    
    elements = []
    
    # 1. Header Section (Logo/Name + PO Title)
    header_data = [
        [
            Paragraph("<b>CONSTRUCTPRO</b><br/><font size=10 color='#64748b'>Advanced Construction Management</font>", h1_style),
            Paragraph("PURCHASE ORDER", ParagraphStyle('POTitle', parent=h1_style, alignment=2, fontSize=24, textColor=secondary_color))
        ]
    ]
    header_table = Table(header_data, colWidths=[300, 215])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    
    # 2. Meta Info Bar (Date, PO #, Project)
    meta_data = [
        [
            Paragraph("<b>PO NUMBER</b>", label_style),
            Paragraph("<b>DATE</b>", label_style),
            Paragraph("<b>PROJECT</b>", label_style),
            Paragraph("<b>EXPECTED BY</b>", label_style)
        ],
        [
            Paragraph(order.order_number or f"PO-{str(order.id)[:8].upper()}", value_style),
            Paragraph(order.order_date.strftime("%d %b, %Y") if order.order_date else "N/A", value_style),
            Paragraph(order.project.name if order.project else "Dream Home Project", value_style),
            Paragraph(order.expected_date.strftime("%d %b, %Y") if order.expected_date else "TBD", value_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[128, 128, 128, 128])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), light_slate),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 30))
    
    # 3. Address Section (Vendor vs Shipping)
    supplier = order.supplier
    vendor_address = "N/A"
    if supplier:
        vendor_address = f"<b>{supplier.name}</b><br/>{supplier.contact_person or ''}<br/>{supplier.address or 'Supplier Address'}<br/>{supplier.email or ''}<br/>{supplier.phone or ''}"
    
    # In a real project, shipping would be the project site address
    shipping_address = f"<b>{order.project.name if order.project else 'Dream Home Site'}</b><br/>Site Manager: Admin<br/>Building Site 12A<br/>Ward 4, Kathmandu<br/>Nepal"
    
    address_data = [
        [Paragraph("VENDOR / SUPPLIER", label_style), Paragraph("SHIP TO / DELIVERY ADDRESS", label_style)],
        [Paragraph(vendor_address, value_style), Paragraph(shipping_address, value_style)]
    ]
    address_table = Table(address_data, colWidths=[257, 257])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 20),
    ]))
    elements.append(address_table)
    elements.append(Spacer(1, 10))
    
    # 4. Line Items Table
    data = [['#', 'ITEM DESCRIPTION', 'QTY', 'RECEIVED', 'UNIT PRICE', 'TOTAL']]
    for i, item in enumerate(order.items.all(), 1):
        desc = item.description or (item.material.name if item.material else 'Standard Material')
        data.append([
            str(i),
            Paragraph(desc, value_style),
            str(item.quantity),
            str(item.received_qty),
            f"{item.unit_price:,.2f}",
            f"{(item.quantity * item.unit_price):,.2f}"
        ])
    
    # Subtotal and Total calculations
    data.append(['', '', '', '', Paragraph("<b>TOTAL AMOUNT (NPR)</b>", value_style), Paragraph(f"<b>{order.total_amount:,.2f}</b>", ParagraphStyle('Total', parent=value_style, alignment=2))])
    
    item_table = Table(data, colWidths=[30, 204, 45, 45, 95, 95])
    item_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), secondary_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Body
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'), # Qty, Price, Total right aligned
        ('ALIGN', (0, 1), (0, -1), 'CENTER'), # Index center
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor("#e2e8f0")), # Light lines between rows
        
        # Total Row
        ('LINEABOVE', (3, -1), (-1, -1), 2, brand_color),
        ('BACKGROUND', (3, -1), (-1, -1), light_slate),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 15),
        ('TOPPADDING', (0, -1), (-1, -1), 15),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 40))
    
    # 5. Bottom Section: Notes & Terms
    signature_elements = [Paragraph("AUTHORIZED SIGNATURE", h3_style)]
    if order.signature_data:
        try:
            import base64
            from reportlab.lib.utils import ImageReader
            
            # Extract base64 data - more robust split
            sig_str = order.signature_data
            if ',' in sig_str:
                sig_str = sig_str.split(',')[-1]
            
            # Clean and pad base64 string
            sig_str = sig_str.replace(' ', '+') # Fix potential space issues
            sig_str = "".join(sig_str.split()) # Remove any whitespace
            missing_padding = len(sig_str) % 4
            if missing_padding:
                sig_str += '=' * (4 - missing_padding)
                
            imgdata = base64.b64decode(sig_str)
            
            # Add signature image
            signature_elements.append(Image(io.BytesIO(imgdata), width=120, height=50))
        except Exception as e:
            import traceback
            print(f"PDF Signature Error: {e}")
            traceback.print_exc()
            signature_elements.append(Paragraph(f"[Signature Error: {str(e)[:20]}]", label_style))
    else:
        signature_elements.append(Spacer(1, 30))
        signature_elements.append(Paragraph("__________________________", value_style))
        
    signature_elements.append(Paragraph(order.signature_name or "Project Manager", label_style))

    bottom_data = [
        [
            Paragraph("TERMS & CONDITIONS", h3_style),
            signature_elements
        ],
        [
            Paragraph(
                "1. Please include PO number on all invoices and packages.<br/>"
                "2. Goods must be delivered in good condition as per specs.<br/>"
                "3. Payment will be processed within 15 days of receiving invoice.",
                ParagraphStyle('Terms', parent=value_style, fontSize=8, textColor=colors.grey)
            ),
            "" # Empty space under signature
        ]
    ]
    
    if order.notes:
        elements.append(Paragraph("ORDER NOTES", h3_style))
        elements.append(Paragraph(order.notes, value_style))
        elements.append(Spacer(1, 20))
        
    bottom_table = Table(bottom_data, colWidths=[315, 200])
    bottom_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (1,0), (1,0), 20),
    ]))
    elements.append(bottom_table)
    
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
    
    # Signature Section
    elements.append(Spacer(1, 40))
    sig_data = getattr(payment, 'signature_data', None)
    sig_name = getattr(payment, 'signature_name', "Authorized Signature")
    
    if sig_data:
        try:
            import base64
            from reportlab.lib.utils import ImageReader
            if ';base64,' in sig_data: sig_data = sig_data.split(';base64,')[1]
            imgdata = base64.b64decode(sig_data)
            elements.append(Image(io.BytesIO(imgdata), width=120, height=50))
        except:
            elements.append(Paragraph("__________________________", styles['Normal']))
    else:
        elements.append(Paragraph("__________________________", styles['Normal']))
        
    elements.append(Paragraph(sig_name, styles['Normal']))
    
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
    elements.append(Paragraph("__________________________", styles['Normal']))
    elements.append(Paragraph("Project Manager / Authorized Signature", styles['Normal']))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<i>End of Report - This document is electronically generated and verified by the Project Intelligence System.</i>", styles['Normal']))
    
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_bill_pdf(bill):
    """
    Generate a professional PDF for a Vendor Bill.
    """
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from datetime import datetime

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    brand_color = colors.HexColor("#0284c7") # Sky 600
    secondary_color = colors.HexColor("#334155")
    light_slate = colors.HexColor("#f8fafc")
    
    h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=28, textColor=brand_color, spaceAfter=5, fontName='Helvetica-Bold')
    h3_style = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=12, textColor=secondary_color, fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=5)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.grey, fontName='Helvetica-Bold', leading=12)
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=10, textColor=colors.black, fontName='Helvetica', leading=14)
    
    elements = []
    
    # 1. Header Section
    header_data = [
        [
            Paragraph("<b>CONSTRUCTPRO</b><br/><font size=10 color='#64748b'>Financial Management System</font>", h1_style),
            Paragraph("VENDOR BILL", ParagraphStyle('BillTitle', parent=h1_style, alignment=2, fontSize=24, textColor=secondary_color))
        ]
    ]
    header_table = Table(header_data, colWidths=[300, 215])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    
    # 2. Meta Info Bar
    meta_data = [
        [
            Paragraph("<b>BILL NUMBER</b>", label_style),
            Paragraph("<b>DATE ISSUED</b>", label_style),
            Paragraph("<b>DUE DATE</b>", label_style),
            Paragraph("<b>STATUS</b>", label_style)
        ],
        [
            Paragraph(bill.bill_number or f"BILL-{str(bill.id)[:8].upper()}", value_style),
            Paragraph(bill.date_issued.strftime("%d %b, %Y") if bill.date_issued else "N/A", value_style),
            Paragraph(bill.due_date.strftime("%d %b, %Y") if bill.due_date else "N/A", value_style),
            Paragraph(str(bill.payment_status).upper(), value_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[128, 128, 128, 128])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), light_slate),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 30))
    
    # 3. Vendor Info
    vendor = bill.supplier or bill.contractor
    vendor_text = "N/A"
    if vendor:
        vendor_text = f"<b>{vendor.name}</b><br/>{vendor.email or 'No Email'}<br/>{vendor.phone or 'No Phone'}<br/>{vendor.address or ''}"
    
    project_text = f"<b>{bill.project.name}</b><br/>Dream Home Site<br/>Kathmandu, Nepal"
    
    address_data = [
        [Paragraph("VENDOR DETAILS", label_style), Paragraph("BILL TO", label_style)],
        [Paragraph(vendor_text, value_style), Paragraph(project_text, value_style)]
    ]
    address_table = Table(address_data, colWidths=[257, 257])
    address_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOTTOMPADDING', (0,0), (-1,-1), 20)]))
    elements.append(address_table)
    
    # 4. Items Table
    data = [['#', 'ITEM DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']]
    for i, item in enumerate(bill.items.all(), 1):
        data.append([
            str(i),
            Paragraph(item.description or 'Expense', value_style),
            str(item.quantity),
            f"{item.unit_price:,.2f}",
            f"{(item.quantity * item.unit_price):,.2f}"
        ])
    
    data.append(['', '', '', Paragraph("<b>TOTAL AMOUNT (NPR)</b>", value_style), Paragraph(f"<b>{bill.total_amount:,.2f}</b>", ParagraphStyle('Total', parent=value_style, alignment=2))])
    
    item_table = Table(data, colWidths=[30, 244, 50, 95, 95])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), secondary_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
        ('LINEABOVE', (3, -1), (-1, -1), 2, brand_color),
    ]))
    elements.append(item_table)
    
    # 5. Footer
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("<i>Note: This is a system-generated bill for internal accounting and project management.</i>", ParagraphStyle('Footer', parent=value_style, fontSize=8, textColor=colors.grey, alignment=1)))
    
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
