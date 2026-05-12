'use client';

import { useStore } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

export function BrandingHeader() {
  const store = useStore();
  const { user } = useAuth();

  if (!store) return null;

  // Use store data directly, no API calls
  const backgroundImage = store.backgroundImage;
  const primaryColor = store.primaryColor || '#000000';
  const secondaryColor = store.secondaryColor || '#ffffff';
  const accentColor = store.accentColor || '#0066cc';

  return (
    <div
      className="relative w-full bg-cover bg-center bg-no-repeat overflow-hidden rounded-b-lg shadow-lg"
      style={{
        backgroundImage: backgroundImage
          ? `url('${backgroundImage}')`
          : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        backgroundColor: secondaryColor,
        minHeight: '220px',
      }}
    >
      {/* Subtle Overlay - Only if wallpaper exists */}
      {backgroundImage && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.25) 100%)',
          }}
        ></div>
      )}

      {/* Fallback overlay for light brand colors */}
      {!backgroundImage && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.1) 100%)',
          }}
        ></div>
      )}

      {/* Content Container */}
      <div className="relative z-10 p-8 flex items-center justify-between h-full">
        {/* Store Initial and Store Name */}
        <div className="flex items-center gap-6">
          <div
            className="w-24 h-24 rounded-xl shadow-xl flex items-center justify-center text-white text-4xl font-bold flex-shrink-0 border-4 border-white/80"
            style={{ 
              backgroundColor: primaryColor,
            }}
          >
            {store.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg" style={{textShadow: '0 2px 8px rgba(0,0,0,0.5)'}}>
              {store.name}
            </h1>
            <p className="text-base text-white drop-shadow-lg font-semibold" style={{textShadow: '0 1px 4px rgba(0,0,0,0.4)'}}>
              {user?.name && `Welcome, ${user.name}`}
            </p>
          </div>
        </div>

        {/* Store Info Badge */}
        {store && (
          <div className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl border-2 shadow-lg"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              borderColor: 'rgba(255, 255, 255, 0.9)',
            }}>
            <span className="text-white text-sm font-bold tracking-wide drop-shadow-md">
              📍 {store.id.slice(0, 8)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

