import React, { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plane,
  Clock,
  Calendar,
  Wifi,
  Power,
  Tv,
  UtensilsCrossed,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Share2,
  PlaneTakeoff,
  PlaneLanding,
  Map,
  MessageSquareWarning,
  ExternalLink,
} from 'lucide-react';
import { flightsApi } from '../api/flights';
import { bookingApi } from '../api/booking';
import { formatTime, formatDuration, formatPrice, formatDate } from '../utils/formatters';
import ScoreBadge from '../components/flights/ScoreBadge';
import WhyThisFlight from '../components/flights/WhyThisFlight';
import FavoriteButton from '../components/flights/FavoriteButton';
import SharePoster from '../components/flights/SharePoster';
import UserReviewsCarousel from '../components/flights/UserReviewsCarousel';
import CompareButton from '../components/compare/CompareButton';
import { FeedbackModal } from '../components/common/FeedbackModal';
// PAUSED: SeatMap disabled until Amadeus production access
// import SeatMapView from '../components/flights/SeatMapView';
import { cn } from '../utils/cn';
import type { FlightWithScore, PricePoint } from '../api/types';
// PAUSED: SeatMap types disabled until Amadeus production access
// import type { UpdatedFacilities, UpdatedScore } from '../api/seatmap';

// Lazy load the map component to avoid SSR issues with Leaflet
const FlightRouteMap = lazy(() => import('../components/flights/FlightRouteMap'));

/**
 * Generate mock price history for display purposes
 * This creates realistic-looking price fluctuations for the chart
 */
function generateMockPriceHistory(currentPrice: number): PricePoint[] {
  const points: PricePoint[] = [];
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Create realistic price fluctuations (±15% from current price)
    const variation = (Math.random() - 0.5) * 0.3 * currentPrice;
    const price = Math.round(currentPrice + variation);
    
    points.push({
      date: date.toISOString().split('T')[0],
      price: Math.max(price, currentPrice * 0.7), // Don't go below 70% of current
    });
  }
  
  // Ensure last point is the current price
  points[points.length - 1].price = currentPrice;
  
  return points;
}

/**
 * Flight Detail Page
 * - Flight summary with times, route, price
 * - "Why this flight?" module
 * - Amenities section
 * - Price history chart (MOCK DATA - labeled)
 * - CTAs: Select Flight, Compare
 * 
 * Note: This page can receive flight data via:
 * 1. Router state (from SerpAPI search results) - REAL DATA
 * 2. API call fallback (mock data for now) - MOCK DATA
 */
const FlightDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSharePoster, setShowSharePoster] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Round trip sub-tab state
  const [activeTab, setActiveTab] = useState<'departure' | 'return'>('departure');

  // PAUSED: Amadeus enrichment state - disabled until production access
  // SeatMap API returns cached/mock data in test env, not real-time
  // Re-enable when upgraded to api.amadeus.com
  /*
  const [amadeusEnrichment, setAmadeusEnrichment] = useState<{
    updatedFacilities?: UpdatedFacilities;
    updatedScore?: UpdatedScore;
  } | null>(null);

  const handleSeatmapEnrichment = useCallback((data: {
    updatedFacilities?: UpdatedFacilities;
    updatedScore?: UpdatedScore;
  }) => {
    setAmadeusEnrichment(data);
  }, []);
  */
  // Check if we have flight data passed via router state (from SerpAPI)
  const stateFlightData = location.state?.flightWithScore as FlightWithScore | undefined;
  const returnFlightData = location.state?.returnFlight as FlightWithScore | undefined;
  const isRoundTrip = location.state?.isRoundTrip as boolean | undefined;
  const totalPrice = location.state?.totalPrice as number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isFromSerpAPI = !!stateFlightData && id?.startsWith('serp-');

  // Fallback to API if no state data (this uses mock for now)
  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['flight', id],
    queryFn: () => flightsApi.getDetail(id!),
    enabled: !!id && !stateFlightData, // Only fetch if no state data
  });

  // Use state data if available, otherwise use API data
  const flightData = stateFlightData || apiData;
  
  // Get the current display flight for the active tab
  const currentDisplayFlight = isRoundTrip && activeTab === 'return' && returnFlightData 
    ? returnFlightData 
    : flightData;
  
  // Fetch user reviews on-demand when page loads
  // Reviews are NOT included in search results for performance optimization
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['airline-reviews', currentDisplayFlight?.flight.airline, currentDisplayFlight?.flight.cabin],
    queryFn: () => flightsApi.getAirlineReviews(
      currentDisplayFlight!.flight.airline,
      currentDisplayFlight!.flight.cabin || 'economy',
      10
    ),
    enabled: !!currentDisplayFlight?.flight.airline,
    staleTime: 5 * 60 * 1000, // Cache reviews for 5 minutes
  });

  if (isLoading && !stateFlightData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading flight details...</p>
        </div>
      </div>
    );
  }

  if ((error && !stateFlightData) || !flightData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Plane className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Flight not found
          </h2>
          <p className="text-text-secondary mb-6">
            The flight you're looking for doesn't exist or has expired.
          </p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // For round trips, switch between departure and return flight data based on active tab
  const displayFlightData = isRoundTrip && activeTab === 'return' && returnFlightData 
    ? returnFlightData 
    : flightData;

  const { flight, score: baseScore, facilities: baseFacilities } = displayFlightData;
  
  // PAUSED: Amadeus enrichment merge disabled until production access
  // When re-enabled, this replaces DB/SerpAPI guesses with accurate Amadeus API data
  const facilities = baseFacilities;
  const score = baseScore;
  
  // Price history - currently mock data, will be replaced with real data
  // when we have historical price tracking
  type PriceHistoryType = {
    flightId: string;
    points: PricePoint[];
    currentPrice: number;
    trend: 'rising' | 'falling' | 'stable';
    isMock?: boolean;
  };
  
  const priceHistory: PriceHistoryType = (displayFlightData as { priceHistory?: PriceHistoryType }).priceHistory || {
    flightId: flight.id,
    points: generateMockPriceHistory(flight.price),
    currentPrice: flight.price,
    trend: 'stable',
    // Mark as mock
    isMock: true,
  };

  // Check if arrival is next day
  const departureDate = new Date(flight.departureTime);
  const arrivalDate = new Date(flight.arrivalTime);
  const isNextDay = arrivalDate.getDate() !== departureDate.getDate();

  // Price trend icon
  const trendIcon = {
    rising: <TrendingUp className="w-4 h-4 text-danger" />,
    falling: <TrendingDown className="w-4 h-4 text-success" />,
    stable: <Minus className="w-4 h-4 text-text-muted" />,
  };

  const trendText = {
    rising: 'Prices are rising',
    falling: 'Prices are falling',
    stable: 'Prices are stable',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="header-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to results
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{flight.airline}</h1>
                {isFromSerpAPI && (
                  <span className="text-xs bg-success text-white px-2 py-0.5 rounded-full">
                    Live Data
                  </span>
                )}
                <span className="text-white/80">{flight.flightNumber}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold">{flight.departureCityCode}</span>
                <Plane className="w-6 h-6 " />
                <span className="text-3xl font-bold">{flight.arrivalCityCode}</span>
              </div>
            </div>
            <ScoreBadge score={score.overallScore} size="lg" />
          </div>
        </div>
      </header>

      {/* Round Trip Sub-tabs - only shown when viewing round trip flights */}
      {isRoundTrip && returnFlightData && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <span className="text-sm font-medium text-text-primary">Round Trip Summary</span>
              <span className="text-lg font-bold text-primary">Total: ${totalPrice}</span>
            </div>
            
            {/* Tab buttons */}
            <div className="flex border border-divider rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setActiveTab('departure')}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  activeTab === 'departure' 
                    ? "bg-primary text-white" 
                    : "text-text-secondary hover:bg-gray-50"
                )}
              >
                <Plane className="w-4 h-4" />
                Departure Flight
                <span className="text-xs opacity-80">${stateFlightData?.flight.price}</span>
              </button>
              <button
                onClick={() => setActiveTab('return')}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  activeTab === 'return' 
                    ? "bg-primary text-white" 
                    : "text-text-secondary hover:bg-gray-50"
                )}
              >
                <Plane className="w-4 h-4 rotate-180" />
                Return Flight
                <span className="text-xs opacity-80">${returnFlightData.flight.price}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Flight Summary Card */}
        <div className="bg-surface rounded-card shadow-card p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Times */}
            <div className="flex items-center gap-4 md:gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">
                  {formatTime(flight.departureTime)}
                </p>
                <p className="text-text-secondary font-medium">{flight.departureCityCode}</p>
                <p className="text-sm text-text-muted">{flight.departureAirport}</p>
              </div>

              <div className="flex-1 min-w-[120px] px-4">
                <div className="flex items-center justify-center gap-2 text-text-secondary mb-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(flight.durationMinutes)}</span>
                </div>
                <div className="flex items-center gap-3">
  {/* Left line */}
  <div className="h-px flex-1 bg-border" />

  {/* Middle label */}
  <div className="bg-surface px-4 py-1 w-max whitespace-nowrap rounded">
    <div
      className={cn(
        'flex items-center justify-center gap-1 text-sm font-medium',
        flight.stops === 0 ? 'text-success' : 'text-text-secondary'
      )}
    >
      <Plane className="w-3 h-3" />
      <span>
        {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
      </span>
    </div>
  </div>

  {/* Right line */}
  <div className="h-px flex-1 bg-border" />
</div>

                {flight.stopCities && flight.stopCities.length > 0 && (
                  <p className="text-xs text-text-muted text-center mt-2">
                    via {flight.stopCities.join(', ')}
                  </p>
                )}
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">
                  {formatTime(flight.arrivalTime)}
                  {isNextDay && <span className="text-lg text-accent ml-1">+1</span>}
                </p>
                <p className="text-text-secondary font-medium">{flight.arrivalCityCode}</p>
                <p className="text-sm text-text-muted">{flight.arrivalAirport}</p>
              </div>
            </div>

            {/* Price + Actions */}
            <div className="flex flex-col items-center md:items-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-divider md:pl-6">
              <div className="text-center md:text-right">
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(flight.price, flight.currency)}
                </p>
                <p className="text-sm text-text-muted">per person</p>
              </div>
              <div className="flex items-center gap-2">
                <FavoriteButton flightWithScore={flightData} size="md" />
                <button
                  onClick={() => setShowSharePoster(true)}
                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  aria-label="Share flight"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                  aria-label="Report issue"
                  title="Feedback & Report"
                >
                  <MessageSquareWarning className="w-5 h-5" />
                </button>
                <CompareButton flightWithScore={flightData} variant="outline" size="md" />
              </div>
            </div>
          </div>

          {/* Date + Aircraft */}
          <div className="mt-4 pt-4 border-t border-divider flex flex-wrap gap-4 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(flight.departureTime)}</span>
            </div>
            {flight.aircraftModel && (
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 " />
                <span>{flight.aircraftModel}</span>
              </div>
            )}
            {flight.seatsRemaining && (
              <div className={cn(
                'flex items-center gap-2',
                flight.seatsRemaining < 5 && 'text-danger'
              )}>
                <span>{flight.seatsRemaining} seats remaining</span>
              </div>
            )}
          </div>
        </div>

        {/* Flight Route Map */}
        <div className="bg-surface rounded-card shadow-card overflow-hidden">
          <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Flight Route
            </h2>
          </div>
          <Suspense fallback={
            <div className="h-[300px] flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          }>
            <FlightRouteMap
              departureCode={flight.departureAirportCode || flight.departureCityCode}
              arrivalCode={flight.arrivalAirportCode || flight.arrivalCityCode}
              layoverCodes={flight.stopCities?.map(city => {
                // Pass the city/airport names - the backend will handle matching
                return city;
              })}
              height="300px"
              showLabels={true}
              departureTime={formatTime(flight.departureTime)}
              arrivalTime={formatTime(flight.arrivalTime)}
            />
          </Suspense>
        </div>

        {/* Flight Timeline */}
<div className="bg-surface rounded-card shadow-card p-5 md:p-6">
  <h2 className="text-lg font-semibold text-text-primary mb-4">
    Flight Timeline
  </h2>
  
  <div className="relative">
    {/* Timeline Line */}
    <div className="absolute left-4 top-8 bottom-20 w-0.5 bg-gradient-to-b from-primary via-primary to-success" />

    {/* Departure */}
    <div className="relative flex items-start gap-4 pb-5">
      <div className="relative z-10 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
        <PlaneTakeoff className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-text-muted">Departure</p>
        <p className="text-xl font-bold text-text-primary">{formatTime(flight.departureTime)}</p>
        <p className="font-medium text-text-primary">{flight.departureAirport}</p>
        {/* <p className="text-sm text-text-secondary">{flight.departureCity}</p> */}
        <p className="text-xs text-text-muted mt-1">{formatDate(flight.departureTime)}</p>
      </div>
    </div>
    
    {/* Flight Duration */}
    <div className="relative flex items-start gap-4 pb-10">
      <div className="relative z-10 w-8 h-8 rounded-full bg-surface-alt border-2 border-primary flex items-center justify-center">
        <Clock className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-text-muted">Flight Duration</p>
        <p className="font-semibold text-text-primary">{formatDuration(flight.durationMinutes)}</p>
        {flight.stops > 0 && flight.stopCities && (
          <p className="font-medium text-text-primary mt-1">
            {flight.stops} stop{flight.stops > 1 ? 's' : ''}: {flight.stopCities.join(', ')}
          </p>
        )}
      </div>
    </div>
    
    {/* Arrival */}
    <div className="relative flex items-start gap-4">
      <div className="relative z-10 w-8 h-8 rounded-full bg-success flex items-center justify-center">
        <PlaneLanding className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-text-muted">Arrival</p>
        <p className="text-xl font-bold text-text-primary">
          {formatTime(flight.arrivalTime)}
          {isNextDay && <span className="text-sm text-accent ml-1">+1 day</span>}
        </p>
        <p className="font-medium text-text-primary">{flight.arrivalAirport}</p>
        {/* <p className="text-sm text-text-secondary">{flight.arrivalCity}</p> */}
        <p className="text-xs text-text-muted mt-1">{formatDate(flight.arrivalTime)}</p>
      </div>
    </div>
  </div>
</div>


        {/* AirEase Score Analysis (with integrated radar chart) */}
        <WhyThisFlight 
          score={score} 
          facilities={facilities}
          flightData={{
            price: flight.price,
            durationMinutes: flight.durationMinutes,
            stops: flight.stops,
          }}
          initialExpanded={true} 
        />

        {/* Amenities */}
        <div className="bg-surface rounded-card shadow-card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Amenities & Facilities
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              facilities.hasWifi ? 'bg-success-light' : 'bg-surface-alt'
            )}>
              <Wifi className={cn(
                'w-5 h-5',
                facilities.hasWifi ? 'text-success' : 'text-text-muted'
              )} />
              <span className={facilities.hasWifi ? 'text-text-primary' : 'text-text-muted'}>
                {facilities.hasWifi ? 'WiFi' : 'No WiFi'}
              </span>
            </div>

            <div className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              facilities.hasPower ? 'bg-success-light' : 'bg-surface-alt'
            )}>
              <Power className={cn(
                'w-5 h-5',
                facilities.hasPower ? 'text-success' : 'text-text-muted'
              )} />
              <span className={facilities.hasPower ? 'text-text-primary' : 'text-text-muted'}>
                {facilities.hasPower ? 'Power' : 'No Power'}
              </span>
            </div>

            <div className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              facilities.hasIFE ? 'bg-success-light' : 'bg-surface-alt'
            )}>
              <Tv className={cn(
                'w-5 h-5',
                facilities.hasIFE ? 'text-success' : 'text-text-muted'
              )} />
              <span className={facilities.hasIFE ? 'text-text-primary' : 'text-text-muted'}>
                {facilities.hasIFE ? facilities.ifeType : 'No IFE'}
              </span>
            </div>

            <div className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              facilities.mealIncluded ? 'bg-success-light' : 'bg-surface-alt'
            )}>
              <UtensilsCrossed className={cn(
                'w-5 h-5',
                facilities.mealIncluded ? 'text-success' : 'text-text-muted'
              )} />
              <span className={facilities.mealIncluded ? 'text-text-primary' : 'text-text-muted'}>
                {facilities.mealIncluded ? facilities.mealType : 'No Meal'}
              </span>
            </div>
          </div>

          {facilities.seatPitchInches && (
            <div className="mt-4 p-4 bg-surface-alt rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Seat Pitch</p>
                  <p className="text-lg font-semibold text-text-primary">
                    {facilities.seatPitchInches}" ({facilities.seatPitchCategory})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted">Cabin</p>
                  <p className="text-lg font-semibold text-text-primary capitalize">
                    {flight.cabin}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price Trend */}
        {priceHistory && (
          <div className="bg-surface rounded-card shadow-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Price Trend
              </h2>
              <div className="flex items-center gap-2">
                {trendIcon[priceHistory.trend]}
                <span className="text-sm text-text-secondary">
                  {trendText[priceHistory.trend]}
                </span>
              </div>
            </div>
            
            {/* Price Line Chart */}
            <div className="relative h-48 mt-4">
              {/* Y-axis labels */}
              {(() => {
                const prices: number[] = priceHistory.points.slice(-14).map((p: PricePoint) => p.price);
                const max = Math.max(...prices);
                const min = Math.min(...prices);
                const range = max - min || 1;
                
                return (
                  <>
                    <div className="absolute left-0 top-0 bottom-8 w-14 flex flex-col justify-between text-xs text-text-muted">
                      <span>${max}</span>
                      <span>${Math.round((max + min) / 2)}</span>
                      <span>${min}</span>
                    </div>
                    
                    {/* Grid lines */}
                    <div className="absolute left-16 right-0 top-0 bottom-8">
                      <div className="absolute top-0 left-0 right-0 border-t border-dashed border-divider" />
                      <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-divider" />
                      <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-divider" />
                    </div>
                    
                    {/* Line Chart SVG */}
                    <svg 
                      className="absolute left-16 right-0 top-0 bottom-8"
                      viewBox="0 0 400 160"
                      preserveAspectRatio="none"
                    >
                      {/* Gradient fill */}
                      <defs>
                        <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      
                      {/* Area fill */}
                      <path
                        d={`
                          M 0 ${160 - ((prices[0] - min) / range) * 140 - 10}
                          ${prices.map((price: number, i: number) => {
                            const x = (i / (prices.length - 1)) * 400;
                            const y = 160 - ((price - min) / range) * 140 - 10;
                            return `L ${x} ${y}`;
                          }).join(' ')}
                          L 400 160
                          L 0 160
                          Z
                        `}
                        fill="url(#priceGradient)"
                      />
                      
                      {/* Line */}
                      <path
                        d={`
                          M 0 ${160 - ((prices[0] - min) / range) * 140 - 10}
                          ${prices.map((price: number, i: number) => {
                            const x = (i / (prices.length - 1)) * 400;
                            const y = 160 - ((price - min) / range) * 140 - 10;
                            return `L ${x} ${y}`;
                          }).join(' ')}
                        `}
                        fill="none"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Data points */}
                      {prices.map((price: number, i: number) => {
                        const x = (i / (prices.length - 1)) * 400;
                        const y = 160 - ((price - min) / range) * 140 - 10;
                        const isLatest = i === prices.length - 1;
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r={isLatest ? 6 : 3}
                            fill={isLatest ? 'rgb(59, 130, 246)' : 'white'}
                            stroke="rgb(59, 130, 246)"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </svg>
                    
                    {/* Current price indicator */}
                    <div className="absolute right-0 top-0 -translate-y-1/2 bg-primary text-white text-xs font-semibold px-2 py-1 rounded-lg">
                      ${priceHistory.currentPrice}
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-text-muted mt-2 pl-16">
              <span>14 days ago</span>
              <span>7 days ago</span>
              <span>Today</span>
            </div>
            
            {/* Price summary */}
            <div className="mt-4 pt-4 border-t border-divider grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-text-muted">Lowest</p>
                <p className="text-lg font-semibold text-success">
                  ${Math.min(...priceHistory.points.slice(-14).map((p: PricePoint) => p.price))}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Average</p>
                <p className="text-lg font-semibold text-text-primary">
                  ${Math.round(priceHistory.points.slice(-14).reduce((sum: number, p: PricePoint) => sum + p.price, 0) / Math.min(14, priceHistory.points.length))}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Current</p>
                <p className="text-lg font-semibold text-primary">
                  ${priceHistory.currentPrice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seat Map - PAUSED: Amadeus test env returns cached/mock data, not real-time.
           Re-enable when upgraded to Amadeus production (api.amadeus.com).
           See: https://amadeus4dev.github.io/developer-guides/test-data/#test-vs-production
        {flight.id?.startsWith('serp-') && (
          <SeatMapView flightId={flight.id} onEnrichment={handleSeatmapEnrichment} />
        )}
        */}

        {/* User Reviews Carousel - fetched on-demand for performance */}
        {isLoadingReviews ? (
          <div className="bg-surface rounded-card shadow-card p-5 md:p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin mr-2" />
              <span className="text-text-secondary">Loading reviews...</span>
            </div>
          </div>
        ) : reviewsData && reviewsData.reviews.length > 0 ? (
          <div className="bg-surface rounded-card shadow-card p-5 md:p-6">
            <UserReviewsCarousel
              reviews={reviewsData.reviews.map(r => ({
                title: r.title,
                review: r.review,
                foodRating: r.foodRating,
                groundServiceRating: r.groundServiceRating,
                seatComfortRating: r.seatComfortRating,
                serviceRating: r.serviceRating,
                recommended: r.recommended,
                travelType: r.travelType,
                route: r.route,
                aircraft: r.aircraft,
                cabinType: r.cabinType,
                ratings: {
                  ...r.ratings,
                  overall: r.ratings.overall ?? undefined
                }
              }))}
              airlineName={flight.airline}
            />
          </div>
        ) : null}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Book on Airline Button */}
          {/* For round trips: departure flight has departure_token (no booking_token),
              return flight has the booking_token for the whole trip.
              So we check both current flight AND return flight for a booking token. */}
          {(() => {
            // Find a valid booking token: prefer current flight's, then return flight's, then departure flight's
            const availableToken = flight.bookingToken
              || (isRoundTrip && returnFlightData?.flight.bookingToken ? returnFlightData.flight.bookingToken : undefined)
              || (isRoundTrip && flightData?.flight.bookingToken ? flightData.flight.bookingToken : undefined);
            
            if (bookingApi.hasBookingToken(availableToken)) {
              return (
                <button
                  onClick={() => {
                    const depFlight = flightData?.flight || flight;
                    const outboundDate = new Date(depFlight.departureTime)
                      .toISOString()
                      .split('T')[0];
                    
                    const params: Parameters<typeof bookingApi.openBookingPage>[0] = {
                      bookingToken: availableToken!,
                      airlineName: flight.airline,
                      departureId: depFlight.departureAirportCode || depFlight.departureCityCode,
                      arrivalId: depFlight.arrivalAirportCode || depFlight.arrivalCityCode,
                      outboundDate,
                    };

                    // Add return date for round trips
                    if (isRoundTrip && returnFlightData) {
                      params.returnDate = new Date(returnFlightData.flight.departureTime)
                        .toISOString()
                        .split('T')[0];
                    }

                    bookingApi.openBookingPage(params);
                  }}
                  className="flex-1 py-4 btn-primary text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                  <span>Book on {flight.airline}</span>
                  <ExternalLink className="w-5 h-5" />
                </button>
              );
            }
            
            // No booking token available — use the backend booking redirect with
            // departure_token if available (backend will resolve it via SerpAPI)
            return (
              <button
                onClick={() => {
                  const depFlight = flightData?.flight || flight;
                  const token = flight.bookingToken || depFlight.bookingToken
                    || flight.departureToken || depFlight.departureToken || '';
                  
                  if (token) {
                    const outboundDate = new Date(depFlight.departureTime)
                      .toISOString()
                      .split('T')[0];
                    bookingApi.openBookingPage({
                      bookingToken: token,
                      airlineName: flight.airline,
                      departureId: depFlight.departureAirportCode || depFlight.departureCityCode,
                      arrivalId: depFlight.arrivalAirportCode || depFlight.arrivalCityCode,
                      outboundDate,
                    });
                  } else {
                    // Absolute last resort: search on Google Flights
                    const from = depFlight.departureAirportCode || depFlight.departureCityCode;
                    const to = depFlight.arrivalAirportCode || depFlight.arrivalCityCode;
                    const date = new Date(depFlight.departureTime).toISOString().split('T')[0];
                    window.open(
                      `https://www.google.com/travel/flights?q=flights+from+${from}+to+${to}+on+${date}`,
                      '_blank', 'noopener,noreferrer'
                    );
                  }
                }}
                className="flex-1 py-4 btn-primary text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <span>Book on {flight.airline}</span>
                <ExternalLink className="w-5 h-5" />
              </button>
            );
          })()}
          <CompareButton
            flightWithScore={flightData}
            variant="outline"
            size="lg"
            className="sm:w-auto"
          />
        </div>
      </main>

      {/* Share Poster Modal */}
      <SharePoster
        flightWithScore={flightData}
        isOpen={showSharePoster}
        onClose={() => setShowSharePoster(false)}
      />

      {/* Feedback Modal - 反馈与纠错 */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        flightInfo={{
          id: flight.id,
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          route: `${flight.departureCityCode} → ${flight.arrivalCityCode}`,
          date: formatDate(flight.departureTime),
          aircraftModel: flight.aircraftModel || undefined,
        }}
      />
    </div>
  );
};

export default FlightDetailPage;
