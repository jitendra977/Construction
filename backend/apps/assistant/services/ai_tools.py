"""
ai_tools.py — Tool definitions + executors for साथी function calling.

When the AI decides to use a tool, these functions are called to actually
write to the database. Results are fed back to the AI so it can confirm
what happened in natural language.
"""
from __future__ import annotations
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Tool schemas (OpenAI / Groq format) ──────────────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_task",
            "description": "Add a new task to a construction phase in the project. Use when user says 'add task', 'create task', 'new task', etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title":       {"type": "string",  "description": "Task title"},
                    "phase_name":  {"type": "string",  "description": "Name of the phase to add the task to (partial match OK)"},
                    "description": {"type": "string",  "description": "Task description"},
                    "priority":    {"type": "string",  "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "description": "Task priority"},
                    "start_date":  {"type": "string",  "description": "Start date in YYYY-MM-DD format"},
                    "due_date":    {"type": "string",  "description": "Due date in YYYY-MM-DD format"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_phase",
            "description": "Add a new construction phase to the project. Use when user says 'add phase', 'create phase', 'new phase', 'new stage', etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name":             {"type": "string",  "description": "Phase name"},
                    "description":      {"type": "string",  "description": "Phase description"},
                    "estimated_budget": {"type": "number",  "description": "Estimated budget in Rs."},
                    "start_date":       {"type": "string",  "description": "Start date YYYY-MM-DD"},
                    "end_date":         {"type": "string",  "description": "End date YYYY-MM-DD"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": "Mark a task as completed. Use when user says 'task done', 'complete task', 'mark done', etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_title": {"type": "string", "description": "Title or partial title of the task to complete"},
                },
                "required": ["task_title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_expense",
            "description": "Log a new expense or payment. Use when user says 'add expense', 'spent', 'paid', 'log payment', etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title":       {"type": "string", "description": "Expense title/description"},
                    "amount":      {"type": "number", "description": "Amount in Rs."},
                    "phase_name":  {"type": "string", "description": "Phase this expense belongs to"},
                    "paid_to":     {"type": "string", "description": "Who was paid"},
                    "date":        {"type": "string", "description": "Date YYYY-MM-DD"},
                },
                "required": ["title", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_summary",
            "description": "Get current budget status, spending per category, and over-budget alerts.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "List current tasks, filter by status or phase.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["PENDING", "IN_PROGRESS", "COMPLETED", "all"], "description": "Filter by status"},
                },
                "required": [],
            },
        },
    },
]


# ── Tool executors ────────────────────────────────────────────────────────────
def execute_tool(name: str, args: dict, project_id: int | None = None) -> str:
    """Execute a tool call and return a result string for the AI."""
    try:
        if name == "add_task":         return _add_task(args, project_id)
        if name == "add_phase":        return _add_phase(args, project_id)
        if name == "complete_task":    return _complete_task(args)
        if name == "add_expense":      return _add_expense(args, project_id)
        if name == "get_budget_summary": return _budget_summary(project_id)
        if name == "get_tasks":        return _get_tasks(args, project_id)
        return f"Unknown tool: {name}"
    except Exception as e:
        logger.exception("Tool %s failed", name)
        return f"Error executing {name}: {e}"


def _add_task(args: dict, project_id) -> str:
    from apps.tasks.models import Task
    from apps.core.models import ConstructionPhase

    phase = None
    phase_name = args.get("phase_name", "")
    if phase_name:
        phase = ConstructionPhase.objects.filter(
            name__icontains=phase_name
        ).first()
        if project_id and not phase:
            phase = ConstructionPhase.objects.filter(
                project_id=project_id, name__icontains=phase_name
            ).first()

    task = Task.objects.create(
        title       = args["title"],
        description = args.get("description", ""),
        phase       = phase,
        priority    = args.get("priority", "MEDIUM"),
        status      = "PENDING",
        start_date  = args.get("start_date") or None,
        due_date    = args.get("due_date") or None,
    )
    phase_label = f" in phase '{phase.name}'" if phase else ""
    return f"✅ Task created: '{task.title}'{phase_label} (ID: {task.id}, priority: {task.priority})"


def _add_phase(args: dict, project_id) -> str:
    from apps.core.models import ConstructionPhase, HouseProject

    project = None
    if project_id:
        project = HouseProject.objects.filter(id=project_id).first()
    if not project:
        project = HouseProject.objects.first()

    # Get next order
    last = ConstructionPhase.objects.filter(project=project).order_by("-order").first()
    next_order = (last.order + 1) if last else 1

    phase = ConstructionPhase.objects.create(
        project          = project,
        name             = args["name"],
        description      = args.get("description", ""),
        estimated_budget = args.get("estimated_budget", 0),
        start_date       = args.get("start_date") or None,
        end_date         = args.get("end_date") or None,
        status           = "PENDING",
        order            = next_order,
    )
    budget = f", budget Rs. {args.get('estimated_budget', 0):,.0f}" if args.get("estimated_budget") else ""
    return f"✅ Phase created: '{phase.name}'{budget} (ID: {phase.id}, order: {phase.order})"


def _complete_task(args: dict) -> str:
    from apps.tasks.models import Task
    from django.utils import timezone

    title = args.get("task_title", "")
    task = Task.objects.filter(title__icontains=title).exclude(status="COMPLETED").first()
    if not task:
        return f"❌ No open task found matching '{title}'. Use get_tasks to see available tasks."

    task.status = "COMPLETED"
    task.completed_date = timezone.now().date()
    task.save(update_fields=["status", "completed_date"])
    return f"✅ Task '{task.title}' marked as COMPLETED."


def _add_expense(args: dict, project_id) -> str:
    from apps.finance.models import Expense
    from apps.core.models import ConstructionPhase

    phase = None
    phase_name = args.get("phase_name", "")
    if phase_name:
        phase = ConstructionPhase.objects.filter(name__icontains=phase_name).first()

    from django.utils import timezone
    expense = Expense.objects.create(
        title            = args["title"],
        amount           = args["amount"],
        phase            = phase,
        paid_to          = args.get("paid_to", ""),
        date             = args.get("date") or timezone.now().date(),
        expense_type     = "OTHER",
        is_paid          = True,
        project_id       = project_id,
    )
    phase_label = f" for phase '{phase.name}'" if phase else ""
    return f"✅ Expense logged: '{expense.title}' Rs. {float(expense.amount):,.0f}{phase_label} (ID: {expense.id})"


def _budget_summary(project_id) -> str:
    from apps.finance.models import BudgetCategory
    cats = BudgetCategory.objects.all()[:10]
    if not cats:
        return "No budget categories found."
    lines = []
    total_alloc = total_spent = 0
    for c in cats:
        spent = float(getattr(c, "total_spent", 0) or 0)
        alloc = float(c.allocation or 0)
        total_alloc += alloc
        total_spent += spent
        pct   = int((spent / alloc * 100) if alloc else 0)
        flag  = " ⚠️ OVER BUDGET" if spent > alloc else ""
        lines.append(f"{c.name}: Rs.{spent:,.0f} / Rs.{alloc:,.0f} ({pct}%){flag}")
    lines.append(f"\nTotal: Rs.{total_spent:,.0f} spent of Rs.{total_alloc:,.0f} allocated")
    return "\n".join(lines)


def _get_tasks(args: dict, project_id) -> str:
    from apps.tasks.models import Task
    status = args.get("status", "all")
    qs = Task.objects.all()
    if status and status != "all":
        qs = qs.filter(status=status)
    qs = qs.order_by("-created_at")[:10]
    if not qs:
        return "No tasks found."
    lines = []
    for t in qs:
        phase = f" [{t.phase.name}]" if t.phase_id else ""
        lines.append(f"• [{t.status}] {t.title}{phase} (ID:{t.id})")
    return "\n".join(lines)
