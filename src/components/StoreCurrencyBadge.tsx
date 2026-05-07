'use client';

import { useStore } from '@/contexts/AuthContext';
import { getCurrencySymbol, getCurrencyName } from '@/lib/utils/currency';

export function StoreCurrencyBadge() {
  const store = useStore();

  if (!store.currency) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm">
      <span className="text-lg">{getCurrencySymbol(store.currency)}</span>
      <span className="font-semibold">{store.currency}</span>
      <span className="text-xs text-amber-700">({getCurrencyName(store.currency)})</span>
    </div>
  );
}
