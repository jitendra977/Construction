export const PROJECT_PERMISSION_META = [
    { key: 'can_view_members', icon: '👥', label: 'View Team', detail: 'Read-only access to project members' },
    { key: 'can_manage_members', icon: '👥', label: 'Manage Team', detail: 'Add, remove, and update project members' },
    { key: 'can_view_phases', icon: '📋', label: 'View Phases', detail: 'Read-only access to project phases and tasks' },
    { key: 'can_manage_phases', icon: '📋', label: 'Manage Phases', detail: 'Edit project phases and execution tasks' },
    { key: 'can_manage_finances', icon: '💰', label: 'Manage Finances', detail: 'Create and edit expenses, budgets, and payments' },
    { key: 'can_view_finances', icon: '👁️', label: 'View Finances', detail: 'Read-only access to project finance data' },
    { key: 'can_view_structure', icon: '🏛️', label: 'View Structure', detail: 'Read-only access to floors, rooms, and layout' },
    { key: 'can_manage_structure', icon: '🏛️', label: 'Manage Structure', detail: 'Edit floors, rooms, and site structure' },
    { key: 'can_view_resources', icon: '🧱', label: 'View Resources', detail: 'Read-only access to materials, suppliers, and purchase data' },
    { key: 'can_manage_resources', icon: '🧱', label: 'Manage Resources', detail: 'Handle materials, suppliers, contractors, and purchase requests' },
    { key: 'can_view_workforce', icon: '🦺', label: 'View Workforce', detail: 'Read-only access to workforce, attendance, and payroll summaries' },
    { key: 'can_manage_workforce', icon: '🦺', label: 'Manage Workforce', detail: 'Attendance, teams, and workforce operations' },
    { key: 'can_approve_purchases', icon: '✅', label: 'Approve Purchases', detail: 'Approve purchase requests raised on the project' },
    { key: 'can_upload_media', icon: '📸', label: 'Upload Media', detail: 'Upload project photos and documents' },
];

export const LEGACY_PROJECT_ROLES = [
    {
        code: 'OWNER',
        name: 'Owner',
        name_ne: 'मालिक',
        icon: '👑',
        color: '#f97316',
        description: 'Full project control',
        permissions: {
            can_view_members: true,
            can_manage_members: true,
            can_view_phases: true,
            can_manage_finances: true,
            can_view_finances: true,
            can_manage_phases: true,
            can_view_structure: true,
            can_manage_structure: true,
            can_view_resources: true,
            can_manage_resources: true,
            can_upload_media: true,
            can_view_workforce: true,
            can_manage_workforce: true,
            can_approve_purchases: true,
        },
    },
    {
        code: 'MANAGER',
        name: 'Project Manager',
        name_ne: 'परियोजना प्रबन्धक',
        icon: '🧑‍💼',
        color: '#3b82f6',
        description: 'Operational control and approvals',
        permissions: {
            can_view_members: true,
            can_manage_members: true,
            can_view_phases: true,
            can_manage_finances: true,
            can_view_finances: true,
            can_manage_phases: true,
            can_view_structure: true,
            can_manage_structure: true,
            can_view_resources: true,
            can_manage_resources: true,
            can_upload_media: true,
            can_view_workforce: true,
            can_manage_workforce: true,
            can_approve_purchases: true,
        },
    },
    {
        code: 'ENGINEER',
        name: 'Engineer',
        name_ne: 'इन्जिनियर',
        icon: '🔧',
        color: '#8b5cf6',
        description: 'Phases, structure, and resource requests',
        permissions: {
            can_view_members: true,
            can_manage_members: false,
            can_view_phases: true,
            can_manage_finances: false,
            can_view_finances: true,
            can_manage_phases: true,
            can_view_structure: true,
            can_manage_structure: true,
            can_view_resources: true,
            can_manage_resources: true,
            can_upload_media: true,
            can_view_workforce: true,
            can_manage_workforce: false,
            can_approve_purchases: false,
        },
    },
    {
        code: 'SUPERVISOR',
        name: 'Supervisor',
        name_ne: 'सुपरभाइजर',
        icon: '🦺',
        color: '#f59e0b',
        description: 'Site execution and workforce tracking',
        permissions: {
            can_view_members: true,
            can_manage_members: false,
            can_view_phases: true,
            can_manage_finances: false,
            can_view_finances: true,
            can_manage_phases: true,
            can_view_structure: true,
            can_manage_structure: false,
            can_view_resources: true,
            can_manage_resources: false,
            can_upload_media: true,
            can_view_workforce: true,
            can_manage_workforce: true,
            can_approve_purchases: false,
        },
    },
    {
        code: 'CONTRACTOR',
        name: 'Contractor',
        name_ne: 'ठेकेदार',
        icon: '🏗️',
        color: '#10b981',
        description: 'Resources and media updates',
        permissions: {
            can_view_members: true,
            can_manage_members: false,
            can_view_phases: true,
            can_manage_finances: false,
            can_view_finances: false,
            can_manage_phases: false,
            can_view_structure: true,
            can_manage_structure: false,
            can_view_resources: true,
            can_manage_resources: true,
            can_upload_media: true,
            can_view_workforce: false,
            can_manage_workforce: false,
            can_approve_purchases: false,
        },
    },
    {
        code: 'VIEWER',
        name: 'Viewer',
        name_ne: 'दर्शक',
        icon: '👁️',
        color: '#64748b',
        description: 'Read-only project access',
        permissions: {
            can_view_members: true,
            can_manage_members: false,
            can_view_phases: true,
            can_manage_finances: false,
            can_view_finances: true,
            can_manage_phases: false,
            can_view_structure: true,
            can_manage_structure: false,
            can_view_resources: true,
            can_manage_resources: false,
            can_upload_media: false,
            can_view_workforce: true,
            can_manage_workforce: false,
            can_approve_purchases: false,
        },
    },
];

export const PROJECT_ROLE_COLOR_MAP = LEGACY_PROJECT_ROLES.reduce((acc, role) => {
    acc[role.code] = role.color;
    return acc;
}, {});

export const buildProjectRoleDefaults = (role) => {
    const defaults = {};
    PROJECT_PERMISSION_META.forEach(({ key }) => {
        defaults[key] = !!role?.permissions?.[key] || !!role?.[key];
    });
    return defaults;
};

export const normalizeProjectRole = (role) => {
    const legacy = LEGACY_PROJECT_ROLES.find(item => item.code === role?.code);
    const base = role || legacy || {};
    const permissions = buildProjectRoleDefaults(base);
    return {
        ...base,
        code: base.code,
        name: base.name || legacy?.name || base.code || 'Role',
        name_ne: base.name_ne || legacy?.name_ne || '',
        description: base.description || legacy?.description || '',
        description_ne: base.description_ne || '',
        icon: base.icon || legacy?.icon || '🧭',
        color: base.color || legacy?.color || '#2563eb',
        permissions,
    };
};

export const normalizeProjectRoles = (roles = []) => {
    if (!Array.isArray(roles) || roles.length === 0) {
        return LEGACY_PROJECT_ROLES.map(normalizeProjectRole);
    }
    const merged = roles.map(normalizeProjectRole);
    const existingCodes = new Set(merged.map(role => role.code));
    LEGACY_PROJECT_ROLES.forEach(role => {
        if (!existingCodes.has(role.code)) merged.push(normalizeProjectRole(role));
    });
    return merged.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.name.localeCompare(b.name));
};

export const getProjectRoleByCode = (roles, code) =>
    normalizeProjectRoles(roles).find(role => role.code === code) || normalizeProjectRole({ code: code || 'VIEWER' });

export const buildProjectRoleMap = (roles) =>
    normalizeProjectRoles(roles).reduce((acc, role) => {
        acc[role.code] = role;
        return acc;
    }, {});
