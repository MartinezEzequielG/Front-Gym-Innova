import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider } from '@react-oauth/google';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('Missing VITE_API_URL (set it in Amplify env vars)');
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Interceptor para agregar timestamp a todas las requests GET
api.interceptors.request.use((config) => {
  // Solo agregar timestamp a GET requests para evitar cache
  if (config.method === 'get') {
    config.params = {
      ...(config.params || {}), // <-- CAMBIO AQUÍ: usa {} como fallback
      _t: Date.now()
    };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? '');

    // No forzar redirect si el 401 viene de /auth/me
    const isMeEndpoint = url.includes('/auth/me');

    if (status === 401 && !isMeEndpoint && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);
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
    window.location.href = `${API_URL}/auth/google/redirect`;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignorar errores de logout
    } finally {
      setUser(null);
      // Opcional: limpiar cualquier cache local
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  return (
    <GoogleOAuthProvider clientId="943627888479-bht76vnbfahrjsufkkqheg49vfmcfmch.apps.googleusercontent.com">
      <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};
