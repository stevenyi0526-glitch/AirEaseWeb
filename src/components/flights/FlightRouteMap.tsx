/**
 * AirEase - Flight Route Map Component
 * Displays flight path on OpenStreetMap using Leaflet
 */

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Import renderToStaticMarkup to convert React components to HTML strings
import { renderToStaticMarkup } from 'react-dom/server';
import { getFlightRouteCoordinates, type FlightRouteCoordinates, type AirportCoordinates } from '../../api/airports';
import { Plane, MapPin, PlaneTakeoff, PlaneLanding } from 'lucide-react';

// Fix Leaflet default marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom airport marker icon with optional time label
const createAirportIcon = (
  color: string, 
  isLayover = false, 
  timeLabel?: string,
  iconType: 'departure' | 'arrival' | 'layover' = 'layover'
) => {
  const size = isLayover ? 24 : 32;
  const hasTime = timeLabel && timeLabel.length > 0;
  
  // Select the appropriate Lucide icon component based on type
  let IconComponent = Plane; // Default for layover
  if (iconType === 'departure') IconComponent = PlaneTakeoff;
  if (iconType === 'arrival') IconComponent = PlaneLanding;

  // Render the React component to a static HTML string
  const iconHtmlString = renderToStaticMarkup(
    <IconComponent 
      size={size * 0.6} 
      color="white" 
      strokeWidth={2} 
    />
  );
  
  return L.divIcon({
    className: 'custom-airport-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        ${hasTime ? `
          <div style="
            background: ${color};
            color: white;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${timeLabel}</div>
        ` : ''}
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${iconHtmlString}
        </div>
      </div>
    `,
    iconSize: [size, hasTime ? size + 24 : size],
    iconAnchor: [size / 2, hasTime ? size + 12 : size / 2],
    popupAnchor: [0, hasTime ? -(size + 12) : -size / 2],
  });
};

// Create dynamic icons with appropriate icon types
const createDepartureIcon = (time?: string) => createAirportIcon('#22c55e', false, time, 'departure');
const createArrivalIcon = (time?: string) => createAirportIcon('#ef4444', false, time, 'arrival');
const createLayoverIcon = (time?: string) => createAirportIcon('#f59e0b', true, time, 'layover');

// Static icons for cases without time (fallback)
const departureIcon = createAirportIcon('#22c55e', false, undefined, 'departure');
const arrivalIcon = createAirportIcon('#ef4444', false, undefined, 'arrival');
const layoverIcon = createAirportIcon('#f59e0b', true, undefined, 'layover');

// Calculate curved path points (great circle approximation)
function calculateCurvedPath(
  start: [number, number],
  end: [number, number],
  numPoints = 50
): [number, number][] {
  const points: [number, number][] = [];
  
  // Convert to radians
  const lat1 = (start[0] * Math.PI) / 180;
  const lon1 = (start[1] * Math.PI) / 180;
  const lat2 = (end[0] * Math.PI) / 180;
  const lon2 = (end[1] * Math.PI) / 180;
  
  // Calculate great circle path
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
    )
  );
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
    const lon = Math.atan2(y, x) * (180 / Math.PI);
    
    points.push([lat, lon]);
  }
  
  return points;
}

// Auto-fit bounds component
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  
  return null;
}

interface FlightRouteMapProps {
  departureCode: string;
  arrivalCode: string;
  layoverCodes?: string[];
  className?: string;
  showLabels?: boolean;
  height?: string;
  // NEW: Time labels to show on markers
  departureTime?: string;
  arrivalTime?: string;
  layoverTimes?: { arrival?: string; departure?: string }[];
}

export function FlightRouteMap({
  departureCode,
  arrivalCode,
  layoverCodes = [],
  className = '',
  showLabels = true,
  height = '300px',
  departureTime,
  arrivalTime,
  layoverTimes = [],
}: FlightRouteMapProps) {
  const [routeData, setRouteData] = useState<FlightRouteCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoute() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFlightRouteCoordinates(departureCode, arrivalCode, layoverCodes);
        setRouteData(data);
      } catch (err) {
        setError('Unable to load flight route');
        console.error('Failed to fetch route:', err);
      } finally {
        setLoading(false);
      }
    }

    if (departureCode && arrivalCode) {
      fetchRoute();
    }
  }, [departureCode, arrivalCode, layoverCodes.join(',')]);

  // Calculate flight path segments
  const pathSegments = useMemo(() => {
    if (!routeData) return [];

    const allPoints: AirportCoordinates[] = [
      routeData.departure,
      ...routeData.layovers,
      routeData.arrival,
    ];

    const segments: [number, number][][] = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const start: [number, number] = [allPoints[i].latitude, allPoints[i].longitude];
      const end: [number, number] = [allPoints[i + 1].latitude, allPoints[i + 1].longitude];
      segments.push(calculateCurvedPath(start, end));
    }

    return segments;
  }, [routeData]);

  // Calculate bounds for auto-fit
  const bounds = useMemo(() => {
    if (!routeData) return null;

    const allPoints = [
      routeData.departure,
      ...routeData.layovers,
      routeData.arrival,
    ];

    const lats = allPoints.map((p) => p.latitude);
    const lngs = allPoints.map((p) => p.longitude);

    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [routeData]);

  // Calculate center and distance
  const flightInfo = useMemo(() => {
    if (!routeData) return null;

    const dep = routeData.departure;
    const arr = routeData.arrival;

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((arr.latitude - dep.latitude) * Math.PI) / 180;
    const dLon = ((arr.longitude - dep.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((dep.latitude * Math.PI) / 180) *
        Math.cos((arr.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return {
      distance: Math.round(distance),
      center: [(dep.latitude + arr.latitude) / 2, (dep.longitude + arr.longitude) / 2] as [number, number],
    };
  }, [routeData]);

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Plane className="w-8 h-8 animate-pulse" />
          <span className="text-sm">Loading flight route...</span>
        </div>
      </div>
    );
  }

  if (error || !routeData) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <MapPin className="w-8 h-8" />
          <span className="text-sm">{error || 'No route data available'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden shadow-lg ${className}`} style={{ height, zIndex: 0 }}>
      <MapContainer
        center={flightInfo?.center || [0, 0]}
        zoom={4}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Use CartoDB Positron for English-only labels */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {bounds && <FitBounds bounds={bounds} />}

        {/* Flight path segments */}
        {pathSegments.map((segment, idx) => (
          <Polyline
            key={idx}
            positions={segment}
            pathOptions={{
              color: '#3b82f6',
              weight: 3,
              opacity: 0.8,
              dashArray: '10, 5',
            }}
          />
        ))}

        {/* Departure marker with time label */}
        <Marker
          position={[routeData.departure.latitude, routeData.departure.longitude]}
          icon={departureTime ? createDepartureIcon(departureTime) : departureIcon}
        >
          <Popup>
            <div className="text-center">
              <div className="font-bold text-green-600">{routeData.departure.iataCode}</div>
              {departureTime && <div className="text-sm font-semibold">{departureTime}</div>}
              <div className="text-sm">{routeData.departure.name}</div>
              <div className="text-xs text-gray-500">{routeData.departure.municipality}, {routeData.departure.country}</div>
            </div>
          </Popup>
        </Marker>

        {/* Layover markers with time labels */}
        {routeData.layovers.map((layover, idx) => {
          const layoverTime = layoverTimes[idx];
          const timeLabel = layoverTime ? (layoverTime.arrival || layoverTime.departure) : undefined;
          
          return (
            <Marker
              key={layover.iataCode}
              position={[layover.latitude, layover.longitude]}
              icon={timeLabel ? createLayoverIcon(timeLabel) : layoverIcon}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-amber-600">{layover.iataCode}</div>
                  <div className="text-xs text-gray-500">Stop {idx + 1}</div>
                  {layoverTime?.arrival && <div className="text-xs">Arrive: {layoverTime.arrival}</div>}
                  {layoverTime?.departure && <div className="text-xs">Depart: {layoverTime.departure}</div>}
                  <div className="text-sm">{layover.name}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Arrival marker with time label */}
        <Marker
          position={[routeData.arrival.latitude, routeData.arrival.longitude]}
          icon={arrivalTime ? createArrivalIcon(arrivalTime) : arrivalIcon}
        >
          <Popup>
            <div className="text-center">
              <div className="font-bold text-red-600">{routeData.arrival.iataCode}</div>
              {arrivalTime && <div className="text-sm font-semibold">{arrivalTime}</div>}
              <div className="text-sm">{routeData.arrival.name}</div>
              <div className="text-xs text-gray-500">{routeData.arrival.municipality}, {routeData.arrival.country}</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Flight info overlay */}
      {showLabels && (
  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
    {/* Departure Label */}
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-white">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="font-bold">{routeData.departure.iataCode}</span>
      </div>
    </div>
    
    {/* Distance Label */}
    {flightInfo && (
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-white">
        <div className="flex items-center gap-2 text-sm">
          <Plane className="w-4 h-4 text-blue-400" /> {/* 调整图标颜色以在深色背景上更清晰 */}
          <span className="font-medium">{flightInfo.distance.toLocaleString()} km</span>
        </div>
      </div>
    )}
    
    {/* Arrival Label */}
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-white">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span className="font-bold">{routeData.arrival.iataCode}</span>
      </div>
    </div>
  </div>
)}


      {/* Layover indicator */}
      {routeData.layovers.length > 0 && (
        <div className="absolute top-3 right-3 bg-amber-500/90 text-white text-xs font-medium px-2 py-1 rounded-full">
          {routeData.layovers.length} stop{routeData.layovers.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default FlightRouteMap;
