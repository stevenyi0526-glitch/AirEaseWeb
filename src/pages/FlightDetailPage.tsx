import React, { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  Map,
  MessageSquareWarning,
  ExternalLink,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { flightsApi } from '../api/flights';
import { bookingApi } from '../api/booking';
import { fetchSafetyProfile } from '../api/aircraft';
import type { SafetyProfile } from '../api/aircraft';
import { formatTime, formatDuration, formatDate } from '../utils/formatters';
import { translateAirline, translateAirport, translateAircraft, translateCabin, translateText } from '../utils/translate';
import { formatPriceWithCurrency } from '../components/common/CurrencySelector';
import FavoriteButton from '../components/flights/FavoriteButton';
import SharePoster from '../components/flights/SharePoster';
import UserReviewsCarousel from '../components/flights/UserReviewsCarousel';
import { FeedbackModal } from '../components/common/FeedbackModal';
import { BookingReviewModal } from '../components/common/BookingReviewModal';
import { IncidentRecordsModal } from '../components/common/IncidentRecordsModal';
import { trackBookingClick } from '../components/common/BookingTracker';
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
 * Get gradient color class for a score (0-10 scale)
 * Green: 8-10, Yellow/Amber: 4-7.9, Red: 0-3.9
 */
function getScoreColorClass(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-amber-600';
  return 'text-red-600';
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
  const { t } = useTranslation();
  const [showSharePoster, setShowSharePoster] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [reviewTrigger, setReviewTrigger] = useState(0);
  const safetyRef = React.useRef<HTMLDivElement>(null);
  const [incidentModal, setIncidentModal] = useState<{
    open: boolean;
    queryType: 'tail' | 'airline' | 'model';
    queryValue: string;
    label: string;
  }>({ open: false, queryType: 'tail', queryValue: '', label: '' });
  
  // Round trip sub-tab state
  const [activeTab, setActiveTab] = useState<'departure' | 'return'>('departure');

  // Check if we have flight data passed via router state (from SerpAPI)
  const stateFlightData = location.state?.flightWithScore as FlightWithScore | undefined;
  const returnFlightData = location.state?.returnFlight as FlightWithScore | undefined;
  const isRoundTrip = location.state?.isRoundTrip as boolean | undefined;
  const totalPrice = location.state?.totalPrice as number | undefined;
  const displayCurrency = (location.state?.displayCurrency as string) || 'USD';
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
  const { data: safetyProfile, isFetching: isSafetyLoading } = useQuery<SafetyProfile | null>({
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

  // Auto-expand and scroll to safety section when navigated with #safety hash
  React.useEffect(() => {
    if (location.hash === '#safety' && flightData) {
      setShowScoreDetails(true);
      // Small delay to let the DOM expand, then scroll
      setTimeout(() => {
        safetyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [location.hash, flightData]);

  if (isLoading && !stateFlightData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">{t('detail.loadingDetails')}</p>
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
            {t('detail.flightNotFound')}
          </h2>
          <p className="text-text-secondary mb-6">
            {t('detail.flightNotFoundDesc')}
          </p>
          <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/flights')} className="btn-primary">
            {t('detail.goBack')}
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
      <header className="bg-[#034891] text-white">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <button
            onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/flights')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-3 sm:mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">{t('detail.backToResults')}</span>
          </button>

          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <h1 className="text-lg sm:text-2xl font-bold truncate">{translateAirline(flight.airline)}</h1>
              {isFromSerpAPI && (
                <span className="text-[10px] sm:text-xs bg-success text-white px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                  {t('detail.liveData')}
                </span>
              )}
              <span className="text-white/80 text-sm sm:text-base flex-shrink-0">{flight.flightNumber}</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-2xl sm:text-3xl font-bold">{flight.departureCityCode}</span>
              <Plane className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-2xl sm:text-3xl font-bold">{flight.arrivalCityCode}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Round Trip Sub-tabs */}
      {isRoundTrip && returnFlightData && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <span className="text-sm font-medium text-text-primary">{t('detail.roundTripSummary')}</span>
              <span className="text-lg font-bold text-primary">{t('detail.total')}: {formatPriceWithCurrency((totalPrice || 0), displayCurrency)}</span>
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
                {t('detail.departure')}
                <span className="text-xs opacity-80">{formatPriceWithCurrency(stateFlightData?.flight.price || 0, displayCurrency)}</span>
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
                {t('detail.returnFlight')}
                <span className="text-xs opacity-80">{formatPriceWithCurrency(returnFlightData.flight.price, displayCurrency)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Flight Summary Card */}
        <div className="bg-surface rounded-card shadow-card p-3 sm:p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            {/* Times */}
            <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
              <div className="text-center min-w-[50px] sm:min-w-[70px]">
                <p className="text-xl sm:text-3xl font-bold text-text-primary">
                  {formatTime(flight.departureTime)}
                </p>
                <p className="text-xs sm:text-base text-text-secondary font-medium">{flight.departureCityCode}</p>
                <p className="hidden sm:block text-sm text-text-muted">{translateAirport(flight.departureAirport)}</p>
              </div>

              <div className="flex-1 min-w-[80px] sm:min-w-[120px] px-1 sm:px-4">
                <div className="flex items-center justify-center gap-1 sm:gap-2 text-text-secondary mb-1 sm:mb-2">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">{formatDuration(flight.durationMinutes)}</span>
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
                        {flight.stops === 0 ? t('common.direct') : `${flight.stops} ${flight.stops > 1 ? t('common.stops', { count: flight.stops }) : t('common.stop', { count: flight.stops })}`}
                      </span>
                    </div>
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {flight.stopCities && flight.stopCities.length > 0 && (
                  <p className="text-xs text-text-muted text-center mt-2">
                    {t('detail.via')} {flight.stopCities.join(', ')}
                  </p>
                )}
              </div>

              <div className="text-center min-w-[50px] sm:min-w-[70px]">
                <p className="text-xl sm:text-3xl font-bold text-text-primary">
                  {formatTime(flight.arrivalTime)}
                  {isNextDay && <span className="text-sm sm:text-lg text-accent ml-0.5 sm:ml-1">+1</span>}
                </p>
                <p className="text-xs sm:text-base text-text-secondary font-medium">{flight.arrivalCityCode}</p>
                <p className="hidden sm:block text-sm text-text-muted">{translateAirport(flight.arrivalAirport)}</p>
              </div>
            </div>

            {/* Price + Actions */}
            <div className="flex flex-col items-center md:items-end gap-2 sm:gap-3 pt-3 sm:pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-divider md:pl-6">
              <div className="text-center md:text-right">
                <p className="text-2xl sm:text-3xl font-bold text-primary">
                  {formatPriceWithCurrency(flight.price, displayCurrency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <FavoriteButton flightWithScore={flightData} size="md" />
                <button
                  onClick={() => setShowSharePoster(true)}
                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  aria-label={t('detail.shareFlight')}
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                  aria-label={t('detail.reportIssue')}
                  title={t('detail.feedbackReport')}
                >
                  <MessageSquareWarning className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Date + Aircraft - 3x2 Grid */}
          <div className="mt-4 pt-4 border-t border-divider grid grid-cols-2 gap-3">
            {/* Row 1: Flight Date + Aircraft Model */}
            <div className="p-3 bg-surface-alt rounded-lg">
              <p className="text-xs text-text-muted mb-0.5">{t('detail.flightDate')}</p>
              <p className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {formatDate(flight.departureTime)}
              </p>
            </div>
            {flight.aircraftModel && (
              <div className="p-3 bg-surface-alt rounded-lg">
                <p className="text-xs text-text-muted mb-0.5">{t('detail.aircraftModel')}</p>
                <p className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Plane className="w-4 h-4 text-primary" />
                  {translateAircraft(flight.aircraftModel)}
                </p>
              </div>
            )}

            {/* Row 2: Engine + Engine Type */}
            <div className="p-3 bg-surface-alt rounded-lg">
              <p className="text-xs text-text-muted mb-0.5">{t('detail.engine')}</p>
              {safetyProfile?.technical_specs?.engine ? (
                <p className="text-base font-semibold text-text-primary">⚙️ {translateText(safetyProfile.technical_specs.engine)}</p>
              ) : isSafetyLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-text-muted">{t('detail.loading')}</span>
                </div>
              ) : (
                <p className="text-sm text-text-muted italic">—</p>
              )}
            </div>

            <div className="p-3 bg-surface-alt rounded-lg">
              <p className="text-xs text-text-muted mb-0.5">{t('detail.engineType')}</p>
              {safetyProfile?.technical_specs?.eng_type ? (
                <p className="text-base font-semibold text-text-primary">🔧 {translateText(safetyProfile.technical_specs.eng_type)}</p>
              ) : isSafetyLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-text-muted">{t('detail.loading')}</span>
                </div>
              ) : (
                <p className="text-sm text-text-muted italic">—</p>
              )}
            </div>

            {/* Row 3: Aircraft Age + Total Seats */}
            <div className="p-3 bg-surface-alt rounded-lg">
              <p className="text-xs text-text-muted mb-0.5">{t('detail.aircraftAge')}</p>
              {safetyProfile?.flight_info?.age_years != null ? (
                <p className={cn(
                  'text-base font-semibold',
                  safetyProfile.flight_info.age_years <= 5 ? 'text-green-600' :
                  safetyProfile.flight_info.age_years <= 15 ? 'text-text-primary' :
                  'text-amber-600'
                )}>
                  📅 {translateText(safetyProfile.flight_info.age_label ?? `${safetyProfile.flight_info.age_years} years old`)}
                  {safetyProfile.flight_info.age_years <= 3 ? ` ${t('detail.newAircraft')}` : ''}
                </p>
              ) : isSafetyLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-text-muted">{t('detail.loading')}</span>
                </div>
              ) : (
                <p className="text-sm text-text-muted italic">—</p>
              )}
            </div>

            <div className="p-3 bg-surface-alt rounded-lg">
              <p className="text-xs text-text-muted mb-0.5">{t('detail.legroom')}</p>
              {facilities.legroom ? (
                <p className="text-base font-semibold text-text-primary">🦵 {translateText(facilities.legroom)}</p>
              ) : facilities.seatPitchInches ? (
                <p className="text-base font-semibold text-text-primary">🦵 {facilities.seatPitchInches}" ({translateText(facilities.seatPitchCategory ?? '')})</p>
              ) : (() => {
                // For business/first class, detect seat type from flightExtensions
                const cabinLower = (flight.cabin || '').toLowerCase();
                const isBizFirst = cabinLower.includes('business') || cabinLower.includes('first');
                if (isBizFirst) {
                  const exts = (flight.flightExtensions || []).map(e => e.toLowerCase());
                  const lieFlatExt = exts.find(e => e.includes('lie-flat') || e.includes('lie flat'));
                  const angledFlatExt = exts.find(e => e.includes('angled flat') || e.includes('angled-flat'));
                  const recliningExt = exts.find(e => e.includes('reclining'));
                  const seatType = lieFlatExt ? t('detail.lieFlatSeat') : angledFlatExt ? t('detail.angledFlatSeat') : recliningExt ? t('detail.recliningSeat') : t('detail.premiumSeat');
                  return <p className="text-base font-semibold text-text-primary">💺 {seatType}</p>;
                }
                return isSafetyLoading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-text-muted">{t('detail.loading')}</span>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic">—</p>
                );
              })()}
            </div>

            {/* Tail number */}
            {safetyProfile?.flight_info?.tail_number && (
              <div className="p-3 bg-surface-alt rounded-lg">
                <p className="text-xs text-text-muted mb-0.5">{t('detail.tailNumber')}</p>
                <p className="text-base font-semibold text-text-primary">🔖 {safetyProfile.flight_info.tail_number}</p>
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
                <p className="text-sm text-text-muted">{t('detail.flyingScore')}</p>
                <p className="text-2xl font-bold text-text-primary">
                  {fivePointScore}<span className="text-base font-normal text-text-muted"> / 5</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <span>{showScoreDetails ? t('detail.hideDetails') : t('detail.seeDetails')}</span>
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
                {/* Safety Profile Summary (compact) */}
                {safetyProfile && (
                  <div ref={safetyRef} className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                      <h4 className="text-sm font-semibold text-green-800">{t('detail.safetyProfile')}</h4>
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full ml-auto">
                        {t('detail.ntsbVerified')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center group/stat relative">
                        <p className="text-lg font-bold text-green-700 cursor-help">
                          {safetyProfile.safety_records.this_plane_accidents !== null
                            ? safetyProfile.safety_records.this_plane_accidents.length
                            : '—'}
                        </p>
                        <p className="text-xs text-text-muted cursor-help">{t('detail.thisPlane')}</p>
                        <div className="hidden group-hover/stat:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20">
                          <p className="font-semibold mb-1">{t('detail.thisAircraftRecord')}</p>
                          <p>{t('detail.thisAircraftRecordDesc')}</p>
                          <p className="text-gray-400 mt-1">{t('detail.sourceNTSB')}</p>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                        </div>
                        {safetyProfile.flight_info.tail_number && (
                          <button
                            onClick={() => setIncidentModal({
                              open: true,
                              queryType: 'tail',
                              queryValue: safetyProfile.flight_info.tail_number!,
                              label: safetyProfile.flight_info.tail_number!,
                            })}
                            className="mt-1.5 text-[11px] font-medium text-green-700 hover:text-green-900 hover:underline transition-colors"
                          >
                            {t('detail.viewRecords')}
                          </button>
                        )}
                      </div>
                      <div className="text-center group/stat relative">
                        <p className="text-lg font-bold text-[#034891] cursor-help">
                          {safetyProfile.safety_records.airline_total_accidents}
                        </p>
                        <p className="text-xs text-text-muted cursor-help">{t('detail.airline10yr')}</p>
                        <div className="hidden group-hover/stat:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20">
                          <p className="font-semibold mb-1">{t('detail.airlineSafety10yr')}</p>
                          <p>{t('detail.airlineSafety10yrDesc')}</p>
                          <p className="text-gray-400 mt-1">{t('detail.sourceNTSB')}</p>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                        </div>
                        {safetyProfile.flight_info.airline && (
                          <button
                            onClick={() => setIncidentModal({
                              open: true,
                              queryType: 'airline',
                              queryValue: safetyProfile.flight_info.airline!,
                              label: safetyProfile.flight_info.airline!,
                            })}
                            className="mt-1.5 text-[11px] font-medium text-[#034891] hover:text-[#023670] hover:underline transition-colors"
                          >
                            {t('detail.viewRecords')}
                          </button>
                        )}
                      </div>
                      <div className="text-center group/stat relative">
                        <p className="text-lg font-bold text-amber-700 cursor-help">
                          {safetyProfile.safety_records.model_total_accidents}
                        </p>
                        <p className="text-xs text-text-muted cursor-help">{t('detail.modelAll')}</p>
                        <div className="hidden group-hover/stat:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20">
                          <p className="font-semibold mb-1">{t('detail.aircraftModelSafety')}</p>
                          <p>{t('detail.aircraftModelSafetyDesc')}</p>
                          <p className="text-gray-400 mt-1">{t('detail.sourceNTSB')}</p>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                        </div>
                        {(safetyProfile.flight_info.model_query || safetyProfile.flight_info.model) && (
                          <button
                            onClick={() => setIncidentModal({
                              open: true,
                              queryType: 'model',
                              queryValue: safetyProfile.flight_info.model_query || safetyProfile.flight_info.model!,
                              label: safetyProfile.flight_info.model || safetyProfile.flight_info.model_query!,
                            })}
                            className="mt-1.5 text-[11px] font-medium text-amber-700 hover:text-amber-900 hover:underline transition-colors"
                          >
                            {t('detail.viewRecords')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Score Breakdown - with embedded "Why this score" explanations */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {score.dimensions && (() => {
                    // Map explanations to their corresponding dimensions
                    const dimensionKeywords: Record<string, string[]> = {
                      safety: ['safety', 'ntsb', 'accident', 'incident'],
                      reliability: ['reliability', 'on-time', 'on time', 'delay', 'cancel'],
                      comfort: ['seat pitch', 'legroom', 'seat width', 'wide-body', 'widebody', 'cabin', 'spacious', 'noise'],
                      service: ['crew', 'service', 'ground service', 'check-in', 'boarding', 'in-flight service', 'cabin crew', 'hospitality'],
                      value: ['value', 'price', 'cost', 'above typical', 'below typical', 'money', 'affordable'],
                      amenities: ['wifi', 'entertainment', 'screen', 'power', 'display', 'ife', 'food', 'beverage', 'meal', 'drink'],
                      efficiency: ['duration', 'direct', 'stops', 'layover', 'route', 'connection', 'fastest'],
                    };

                    const getExplanationsFor = (dimKey: string) => {
                      if (!score.explanations) return [];
                      const keywords = dimensionKeywords[dimKey] || [];
                      return score.explanations.filter(exp => {
                        const text = `${exp.title} ${exp.detail}`.toLowerCase();
                        return keywords.some(kw => text.includes(kw));
                      });
                    };

                    // Also add recommendation match
                    const dataSources: Record<string, string> = {
                      safety: t('detail.dataSrcSafety'),
                      reliability: t('detail.dataSrcReliability'),
                      comfort: t('detail.dataSrcComfort'),
                      service: t('detail.dataSrcService'),
                      value: t('detail.dataSrcValue'),
                      amenities: t('detail.dataSrcAmenities'),
                      efficiency: t('detail.dataSrcEfficiency'),
                    };

                    const dimensions = [
                      { key: 'safety', label: t('detail.scoreDimSafety'), score: score.dimensions.safety ?? 10 },
                      { key: 'reliability', label: t('detail.scoreDimReliability'), score: score.dimensions.reliability },
                      { key: 'comfort', label: t('detail.scoreDimComfort'), score: score.dimensions.comfort },
                      { key: 'service', label: t('detail.scoreDimService'), score: score.dimensions.service },
                      { key: 'value', label: t('detail.scoreDimValue'), score: score.dimensions.value },
                      { key: 'amenities', label: t('detail.scoreDimAmenities'), score: score.dimensions.amenities ?? 5 },
                      { key: 'efficiency', label: t('detail.scoreDimEfficiency'), score: score.dimensions.efficiency ?? 5 },
                    ];

                    return dimensions.map(dim => {
                      const explanations = getExplanationsFor(dim.key);
                      return (
                        <div key={dim.key} className="p-3 bg-surface-alt rounded-lg group/dim relative cursor-help">
                          <p className="text-xs text-text-muted mb-1">{dim.label}</p>
                          <p className={cn('text-xl font-bold', getScoreColorClass(dim.score))}>
                            {toFivePointScale(dim.score)}<span className="text-sm font-normal text-text-muted">/5</span>
                          </p>
                          {/* Hover tooltip with explanations */}
                          <div className="hidden group-hover/dim:block absolute left-0 right-0 bottom-full mb-2 bg-gray-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl z-20 min-w-[220px]">
                            {explanations.length > 0 ? (
                              <div className="space-y-1.5">
                                {explanations.map((exp, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className={cn(
                                      'mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                                      exp.isPositive ? 'bg-green-500/30 text-green-300' : 'bg-amber-500/30 text-amber-300'
                                    )}>
                                      {exp.isPositive ? '✓' : '!'}
                                    </span>
                                    <div>
                                      <p className="font-medium">{exp.title}</p>
                                      <p className="text-gray-400">{exp.detail}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-300">{t('detail.noDataDimension')}</p>
                            )}
                            <p className="text-gray-500 mt-1.5 pt-1.5 border-t border-gray-700 text-[10px]">
                              📊 {dataSources[dim.key]}
                            </p>
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Aircraft & Airline Details */}
                <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                  <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    {t('detail.flightDetails')}
                  </h4>
                  
                  {flight.aircraftModel && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{t('detail.aircraft')}</span>
                      <span className="font-medium text-text-primary">{translateAircraft(flight.aircraftModel)}</span>
                    </div>
                  )}
                  
                  {flight.airline && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{t('detail.airline')}</span>
                      <span className="font-medium text-text-primary">{translateAirline(flight.airline)}</span>
                    </div>
                  )}

                  {flight.cabin && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{t('detail.cabin')}</span>
                      <span className="font-medium text-text-primary capitalize">{translateCabin(flight.cabin)}</span>
                    </div>
                  )}

                  {facilities.seatPitchInches && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{t('detail.seatPitch')}</span>
                      <span className="font-medium text-text-primary">
                        {facilities.seatPitchInches}" ({translateText(facilities.seatPitchCategory ?? '')})
                      </span>
                    </div>
                  )}

                  {facilities.legroom && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{t('detail.legroom')}</span>
                      <span className="font-medium text-text-primary">
                        {translateText(facilities.legroom)}
                      </span>
                    </div>
                  )}

                  {/* Show seat type for business/first if no legroom */}
                  {!facilities.legroom && !facilities.seatPitchInches && (() => {
                    const cabinLower = (flight.cabin || '').toLowerCase();
                    const isBizFirst = cabinLower.includes('business') || cabinLower.includes('first');
                    if (!isBizFirst) return null;
                    const exts = (flight.flightExtensions || []).map(e => e.toLowerCase());
                    const lieFlatExt = exts.find(e => e.includes('lie-flat') || e.includes('lie flat'));
                    const angledFlatExt = exts.find(e => e.includes('angled flat') || e.includes('angled-flat'));
                    const recliningExt = exts.find(e => e.includes('reclining'));
                    const seatType = lieFlatExt ? t('detail.lieFlatSeat') : angledFlatExt ? t('detail.angledFlatSeat') : recliningExt ? t('detail.recliningSeat') : t('detail.premiumSeat');
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">{t('detail.seatType')}</span>
                        <span className="font-medium text-text-primary">{seatType}</span>
                      </div>
                    );
                  })()}
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
            <span className="text-sm font-semibold text-text-primary">{t('detail.flightDetails')}</span>
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <span>{showMoreDetails ? t('detail.seeLess') : t('detail.seeMore')}</span>
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
                  <h2 className="text-lg font-semibold text-text-primary">{t('detail.flightRoute')}</h2>
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

              {/* Amenities */}
              <div className="p-5 md:p-6 border-b border-divider">
                <h2 className="text-lg font-semibold text-text-primary mb-4">{t('detail.amenities')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.hasWifi ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <Wifi className={cn('w-5 h-5', facilities.hasWifi ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.hasWifi ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.hasWifi ? t('detail.wifi') : t('detail.noWifi')}
                    </span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.hasPower ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <Power className={cn('w-5 h-5', facilities.hasPower ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.hasPower ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.hasPower ? t('detail.power') : t('detail.noPower')}
                    </span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.hasIFE ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <Tv className={cn('w-5 h-5', facilities.hasIFE ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.hasIFE ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.hasIFE ? translateText(facilities.ifeType ?? '') : t('detail.noIFE')}
                    </span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    facilities.mealIncluded ? 'bg-success-light' : 'bg-surface-alt'
                  )}>
                    <UtensilsCrossed className={cn('w-5 h-5', facilities.mealIncluded ? 'text-success' : 'text-text-muted')} />
                    <span className={facilities.mealIncluded ? 'text-text-primary' : 'text-text-muted'}>
                      {facilities.mealIncluded ? translateText(facilities.mealType ?? '') : t('detail.noMeal')}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Reviews */}
              {isLoadingReviews ? (
                <div className="p-5 md:p-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mr-2" />
                    <span className="text-text-secondary">{t('detail.loadingReviews')}</span>
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

                    // Track booking click for return-visit popup
                    trackBookingClick({
                      flightId: flight.id,
                      airline: flight.airline,
                      flightNumber: flight.flightNumber,
                      route: `${depFlight.departureCityCode} → ${depFlight.arrivalCityCode}`,
                      price: flight.price,
                      currency: flight.currency || 'USD',
                    });

                    // Trigger comeback review popup after 1.5s
                    setReviewTrigger(Date.now());

                    bookingApi.openBookingPage(params);
                  }}
                  className="flex-1 py-4 btn-primary text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                  <span>{t('detail.bookOn', { airline: flight.airline })}</span>
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
                  
                  // Track booking click for return-visit popup
                  trackBookingClick({
                    flightId: flight.id,
                    airline: flight.airline,
                    flightNumber: flight.flightNumber,
                    route: `${depFlight.departureCityCode} → ${depFlight.arrivalCityCode}`,
                    price: flight.price,
                    currency: flight.currency || 'USD',
                  });

                  // Trigger comeback review popup after 1.5s
                  setReviewTrigger(Date.now());

                  if (token) {
                    // Use .slice(0, 10) instead of new Date().toISOString() to avoid UTC timezone shift
                    const outboundDate = depFlight.departureTime.slice(0, 10);
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
                    const date = depFlight.departureTime.slice(0, 10);
                    window.open(
                      `https://www.google.com/travel/flights?q=flights+from+${from}+to+${to}+on+${date}`,
                      '_blank', 'noopener,noreferrer'
                    );
                  }
                }}
                className="flex-1 py-4 btn-primary text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <span>{t('detail.bookOn', { airline: flight.airline })}</span>
                <ExternalLink className="w-5 h-5" />
              </button>
            );
          })()}
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

      {/* Booking Review Modal — pops up 1.5s after clicking Book Now */}
      <BookingReviewModal
        triggerTimestamp={reviewTrigger}
        flightInfo={{
          id: flight.id,
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          route: `${flight.departureCityCode} → ${flight.arrivalCityCode}`,
          date: formatDate(flight.departureTime),
          departureCityCode: flight.departureCityCode,
          arrivalCityCode: flight.arrivalCityCode,
          aircraftModel: flight.aircraftModel || undefined,
          price: flight.price,
          currency: flight.currency || 'USD',
          overallScore: flightData?.score?.overallScore,
        }}
      />

      {/* Incident Records Modal — paginated NTSB narratives */}
      <IncidentRecordsModal
        isOpen={incidentModal.open}
        onClose={() => setIncidentModal(prev => ({ ...prev, open: false }))}
        queryType={incidentModal.queryType}
        queryValue={incidentModal.queryValue}
        label={incidentModal.label}
      />
    </div>
  );
};

export default FlightDetailPage;
