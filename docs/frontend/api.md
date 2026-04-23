# Frontend API Services Reference

The frontend encapsulates all direct backend HTTP requests inside a dedicated `services/` layer. These JavaScript objects act as internal SDKs that React components consume.

### Authentication Service (`auth.js`)
*   **Where it is used**: `Login.jsx`, `ProtectedRoute.jsx`, `App.jsx`, `DesktopDashboard.jsx`, `MobilePageHeader.jsx`.
*   `authService.login(username, password)`: Authenticates, stores JWT tokens, and manages token auto-refresh.
*   `authService.register(userData)`: Creates a new user (Owner/Contractor).
*   `authService.logout()`: Clears local storage state and forces interface redirection.
*   `authService.getProfile() / updateProfile(data)`: Manages the active user's settings (e.g. dynamic Typography settings).

### 💰 Finance & Accounting (`financeService` in `api.js`)
A full-featured double-entry accounting SDK:
*   **Where it is used**: `AccountsTab.jsx`, `LedgerTab.jsx`, `BillsTab.jsx`, `ConstructionContext.jsx`.
*   **Chart of Accounts**: `getAccounts()`, `createAccount()`, `updateAccount()`. Handles live asset/liability balance fetching.
*   **General Ledger**: `getJournalEntries()`, `createJournalEntry(data)`. Supports atomic posting of multi-line journal entries.
*   **Treasury**: `getBankTransfers()`, `createBankTransfer(data)`. Orchestrates automated ledger entries for intra-account cash movement.
*   **Accounts Payable**: `getBills()`, `createBill(data)`, `getBillPayments()`, `createBillPayment(data)`. Tracks vendor liabilities and settlements.

### Dashboard Master Service (`dashboardService` in `api.js`)
This massive class manages the bulk of the management application operations:
*   **Where it is used**: Mainly aggregated in `ConstructionContext.jsx` (which distributes it), but directly used in `DesktopHome.jsx`, `BudgetOverview.jsx`, `WastageAlertPanel.jsx`, and almost all Mobile lists (`MobileCategoryList`, `MobileMaterialList`, etc.).
*   **Projects & Structure**: `getProjects()`, `getPhases()`, `getFloors()`, `getRooms()` (with associated CRUD methods).
*   **Finance Integration**: `getBudgetCategories()`, `getExpenses()`, `getPayments()`, `getFundingSources()`, `getPhaseBudgetAllocations()`. Includes advanced actions like `emailPaymentReceipt(id, data)`.
*   **Resources & Inventory**: `getSuppliers()`, `getContractors()`, `getMaterials()`, `getMaterialTransactions()`. Operational hooks like `recalculateMaterialStock(id)`, `receiveMaterialOrder(txId)`, and `emailSupplier(...)`.
*   **Wastage Alerts**: `getWastageAlerts()`, `resolveWastageAlert(id)`, `getMaterialWastageSummary(id)`.
*   **Global Context**: `getDashboardData()` (Fires the heavyweight `/dashboard/combined/` API to hydrate the main Context state in a single request).
*   **Asset Vault**: `getDocuments()`, `createDocument()`, `getGallery()`.

### Construction Execution (`constructionService`)
*   **Where it is used**: `ConstructionContext.jsx`, `PhasesTab.jsx`, `PhaseDetailModal.jsx`, `DesktopHome.jsx`.
*   **Tasks & Schedule**: `getTasks()`, `createTask()`, `updateTask()`, `reorderPhases(order)`.
*   **Media Processing**: `uploadTaskMedia(data)`, `deleteTaskMedia(id)` (Handles `multipart/form-data` logic for progress proofs).

### Bureaucracy Tracker (`permitService`)
*   **Where it is used**: `PermitPage.jsx`, `PermitTracker.jsx`, `DocumentVault.jsx`.
*   `getSteps()`, `createStep()`, `updateStep()`: Manages the phase-by-phase legal roadmap ("Naksha Pass").
*   `attachDocument()`, `detachDocument()`: Links specific Vault files to specific permit steps.

### System Calculators (`calculatorService`)
Connects the frontend estimator form inputs to the backend calculation engines:
*   **Where it is used**: Inside the `pages/estimator/` block (`BrickCalculator.jsx`, `ConcreteCalculator.jsx`, `FlooringCalculator.jsx`, `PlasterCalculator.jsx`, `StructuralBudgetEstimator.jsx`, and `DataTab.jsx`).
*   `calculateWall()`, `calculateConcrete()`, `calculatePlaster()`, `calculateFlooring()`, `calculateBudget()`.
*   `getRates() / updateRate(id)`: Fetches or sets current market rates for accurate cost prediction.

### Account & System Management (`accountsService` & `importService`)
*   **Where it is used**: `UserManagement.jsx`, `ActivityLogs.jsx`, `Profile.jsx` (`accountsService`). `DataImportPage.jsx` (`importService`).
*   **Admin Tools**: `getUsers()`, `createUser()`, `getRoles()`, `getActivityLogs()`.
*   **Bootstrapper**: `importSql(file)` for SQL ingestion and `populateRawData()` to reset the system with pre-defined Nepali housing defaults.
