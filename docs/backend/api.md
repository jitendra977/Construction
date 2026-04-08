# Full API Endpoint List

Below is a comprehensive list of all exposed REST endpoints in the HCMS backend, categorized by their corresponding Django application module:

### Authentication & Profiles (`/api/v1/auth/*`)
*   `POST /login/`: Obtain JWT access and refresh tokens.
*   `POST /logout/`: Invalidate the current session or tokens.
*   `POST /register/`: Register a new user (Owner/Contractor/System Admin).
*   `GET /profile/`: Fetch the currently authenticated user's profile.
*   `POST /token/refresh/`: Obtain a new access token using a refresh token.

### Dashboard Data (`/api/v1/dashboard/*`)
*   `GET /combined/`: Primary aggregated endpoint fetching stats, phases, tasks, expenses, and materials globally for the main dashboard views.

### Core Architecture (`/api/v1/*`)
*   `/projects/`: CRUD for the master House Project configuration.
*   `/phases/`: CRUD for physical Construction Phases (e.g. DPC, Ground Floor Slab).
*   `POST /phases/reorder/`: Update the chronological order of execution for phases.
*   `/floors/`: CRUD for defining building levels.
*   `/rooms/`: CRUD for individual spaces within floors.

### Finance & Budgeting (`/api/v1/*`)
*   `/budget-categories/`: CRUD for overarching budget allocations (e.g., structure, finishing).
*   `/expenses/`: Logging individual line-item expenses mapped to phases or materials.
*   `/payments/`: Creating payment histories and uploading transactional receipts.
*   `POST /payments/{id}/email-receipt/`: Emit an email containing the proof of payment to a given contact.
*   `/funding-sources/`: Tracking bank loans, family borrowing, and personal funds.
*   `/funding-transactions/`: Direct top-ups (Credit) or deductions (Debit) from funding entities.
*   `/phase-budget-allocations/`: Matrix tool for locking a portion of a category's budget to a specific phase.

### Inventory & Resources (`/api/v1/*`)
*   `/materials/`: Managing the catalog of building items (Cement, Sand, Rebar).
*   `POST /materials/{id}/recalculate_stock/`: Synchronization tool for balancing ledger entries vs stock.
*   `POST /materials/recalculate_all/`: System-wide batch stock synchronization.
*   `POST /materials/{id}/email_supplier/`: Send automated purchase order requests to vendors via email.
*   `/material-transactions/`: Logging inward gate deliveries, returns, and outward site usage.
*   `POST /material-transactions/{id}/receive_order/`: Convert a `PENDING` supplier order to `COMPLETED` when goods hit the site.
*   `/wastage-alerts/`: Intelligent endpoints tracking materials consumed significantly beyond technical estimates.
*   `/suppliers/`: Catalog of aggregate providers and hardware stores.
*   `/contractors/`: Managing labor and engineering crews.

### Tasks & Work (`/api/v1/*`)
*   `/tasks/`: Managing day-to-day granular work units assigned to contractors.
*   `/updates/`: Quick status updates and audit points for tasks.
*   `/task-media/`: Handling uploading array data of photos/videos of work completion.

### Legal Permits (`/api/v1/permits/*`)
*   `/steps/`: Bureaucratic milestones of the "Naksha Pass" journey.
*   `POST /steps/{id}/attach_document/`: Fast-link a legal file to a permit milestone.

### Estimator Tools (`/api/v1/estimator/*`)
*   `/rates/`: System-wide base pricing for volumetric unit calculations.
*   `POST /wall/`: Evaluate mortar/brick numbers for a cubic partition.
*   `POST /concrete/`: Compute gravel/sand/cement permutations for structural beams.
*   `POST /plaster/`: Plaster coating resource evaluation.
*   `POST /flooring/`: Surface area material count for tiles/marble.
*   `POST /budget/`: Macro-level predictive financial sizing based on square footage.

### Utilities, Guides & File Management (`/api/v1/*`)
*   `/gallery/`: A flattened, filterable view of all media elements across tasks, expenses, and phases.
*   `/documents/`: Repository for storing technical and legal non-image files (PDF blueprints, CSV reports).
*   `/user-guides/`, `/user-guide-steps/`, `/user-guide-faqs/`: Content APIs serving the interactive help modal drawer.
*   `/activity-logs/`: Centralized audit trail tracing 'who changed what'.
*   `/email-logs/`: Traceability matrix for verifying automated mail delivery.

### Setup & Migrations (`/api/v1/import/*`)
*   `POST /sql/`: Utility execution trigger for `.sql` logic dumps.
*   `POST /populate-raw-data/`: Development tool injecting Nepali context preset data (Roles, Dummy Vendors, Typical Project settings).
