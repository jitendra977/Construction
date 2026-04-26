/**
 * LaborPage — manage workers and attendance.
 */
import { useState, useEffect } from 'react';
import { useResource } from '../context/ResourceContext';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import WorkerList from '../components/labor/WorkerList';
import WorkerForm from '../components/labor/WorkerForm';
import AttendanceModal from '../components/labor/AttendanceModal';
import Modal from '../components/shared/Modal';
import resourceApi from '../services/resourceApi';

export default function LaborPage() {
  const { projectId, loading: ctxLoading, refresh } = useResource();
  const [workers,    setWorkers]    = useState([]);
  const [fetching,   setFetching]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [attendance, setAttendance] = useState(null);

  const loadWorkers = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const res = await resourceApi.getWorkers(projectId);
      setWorkers(res.data?.results || res.data || []);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadWorkers(); }, [projectId]);

  const handleDone = () => {
    setShowCreate(false);
    setEditing(null);
    loadWorkers();
    refresh();
  };

  const handleAttendanceClose = (needRefresh) => {
    setAttendance(null);
    if (needRefresh) loadWorkers();
  };

  const isBusy = ctxLoading || fetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labor"
        subtitle={`${workers.length} workers registered`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Add Worker
          </button>
        }
      />

      {isBusy ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : workers.length === 0 ? (
        <EmptyState
          icon="👷"
          title="No workers yet"
          description="Add workers to start tracking labor and attendance."
          action={{ label: '+ Add Worker', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <WorkerList
          workers={workers}
          onEdit={setEditing}
          onAttendance={setAttendance}
        />
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Worker">
        <WorkerForm onDone={handleDone} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Worker">
        {editing && <WorkerForm worker={editing} onDone={handleDone} />}
      </Modal>

      {/* Attendance modal */}
      {attendance && (
        <AttendanceModal worker={attendance} onClose={handleAttendanceClose} />
      )}
    </div>
  );
}
