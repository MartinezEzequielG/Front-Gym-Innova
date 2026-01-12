// src/pages/HomePage.tsx
import React from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const safeUser = user as unknown as {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;

  const displayName =
    safeUser?.name ??
    [safeUser?.firstName, safeUser?.lastName].filter(Boolean).join(' ') ??
    safeUser?.email ??
    '';

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome back, {displayName}!</h1>
        <p className="text-gray-600">
          You are logged in as <strong>{user?.role}</strong>.
        </p>
        <p className="mt-4">
          Use the sidebar to navigate through your Gym Management System.
        </p>
      </div>
    </Layout>
  );
};

export default HomePage;
