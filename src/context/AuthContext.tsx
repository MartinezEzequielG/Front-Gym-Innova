import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'ACCOUNTANT';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  loginWithGoogle: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      axios.get<User>('http://localhost:3000/api/v1/users/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
    }
  }, []);

  const login = async (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    try {
      const res = await axios.get<User>('http://localhost:3000/api/v1/users/me', {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      setUser(res.data);
    } catch {
      setUser(null);
    }
  };

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:3000/api/v1/auth/google';
  };

  const logout = async () => {
    await axios.get('http://localhost:3000/api/v1/auth/logout', { withCredentials: true });
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
