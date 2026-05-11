'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth, useStore } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/api/client';

interface Advert {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link?: string;
  caption?: string;
  storeId?: string;
  isActive: boolean;
}

interface Store {
  id: string;
  name: string;
}

export function AdvertManagement() {
  const { theme } = useTheme();
  const { user, storeId } = useAuth();
  const store = useStore();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | 'universal'>('universal');
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAdvert, setEditingAdvert] = useState<Advert | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    link: '',
    caption: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchAdverts();
  }, [selectedStoreId]);

  const fetchStores = async () => {
    try {
      const response = await apiCall('/api/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchAdverts = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/adverts';
      // Always pass storeId to API - empty string for universal view
      if (selectedStoreId !== 'universal') {
        url += `?storeId=${selectedStoreId}`;
      }

      const response = await apiCall(url);
      if (response.ok) {
        const data = await response.json();
        // API returns already filtered adverts
        setAdverts(data.data || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load adverts');
      }
    } catch (err) {
      setError('Error fetching adverts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 500KB)
    const maxSizeInBytes = 500 * 1024; // 500KB
    if (file.size > maxSizeInBytes) {
      setError(`Image must be smaller than 500KB. Your file is ${(file.size / 1024).toFixed(2)}KB`);
      return;
    }

    setImageUploadLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData((prev) => ({ ...prev, imageUrl: base64 }));
        setImageUploadLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
      setImageUploadLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', imageUrl: '', link: '', caption: '' });
    setEditingAdvert(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.title || !formData.imageUrl) {
      setError('Title and image are required');
      return;
    }

    setSubmitting(true);

    try {
      const method = editingAdvert ? 'PUT' : 'POST';
      const url = editingAdvert ? `/api/adverts/${editingAdvert.id}` : '/api/adverts';

      const body = {
        title: formData.title,
        description: formData.description || null,
        imageUrl: formData.imageUrl,
        link: formData.link || null,
        caption: formData.caption || null,
        storeId: selectedStoreId === 'universal' ? null : selectedStoreId,
      };

      const response = await apiCall(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to ${editingAdvert ? 'update' : 'add'} advert`);
      }

      const result = await response.json();

      if (editingAdvert) {
        setAdverts((prev) =>
          prev.map((advert) => (advert.id === editingAdvert.id ? result.data : advert))
        );
        setSuccessMessage('✓ Advert updated successfully');
      } else {
        setAdverts((prev) => [result.data, ...prev]);
        setSuccessMessage('✓ Advert created successfully');
      }

      resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingAdvert ? 'update' : 'add'} advert`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (advert: Advert) => {
    setEditingAdvert(advert);
    setFormData({
      title: advert.title,
      description: advert.description || '',
      imageUrl: advert.imageUrl,
      link: advert.link || '',
      caption: advert.caption || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (advertId: string, advertTitle: string) => {
    if (!confirm(`Delete "${advertTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(advertId);
    setError(null);

    try {
      const response = await apiCall(`/api/adverts/${advertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete advert');
      }

      setAdverts((prev) => prev.filter((advert) => advert.id !== advertId));
      setSuccessMessage(`✓ "${advertTitle}" deleted successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete advert');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📢 Advert Management
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Create promotional banners visible to store customers
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          {showForm ? '✕ Cancel' : '+ Add Advert'}
        </button>
      </div>

      {/* Store Selection */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Select Target Audience
        </label>
        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className={`w-full max-w-xs px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
        >
          <option value="universal">🌍 Universal (All Stores)</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
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
        <form
          onSubmit={handleSubmit}
          className={`mb-6 p-4 rounded-lg border-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editingAdvert ? 'Edit Advert' : 'Create New Advert'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Summer Sale 2026"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                CTA Label
              </label>
              <input
                type="text"
                name="caption"
                value={formData.caption}
                onChange={handleInputChange}
                placeholder="e.g., Shop Now, Learn More"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Clickable Link
              </label>
              <input
                type="url"
                name="link"
                value={formData.link}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Upload Image * <span className="text-xs text-gray-500">(Max 500KB)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={imageUploadLoading}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
              />
              {imageUploadLoading && <p className="text-xs text-gray-500 mt-1">Processing image...</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional description..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>

          {formData.imageUrl && (
            <div className="mb-4">
              <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Preview
              </p>
              <div className="relative w-40 h-32 rounded-lg overflow-hidden border">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || imageUploadLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingAdvert ? 'Update Advert' : 'Create Advert'}
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

      {/* Adverts List */}
      {loading ? (
        <div className="text-center py-8">Loading adverts...</div>
      ) : adverts.length === 0 ? (
        <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          No adverts yet. Create your first promotional banner!
        </div>
      ) : (
        <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title
                </th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Preview
                </th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  CTA
                </th>
                <th className={`px-4 py-3 text-center text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {adverts.map((advert) => (
                <tr
                  key={advert.id}
                  className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                    <div>
                      <p className="font-semibold">{advert.title}</p>
                      {advert.description && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {advert.description.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative w-16 h-12 rounded border overflow-hidden">
                      <img
                        src={advert.imageUrl}
                        alt={advert.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {advert.caption || '—'}
                  </td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(advert)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(advert.id, advert.title)}
                      disabled={deletingId === advert.id}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === advert.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div
        className={`mt-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}
      >
        <p className="text-sm">
          <strong>💡 Note:</strong> Universal adverts appear on all stores. Store-specific adverts only appear on the selected store's interface.
        </p>
      </div>
    </div>
  );
}
