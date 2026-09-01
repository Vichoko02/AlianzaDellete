import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authApi, api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApi.getProfile();
      setUser(userData);
      api.setToken(token);
    } catch {
      localStorage.removeItem('admin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { user: userData, token } = await authApi.login(email, password);
    api.setToken(token);
    setUser(userData);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const { user: userData, token } = await authApi.register(email, password, displayName);
    api.setToken(token);
    setUser(userData);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    localStorage.removeItem('admin_token');
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
