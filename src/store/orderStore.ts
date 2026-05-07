import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface OrderState {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  addItem: (item: OrderItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  recalculateTotals: () => void;
}

const calculateTotals = (items: OrderItem[]) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  return {
    subtotal,
    tax: 0,
    total: subtotal,
  };
};

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          const newItems = existing
            ? state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              )
            : [...state.items, item];

          const { subtotal, tax, total } = calculateTotals(newItems);
          return { items: newItems, subtotal, tax, total };
        });
      },

      removeItem: (id) =>
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== id);
          const { subtotal, tax, total } = calculateTotals(newItems);
          return { items: newItems, subtotal, tax, total };
        }),

      updateQuantity: (id, quantity) =>
        set((state) => {
          const newItems = state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          );
          const { subtotal, tax, total } = calculateTotals(newItems);
          return { items: newItems, subtotal, tax, total };
        }),

      clearCart: () => set({ items: [], subtotal: 0, tax: 0, total: 0 }),

      recalculateTotals: () =>
        set((state) => {
          const { subtotal, tax, total } = calculateTotals(state.items);
          return { subtotal, tax, total };
        }),
    }),
    {
      name: 'order-store',
    }
  )
);

// Helper to get totals
export const useOrderTotals = () =>
  useOrderStore((state) => ({
    subtotal: state.subtotal,
    tax: state.tax,
    total: state.total,
  }));