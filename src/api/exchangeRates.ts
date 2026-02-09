/**
 * AirEase Frontend – Exchange Rates API
 *
 * Fetches live exchange rates from the backend (ECB data via CurrencyConverter).
 * Rates are cached in-memory on the client for 30 minutes to avoid redundant calls.
 */

const API_URL = import.meta.env.VITE_API_URL || '';

interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  supported: string[];
}

let _cached: { rates: Record<string, number>; fetchedAt: number } | null = null;
const CLIENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch exchange rates from USD to all supported currencies.
 * Returns cached data if still fresh.
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (_cached && now - _cached.fetchedAt < CLIENT_CACHE_TTL) {
    return _cached.rates;
  }

  try {
    const res = await fetch(`${API_URL}/v1/exchange-rates`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ExchangeRateResponse = await res.json();
    _cached = { rates: data.rates, fetchedAt: now };
    return data.rates;
  } catch (err) {
    console.warn('[ExchangeRates] Failed to fetch live rates, using fallback', err);
    // Return hardcoded fallback so the app never breaks
    return FALLBACK_RATES;
  }
}

/** Hardcoded fallback rates in case the backend is unreachable */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CNY: 7.25,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150.0,
  HKD: 7.82,
  SGD: 1.34,
  AUD: 1.55,
  CAD: 1.36,
  KRW: 1320,
  INR: 83.5,
  THB: 35.5,
};
