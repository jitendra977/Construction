import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const auth = () => {
    const t = localStorage.getItem('access_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

const timelineApi = {
    /** All phases for a project, ordered */
    getPhases: (projectId) =>
        axios.get(`${BASE}/phases/`, { headers: auth(), params: { project: projectId } }),

    /** All tasks for a project (with updates & media) */
    getTasks: (projectId) =>
        axios.get(`${BASE}/tasks/`, { headers: auth(), params: { project: projectId } }),

    /** Critical path computation */
    getCriticalPath: (projectId) =>
        axios.get(`${BASE}/tasks/critical_path/`, { headers: auth(), params: { project: projectId } }),

    /** Task updates log */
    getTaskUpdates: (taskId) =>
        axios.get(`${BASE}/task-updates/`, { headers: auth(), params: { task: taskId } }),

    /** Post a progress update */
    addUpdate: (taskId, note, progressPct) =>
        axios.post(`${BASE}/tasks/${taskId}/add_update/`, { note, progress_percentage: progressPct }, { headers: auth() }),

    /** Update a task (status, progress, dates, etc.) */
    updateTask: (taskId, data) =>
        axios.patch(`${BASE}/tasks/${taskId}/`, data, { headers: auth() }),

    /** Update a phase */
    updatePhase: (phaseId, data) =>
        axios.patch(`${BASE}/phases/${phaseId}/`, data, { headers: auth() }),

    /** Create a task */
    createTask: (data) =>
        axios.post(`${BASE}/tasks/`, data, { headers: auth() }),

    /** Delete a task */
    deleteTask: (taskId) =>
        axios.delete(`${BASE}/tasks/${taskId}/`, { headers: auth() }),
};

export default timelineApi;
