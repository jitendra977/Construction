# Financial System Architecture & Optimization Plan

This plan outlines the "Correct Way" to manage the project's finances and proposes technical enhancements to ensure budget integrity and financial visibility.

## The Correct Financial Workflow

To maintain a healthy project, the following four-step workflow should be strictly followed:

1.  **Budget Allocation (Planning)**:
    -   Define `BudgetCategories` (e.g., Civil Materials, Finishings).
    -   Assign a total `Allocation` amount to each category. This acts as the "Total Limit".
2.  **Funding Declaration (Sourcing)**:
    -   Identify `FundingSources` (Personal Savings, Bank Loans).
    -   The sum of all funding sources should ideally cover the total project budget.
3.  **Expense Recognition (Accrual)**:
    -   Record an `Expense` as soon as a cost is incurred (e.g., when 50 bags of cement arrive, or when a contractor is hired).
    -   **Critical**: This happens *before* actual cash leaves the bank. It represents a liability.
4.  **Payment Fulfillment (Cash Flow)**:
    -   Record actual `Payments` against the recorded `Expense`.
    -   A single `Expense` might have multiple `Payments` (Installments/Advance).
    -   This step reduces the `Current Balance` of the assigned `FundingSource`.

---

## Technical Optimizations

### 1. Budget Overrun Warnings
- **Implementation**: Add logic in the `Expense` save method (or a specialized service) to check if the new expense exceeds the remaining `BudgetCategory.allocation`.
- **UI**: Display clear visual warnings when a category is above 90% utilization.

### 2. Status Synchronization
- **Consistency**: Ensure the `is_paid` boolean on `Expense` is automatically synced with the `status` property (calculated from `Payments`).

### 3. Comprehensive Financial Audit Log
- **Traceability**: All `FundingTransactions` should be clearly linked to their source `Expense` or `Payment` to allow for deep financial auditing.

---

### [Contractor Visual Identity]
Summary: Add photo support to Contractor management.

#### [MODIFY] [models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/resources/models.py)
- [COMPLETE] Added `photo` field to `Contractor` model.

#### [MODIFY] [serializers.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/finance/serializers.py)
- [COMPLETE] Exposed `contractor_photo` in `ExpenseSerializer`.

#### [MODIFY] [ContractorsTab.jsx](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/src/components/desktop/manage/ContractorsTab.jsx)
- **UI Update**: Display contractor photos in the Desktop table and Mobile cards.
- **Form Update**: Add an image upload field to the Add/Edit Contractor modal.
- **Logic Update**: Adjust `handleSubmit` to handle `FormData` for image uploads.

### [Docker Development Optimization]
Summary: Enable hot-reloading by mounting source code volumes and using development Dockerfiles.

#### [MODIFY] [docker-compose.yml](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docker-compose.yml)
- Switch `backend` to use `Dockerfile.dev` and mount `./backend:/app`.
- Switch `frontend` to use `Dockerfile.dev` and mount `./frontend:/app`.
- Ensure `node_modules` and `venv` are preserved via anonymous volumes.

### [Supplier Visual Identity]
Summary: Add photo support to Supplier management (already implemented in local files, will be visible after Docker change).

#### [MODIFY] [models.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/resources/models.py)
- [COMPLETE] Added `photo` field to `Supplier` model.

#### [MODIFY] [serializers.py](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/finance/serializers.py)
- [COMPLETE] Exposed `supplier_photo` in `ExpenseSerializer`.

#### [MODIFY] [SuppliersTab.jsx](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/src/components/desktop/manage/SuppliersTab.jsx)
- [COMPLETE] UI/Form updates for supplier photos and uploads.

### [Environment Separation]
Summary: Isolate development (local) and production (cloud) configurations.

#### [MODIFY] [docker-compose.yml](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docker-compose.yml)
- Restore to production state (Nginx frontend, Gunicorn backend, no volume mounts for code).

#### [MODIFY] [docker-compose.dev.yml](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/docker-compose.dev.yml)
- Implement full hot-reloading (Vite dev server, Django runserver, volume mounts).
- Point to dedicated `.env.dev` files.

#### [NEW] [backend/.env.dev](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/.env.dev)
- Local development environment variables.

#### [NEW] [frontend/.env.dev](file:///Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/frontend/.env.dev)
- Dedicated Vite environment for local dev.

---

---

## Verification Plan

### Manual Verification
1.  **Budget Limit Test**: Try to add an expense that exceeds the category's allocation and verify the warning/system response.
2.  **Payment Sync Test**: Record a full payment for an expense and verify its status changes to `PAID` automatically.
3.  **Audit Log Test**: Check the database or admin panel to ensure `FundingTransactions` are correctly generated for every payment.
