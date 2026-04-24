# Finance Module | वित्त मोड्युल

A self-contained Finance module for the Construction Management System.  
Handles banking, loans, transfers, ledger (chart of accounts), bills, and budgets — all isolated from the legacy `accounting` app.

निर्माण व्यवस्थापन प्रणालीको लागि एक स्वतन्त्र वित्त मोड्युल।  
ब्याङ्किङ, ऋण, ट्रान्सफर, लेजर, बिल र बजेट सबै पुरानो `accounting` एपबाट अलग राखिएको छ।

---

## Folder Structure | फोल्डर संरचना

```
src/modules/finance/
├── index.jsx                        # सार्वजनिक प्रवेश बिन्दु — यहाँबाट FinanceRoutes import गर्नुहोस्
│
├── services/
│   └── financeApi.js                # /api/v1/fin/ को लागि Axios client (JWT + refresh सहित)
│
├── context/
│   └── FinanceContext.jsx           # ग्लोबल state: accounts, banks, loans, dashboard, refresh()
│
├── routes/
│   └── FinanceRoutes.jsx            # FinanceProvider + FinanceLayout भित्र 7 वटा nested routes
│
├── components/
│   ├── shared/                      # साझा कम्पोनेन्टहरू
│   │   ├── AmountDisplay.jsx        # NPR मुद्रा फर्म्याटर (रङ सहित देखाउने सुविधा)
│   │   ├── EmptyState.jsx           # खाली अवस्था देखाउने placeholder
│   │   ├── Modal.jsx                # Escape key र backdrop click बाट बन्द हुने modal
│   │   └── PageHeader.jsx           # पृष्ठ शीर्षक + उपशीर्षक + action बटन
│   │
│   ├── layout/                      # लेआउट कम्पोनेन्टहरू
│   │   ├── FinanceLayout.jsx        # Sidebar + मुख्य सामग्री + error बैनर
│   │   └── FinanceSidebar.jsx       # ७ लिङ्क सहितको बायाँ nav र कुल नगद pill
│   │
│   ├── banking/                     # ब्याङ्किङ सम्बन्धी
│   │   ├── BankCard.jsx             # ब्याङ्क/नगद खाता कार्ड (ब्यालेन्स + जम्मा बटन)
│   │   ├── BankForm.jsx             # ब्याङ्क वा नगद खाता बनाउने/सम्पादन गर्ने फारम
│   │   └── DepositModal.jsx         # खातामा रकम जम्मा गर्ने modal
│   │
│   ├── loans/                       # ऋण सम्बन्धी
│   │   ├── LoanCard.jsx             # ऋण खाता कार्ड (बाँकी रकम + किस्ता जानकारी)
│   │   ├── LoanForm.jsx             # ऋण खाता बनाउने/सम्पादन गर्ने फारम (वितरण सहित)
│   │   ├── EMIModal.jsx             # एक किस्ता तिर्ने modal (साँवा + ब्याज विभाजन)
│   │   └── AmortizationTable.jsx    # सम्पूर्ण किस्ता तालिका (JS मा गणना, API छैन)
│   │
│   ├── transfers/                   # स्थानान्तरण सम्बन्धी
│   │   ├── TransferForm.jsx         # दुई खाताबिच रकम सार्ने फारम
│   │   └── TransferList.jsx         # सबै ट्रान्सफरको पढ्न मात्र मिल्ने तालिका
│   │
│   ├── ledger/                      # लेजर सम्बन्धी
│   │   ├── AccountList.jsx          # खाता तालिका (प्रकार badge + ब्यालेन्स सहित)
│   │   └── AccountForm.jsx          # जुनसुकै प्रकारको खाता बनाउने/सम्पादन गर्ने फारम
│   │
│   ├── bills/                       # बिल सम्बन्धी
│   │   ├── BillList.jsx             # विक्रेता बिल तालिका (स्थिति, म्याद नाघेको हाइलाइट)
│   │   ├── BillForm.jsx             # बहु-लाइन आइटम सहित बिल बनाउने/सम्पादन गर्ने फारम
│   │   └── PaymentModal.jsx         # बिलमा आंशिक वा पूर्ण भुक्तानी दर्ता गर्ने modal
│   │
│   └── budget/                      # बजेट सम्बन्धी
│       └── BudgetList.jsx           # बजेट श्रेणी (विनियोजित / खर्च / बाँकी bar सहित)
│
└── pages/                           # पृष्ठहरू
    ├── FinanceDashboard.jsx         # KPI सारांश: नगद, ऋण, बिल, हालैका ट्रान्सफर
    ├── BankingPage.jsx              # ब्याङ्क खाता + जम्मा व्यवस्थापन
    ├── LoansPage.jsx                # ऋण + किस्ता भुक्तानी + किस्ता तालिका
    ├── TransfersPage.jsx            # नगद ट्रान्सफर बनाउने र हेर्ने
    ├── LedgerPage.jsx               # खाताको तालिका + जर्नल प्रविष्टि हेर्ने
    ├── BillsPage.jsx                # विक्रेता बिल + भुक्तानी दर्ता
    └── BudgetPage.jsx               # बजेट श्रेणी + विनियोजन ट्र्याकिङ
```

---

## How to Use | कसरी प्रयोग गर्ने

### Mount in your router | राउटरमा जोड्ने

The module is already wired into `DesktopRoutes.jsx`:  
यो मोड्युल `DesktopRoutes.jsx` मा पहिले नै जोडिएको छ:

```jsx
import FinanceRoutes from '../../modules/finance';
import { useConstruction } from '../../context/ConstructionContext';

// Inside <Routes>:
<Route path="finance/*" element={<FinanceRoutes projectId={activeProjectId} />} />
```

Navigate to `/dashboard/desktop/finance` to open the module.  
मोड्युल खोल्न `/dashboard/desktop/finance` मा जानुहोस्।

### Use the context in any child component | जुनसुकै child कम्पोनेन्टमा context प्रयोग गर्ने

```jsx
import { useFinance } from '../context/FinanceContext';

function MyComponent() {
  const { banks, loans, accounts, dashboard, projectId, refresh, loading } = useFinance();
  // ...
}
```

`useFinance()` ले निम्न डेटा दिन्छ:
- `banks` — `is_bank: true` भएका सबै खाताहरू
- `loans` — `is_loan: true` भएका सबै खाताहरू
- `accounts` — सबै खाताहरूको सूची
- `dashboard` — KPI सारांश (नगद जम्मा, ऋण बाँकी, बिल स्थिति)
- `refresh()` — सबै डेटा पुनः लोड गर्ने function
- `loading` — डेटा लोड हुँदै छ कि छैन

### Call the API directly | API सीधै कल गर्ने

```jsx
import financeApi from '../services/financeApi';

// सबै कलहरूले Axios promise फर्काउँछन्
const res = await financeApi.getBills(projectId);
await financeApi.payBill(billId, { bank_account, amount, description });
```

---

## Backend | ब्याकएन्ड

Backed by the separate Django app `apps.fin` — completely isolated from the legacy `apps.accounting` app.  
छुट्टै Django app `apps.fin` द्वारा संचालित — पुरानो `apps.accounting` एपबाट पूर्ण रूपमा अलग।

| Frontend route | Backend endpoint | विवरण |
|---|---|---|
| `/finance/` | `GET /api/v1/fin/dashboard/` | KPI सारांश |
| `/finance/banking` | `GET/POST /api/v1/fin/accounts/` | ब्याङ्क खाता |
| `/finance/loans` | `GET/POST /api/v1/fin/accounts/` | ऋण खाता |
| `/finance/transfers` | `GET/POST /api/v1/fin/transfers/` | नगद ट्रान्सफर |
| `/finance/ledger` | `GET /api/v1/fin/accounts/` + `GET /api/v1/fin/journal-entries/` | लेजर र जर्नल |
| `/finance/bills` | `GET/POST /api/v1/fin/bills/` | बिल र भुक्तानी |
| `/finance/budget` | `GET/POST /api/v1/fin/budget-categories/` + `/budget-allocations/` | बजेट |

**महत्वपूर्ण:** मोड्युल प्रयोग गर्नु अघि आफ्नो मेसिनमा `python manage.py migrate` चलाउनुहोस् ताकि `apps.fin` को migration लागू होस्।

---

## Key Design Decisions | मुख्य डिजाइन निर्णयहरू

- **स्वतन्त्र (Self-contained)** — `activeProjectId` को लागि `ConstructionContext` बाहेक बाँकी एपबाट कुनै import छैन। यो मोड्युल आफैंमा पूर्ण छ।

- **दोहोरो-प्रविष्टि लेखाङ्कन (Double-entry accounting)** — हरेक वित्तीय कार्य (जम्मा, ट्रान्सफर, किस्ता, बिल भुक्तानी) ले ब्याकएन्डमा `LedgerService` मार्फत सन्तुलित जर्नल प्रविष्टि पोस्ट गर्छ।

- **गणना गरिएको ब्यालेन्स (Computed balances)** — खाताको ब्यालेन्स डाटाबेसमा भण्डारण गरिँदैन। यो query गर्दा जर्नल लाइनहरूबाट गणना गरिन्छ।

- **अपरिवर्तनीय जर्नल (Immutable journal)** — जर्नल प्रविष्टि र ट्रान्सफर रेकर्डहरू एकपटक पोस्ट गरेपछि सम्पादन वा मेट्न मिल्दैन (लेखापरीक्षण trail को लागि)।

- **स्वचालित किस्ता गणना (EMI auto-calculation)** — `LoanForm` मा साँवा, ब्याजदर र अवधि टाइप गर्दा EMI स्वचालित रूपमा गणना हुन्छ: `EMI = (P × r × (1+r)^n) / ((1+r)^n - 1)`

---

## fin vs finance vs accounting | तीनको भिन्नता

तिनवटै प्रणाली हाल सक्रिय रूपमा प्रयोगमा छन् — तिनीहरू एकअर्काको ठाउँमा होइनन्, बरु फरक–फरक काम गर्छन्।

| नाम | के हो | कहाँ छ | प्रयोग |
|---|---|---|---|
| `accounting` | पुरानो प्रणाली (बग सच्याइएको, सक्रिय) | `apps/accounting` + `TreasuryTab.jsx` | `/dashboard/desktop/manage` → Finance → Treasury |
| `fin` | नयाँ ब्याकएन्ड (स्वच्छ, सक्रिय) | `apps/fin/` | `/api/v1/fin/` सबै endpoint |
| `finance` | नयाँ फ्रन्टएन्ड (स्वच्छ, सक्रिय) | `src/modules/finance/` | `/dashboard/desktop/finance` |

### तीनको सम्बन्ध कस्तो छ?

```
/manage → TreasuryTab.jsx  ──►  apps/accounting  (पुरानो — api/v1/accounting/)
                                      ↕
                               दुवै स्वतन्त्र
                                      ↕
/finance → modules/finance  ──►  apps/fin         (नयाँ — api/v1/fin/)
```

- **`accounting` + `TreasuryTab`** — पहिलेदेखि नै थियो। GL Accounts, Treasury, Payables, Budget, Cash Flow ट्याब सहित। `/manage` पृष्ठमा उपलब्ध।
- **`fin` + `finance`** — यस session मा नयाँ बनाइयो। Banking, Loans, Transfers, Ledger, Bills, Budget पृष्ठ सहित। `/finance` पृष्ठमा उपलब्ध।
- **दुवै एकैसाथ चल्छन्** — एउटाले अर्कोको डेटाबेस तालिका, API endpoint, वा React component छुँदैन।
- **छुट्टै डेटाबेस तालिका** — `accounting_*` तालिका र `fin_*` तालिका पूर्ण रूपमा अलग छन्।
