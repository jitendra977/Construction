# HCMS Project Audit Report
**Date:** April 2026 | **Overall Completion:** ~68%

---

## Summary

| Metric | Value |
|---|---|
| Total Django apps | 11 |
| Critical issues | 3 |
| High priority issues | 8 |
| Frontend components broken | 2 |
| Frontend components partial | 3 |

---

## Critical Issues (Fix First)

### 1. Payment model missing — BREAKING
The frontend calls `getPayments()`, `createPayment()`, `emailPaymentReceipt()` but the backend has **no `Payment` model**. `apps/finance/views.py:50` imports `Payment` which doesn't exist — causes server error on any payment operation.

**Files:** `apps/finance/models.py`, `apps/finance/views.py:50`

**Fix:** Add `Payment` model to finance app:
```python
class Payment(models.Model):
    PAYMENT_METHODS = [('CASH','Cash'),('CHEQUE','Cheque'),('BANK','Bank Transfer'),('ESEWA','eSewa')]
    expense       = models.ForeignKey('Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    phase         = models.ForeignKey('core.ConstructionPhase', on_delete=models.SET_NULL, null=True, blank=True)
    amount        = models.DecimalField(max_digits=12, decimal_places=2)
    date          = models.DateField()
    method        = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='CASH')
    reference_no  = models.CharField(max_length=100, blank=True)
    notes         = models.TextField(blank=True)
    paid_to       = models.CharField(max_length=200, blank=True)
    created_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-date']
```

---

### 2. 10+ missing API service methods — BREAKING
Frontend accounting tabs, timelapse gallery, and permit wizard call methods that don't exist in `frontend/src/services/api.js`. These pages throw runtime errors.

**File:** `frontend/src/services/api.js` (around line 200)

**Missing methods to add:**
```js
// Accounting
getAccounts:          ()     => api.get('/accounting/accounts/'),
createAccount:        (data) => api.post('/accounting/accounts/', data),
getJournalEntries:    ()     => api.get('/accounting/journal-entries/'),
createJournalEntry:   (data) => api.post('/accounting/journal-entries/', data),
getTransfers:         ()     => api.get('/accounting/transfers/'),
createCashTransfer:   (data) => api.post('/accounting/transfers/', data),

// Timelapse / Photo Intel
getTimelapses:        ()     => api.get('/photo-intel/timelapses/'),
createTimelapse:      (data) => api.post('/photo-intel/timelapses/', data),
regenerateTimelapse:  (id)   => api.post(`/photo-intel/timelapses/${id}/regenerate/`),
getWeeklyDigests:     ()     => api.get('/photo-intel/digests/'),

// Permits
getPermitChecklists:  ()     => api.get('/permits/checklists/'),
updateChecklistItem:  (id, data) => api.patch(`/permits/checklist-items/${id}/`, data),

// Analytics
getBudgetForecasts:   ()     => api.get('/analytics/forecasts/'),
getRateTrends:        ()     => api.get('/analytics/rate-trends/'),
getBudgetAlerts:      ()     => api.get('/analytics/alerts/'),
```

---

### 3. Dual budget systems — no sync path
Two parallel implementations exist with no clear migration plan:
- **Legacy:** `finance.BudgetCategory` → `finance.PhaseBudgetAllocation`
- **New:** `accounting.models.budget.PhaseBudgetLine`

`HouseProject.budget_health` property still runs against the old `finance` system. If spending is recorded in `accounting`, the health check will be wrong.

**Files:** `apps/finance/models.py:29-32`, `apps/accounting/models/budget.py`

**Fix:** Choose one system and deprecate the other. Recommended: keep `accounting` (full double-entry) and update `budget_health` to query `accounting.models`.

---

## High Priority Issues

### Backend

| Issue | File | Fix |
|---|---|---|
| `WeeklyDigest` viewset not registered | `apps/photo_intel/urls.py` | Add to router |
| Incomplete `models_avg()` function | `apps/photo_intel/views.py:79` | Fix or remove |
| Analytics routes not mounted | `config/urls.py:53` | Register analytics router |
| Duplicate serializer definitions | `apps/accounting/serializers.py` | Remove duplicates (PhaseBudgetLineSerializer, ContractorPaymentRequestSerializer defined twice) |
| BoQ `apply/` endpoint missing | `apps/estimator/views.py` | Add action to push BoQ → BudgetCategory |
| `print()` in settings exposes SECRET_KEY | `config/settings.py:11,15` | Replace with `logging.debug()` |

### Material Stock Inconsistency
`Material.current_stock` is both manually settable AND auto-calculated by `recalculate_stock()`. These can go out of sync if any code sets `current_stock` directly without going through transactions.

**File:** `apps/resources/models.py:136`

**Fix:** Make `current_stock` a read-only property that always calls `recalculate_stock()`, or add a signal that recalculates on every `MaterialTransaction` save.

---

## Frontend Component Status

### Working ✅
- `ContractorsTab`, `ExpensesTab`, `ProjectsTab`, `PhasesTab`, `FundingTab`
- `StockTab`, `MaterialsTab`, `FloorsTab` (floor plan editor — complete)
- `DesktopPhotos` (gallery upload)
- JWT auth, ThemeContext, ConstructionContext, Profile page

### Partial ⚠️
- **AccountingDashboard** — 5 tabs exist (Ledger, Treasury, Payables, Budget, CostAnalysis) but API calls are unverified. Needs the missing `api.js` methods above.
- **PermitWizard** — form exists, backend checklist CRUD needs verification
- **BoQWizard** — wizard form exists, `apply/` endpoint missing on backend
- **SathiButton** (voice assistant) — UI exists, parser endpoint `POST /assistant/command/` is untested end-to-end

### Broken ❌
- **TimelapseGallery** — shows only empty state, no API fetch implemented
- **MismatchFeed** — no live data connection
- **PaymentModals** — calls `emailPaymentReceipt()` and payment endpoints that don't exist

---

## Backend App Completion Scores

| App | Score | Status | Notes |
|---|---|---|---|
| accounts | 95% | ✅ Complete | JWT, roles, activity log |
| core | 90% | ✅ Complete | Project, phases, floors, rooms, guides |
| tasks | 88% | ✅ Complete | Task CRUD + media + updates |
| resources | 82% | ✅ Complete | Contractors, materials, stock |
| accounting | 70% | ⚠️ Partial | Models good, routes/serializer issues |
| analytics | 60% | ⚠️ Partial | Models exist, routes not mounted |
| finance | 55% | ⚠️ Partial | Missing Payment model |
| permits | 50% | ⚠️ Partial | Co-pilot models exist, CRUD untested |
| photo_intel | 45% | ❌ Broken | Incomplete view function, missing route |
| estimator | 40% | ❌ Partial | BoQ models exist, apply/ missing |
| assistant | 35% | ❌ Partial | Parser may be truncated, untested |

---

## Recommended Fix Sequence

### Phase 1 — Unbreak core (1–2 days)
1. Add `Payment` model → `apps/finance/models.py` → run migration
2. Add missing 13 methods to `frontend/src/services/api.js`
3. Remove `print()` from `config/settings.py`
4. Fix incomplete function in `apps/photo_intel/views.py:79`

### Phase 2 — Complete partials (3–5 days)
5. Register `analytics`, `photo_intel`, `estimator` viewsets in `config/urls.py`
6. Remove duplicate serializer definitions in `apps/accounting/serializers.py`
7. Wire `TimelapseGallery` to real API (`getTimelapses()`)
8. Wire accounting tabs (Ledger, Treasury) to real API
9. Add `BoQ.apply()` action endpoint

### Phase 3 — Architecture clean-up (ongoing)
10. Decide: keep `finance` or fully migrate to `accounting` — update `budget_health` accordingly
11. Make `Material.current_stock` read-only computed field
12. End-to-end test: BoQWizard → PermitWizard → Sathi assistant voice command
13. Replace avatar fallback in `User.get_profile_image_url()` with local default image (privacy)

---

## What's Working Well

The foundation is solid:
- JWT auth with role-based permissions (IsSystemAdmin, CanManageFinances, CanManagePhases) is production-ready
- The floor plan editor (FloorPlanCanvas) is feature-complete: drag to move, drag walls to resize, polygon rooms (L/U/T shapes), vertex drag, draw-to-create rooms
- Contractor, material, expense, and task CRUD are all functional
- Construction phase tracking with permit fields is well-designed
- The double-entry accounting model (`accounting` app) is architecturally sound — just needs routing and frontend wiring
- Multi-project support and project switcher are implemented

---

*Generated by Claude audit — April 2026*
