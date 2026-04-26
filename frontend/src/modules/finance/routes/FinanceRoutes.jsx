/**
 * FinanceRoutes — all routes for the Finance module.
 *
 * Mount point (add to DesktopRoutes.jsx):
 *   <Route path="finance/*" element={<FinanceRoutes projectId={projectId} />} />
 *
 * Pages
 * ─────
 *   /finance/                → FinanceDashboard  (overview + KPIs)
 *   /finance/banking         → BankingPage       (bank accounts + deposits)
 *   /finance/loans           → LoansPage         (loan accounts + EMI)
 *   /finance/transfers       → TransfersPage     (cash transfers)
 *   /finance/ledger          → LedgerPage        (GL accounts + journal)
 *   /finance/bills           → BillsPage         (vendor bills + payments)
 *   /finance/budget          → BudgetPage        (budget categories + allocations)
 *   /finance/help            → HelpPage          (Nepali help — how/why/when/who)
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { FinanceProvider } from '../context/FinanceContext';
import FinanceLayout      from '../components/layout/FinanceLayout';

import FinanceDashboard   from '../pages/FinanceDashboard';
import BankingPage        from '../pages/BankingPage';
import LoansPage          from '../pages/LoansPage';
import TransfersPage      from '../pages/TransfersPage';
import LedgerPage         from '../pages/LedgerPage';
import BillsPage          from '../pages/BillsPage';
import BudgetPage         from '../pages/BudgetPage';
import HelpPage           from '../pages/HelpPage';

export default function FinanceRoutes({ projectId }) {
  return (
    <FinanceProvider projectId={projectId}>
      <FinanceLayout>
        <Routes>
          <Route index                element={<FinanceDashboard />} />
          <Route path="banking"       element={<BankingPage />} />
          <Route path="loans"         element={<LoansPage />} />
          <Route path="transfers"     element={<TransfersPage />} />
          <Route path="ledger"        element={<LedgerPage />} />
          <Route path="bills"         element={<BillsPage />} />
          <Route path="budget"        element={<BudgetPage />} />
          <Route path="help"          element={<HelpPage />} />
          <Route path="*"             element={<Navigate to="/dashboard/desktop/finance" replace />} />
        </Routes>
      </FinanceLayout>
    </FinanceProvider>
  );
}
