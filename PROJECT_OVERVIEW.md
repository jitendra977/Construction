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
