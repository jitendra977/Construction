from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import requests

from apps.telegram_bot.models import TelegramSettings
from apps.attendance.models import DailyAttendance
from apps.finance.models import Expense

@shared_task
def send_daily_telegram_report():
    settings = TelegramSettings.get_settings()
    if not settings.is_active or not settings.bot_token or not settings.notification_chat_id:
        return "Telegram bot is inactive or missing chat ID."

    today = timezone.now().date()
    
    # 1. Attendance Summary
    attendance_records = DailyAttendance.objects.filter(date=today)
    total_workers = attendance_records.count()
    present_workers = attendance_records.filter(status='PRESENT').count()
    half_day = attendance_records.filter(status='HALF_DAY').count()
    
    # 2. Expense Summary
    expenses = Expense.objects.filter(date=today)
    total_expense = sum([e.amount for e in expenses]) if expenses else 0

    # 3. Format the message
    report = (
        f"📊 <b>Daily Summary Report</b> ({today.strftime('%b %d, %Y')})\n\n"
        f"👷 <b>Attendance:</b>\n"
        f"• Total Checked In: {total_workers}\n"
        f"• Full Present: {present_workers}\n"
        f"• Half Day: {half_day}\n\n"
        f"💰 <b>Expenses Today:</b>\n"
        f"• Total: Rs. {total_expense:,.2f}\n"
    )

    # 4. Send via Telegram
    url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
    payload = {
        "chat_id": settings.notification_chat_id,
        "text": report,
        "parse_mode": "HTML"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return "Daily report sent successfully."
    except Exception as e:
        return f"Failed to send daily report: {str(e)}"
