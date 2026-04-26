/**
 * SuppliersPage — manage suppliers/vendors.
 */
import { useState, useEffect } from 'react';
import { useResource } from '../context/ResourceContext';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import SupplierList from '../components/suppliers/SupplierList';
import SupplierForm from '../components/suppliers/SupplierForm';
import Modal from '../components/shared/Modal';
import resourceApi from '../services/resourceApi';

export default function SuppliersPage() {
  const { projectId, loading: ctxLoading, refresh } = useResource();
  const [suppliers,  setSuppliers]  = useState([]);
  const [fetching,   setFetching]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState(null);

  const loadSuppliers = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await resourceApi.getSuppliers(projectId);
      setSuppliers(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadSuppliers(); }, [projectId]);

  const handleDone = () => {
    setShowCreate(false);
    setEditing(null);
    loadSuppliers();
    refresh();
  };

  const isBusy = ctxLoading || fetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendors and material suppliers"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Supplier
          </button>
        }
      />

      {isBusy ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon="🏪"
          title="No suppliers yet"
          description="Add suppliers to manage your vendors and purchase orders."
          action={{ label: '+ Add Supplier', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <SupplierList suppliers={suppliers} onEdit={setEditing} />
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Supplier">
        <SupplierForm onDone={handleDone} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Supplier">
        {editing && <SupplierForm supplier={editing} onDone={handleDone} />}
      </Modal>
    </div>
  );
}
