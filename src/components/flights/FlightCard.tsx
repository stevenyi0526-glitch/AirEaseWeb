import React from 'react';
import { Link } from 'react-router-dom';
import { Plane, Calendar, AlertTriangle, Leaf, Check, Users, Loader2, Info } from 'lucide-react';
import type { FlightWithScore } from '../../api/types';
import { formatTime, formatDuration, formatDate } from '../../utils/formatters';
import { formatPriceWithCurrency } from '../common/CurrencySelector';
import ScoreBadge from './ScoreBadge';
import FlightHighlightTags from './FlightHighlightTags';
import FavoriteButton from './FavoriteButton';
import CompareButton from '../compare/CompareButton';
import { cn } from '../../utils/cn';

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
  showCompare = true,
  isRoundTrip = false,
  returnDate: _returnDate,
  displayCurrency = 'USD',
  isTicketLoading = false,
  priceLabel,
}) => {
  const { flight, score } = flightWithScore;

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
    if (flight.stops === 0) return 'Direct';
    if (flight.stops === 1) return '1 stop';
    return `${flight.stops} stops`;
  };

  return (
    <div className="flight-card overflow-hidden">
      {/* Main Content */}
      <div className="p-4 md:p-5">
        {/* Header: Airline + Score + Warning Badges */}
        <div className="flex items-start justify-between mb-4">
          {/* Airline Info */}
          <div className="flex items-center gap-3">
            {/* Airline Logo - use SerpAPI logo if available, fallback to icon */}
            {flight.airlineLogo ? (
              <img 
                src={flight.airlineLogo} 
                alt={`${flight.airline} logo`}
                className="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-border"
                onError={(e) => {
                  // Fallback to plane icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center",
              flight.airlineLogo && "hidden"
            )}>
              <Plane className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{flight.airline}</h3>
              <p className="text-sm text-text-secondary">{flight.flightNumber}</p>
            </div>
          </div>

          {/* Score Badge + Delay Warning */}
          <div className="flex items-center gap-2">
            {/* Delay Warning Badge */}
            {flight.oftenDelayed && (
              <div className="flex items-center gap-1 px-2 py-1 bg-warning/15 text-warning rounded-lg text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                <span>Often Delayed</span>
              </div>
            )}
            <ScoreBadge score={score.overallScore} size="md" />
          </div>
        </div>

        {/* Flight Times Row */}
        <div className="flex items-center gap-2 md:gap-4 mb-4">
          {/* Departure */}
          <div className="text-center min-w-[60px]">
            <p className="text-2xl font-bold text-text-primary">{formatTime(flight.departureTime)}</p>
            <p className="text-sm text-text-secondary">{flight.departureCityCode}</p>
          </div>

          {/* Duration & Stops */}
          <div className="flex-1 px-2">
            <div className="flex items-center justify-center gap-1 text-sm text-text-secondary mb-1">
              <span>{formatDuration(flight.durationMinutes)}</span>
            </div>
            <div className="relative">
              <div className="h-px bg-border" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-2">
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  flight.stops === 0 ? 'text-success' : 'text-text-secondary'
                )}>
                  <Plane className="w-3 h-3 " />
                  <span>{getStopsText()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Arrival */}
          <div className="text-center min-w-[60px]">
            <p className="text-2xl font-bold text-text-primary">
              {formatTime(flight.arrivalTime)}
              {isNextDay && <span className="text-sm text-accent font-semibold ml-0.5">+1</span>}
            </p>
            <p className="text-sm text-text-secondary">{flight.arrivalCityCode}</p>
          </div>

          {/* Price + Carbon Emissions */}
          <div className="text-right ml-2 md:ml-4">
            {effectivePriceLabel === 'round trip' ? (
              <>
                {/* Round trip total */}
                <p className="text-2xl font-bold text-primary">{formatPriceWithCurrency(flight.price, displayCurrency)}</p>
                <p className="text-xs text-text-muted">round trip total</p>
                {showRoundTripBreakdown && (
                  <div className="text-xs text-text-secondary mt-1 space-y-0.5">
                    <p>Outbound: ~{formatPriceWithCurrency(outboundPrice, displayCurrency)}</p>
                    <p>Return: ~{formatPriceWithCurrency(returnPrice, displayCurrency)}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">{formatPriceWithCurrency(flight.price, displayCurrency)}</p>
                <p className="text-xs text-text-muted">per person</p>
              </>
            )}

            {/* Seats Remaining Badge */}
            {isTicketLoading ? (
              /* Loading state: spinner + message */
              <div className="flex items-center justify-end gap-1 mt-1 text-xs text-text-secondary">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Fetching remaining tickets</span>
              </div>
            ) : flight.seatsRemaining != null && flight.seatsRemaining > 0 ? (
              /* Has Amadeus data */
              <div className={cn(
                "flex items-center justify-end gap-1 mt-1 text-xs",
                flight.seatsRemaining >= 9
                  ? "text-text-secondary"
                  : "text-red-600 font-semibold"
              )}>
                <Users className="w-3 h-3" />
                <span>
                  {flight.seatsRemaining >= 9
                    ? 'More than 9 tickets remaining'
                    : `${flight.seatsRemaining} ticket${flight.seatsRemaining === 1 ? '' : 's'} left`
                  }
                </span>
              </div>
            ) : (
              /* No Amadeus data — show info message */
              <div className="flex items-center justify-end gap-1 mt-1 text-xs text-text-muted">
                <Info className="w-3 h-3" />
                <span>Ticket info not available</span>
              </div>
            )}
            
            {/* Carbon Emissions Badge */}
            {flight.carbonEmissions && (
              <div className={cn(
                "flex items-center justify-end gap-1 mt-1 text-xs",
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
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(flight.departureTime)}</span>
        </div>

        {/* Highlight Tags (shown before expansion) */}
        {score.highlights && score.highlights.length > 0 && (
          <FlightHighlightTags highlights={score.highlights} maxTags={3} className="mb-3" />
        )}

        {/* Divider */}
        <div className="border-t border-divider my-3" />

        {/* Actions Row */}
        <div className="flex items-center justify-between">
          {/* Left side: Select button for round trip / multi-city */}
          <div className="flex items-center gap-2">
            {onSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={cn(
                  "flex items-center gap-1.5 py-2 px-4 text-sm font-medium rounded-lg transition-all",
                  isSelected
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {isSelected ? (
                  <>
                    <Check className="w-4 h-4" />
                    Selected
                  </>
                ) : (
                  'Select'
                )}
              </button>
            )}
          </div>

          {/* Right side: Compare + Favorite + View Details */}
          <div className="flex items-center gap-2">
            <FavoriteButton flightWithScore={flightWithScore} size="sm" />
            {showCompare && (
              <CompareButton flightWithScore={flightWithScore} />
            )}
            <Link
              to={`/flights/${flight.id}`}
              state={{ flightWithScore }}
              className="btn-primary py-2 px-4 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
