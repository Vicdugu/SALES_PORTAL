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
  storeId: string | null;
}

interface AuthContextType {
  user: User | null;
  storeId: string | null;
  store: Store | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectStore: (storeId: string, storeData?: Store) => Promise<void>;
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
          console.log('[AuthContext] Restored store from localStorage:', {
            id: parsedStore.id,
            backgroundImage: parsedStore.backgroundImage ? 'present' : 'null',
            primaryColor: parsedStore.primaryColor,
          });
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
    console.log('[AuthContext] Login successful:', {
      userId: user.id,
      storeId: user.storeId,
      storeHasBranding: !!store,
      backgroundImage: store?.backgroundImage ? 'present' : 'null',
      primaryColor: store?.primaryColor,
    });

    setUser(user);
    setStoreId(user.storeId);
    // For superadmin with no store selected, don't set a default store
    if (store) {
      setStore(store);
      localStorage.setItem('store', JSON.stringify(store));
    } else if (user.storeId) {
      setStore({ id: user.storeId, name: '', email: '', currency: 'USD' });
    }
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    // Only set storeId in localStorage if it's not null (for superadmins, storeId is null)
    if (user.storeId) {
      localStorage.setItem('storeId', user.storeId);
    } else {
      localStorage.removeItem('storeId');
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

  const selectStore = async (id: string, storeData?: Store) => {
    setStoreId(id);
    localStorage.setItem('storeId', id);
    
    // If store data is provided, use it directly
    if (storeData) {
      setStore(storeData);
      localStorage.setItem('store', JSON.stringify(storeData));
      return;
    }
    
    // Otherwise, fetch store details from API
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stores/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setStore(data.data);
          localStorage.setItem('store', JSON.stringify(data.data));
        }
      }
    } catch (error) {
      console.error('Failed to fetch store:', error);
    }
  };

  const updateStore = (updatedStore: Partial<Store>) => {
    if (store) {
      const newStore = { ...store, ...updatedStore };
      setStore(newStore);
      localStorage.setItem('store', JSON.stringify(newStore));
      console.log('[AuthContext] Store updated with:', {
        keys: Object.keys(updatedStore),
        newStore,
      });
    } else {
      console.warn('[AuthContext] updateStore called but no store in context');
    }
  };

  // Listen to localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'store' && event.newValue) {
        try {
          const updatedStore = JSON.parse(event.newValue);
          console.log('[AuthContext] Store updated from another tab:', updatedStore);
          setStore(updatedStore);
        } catch (err) {
          console.error('[AuthContext] Failed to parse store from storage event:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Periodically refresh branding from server as fallback (every 30 seconds)
  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;

    const refreshBranding = async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/stores/branding`, {
          headers: {
            'x-store-id': storeId,
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          console.error('[AuthContext] Branding refresh failed:', response.status);
          return;
        }

        const data = await response.json();
        if (!data.success || !data.data) {
          console.error('[AuthContext] Invalid branding response');
          return;
        }

        if (!isMounted) return;

        // Always update to ensure fresh values
        console.log('[AuthContext] Refreshing branding from server');
        setStore((prevStore) => {
          if (!prevStore) return prevStore;
          const newStore = {
            ...prevStore,
            backgroundImage: data.data.backgroundImage,
            primaryColor: data.data.primaryColor,
            secondaryColor: data.data.secondaryColor,
            accentColor: data.data.accentColor,
          };
          localStorage.setItem('store', JSON.stringify(newStore));
          return newStore;
        });
      } catch (err) {
        console.error('[AuthContext] Failed to refresh branding:', err);
      }
    };

    // Initial refresh
    refreshBranding();

    // Then set interval for periodic refresh
    const interval = setInterval(refreshBranding, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [storeId]);

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