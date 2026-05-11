'use client';

import { useState, useEffect, useRef } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { apiCall } from '@/lib/api/client';
import { useStore } from '@/contexts/AuthContext';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { ItemSelectionModal } from './ItemSelectionModal';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

interface ProductGridProps {
  onAddItem: (item: InventoryItem, quantity: number, notes?: string) => void;
  refreshTrigger?: number;
}

export function ProductGrid({ onAddItem, refreshTrigger }: ProductGridProps) {
  const store = useStore();
  const currencySymbol = getCurrencySymbol(store.currency);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Food');
  const refreshCountRef = useRef(0);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Refresh products when refreshTrigger changes
    if (refreshTrigger !== undefined && refreshTrigger !== refreshCountRef.current) {
      refreshCountRef.current = refreshTrigger;
      fetchProducts();
    }
  }, [refreshTrigger]);

  const fetchProducts = async () => {
    try {
      const response = await apiCall('/api/inventory');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      setError('Error fetching products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Food', 'Drink'];
  const filteredProducts =
    selectedCategory === 'Food'
      ? products.filter((p) => p.category === 'Food')
      : products.filter((p) => p.category === 'Drink');

  if (loading) {
    return <div className="p-4">Loading menu...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Category Filter */}
      <div className="p-2 sm:p-4 border-b">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 sm:px-4 py-2 rounded whitespace-nowrap font-bold text-xs sm:text-sm transition border ${
                selectedCategory === cat
                  ? 'bg-blue-700 text-white border-blue-800'
                  : 'bg-gray-300 text-gray-900 hover:bg-gray-400 border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="border-2 border-gray-300 rounded-lg p-2 sm:p-3 bg-white hover:shadow-lg transition cursor-pointer active:scale-95 min-h-32 sm:min-h-40 flex flex-col justify-between"
              onClick={() => {
                if (product.quantity > 0) {
                  setSelectedItem(product);
                }
              }}
            >
              <div>
                <h3 className="font-bold text-sm sm:text-base mb-1 text-gray-950 line-clamp-2">{product.name}</h3>
                <p className="text-gray-700 font-semibold text-xs sm:text-sm mb-2">{product.category}</p>
              </div>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-bold text-green-800">
                  {currencySymbol}{product.unitPrice.toFixed(2)}
                </span>
                <span
                  className={`text-xs sm:text-sm px-2 py-1 rounded font-bold border ${
                    product.quantity > 0
                      ? 'bg-green-200 text-green-900 border-green-700'
                      : 'bg-red-200 text-red-900 border-red-700'
                  }`}
                >
                  {product.quantity > 0 ? 'In Stock' : 'Out'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center text-gray-500 py-8">No products found</div>
        )}
      </div>

      {/* Item Selection Modal */}
      {selectedItem && (
        <ItemSelectionModal
          item={selectedItem}
          onConfirm={(quantity, notes) => {
            onAddItem(selectedItem, quantity, notes);
            setSelectedItem(null);
          }}
          onCancel={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
