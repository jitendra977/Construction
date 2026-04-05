# 🏗️ House Construction Management System (HCMS) - Project Overview

## 📋 Project Definition
The **House Construction Management System (HCMS)** is a comprehensive full-stack ecosystem designed to manage the entire lifecycle of residential construction projects. From the initial legal permit acquisition and budgeting to on-site task tracking and material inventory management, HCMS provides a centralized "Source of Truth" for homeowners, engineers, and contractors.

### 🌟 Vision
To simplify the complex, fragmented process of building a home by providing real-time visibility into finances, progress, and resource utilization through a modern, mobile-responsive interface tailored for the Nepali construction context.

---

## 📂 Project Structure

### 🏗️ Root Directory
- `/backend`: Django REST Framework API.
- `/frontend`: React.js (Vite) application with dual UI (Desktop/Mobile).
- `/mobile-app`: (Reserved/Future) Flutter or React Native integration.
- `/docs`: Detailed setup and deployment guides.
- `/scripts`: Automation for deployment and cloud sync.

### 🐍 Backend (Django Apps)
The backend is modularized into specialized apps:
- **`accounts`**: User profiles, roles (Buyer, Contractor, Admin), and JWT-based authentication.
- **`finance`**: 
    - `BudgetCategory`: High-level allocation (Materials, Labor, Permits).
    - `Expense`: Individual cost tracking linked to supplies or tasks.
    - `FundingSource`: Tracking capital from personal savings or bank loans (`LOAN`, `OWN_MONEY`).
    - `Payment`: Installment-based tracking with proof-of-payment photography.
- **`resources`**:
    - `Supplier`: Vendor management (Hardware, Brick kilns).
    - `Contractor`: Labor roles (Mistri, Helper, Engineer) with bank/citizenship details.
    - `Material`: Inventory tracking for standard Nepali units (`BORA`, `TIPPER`, `PCS`).
    - `Document`: Digital storage for site photos, bills, and blueprints.
- **`permits`**: 
    - `PermitStep`: Sequential legal progress tracking (Darta, Asthayi, Sthayi).
    - `LegalDocument`: Repository for Lalpurja, Nagrikta, and Naksha.
- **`tasks`**: 
    - `Task`: Detailed work units with priority (`CRITICAL` to `LOW`) and status tracking.
    - `TaskMedia`: Visual proof of work (photos/videos).
- **`core`**: Base models for `ConstructionPhase` and `Room`.

### ⚛️ Frontend (React)
Designed with a **"Dual-Experience"** approach:
- `/src/components/desktop`: High-density management dashboards for tablet/PC.
- `/src/components/mobile`: Streamlined, high-contrast UI for on-site usage.
- `/src/hooks`: Custom hooks for centralized data fetching (`useDashboardData.js`).
- `/src/services`: API abstraction layer using Axios.

---

## 🛠️ Development & Design Principles

### 1. API-First Architecture
The backend and frontend are strictly decoupled. All interactions happen through a documented REST API, ensuring future-proofing for mobile apps or IoT integrations.

### 2. Dual-Experience UI
Recognizing that construction sites are different from offices, the system provides:
- **Desktop**: Deep-dive analytics, budget planning, and detailed reporting.
- **Mobile**: Quick updates, photo uploads, and "thumb-friendly" material usage tracking.

### 3. Localization-Aware (Nepali Context)
Built specifically for the Nepali market, including:
- Support for units like `TIPPER`, `TRACTOR`, and `BORA`.
- Tracking of `Lalpurja` and `Nagrikta` for legal permits.
- Integration of `Rs. (NPR)` for all financial transactions.

### 4. Security-First
- **JWT Authentication**: Secure state management.
- **Protected Routes**: Role-based access control (RBAC) ensuring only authorized users manage sensitive financial data.

### 5. Standardized Aesthetics
A premium design language using:
- **Glassmorphism**: Modern, translucent UI elements.
- **Vibrant & Accessible Palettes**: High-contrast states for status tracking.
- **Smooth Micro-animations**: Enhancing user engagement during data submission.

### 6. Container-Native
Fully dockerized for consistency across local development, staging, and production environments.

---

## 🌐 API Reference & Specifications

The backend exposes a highly structured REST API mapped to standard HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). The base URL for all primary endpoints is `/api/v1/`.

### 🔐 Authentication & Access Control (`/api/v1/auth/`)
- `POST /auth/login/`: Retrieve JWT access/refresh tokens.
- `POST /auth/register/`: Create a new user (with role allocation).
- `POST /auth/refresh/`: Obtain a new access token using a refresh token.
- `GET /users/`, `/roles/`: User and Role-based access control management.

### 📊 Dashboard & Aggregation (`/api/v1/dashboard/`)
- `GET /dashboard/combined/`: A centralized aggregator endpoint that fetches high-level metrics (total budget, expenses, active tasks) in a single optimized query to populate desktop/mobile home screens.

### 🏗️ Project & Structure Management (`/api/v1/`)
Handles the physical architecture and chronological planning of the building.
- `/projects/`: Global project configurations and metadata.
- `/phases/`: Major construction milestones (e.g., Foundation, Plastering).
- `/floors/` & `/rooms/`: Spatial subdivision for localized task management.

### 📝 Task & Progress Tracking (`/api/v1/`)
- `/tasks/`: Granular work units containing status (`PENDING`, `IN_PROGRESS`, `COMPLETED`).
- `/updates/`: Audit trails and daily progress modifications.
- `/task-media/`: Visual proofs (photos/videos) mandatory for finalizing tasks.

### 💸 Financial & Budget Control (`/api/v1/`)
Double-entry-style ledger tracking incoming capital and outgoing expenses.
- `/funding-sources/` & `/funding-transactions/`: Where the capital originates (Bank Loans, Personal Savings) and capital injections.
- `/budget-categories/` & `/phase-budget-allocations/`: Allocation limits to prevent cost overruns.
- `/expenses/` & `/payments/`: Linking material/labor costs with actual cash outlays and photographic receipt captures.

### 📦 Resource Management (`/api/v1/`)
- `/materials/` & `/material-transactions/`: Tracks real-time stock levels of cement, rebar, sand, etc., logging inward deliveries and outward consumption.
- `/suppliers/` & `/contractors/`: Contact, payment, and engagement history for vendors and labor crews.

### ⚖️ Permits & Legal (`/api/v1/permits/`)
- `/permits/`: Dedicated namespace to track the bureaucratic journey (e.g., Municipality Approvals, Structural Drawing Pass).

### 📐 Estimator (`/api/v1/estimator/`)
- `/estimator/`: Custom calculation endpoints to estimate material requirements (e.g., calculating required bricks based on wall dimensions).

### ⚙️ Utilities & Imports
- `/documents/` & `/gallery/`: Cloud-oriented asset management.
- `/import/sql/` & `/import/populate-raw-data/`: Endpoints used for quick-bootstrapping isolated instances with realistic test data.

---

## 💻 Frontend API Services (React Client)

The React frontend handles data fetching and backend communication through a centralized `Axios` instance layer (`/src/services/api.js` & `auth.js`). This prevents hardcoding endpoint URLs in components and centralizes error handling.

### 🔌 Interceptors & Token Management
All frontend requests pass through interceptors which:
- Automatically attach the `Authorization: Bearer <access_token>` to every request.
- Catch `401 Unauthorized` errors.
- Automatically attempt to use the `refresh_token` to get a new access token without interrupting the user's flow.
- Redirects to `/login` if both tokens are fully expired.

### 📦 Service Modules
Endpoints are abstracted into specialized JavaScript objects mapping exactly to the backend URLs, providing clear, maintainable SDK-like access:
- **`authService`**: `login`, `logout`, `register`, `getProfile` management.
- **`dashboardService`**: Mega-service controlling projects, rooms, tasks, budgeting, payments, materials, and fetching the `/dashboard/combined/` data.
- **`constructionService`**: Specific abstractions for Phases, Tasks, and media uploads.
- **`calculatorService`**: Connecting to the backend estimators to pre-calculate quantities for concrete, walls, plaster, etc.
- **`permitService`**: Tracking legal phases and attaching/detaching approval documents.
- **`accountsService`**: Admin-level calls for user, role, and activity log manipulation.

---

## 🚀 Core Module Detail

### 💰 Finance & Cashflow
Tracks not just *what* you spent, but *where the money came from*. Integrated budget protection ensures you are alerted if a category (e.g., Cement) exceeds its allocated funding.

### 📦 Material Inventory (Stock)
Automatically updates stock levels when "Materials" are used in "Tasks". Provides a "Wastage" tracking mechanism to identify resource leaks early.

### 📄 Permit Tracker
A visual roadmap of the legal journey. Tracks every step of the "Naksha Pass" process, ensuring critical documents like the "Tiro Rasid" are always at your fingertips.

### 👷 Task & Phase Synergy
Work is divided into `Phases` (e.g., Foundation, Ground Floor Slab). Tasks within these phases are assigned to specific `Contractors`, with built-in validation that prevents phase completion until all mandatory task proofs are uploaded.

---
*Last Updated: April 2026*
