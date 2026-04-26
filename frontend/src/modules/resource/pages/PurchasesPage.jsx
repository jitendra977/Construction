/**
 * PurchasesPage — manage purchase orders.
 * Loads orders directly from API (not from context).
 */
import { useState, useEffect } from 'react';
import { useResource } from '../context/ResourceContext';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import PurchaseList from '../components/purchases/PurchaseList';
import PurchaseForm from '../components/purchases/PurchaseForm';
import Modal from '../components/shared/Modal';
import resourceApi from '../services/resourceApi';

export default function PurchasesPage() {
  const { projectId, loading: ctxLoading } = useResource();
  const [orders,     setOrders]     = useState([]);
  const [fetching,   setFetching]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [receiving,  setReceiving]  = useState(false);

  const loadOrders = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await resourceApi.getPurchaseOrders(projectId);
      setOrders(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadOrders(); }, [projectId]);

  const handleDone = () => {
    setShowCreate(false);
    setEditing(null);
    loadOrders();
  };

  const handleReceive = async (order) => {
    if (!window.confirm(`Receive order "${order.order_number}"? This will update stock.`)) return;
    setReceiving(true);
    try {
      await resourceApi.receivePurchaseOrder(order.id);
      loadOrders();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to receive order.');
    } finally {
      setReceiving(false);
    }
  };

  const isBusy = ctxLoading || fetching || receiving;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Track material purchases from suppliers"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + New Order
          </button>
        }
      />

      {isBusy ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No purchase orders yet"
          description="Create a purchase order to track material procurement."
          action={{ label: '+ New Order', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <PurchaseList orders={orders} onReceive={handleReceive} onEdit={setEditing} />
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Order" maxWidth="max-w-2xl">
        <PurchaseForm onDone={handleDone} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Purchase Order" maxWidth="max-w-2xl">
        {editing && <PurchaseForm order={editing} onDone={handleDone} />}
      </Modal>
    </div>
  );
}
