import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Plane, Calendar, AlertTriangle, Leaf, Check, Users, Loader2, Info, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { FlightWithScore } from '../../api/types';
import { fetchSafetyProfile } from '../../api/aircraft';
import { formatTime, formatDuration, formatDate } from '../../utils/formatters';
import { formatPriceWithCurrency } from '../common/CurrencySelector';
import ScoreBadge from './ScoreBadge';
import FlightHighlightTags from './FlightHighlightTags';
import FavoriteButton from './FavoriteButton';
import { cn } from '../../utils/cn';
import { translateAirline, translateAircraft } from '../../utils/translate';

interface FlightCardProps {
  flightWithScore: FlightWithScore;
  onSelect?: () => void;
  isSelected?: boolean;
  showCompare?: boolean;
  isRoundTrip?: boolean;
  returnDate?: string;
  /** Display currency code — prices are converted client-side from USD */
  displayCurrency?: string;
  /** Whether seat availability data is still loading from Amadeus */
  isTicketLoading?: boolean;
  /**
   * Override the price label shown below the price.
   * - 'round trip': price is a round-trip total (from SerpAPI round-trip search)
   * - 'per person': one-way or per-leg price
   * - undefined: auto-detect based on isRoundTrip prop
   */
  priceLabel?: 'round trip' | 'per person';
}

/**
 * Flight Card component matching iOS design
 * - Airline icon placeholder + name + flight number
 * - Score badge (GREEN)
 * - Times with +1 next-day indicator
 * - Duration and stops in center
 * - Price in blue/accent
 * - View Details link to detail page
 * - Select button for round trip / multi-city selection
 * - Compare button
 */
const FlightCard: React.FC<FlightCardProps> = ({
  flightWithScore,
  onSelect,
  isSelected = false,
  isRoundTrip = false,
  returnDate: _returnDate,
  displayCurrency = 'USD',
  isTicketLoading = false,
  priceLabel,
}) => {
  const { t } = useTranslation();
  const { flight, score } = flightWithScore;
  const [showSafetyPopup, setShowSafetyPopup] = useState(false);
  const safetyPopupRef = useRef<HTMLDivElement>(null);
  const safetyBadgeRef = useRef<HTMLButtonElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Lazily fetch full safety profile only when popup is opened
  const { data: safetyProfile, isFetching: isSafetyLoading } = useQuery({
    queryKey: ['safety-profile-card', flight.flightNumber, flight.airline, flight.aircraftModel],
    queryFn: () => fetchSafetyProfile({
      flightCode: flight.flightNumber || undefined,
      airline: flight.airline || undefined,
      airlineIata: flight.airlineCode || undefined,
      model: flight.aircraftModel || undefined,
    }),
    enabled: showSafetyPopup,
    staleTime: 30 * 60 * 1000,
  });

  // Compute popup position anchored below the badge button
  const updatePopupPosition = useCallback(() => {
    if (safetyBadgeRef.current) {
      const rect = safetyBadgeRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Close popup on click outside
  useEffect(() => {
    if (!showSafetyPopup) return;
    updatePopupPosition();
    const handleClickOutside = (e: MouseEvent) => {
      if (
        safetyPopupRef.current && !safetyPopupRef.current.contains(e.target as Node) &&
        safetyBadgeRef.current && !safetyBadgeRef.current.contains(e.target as Node)
      ) {
        setShowSafetyPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updatePopupPosition, true);
    window.addEventListener('resize', updatePopupPosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePopupPosition, true);
      window.removeEventListener('resize', updatePopupPosition);
    };
  }, [showSafetyPopup, updatePopupPosition]);

  // Check if arrival is next day
  const departureDate = new Date(flight.departureTime);
  const arrivalDate = new Date(flight.arrivalTime);
  const isNextDay = arrivalDate.getDate() !== departureDate.getDate();

  // Determine effective price label
  // If priceLabel is explicitly set, use it. Otherwise fall back to isRoundTrip behavior.
  const effectivePriceLabel = priceLabel ?? (isRoundTrip ? 'round trip' : 'per person');
  const showRoundTripBreakdown = isRoundTrip && effectivePriceLabel === 'round trip' && !priceLabel;

  // Calculate estimated individual leg prices for round trips (only for legacy breakdown display)
  const outboundPrice = isRoundTrip ? Math.round(flight.price * 0.55) : flight.price;
  const returnPrice = isRoundTrip ? Math.round(flight.price * 0.45) : 0;

  const getStopsText = () => {
    if (flight.stops === 0) return t('common.direct');
    if (flight.stops === 1) return t('common.stop', { count: 1 });
    return t('common.stops', { count: flight.stops });
  };

  return (
    <div className="flight-card overflow-hidden">
      {/* Main Content */}
      <div className="p-3 sm:p-4 md:p-5">
        {/* Header: Airline + Score + Warning Badges */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          {/* Airline Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Airline Logo */}
            {flight.airlineLogo ? (
              <img 
                src={flight.airlineLogo} 
                alt={`${flight.airline} logo`}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-contain bg-white p-1 border border-border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-primary-light flex items-center justify-center",
              flight.airlineLogo && "hidden"
            )}>
              <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-sm sm:text-base">{translateAirline(flight.airline)}</h3>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <p className="text-xs sm:text-sm text-text-secondary">{flight.flightNumber}</p>
                {flight.aircraftModel && (
                  <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 px-1 sm:px-1.5 py-0.5 rounded font-medium">
                    {translateAircraft(flight.aircraftModel)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score Badge + Delay Warning */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {flight.oftenDelayed && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-warning/15 text-warning rounded-lg text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                <span>{t('flights.oftenDelayed')}</span>
              </div>
            )}
            <ScoreBadge score={score.overallScore} size="md" />
          </div>
        </div>

        {/* Flight Times Row */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 mb-3 sm:mb-4">
          {/* Departure */}
          <div className="text-center min-w-[48px] sm:min-w-[60px]">
            <p className="text-xl sm:text-2xl font-bold text-text-primary">{formatTime(flight.departureTime)}</p>
            <p className="text-xs sm:text-sm text-text-secondary">{flight.departureCityCode}</p>
          </div>

          {/* Duration & Stops */}
          <div className="flex-1 px-1 sm:px-2">
            <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-text-secondary mb-1">
              <span>{formatDuration(flight.durationMinutes)}</span>
            </div>
            <div className="relative">
              <div className="h-px bg-border" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-1.5 sm:px-2">
                <div className={cn(
                  'flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium',
                  flight.stops === 0 ? 'text-success' : 'text-text-secondary'
                )}>
                  <Plane className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{getStopsText()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Arrival */}
          <div className="text-center min-w-[48px] sm:min-w-[60px]">
            <p className="text-xl sm:text-2xl font-bold text-text-primary">
              {formatTime(flight.arrivalTime)}
              {isNextDay && <span className="text-xs sm:text-sm text-accent font-semibold ml-0.5">+1</span>}
            </p>
            <p className="text-xs sm:text-sm text-text-secondary">{flight.arrivalCityCode}</p>
          </div>

          {/* Price + Carbon Emissions */}
          <div className="text-right ml-1 sm:ml-2 md:ml-4 flex-shrink-0">
            {effectivePriceLabel === 'round trip' ? (
              <>
                <p className="text-lg sm:text-2xl font-bold text-primary">{formatPriceWithCurrency(flight.price, displayCurrency)}</p>
                <p className="text-[10px] sm:text-xs text-text-muted">{t('common.roundTrip')}</p>
                {showRoundTripBreakdown && (
                  <div className="hidden sm:block text-xs text-text-secondary mt-1 space-y-0.5">
                    <p>{t('flights.outbound')}: ~{formatPriceWithCurrency(outboundPrice, displayCurrency)}</p>
                    <p>{t('flights.returnLabel')}: ~{formatPriceWithCurrency(returnPrice, displayCurrency)}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-lg sm:text-2xl font-bold text-primary">{formatPriceWithCurrency(flight.price, displayCurrency)}</p>
                <p className="text-[10px] sm:text-xs text-text-muted">{t('common.perPerson')}</p>
              </>
            )}

            {/* Seats Remaining Badge */}
            {isTicketLoading ? (
              <div className="hidden sm:flex items-center justify-end gap-1 mt-1 text-[10px] sm:text-xs text-text-secondary">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{t('flights.fetchingTickets')}</span>
              </div>
            ) : flight.seatsRemaining != null && flight.seatsRemaining > 0 ? (
              <div className={cn(
                "flex items-center justify-end gap-1 mt-1 text-[10px] sm:text-xs",
                flight.seatsRemaining >= 9
                  ? "text-text-secondary"
                  : "text-red-600 font-semibold"
              )}>
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>
                  {flight.seatsRemaining >= 9
                    ? t('flights.moreLeft')
                    : t('flights.seatsLeft', { count: flight.seatsRemaining })
                  }
                </span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center justify-end gap-1 mt-1 text-[10px] sm:text-xs text-text-muted">
                <Info className="w-3 h-3" />
                <span>{t('flights.ticketInfoNA')}</span>
              </div>
            )}
            
            {/* Carbon Emissions Badge */}
            {flight.carbonEmissions && (
              <div className={cn(
                "hidden sm:flex items-center justify-end gap-1 mt-1 text-[10px] sm:text-xs",
                flight.carbonEmissions.differencePercent && flight.carbonEmissions.differencePercent < 0
                  ? "text-success"
                  : flight.carbonEmissions.differencePercent && flight.carbonEmissions.differencePercent > 0
                    ? "text-warning"
                    : "text-text-secondary"
              )}>
                <Leaf className="w-3 h-3" />
                <span>
                  {flight.carbonEmissions.differencePercent 
                    ? `${flight.carbonEmissions.differencePercent > 0 ? '+' : ''}${flight.carbonEmissions.differencePercent}% CO₂`
                    : flight.carbonEmissions.thisFlightGrams 
                      ? `${Math.round(flight.carbonEmissions.thisFlightGrams / 1000)} kg CO₂`
                      : null
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date Row + Highlights */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-text-secondary mb-2 sm:mb-3">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{formatDate(flight.departureTime)}</span>
        </div>

        {/* Highlight Tags (shown before expansion) */}
        {score.highlights && score.highlights.length > 0 && (
          <FlightHighlightTags highlights={score.highlights} maxTags={3} className="mb-2 sm:mb-3" />
        )}

        {/* Safety Profile (NTSB) - Always visible, clickable to show popup preview */}
        {score.dimensions?.safety !== undefined && (
          <>
            <button
              ref={safetyBadgeRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSafetyPopup(!showSafetyPopup); }}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium mb-2 sm:mb-3 cursor-pointer transition-all hover:shadow-sm group w-full text-left",
                score.dimensions.safety >= 9
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : score.dimensions.safety >= 7
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : score.dimensions.safety >= 5
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-red-50 text-red-700 hover:bg-red-100"
              )}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">
                {t('safety.ntsbSafety', { score: score.dimensions.safety })}
                {score.dimensions.safety >= 9
                  ? ` — ${t('safety.excellent')}`
                  : score.dimensions.safety >= 7
                    ? ` — ${t('safety.good')}`
                    : score.dimensions.safety >= 5
                      ? ` — ${t('safety.moderate')}`
                      : ` — ${t('safety.reviewRecommended')}`}
              </span>
              <ChevronRight className={cn(
                "w-3.5 h-3.5 transition-all flex-shrink-0",
                showSafetyPopup ? "rotate-90 opacity-100" : "opacity-40 group-hover:opacity-100"
              )} />
            </button>

            {/* Safety Preview Popup — rendered via portal to escape overflow-hidden */}
            {showSafetyPopup && popupPos && createPortal(
              <div
                ref={safetyPopupRef}
                className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in"
                style={{ top: popupPos.top, left: popupPos.left, width: popupPos.width }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Popup Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <h4 className="text-sm font-semibold text-gray-800">{t('detail.safetyProfile')}</h4>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSafetyPopup(false); }}
                    className="p-1 rounded-full hover:bg-gray-200/60 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Popup Content */}
                <div className="p-4">
                  {isSafetyLoading ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-xs text-text-muted">{t('safety.loadingRecords')}</p>
                    </div>
                  ) : safetyProfile ? (
                    <div className="space-y-3">
                      {/* Accident Stats Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2.5 bg-green-50 rounded-lg">
                          <p className="text-lg font-bold text-green-700">
                            {safetyProfile.safety_records.this_plane_accidents !== null
                              ? safetyProfile.safety_records.this_plane_accidents.length
                              : '—'}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{t('safety.thisPlane')}</p>
                        </div>
                        <div className="text-center p-2.5 bg-blue-50 rounded-lg">
                          <p className="text-lg font-bold text-[#034891]">
                            {safetyProfile.safety_records.airline_total_accidents}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{t('safety.airline10yr')}</p>
                        </div>
                        <div className="text-center p-2.5 bg-amber-50 rounded-lg">
                          <p className="text-lg font-bold text-amber-700">
                            {safetyProfile.safety_records.model_total_accidents}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{t('safety.modelAll')}</p>
                        </div>
                      </div>

                      {/* Aircraft Info Row */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {safetyProfile.technical_specs?.engine && (
                          <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-400">⚙️</span>
                            <span className="text-gray-700 truncate">{(() => {
                              const numEng = safetyProfile.technical_specs.num_engines;
                              const engineLabel = numEng === 1 ? t('detail.singleEngine')
                                : numEng === 2 ? t('detail.twinEngine')
                                : numEng === 3 ? t('detail.triEngine')
                                : numEng === 4 ? t('detail.quadEngine')
                                : null;
                              const raw = safetyProfile.technical_specs.engine!;
                              const clean = raw.replace(/^\d+\s*[x×]\s*/i, '').trim();
                              return engineLabel ? `${engineLabel} (${clean})` : raw;
                            })()}</span>
                          </div>
                        )}
                        {safetyProfile.flight_info?.age_years != null && (
                          <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-400">📅</span>
                            <span className={cn(
                              "truncate",
                              safetyProfile.flight_info.age_years <= 5 ? 'text-green-600 font-medium' :
                              safetyProfile.flight_info.age_years <= 15 ? 'text-gray-700' :
                              'text-amber-600 font-medium'
                            )}>
                              {safetyProfile.flight_info.age_label ?? `${safetyProfile.flight_info.age_years} yr old`}
                            </span>
                          </div>
                        )}
                        {safetyProfile.flight_info?.num_seats != null && safetyProfile.flight_info.num_seats > 0 && (
                          <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-400">💺</span>
                            <span className="text-gray-700">{t('safety.seats', { count: safetyProfile.flight_info.num_seats })}</span>
                          </div>
                        )}
                        {safetyProfile.flight_info?.tail_number && (
                          <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-400">🔖</span>
                            <span className="text-gray-700 font-mono text-[11px]">{safetyProfile.flight_info.tail_number}</span>
                          </div>
                        )}
                      </div>

                      {/* View full details link */}
                      <Link
                        to={`/flights/${flight.id}#safety`}
                        state={{ flightWithScore, displayCurrency }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-primary hover:text-primary-hover hover:bg-primary/5 rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('safety.viewFullDetails')}
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-text-muted">{t('safety.dataNotAvailable')}</p>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </>
        )}

        {/* Divider */}
        <div className="border-t border-divider my-2 sm:my-3" />

        {/* Actions Row */}
        <div className="flex items-center justify-between">
          {/* Left side: Select button for round trip / multi-city */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all",
                  isSelected
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t('common.selected')}
                  </>
                ) : (
                  t('common.select')
                )}
              </button>
            )}
          </div>

          {/* Right side: Favorite + View Details */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <FavoriteButton flightWithScore={flightWithScore} size="sm" />
            <Link
              to={`/flights/${flight.id}`}
              state={{ flightWithScore, displayCurrency }}
              className="btn-primary py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {t('common.viewDetails')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
