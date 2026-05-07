'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SalesAnalytics } from '@/components/admin/SalesAnalytics';
import { StaffManagement } from '@/components/admin/StaffManagement';
import { SystemCleanup } from '@/components/admin/SystemCleanup';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { TransactionHistory } from '@/components/admin/TransactionHistory';
import { BrandingSettings } from '@/components/admin/BrandingSettings';
import { BrandingHeader } from '@/components/BrandingHeader';
import { useBrandingUpdates } from '@/hooks/useBrandingUpdates';

export const dynamic = 'force-dynamic';

type AdminTab = 'analytics' | 'staff' | 'inventory' | 'settings' | 'cleanup' | 'transactions';

export default function AdminPage() {
  const { user, store, isLoading } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  
  // Listen for real-time branding updates and refresh when changes occur
  useBrandingUpdates();
  
  // Get store branding colors
  const primaryColor = store?.primaryColor || '#000000';
  
  // Initialize date range to last 30 days
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };
  
  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

  useEffect(() => {
    // Initialize theme from localStorage
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      setTheme('dark');
    }
  }, []);

  // Calculate days from date range
  const calculateDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    return diffDays;
  };

  const days = calculateDays();

  // Memoize tab change handler for faster response (must be before conditional logic)
  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
  }, []);

  // Show nothing while auth is loading to avoid flashing access denied
  if (isLoading) {
    return null;
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    return <div className="p-8 text-red-600">Access denied. Admin only.</div>;
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'} relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-0 w-96 h-96 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-400/20'} rounded-full blur-3xl animate-pulse`}></div>
        <div className={`absolute top-1/2 right-0 w-96 h-96 ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-400/20'} rounded-full blur-3xl animate-pulse delay-700`}></div>
        <div className={`absolute bottom-0 left-1/2 w-96 h-96 ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-400/20'} rounded-full blur-3xl animate-pulse delay-1000`}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Branding Header */}
        <div className="px-4 pt-4">
          <BrandingHeader />
        </div>

        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border-white/60'} backdrop-blur-md border-b shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {user.role === 'SUPERADMIN' ? '🔐 Superadmin Dashboard' : 'Admin Dashboard'}
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {user.role === 'SUPERADMIN' ? 'System Admin' : 'Admin'}: {user.name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => router.back()}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                }`}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Main Content with Left Sidebar Tabs */}
        <div className="flex min-h-screen">
          {/* Left Sidebar Tabs */}
          <div className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-white/60'} backdrop-blur-md border-r w-64`}>
            <div className="flex flex-col pt-4 px-2">
              <button
                onClick={() => handleTabChange('analytics')}
                style={{
                  borderLeftColor: activeTab === 'analytics' ? primaryColor : 'transparent',
                  color: activeTab === 'analytics' ? primaryColor : (theme === 'dark' ? '#c5cad3' : '#4B5563'),
                  backgroundColor: activeTab === 'analytics' ? (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-semibold transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 will-change-colors text-left rounded-l"
              >
                📊 Sales Analytics
              </button>
              <button
                onClick={() => handleTabChange('staff')}
                style={{
                  borderLeftColor: activeTab === 'staff' ? primaryColor : 'transparent',
                  color: activeTab === 'staff' ? primaryColor : (theme === 'dark' ? '#c5cad3' : '#4B5563'),
                  backgroundColor: activeTab === 'staff' ? (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-semibold transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 will-change-colors text-left rounded-l"
              >
                👥 Staff Management
              </button>
              <button
                onClick={() => handleTabChange('inventory')}
                style={{
                  borderLeftColor: activeTab === 'inventory' ? primaryColor : 'transparent',
                  color: activeTab === 'inventory' ? primaryColor : (theme === 'dark' ? '#c5cad3' : '#4B5563'),
                  backgroundColor: activeTab === 'inventory' ? (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-semibold transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 will-change-colors text-left rounded-l"
              >
                🍔 Meals & Drinks
              </button>
              <button
                onClick={() => handleTabChange('settings')}
                style={{
                  borderLeftColor: activeTab === 'settings' ? primaryColor : 'transparent',
                  color: activeTab === 'settings' ? primaryColor : (theme === 'dark' ? '#c5cad3' : '#4B5563'),
                  backgroundColor: activeTab === 'settings' ? (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-semibold transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 will-change-colors text-left rounded-l"
              >
                ⚙️ Store Settings
              </button>
              {user.role === 'SUPERADMIN' && (
                <>
                  <button
                    onClick={() => handleTabChange('transactions')}
                    style={{
                      borderLeftColor: activeTab === 'transactions' ? primaryColor : 'transparent',
                      color: activeTab === 'transactions' ? primaryColor : (theme === 'dark' ? '#c5cad3' : '#4B5563'),
                      backgroundColor: activeTab === 'transactions' ? (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent',
                    }}
                    className="py-4 px-4 border-l-4 font-semibold transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 will-change-colors text-left rounded-l"
                  >
                    📋 All Transactions
                  </button>
                  <button
                    onClick={() => handleTabChange('cleanup')}
                    style={{
                      borderLeftColor: activeTab === 'cleanup' ? primaryColor : 'transparent',
                      color: activeTab === 'cleanup' ? primaryColor : (theme === 'dark' ? '#c5cad3' : '#4B5563'),
                      backgroundColor: activeTab === 'cleanup' ? (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent',
                    }}
                    className="py-4 px-4 border-l-4 font-semibold transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 will-change-colors text-left rounded-l"
                  >
                    🧹 System Cleanup
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 px-4 py-8">
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              {/* Date Range Selector */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1">
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      borderColor: theme === 'dark' ? '#3a4456' : '#D1D5DB',
                      '--input-border-focus': primaryColor,
                      '--input-ring-focus': `${primaryColor}80`,
                    } as React.CSSProperties & { '--input-border-focus': string; '--input-ring-focus': string }}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                      theme === 'dark'
                        ? 'bg-gray-800 border text-white focus:outline-none focus:ring-2'
                        : 'bg-white border text-gray-900 focus:outline-none focus:ring-2'
                    }`}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}80`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme === 'dark' ? '#3a4456' : '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      borderColor: theme === 'dark' ? '#3a4456' : '#D1D5DB',
                    }}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                      theme === 'dark'
                        ? 'bg-gray-800 border text-white focus:outline-none focus:ring-2'
                        : 'bg-white border text-gray-900 focus:outline-none focus:ring-2'
                    }`}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}80`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className={`${theme === 'dark' ? 'bg-gray-700 border border-gray-600 text-gray-300' : 'bg-gray-100 border border-gray-300 text-gray-700'} px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap`}>
                  {days} {days === 1 ? 'day' : 'days'}
                </div>
              </div>
              <SalesAnalytics days={days} />
            </div>
          )}

          {/* Staff Management Tab */}
          {activeTab === 'staff' && (
            <>
              <StaffManagement />
            </>
          )}

          {/* Inventory Management Tab */}
          {activeTab === 'inventory' && <InventoryManagement />}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <BrandingSettings />
            </div>
          )}

          {/* System Cleanup Tab */}
          {activeTab === 'cleanup' && user.role === 'SUPERADMIN' && <SystemCleanup />}

          {/* Transaction History Tab */}
          {activeTab === 'transactions' && user.role === 'SUPERADMIN' && <TransactionHistory />}
          </div>
        </div>
      </div>
    </div>
  );
}
