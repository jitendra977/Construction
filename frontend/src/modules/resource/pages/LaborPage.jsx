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
import TeamList from '../components/labor/TeamList';
import TeamForm from '../components/labor/TeamForm';
import ManageMembers from '../components/labor/ManageMembers';
import Modal from '../components/shared/Modal';
import resourceApi from '../services/resourceApi';
import teamsApi from '../services/teamsApi';

export default function LaborPage() {
  const { projectId, loading: ctxLoading, refresh } = useResource();
  const [activeTab,  setActiveTab]  = useState('workers'); // 'workers' or 'teams'
  
  const [workers,    setWorkers]    = useState([]);
  const [teams,      setTeams]      = useState([]);
  const [fetching,   setFetching]   = useState(false);
  
  const [showCreateWorker, setShowCreateWorker] = useState(false);
  const [showCreateTeam,   setShowCreateTeam]   = useState(false);
  const [editingWorker,    setEditingWorker]    = useState(null);
  const [editingTeam,      setEditingTeam]      = useState(null);
  const [attendance,       setAttendance]       = useState(null);
  const [managingTeam,     setManagingTeam]     = useState(null);

  const loadData = async () => {
    if (!projectId) return;
    setFetching(true);
    try {
      const [workerRes, teamRes] = await Promise.all([
        resourceApi.getWorkers(projectId),
        teamsApi.getTeams(projectId)
      ]);
      setWorkers(workerRes.data?.results || workerRes.data || []);
      setTeams(teamRes.data?.results || teamRes.data || []);
    } catch (err) {
      console.error("Failed to load labor data:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadData(); }, [projectId]);

  const handleWorkerDone = () => {
    setShowCreateWorker(false);
    setEditingWorker(null);
    loadData();
    refresh();
  };

  const handleTeamDone = () => {
    setShowCreateTeam(false);
    setEditingTeam(null);
    loadData();
  };

  const handleAttendanceClose = (needRefresh) => {
    setAttendance(null);
    if (needRefresh) loadData();
  };

  const isBusy = ctxLoading || fetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labor & Teams"
        subtitle={activeTab === 'workers' ? `${workers.length} workers registered` : `${teams.length} teams active`}
        actions={
          <button
            onClick={() => activeTab === 'workers' ? setShowCreateWorker(true) : setShowCreateTeam(true)}
            className="px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
          >
            {activeTab === 'workers' ? '+ Add Worker' : '+ Create Team'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${
            activeTab === 'workers' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          WORKERS
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${
            activeTab === 'teams' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          TEAMS
        </button>
      </div>

      {isBusy ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
        </div>
      ) : activeTab === 'workers' ? (
        workers.length === 0 ? (
          <EmptyState
            icon="👷"
            title="No workers yet"
            description="Add workers to start tracking labor and attendance."
            action={{ label: '+ Add Worker', onClick: () => setShowCreateWorker(true) }}
          />
        ) : (
          <WorkerList
            workers={workers}
            onEdit={setEditingWorker}
            onAttendance={setAttendance}
          />
        )
      ) : (
        teams.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No teams yet"
            description="Group your workers into teams for better management."
            action={{ label: '+ Create Team', onClick: () => setShowCreateTeam(true) }}
          />
        ) : (
          <TeamList
            teams={teams}
            onEdit={setEditingTeam}
            onManageMembers={setManagingTeam}
          />
        )
      )}

      {/* Worker Modals */}
      <Modal isOpen={showCreateWorker} onClose={() => setShowCreateWorker(false)} title="Add Worker">
        <WorkerForm onDone={handleWorkerDone} />
      </Modal>
      <Modal isOpen={!!editingWorker} onClose={() => setEditingWorker(null)} title="Edit Worker">
        {editingWorker && <WorkerForm worker={editingWorker} onDone={handleWorkerDone} />}
      </Modal>

      {/* Team Modals */}
      <Modal isOpen={showCreateTeam} onClose={() => setShowCreateTeam(false)} title="Create Team">
        <TeamForm onDone={handleTeamDone} />
      </Modal>
      <Modal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} title="Edit Team">
        {editingTeam && <TeamForm team={editingTeam} onDone={handleTeamDone} />}
      </Modal>
      <Modal isOpen={!!managingTeam} onClose={() => setManagingTeam(null)} title={`Manage ${managingTeam?.name} Members`}>
        {managingTeam && (
          <ManageMembers 
            team={managingTeam} 
            allWorkers={workers} 
            onDone={() => { setManagingTeam(null); loadData(); }} 
          />
        )}
      </Modal>

      {/* Attendance modal */}
      {attendance && (
        <AttendanceModal worker={attendance} onClose={handleAttendanceClose} />
      )}
    </div>
  );
}
