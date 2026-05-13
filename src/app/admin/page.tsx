'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SalesAnalytics } from '@/components/admin/SalesAnalytics';
import { StaffManagement } from '@/components/admin/StaffManagement';
import { SystemCleanup } from '@/components/admin/SystemCleanup';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { TransactionHistory } from '@/components/admin/TransactionHistory';
import { PendingApprovals } from '@/components/admin/PendingApprovals';
import { BrandingSettings } from '@/components/admin/BrandingSettings';
import { BrandingHeader } from '@/components/BrandingHeader';
import { CompletedTransactions } from '@/components/till/CompletedTransactions';
import { AdvertPanel } from '@/components/AdvertPanel';
import { useBrandingUpdates } from '@/hooks/useBrandingUpdates';
import { NotificationPanel } from '@/components/NotificationPanel';

export const dynamic = 'force-dynamic';

type AdminTab = 'analytics' | 'staff' | 'inventory' | 'settings' | 'completed' | 'cleanup' | 'transactions' | 'approvals';

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

  // SUPERADMIN without a store - needs to select a store first
  if (user.role === 'SUPERADMIN' && !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-12 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold mb-4">System Administrator</h1>
          <p className="text-gray-600 mb-6">
            As a super admin, please select a store from the store selection page to manage it.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Store Selection
          </button>
        </div>
      </div>
    );
  }

  // Regular ADMIN without store - should not happen, but protect anyway
  if (!store) {
    return <div className="p-8 text-red-600">No store assigned. Please contact support.</div>;
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
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Branding Header */}
        <div className="px-4 pt-4">
          <BrandingHeader />
        </div>

        {/* Main Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} backdrop-blur-md border-b-2 shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <h1 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-950'}`}>
                {user.role === 'SUPERADMIN' ? '🔐 Superadmin Dashboard' : 'Admin Dashboard'}
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'} font-semibold text-sm sm:text-base`}>
                {user.role === 'SUPERADMIN' ? 'System Admin' : 'Admin'}: {user.name}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <NotificationPanel
                userRole={user.role}
                buttonClass={theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-yellow-300 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'}
              />
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition border font-bold ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700 text-yellow-300 border-gray-700'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900 border-gray-400'
                }`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => {
                  if (user?.role === 'SUPERADMIN') {
                    router.push('/'); // Go to store selection for superadmin
                  } else {
                    router.back(); // Go back for regular admins
                  }
                }}
                className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition border text-sm sm:text-base ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700'
                    : 'bg-gray-600 hover:bg-gray-700 text-white border-gray-700'
                }`}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className={`md:hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-20 overflow-x-auto`}>
          <div className="flex flex-nowrap px-2 py-2 gap-1">
            <button
              onClick={() => handleTabChange('analytics')}
              className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'analytics'
                  ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                  : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
              }`}
            >
              📊 Analytics
            </button>
            <button
              onClick={() => handleTabChange('staff')}
              className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'staff'
                  ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                  : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
              }`}
            >
              👥 Staff
            </button>
            <button
              onClick={() => handleTabChange('inventory')}
              className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'inventory'
                  ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                  : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
              }`}
            >
              🍔 Inventory
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'settings'
                  ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                  : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
              }`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => handleTabChange('completed')}
              className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'completed'
                  ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                  : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
              }`}
            >
              📦 Completed
            </button>
            {user.role === 'SUPERADMIN' && (
              <>
                <button
                  onClick={() => handleTabChange('approvals')}
                  className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                    activeTab === 'approvals'
                      ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                      : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                >
                  ⏳ Approvals
                </button>
                <button
                  onClick={() => handleTabChange('transactions')}
                  className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                    activeTab === 'transactions'
                      ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                      : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                >
                  📋 Transactions
                </button>
                <button
                  onClick={() => handleTabChange('cleanup')}
                  className={`px-3 py-2 rounded text-sm font-bold whitespace-nowrap transition-colors ${
                    activeTab === 'cleanup'
                      ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`
                      : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                >
                  🧹 Cleanup
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content with Left Sidebar Tabs (Desktop) and Content Area */}
        <div className="flex flex-1">
          {/* Left Sidebar Tabs - Desktop Only */}
          <div className={`hidden md:flex flex-col ${theme === 'dark' ? 'bg-gray-900/70 border-gray-700' : 'bg-white border-gray-300'} backdrop-blur-md border-r-2 w-64 flex-shrink-0 overflow-y-auto`}>
            <div className="flex flex-col pt-4 px-2">
              <button
                onClick={() => handleTabChange('analytics')}
                style={{
                  borderLeftColor: activeTab === 'analytics' ? primaryColor : 'transparent',
                  color: activeTab === 'analytics' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                  backgroundColor: activeTab === 'analytics' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
              >
                📊 Sales Analytics
              </button>
              <button
                onClick={() => handleTabChange('staff')}
                style={{
                  borderLeftColor: activeTab === 'staff' ? primaryColor : 'transparent',
                  color: activeTab === 'staff' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                  backgroundColor: activeTab === 'staff' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
              >
                👥 Staff Management
              </button>
              <button
                onClick={() => handleTabChange('inventory')}
                style={{
                  borderLeftColor: activeTab === 'inventory' ? primaryColor : 'transparent',
                  color: activeTab === 'inventory' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                  backgroundColor: activeTab === 'inventory' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
              >
                🍔 Meals & Drinks
              </button>
              <button
                onClick={() => handleTabChange('settings')}
                style={{
                  borderLeftColor: activeTab === 'settings' ? primaryColor : 'transparent',
                  color: activeTab === 'settings' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                  backgroundColor: activeTab === 'settings' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
              >
                ⚙️ Store Settings
              </button>
              <button
                onClick={() => handleTabChange('completed')}
                style={{
                  borderLeftColor: activeTab === 'completed' ? primaryColor : 'transparent',
                  color: activeTab === 'completed' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                  backgroundColor: activeTab === 'completed' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                }}
                className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
              >
                📦 Completed Transactions
              </button>
              {user.role === 'SUPERADMIN' && (
                <>
                  <button
                    onClick={() => handleTabChange('approvals')}
                    style={{
                      borderLeftColor: activeTab === 'approvals' ? primaryColor : 'transparent',
                      color: activeTab === 'approvals' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                      backgroundColor: activeTab === 'approvals' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                    }}
                    className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
                  >
                    ⏳ Pending Approvals
                  </button>
                  <button
                    onClick={() => handleTabChange('transactions')}
                    style={{
                      borderLeftColor: activeTab === 'transactions' ? primaryColor : 'transparent',
                      color: activeTab === 'transactions' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                      backgroundColor: activeTab === 'transactions' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                    }}
                    className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
                  >
                    📋 All Transactions
                  </button>
                  <button
                    onClick={() => handleTabChange('cleanup')}
                    style={{
                      borderLeftColor: activeTab === 'cleanup' ? primaryColor : 'transparent',
                      color: activeTab === 'cleanup' ? primaryColor : (theme === 'dark' ? '#E5E7EB' : '#1F2937'),
                      backgroundColor: activeTab === 'cleanup' ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                    }}
                    className="py-4 px-4 border-l-4 font-bold transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-800 will-change-colors text-left rounded-l"
                  >
                    🧹 System Cleanup
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 px-2 sm:px-4 md:px-6 py-4 sm:py-6 overflow-y-auto">
            {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              {/* Date Range Selector */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-4 items-start sm:items-end">
                <div className="flex-1 w-full">
                  <label className={`block text-xs sm:text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      borderColor: theme === 'dark' ? '#3a4456' : '#D1D5DB',
                    } as React.CSSProperties}
                    className={`w-full px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition ${
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
                <div className="flex-1 w-full">
                  <label className={`block text-xs sm:text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      borderColor: theme === 'dark' ? '#3a4456' : '#D1D5DB',
                    }}
                    className={`w-full px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition ${
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
                <div className={`${theme === 'dark' ? 'bg-gray-700 border border-gray-600 text-gray-300' : 'bg-gray-100 border border-gray-300 text-gray-700'} px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap`}>
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

          {/* Completed Transactions Tab */}
          {activeTab === 'completed' && (
            <div className="h-auto sm:h-[600px] md:h-[600px]">
              <CompletedTransactions isActive={activeTab === 'completed'} />
            </div>
          )}

          {/* System Cleanup Tab */}
          {activeTab === 'cleanup' && user.role === 'SUPERADMIN' && <SystemCleanup />}

          {/* Pending Approvals Tab */}
          {activeTab === 'approvals' && user.role === 'SUPERADMIN' && <PendingApprovals />}

          {/* Transaction History Tab */}
          {activeTab === 'transactions' && user.role === 'SUPERADMIN' && <TransactionHistory />}
          </div>

          {/* Advert Panel Sidebar - Right Side (Desktop only) */}
          <div className="hidden lg:flex order-2 flex-shrink-0">
            <AdvertPanel />
          </div>
        </div>

        {/* Advert Panel Mobile Floating Button */}
        <div className="lg:hidden">
          <AdvertPanel />
        </div>
      </div>
    </div>
  );
}

