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
import { AccountsProvider } from '../context/AccountsContext';
import AccountsLayout      from '../components/layout/AccountsLayout';
import AccountsDashboard   from '../pages/AccountsDashboard';
import ProfilePage         from '../pages/ProfilePage';
import UsersPage           from '../pages/UsersPage';
import RolesPage           from '../pages/RolesPage';
import ActivityPage        from '../pages/ActivityPage';

export default function AccountsRoutes() {
    return (
        <AccountsProvider>
            <AccountsLayout>
                <Routes>
                    <Route index            element={<AccountsDashboard />} />
                    <Route path="profile"   element={<ProfilePage />}       />
                    <Route path="users"     element={<UsersPage />}         />
                    <Route path="roles"     element={<RolesPage />}         />
                    <Route path="activity"  element={<ActivityPage />}      />
                    <Route path="*"         element={<Navigate to="/dashboard/desktop/accounts" replace />} />
                </Routes>
            </AccountsLayout>
        </AccountsProvider>
    );
}
