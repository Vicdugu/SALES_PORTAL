/**
 * Currency formatting utilities
 */

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  MXN: '$',
  ZAR: 'R',
  NGN: '₦',
  GHS: '₵',
  KES: 'Ksh',
  EGP: 'E£',
};

const currencyNames: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  MXN: 'Mexican Peso',
  ZAR: 'South African Rand',
  NGN: 'Nigerian Naira',
  GHS: 'Ghanaian Cedi',
  KES: 'Kenyan Shilling',
  EGP: 'Egyptian Pound',
};

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string = 'USD'): string {
  return currencySymbols[currency] || '$';
}

/**
 * Get currency name for a given currency code
 */
export function getCurrencyName(currency: string = 'USD'): string {
  return currencyNames[currency] || 'US Dollar';
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get decimal places for currency (most use 2, JPY uses 0)
 */
export function getCurrencyDecimals(currency: string = 'USD'): number {
  return currency === 'JPY' ? 0 : 2;
}

/**
 * Format amount with currency decimals
 */
export function formatCurrencyAmount(amount: number, currency: string = 'USD'): string {
  const decimals = getCurrencyDecimals(currency);
  return amount.toFixed(decimals);
}
