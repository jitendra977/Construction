# Frontend State & Communication

This document details the React component communication, global state management, and the Dual-Experience architecture.

## Connectivity & Relation Map

| Layer | Primary File(s) | Role & Connection | Relationship |
| :--- | :--- | :--- | :--- |
| **Entry** | `main.jsx` | Mounts the root component into `index.html`. | Parent of `App.jsx`. |
| **Orchestrator**| `App.jsx` | Configures global providers and the `ResponsiveRedirector`. | Wraps all Contexts and Routes. |
| **State Hub** | `ConstructionContext.jsx` | Centralizes data from all API services into a single state. | Exposes data via `useConstruction` hook. |
| **Communication**| `api.js` / `auth.js` | Defines Axios instances and endpoint-specific logic. | Bridge between Context and Backend API. |
| **Routing** | `routes/` (Desktop/Mobile) | Maps URLs to specific Page/Component views. | Decides which Page to render in the `Outlet`. |
| **UI Module** | `PhasesTab.jsx` (etc.) | Specialized view for a construction domain. | Consumes Context; Triggers API actions. |
| **Utility** | `utils/`, `constants/` | Shared helper logic and fixed configuration. | Imported by Services and UI components. |

## Architectural Flow & Relationships

The HCMS frontend is designed with a centralized state architecture that orchestrates data flow between the backend and the dual-experience UI layers.

### 1. Core Orchestration (`App.jsx` & `Context`)
- **`App.jsx`**: Acts as the application's skeletal framework. It wraps the entire app in `ThemeProvider` and `ConstructionProvider`, ensuring that every component has access to global settings and construction data.
- **`ConstructionContext.jsx`**: The "brain" of the frontend. It consumes multiple services (`financeService`, `dashboardService`, `constructionService`, `permitService`) to fetch data from the API and holds it in a unified state (`dashboardData`). It manages:
  - User authentication and profile synchronization.
  - **Financial Intelligence**: Aggregates the `finance_summary` from the General Ledger. `budgetStats` now prioritizes live Asset and Liability balances over legacy list-based calculations.
  - Global construction metrics (Overall Progress, Total Spent, Days Elapsed).
  - Business logic computations (e.g., Currency formatting, Budget health calculations).

### 2. Data Flow Lifecycle
1.  **Request Layer**: Components or the Context call methods in the `services/` directory (e.g., `constructionService.getPhases()`).
2.  **API Layer**: `services/api.js` (and `auth.js`) uses Axios to communicate with the Django backend.
3.  **State Layer**: Upon receiving data, `ConstructionContext` updates the `dashboardData` state.
4.  **UI Layer**: High-level pages and sub-components consume this state via the `useConstruction` custom hook, triggering a re-render with the latest construction milestones.

### 3. Dual-Experience Synchronization
The application uses a **Responsive Routing** strategy to ensure a seamless experience across devices:
- **`ResponsiveRedirector`**: Inside `App.jsx`, this component monitors the browser window width. If a user resizes their window from desktop to mobile (or vice versa), it automatically synchronizes the path (e.g., switching from `/dashboard/desktop/manage` to `/dashboard/mobile/manage`).
- **Parallel Routing**: The `routes/` directory contains separate route maps for `desktop` and `mobile`, allowing each environment to have its own unique layout while sharing the same underlying data.

### 4. Component Communication Pattern
- **Page Components** (`src/pages/`): Act as data owners. They typically pull data from the context and pass it down as props to child components.
- **Specialized Tab Components** (`src/components/desktop/manage/`): These are focused modules that handle specific construction domains (Materials, Labor, Finances). They use the actions provided by `useConstruction` (like `updateTaskStatus` or `createExpense`) to trigger updates that flow back up to the context and sync with the backend.
- **Universal Payment Modal** (`src/components/finance/`): A critical shared component that encapsulates the entire payment submission state. It handles receipt confirmation logic and ensures that financial transactions are atomic (creating both the expense and payment in a single flow if required).

### 5. Optimistic UI Updates
To ensure the interface feels snappy (especially on mobile on-site), the context handles many updates **optimistically**. When a user changes a task status, the UI updates immediately before the API call finishes. If the call fails, the state is automatically rolled back to ensure data integrity.
