/**
 * External partner entry point — Ski Finder integration.
 *
 * Route: /external/ski?arrival=YVR&date=2026-06-01&cabin=economy[&resort=Whistler]
 *
 * Flow:
 *   1. Read query params (arrival is required; date defaults to today+30d).
 *   2. Ask browser for geolocation, then resolve nearest IATA.
 *   3. Redirect to /flights?from=<NEAREST>&to=<arrival>&date=...&cabin=...
 *
 * If geolocation fails or is denied, we still redirect — the FlightsPage will
 * surface an input so the user can pick a departure manually.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { findNearestAirport } from '../api/airports';
import { getUserLocation } from '../api/aiSearch';

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function ExternalSkiRedirect() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'locating' | 'redirecting' | 'error'>('locating');
  const [message, setMessage] = useState<string>('Detecting your nearest airport…');

  useEffect(() => {
    const arrival = (params.get('arrival') || '').toUpperCase();
    const resort = params.get('resort') || '';
    const date = params.get('date') || defaultDate();
    const cabin = params.get('cabin') || 'economy';
    const adults = params.get('adults') || '1';
    const children = params.get('children') || '0';

    if (!arrival) {
      setStatus('error');
      setMessage('Missing required parameter: arrival');
      return;
    }

    const go = (fromCode: string | null) => {
      const qs = new URLSearchParams({
        to: arrival,
        date,
        cabin,
        adults,
        children,
        sortBy: 'score',
        source: 'skifinder',
      });
      if (fromCode) qs.set('from', fromCode);
      if (resort) qs.set('resortName', resort);
      setStatus('redirecting');
      navigate(`/flights?${qs.toString()}`, { replace: true });
    };

    (async () => {
      try {
        const pos = await getUserLocation();
        const airport = await findNearestAirport(
          pos.coords.latitude,
          pos.coords.longitude,
          200
        );
        go(airport?.iataCode || null);
      } catch {
        // Geo denied / failed — proceed without departure; FlightsPage will prompt.
        go(null);
      }
    })();
  }, [params, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="animate-pulse text-4xl mb-4">❄️</div>
      <h1 className="text-2xl font-semibold mb-2">Ski Finder × AirEase</h1>
      <p className="text-slate-500">{message}</p>
      {status === 'error' && (
        <button
          onClick={() => navigate('/', { replace: true })}
          className="mt-6 px-4 py-2 rounded-lg bg-slate-800 text-white"
        >
          Go to AirEase home
        </button>
      )}
    </div>
  );
}
