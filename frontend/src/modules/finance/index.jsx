/**
 * Finance Module — public entry point.
 *
 * Usage in DesktopRoutes.jsx:
 *   import FinanceRoutes from '@/modules/finance';
 *   ...
 *   <Route path="finance/*" element={<FinanceRoutes projectId={projectId} />} />
 */
export { default } from './routes/FinanceRoutes';
export { FinanceProvider, useFinance } from './context/FinanceContext';
export { default as financeApi } from './services/financeApi';
