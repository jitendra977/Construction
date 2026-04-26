/**
 * EquipmentPage — manage construction equipment.
 */
import { useState, useEffect } from 'react';
import { useResource } from '../context/ResourceContext';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import EquipmentCard from '../components/equipment/EquipmentCard';
import EquipmentForm from '../components/equipment/EquipmentForm';
import Modal from '../components/shared/Modal';
import resourceApi from '../services/resourceApi';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'In Use', value: 'IN_USE' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Retired', value: 'RETIRED' },
];

export default function EquipmentPage() {
  const { projectId, loading: ctxLoading } = useResource();
  const [equipment,    setEquipment]   = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [fetching,     setFetching]    = useState(false);
  const [showCreate,   setShowCreate]  = useState(false);
  const [editing,      setEditing]     = useState(null);

  const loadEquipment = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await resourceApi.getEquipment(projectId, statusFilter);
      setEquipment(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadEquipment(); }, [projectId, statusFilter]);

  const handleDone = () => {
    setShowCreate(false);
    setEditing(null);
    loadEquipment();
  };

  const isBusy = ctxLoading || fetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        subtitle="Manage machinery and tools"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Equipment
          </button>
        }
      />

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              statusFilter === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isBusy ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : equipment.length === 0 ? (
        <EmptyState
          icon="🚜"
          title="No equipment found"
          description={statusFilter ? `No equipment with status "${statusFilter}".` : 'Add your first piece of equipment.'}
          action={!statusFilter ? { label: '+ Add Equipment', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eq) => (
            <EquipmentCard key={eq.id} equipment={eq} onEdit={setEditing} />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Equipment">
        <EquipmentForm onDone={handleDone} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Equipment">
        {editing && <EquipmentForm equipment={editing} onDone={handleDone} />}
      </Modal>
    </div>
  );
}
