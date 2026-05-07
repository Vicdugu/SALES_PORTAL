'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/api/client';

interface BrandingData {
  backgroundImage?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export function BrandingSettings() {
  const { store, updateStore } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [branding, setBranding] = useState<BrandingData>({
    backgroundImage: store?.backgroundImage,
    primaryColor: store?.primaryColor || '#000000',
    secondaryColor: store?.secondaryColor || '#ffffff',
    accentColor: store?.accentColor || '#0066cc',
  });
  const [bgPreview, setBgPreview] = useState<string | null>(store?.backgroundImage || null);

  const handleImageUpload = async (
    file: File,
    imageType: 'backgroundImage'
  ) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', imageType);

      const response = await apiCall('/api/stores/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.dataUrl) {
          const dataUrl = data.data.dataUrl;
          setBranding((prev) => ({
            ...prev,
            [imageType]: dataUrl,
          }));

          setBgPreview(dataUrl);

          setMessage({ type: 'success', text: `Background uploaded successfully` });
        }
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error?.message || `Failed to upload background` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to upload background` });
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/stores/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Update the store context with the new branding data
          updateStore({
            backgroundImage: data.data.backgroundImage,
            primaryColor: data.data.primaryColor,
            secondaryColor: data.data.secondaryColor,
            accentColor: data.data.accentColor,
          });
          setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
        }
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error?.message || 'Failed to save branding settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save branding settings' });
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = (imageType: 'backgroundImage') => {
    setBranding((prev) => ({
      ...prev,
      [imageType]: undefined,
    }));

    if (imageType === 'backgroundImage') {
      setBgPreview(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Background Upload */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🎨</span> Background/Wallpaper
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Upload a background image to be displayed on staff pages (max 5MB, recommended: wide aspect ratio)
        </p>

        <div className="flex gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            <div className="w-48 h-32 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center overflow-hidden">
              {bgPreview ? (
                <img 
                  src={bgPreview} 
                  alt="Background preview" 
                  className="w-full h-full object-cover" 
                  onLoad={() => console.log('Background preview loaded')}
                  onError={(e) => console.error('Background preview failed to load:', e)}
                />
              ) : (
                <span className="text-gray-400 text-4xl">🖼️</span>
              )}
            </div>
            {bgPreview && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                ✓ Background ready
              </p>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 flex flex-col justify-center gap-4">
            <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
              <span className="text-sm font-medium text-gray-700">Choose image...</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleImageUpload(e.target.files[0], 'backgroundImage');
                  }
                }}
                disabled={loading}
              />
            </label>

            {bgPreview && (
              <button
                onClick={() => handleRemoveImage('backgroundImage')}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
                disabled={loading}
              >
                Remove Background
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Color Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🎯</span> Brand Colors
        </h3>
        <p className="text-gray-600 text-sm mb-6">
          Customize your store's brand colors
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    primaryColor: e.target.value,
                  }))
                }
                className="w-16 h-10 rounded cursor-pointer"
                disabled={loading}
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    primaryColor: e.target.value,
                  }))
                }
                placeholder="#000000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={branding.secondaryColor}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    secondaryColor: e.target.value,
                  }))
                }
                className="w-16 h-10 rounded cursor-pointer"
                disabled={loading}
              />
              <input
                type="text"
                value={branding.secondaryColor}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    secondaryColor: e.target.value,
                  }))
                }
                placeholder="#ffffff"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={branding.accentColor}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    accentColor: e.target.value,
                  }))
                }
                className="w-16 h-10 rounded cursor-pointer"
                disabled={loading}
              />
              <input
                type="text"
                value={branding.accentColor}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    accentColor: e.target.value,
                  }))
                }
                placeholder="#0066cc"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Saving...' : 'Save Branding Settings'}
        </button>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>👁️</span> Preview
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          This is how your branding will appear on staff pages (till, kitchen):
        </p>
        
        {/* Preview Header - Mimics BrandingHeader Component */}
        <div
          className="relative w-full bg-cover bg-center bg-no-repeat overflow-hidden rounded-lg shadow-lg border border-gray-200"
          style={{
            backgroundImage: bgPreview
              ? `url('${bgPreview}')`
              : `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`,
            backgroundColor: branding.secondaryColor,
            minHeight: '220px',
          }}
        >
          {/* Subtle Overlay - Only if wallpaper exists */}
          {bgPreview && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.1) 100%)',
              }}
            ></div>
          )}

          {/* Content Container */}
          <div className="relative z-10 p-8 flex items-center justify-between h-full">
            {/* Store Initial and Store Name */}
            <div className="flex items-center gap-6">
              <div
                className="w-24 h-24 rounded-xl shadow-xl flex items-center justify-center text-white text-4xl font-bold flex-shrink-0 border-2"
                style={{ 
                  backgroundColor: branding.primaryColor,
                  borderColor: 'rgba(255, 255, 255, 0.5)'
                }}
              >
                Q
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white drop-shadow-md">
                  Quest Foods
                </h2>
                <p className="text-base text-white drop-shadow-sm opacity-90">
                  Welcome, Admin
                </p>
              </div>
            </div>

            {/* Store Info Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-white/25 backdrop-blur-md px-5 py-3 rounded-xl border border-white/30 flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                Store ID: cmosxk...
              </span>
            </div>
          </div>

          {/* Accent Color Bar */}
          <div
            className="h-2"
            style={{ backgroundColor: branding.accentColor }}
          ></div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          <strong>Note:</strong> Wallpaper is optional. If not provided, a gradient based on your primary and secondary colors will be used.
        </p>
      </div>
    </div>
  );
}
