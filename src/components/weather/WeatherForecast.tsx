/**
 * Weather Forecast Widget using Open-Meteo API
 * Shows weather forecast for the destination city around the travel date.
 * If the travel date is beyond the forecast range (16 days), shows current/near-term weather.
 * 
 * API docs: https://open-meteo.com/en/docs
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer, Loader2, CloudLightning, PlaneTakeoff, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';
import { translateCity } from '../../utils/translate';

interface WeatherForecastProps {
  /** Destination city IATA code (e.g. "NRT", "HKG") */
  destinationCode: string;
  /** Departure city IATA code (e.g. "HKG") */
  departureCode?: string;
  /** Travel date in YYYY-MM-DD format */
  travelDate: string;
  className?: string;
}

interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipProbability: number;
}

// Map IATA codes to approximate lat/lng (common airports)
const AIRPORT_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  // Asia
  NRT: { lat: 35.76, lng: 140.39, city: 'Tokyo' },
  HND: { lat: 35.55, lng: 139.78, city: 'Tokyo' },
  HKG: { lat: 22.31, lng: 113.91, city: 'Hong Kong' },
  ICN: { lat: 37.46, lng: 126.44, city: 'Seoul' },
  PVG: { lat: 31.14, lng: 121.81, city: 'Shanghai' },
  SHA: { lat: 31.20, lng: 121.34, city: 'Shanghai' },
  PEK: { lat: 40.08, lng: 116.58, city: 'Beijing' },
  PKX: { lat: 39.51, lng: 116.41, city: 'Beijing' },
  BKK: { lat: 13.69, lng: 100.75, city: 'Bangkok' },
  SIN: { lat: 1.36, lng: 103.99, city: 'Singapore' },
  KUL: { lat: 2.75, lng: 101.71, city: 'Kuala Lumpur' },
  TPE: { lat: 25.08, lng: 121.23, city: 'Taipei' },
  MNL: { lat: 14.51, lng: 121.02, city: 'Manila' },
  CGK: { lat: -6.13, lng: 106.66, city: 'Jakarta' },
  DEL: { lat: 28.56, lng: 77.10, city: 'Delhi' },
  BOM: { lat: 19.09, lng: 72.87, city: 'Mumbai' },
  CTS: { lat: 42.78, lng: 141.69, city: 'Sapporo' },
  KIX: { lat: 34.43, lng: 135.24, city: 'Osaka' },
  FUK: { lat: 33.59, lng: 130.45, city: 'Fukuoka' },
  // Europe
  LHR: { lat: 51.47, lng: -0.46, city: 'London' },
  CDG: { lat: 49.01, lng: 2.55, city: 'Paris' },
  FRA: { lat: 50.03, lng: 8.57, city: 'Frankfurt' },
  AMS: { lat: 52.31, lng: 4.77, city: 'Amsterdam' },
  FCO: { lat: 41.80, lng: 12.25, city: 'Rome' },
  MAD: { lat: 40.47, lng: -3.57, city: 'Madrid' },
  BCN: { lat: 41.30, lng: 2.08, city: 'Barcelona' },
  IST: { lat: 41.26, lng: 28.74, city: 'Istanbul' },
  ZRH: { lat: 47.46, lng: 8.55, city: 'Zurich' },
  VIE: { lat: 48.11, lng: 16.57, city: 'Vienna' },
  // Americas
  JFK: { lat: 40.64, lng: -73.78, city: 'New York' },
  LAX: { lat: 33.94, lng: -118.41, city: 'Los Angeles' },
  SFO: { lat: 37.62, lng: -122.38, city: 'San Francisco' },
  ORD: { lat: 41.98, lng: -87.90, city: 'Chicago' },
  MIA: { lat: 25.80, lng: -80.29, city: 'Miami' },
  YYZ: { lat: 43.68, lng: -79.63, city: 'Toronto' },
  YVR: { lat: 49.19, lng: -123.18, city: 'Vancouver' },
  GRU: { lat: -23.43, lng: -46.47, city: 'São Paulo' },
  MEX: { lat: 19.44, lng: -99.07, city: 'Mexico City' },
  // Oceania
  SYD: { lat: -33.95, lng: 151.18, city: 'Sydney' },
  MEL: { lat: -37.67, lng: 144.84, city: 'Melbourne' },
  AKL: { lat: -37.01, lng: 174.79, city: 'Auckland' },
  // Middle East / Africa
  DXB: { lat: 25.25, lng: 55.36, city: 'Dubai' },
  DOH: { lat: 25.26, lng: 51.57, city: 'Doha' },
  JNB: { lat: -26.14, lng: 28.25, city: 'Johannesburg' },
  CAI: { lat: 30.12, lng: 31.41, city: 'Cairo' },
};

// WMO Weather codes → icon + label
function getWeatherInfo(code: number, t: (key: string) => string): { icon: React.ReactNode; label: string } {
  if (code === 0) return { icon: <Sun className="w-5 h-5 text-yellow-500" />, label: t('weather.clearSky') };
  if (code <= 3) return { icon: <Cloud className="w-5 h-5 text-gray-400" />, label: t('weather.partlyCloudy') };
  if (code <= 48) return { icon: <Cloud className="w-5 h-5 text-gray-500" />, label: t('weather.foggy') };
  if (code <= 57) return { icon: <CloudRain className="w-5 h-5 text-blue-400" />, label: t('weather.drizzle') };
  if (code <= 67) return { icon: <CloudRain className="w-5 h-5 text-blue-500" />, label: t('weather.rain') };
  if (code <= 77) return { icon: <CloudSnow className="w-5 h-5 text-blue-200" />, label: t('weather.snow') };
  if (code <= 82) return { icon: <CloudRain className="w-5 h-5 text-blue-600" />, label: t('weather.rainShowers') };
  if (code <= 86) return { icon: <CloudSnow className="w-5 h-5 text-blue-300" />, label: t('weather.snowShowers') };
  if (code <= 99) return { icon: <CloudLightning className="w-5 h-5 text-yellow-600" />, label: t('weather.thunderstorm') };
  return { icon: <Cloud className="w-5 h-5 text-gray-400" />, label: t('weather.unknown') };
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({
  destinationCode,
  departureCode,
  travelDate,
  className,
}) => {
  const { t } = useTranslation();
  type TabKey = 'destination' | 'departure';
  const [activeTab, setActiveTab] = useState<TabKey>('destination');
  const [destWeather, setDestWeather] = useState<DailyWeather[] | null>(null);
  const [depWeather, setDepWeather] = useState<DailyWeather[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destCity, setDestCity] = useState('');
  const [depCity, setDepCity] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const fetchWeatherForCode = async (code: string): Promise<{ days: DailyWeather[]; city: string; fallback: boolean } | null> => {
    const coords = AIRPORT_COORDS[code.toUpperCase()];
    if (!coords) return null;

    const today = new Date();
    const travel = new Date(travelDate);
    const diffDays = Math.ceil((travel.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const useFallback = diffDays > 16;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,relative_humidity_2m_mean,precipitation_probability_max&timezone=auto&forecast_days=16`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch weather data');
    const data = await res.json();
    const daily = data.daily;
    if (!daily || !daily.time) throw new Error('Invalid weather data');

    let startIdx: number;
    if (useFallback) {
      startIdx = Math.max(0, daily.time.length - 5);
    } else {
      startIdx = daily.time.findIndex((d: string) => d === travelDate);
      if (startIdx === -1) {
        startIdx = daily.time.findIndex((d: string) => d >= travelDate);
        if (startIdx === -1) startIdx = Math.max(0, daily.time.length - 5);
      }
      startIdx = Math.max(0, startIdx - 1);
    }

    const days: DailyWeather[] = [];
    for (let i = startIdx; i < Math.min(startIdx + 5, daily.time.length); i++) {
      days.push({
        date: daily.time[i],
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        weatherCode: daily.weathercode[i],
        windSpeed: Math.round(daily.windspeed_10m_max[i]),
        humidity: Math.round(daily.relative_humidity_2m_mean?.[i] ?? 0),
        precipProbability: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
      });
    }

    return { days, city: coords.city, fallback: useFallback };
  };

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch destination weather
        const destResult = await fetchWeatherForCode(destinationCode);
        if (destResult) {
          setDestWeather(destResult.days);
          setDestCity(destResult.city);
          setIsFallback(destResult.fallback);
        } else {
          setDestWeather(null);
          setDestCity('');
        }

        // Fetch departure weather (if provided and different)
        if (departureCode && departureCode.toUpperCase() !== destinationCode.toUpperCase()) {
          const depResult = await fetchWeatherForCode(departureCode);
          if (depResult) {
            setDepWeather(depResult.days);
            setDepCity(depResult.city);
          } else {
            setDepWeather(null);
            setDepCity('');
          }
        } else {
          setDepWeather(null);
          setDepCity('');
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Unable to load weather data');
      } finally {
        setIsLoading(false);
      }
    };

    if (destinationCode && travelDate) {
      fetchAll();
    }
  }, [destinationCode, departureCode, travelDate]);

  if (error) {
    return null; // Silently hide if weather unavailable
  }

  if (isLoading) {
    return (
      <div className={cn('w-72 flex-shrink-0', className)}>
        <div className="bg-surface rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <h3 className="text-sm font-semibold text-text-primary">{t('weather.loadingWeather')}</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!destWeather || destWeather.length === 0) return null;

  const hasDeparture = depWeather && depWeather.length > 0 && depCity;
  const weather = activeTab === 'departure' && hasDeparture ? depWeather : destWeather;
  const cityName = activeTab === 'departure' && hasDeparture ? depCity : destCity;

  return (
    <div className={cn('w-72 flex-shrink-0', className)}>
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 scrollbar-thin">
        <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-sky-400 px-5 py-4 text-white">
            <h3 className="text-sm font-bold">
              {t('weather.weatherIn', { city: translateCity(cityName) })}
            </h3>
            <p className="text-xs text-white/80 mt-0.5">
              {isFallback
                ? t('weather.extendedForecast')
                : t('weather.aroundTravelDate')}
            </p>
          </div>

          {/* Tabs — only show if departure data available */}
          {hasDeparture && (
            <div className="flex border-b border-divider">
              <button
                onClick={() => setActiveTab('destination')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors',
                  activeTab === 'destination'
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-alt'
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                {translateCity(destCity)}
              </button>
              <button
                onClick={() => setActiveTab('departure')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors',
                  activeTab === 'departure'
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-alt'
                )}
              >
                <PlaneTakeoff className="w-3.5 h-3.5" />
                {translateCity(depCity)}
              </button>
            </div>
          )}

          {/* Weather Days */}
          <div className="p-4 space-y-3">
            {weather.map((day) => {
              const { icon, label } = getWeatherInfo(day.weatherCode, t);
              const isTravel = day.date === travelDate;
              return (
                <div
                  key={day.date}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-colors',
                    isTravel
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-surface-alt hover:bg-surface-alt/80'
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">{icon}</div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-text-primary">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString(
                          i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US',
                          i18n.language === 'zh-TW'
                            ? { month: 'short', day: 'numeric', weekday: 'short' }
                            : { weekday: 'short', month: 'short', day: 'numeric' }
                        )}
                      </span>
                      {isTravel && (
                        <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                          {t('weather.travel')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted">{label}</p>
                  </div>

                  {/* Temp */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-red-400" />
                      <span className="text-xs font-bold text-text-primary">{day.tempMax}°</span>
                      <span className="text-xs text-text-muted">{day.tempMin}°</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          {weather.length > 0 && (
            <div className="border-t border-divider px-4 py-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <Wind className="w-3.5 h-3.5 mx-auto text-text-muted mb-0.5" />
                  <p className="text-xs font-semibold text-text-primary">
                    {Math.round(weather.reduce((a, d) => a + d.windSpeed, 0) / weather.length)} km/h
                  </p>
                  <p className="text-[10px] text-text-muted">{t('weather.avgWind')}</p>
                </div>
                <div>
                  <Droplets className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
                  <p className="text-xs font-semibold text-text-primary">
                    {Math.round(weather.reduce((a, d) => a + d.humidity, 0) / weather.length)}%
                  </p>
                  <p className="text-[10px] text-text-muted">{t('weather.humidity')}</p>
                </div>
                <div>
                  <CloudRain className="w-3.5 h-3.5 mx-auto text-blue-500 mb-0.5" />
                  <p className="text-xs font-semibold text-text-primary">
                    {Math.max(...weather.map(d => d.precipProbability))}%
                  </p>
                  <p className="text-[10px] text-text-muted">{t('weather.rainChance')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Attribution */}
          <div className="px-4 py-2 border-t border-divider">
            <p className="text-[10px] text-text-muted text-center">
              {t('weather.poweredBy')} <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open-Meteo</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherForecast;
