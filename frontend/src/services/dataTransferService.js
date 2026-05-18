import api from './client';

export const importService = {
    importSql: (sqlFile, onUploadProgress) => {
        const formData = new FormData();
        formData.append('sql_file', sqlFile);
        return api.post('import/sql/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        });
    },
    populateRawData: () => api.post('import/populate-raw-data/'),
};

export const dataTransferService = {
    listProjects: () => api.get('data-transfer/projects/'),
    getExportStats: (projectId) => api.get(`data-transfer/export/${projectId}/stats/`),
    exportProject: (projectId) =>
        api.get(`data-transfer/export/${projectId}/`, { responseType: 'blob' }),
    exportFullSystem: () =>
        api.get('data-transfer/export/all/', { responseType: 'blob' }),
    importSql: (sqlFile, onUploadProgress) => {
        const formData = new FormData();
        formData.append('sql_file', sqlFile);
        return api.post('data-transfer/import/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        });
    },
    runSql: (sql) => api.post('data-transfer/sql/', { sql }),
    importSqlToProject: (projectId, sqlFile, onUploadProgress) => {
        const formData = new FormData();
        formData.append('project_id', projectId);
        formData.append('sql_file', sqlFile);
        return api.post('data-transfer/import/project/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress,
        });
    },

    // ── CSV / Excel (Phase 2) ──────────────────────────────────────────────

    // Download workforce/materials/attendance as CSV or XLSX
    csvExport: (projectId, type, fmt = 'csv', extra = {}) =>
        api.get(`data-transfer/csv/export/${projectId}/`, {
            params: { type, fmt, ...extra },
            responseType: 'blob',
        }),

    // Download a blank template with headers + sample row
    csvTemplate: (type, fmt = 'csv') =>
        api.get('data-transfer/csv/template/', {
            params: { type, fmt },
            responseType: 'blob',
        }),

    // Dry-run preview without writing anything
    csvDryRun: (projectId, type, file, onProgress) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        return api.post(`data-transfer/csv/dry-run/${projectId}/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress,
        });
    },

    // Commit import (creates ImportJob)
    csvImport: (projectId, type, file, onProgress) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        return api.post(`data-transfer/csv/import/${projectId}/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress,
        });
    },

    // Import job history
    csvJobs: (projectId) =>
        api.get(`data-transfer/csv/jobs/${projectId}/`).then(r => r.data),
};
