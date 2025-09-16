import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import { LoginSuccessPage } from '../pages/LoginSuccessPage';
import DashboardPage from '../pages/Dashboard';
import { UsersPage } from '../pages/UsersPage';
import { Layout } from '../components/Layout';
import { SettingsPage } from '../pages/SettingsPage';
import MembersPage from '../pages/MembersPage';
import PaymentsPage from '../pages/PaymentsPage';
import SubscriptionsPage from '../pages/SubscriptionsPage';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/login/success" element={<LoginSuccessPage />} />
    <Route
      path="/"
      element={
        <PrivateRoute>
          <HomePage />
        </PrivateRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <PrivateRoute>
          <DashboardPage />
        </PrivateRoute>
      }
    />
    <Route
      path="/members"
      element={
        <PrivateRoute>
          <MembersPage />
        </PrivateRoute>
      }
    />
    <Route
      path="/users"
      element={
        <PrivateRoute>
          <UsersPage />
        </PrivateRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <PrivateRoute>
          <SettingsPage />
        </PrivateRoute>
      }
    />
    <Route
      path="/payments"
      element={
        <PrivateRoute>
          <PaymentsPage />
        </PrivateRoute>
      }
    />
    <Route
      path="/subscriptions"
      element={
        <PrivateRoute>
          <SubscriptionsPage />
        </PrivateRoute>
      }
    />
  </Routes>
);