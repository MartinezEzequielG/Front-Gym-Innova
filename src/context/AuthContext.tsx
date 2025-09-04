import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
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
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'CLIENTE' | 'STAFF';
  // Otros campos según el modelo del backend
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (idToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Al cargar, consultar el usuario autenticado por cookie
    api.get<{ ok: boolean; user: User }>('/auth/me')
      .then(res => {
        if (res.data.ok) setUser(res.data.user);
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, []);

  // No se usa token manual, el backend setea cookie
  const login = async (idToken: string) => {
    try {
      // Enviar el idToken a /auth/google
      const res = await api.post<{ ok: boolean; user: User }>('/auth/google', { idToken });
      if (res.data.ok) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setToken(null);
    // No se usa localStorage para token
  };

  return (
    <GoogleOAuthProvider clientId="943627888479-bht76vnbfahrjsufkkqheg49vfmcfmch.apps.googleusercontent.com">
      <AuthContext.Provider value={{ user, token, login, logout }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};
