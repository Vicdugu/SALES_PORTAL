'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { apiCall } from '@/lib/api/client';
import { useAuth, useStore } from '@/contexts/AuthContext';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export function InventoryManagement() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const store = useStore();
  const currencySymbol = getCurrencySymbol(store.currency);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Food',
    unitPrice: '',
    quantity: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/inventory');
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
      } else {
        setError('Failed to load inventory items');
      }
    } catch (err) {
      setError('Error fetching inventory');
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
          unitPrice: formData.unitPrice,
          quantity: formData.quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save item');
      }

      const savedItem = await response.json();

      if (editingItem) {
        setItems((prev) =>
          prev.map((item) => (item.id === editingItem.id ? savedItem.data : item))
        );
        setSuccessMessage(`✓ Item updated: ${formData.name}`);
      } else {
        setItems((prev) => [...prev, savedItem.data]);
        setSuccessMessage(`✓ Item created: ${formData.name}`);
      }

      resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity.toString(),
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const response = await apiCall(`/api/inventory/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSuccessMessage(`✓ Item deleted: ${item.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  if (loading) {
    return <div className={`p-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Meals & Drinks Management
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            theme === 'dark'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {showForm ? '✕ Cancel' : '+ Add New Item'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-green-900/30 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {successMessage}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border border-white/60 backdrop-blur-md'} p-6 rounded-2xl`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Burger, Coke"
                  disabled={submitting}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                  required
                >
                  <option value="Food">Food</option>
                  <option value="Drink">Drink</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Price *
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={formData.unitPrice}
                  onChange={handleInputChange}
                  placeholder="e.g., 5.99"
                  step="0.01"
                  min="0"
                  disabled={submitting}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="e.g., 50"
                  min="0"
                  disabled={submitting}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 px-6 py-2 rounded-lg font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white'
                }`}
              >
                {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className={`flex-1 px-6 py-2 rounded-lg font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-900'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border border-white/60 backdrop-blur-md'} p-6 rounded-2xl`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Current Menu Items ({items.length})
        </h3>

        {items.length === 0 ? (
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            No items yet. Add your first meal or drink to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-right py-3 px-4">Price</th>
                  <th className="text-right py-3 px-4">Quantity</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b transition ${
                      theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-700/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.category === 'Food'
                          ? theme === 'dark'
                            ? 'bg-orange-900/50 text-orange-300'
                            : 'bg-orange-100 text-orange-700'
                          : item.category === 'Drink'
                          ? theme === 'dark'
                            ? 'bg-blue-900/50 text-blue-300'
                            : 'bg-blue-100 text-blue-700'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                    <td className="text-right py-3 px-4">{item.quantity}</td>
                    <td className="text-center py-3 px-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(item)}
                          disabled={submitting}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            theme === 'dark'
                              ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={submitting}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            theme === 'dark'
                              ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white'
                              : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
