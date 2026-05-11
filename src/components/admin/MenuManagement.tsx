'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { apiCall } from '@/lib/api/client';
import { useAuth, useStore } from '@/contexts/AuthContext';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface MenuItem {
  id: string;
  name: string;
  category: 'Food' | 'Drink';
  unitPrice: number;
  quantity: number;
}

export function MenuManagement() {
  const { theme } = useTheme();
  const { user, storeId } = useAuth();
  const store = useStore();
  const currencySymbol = getCurrencySymbol(store?.currency || 'USD');
  
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Food' as 'Food' | 'Drink',
    unitPrice: '',
    quantity: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, [storeId]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall('/api/inventory');
      if (response.ok) {
        const data = await response.json();
        // Filter to only Food and Drink items
        const menuItems = (data.data || []).filter((item: MenuItem) => 
          item.category === 'Food' || item.category === 'Drink'
        );
        setItems(menuItems);
      } else {
        setError('Failed to load menu items');
      }
    } catch (err) {
      setError('Error fetching menu items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', category: 'Food', unitPrice: '', quantity: '' });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!formData.name || !formData.category || !formData.unitPrice || !formData.quantity) {
      setError('All fields are required');
      return;
    }

    if (parseFloat(formData.unitPrice) <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    if (parseInt(formData.quantity) < 0) {
      setError('Quantity cannot be negative');
      return;
    }

    setSubmitting(true);

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `/api/inventory/${editingItem.id}` : '/api/inventory';

      const response = await apiCall(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          unitPrice: parseFloat(formData.unitPrice),
          quantity: parseInt(formData.quantity),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to ${editingItem ? 'update' : 'add'} menu item`);
      }

      const result = await response.json();
      
      if (editingItem) {
        setItems((prev) =>
          prev.map((item) => (item.id === editingItem.id ? result.data : item))
        );
        setSuccessMessage('✓ Menu item updated successfully');
      } else {
        setItems((prev) => [result.data, ...prev]);
        setSuccessMessage('✓ Menu item added successfully');
      }

      resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingItem ? 'update' : 'add'} menu item`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(itemId);
    setError(null);

    try {
      const response = await apiCall(`/api/inventory/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete item');
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setSuccessMessage(`✓ "${itemName}" deleted successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete menu item');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading menu items...</div>;
  }

  const foodItems = items.filter((item) => item.category === 'Food');
  const drinkItems = items.filter((item) => item.category === 'Drink');

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            🍽️ Menu Management for {store?.name}
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Add and manage food and drink items for this store
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          {showForm ? '✕ Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`mb-6 p-4 rounded-lg border-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Item Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Grilled Chicken"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="Food">Food</option>
                <option value="Drink">Drink</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Price ({currencySymbol})
              </label>
              <input
                type="number"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Available Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-700'}`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          No menu items yet. Add your first item to get started!
        </div>
      ) : (
        <div className="space-y-6">
          {/* Food Items */}
          {foodItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🍔 Food Items ({foodItems.length})
              </h3>
              <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                <table className="w-full">
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <tr>
                      <th className={`px-4 py-2 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Name
                      </th>
                      <th className={`px-4 py-2 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Price
                      </th>
                      <th className={`px-4 py-2 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Available
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.map((item) => (
                      <tr key={item.id} className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {item.name}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {currencySymbol}{item.unitPrice.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.quantity} units
                        </td>
                        <td className="px-4 py-3 text-center space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            disabled={deletingId === item.id}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drink Items */}
          {drinkItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🥤 Drink Items ({drinkItems.length})
              </h3>
              <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                <table className="w-full">
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <tr>
                      <th className={`px-4 py-2 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Name
                      </th>
                      <th className={`px-4 py-2 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Price
                      </th>
                      <th className={`px-4 py-2 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Available
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {drinkItems.map((item) => (
                      <tr key={item.id} className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {item.name}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {currencySymbol}{item.unitPrice.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.quantity} units
                        </td>
                        <td className="px-4 py-3 text-center space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            disabled={deletingId === item.id}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className={`mt-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
        <p className="text-sm">
          <strong>💡 Note:</strong> All menu items added here will appear instantly in the store's Till interface, Kitchen dashboard, and Admin dashboard.
        </p>
      </div>
    </div>
  );
}
