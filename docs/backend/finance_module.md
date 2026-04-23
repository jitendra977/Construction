# Finance & General Ledger Module Documentation

## 1. Overview
The Finance module has been upgraded to support full **Double-Entry Accounting / Liability-Based Accounting**. Instead of a simple `Expense` -> `Payment` flow, the system now tracks assets, liabilities, equity, and utilizes a robust strict General Ledger (Chart of Accounts).

## 2. Core Models

### Chart of Accounts & Ledger
- **`Account`**: Represents a bucket in the Chart of Accounts. Replaces the legacy `FundingSource`.
  - Types: `ASSET` (Bank/Cash), `LIABILITY` (Accounts Payable/Loans), `EQUITY`, `REVENUE`, `EXPENSE` (COGS, Materials, Labor).
- **`JournalEntry`**: A ledger event (e.g., A Bill being created, or a Payment being issued).
- **`JournalLine`**: Individual Debris and Credits making up the entry. The system ensures `sum(debits) = sum(credits)` for each `JournalEntry`.

### Accounts Payable (A/P) Pathway
- **`PurchaseOrder`**: A commitment to spend money (before it becomes a liability). Has statuses like `DRAFT`, `APPROVED`, `RECEIVED`.
- **`Bill`**: True liability (Replaces `Expense`). Indicates the vendor delivered goods and we owe them money. 
  - *Accounting Effect:* Debit "Expense Account", Credit "Accounts Payable (Liability)".
- **`BillItem`**: The individual material or labor components belonging to a `Bill`.
- **`BillPayment`**: The physical disbursement of cash to a vendor.
  - *Accounting Effect:* Debit "Accounts Payable (Liability)", Credit "Cash/Bank Account (Asset)".

### Legacy Models
- **`Expense`**, **`Payment`**, **`FundingSource`**: These models still exist in the database for backward compatibility with the legacy Cash-Flow system but are considered deprecated in favor of the new A/P system.

---

## 3. REST API Endpoints

All finance APIs have been decoupled from the global `/api/v1/` router and moved into a namespaced router. 

**Base URL:** `/api/v1/finance/`

### Ledger & Accounts
*   `GET /api/v1/finance/accounts/` - List Chart of Accounts
*   `GET /api/v1/finance/journal-entries/` - List Ledger transactions

### Accounts Payable
*   `GET /api/v1/finance/purchase-orders/` - List Commitments/POs
*   `GET /api/v1/finance/bills/` - List Outstanding/Paid Liabilities
*   `GET /api/v1/finance/bill-payments/` - List cash disbursements

### Legacy Tracking
*   `GET /api/v1/finance/expenses/` - Legacy cash-flow expense
*   `GET /api/v1/finance/payments/` - Legacy expense payment
*   `GET /api/v1/finance/funding-sources/` - Legacy funding

### Budgeting
*   `GET /api/v1/finance/budget-categories/` - Master categories
*   `GET /api/v1/finance/phase-budget-allocations/` - Budget allocated by specific project phase
