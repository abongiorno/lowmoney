import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      console.log('InitAuth started');
      const savedToken = localStorage.getItem('token');
      console.log('Saved token:', savedToken);
      
      if (savedToken) {
        try {
          console.log('Calling getCurrentUser...');
          const response = await authApi.getCurrentUser();
          console.log('getCurrentUser response:', response);
          
          if (response.success && response.data) {
            setUser(response.data);
            setToken(savedToken);
            console.log('User set:', response.data);
          } else {
            console.log('getCurrentUser failed, removing token');
            // Invalid token
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Error in initAuth:', error);
          // Token expired or invalid
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
      console.log('InitAuth completed');
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    console.log('Login called with:', credentials);
    const response = await authApi.login(credentials);
    console.log('Login response:', response);
    
    if (response.success && response.data) {
      const { user, token } = response.data;
      console.log('Setting user and token:', user, token);
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      console.log('Login completed successfully');
    } else {
      console.error('Login failed:', response);
      throw new Error(response.message || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data);
    if (response.success && response.data) {
      const { user, token } = response.data;
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}