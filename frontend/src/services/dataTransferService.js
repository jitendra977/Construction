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
};
