"""
Email notification utilities for accounting module
"""
from django.core.mail import EmailMultiAlternateMessage
from django.template.loader import render_to_string
from django.conf import settings
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER


def generate_salary_slip_pdf(payroll):
    """Generate salary slip PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Company Header
    title = Paragraph("SALARY SLIP", title_style)
    elements.append(title)
    
    # Period
    period = Paragraph(
        f"<b>Period:</b> {payroll.get_month_name()} {payroll.year}",
        styles['Normal']
    )
    elements.append(period)
    elements.append(Spacer(1, 20))
    
    # Employee Details
    emp_data = [
        ['Employee Name:', payroll.employee.name],
        ['Employee ID:', str(payroll.employee.id)],
        ['Email:', payroll.employee.email],
        ['Role:', payroll.employee.get_role_display()],
    ]
    
    emp_table = Table(emp_data, colWidths=[2*inch, 4*inch])
    emp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 20))
    
    # Salary Details
    salary_data = [
        ['Description', 'Amount'],
        ['Base Salary', f"₹{payroll.base_salary:,.2f}"],
        ['Allowances', f"₹{payroll.allowances:,.2f}"],
        ['Incentives', f"₹{payroll.incentives:,.2f}"],
        ['Overtime Amount', f"₹{payroll.overtime_amount:,.2f}"],
        ['Gross Salary', f"₹{payroll.gross_salary:,.2f}"],
        ['', ''],
        ['Deductions', ''],
        ['PF/ESI/TDS', f"₹{payroll.deductions:,.2f}"],
        ['Penalties', f"₹{payroll.penalties:,.2f}"],
        ['Total Deductions', f"₹{(payroll.deductions + payroll.penalties):,.2f}"],
    ]
    
    salary_table = Table(salary_data, colWidths=[3*inch, 2*inch])
    salary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -2), 1, colors.grey),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor('#22c55e')),
        ('TEXTCOLOR', (0, 5), (-1, 5), colors.whitesmoke),
        ('FONTNAME', (0, 5), (-1, 5), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 10), (-1, 10), colors.HexColor('#ef4444')),
        ('TEXTCOLOR', (0, 10), (-1, 10), colors.whitesmoke),
        ('FONTNAME', (0, 10), (-1, 10), 'Helvetica-Bold'),
    ]))
    elements.append(salary_table)
    elements.append(Spacer(1, 20))
    
    # Net Salary
    net_data = [['Net Salary Payable', f"₹{payroll.net_salary:,.2f}"]]
    net_table = Table(net_data, colWidths=[3*inch, 2*inch])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#22c55e')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 16),
        ('PADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(net_table)
    
    # Attendance Details
    elements.append(Spacer(1, 20))
    attendance_data = [
        ['Attendance Summary', ''],
        ['Days Present', str(payroll.days_present)],
        ['Days Absent', str(payroll.days_absent)],
        ['Days Leave', str(payroll.days_leave)],
        ['Jobs Completed', str(payroll.jobs_completed)],
        ['QC Pass Count', str(payroll.qc_pass_count)],
        ['Overtime Hours', f"{payroll.overtime_hours} hrs"],
    ]
    
    attendance_table = Table(attendance_data, colWidths=[3*inch, 2*inch])
    attendance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(attendance_table)
    
    # Footer
    elements.append(Spacer(1, 30))
    footer = Paragraph(
        "<i>This is a computer-generated salary slip and does not require a signature.</i>",
        styles['Italic']
    )
    elements.append(footer)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer


def send_salary_slip_email(payroll):
    """Send salary slip via email"""
    subject = f"Salary Slip - {payroll.get_month_name()} {payroll.year}"
    
    # Generate PDF
    pdf_buffer = generate_salary_slip_pdf(payroll)
    
    # Email content
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #3b82f6;">Salary Slip for {payroll.get_month_name()} {payroll.year}</h2>
            <p>Dear {payroll.employee.name},</p>
            <p>Please find attached your salary slip for {payroll.get_month_name()} {payroll.year}.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0;"><strong>Gross Salary:</strong></td>
                        <td style="padding: 8px 0; text-align: right;">₹{payroll.gross_salary:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>Deductions:</strong></td>
                        <td style="padding: 8px 0; text-align: right; color: #ef4444;">-₹{(payroll.deductions + payroll.penalties):,.2f}</td>
                    </tr>
                    <tr style="border-top: 2px solid #1f2937;">
                        <td style="padding: 12px 0;"><strong style="font-size: 18px;">Net Salary:</strong></td>
                        <td style="padding: 12px 0; text-align: right;"><strong style="font-size: 18px; color: #22c55e;">₹{payroll.net_salary:,.2f}</strong></td>
                    </tr>
                </table>
            </div>
            
            <p>If you have any questions regarding your salary, please contact the HR department.</p>
            
            <p>Best regards,<br>
            <strong>Finance Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #6b7280;">This is an automated email. Please do not reply to this message.</p>
        </body>
    </html>
    """
    
    text_content = f"""
    Salary Slip for {payroll.get_month_name()} {payroll.year}
    
    Dear {payroll.employee.name},
    
    Please find attached your salary slip for {payroll.get_month_name()} {payroll.year}.
    
    Summary:
    - Gross Salary: ₹{payroll.gross_salary:,.2f}
    - Deductions: -₹{(payroll.deductions + payroll.penalties):,.2f}
    - Net Salary: ₹{payroll.net_salary:,.2f}
    
    Best regards,
    Finance Team
    """
    
    # Create email
    email = EmailMultiAlternateMessage(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[payroll.employee.email]
    )
    email.attach_alternative(html_content, "text/html")
    
    # Attach PDF
    email.attach(
        f"salary_slip_{payroll.employee.id}_{payroll.month}_{payroll.year}.pdf",
        pdf_buffer.read(),
        'application/pdf'
    )
    
    # Send email
    try:
        email.send()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_payment_reminder_email(expense):
    """Send payment reminder for pending expense"""
    subject = f"Payment Reminder - {expense.title}"
    
    vendor_email = expense.vendor.email if expense.vendor else None
    if not vendor_email:
        return False
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ef4444;">Payment Reminder</h2>
            <p>Dear {expense.vendor.contact_person or 'Sir/Madam'},</p>
            <p>This is a friendly reminder that we have a pending payment for the following expense:</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <p><strong>Description:</strong> {expense.title}</p>
                <p><strong>Amount:</strong> ₹{expense.amount:,.2f}</p>
                <p><strong>Date:</strong> {expense.date.strftime('%d %B %Y')}</p>
                <p><strong>Status:</strong> {expense.get_payment_status_display()}</p>
            </div>
            
            <p>Please arrange for the payment at your earliest convenience.</p>
            
            <p>Best regards,<br>
            <strong>Accounts Department</strong></p>
        </body>
    </html>
    """
    
    text_content = f"""
    Payment Reminder
    
    Dear {expense.vendor.contact_person or 'Sir/Madam'},
    
    This is a friendly reminder that we have a pending payment for:
    - Description: {expense.title}
    - Amount: ₹{expense.amount:,.2f}
    - Date: {expense.date.strftime('%d %B %Y')}
    - Status: {expense.get_payment_status_display()}
    
    Best regards,
    Accounts Department
    """
    
    email = EmailMultiAlternateMessage(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[vendor_email]
    )
    email.attach_alternative(html_content, "text/html")
    
    try:
        email.send()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_low_profit_alert_email(admin_emails, profit_data):
    """Send alert email when profit is low"""
    subject = "⚠️ Low Profit Alert"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ef4444;">⚠️ Low Profit Alert</h2>
            <p>Dear Admin,</p>
            <p>The net profit for the current period is significantly lower than expected.</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Financial Summary</h3>
                <table style="width: 100%;">
                    <tr>
                        <td><strong>Total Income:</strong></td>
                        <td style="text-align: right; color: #22c55e;">₹{profit_data.get('total_income', 0):,.2f}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Expenses:</strong></td>
                        <td style="text-align: right; color: #ef4444;">₹{profit_data.get('total_expenses', 0):,.2f}</td>
                    </tr>
                    <tr style="border-top: 2px solid #1f2937;">
                        <td><strong style="font-size: 18px;">Net Profit:</strong></td>
                        <td style="text-align: right;"><strong style="font-size: 18px; color: #ef4444;">₹{profit_data.get('net_profit', 0):,.2f}</strong></td>
                    </tr>
                </table>
            </div>
            
            <p>Please review the accounting dashboard for more details and take necessary action.</p>
            
            <p>Best regards,<br>
            <strong>Automated Accounting System</strong></p>
        </body>
    </html>
    """
    
    text_content = f"""
    Low Profit Alert
    
    The net profit for the current period is significantly lower than expected.
    
    Financial Summary:
    - Total Income: ₹{profit_data.get('total_income', 0):,.2f}
    - Total Expenses: ₹{profit_data.get('total_expenses', 0):,.2f}
    - Net Profit: ₹{profit_data.get('net_profit', 0):,.2f}
    
    Please review the accounting dashboard for more details.
    
    Best regards,
    Automated Accounting System
    """
    
    email = EmailMultiAlternateMessage(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=admin_emails
    )
    email.attach_alternative(html_content, "text/html")
    
    try:
        email.send()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
