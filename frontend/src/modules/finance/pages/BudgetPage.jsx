/**
 * BudgetPage — budget categories, allocations and spend tracking.
 */
import { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import PageHeader from '../components/shared/PageHeader';
import BudgetList from '../components/budget/BudgetList';
import Modal from '../components/shared/Modal';
import financeApi from '../services/financeApi';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 bg-white';
const lbl = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

function CategoryForm({ category = null, projectId, onDone }) {
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (category) {
        await financeApi.updateBudgetCategory(category.id, { ...form, project: projectId });
      } else {
        await financeApi.createBudgetCategory({ ...form, project: projectId });
      }
      onDone();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {err && <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{err}</p>}
      <div>
        <label className={lbl}>Category Name *</label>
        <input className={inp} required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Civil Work, Electrical" />
      </div>
      <div>
        <label className={lbl}>Description</label>
        <input className={inp} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional description" />
      </div>
      <button type="submit" disabled={busy}
        className="w-full py-2.5 bg-black text-white text-sm font-black rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {busy ? 'Saving…' : category ? 'Update' : 'Create Category'}
      </button>
    </form>
  );
}

export default function BudgetPage() {
  const { projectId, loading } = useFinance();
  const [categories,   setCategories]   = useState([]);
  const [allocations,  setAllocations]  = useState([]);
  const [fetching,     setFetching]     = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editing,      setEditing]      = useState(null);

  const load = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const [catRes, allocRes] = await Promise.all([
        financeApi.getBudgetCategories(projectId),
        financeApi.getBudgetAllocations(projectId),
      ]);
      setCategories(catRes.data?.results || catRes.data || []);
      setAllocations(allocRes.data?.results || allocRes.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleDone = () => {
    setShowCreate(false);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        subtitle="Category allocations and spend tracking"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Category
          </button>
        }
      />

      {(loading || fetching) ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : (
        <BudgetList
          categories={categories}
          allocations={allocations}
          onEdit={setEditing}
        />
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Budget Category">
        <CategoryForm projectId={projectId} onDone={handleDone} />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Budget Category">
        <CategoryForm category={editing} projectId={projectId} onDone={handleDone} />
      </Modal>
    </div>
  );
}
