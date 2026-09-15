import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/app-layout';
import { ProtectedRoute } from './components/protected-route';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';
import { OrganizationsPage } from './pages/organizations-page';
import { TeamsPage } from './pages/teams-page';
import { UsersPage } from './pages/users-page';
import { RolesPage } from './pages/roles-page';
import { ContentPage } from './pages/content-page';
import { ProfilePage } from './pages/profile-page';
import { SubscriptionPage } from './pages/subscription-page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
