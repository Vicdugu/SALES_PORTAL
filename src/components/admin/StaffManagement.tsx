'use client';

import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'STAFF' | 'KITCHEN' | 'ADMIN';
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
  email: string;
}

export function StaffManagement() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STAFF' as 'STAFF' | 'KITCHEN' | 'ADMIN',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      fetchStores();
    } else {
      fetchStaff();
    }
  }, [user]);

  useEffect(() => {
    if (selectedStore) {
      // Fetch staff for the selected store (superadmin)
      fetchStaffForStore(selectedStore);
    } else if (user?.role !== 'SUPERADMIN') {
      fetchStaff();
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      const response = await apiCall('/api/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data.data || []);
        // Auto-select first store
        if (data.data && data.data.length > 0) {
          setSelectedStore(data.data[0].id);
        }
      } else {
        setError('Failed to load stores');
      }
    } catch (err) {
      setError('Error fetching stores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      setError(null);
      setStaff([]); // Clear staff before fetching
      
      // DEBUG: Check what storeId we have
      const storedStoreId = typeof window !== 'undefined' ? localStorage.getItem('storeId') : null;
      const storedUser = typeof window !== 'undefined' && localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
      
      console.log('[StaffManagement] fetchStaff called', {
        storedStoreId,
        userRole: user?.role,
        userStoreId: user?.storeId,
        storedUserStoreId: storedUser?.storeId,
      });
      
      if (!storedStoreId && user?.role !== 'SUPERADMIN') {
        setError('Store ID not found. Please log in again.');
        setStaff([]);
        setLoading(false);
        return;
      }
      
      // For non-superadmin users, include storeId as query parameter
      const url = storedStoreId ? `/api/users?storeId=${storedStoreId}` : '/api/users';
      const response = await apiCall(url);
      if (response.ok) {
        const data = await response.json();
        console.log('[StaffManagement] Staff fetched successfully', { count: data.data?.length });
        setStaff(data.data || []);
      } else {
        const errorData = await response.json();
        console.error('[StaffManagement] API error', errorData);
        setError(errorData.error?.message || 'Failed to load staff');
        setStaff([]); // Ensure staff is cleared on error
      }
    } catch (err) {
      console.error('[StaffManagement] Error fetching staff', err);
      setError('Error fetching staff');
      setStaff([]); // Ensure staff is cleared on error
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffForStore = async (storeId: string) => {
    try {
      setError(null);
      setLoading(true);
      setStaff([]); // Clear staff before fetching
      
      console.log('[StaffManagement] fetchStaffForStore called with storeId:', storeId);
      
      const response = await apiCall(`/api/users?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[StaffManagement] Staff fetched successfully for store', storeId, {
          rawResponse: data,
          staffCount: data.data?.length,
          staff: data.data,
        });
        setStaff(data.data || []);
      } else {
        const errorData = await response.json();
        console.error('[StaffManagement] API error fetching staff for store', storeId, errorData);
        setError(errorData.error?.message || 'Failed to load staff for this store');
        setStaff([]); // Ensure staff is cleared on error
      }
    } catch (err) {
      console.error('[StaffManagement] Error fetching staff for store:', err);
      setError('Error fetching staff');
      setStaff([]); // Ensure staff is cleared on error
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // For superadmin, require store selection
    if (user?.role === 'SUPERADMIN' && !selectedStore) {
      setError('Please select a store');
      return;
    }

    setSubmitting(true);

    try {
      const requestBody: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      // For superadmin, include the storeId
      if (user?.role === 'SUPERADMIN') {
        requestBody.storeId = selectedStore;
      }

      console.log('[StaffManagement] Creating staff with request body:', requestBody);

      const response = await apiCall('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create staff');
      }

      const newUser = await response.json();
      
      console.log('[StaffManagement] Staff created successfully:', newUser);
      
      const storeName = stores.find(s => s.id === selectedStore)?.name || 'Store';
      
      setSuccessMessage(
        `✅ Staff Account Created Successfully!\n\n` +
        `Name: ${formData.name}\n` +
        `Email: ${formData.email}\n` +
        `Password: ${formData.password}\n` +
        `Role: ${formData.role}\n` +
        `Store: ${storeName}\n\n` +
        `⏱️ The staff member can log in immediately using these credentials.`
      );
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'STAFF',
      });
      setShowForm(false);

      // Refresh staff list to ensure new staff appears
      if (user?.role === 'SUPERADMIN' && selectedStore) {
        console.log('[StaffManagement] Refreshing staff list for superadmin store:', selectedStore);
        setTimeout(() => fetchStaffForStore(selectedStore), 500);
      } else {
        console.log('[StaffManagement] Refreshing staff list for store admin');
        setTimeout(() => fetchStaff(), 500);
      }

      // Clear success message after 7 seconds (longer for reading credentials)
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (err) {
      console.error('[StaffManagement] Error creating staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to create staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(staffId);
    setError(null);

    try {
      const response = await apiCall(`/api/users?id=${staffId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete staff');
      }

      setStaff((prev) => prev.filter((member) => member.id !== staffId));
      setSuccessMessage(`✓ ${staffName} has been removed successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading staff...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Staff Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            theme === 'dark'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {showForm ? '✕ Cancel' : '+ Add New Staff'}
        </button>
      </div>

      {/* Store Selector for Superadmin */}
      {user?.role === 'SUPERADMIN' && stores.length > 0 && (
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border border-white/60 backdrop-blur-md'} p-4 rounded-lg`}>
          <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Select Store to Manage
          </label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-600`}
          >
            <option value="">Choose a store...</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className={`p-4 rounded-lg border whitespace-pre-line ${theme === 'dark' ? 'bg-green-900/30 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <p className="font-semibold">Success!</p>
          <p className="text-sm mt-1">{successMessage}</p>
        </div>
      )}

      {/* Add Staff Form */}
      {showForm && (
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-2xl shadow-lg border`}>
          <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create New Staff Profile</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'border border-gray-300 text-gray-900'
                }`}
                disabled={submitting}
              />
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@example.com"
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'border border-gray-300 text-gray-900'
                }`}
                disabled={submitting}
              />
            </div>

            {/* Role */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'border border-gray-300 text-gray-900'
                }`}
                disabled={submitting}
              >
                <option value="STAFF">Cashier / Till</option>
                <option value="KITCHEN">Kitchen Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                STAFF: Can use till system | KITCHEN: Can view order queue | ADMIN: Full access
              </p>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'border border-gray-300 text-gray-900'
                }`}
                disabled={submitting}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm password"
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'border border-gray-300 text-gray-900'
                }`}
                disabled={submitting}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition"
            >
              {submitting ? 'Creating Staff...' : 'Create Staff Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Staff List */}
      <div className={`rounded-2xl shadow-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Current Staff ({staff.length})</h3>
        </div>

        {staff.length === 0 ? (
          <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>No staff members yet</p>
            <p className="text-sm mt-2">Click "Add New Staff" to create profiles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Role</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Created</th>
                  <th className={`px-6 py-3 text-center text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className={`border-b transition ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{member.name}</td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{member.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          member.role === 'ADMIN'
                            ? theme === 'dark' ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-800'
                            : member.role === 'KITCHEN'
                            ? theme === 'dark' ? 'bg-yellow-900/50 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                            : theme === 'dark' ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        disabled={deletingId === member.id}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {deletingId === member.id ? 'Deleting...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
        <p className="text-sm">
          <strong>💡 Note:</strong> Staff can log in with their email and password. Each role has different
          access levels and permissions within the system.
        </p>
      </div>
    </div>
  );
}
