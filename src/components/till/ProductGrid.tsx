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
      <div className="p-4 border-b">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded whitespace-nowrap font-medium transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="border rounded-lg p-4 bg-white hover:shadow-lg transition cursor-pointer"
              onClick={() => {
                if (product.quantity > 0) {
                  setSelectedItem(product);
                }
              }}
            >
              <h3 className="font-semibold text-sm mb-2">{product.name}</h3>
              <p className="text-gray-600 text-xs mb-2">{product.category}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-green-600">
                  {currencySymbol}{product.unitPrice.toFixed(2)}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    product.quantity > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
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
