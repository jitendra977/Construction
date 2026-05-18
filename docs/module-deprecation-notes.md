# Module Deprecation Notes

**Date:** 2026-05-18
**Phase:** 1 — Stabilize
**Author:** Jitendra

---

## Decision: Canonical vs Legacy Modules

Three legacy modules have been deprecated in favour of their clean reimplementations. Deprecation warnings are now emitted at server startup via each app's `ready()` method.

---

### 1. `apps.finance` → deprecated in favour of `apps.fin`

| | Legacy (`finance`) | Canonical (`fin`) |
|---|---|---|
| Models | 15 (single models.py) | 20 (modular models/ folder) |
| Migrations | 7 | 6 |
| API prefix | `api/v1/finance/` | `api/v1/fin/` |

**Why fin wins:** Clean reimplementation with modular structure (account, bill, budget, journal, loan, transfer, vendor, phase_budget). Better organised, more models covered.

**What remains in finance that needs migrating before deletion:**
- Verify all `Vendor` and `PhaseBudgetLine` usages — the PLAN notes these are still externally referenced from `apps.finance`. Confirm equivalents exist in `apps.fin`.
- Run a URL usage audit: check frontend API calls for `api/v1/finance/` and redirect to `api/v1/fin/`.

**Removal sequence:**
1. (Phase 2) Redirect or remove `api/v1/finance/` URLs → return 410 Gone.
2. (Phase 3) Delete `apps/finance/` directory and remove from `INSTALLED_APPS`.

---

### 2. `apps.resources` → deprecated in favour of `apps.resource`

| | Legacy (`resources`) | Canonical (`resource`) |
|---|---|---|
| Models | 6 (Contractor, Material, Supplier, Document, WastageAlert, WastageThreshold) | 8 (modular: equipment, labor, material, purchase, supplier) |
| Migrations | 2 | 5 |
| API prefix | router-mounted (contractors, materials, suppliers, documents) | `api/v1/resource/` |

**Why resource wins:** Already handles Contractor (as Worker/Labor), Material, Supplier. Router imports were already switched to `apps.resource` views.

**Blocker before deletion — two models have no equivalent yet:**
- `WastageAlert` — still imported in `config/urls.py` via `WastageAlertViewSet`
- `WastageThreshold` — still imported in `config/urls.py` via `WastageThresholdViewSet`

Action: Add `WastageAlert` and `WastageThreshold` models to `apps.resource`, write a data migration, then remove the legacy viewsets from the router.

**Removal sequence:**
1. (Phase 2) Add wastage models to `apps.resource`, data-migrate, remove legacy router entries.
2. (Phase 2) Remove `api/v1/resources/` URL includes.
3. (Phase 3) Delete `apps/resources/` directory and remove from `INSTALLED_APPS`.

---

### 3. `apps.accounting` → deprecated in favour of `apps.fin`

| | Legacy (`accounting`) | Canonical (`fin`) |
|---|---|---|
| Models | 13 (budget, construction, ledger, payables, treasury) | 20 (see fin above) |
| Migrations | 5 | 6 |
| API prefix | `api/v1/accounting/` | `api/v1/fin/` |

**Why fin wins:** `apps.fin` is the designated clean finance layer covering accounts, journal, budget, bills, loans, and transfers. `apps.accounting` is explicitly marked deprecated in the PLAN.

**What needs auditing before deletion:**
- `ledger` models — does `apps.fin`'s journal cover this?
- `treasury` models — any live frontend usage of `api/v1/accounting/treasury/`?
- `payables` models — check if `apps.fin` bills/payments cover this.

**Removal sequence:**
1. (Phase 2) Audit remaining `api/v1/accounting/` endpoint usage in frontend. Migrate any missing functionality into `apps.fin`.
2. (Phase 2) Remove `api/v1/accounting/` URL include → return 410 Gone.
3. (Phase 3) Delete `apps/accounting/` directory and remove from `INSTALLED_APPS`.

---

## Non-Deprecation Decision: `apps.estimator` + `apps.estimate` are COMPLEMENTARY

After reviewing the code, these two apps serve **different purposes** and are **not duplicates**:

| App | Role |
|---|---|
| `apps.estimator` | Calculation engine — wall/brick/concrete/flooring calculators, BoQ auto-generator, budget template seeding |
| `apps.estimate` | Data persistence — saved estimates, EstimateSection, EstimateItem, MaterialRate, LaborRate, RateRevision |

**Decision: Keep both.** No deprecation. They should be used together: `estimator` computes, `estimate` stores.

---

## Summary Table

| App | Status | Replace With | Blocked By |
|---|---|---|---|
| `apps.finance` | ⚠️ DEPRECATED | `apps.fin` | Frontend URL migration |
| `apps.resources` | ⚠️ DEPRECATED | `apps.resource` | WastageAlert/Threshold migration |
| `apps.accounting` | ⚠️ DEPRECATED | `apps.fin` | Ledger/treasury/payables audit |
| `apps.estimator` | ✅ KEEP | — | — |
| `apps.estimate` | ✅ KEEP | — | — |
| `apps.fin` | ✅ CANONICAL | — | — |
| `apps.resource` | ✅ CANONICAL | — | — |
