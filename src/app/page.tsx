'use client';

import { useAuth, useStore } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

interface Store {
  id: string;
  name: string;
  email: string;
  logo?: string;
}

export default function Home() {
  const { user, storeId, selectStore, logout } = useAuth();
  const store = useStore();
  const primaryColor = store?.primaryColor || '#000000';
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch user's stores
    fetchStores();
  }, [user, router]);

  const fetchStores = async () => {
    try {
      const { apiCall } = await import('@/lib/api/client');
      const response = await apiCall('/api/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (id: string) => {
    selectStore(id);
    const route = getRouteForRole(user?.role);
    router.push(route);
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return '👨‍💼';
      case 'KITCHEN':
        return '👨‍🍳';
      case 'STAFF':
      default:
        return '💰';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin Dashboard';
      case 'KITCHEN':
        return 'Kitchen Dashboard';
      case 'STAFF':
      default:
        return 'Till System';
    }
  };

  const getRouteForRole = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return '/admin';
      case 'KITCHEN':
        return '/kitchen';
      case 'STAFF':
      default:
        return '/till';
    }
  };

  const handleQuickAccess = () => {
    if (stores.length > 0) {
      handleStoreSelect(stores[0].id);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header with Quick Access */}
        <div className="mb-12">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales Till System</h1>
              <p className="text-gray-600 text-lg">
                Welcome, <span className="font-semibold">{user?.name}</span> ({user?.role})
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition"
            >
              Logout
            </button>
          </div>

          {/* Quick Access Button */}
          {stores.length > 0 && (
            <button
              onClick={handleQuickAccess}
              style={{
                backgroundColor: primaryColor,
              }}
              className="w-full text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all font-bold text-xl hover:scale-105 transform opacity-90 hover:opacity-100"
            >
              <span className="text-2xl mr-3">{getRoleIcon(user?.role)}</span>
              {getRoleLabel(user?.role)}
              <span className="ml-3">→</span>
            </button>
          )}
        </div>

        {/* Stores Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Store</h2>
          {stores.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">No stores found</p>
              <p className="text-sm text-gray-600">Contact your admin to set up a store</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStoreSelect(store.id)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 text-left transform hover:scale-105 group"
                >
                  {store.logo && (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-full h-40 object-cover rounded mb-4 group-hover:opacity-90 transition"
                    />
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{store.name}</h3>
                  <p className="text-gray-500 text-sm">{store.email}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-2xl mb-2">💰</p>
            <h3 className="font-bold text-gray-900 mb-2">Till System</h3>
            <p className="text-sm text-gray-600">
              For cashiers to process orders, manage cart, and accept payments
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-2xl mb-2">👨‍🍳</p>
            <h3 className="font-bold text-gray-900 mb-2">Kitchen Dashboard</h3>
            <p className="text-sm text-gray-600">
              For kitchen staff to view orders and update preparation status
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-2xl mb-2">📊</p>
            <h3 className="font-bold text-gray-900 mb-2">Admin Dashboard</h3>
            <p className="text-sm text-gray-600">
              For admins to manage staff, view analytics, and settings
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
