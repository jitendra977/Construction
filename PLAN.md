# Construction Platform — Development Roadmap

**Last updated:** 2026-05-17
**Owner:** Jitendra
**Status:** Mid-stage build — core domains functional, hardening and consolidation phase

---

## 1. Project Snapshot

A full-stack construction management platform for residential and small-commercial projects. The backend is a Django 4.2 + DRF monolith with 17 installed apps; the frontend is a Vite + React 19 SPA with separate desktop and mobile component trees. Authentication is JWT-based with global roles (SUPER_ADMIN, HOME_OWNER, LEAD_ENGINEER, CONTRACTOR, VIEWER) plus per-project member flags. The system targets the full project lifecycle: estimation and BoQ, finance and accounting, workforce and attendance (with NFC/QR/MQTT), procurement and inventory, permits, on-site photo intelligence, analytics, and an AI assistant ("Sathi").

### Stack at a glance

Backend: Django 4.2, DRF, SimpleJWT, PostgreSQL (SQLite fallback), Redis, Celery + django-celery-beat, WhiteNoise, django-simple-history, DRF Spectacular, reportlab, qrcode, paho-mqtt. AI providers are pluggable: Groq / Gemini / OpenAI for the assistant; Google Vision / OpenAI Vision / heuristic for photo analysis; ElevenLabs + Edge TTS for voice.

Frontend: Vite 7, React 19, React Router 7, Tailwind + custom design system, Axios with refresh-token interceptor and offline mutation queue, Leaflet maps, jsPDF, MQTT.js, @dnd-kit, driver.js onboarding, sonner toasts, react-signature-canvas.

---

## 2. Current State by Module

### Backend (Django apps under `backend/apps/`)

| App | Maturity | Role |
|---|---|---|
| accounts | Solid | Auth, JWT, roles, permissions, digital signatures |
| core | Solid | HouseProject, ConstructionPhase, Room, Floor, ProjectMember; PDF + email utils; seed commands |
| tasks | Solid | Task, TaskDocument, TaskUpdate; assignable to WorkforceMember or Team |
| fin | Solid | Clean finance reimplementation — accounts, bills, budget, journal, loans, transfers; dashboard view |
| resource | Solid | Clean resource reimplementation — material, equipment, labor, supplier, purchase, stock services |
| attendance | Solid | QR + NFC + MQTT-driven daily attendance with IoT device sync (18 migrations — actively evolving) |
| workforce | Solid | Modular member / team / payroll / evaluation / skills models; badge generation |
| permits | Solid | Permit applications with approval workflow + copilot integration |
| photo_intel | Solid | AI photo analysis (Vision API or heuristic), weekly timelapse digests, phase-mapping; has tests |
| analytics | Solid | Supplier rate trends, forecaster, alerts; has tests |
| location_tracking | Solid | GPS geofencing for site pins |
| accounting | Partial / Legacy | High-complexity ledger + treasury + payables; marked deprecated but still wired |
| finance | Partial / Legacy | Older Budget/Expense/Payment models; only Vendor + PhaseBudgetLine still externally used |
| resources | Partial / Legacy | Older Contractor/Material/Supplier/Document; kept for DB tables + wastage endpoints |
| estimator | Partial | BoQ generator, line items, market rates |
| estimate | Partial | Newer estimator variant — services + serializers present, single migration |
| assistant | Partial | Sathi — conversation history, parser, dispatcher, AI tools; pluggable LLM |
| data_transfer | Stub | CSV/Excel import-export — no models, minimal views |

### Frontend (`frontend/src/`)

Routing splits into `/dashboard/desktop/*`, `/dashboard/mobile/*`, plus public `/worker` and `/kiosk/:projectId` entry points. A `ResponsiveRedirector` swaps trees at the 1024px breakpoint.

| Module | Maturity | Notes |
|---|---|---|
| finance | Solid | 8 pages (Dashboard, Banking, Loans, Transfers, Ledger, Bills, Budget, Help) with full CRUD |
| projects | Solid | Project gateway, detail, phases, child routes |
| accounts | Solid | Profile, Users, roles, activity logs |
| resource | Solid | Materials, suppliers, inventory |
| structure | Solid | Floors, rooms, sections |
| timeline | Solid | Project timeline, milestones |
| attendance | Solid | NFC + QR scanners, payroll, monthly reports, kiosk mode, real-time MQTT |
| estimator | Solid | EstimatorHub with 5 tabs; Brick/Concrete/Flooring/Plaster calculators; BoQ wizard |
| photo_intel | Solid | Timelapse gallery, generate modal, mismatch feed, AI badge, phase-match warning |
| permits | Solid | Permit tracker, wizard, document vault |
| dashboard | Stub | Single index page, no child routes |
| workforce | Partial | WorkforceHub exists but no internal routes/pages |
| location | Partial | Routes exist but minimal screens |
| worker | Partial | Public worker portal — stubbed |

---

## 3. Gaps, Risks, and Tech Debt

**Duplicate / parallel modules** — Three pairs of legacy + clean implementations coexist: `finance` ↔ `fin`, `resources` ↔ `resource`, `estimator` ↔ `estimate`, plus a heavyweight legacy `accounting`. Each pair carries duplicated models, serializers, and data, which inflates the migration surface, complicates seed data, and creates ambiguous source of truth for cross-module joins.

**Testing is sparse** — Only `photo_intel`, `analytics`, and `assistant` have explicit test files on the backend; the frontend has zero tests and no Vitest/Jest configuration. There is no CI configuration evident.

**No formal CI/CD** — No GitHub Actions, GitLab CI, or similar config files at the repo root. Deployment posture, secrets handling, and release process are undocumented.

**Frontend state pressure** — React Context is the only store. Finance, attendance, and estimator are heavy data domains; without TanStack Query (or similar) the offline queue, optimistic updates, and cache invalidation will keep regressing.

**No type safety on the frontend** — Pure JSX. With ~20 modules and a deep API surface, refactors and contract drift are increasingly risky.

**Stub modules with no migrations** — `data_transfer` (backend) and `dashboard` (frontend) are advertised in routing but not delivering value yet.

**AI/LLM provider sprawl** — Three providers each for assistant and photo_intel. Without a clear default, observability of usage and cost across providers is hard to track. No retry/quota/budget guardrails visible.

**Secrets, ops, and observability are unclear** — No `.env.example`, no logging/monitoring setup visible, no error tracking (Sentry/Rollbar), no API rate limiting, no audit log retention policy.

**Documentation drift** — `backend/README.md` exists but no top-level project README, contribution guide, API docs export, or onboarding doc for new collaborators.

---

## 4. Phased Roadmap

The roadmap is organized around four sequential phases. Each phase has an explicit exit criterion so the project can ship value continuously instead of waiting for a single big launch.

### Phase 1 — Stabilize (Weeks 1–3)

Goal: lock down what already works so the rest can be built on a trustworthy base.

The first priority is decision-making around the duplicate modules. Pick the canonical implementation for each pair (`fin` over `finance`, `resource` over `resources`, and one of `estimator`/`estimate`), write a one-page migration note for each, and freeze new feature work on the deprecated side. Add an explicit deprecation warning in the legacy modules' `apps.py` so future contributors see it on startup.

Second, repo-level hygiene: create `README.md` at the root with a quickstart, add `.env.example` files for backend and frontend, document the local-dev setup, and commit a basic GitHub Actions workflow that at minimum runs `python manage.py check`, runs the existing pytest suite, and runs ESLint + `vite build` on the frontend.

Third, observability baseline: integrate Sentry (or equivalent) on both backend and frontend, add structured logging in Django, and wire DRF Spectacular's schema export into the CI artifact so frontend and backend stay in sync. Configure DRF throttling on auth endpoints.

Exit criterion: a fresh clone runs end-to-end in under 15 minutes following the README, CI is green, errors flow to Sentry, and the team has signed off on which modules are canonical.

### Phase 2 — Consolidate (Weeks 4–8)

Goal: pay down the duplicate-module debt and complete the half-built domains.

Migrate any remaining live data from the legacy `finance`, `resources`, and (one of) `estimator`/`estimate` modules into their canonical counterparts using Django data migrations. Once the data is migrated and endpoints are no longer hit, delete the deprecated app's URLs, then schedule model removal for Phase 3 (a two-step delete is safer than a single sweep).

Finish the partial modules. On the backend, that means turning `data_transfer` from a stub into a real CSV/Excel import-export with model definitions, validation, and a dry-run preview. On the frontend, that means wiring `workforce` sub-routes (member list, team detail, payroll, evaluations) using the existing components, fleshing out the `dashboard` module with project-level KPIs that pull from the existing analytics service, and finishing the `worker` portal flows.

In parallel, introduce TanStack Query on the frontend incrementally, starting with the finance module — this resolves the cache invalidation issues the offline mutation queue currently masks. Add a small Vitest harness and write smoke tests for the auth flow and one representative module (finance dashboard).

Exit criterion: legacy module URLs return 410 Gone, all routes in the desktop and mobile route trees mount real pages, and the finance module ships with at least one query under TanStack Query.

### Phase 3 — Harden (Weeks 9–14)

Goal: production readiness — security, performance, and reliability.

Backend hardening: complete a security review focused on the IoT/MQTT surface, NFC kiosk auth, and the worker PIN-login flow. Add a permission audit across all viewsets — every endpoint should explicitly declare a permission class. Profile the heaviest queries (accounting reports, estimator BoQ generation, photo_intel digests) and add database indexes plus `select_related` / `prefetch_related` where missing. Move long-running operations (digest generation, BoQ generation, photo analysis) onto Celery if they're not already there, and wire `django-celery-beat` schedules for the existing `refresh_analytics`, digest, and rate-trend commands.

Frontend hardening: introduce TypeScript module-by-module (start with `services/` and shared types, then propagate). Add bundle-size budgets in Vite, code-split per route, and audit the mobile bundle since it ships alongside desktop. Adopt a form library (React Hook Form + zod, which is already a dependency) starting with the largest forms (BoQ wizard, permit wizard, journal entry).

AI/LLM hardening: collapse the three-provider matrix to a documented default plus an opt-in fallback per feature. Add per-feature budget caps, request logging, and a kill switch. For `photo_intel`, store the raw provider response alongside the parsed result so analyses are reproducible.

Exit criterion: a security report with no high-severity findings, p95 API latency under 400ms on the top 10 endpoints, full Celery coverage of background work, and TypeScript coverage above 30% of the frontend codebase.

### Phase 4 — Expand (Weeks 15+)

Goal: new capabilities that compound the platform's value once the core is trustworthy.

Candidate themes, in rough priority order based on the existing investment:

The first theme is a unified site-ops dashboard that brings together attendance (live), photo_intel (latest digest), permits (status), and finance (burn-rate) into a single project-level view — this leverages five solid modules without writing much new logic. The second theme is mobile field-app polish: offline-first for the worker portal, push notifications via FCM, and a richer kiosk UI for site managers. The third theme is the AI assistant: expand Sathi from conversation parser into an action layer that can create tasks, log expenses, and answer "what's my burn rate this week?" by composing existing services. The fourth theme is multi-tenant support if the product is ever shipped to multiple construction firms — this is a large change and should be scoped separately.

Exit criterion: each theme ships as its own milestone with its own go/no-go review.

---

## 5. Cross-Cutting Workstreams

These run in parallel to the phased work.

**Testing coverage** — Target backend pytest coverage of 60% by end of Phase 2 and 75% by end of Phase 3. Frontend: Vitest set up in Phase 2, component tests for shared UI primitives, and Playwright end-to-end smoke tests covering login, create-project, and one finance flow.

**Documentation** — Each completed phase produces a one-page summary in `docs/` covering what shipped, breaking changes, and migration notes. The DRF Spectacular schema is published as static HTML in CI.

**Dependency hygiene** — Monthly Renovate or Dependabot runs; quarterly major-version review.

**Data and seed strategy** — Consolidate the existing seed commands (`seed_all`, `seed_jitu_project`, `seed_radhika_project`, `seed_floor_plan_layout`, `seed_structure`, etc.) into one canonical demo-data command with a flag for which scenario to load. This makes onboarding and demos predictable.

---

## 6. Immediate Next Steps (this week)

1. Confirm canonical-module choices: agree that `fin`, `resource`, and one of `estimator`/`estimate` are canonical. Mark the others deprecated.
2. Add a top-level `README.md` with quickstart for both backend and frontend, and a `.env.example` for each.
3. Create a `.github/workflows/ci.yml` that runs `python manage.py check`, `pytest`, ESLint, and `vite build` on every push.
4. Open issues for each Phase 1 item so progress is visible.
5. Schedule a 30-minute review of this plan to adjust priorities and timeline.

---

## 7. Open Questions

These need answers before the roadmap can be committed to a timeline:

The audience and deployment target — is this for a single construction firm, multiple firms, or eventually a SaaS product? The answer changes whether multi-tenancy moves into Phase 3.

The team size and cadence — solo, 2–3 people, or larger? Phase durations above assume a small team of 1–2 actively building.

The hosting target — self-hosted on a VPS, a managed PaaS (Render, Railway, Fly.io), or a cloud provider (AWS/GCP)? Phase 1's CI/CD work depends on this.

The estimator decision — `estimator` already has BoQ generation and market rates wired in; `estimate` is newer but lighter. Which one is the keeper?

The legacy `accounting` app — it's marked deprecated but heavy and feature-rich. Is the plan to migrate its functionality into `fin`, or to keep it as a reporting-only layer?
