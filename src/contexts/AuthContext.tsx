'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
  email: string;
  currency: string;
  backgroundImage?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'STAFF' | 'KITCHEN' | 'ADMIN' | 'SUPERADMIN';
  storeId: string;
}

interface AuthContextType {
  user: User | null;
  storeId: string | null;
  store: Store | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectStore: (storeId: string) => void;
  updateStore: (updatedStore: Partial<Store>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored && stored !== 'undefined') {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
        }
      }
      const storedStoreId = localStorage.getItem('storeId');
      if (storedStoreId && storedStoreId !== 'undefined') {
        setStoreId(storedStoreId);
      }
      // Restore store data from localStorage including currency
      const storedStore = localStorage.getItem('store');
      if (storedStore && storedStore !== 'undefined') {
        const parsedStore = JSON.parse(storedStore);
        if (parsedStore && typeof parsedStore === 'object') {
          setStore(parsedStore);
        }
      }
    } catch (error) {
      console.warn('Failed to restore auth state:', error);
      // Clear invalid auth data
      localStorage.removeItem('user');
      localStorage.removeItem('storeId');
      localStorage.removeItem('store');
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.message || 'Login failed');
    }

    const data = await response.json();
    if (!data.success || !data.data) {
      throw new Error('Invalid login response');
    }

    const { user, token, store } = data.data;
    setUser(user);
    setStoreId(user.storeId);
    setStore(store || { id: user.storeId, name: '', email: '', currency: 'USD' });
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    // Only set storeId in localStorage if it's not null (for superadmins, storeId is null)
    if (user.storeId) {
      localStorage.setItem('storeId', user.storeId);
    } else {
      localStorage.removeItem('storeId');
    }
    if (store) {
      localStorage.setItem('store', JSON.stringify(store));
    }
  };

  const logout = async () => {
    setUser(null);
    setStoreId(null);
    setStore(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('storeId');
    localStorage.removeItem('store');
  };

  const selectStore = (id: string) => {
    setStoreId(id);
    localStorage.setItem('storeId', id);
  };

  const updateStore = (updatedStore: Partial<Store>) => {
    if (store) {
      const newStore = { ...store, ...updatedStore };
      setStore(newStore);
      localStorage.setItem('store', JSON.stringify(newStore));
    }
  };

  return (
    <AuthContext.Provider value={{ user, storeId, store, isLoading, login, logout, selectStore, updateStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Hook to get current store information including currency
 */
export function useStore() {
  const { store } = useAuth();
  return store || { id: '', name: '', email: '', currency: 'USD' };
}