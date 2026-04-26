/**
 * MaterialsPage — manage construction materials and stock.
 */
import { useState, useEffect } from 'react';
import { useResource } from '../context/ResourceContext';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import MaterialCard from '../components/materials/MaterialCard';
import MaterialForm from '../components/materials/MaterialForm';
import StockModal from '../components/materials/StockModal';
import Modal from '../components/shared/Modal';
import resourceApi from '../services/resourceApi';

export default function MaterialsPage() {
  const { projectId, loading: ctxLoading, refresh } = useResource();
  const [materials,   setMaterials]   = useState([]);
  const [fetching,    setFetching]    = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [stockModal,  setStockModal]  = useState(null); // { material, type }

  const loadMaterials = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await resourceApi.getMaterials(projectId);
      setMaterials(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadMaterials(); }, [projectId]);

  const handleDone = () => {
    setShowCreate(false);
    setEditing(null);
    loadMaterials();
    refresh();
  };

  const handleStockClose = (needRefresh) => {
    setStockModal(null);
    if (needRefresh) { loadMaterials(); refresh(); }
  };

  const isBusy = ctxLoading || fetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materials"
        subtitle="Construction materials and stock management"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Material
          </button>
        }
      />

      {isBusy ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : materials.length === 0 ? (
        <EmptyState
          icon="🧱"
          title="No materials yet"
          description="Add your first construction material to start tracking stock."
          action={{ label: '+ Add Material', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => (
            <MaterialCard
              key={m.id}
              material={m}
              onStockIn={(mat) => setStockModal({ material: mat, type: 'in' })}
              onStockOut={(mat) => setStockModal({ material: mat, type: 'out' })}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Material">
        <MaterialForm onDone={handleDone} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Material">
        {editing && <MaterialForm material={editing} onDone={handleDone} />}
      </Modal>

      {/* Stock modal */}
      {stockModal && (
        <StockModal
          material={stockModal.material}
          type={stockModal.type}
          onClose={handleStockClose}
        />
      )}
    </div>
  );
}
