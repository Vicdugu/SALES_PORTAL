'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/api/client';
import Image from 'next/image';

interface Advert {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link?: string;
  caption?: string;
  isActive: boolean;
}

export function AdvertPanel() {
  const { user } = useAuth();
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentAdvertIndex, setCurrentAdvertIndex] = useState(0);

  useEffect(() => {
    fetchAdverts();
    // Refresh adverts every 30 seconds
    const interval = setInterval(fetchAdverts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdverts = async () => {
    try {
      const response = await apiCall('/api/adverts');
      if (response.ok) {
        const data = await response.json();
        setAdverts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching adverts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || adverts.length === 0) {
    return null;
  }

  // Desktop view (md and up): Fixed right sidebar
  return (
    <>
      {/* Desktop Sidebar - Visible on md+ screens */}
      <div className="hidden md:flex flex-col w-44 bg-gradient-to-b from-gray-100 to-gray-150 dark:from-gray-900 dark:to-gray-950 border-l-2 border-gray-300 dark:border-gray-600 overflow-y-auto flex-shrink-0">
        <div className="p-2 space-y-2">
          {/* Header */}
          <div className="px-1 py-0.5">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
              📢 Ads
            </h3>
          </div>

          {/* Adverts */}
          {adverts.map((advert) => (
            <AdvertCard key={advert.id} advert={advert} />
          ))}

          {/* Empty State */}
          {adverts.length === 0 && !loading && (
            <div className="text-center py-4 text-gray-700 dark:text-gray-200 text-xs font-medium">
              No ads available
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Button - Visible on sm and down screens */}
      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-transform duration-200 active:scale-95"
          aria-label="View advertisements"
          title="Ads"
        >
          <span className="text-2xl">📢</span>
        </button>
      </div>

      {/* Mobile Drawer/Modal - Visible on sm and down screens */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom border-t-2 border-gray-300 dark:border-gray-700">
            <div className="p-4">
              {/* Drawer Handle */}
              <div className="flex justify-center mb-3">
                <div className="w-12 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-950 dark:text-white">
                  📢 Featured Ads
                </h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-2xl text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white active:scale-75 transition-transform font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Adverts Container */}
              <div className="space-y-4">
                {adverts.length > 0 ? (
                  <>
                    {/* Main Advert Display */}
                    <AdvertCard key={adverts[currentAdvertIndex].id} advert={adverts[currentAdvertIndex]} isMobile />

                    {/* Navigation (only if multiple adverts) */}
                    {adverts.length > 1 && (
                      <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300 dark:border-gray-700">
                        <button
                          onClick={() =>
                            setCurrentAdvertIndex((prev) =>
                              prev === 0 ? adverts.length - 1 : prev - 1
                            )
                          }
                          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 active:scale-95 transition-transform text-sm border border-gray-400 dark:border-gray-600"
                        >
                          ← Prev
                        </button>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {currentAdvertIndex + 1} / {adverts.length}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentAdvertIndex((prev) =>
                              prev === adverts.length - 1 ? 0 : prev + 1
                            )
                          }
                          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 active:scale-95 transition-transform text-sm border border-gray-400 dark:border-gray-600"
                        >
                          Next →
                        </button>
                      </div>
                    )}

                    {/* Dot Indicators */}
                    {adverts.length > 1 && (
                      <div className="flex justify-center gap-2 pt-2">
                        {adverts.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentAdvertIndex(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors border ${
                              idx === currentAdvertIndex
                                ? 'bg-blue-700 border-blue-800 dark:bg-blue-500 dark:border-blue-400'
                                : 'bg-gray-400 border-gray-500 dark:bg-gray-600 dark:border-gray-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-800 dark:text-gray-200 font-medium">
                    No ads available
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function AdvertCard({ advert, isMobile = false }: { advert: Advert; isMobile?: boolean }) {
  const handleClick = () => {
    if (advert.link) {
      window.open(advert.link, '_blank');
    }
  };

  const cardClasses = advert.link
    ? 'cursor-pointer hover:shadow-md transition-shadow active:scale-95'
    : '';

  return (
    <div
      onClick={handleClick}
      className={`
        relative rounded-lg overflow-hidden bg-white dark:bg-gray-800
        border-2 border-gray-300 dark:border-gray-600
        shadow-sm hover:shadow transition-all duration-150
        ${cardClasses}
        group
        ${isMobile ? 'touch-manipulation' : ''}
      `}
    >
      {/* Image Container */}
      <div className={`relative w-full ${isMobile ? 'h-48' : 'h-24'} bg-gray-300 dark:bg-gray-700 overflow-hidden`}>
        <Image
          src={advert.imageUrl}
          alt={advert.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-200"
          sizes={isMobile ? '100vw' : '176px'}
          priority={isMobile}
        />
        
        {/* Overlay for dark mode */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      {/* Content */}
      <div className={isMobile ? 'p-3' : 'p-1.5'}>
        {/* Title */}
        <h4 className={`font-bold text-gray-950 dark:text-white ${isMobile ? 'text-base line-clamp-2' : 'text-xs line-clamp-2'} mb-1`}>
          {advert.title}
        </h4>

        {/* Caption/CTA */}
        {advert.caption && (
          <p className={`text-blue-700 dark:text-blue-300 font-semibold ${isMobile ? 'text-sm mb-2' : 'text-xs mb-1'}`}>
            {advert.caption}
          </p>
        )}

        {/* Description */}
        {advert.description && (
          <p className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-sm line-clamp-2 mb-2' : 'text-xs line-clamp-1'}`}>
            {advert.description}
          </p>
        )}

        {/* Link Indicator */}
        {advert.link && (
          <div className={`${isMobile ? 'pt-3 border-t-2' : 'mt-2 pt-2 border-t-2'} border-gray-300 dark:border-gray-600`}>
            <span className={`text-blue-700 dark:text-blue-300 font-bold hover:underline ${isMobile ? 'text-sm' : 'text-xs'}`}>
              Learn More →
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
