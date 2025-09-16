import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Configuración global de Axios para el backend
export const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'CLIENT' | 'STAFF';
  // Otros campos según el modelo del backend
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get<{ ok: boolean; user: User }>('/auth/me');
        if (res.data.ok) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:3000/auth/google/redirect';
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <GoogleOAuthProvider clientId="943627888479-bht76vnbfahrjsufkkqheg49vfmcfmch.apps.googleusercontent.com">
      <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};
