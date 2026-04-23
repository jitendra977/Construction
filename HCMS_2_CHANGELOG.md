# HCMS v2 — Changelog

Upgrade summary for the House Construction Management System covering six
net-new feature phases delivered in this iteration. Every phase ships
Django models + migrations, a REST surface under `/api/v1/`, React
components, and tests where applicable.

Baseline: Django 4.2 + DRF 3.14 + React 19 + Vite + Tailwind.

---

## Phase 1 — Photo Intelligence + Timelapse (`apps.photo_intel`)

**Goal:** Auto-label site photos with phase + quality signals, flag task/photo
mismatches, and render per-scope timelapses and weekly digests.

- Models: `PhotoAnalysis`, `Timelapse`, `WeeklyDigest`.
- Services:
  - `services/analyzer.py` — pluggable backends (`heuristic`, `google_vision`,
    `openai_vision`) with a safe heuristic fallback. Configurable via
    `PHOTO_INTEL_ANALYZER`.
  - `services/phase_mapper.py` — Nepali/Romanized phase-name → canonical key.
  - `services/color_utils.py` — HSV histogram, dominant colour bucketing.
  - `services/timelapse.py` — ffmpeg MP4 with a Pillow GIF fallback; scope
    = ROOM / FLOOR / PHASE / PROJECT.
  - `services/digest.py` — weekly build rolls up counts, mismatches, and a
    Nepali narrative.
- Signals: `post_save` on `TaskMedia` triggers analysis in a daemon thread
  (`PHOTO_INTEL_SYNC=True` for inline execution in tests).
- API: `/api/v1/photo-intel/analyses/`, `/timelapses/`, `/digests/` with
  custom actions (`reanalyze`, `stats`, `generate`, `regenerate`,
  `build_current`).
- Management: `backfill_photo_analysis`, `build_weekly_digest`.
- Frontend: `PhotoAIBadge`, `PhaseMatchWarning`, `TimelapseGallery`,
  `TimelapseCard`, `GenerateTimelapseModal`, `MismatchFeed`,
  `TimelapsePage`.
- Tests: analyzer, timelapse, API (`PHOTO_INTEL_SYNC` override).

## Phase 2 — Predictive Budget Engine (`apps.analytics`)

**Goal:** Turn historical expense + purchase data into forward-looking
forecasts, supplier rate trends, and a deduplicated alerts feed.

- Models: `BudgetForecast` (1:1 BudgetCategory), `SupplierRateTrend`
  (unique supplier×material), `BudgetAlert`
  (unique alert_type+scope_key → no spam).
- Services:
  - `forecaster.py` — pure-Python OLS over cumulative daily spend,
    computes daily burn, days-to-exhaustion, projected overrun, R²
    confidence (0–1), and risk level LOW/MEDIUM/HIGH.
  - `rates.py` — 90-day rolling window, 30/60 split for MoM change %.
  - `alerts.py` — synthesises alerts with tunable thresholds:
    `SPIKE_WARN_PCT=4`, `SPIKE_CRITICAL_PCT=10`, `BURN_DAYS_WARN=21`,
    `BURN_DAYS_CRITICAL=7`. Auto-resolves stale alerts.
- API: `/api/v1/analytics/forecasts/`, `/rate-trends/`, `/alerts/` with
  `refresh/`, `rebuild/`, `resolve/` actions.
- Management: `refresh_analytics` (single nightly command).
- Frontend: `ForecastWidget`, `RateTrendTable`, `AlertsFeed`,
  `AnalyticsPage` (routed at `/dashboard/desktop/analytics`).
- Tests: 8 covering `_linear_fit` correctness, edge cases, forecast
  creation, and three alert flows including rate-spike severity.

## Phase 3 — BoQ Auto-Generator (extends `apps.estimator`)

**Goal:** Generate a priced Bill of Quantities from a small input form
(sqft, storeys, bedrooms, quality tier) and optionally push totals into
the BudgetCategory ledger.

- Models: `BoQTemplate`, `BoQTemplateItem`, `GeneratedBoQ`,
  `GeneratedBoQItem` (immutable audit trail — regeneration writes a new
  row).
- Service `boq_generator.py`:
  - `pick_template()` matches by sqft range / storeys list / quality tier.
  - `_eval_formula()` is a **restricted AST evaluator** (no builtins, no
    attribute access; supports `+-*/**%`, unary ops, and
    `min/max/round/abs/int/float`).
  - `generate_boq()` applies per-item waste factor, joins against
    `ConstructionRate`, fills category totals.
  - `apply_to_budget()` upserts `BudgetCategory` rows from BoQ totals.
  - `seed_default_templates()` installs a "Standard 2-Storey Residential"
    recipe with 9 line items.
- API: `/api/v1/estimator/boq-templates/`, `/boqs/` with `generate/`,
  `apply/`, `seed-defaults/` actions.
- Frontend: `BoQWizard` component — grid form, live item table,
  "Apply to Budget" button.

## Phase 4 — Voice Assistant "साथी" (`apps.assistant`)

**Goal:** Nepali voice + text assistant that answers live questions about
stock, budget, and next steps, grounded in the project DB.

- Models: `VoiceCommand`, `TranscriptionLog`, `KnownPhrase` (admin-editable
  lexicon).
- Services:
  - `parser.py` — deterministic keyword + regex scorer over a Nepali/
    Romanized vocabulary, augmented by the `KnownPhrase` DB table;
    extracts numeric and material entities.
  - `dispatcher.py` — intent handlers call into `Material`, `BudgetCategory`,
    `Task` for live answers.
- API: `/api/v1/assistant/voice-commands/ask/`, plus `phrases/`,
  `transcripts/` CRUD.
- Frontend: `SathiButton` — floating mic that uses the browser Web
  Speech API (`ne-NP`), falls back to a typed prompt, and reads responses
  back via `speechSynthesis`.
- Tests: 6 parser cases (Nepali + Romanized + number extraction).

## Phase 5 — Permit Co-Pilot (extends `apps.permits`)

**Goal:** Turn opaque municipality permit pipelines into a live
per-project checklist with document requirements, fee estimates, and
deadline reminders.

- Models: `MunicipalityTemplate`, `MunicipalityStep`, `DocumentTemplate`
  (Lalpurja / Nagrikta / Naksha / Charkilla / Structural / Tax Clearance),
  `PermitChecklist`, `ChecklistItem`, `DeadlineReminder`.
- Services `copilot_services.py`:
  - `seed_kathmandu_template()` — default 6-step Kathmandu Metro pipeline
    with all required documents attached.
  - `materialise_checklist()` — copies a template onto a project,
    compounds due-dates from `typical_days`.
  - `refresh_deadlines()` — cron-safe: seeds reminders, marks overdue.
- API: `/api/v1/permits/municipality-templates/`, `/checklists/`,
  `/checklist-items/`, `/reminders/`.
- Frontend: `PermitWizard` — template picker, one-click materialise,
  inline checklist with status badges.

## Phase 6 — Offline-first PWA (frontend)

**Goal:** Keep the site-foreman UX useful on spotty 4G / complete
connectivity loss.

- `services/offlineQueue.js` — zero-dep IndexedDB queue (native API,
  falls back to `localStorage`) with `enqueue/list/remove/flush` +
  `installOnlineFlush`.
- `services/api.js` — axios response interceptor now enqueues failed
  mutations (`POST/PATCH/PUT/DELETE`) on network errors, returning a
  `{ queued: true, offline: true }` sentinel. Calls `installOnlineFlush`
  at boot — pending writes replay automatically when the `online` event
  fires.
- `components/common/OfflineStatus.jsx` — floating chip showing
  connectivity + queued-write count.
- `vite.config.js` — existing PWA config unchanged; `NetworkFirst` for
  `/api/` remains in place.

---

## Integration changes

- `config/settings.py` — added `apps.photo_intel`, `apps.analytics`,
  `apps.assistant` to `INSTALLED_APPS`. Added config keys:
  `PHOTO_INTEL_ANALYZER`, `PHOTO_INTEL_SYNC`, `GOOGLE_VISION_API_KEY`,
  `OPENAI_API_KEY`.
- `config/urls.py` — mounted `/api/v1/photo-intel/`, `/api/v1/analytics/`,
  `/api/v1/assistant/`; permit co-pilot routes ride `/api/v1/permits/`.
- `requirements.txt` — no new hard dependencies (Pillow and requests
  were already pinned).
- Frontend routes — added `/dashboard/desktop/timelapse` and
  `/dashboard/desktop/analytics`.
- Migrations applied: `photo_intel.0001`, `analytics.0001`,
  `assistant.0001`, `estimator.0002`, `permits.0003`.

## Verification

- `python manage.py check` → **no issues**.
- `python manage.py migrate --run-syncdb` → all 5 new migrations apply
  cleanly on a fresh SQLite database.
- `python manage.py test apps.photo_intel apps.analytics apps.assistant`
  → **26 tests, all green** (~1.8s).

## Non-functional notes

- The analyzer, BoQ formula evaluator, and intent parser are all
  deliberately offline-capable and deterministic. Cloud STT / vision
  APIs are opt-in through settings; missing credentials transparently
  fall back to local heuristics.
- The offline queue preserves idempotency only for the server endpoints
  it replays against — destructive endpoints should be reviewed before
  relying on replay-on-reconnect.
- Alert thresholds live in one module (`apps.analytics.services.alerts`)
  and can be tuned without migrations.
