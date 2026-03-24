import React, { useState, useEffect } from 'react';
import { Plane, ExternalLink, Check, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MixedAirlineBookButton from './MixedAirlineBookButton';
import { cn } from '../../utils/cn';
import { translateAirline } from '../../utils/translate';
import type { FlightWithScore } from '../../api/types';

interface FloatingSelectedBarProps {
  // Round-trip
  selectedDepartureFlight: FlightWithScore | null;
  selectedReturnFlight: FlightWithScore | null;
  // Multi-city
  selectedMultiCityFlights: (FlightWithScore | null)[];
  // State flags
  tripType: string;
  usingCombinedPricing: boolean;
  combinedReturnFlights: FlightWithScore[] | null | undefined;
  // Formatting
  currency: string;
  formatPrice: (price: number, currency: string) => string;
  // Filters
  filters: {
    tripType: string;
    returnDate?: string;
    from?: string;
    to?: string;
    date?: string;
  };
  // Handlers
  onBookNow: (flights: FlightWithScore[]) => void;
  onClearDeparture?: () => void;
  onClearReturn?: () => void;
}

const FloatingSelectedBar: React.FC<FloatingSelectedBarProps> = ({
  selectedDepartureFlight,
  selectedReturnFlight,
  selectedMultiCityFlights,
  tripType,
  usingCombinedPricing,
  combinedReturnFlights,
  currency,
  formatPrice,
  filters,
  onBookNow,
  onClearDeparture,
  onClearReturn,
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isRoundTrip = tripType === 'roundtrip';
  const isMultiCity = tripType === 'multicity';

  // Determine if we have any selection
  const hasRoundTripSelection = isRoundTrip && (selectedDepartureFlight || selectedReturnFlight);
  const hasMultiCitySelection = isMultiCity && selectedMultiCityFlights.some(f => f !== null);
  const hasAnySelection = hasRoundTripSelection || hasMultiCitySelection;

  // Animate in/out
  useEffect(() => {
    if (hasAnySelection) {
      // Small delay for entrance animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [hasAnySelection]);

  if (!hasAnySelection) return null;

  // === ROUND TRIP ===
  if (isRoundTrip) {
    const bothSelected = selectedDepartureFlight && selectedReturnFlight;
    const sameAirline = bothSelected &&
      selectedDepartureFlight.flight.airlineCode === selectedReturnFlight.flight.airlineCode;

    // Price computation
    const priceText = bothSelected
      ? usingCombinedPricing
        ? `${t('search.roundTrip')}: ${formatPrice(selectedReturnFlight.flight.price, currency)}`
        : `${t('flights.total')}: ${formatPrice(selectedDepartureFlight.flight.price + selectedReturnFlight.flight.price, currency)}`
      : selectedDepartureFlight
        ? `${t('flights.outbound')}: ${formatPrice(selectedDepartureFlight.flight.price, currency)}${usingCombinedPricing ? '' : ''}`
        : `${t('flights.returnLabel')}: ${formatPrice(selectedReturnFlight!.flight.price, currency)}`;

    // Book now button logic — always show all booking options
    const renderBookButton = () => {
      if (!bothSelected) return null;

      const combinedMatch = combinedReturnFlights?.find(
        f => f.flight.flightNumber === selectedReturnFlight.flight.flightNumber
      );
      const combinedToken = combinedMatch?.flight.bookingToken;
      const tokens = combinedToken
        ? [combinedToken]
        : [
            selectedDepartureFlight.flight.bookingToken || selectedDepartureFlight.flight.departureToken,
            selectedReturnFlight.flight.bookingToken || selectedReturnFlight.flight.departureToken,
          ].filter(Boolean) as string[];

      return (
        <MixedAirlineBookButton
          bookingTokens={tokens}
          returnDate={filters.returnDate}
          departureId={selectedDepartureFlight.flight.departureAirportCode || selectedDepartureFlight.flight.departureCityCode}
          arrivalId={selectedDepartureFlight.flight.arrivalAirportCode || selectedDepartureFlight.flight.arrivalCityCode}
          outboundDate={filters.date || selectedDepartureFlight.flight.departureTime.slice(0, 10)}
          airlineName={selectedDepartureFlight.flight.airline}
          airlineCode={selectedDepartureFlight.flight.airlineCode}
          onFallback={() => onBookNow([selectedDepartureFlight, selectedReturnFlight])}
        />
      );
    };

    return (
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "w-[calc(100vw-48px)] max-w-[900px] min-w-0",
          "transition-all duration-500 ease-out",
          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        {/* Main bar */}
        <div
          className={cn(
            "bg-blue-700 text-white rounded-2xl shadow-2xl",
            "px-5 py-3 w-full box-border"
          )}
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        >
          {/* Desktop layout */}
          <div className="hidden sm:flex items-center gap-2.5 min-w-0">
            {/* Flight chips — shrinkable, each chip truncates airline name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedDepartureFlight && (
                <div className="flex items-center gap-1.5 bg-blue-600/60 border border-white/20 rounded-full px-3 py-1.5 text-sm min-w-0">
                  <Plane className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">{selectedDepartureFlight.flight.flightNumber}</span>
                  <span className="text-white/70 text-xs truncate min-w-0">({translateAirline(selectedDepartureFlight.flight.airline)})</span>
                  {onClearDeparture && (
                    <button onClick={onClearDeparture} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              {selectedDepartureFlight && selectedReturnFlight && (
                <span className="text-white/50 text-sm flex-shrink-0">⇄</span>
              )}
              {selectedReturnFlight && (
                <div className="flex items-center gap-1.5 bg-blue-600/60 border border-white/20 rounded-full px-3 py-1.5 text-sm min-w-0">
                  <Plane className="w-3.5 h-3.5 rotate-180 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">{selectedReturnFlight.flight.flightNumber}</span>
                  <span className="text-white/70 text-xs truncate min-w-0">({translateAirline(selectedReturnFlight.flight.airline)})</span>
                  {onClearReturn && (
                    <button onClick={onClearReturn} className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Price + badge — never shrinks */}
            <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
              <span className="text-base font-bold">{priceText}</span>
              {bothSelected && (
                sameAirline ? (
                  <span className="text-xs bg-green-500/30 border border-green-400/40 text-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <Check className="w-3 h-3" />
                    {t('booking.sameAirline')}
                  </span>
                ) : (
                  <span className="text-xs bg-sky-500/30 border border-sky-400/40 text-sky-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {t('booking.mixed')}
                  </span>
                )
              )}
            </div>

            {/* Book button — never shrinks */}
            <div className="flex items-center flex-shrink-0">
              {renderBookButton()}
            </div>
          </div>

          {/* Mobile layout */}
          <div className="sm:hidden">
            {/* Collapsed view */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {selectedDepartureFlight && (
                    <span className="bg-blue-600/60 border border-white/20 rounded-full px-2 py-1 text-xs font-medium">
                      ✈ {selectedDepartureFlight.flight.flightNumber}
                    </span>
                  )}
                  {selectedReturnFlight && (
                    <>
                      <span className="text-white/40 text-xs">+</span>
                      <span className="bg-blue-600/60 border border-white/20 rounded-full px-2 py-1 text-xs font-medium">
                        ✈ {selectedReturnFlight.flight.flightNumber}
                      </span>
                    </>
                  )}
                </div>
                <span className="font-bold text-sm">{priceText}</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-white/70" />
              ) : (
                <ChevronUp className="w-5 h-5 text-white/70" />
              )}
            </button>

            {/* Expanded view */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/20 space-y-3">
                {/* Flight details */}
                <div className="space-y-2">
                  {selectedDepartureFlight && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Plane className="w-3.5 h-3.5" />
                        <span>{selectedDepartureFlight.flight.flightNumber} ({translateAirline(selectedDepartureFlight.flight.airline)})</span>
                      </div>
                      {(!usingCombinedPricing || !selectedReturnFlight) && (
                        <span className="text-white/80">
                          {formatPrice(selectedDepartureFlight.flight.price, currency)}
                          {usingCombinedPricing && <span className="text-xs ml-1 text-white/50">(est.)</span>}
                        </span>
                      )}
                    </div>
                  )}
                  {selectedReturnFlight && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Plane className="w-3.5 h-3.5 rotate-180" />
                        <span>{selectedReturnFlight.flight.flightNumber} ({translateAirline(selectedReturnFlight.flight.airline)})</span>
                      </div>
                      {!usingCombinedPricing && (
                        <span className="text-white/80">{formatPrice(selectedReturnFlight.flight.price, currency)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Airline status + Book */}
                <div className="flex items-center justify-between">
                  {bothSelected && (
                    sameAirline ? (
                      <span className="text-xs bg-green-500/30 border border-green-400/40 text-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {t('booking.sameAirline')}
                      </span>
                    ) : (
                      <span className="text-xs bg-sky-500/30 border border-sky-400/40 text-sky-100 px-2 py-0.5 rounded-full">
                        {t('booking.mixed')}
                      </span>
                    )
                  )}
                  <div className="flex-1" />
                </div>
                {bothSelected && (
                  <div className="w-full">
                    {renderBookButton() || null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === MULTI-CITY ===
  if (isMultiCity) {
    const validFlights = selectedMultiCityFlights.filter((f): f is FlightWithScore => f !== null);
    const allSelected = selectedMultiCityFlights.length > 0 && selectedMultiCityFlights.every(f => f !== null);
    const totalPrice = validFlights.reduce((sum, f) => sum + f.flight.price, 0);
    const isMixed = new Set(validFlights.map(f => f.flight.airlineCode)).size > 1;

    const renderMultiCityBookButton = () => {
      if (!allSelected) return null;

      const allTokens = validFlights
        .map(f => f.flight.bookingToken || f.flight.departureToken)
        .filter(Boolean) as string[];

      if (allTokens.length > 0) {
        return (
          <MixedAirlineBookButton
            bookingTokens={allTokens}
            departureId={validFlights[0].flight.departureAirportCode || validFlights[0].flight.departureCityCode}
            arrivalId={validFlights[0].flight.arrivalAirportCode || validFlights[0].flight.arrivalCityCode}
            outboundDate={filters.date || validFlights[0].flight.departureTime.slice(0, 10)}
            airlineName={validFlights[0].flight.airline}
            airlineCode={validFlights[0].flight.airlineCode}
            onFallback={() => onBookNow(validFlights)}
          />
        );
      }

      return (
        <button
          onClick={() => onBookNow(validFlights)}
          className="bg-white text-blue-700 font-bold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-sm text-sm whitespace-nowrap"
        >
          <ExternalLink className="w-4 h-4" />
          {t('common.bookNow')}
        </button>
      );
    };

    return (
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "w-[calc(100vw-48px)] max-w-[900px] min-w-0",
          "transition-all duration-500 ease-out",
          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        <div
          className={cn(
            "bg-blue-700 text-white rounded-2xl shadow-2xl",
            "px-5 py-3 w-full box-border"
          )}
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        >
          {/* Desktop layout */}
          <div className="hidden sm:flex items-center gap-3 min-w-0 flex-nowrap">
            {/* Flight chips */}
            <div className="flex items-center gap-1.5 min-w-0 flex-shrink flex-wrap">
              {selectedMultiCityFlights.map((flight, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-white/40 text-xs">+</span>}
                  <div
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      flight
                        ? "bg-blue-600/60 border border-white/20 font-medium"
                        : "bg-blue-800/40 border border-white/10 text-white/40"
                    )}
                  >
                    {flight ? (
                      <span className="flex items-center gap-1">
                        <Plane className="w-3 h-3" />
                        {flight.flight.flightNumber}
                      </span>
                    ) : (
                      <span>Leg {idx + 1}</span>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Price */}
            <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
              <span className="text-lg font-bold">
                {allSelected
                  ? `${t('flights.total')}: ${formatPrice(totalPrice, currency)}`
                  : `${validFlights.length}/${selectedMultiCityFlights.length} ${t('common.selected').toLowerCase()}`
                }
              </span>
              {allSelected && (
                isMixed ? (
                  <span className="text-xs bg-sky-500/30 border border-sky-400/40 text-sky-100 px-2 py-0.5 rounded-full">
                    {t('booking.mixed')}
                  </span>
                ) : (
                  <span className="text-xs bg-green-500/30 border border-green-400/40 text-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {t('booking.sameAirline')}
                  </span>
                )
              )}
            </div>

            {/* Book button */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {renderMultiCityBookButton()}
            </div>
          </div>

          {/* Mobile layout */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {validFlights.slice(0, 2).map((flight, idx) => (
                    <span key={idx} className="bg-blue-600/60 border border-white/20 rounded-full px-2 py-0.5 text-xs font-medium">
                      ✈ {flight.flight.flightNumber}
                    </span>
                  ))}
                  {validFlights.length > 2 && (
                    <span className="text-xs text-white/60">+{validFlights.length - 2}</span>
                  )}
                </div>
                <span className="font-bold text-sm">
                  {allSelected ? formatPrice(totalPrice, currency) : `${validFlights.length}/${selectedMultiCityFlights.length}`}
                </span>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-white/70" />
              ) : (
                <ChevronUp className="w-5 h-5 text-white/70" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                {selectedMultiCityFlights.map((flight, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className={flight ? "text-white" : "text-white/40"}>
                      Leg {idx + 1}: {flight
                        ? `${flight.flight.flightNumber} (${translateAirline(flight.flight.airline)})`
                        : 'Not selected'}
                    </span>
                    {flight && (
                      <span className="text-white/80">{formatPrice(flight.flight.price, currency)}</span>
                    )}
                  </div>
                ))}
                {allSelected && (
                  <div className="pt-2 w-full">
                    {renderMultiCityBookButton()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default FloatingSelectedBar;
