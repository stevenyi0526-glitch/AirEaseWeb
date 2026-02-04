import React from 'react';
import { cn } from '../../utils/cn';

// Supported currencies with symbols and names
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Currency selector dropdown
 * Allows users to select their preferred currency for price display
 */
const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  className,
  compact = false,
}) => {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        className={cn(
          'appearance-none bg-white border border-border rounded-lg cursor-pointer',
          'text-text-primary font-medium transition-colors',
          'hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
          compact ? 'pl-3 pr-8 py-1.5 text-sm' : 'pl-4 pr-10 py-2',
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: compact ? 'right 6px center' : 'right 10px center',
        }}
      >
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {compact ? currency.code : `${currency.symbol} ${currency.code} - ${currency.name}`}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CurrencySelector;

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.symbol || '$';
}

/**
 * Format price with currency symbol
 */
export function formatPriceWithCurrency(price: number, currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || '$';
  
  // Format based on currency
  if (currencyCode === 'JPY' || currencyCode === 'KRW') {
    // No decimal places for these currencies
    return `${symbol}${Math.round(price).toLocaleString()}`;
  }
  
  return `${symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
