# HCMS Complete Completion Plan
**Generated:** April 2026 | **Target:** 100% feature completion across all 11 apps

---

## Corrections from Audit

After reading the actual source files, some audit findings were wrong:
- ✅ `Payment` model **does exist** in `finance/models.py` (defined after line 100)
- ✅ `PaymentViewSet` **is registered** in `finance/urls.py:21`
- ✅ All apps **are mounted** in `config/urls.py` (lines 48–54)
- ✅ `photo_intel/views.py:79` `models_avg()` is **fine** — it's a valid helper
- ❌ `accounting/serializers.py` has **real duplicates** (lines 91–119 vs 123–149)
- ❌ `assistant/services/parser.py:93` has a **real syntax bug** (try/except misindented)
- ❌ `estimator` has **no BoQ model/viewset** — only calculator views exist

---

## Phase 1 — Fix Real Bugs (Day 1)

### 1.1 — Fix duplicate serializers in `accounting/serializers.py`

**File:** `backend/apps/accounting/serializers.py`

Remove the second definition of each (lines 123–149). Keep only the first versions (lines 91–119). The duplicates are:
- `PhaseBudgetLineSerializer` (defined at line 91, duplicated at line 123)
- `BudgetRevisionSerializer` (defined at line 97, duplicated at line 130)
- `ContractorPaymentRequestSerializer` (defined at line 104, duplicated at line 138)
- `RetentionReleaseSerializer` (defined at line 116, duplicated at line 146)

```python
# REMOVE lines 121–149 entirely (the second block starting with "# ─── BUDGET SERIALIZERS ───")
```

---

### 1.2 — Fix parser syntax bug in `assistant/services/parser.py`

**File:** `backend/apps/assistant/services/parser.py:83–94`

The `try` block at line 83 has its `except` at line 93 indented inside the `for` loop body — this is a SyntaxError.

**Current (broken):**
```python
    try:
        from apps.assistant.models import KnownPhrase
        from apps.assistant.models import KnownPhrase   # also duplicate import
        for kp in KnownPhrase.objects.filter(is_active=True):
            if kp.phrase.lower() in t:
                if kp.intent == best_intent:
                    best_score += kp.weight
                elif kp.weight > best_score:
                    best_score = kp.weight
                    best_intent = kp.intent
        except Exception:            # ← WRONG: indented inside the for loop
            pass
```

**Fixed:**
```python
    try:
        from apps.assistant.models import KnownPhrase   # remove duplicate import
        for kp in KnownPhrase.objects.filter(is_active=True):
            if kp.phrase.lower() in t:
                if kp.intent == best_intent:
                    best_score += kp.weight
                elif kp.weight > best_score:
                    best_score = kp.weight
                    best_intent = kp.intent
    except Exception:                # ← CORRECT: at try block level
        pass
```

---

### 1.3 — Remove debug `print()` from `config/settings.py`

**File:** `backend/config/settings.py` lines 11, 15

Replace `print(SECRET_KEY)` and `print(EMAIL_BACKEND)` with `import logging; logger = logging.getLogger(__name__)` calls or simply delete them.

```python
# DELETE or replace these two lines:
# print(SECRET_KEY)        ← line 11, exposes secret key in logs
# print(EMAIL_BACKEND)     ← line 15
```

---

## Phase 2 — Add Missing API Service Methods (Day 1–2)

**File:** `frontend/src/services/api.js` (append after line 249)

### 2.1 — Accounting methods

```javascript
// ── Accounting (GL, Journal, Treasury) ──────────────────────────
getAccounts:           (params={}) => api.get('/finance/accounts/', { params }),
createAccount:         (data)      => api.post('/finance/accounts/', data),
updateAccount:         (id, data)  => api.patch(`/finance/accounts/${id}/`, data),
deleteAccount:         (id)        => api.delete(`/finance/accounts/${id}/`),

getJournalEntries:     (params={}) => api.get('/finance/journal-entries/', { params }),
createJournalEntry:    (data)      => api.post('/finance/journal-entries/', data),
getJournalEntry:       (id)        => api.get(`/finance/journal-entries/${id}/`),

getBankTransfers:      ()          => api.get('/finance/bank-transfers/'),
createBankTransfer:    (data)      => api.post('/finance/bank-transfers/', data),
deleteBankTransfer:    (id)        => api.delete(`/finance/bank-transfers/${id}/`),

getPurchaseOrders:     (params={}) => api.get('/finance/purchase-orders/', { params }),
createPurchaseOrder:   (data)      => api.post('/finance/purchase-orders/', data),
updatePurchaseOrder:   (id, data)  => api.patch(`/finance/purchase-orders/${id}/`, data),
deletePurchaseOrder:   (id)        => api.delete(`/finance/purchase-orders/${id}/`),
```

### 2.2 — Accounting app methods (double-entry)

```javascript
// ── Accounting app (advanced double-entry) ──────────────────────
getAccountingAccounts:    (params={}) => api.get('/accounting/bank-accounts/', { params }),
createAccountingAccount:  (data)      => api.post('/accounting/bank-accounts/', data),
updateAccountingAccount:  (id, data)  => api.patch(`/accounting/bank-accounts/${id}/`, data),

getCashTransfers:          ()         => api.get('/accounting/cash-transfers/'),
createCashTransfer:        (data)     => api.post('/accounting/cash-transfers/', data),

getContractorPaymentRequests: (params={}) => api.get('/accounting/contractor-payments/', { params }),
createContractorPaymentRequest: (data)    => api.post('/accounting/contractor-payments/', data),
updateContractorPaymentRequest: (id, d)   => api.patch(`/accounting/contractor-payments/${id}/`, d),
approveContractorPaymentRequest: (id)     => api.post(`/accounting/contractor-payments/${id}/approve/`),

getPhaseBudgetLines:       (params={}) => api.get('/accounting/phase-budget-lines/', { params }),
createPhaseBudgetLine:     (data)      => api.post('/accounting/phase-budget-lines/', data),
updatePhaseBudgetLine:     (id, data)  => api.patch(`/accounting/phase-budget-lines/${id}/`, data),
getBudgetRevisions:        (params={}) => api.get('/accounting/budget-revisions/', { params }),
createBudgetRevision:      (data)      => api.post('/accounting/budget-revisions/', data),
```

### 2.3 — Photo Intel / Timelapse methods

```javascript
// ── Photo Intelligence ───────────────────────────────────────────
getPhotoAnalyses:      (params={}) => api.get('/photo-intel/analyses/', { params }),
createPhotoAnalysis:   (data)      => api.post('/photo-intel/analyses/', data),
getPhotoAnalysisSummary: ()        => api.get('/photo-intel/analyses/summary/'),

getTimelapses:         (params={}) => api.get('/photo-intel/timelapses/', { params }),
generateTimelapse:     (data)      => api.post('/photo-intel/timelapses/generate/', data),
deleteTimelapse:       (id)        => api.delete(`/photo-intel/timelapses/${id}/`),

getWeeklyDigests:      (params={}) => api.get('/photo-intel/digests/', { params }),
```

### 2.4 — Analytics methods

```javascript
// ── Analytics ────────────────────────────────────────────────────
getBudgetForecasts:    (params={}) => api.get('/analytics/forecasts/', { params }),
createBudgetForecast:  (data)      => api.post('/analytics/forecasts/', data),

getSupplierRateTrends: (params={}) => api.get('/analytics/rate-trends/', { params }),

getBudgetAlerts:       ()          => api.get('/analytics/alerts/'),
acknowledgeBudgetAlert: (id)       => api.post(`/analytics/alerts/${id}/acknowledge/`),
```

### 2.5 — Estimator (BoQ) methods

```javascript
// ── Estimator ────────────────────────────────────────────────────
calculateWall:       (data) => api.post('/estimator/calculate-wall/', data),
calculateConcrete:   (data) => api.post('/estimator/calculate-concrete/', data),
calculatePlaster:    (data) => api.post('/estimator/calculate-plaster/', data),
calculateFlooring:   (data) => api.post('/estimator/calculate-flooring/', data),
calculateFullBudget: (data) => api.post('/estimator/calculate-structure/', data),

getConstructionRates: ()         => api.get('/estimator/rates/'),
createConstructionRate: (data)   => api.post('/estimator/rates/', data),
updateConstructionRate: (id, d)  => api.patch(`/estimator/rates/${id}/`, d),

// BoQ (to be added in Phase 3)
// getBoQs:             ()    => api.get('/estimator/boqs/'),
// createBoQ:           (d)   => api.post('/estimator/boqs/', d),
// applyBoQ:            (id)  => api.post(`/estimator/boqs/${id}/apply/`),
```

### 2.6 — Permits methods

```javascript
// ── Permits ──────────────────────────────────────────────────────
getPermits:            (params={}) => api.get('/permits/permits/', { params }),
createPermit:          (data)      => api.post('/permits/permits/', data),
updatePermit:          (id, data)  => api.patch(`/permits/permits/${id}/`, data),

getPermitChecklists:   (params={}) => api.get('/permits/checklists/', { params }),
updateChecklistItem:   (id, data)  => api.patch(`/permits/checklist-items/${id}/`, data),

getMunicipalityTemplates: ()       => api.get('/permits/municipality-templates/'),
```

### 2.7 — Sathi (Voice Assistant) methods

```javascript
// ── Sathi Voice Assistant ────────────────────────────────────────
sendVoiceCommand:   (data) => api.post('/assistant/command/', data),
getVoiceHistory:    ()     => api.get('/assistant/history/'),
getKnownPhrases:    ()     => api.get('/assistant/known-phrases/'),
```

---

## Phase 3 — Wire Frontend Tabs to Real APIs (Days 3–5)

### 3.1 — AccountingDashboard tabs

**Files:** `frontend/src/components/desktop/accounting/`

#### LedgerTab.jsx
- Replace hardcoded/empty state with `useEffect(() => dashboardService.getJournalEntries(), [])`
- Show journal entries list with date, description, debit, credit columns
- Wire "New Entry" button → `createJournalEntry()`

#### TreasuryTab.jsx  
- Fetch `getAccountingAccounts()` for bank account list
- Fetch `getCashTransfers()` for transfer history
- Wire "Transfer" button → `createCashTransfer()`
- Show account balances in cards

#### PayablesTab.jsx
- Verify `getBills()` / `createBill()` already work (finance/bills/ is registered)
- Wire "Pay Bill" → `BillService` action via `api.patch('/finance/bills/{id}/pay/')`
- Wire `getContractorPaymentRequests()` for contractor payment tab

#### BudgetTab (if exists)
- Fetch `getPhaseBudgetLines()` → show phase-by-phase budget allocation
- "Add Line" → `createPhaseBudgetLine()`

---

### 3.2 — TimelapseGallery.jsx

**File:** `frontend/src/components/photo_intel/TimelapseGallery.jsx`

Replace empty state with:
```javascript
const [timelapses, setTimelapses] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
    dashboardService.getTimelapses().then(r => {
        setTimelapses(r.data);
        setLoading(false);
    });
}, []);
```

Add timelapse cards showing:
- Thumbnail / video preview
- Scope (project / floor / room)
- Frame count + duration
- "Regenerate" button → `generateTimelapse()`

---

### 3.3 — MismatchFeed.jsx

**File:** `frontend/src/components/photo_intel/MismatchFeed.jsx`

Fetch `getPhotoAnalyses({ status: 'MISMATCH' })` and render warning cards:
- Photo thumbnail
- Phase expected vs detected
- Confidence score
- "Mark Resolved" action

---

### 3.4 — AnalyticsPage.jsx

**File:** `frontend/src/pages/AnalyticsPage.jsx`

Wire three data sources:
- `getBudgetForecasts()` → forecast chart (line chart: planned vs projected)  
- `getSupplierRateTrends()` → rate trend table per material
- `getBudgetAlerts()` → alert cards with `acknowledgeBudgetAlert(id)`

---

## Phase 4 — Backend Additions (Days 5–7)

### 4.1 — Add BoQ model + viewset to estimator app

The estimator app has calculator views but **no BoQ (Bill of Quantities) model**. The BoQWizard frontend needs this.

**File:** `backend/apps/estimator/models.py` — add:

```python
class BoQ(models.Model):
    """Bill of Quantities — generated estimate that can be pushed to budget."""
    STATUS = [('DRAFT','Draft'), ('FINAL','Final'), ('APPLIED','Applied to Budget')]
    project        = models.ForeignKey('core.HouseProject', on_delete=models.CASCADE, related_name='boqs')
    name           = models.CharField(max_length=200)
    status         = models.CharField(max_length=20, choices=STATUS, default='DRAFT')
    total_estimate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes          = models.TextField(blank=True)
    created_by     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

class BoQLineItem(models.Model):
    """Individual line in a BoQ (material, labor, overhead)."""
    TYPE = [('MATERIAL','Material'), ('LABOR','Labor'), ('EQUIPMENT','Equipment'), ('OVERHEAD','Overhead')]
    boq            = models.ForeignKey(BoQ, on_delete=models.CASCADE, related_name='line_items')
    item_type      = models.CharField(max_length=20, choices=TYPE, default='MATERIAL')
    description    = models.CharField(max_length=300)
    unit           = models.CharField(max_length=50, default='unit')
    quantity       = models.DecimalField(max_digits=10, decimal_places=3)
    unit_rate      = models.DecimalField(max_digits=10, decimal_places=2)
    total          = models.DecimalField(max_digits=12, decimal_places=2)
    phase          = models.ForeignKey('core.ConstructionPhase', on_delete=models.SET_NULL, null=True, blank=True)
    
    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_rate
        super().save(*args, **kwargs)
```

**File:** `backend/apps/estimator/views.py` — add BoQViewSet:

```python
class BoQViewSet(viewsets.ModelViewSet):
    queryset = BoQ.objects.prefetch_related('line_items').all()
    serializer_class = BoQSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Push BoQ line items into finance.BudgetCategory allocations."""
        boq = self.get_object()
        if boq.status == 'APPLIED':
            return Response({'detail': 'Already applied.'}, status=400)
        from apps.finance.models import BudgetCategory
        for item in boq.line_items.all():
            cat, _ = BudgetCategory.objects.get_or_create(
                name=item.description,
                defaults={'allocation': item.total}
            )
        boq.status = 'APPLIED'
        boq.save()
        return Response({'status': 'applied', 'boq_id': boq.id})
```

**File:** `backend/apps/estimator/urls.py` — register BoQViewSet:

```python
router.register(r'boqs', BoQViewSet)
```

Create migration: `python manage.py makemigrations estimator`

---

### 4.2 — Fix material stock inconsistency

**File:** `backend/apps/resources/models.py`

Add a `post_save` signal so `current_stock` is always recalculated after any transaction:

```python
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=MaterialTransaction)
def recalculate_on_transaction(sender, instance, **kwargs):
    """Ensure current_stock is always in sync with transactions."""
    instance.material.recalculate_stock()
```

Also make `current_stock` read-only in the serializer by adding `read_only=True`.

---

### 4.3 — Complete permits backend

**File:** `backend/apps/permits/urls.py` — verify these are registered:
- `PermitViewSet` → `r'permits'`
- `ChecklistItemViewSet` → `r'checklist-items'`  
- `MunicipalityTemplateViewSet` → `r'municipality-templates'`

Add any missing viewsets to `permits/views.py` using standard ModelViewSet pattern.

---

### 4.4 — Add WeeklyDigest viewset to photo_intel

**File:** `backend/apps/photo_intel/urls.py` — verify:

```python
router.register(r'digests', WeeklyDigestViewSet)
```

If `WeeklyDigestViewSet` doesn't exist in `views.py`, add:

```python
class WeeklyDigestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WeeklyDigest.objects.all().order_by('-week_start')
    serializer_class = WeeklyDigestSerializer
    filterset_fields = ['project', 'week_start']
```

---

## Phase 5 — Architecture Improvements (Days 8–10)

### 5.1 — Budget system decision

**Recommendation:** Keep `finance.BudgetCategory` as the primary budget system (it's already wired to `HouseProject.budget_health`, expense tracking, and the UI). Treat `accounting.PhaseBudgetLine` as an **additional** detail layer for construction-phase-level tracking, not a replacement.

**Action:** Update `budget_health` property in `core/models.py` to also check `accounting.PhaseBudgetLine` if it exists, as a supplementary signal.

No migration or data deletion needed.

---

### 5.2 — Sathi assistant end-to-end test

**Files to verify:**
1. `backend/apps/assistant/urls.py` — `POST /assistant/command/` is registered
2. `backend/apps/assistant/views.py` — CommandView handles the parsed intent → dispatches action
3. `backend/apps/assistant/services/dispatcher.py` — routes intents to business logic
4. `frontend/src/components/assistant/SathiButton.jsx` — sends command to `sendVoiceCommand()`

**Test script:**
```bash
curl -X POST http://localhost:8000/api/v1/assistant/command/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text": "cement ko stock kati cha", "project_id": 1}'
```

Expected response:
```json
{"intent": "check_stock", "confidence": 0.85, "result": {"material": "cement", "current_stock": 450, "unit": "bags"}}
```

---

### 5.3 — Production readiness checklist

**File:** `backend/config/settings.py`

```python
# Remove debug prints (Phase 1.3)
# Set in production via environment variables:
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True

# Configure real SMTP:
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
```

**Rate limiting:** Add DRF throttling per role:
```python
REST_FRAMEWORK = {
    ...
    'DEFAULT_THROTTLE_RATES': {
        'user': '500/day',
        'admin': '2000/day',
        'finance_manager': '1000/day',
    }
}
```

---

## Phase 6 — User Guide & Polish (Days 10–12)

### 6.1 — Seed UserGuides for new features

Add UserGuide + UserGuideStep records for:
- Photo Intel upload workflow
- BoQ wizard (how to generate and apply)
- Sathi voice commands list
- Permit co-pilot checklist walkthrough

### 6.2 — Offline queue visual feedback

**File:** `frontend/src/services/offlineQueue.js`

Add a global "Offline — X operations queued" banner in the app shell when offline queue has pending items. Wire to `navigator.onLine` event.

### 6.3 — Avatar privacy fix

**File:** `backend/apps/accounts/models.py`

Replace `get_profile_image_url()` fallback (currently calls external avatar service) with a local default:
```python
def get_profile_image_url(self):
    if self.profile_image:
        return self.profile_image.url
    return '/static/images/default-avatar.png'  # local, no external call
```

---

## Effort Estimate

| Phase | Tasks | Estimated Time |
|---|---|---|
| Phase 1 — Fix real bugs | 3 tasks | 2 hours |
| Phase 2 — Add missing API methods | 7 groups | 3 hours |
| Phase 3 — Wire frontend tabs | 4 components | 2 days |
| Phase 4 — Backend additions | 4 tasks | 2 days |
| Phase 5 — Architecture | 3 tasks | 1 day |
| Phase 6 — Polish | 3 tasks | 1 day |
| **Total** | **24 tasks** | **~6–7 days** |

---

## Task Execution Order (dependency-safe)

```
Day 1:  1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3
Day 2:  2.4 → 2.5 → 2.6 → 2.7
Day 3:  3.1 (LedgerTab + TreasuryTab)
Day 4:  3.2 + 3.3 (Timelapse + MismatchFeed)
Day 5:  3.4 (Analytics) + 4.1 (BoQ model + viewset)
Day 6:  4.2 (material stock) + 4.3 (permits) + 4.4 (WeeklyDigest)
Day 7:  5.1 (budget decision) + 5.2 (Sathi test) + 5.3 (production)
Day 8:  6.1 + 6.2 + 6.3 (polish)
```

---

*Say "start Phase 1" to begin implementation, or name any specific task to jump directly to it.*
