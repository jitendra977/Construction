from datetime import date, timedelta
from decimal import Decimal
import random

def populate():
    from apps.finance.models import FundingSource, FundingTransaction, Expense
    from apps.tasks.models import Task, TaskUpdate, TaskMedia
    from apps.permits.models import PermitStep
    from apps.accounts.models import ActivityLog, User, Role
    from apps.resources.models import Document
    
    from apps.accounts.models import Role
    owner = User.objects.filter(role__code=Role.HOME_OWNER).first()
    engineer = User.objects.filter(role__code=Role.LEAD_ENGINEER).first()
    
    # 1. Funding Transactions
    sources = FundingSource.objects.all()
    for source in sources:
        FundingTransaction.objects.create(
            funding_source=source,
            amount=Decimal('5000'),
            date=date.today() - timedelta(days=1),
            transaction_type='DEBIT',
            description=f"Bank charges/Service fee for {source.name}"
        )
        print(f"Created debit transaction for {source.name}")

    # 2. Task Updates & Media
    completed_tasks = list(Task.objects.filter(status='COMPLETED'))
    for task in completed_tasks[:5]:
        TaskUpdate.objects.create(
            task=task,
            note=f"Work on {task.title} was completed successfully. Periodic inspection passed.",
            progress_percentage=100
        )
        TaskMedia.objects.create(
            task=task,
            file='task_updates/dummy_photo.jpg',
            media_type='IMAGE',
            description=f"Snapshot of {task.title}"
        )
        print(f"Created update and media for: {task.title}")

    # 3. Legal Documents & Permit Attachments
    # 3.1 Standard Legal Docs
    doc_types = ['LALPURJA', 'NAKSHA', 'TIRO']
    for doc_type in doc_types:
        Document.objects.create(
            title=f"Original {doc_type} Scan",
            document_type=doc_type,
            file='legal_docs/dummy.pdf',
            description="Verified by local authority"
        )
    
    # 3.2 Permit Step Attachments (resources.Document)
    permit_steps = PermitStep.objects.filter(status='APPROVED')
    for step in permit_steps:
        doc = Document.objects.create(
            title=f"Issued Certificate - {step.title}",
            document_type='PERMIT',
            file='documents/permit_dummy.pdf'
        )
        step.documents.add(doc)
        print(f"Linked document to permit step: {step.title}")

    # 4. Activity Logs
    log_actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'APPROVE']
    modules = ['Expense', 'Task', 'Material', 'Phase', 'User']
    
    for i in range(15):
        ActivityLog.objects.create(
            user=owner or engineer,
            username=(owner or engineer).username,
            action=random.choice(log_actions),
            model_name=random.choice(modules),
            description=f"User performed {random.choice(log_actions).lower()} on a {random.choice(modules)} record."
        )
    print("Created activity logs.")

if __name__ == '__main__':
    populate()
