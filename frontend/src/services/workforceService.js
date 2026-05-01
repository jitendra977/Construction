/**
 * workforceService.js
 * ───────────────────
 * API client for the Workforce Management module.
 * Base URL: /api/v1/workforce/
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({ baseURL: `${API_URL}/workforce` });
api.interceptors.request.use(cfg => {
    cfg.headers = { ...cfg.headers, ...getHeaders() };
    return cfg;
});

const workforceService = {

    // ── Categories ────────────────────────────────────────────────────────────
    getCategories:    (params = {}) => api.get('categories/', { params }).then(r => r.data),
    createCategory:   (data)        => api.post('categories/', data).then(r => r.data),
    updateCategory:   (id, data)    => api.patch(`categories/${id}/`, data).then(r => r.data),
    deleteCategory:   (id)          => api.delete(`categories/${id}/`).then(r => r.data),

    // ── Roles ─────────────────────────────────────────────────────────────────
    getRoles:         (params = {}) => api.get('roles/', { params }).then(r => r.data),
    createRole:       (data)        => api.post('roles/', data).then(r => r.data),
    updateRole:       (id, data)    => api.patch(`roles/${id}/`, data).then(r => r.data),
    deleteRole:       (id)          => api.delete(`roles/${id}/`).then(r => r.data),

    // ── Members ───────────────────────────────────────────────────────────────
    getMembers:       (params = {}) => api.get('members/', { params }).then(r => r.data),
    getMember:        (id)          => api.get(`members/${id}/`).then(r => r.data),
    getFullProfile:   (id)          => api.get(`members/${id}/full_profile/`).then(r => r.data),
    createMember:     (data)        => api.post('members/', data).then(r => r.data),
    updateMember:     (id, data)    => api.patch(`members/${id}/`, data).then(r => r.data),
    deleteMember:     (id)          => api.delete(`members/${id}/`).then(r => r.data),
    getBadgeUrl:      (id)          => `${API_URL}/workforce/members/${id}/badge/`,

    // Dashboard summary counts (supports ?project=<id> filter)
    getSummaryStats:  (project) =>
        api.get('members/summary_stats/', { params: project ? { project } : {} }).then(r => r.data),

    // Import unlinked AttendanceWorkers → create WorkforceMember records
    // body: { project?: id, dry_run?: bool }
    seedFromAttendance: (body = {}) =>
        api.post('members/seed_from_attendance/', body).then(r => r.data),

    // Create worker portal account (phone + PIN)
    // Returns { employee_id, username, pin, email } — PIN shown ONCE
    // Send portal credentials via email (call immediately after createAccount)
    // data: { recipient_email, pin, portal_url?, project_name? }
    sendPortalCredentials: (id, data) =>
        api.post(`members/${id}/send_credentials/`, data).then(r => r.data),

    createAccount: (id, data = {}) =>
        api.post(`members/${id}/create_account/`, data).then(r => r.data),

    // Link / unlink attendance record
    linkAttendance:   (id, attendanceWorkerId) =>
        api.post(`members/${id}/link_attendance/`, { attendance_worker_id: attendanceWorkerId }).then(r => r.data),
    unlinkAttendance: (id) =>
        api.post(`members/${id}/unlink_attendance/`, {}).then(r => r.data),

    // ── Skills ────────────────────────────────────────────────────────────────
    getSkills:        (params = {}) => api.get('skills/', { params }).then(r => r.data),
    createSkill:      (data)        => api.post('skills/', data).then(r => r.data),
    updateSkill:      (id, data)    => api.patch(`skills/${id}/`, data).then(r => r.data),

    getWorkerSkills:  (params = {}) => api.get('worker-skills/', { params }).then(r => r.data),
    addWorkerSkill:   (data)        => api.post('worker-skills/', data).then(r => r.data),
    updateWorkerSkill:(id, data)    => api.patch(`worker-skills/${id}/`, data).then(r => r.data),
    removeWorkerSkill:(id)          => api.delete(`worker-skills/${id}/`).then(r => r.data),

    // ── Documents ─────────────────────────────────────────────────────────────
    getDocuments:     (params = {}) => api.get('documents/', { params }).then(r => r.data),
    uploadDocument:   (data)        => api.post('documents/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),
    updateDocument:   (id, data)    => api.patch(`documents/${id}/`, data).then(r => r.data),
    deleteDocument:   (id)          => api.delete(`documents/${id}/`).then(r => r.data),

    // ── Contracts ─────────────────────────────────────────────────────────────
    getContracts:     (params = {}) => api.get('contracts/', { params }).then(r => r.data),
    createContract:   (data)        => api.post('contracts/', data).then(r => r.data),
    updateContract:   (id, data)    => api.patch(`contracts/${id}/`, data).then(r => r.data),
    deleteContract:   (id)          => api.delete(`contracts/${id}/`).then(r => r.data),

    // ── Wages ─────────────────────────────────────────────────────────────────
    getWages:         (params = {}) => api.get('wages/', { params }).then(r => r.data),
    createWage:       (data)        => api.post('wages/', data).then(r => r.data),
    updateWage:       (id, data)    => api.patch(`wages/${id}/`, data).then(r => r.data),

    // ── Payroll Records ───────────────────────────────────────────────────────
    getPayrollRecords:(params = {}) => api.get('payroll-records/', { params }).then(r => r.data),
    getPayrollRecord: (id)          => api.get(`payroll-records/${id}/`).then(r => r.data),
    createPayroll:    (data)        => api.post('payroll-records/', data).then(r => r.data),
    updatePayroll:    (id, data)    => api.patch(`payroll-records/${id}/`, data).then(r => r.data),
    deletePayroll:    (id)          => api.delete(`payroll-records/${id}/`).then(r => r.data),

    // ── Assignments ───────────────────────────────────────────────────────────
    getAssignments:   (params = {}) => api.get('assignments/', { params }).then(r => r.data),
    createAssignment: (data)        => api.post('assignments/', data).then(r => r.data),
    updateAssignment: (id, data)    => api.patch(`assignments/${id}/`, data).then(r => r.data),
    deleteAssignment: (id)          => api.delete(`assignments/${id}/`).then(r => r.data),

    // ── Evaluations ───────────────────────────────────────────────────────────
    getEvaluations:   (params = {}) => api.get('evaluations/', { params }).then(r => r.data),
    createEvaluation: (data)        => api.post('evaluations/', data).then(r => r.data),
    updateEvaluation: (id, data)    => api.patch(`evaluations/${id}/`, data).then(r => r.data),
    deleteEvaluation: (id)          => api.delete(`evaluations/${id}/`).then(r => r.data),

    // ── Safety Records ────────────────────────────────────────────────────────
    getSafetyRecords: (params = {}) => api.get('safety-records/', { params }).then(r => r.data),
    createSafetyRecord:(data)       => api.post('safety-records/', data).then(r => r.data),
    updateSafetyRecord:(id, data)   => api.patch(`safety-records/${id}/`, data).then(r => r.data),

    // ── Performance Logs ──────────────────────────────────────────────────────
    getPerfLogs:      (params = {}) => api.get('performance-logs/', { params }).then(r => r.data),
    createPerfLog:    (data)        => api.post('performance-logs/', data).then(r => r.data),
    updatePerfLog:    (id, data)    => api.patch(`performance-logs/${id}/`, data).then(r => r.data),

    // ── Emergency Contacts ────────────────────────────────────────────────────
    getEmergencyContacts: (params = {}) => api.get('emergency-contacts/', { params }).then(r => r.data),
    createEmergencyContact:(data)       => api.post('emergency-contacts/', data).then(r => r.data),
    updateEmergencyContact:(id, data)   => api.patch(`emergency-contacts/${id}/`, data).then(r => r.data),
    deleteEmergencyContact:(id)         => api.delete(`emergency-contacts/${id}/`).then(r => r.data),

    // ── Teams ─────────────────────────────────────────────────────────────────
    getTeams:         (params = {}) => api.get('teams/', { params }).then(r => r.data),
    addTeamMembers:   (id, memberIds) => api.post(`teams/${id}/add_members/`, { member_ids: memberIds }).then(r => r.data),
    removeTeamMembers:(id, memberIds) => api.post(`teams/${id}/remove_members/`, { member_ids: memberIds }).then(r => r.data),
};

export default workforceService;
