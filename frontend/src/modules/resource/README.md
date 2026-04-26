# Resource Module — स्रोत मोड्युल

## English

### Overview
The Resource module manages all physical resources for a construction project: materials, equipment, labor, suppliers, and purchase orders.

### Structure
```
src/modules/resource/
├── index.jsx                        # Public entry point
├── README.md                        # This file
├── services/
│   └── resourceApi.js               # Axios API client (JWT-aware)
├── context/
│   └── ResourceContext.jsx          # Global state + useResource() hook
├── routes/
│   └── ResourceRoutes.jsx           # All routes wrapped in Provider + Layout
├── components/
│   ├── layout/
│   │   ├── ResourceTopNav.jsx       # Horizontal tab navigation
│   │   └── ResourceLayout.jsx      # Top nav + main content wrapper
│   ├── shared/
│   │   ├── Modal.jsx                # Generic modal
│   │   ├── PageHeader.jsx           # Page title + subtitle + actions
│   │   ├── EmptyState.jsx           # Empty state placeholder
│   │   ├── AmountDisplay.jsx        # NPR currency display
│   │   └── StatusBadge.jsx          # Colored pills for status/category
│   ├── materials/
│   │   ├── MaterialCard.jsx         # Material card with stock actions
│   │   ├── MaterialForm.jsx         # Create/edit material form
│   │   └── StockModal.jsx           # Stock in/out modal
│   ├── equipment/
│   │   ├── EquipmentCard.jsx        # Equipment card with status
│   │   └── EquipmentForm.jsx        # Create/edit equipment form
│   ├── labor/
│   │   ├── WorkerList.jsx           # Workers table
│   │   ├── WorkerForm.jsx           # Create/edit worker form
│   │   └── AttendanceModal.jsx      # Mark daily attendance
│   ├── suppliers/
│   │   ├── SupplierList.jsx         # Suppliers table
│   │   └── SupplierForm.jsx         # Create/edit supplier form
│   └── purchases/
│       ├── PurchaseList.jsx         # Purchase orders table
│       └── PurchaseForm.jsx         # Create/edit purchase order + line items
└── pages/
    ├── ResourceDashboard.jsx        # KPI overview + low stock + movements
    ├── MaterialsPage.jsx            # Materials grid + stock modals
    ├── EquipmentPage.jsx            # Equipment grid with status filter
    ├── LaborPage.jsx                # Workers table + attendance
    ├── SuppliersPage.jsx            # Suppliers table
    ├── PurchasesPage.jsx            # Purchase orders table + receive
    └── HelpPage.jsx                 # Nepali help documentation
```

### API Base
All API calls go to `/api/v1/resource/` with JWT Bearer token.

### How to mount
```jsx
// In DesktopRoutes.jsx
import ResourceRoutes from '@/modules/resource';

<Route path="resource/*" element={<ResourceRoutes projectId={projectId} />} />
```

### Routes (absolute paths)
| URL | Page |
|-----|------|
| `/dashboard/desktop/resource` | Dashboard |
| `/dashboard/desktop/resource/materials` | Materials |
| `/dashboard/desktop/resource/equipment` | Equipment |
| `/dashboard/desktop/resource/labor` | Labor |
| `/dashboard/desktop/resource/suppliers` | Suppliers |
| `/dashboard/desktop/resource/purchases` | Purchases |
| `/dashboard/desktop/resource/help` | Help |

---

## नेपाली — स्रोत मोड्युल

### परिचय
स्रोत मोड्युलले निर्माण परियोजनाका सबै भौतिक स्रोतहरू व्यवस्थापन गर्छ: सामग्री, उपकरण, श्रमिक, आपूर्तिकर्ता र खरिद आदेश।

### मुख्य विशेषताहरू
- **सामग्री**: सिमेन्ट, रड, बालुवा आदिको स्टक ट्र्याकिङ। Low Stock चेतावनी।
- **उपकरण**: JCB, Crane आदिको अवस्था व्यवस्थापन (Available/In Use/Maintenance)।
- **श्रमिक**: कामदार सूची र दैनिक उपस्थिति चिह्न।
- **आपूर्तिकर्ता**: विक्रेताको सम्पर्क र विशेषता।
- **खरिद आदेश**: सामग्री खरिद आदेश बनाउने र प्राप्त गर्दा स्टक अद्यावधिक।

### कोड शैली
- Tailwind CSS — काला/सेतो/खैरो रङ योजना (Finance मोड्युलसँग मिल्दो)
- React functional components + hooks
- Same modal pattern as Finance module
