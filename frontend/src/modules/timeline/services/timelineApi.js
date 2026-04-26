/**
 * timelineApi.js — Timeline Module API client
 * All requests go to /api/v1/ (phases + tasks endpoints)
 */
import createApiClient from '../../../services/createApiClient';

const http = createApiClient();

const timelineApi = {
    /** All phases for a project, ordered */
    getPhases: (projectId) =>
        http.get('/phases/', { params: { project: projectId } }),

    /** All tasks for a project (with updates & media) */
    getTasks: (projectId) =>
        http.get('/tasks/', { params: { project: projectId } }),

    /** Critical path computation */
    getCriticalPath: (projectId) =>
        http.get('/tasks/critical_path/', { params: { project: projectId } }),

    /** Task updates log */
    getTaskUpdates: (taskId) =>
        http.get('/task-updates/', { params: { task: taskId } }),

    /** Post a progress update */
    addUpdate: (taskId, note, progressPct) =>
        http.post(`/tasks/${taskId}/add_update/`, { note, progress_percentage: progressPct }),

    /** Update a task (status, progress, dates, etc.) */
    updateTask: (taskId, data) =>
        http.patch(`/tasks/${taskId}/`, data),

    /** Update a phase */
    updatePhase: (phaseId, data) =>
        http.patch(`/phases/${phaseId}/`, data),

    /** Create a task */
    createTask: (data) =>
        http.post('/tasks/', data),

    /** Delete a task */
    deleteTask: (taskId) =>
        http.delete(`/tasks/${taskId}/`),
};

export default timelineApi;
