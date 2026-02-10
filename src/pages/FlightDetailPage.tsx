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
  Loader2,
  Share2,
  PlaneTakeoff,
  PlaneLanding,
  Map,
  MessageSquareWarning,
  ExternalLink,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { flightsApi } from '../api/flights';
import { bookingApi } from '../api/booking';
import { fetchSafetyProfile } from '../api/aircraft';
import type { SafetyProfile } from '../api/aircraft';
import { formatTime, formatDuration, formatPrice, formatDate } from '../utils/formatters';
import FavoriteButton from '../components/flights/FavoriteButton';
import SharePoster from '../components/flights/SharePoster';
import UserReviewsCarousel from '../components/flights/UserReviewsCarousel';
import CompareButton from '../components/compare/CompareButton';
import { FeedbackModal } from '../components/common/FeedbackModal';
import { cn } from '../utils/cn';
import type { FlightWithScore } from '../api/types';

// Lazy load the map component to avoid SSR issues with Leaflet
const FlightRouteMap = lazy(() => import('../components/flights/FlightRouteMap'));

/**
 * Convert a 0-10 score to a 5-point scale (e.g., 7.5 → 3.8)
 */
function toFivePointScale(score: number): string {
  // If already 0-10, convert to 0-5
  const fivePoint = score <= 10 ? score / 2 : score / 20;
  return fivePoint.toFixed(1);
}

/**
 * Flight Detail Page
 * 
 * Clean, simplified layout:
 * 1. Route summary (airline, times, price)
 * 2. Flying Score row (5-point scale) with expandable details
 * 3. "See more" section for all other details
 * 4. Booking CTA
 */
const FlightDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSharePoster, setShowSharePoster] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  
  // Round trip sub-tab state
  const [activeTab, setActiveTab] = useState<'departure' | 'return'>('departure');

  // Check if we have flight data passed via router state (from SerpAPI)
  const stateFlightData = location.state?.flightWithScore as FlightWithScore | undefined;
  const returnFlightData = location.state?.returnFlight as FlightWithScore | undefined;
  const isRoundTrip = location.state?.isRoundTrip as boolean | undefined;
  const totalPrice = location.state?.totalPrice as number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isFromSerpAPI = !!stateFlightData && id?.startsWith('serp-');

  // Fallback to API if no state data
  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['flight', id],
    queryFn: () => flightsApi.getDetail(id!),
    enabled: !!id && !stateFlightData,
  });

  const flightData = stateFlightData || apiData;
  
  const currentDisplayFlight = isRoundTrip && activeTab === 'return' && returnFlightData 
    ? returnFlightData 
    : flightData;
  
  // Fetch user reviews on-demand
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['airline-reviews', currentDisplayFlight?.flight.airline, currentDisplayFlight?.flight.cabin],
    queryFn: () => flightsApi.getAirlineReviews(
      currentDisplayFlight!.flight.airline,
      currentDisplayFlight!.flight.cabin || 'economy',
      10
    ),
    enabled: !!currentDisplayFlight?.flight.airline,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch NTSB safety profile (engine, age, accident records)
  // Falls back to OpenSky aircraft_database for engine & age when NTSB has no data
  const { data: safetyProfile } = useQuery<SafetyProfile | null>({
    queryKey: ['safety-profile', currentDisplayFlight?.flight.flightNumber, currentDisplayFlight?.flight.airline, currentDisplayFlight?.flight.aircraftModel],
    queryFn: () => fetchSafetyProfile({
      flightCode: currentDisplayFlight?.flight.flightNumber || undefined,
      airline: currentDisplayFlight?.flight.airline || undefined,
      airlineIata: currentDisplayFlight?.flight.airlineCode || undefined,
      model: currentDisplayFlight?.flight.aircraftModel || undefined,
    }),
    enabled: !!(currentDisplayFlight?.flight.flightNumber || currentDisplayFlight?.flight.airline || currentDisplayFlight?.flight.aircraftModel),
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
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

  const displayFlightData = isRoundTrip && activeTab === 'return' && returnFlightData 
    ? returnFlightData 
    : flightData;

  const { flight, score, facilities } = displayFlightData;

  // Check if arrival is next day
  const departureDate = new Date(flight.departureTime);
  const arrivalDate = new Date(flight.arrivalTime);
  const isNextDay = arrivalDate.getDate() !== departureDate.getDate();

  // 5-point score
  const fivePointScore = toFivePointScale(score.overallScore);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#64B5F6] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to results
          </button>

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
              <Plane className="w-6 h-6" />
              <span className="text-3xl font-bold">{flight.arrivalCityCode}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Round Trip Sub-tabs */}
      {isRoundTrip && returnFlightData && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <span className="text-sm font-medium text-text-primary">Round Trip Summary</span>
              <span className="text-lg font-bold text-primary">Total: ${totalPrice}</span>
            </div>
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
                Departure
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
                Return
                <span className="text-xs opacity-80">${returnFlightData.flight.price}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
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
                  <div className="h-px flex-1 bg-border" />
                  <div className="bg-surface px-4 py-1 w-max whitespace-nowrap rounded">
                    <div className={cn(
                      'flex items-center justify-center gap-1 text-sm font-medium',
                      flight.stops === 0 ? 'text-success' : 'text-text-secondary'
                    )}>
                      <Plane className="w-3 h-3" />
                      <span>
                        {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
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
                <Plane className="w-4 h-4" />
                <span>{flight.aircraftModel}</span>
              </div>
            )}

            {/* Engine info from safety profile (NTSB → OpenSky fallback) */}
            {safetyProfile?.technical_specs?.engine && (
              <div className="flex items-center gap-2">
                <span>⚙️</span>
                <span>{safetyProfile.technical_specs.engine}</span>
              </div>
            )}

            {/* Aircraft age from safety profile (OpenSky fallback) */}
            {safetyProfile?.flight_info?.age_years != null && (
              <div className={cn(
                'flex items-center gap-2',
                safetyProfile.flight_info.age_years <= 5 ? 'text-green-600' :
                safetyProfile.flight_info.age_years <= 15 ? 'text-text-secondary' :
                'text-amber-600'
              )}>
                <span>📅</span>
                <span>
                  {safetyProfile.flight_info.age_label ?? `${safetyProfile.flight_info.age_years} years old`}
                  {safetyProfile.flight_info.age_years <= 3 ? ' (New)' : ''}
                </span>
              </div>
            )}

            {/* Tail number (resolved via FlightRadar24) */}
            {safetyProfile?.flight_info?.tail_number && (
              <div className="flex items-center gap-2">
                <span>🔖</span>
                <span>{safetyProfile.flight_info.tail_number}</span>
              </div>
            )}

            {/* Safety summary badge */}
            {safetyProfile && (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  NTSB Safety Data
                </span>
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

        {/* Flying Score Row - 5 point scale */}
        <div className="bg-surface rounded-card shadow-card overflow-hidden">
          <button
            onClick={() => setShowScoreDetails(!showScoreDetails)}
            className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-score flex items-center justify-center">
                <Star className="w-6 h-6 text-white fill-white" />
              </div>
              <div className="text-left">
                <p className="text-sm text-text-muted">Flying Score</p>
                <p className="text-2xl font-bold text-text-primary">
                  {fivePointScore}<span className="text-base font-normal text-text-muted"> / 5</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <span>{showScoreDetails ? 'Hide details' : 'See details'}</span>
              {showScoreDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Score Details - Expandable */}
          {showScoreDetails && (
            <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-divider animate-fade-in">
              <div className="pt-4 space-y-4">
                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {score.dimensions && (
                    <>
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Reliability</p>
                        <p className="text-lg font-bold text-text-primary">
                          {toFivePointScale(score.dimensions.reliability)}<span className="text-sm font-normal text-text-muted">/5</span>
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">On-time performance</p>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Comfort</p>
                        <p className="text-lg font-bold text-text-primary">
                          {toFivePointScale(score.dimensions.comfort)}<span className="text-sm font-normal text-text-muted">/5</span>
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">Seat & cabin quality</p>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Service</p>
                        <p className="text-lg font-bold text-text-primary">
                          {toFivePointScale(score.dimensions.service)}<span className="text-sm font-normal text-text-muted">/5</span>
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">Crew & hospitality</p>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Value</p>
                        <p className="text-lg font-bold text-text-primary">
                          {toFivePointScale(score.dimensions.value)}<span className="text-sm font-normal text-text-muted">/5</span>
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">Price vs quality</p>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Amenities</p>
                        <p className="text-lg font-bold text-text-primary">
                          {toFivePointScale(score.dimensions.amenities ?? 5)}<span className="text-sm font-normal text-text-muted">/5</span>
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">WiFi, power & entertainment</p>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Efficiency</p>
                        <p className="text-lg font-bold text-text-primary">
                          {toFivePointScale(score.dimensions.efficiency ?? 5)}<span className="text-sm font-normal text-text-muted">/5</span>
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">Route & duration</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Why This Score - Explanations */}
                {score.explanations && score.explanations.length > 0 && (
                  <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Why this score
                    </h4>
                    <div className="space-y-2">
                      {score.explanations.map((exp, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className={cn(
                            'mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                            exp.isPositive ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                          )}>
                            {exp.isPositive ? '✓' : '!'}
                          </span>
                          <div>
                            <p className="font-medium text-text-primary">{exp.title}</p>
                            <p className="text-xs text-text-secondary">{exp.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aircraft & Airline Details */}
                <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                  <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Flight Details
                  </h4>
                  
                  {flight.aircraftModel && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Aircraft</span>
                      <span className="font-medium text-text-primary">{flight.aircraftModel}</span>
                    </div>
                  )}
                  
                  {flight.airline && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Airline</span>
                      <span className="font-medium text-text-primary">{flight.airline}</span>
                    </div>
                  )}

                  {flight.cabin && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Cabin</span>
                      <span className="font-medium text-text-primary capitalize">{flight.cabin}</span>
                    </div>
                  )}

                  {facilities.seatPitchInches && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Seat Pitch</span>
                      <span className="font-medium text-text-primary">
                        {facilities.seatPitchInches}" ({facilities.seatPitchCategory})
                      </span>
                    </div>
                  )}
                </div>

                {/* How Score is Calculated */}
                <div className="p-4 bg-surface-alt rounded-lg">
                  <h4 className="text-sm font-semibold text-text-primary mb-2">How is the score calculated?</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    The Flying Score is a weighted average across 6 key dimensions: 
                    <strong> Reliability</strong> (on-time performance), 
                    <strong> Comfort</strong> (seat space, aircraft age, cabin quality), 
                    <strong> Service</strong> (crew rating, food quality), 
                    <strong> Value</strong> (price vs quality ratio),
                    <strong> Amenities</strong> (WiFi, power, entertainment, meals), and
                    <strong> Efficiency</strong> (route directness, flight duration). 
                    Each dimension is scored 0–5, and the overall score reflects 
                    your travel preferences.
                  </p>
                  {score.personaWeightsApplied && (
                    <p className="text-xs text-primary mt-2">
                      Optimized for: <span className="font-medium">{score.personaWeightsApplied}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* See More / See Less - All other details */}
        <div className="bg-surface rounded-card shadow-card overflow-hidden">
          <button
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-text-primary">Flight Details</span>
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <span>{showMoreDetails ? 'See less' : 'See more'}</span>
              {showMoreDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {showMoreDetails && (
            <div className="border-t border-divider animate-fade-in">
              {/* Flight Route Map */}
              <div className="border-b border-divider">
                <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 flex items-center gap-2">
                  <Map className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-text-primary">Flight Route</h2>
                </div>
                <Suspense fallback={
                  <div className="h-[300px] flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                }>
                  <FlightRouteMap
                    departureCode={flight.departureAirportCode || flight.departureCityCode}
                    arrivalCode={flight.arrivalAirportCode || flight.arrivalCityCode}
                    layoverCodes={flight.stopCities?.map(city => city)}
                    height="300px"
                    showLabels={true}
                    departureTime={formatTime(flight.departureTime)}
                    arrivalTime={formatTime(flight.arrivalTime)}
                  />
                </Suspense>
              </div>

              {/* Flight Timeline */}
              <div className="p-5 md:p-6 border-b border-divider">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Flight Timeline</h2>
                <div className="relative">
                  <div className="absolute left-4 top-8 bottom-20 w-0.5 bg-gradient-to-b from-primary via-primary to-success" />
                  
                  <div className="relative flex items-start gap-4 pb-5">
                    <div className="relative z-10 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <PlaneTakeoff className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-text-muted">Departure</p>
                      <p className="text-xl font-bold text-text-primary">{formatTime(flight.departureTime)}</p>
                      <p className="font-medium text-text-primary">{flight.departureAirport}</p>
                      <p className="text-xs text-text-muted mt-1">{formatDate(flight.departureTime)}</p>
                    </div>
                  </div>
                  
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
                      <p className="text-xs text-text-muted mt-1">{formatDate(flight.arrivalTime)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="p-5 md:p-6 border-b border-divider">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Amenities & Facilities</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.hasWifi ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <Wifi className={cn('w-5 h-5', facilities.hasWifi ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.hasWifi ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.hasWifi ? 'WiFi' : 'No WiFi'}
                    </span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.hasPower ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <Power className={cn('w-5 h-5', facilities.hasPower ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.hasPower ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.hasPower ? 'Power' : 'No Power'}
                    </span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.hasIFE ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <Tv className={cn('w-5 h-5', facilities.hasIFE ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.hasIFE ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.hasIFE ? facilities.ifeType : 'No IFE'}
                    </span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.mealIncluded ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <UtensilsCrossed className={cn('w-5 h-5', facilities.mealIncluded ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.mealIncluded ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.mealIncluded ? facilities.mealType : 'No Meal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* NTSB Safety Records */}
              {safetyProfile && (
                <div className="p-5 md:p-6 border-b border-divider">
                  <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    Safety Profile (NTSB)
                  </h2>

                  {/* Tail number & engine summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {safetyProfile.flight_info.tail_number && (
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Tail Number</p>
                        <p className="text-sm font-semibold text-text-primary">{safetyProfile.flight_info.tail_number}</p>
                      </div>
                    )}
                    {safetyProfile.flight_info.model && (
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Aircraft Model</p>
                        <p className="text-sm font-semibold text-text-primary">{safetyProfile.flight_info.model}</p>
                      </div>
                    )}
                    {safetyProfile.technical_specs.engine && (
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Engine</p>
                        <p className="text-sm font-semibold text-text-primary">{safetyProfile.technical_specs.engine}</p>
                      </div>
                    )}
                    {safetyProfile.flight_info.airline && (
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Operator</p>
                        <p className="text-sm font-semibold text-text-primary">{safetyProfile.flight_info.airline}</p>
                      </div>
                    )}
                    {safetyProfile.flight_info.built_year && (
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Built Year</p>
                        <p className="text-sm font-semibold text-text-primary">{safetyProfile.flight_info.built_year}</p>
                      </div>
                    )}
                    {safetyProfile.flight_info.age_years !== null && safetyProfile.flight_info.age_years !== undefined && (
                      <div className="p-3 bg-surface-alt rounded-lg">
                        <p className="text-xs text-text-muted mb-1">Aircraft Age</p>
                        <p className={`text-sm font-semibold ${
                          safetyProfile.flight_info.age_years <= 5 ? 'text-green-600' :
                          safetyProfile.flight_info.age_years <= 15 ? 'text-text-primary' :
                          'text-amber-600'
                        }`}>
                          {safetyProfile.flight_info.age_label || `${safetyProfile.flight_info.age_years} years`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Accident stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-text-muted mb-1">This Plane</p>
                      <p className="text-xl font-bold text-green-700">
                        {safetyProfile.safety_records.this_plane_accidents !== null
                          ? safetyProfile.safety_records.this_plane_accidents.length
                          : '—'}
                      </p>
                      <p className="text-xs text-text-muted">NTSB events</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-text-muted mb-1">Airline (10 yr)</p>
                      <p className="text-xl font-bold text-blue-700">
                        {safetyProfile.safety_records.airline_total_accidents}
                      </p>
                      <p className="text-xs text-text-muted">total events</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-center">
                      <p className="text-xs text-text-muted mb-1">Model (all time)</p>
                      <p className="text-xl font-bold text-amber-700">
                        {safetyProfile.safety_records.model_total_accidents}
                      </p>
                      <p className="text-xs text-text-muted">total events</p>
                    </div>
                  </div>

                  {/* Per-plane accident history */}
                  {safetyProfile.safety_records.this_plane_accidents && safetyProfile.safety_records.this_plane_accidents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Incident History for {safetyProfile.flight_info.tail_number}
                      </h4>
                      {safetyProfile.safety_records.this_plane_accidents.map((acc, idx) => (
                        <div key={idx} className="p-3 bg-surface-alt rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-text-primary">{acc.date || 'Unknown date'}</span>
                            {acc.injury_severity && (
                              <span className={cn(
                                'text-xs px-2 py-0.5 rounded-full font-medium',
                                acc.injury_severity === 'FATL' ? 'bg-red-100 text-red-700' :
                                acc.injury_severity === 'SERS' ? 'bg-orange-100 text-orange-700' :
                                acc.injury_severity === 'MINR' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              )}>
                                {acc.injury_severity}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">
                            {[acc.city, acc.state, acc.country].filter(Boolean).join(', ')}
                          </p>
                          {acc.cause && (
                            <p className="text-xs text-text-secondary mt-1">{acc.cause}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {safetyProfile.safety_records.this_plane_accidents !== null && safetyProfile.safety_records.this_plane_accidents.length === 0 && (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      No NTSB incident records found for this aircraft — clean history.
                    </p>
                  )}

                  {safetyProfile.safety_records.this_plane_accidents === null && (
                    <p className="text-xs text-text-muted italic">
                      Tail number could not be resolved (flight may not be active). Showing airline & model statistics only.
                    </p>
                  )}
                </div>
              )}

              {/* User Reviews */}
              {isLoadingReviews ? (
                <div className="p-5 md:p-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mr-2" />
                    <span className="text-text-secondary">Loading reviews...</span>
                  </div>
                </div>
              ) : reviewsData && reviewsData.reviews.length > 0 ? (
                <div className="p-5 md:p-6">
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
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {(() => {
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

      {/* Feedback Modal */}
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
