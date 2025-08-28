// src/pages/HomePage.tsx
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">
          You are logged in as <strong>{user?.role}</strong>.
        </p>
        <p className="mt-4">
          Use the sidebar to navigate through your Gym Management System.
        </p>
      </div>
    </Layout>
  );
}
