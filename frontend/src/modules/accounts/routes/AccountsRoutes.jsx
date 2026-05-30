/**
 * AccountsRoutes — all routes for the Accounts module.
 *
 * Mount at: <Route path="accounts/*" element={<AccountsRoutes />} />
 *
 * Pages
 * ─────
 *   /accounts/          → AccountsDashboard  (KPI overview)
 *   /accounts/profile   → ProfilePage        (edit profile + change password)
 *   /accounts/users     → UsersPage          (list / invite / manage users)
 *   /accounts/roles     → RolesPage          (CRUD roles + permissions)
 *   /accounts/activity  → ActivityPage       (audit log viewer)
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authService } from '../../../services/auth';
import { AccountsProvider } from '../context/AccountsContext';
import AccountsLayout      from '../components/layout/AccountsLayout';
import AccountsDashboard   from '../pages/AccountsDashboard';
import ProfilePage         from '../pages/ProfilePage';
import UsersPage           from '../pages/UsersPage';
import RolesPage           from '../pages/RolesPage';
import ActivityPage        from '../pages/ActivityPage';
import { usePlatformBase } from '../../../shared/utils/platformNav';

function AccessDenied() {
    return (
        <div style={{ padding: 24, color: 'var(--t-text)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900 }}>Access denied</h2>
            <p style={{ margin: 0, color: 'var(--t-text3)', fontSize: 13 }}>Your role does not allow access to this page.</p>
        </div>
    );
}

function hasAnyPermission(perms) {
    return perms.some(permission => authService.hasPermission(permission));
}

function AccountsHome() {
    if (hasAnyPermission(['can_manage_admin_config', 'can_manage_users'])) {
        return <AccountsDashboard />;
    }
    if (authService.hasPermission('can_view_profile')) {
        return <Navigate to="profile" replace />;
    }
    return <AccessDenied />;
}

function RequireAccountAccess({ permissions, children }) {
    if (hasAnyPermission(permissions)) return children;
    if (authService.hasPermission('can_view_profile')) return <Navigate to="profile" replace />;
    return <AccessDenied />;
}

export default function AccountsRoutes() {
    const base = usePlatformBase();
    const isMobile = base.includes('/dashboard/mobile');

    return (
        <AccountsProvider>
            <AccountsLayout>
                <Routes>
                    <Route index            element={<AccountsHome />} />
                    <Route path="profile"   element={<RequireAccountAccess permissions={['can_view_profile', 'can_manage_admin_config', 'can_manage_users']}>{isMobile ? <ProfilePage forcedTab="profile" hideTabBar /> : <ProfilePage />}</RequireAccountAccess>} />
                    <Route path="profile/security" element={<RequireAccountAccess permissions={['can_view_profile', 'can_manage_admin_config', 'can_manage_users']}><ProfilePage forcedTab="security" hideTabBar /></RequireAccountAccess>} />
                    <Route path="profile/activity" element={<RequireAccountAccess permissions={['can_view_profile', 'can_manage_admin_config', 'can_manage_users']}><ProfilePage forcedTab="activity" hideTabBar /></RequireAccountAccess>} />
                    <Route path="users"     element={<RequireAccountAccess permissions={['can_manage_admin_config', 'can_manage_users']}><UsersPage /></RequireAccountAccess>} />
                    <Route path="roles"     element={<RequireAccountAccess permissions={['can_manage_admin_config', 'can_manage_users']}><RolesPage /></RequireAccountAccess>} />
                    <Route path="roles/guide"   element={<RequireAccountAccess permissions={['can_manage_admin_config', 'can_manage_users']}><RolesPage forcedSection="guide" /></RequireAccountAccess>} />
                    <Route path="roles/system"  element={<RequireAccountAccess permissions={['can_manage_admin_config', 'can_manage_users']}><RolesPage forcedSection="system" /></RequireAccountAccess>} />
                    <Route path="roles/project" element={<RequireAccountAccess permissions={['can_manage_admin_config', 'can_manage_users']}><RolesPage forcedSection="project" /></RequireAccountAccess>} />
                    <Route path="activity"  element={<RequireAccountAccess permissions={['can_manage_admin_config', 'can_manage_users']}><ActivityPage /></RequireAccountAccess>} />
                    <Route path="*"         element={<Navigate to="" replace />} />
                </Routes>
            </AccountsLayout>
        </AccountsProvider>
    );
}
