import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, ChevronDown, ChevronUp, Calendar, AlertTriangle, Leaf, Clock } from 'lucide-react';
import type { FlightWithScore } from '../../api/types';
import { formatTime, formatDuration, formatPrice, formatDate } from '../../utils/formatters';
import ScoreBadge from './ScoreBadge';
import FlightHighlightTags from './FlightHighlightTags';
import FavoriteButton from './FavoriteButton';
import CompareButton from '../compare/CompareButton';
import { cn } from '../../utils/cn';

interface FlightCardProps {
  flightWithScore: FlightWithScore;
  onSelect?: () => void;
  showCompare?: boolean;
  isRoundTrip?: boolean;
  returnDate?: string;
}

/**
 * Flight Card component matching iOS design
 * - Airline icon placeholder + name + flight number
 * - Score badge (GREEN)
 * - Times with +1 next-day indicator
 * - Duration and stops in center
 * - Price in blue/accent
 * - View Details expandable
 * - Compare button
 */
const FlightCard: React.FC<FlightCardProps> = ({
  flightWithScore,
  onSelect,
  showCompare = true,
  isRoundTrip = false,
  returnDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { flight, score, facilities } = flightWithScore;

  // Check if arrival is next day
  const departureDate = new Date(flight.departureTime);
  const arrivalDate = new Date(flight.arrivalTime);
  const isNextDay = arrivalDate.getDate() !== departureDate.getDate();

  // Calculate estimated individual leg prices for round trips
  // Typically outbound is slightly more expensive than return (55/45 split)
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
            {isRoundTrip ? (
              <>
                {/* Round trip total with breakdown */}
                <p className="text-2xl font-bold text-primary">{formatPrice(flight.price, flight.currency)}</p>
                <p className="text-xs text-text-muted">round trip total</p>
                <div className="text-xs text-text-secondary mt-1 space-y-0.5">
                  <p>Outbound: ~{formatPrice(outboundPrice, flight.currency)}</p>
                  <p>Return: ~{formatPrice(returnPrice, flight.currency)}</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">{formatPrice(flight.price, flight.currency)}</p>
                <p className="text-xs text-text-muted">per person</p>
              </>
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
          {/* View Details */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-primary font-medium hover:text-primary-hover transition-colors"
          >
            View Details
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Compare + Favorite + Select */}
          <div className="flex items-center gap-2">
            <FavoriteButton flightWithScore={flightWithScore} size="sm" />
            {showCompare && (
              <CompareButton flightWithScore={flightWithScore} />
            )}
            <Link
              to={`/flights/${flight.id}`}
              state={{ flightWithScore }}
              className="btn-primary py-2 px-4 text-sm"
            >
              Select
            </Link>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-divider p-4 md:p-5 bg-surface-alt">
          {/* Highlights */}
          {score.highlights && score.highlights.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Highlights</h4>
              <div className="flex flex-wrap gap-2">
                {score.highlights.map((highlight, index) => (
                  <span key={index} className="highlight-tag">
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-text-primary mb-2">Score Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Reliability', value: score.dimensions.reliability },
                { label: 'Comfort', value: score.dimensions.comfort },
                { label: 'Service', value: score.dimensions.service },
                { label: 'Value', value: score.dimensions.value },
              ].map((dim) => (
                <div key={dim.label} className="flex items-center justify-between bg-surface rounded-lg p-2.5">
                  <span className="text-sm text-text-secondary">{dim.label}</span>
                  <span className="font-semibold text-text-primary">{dim.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flight Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-surface rounded-lg p-2.5">
              <span className="text-text-muted block text-xs">Aircraft</span>
              <span className="text-text-primary font-medium">{flight.aircraftModel || 'Not specified'}</span>
            </div>
            <div className="bg-surface rounded-lg p-2.5">
              <span className="text-text-muted block text-xs">Cabin</span>
              <span className="text-text-primary font-medium capitalize">{flight.cabin}</span>
            </div>
            {facilities?.legroom && (
              <div className="bg-surface rounded-lg p-2.5">
                <span className="text-text-muted block text-xs">Legroom</span>
                <span className="text-text-primary font-medium">{facilities.legroom}</span>
              </div>
            )}
            {flight.seatsRemaining && (
              <div className="bg-surface rounded-lg p-2.5">
                <span className="text-text-muted block text-xs">Seats Left</span>
                <span className={cn(
                  'font-medium',
                  flight.seatsRemaining < 5 ? 'text-danger' : 'text-text-primary'
                )}>
                  {flight.seatsRemaining}
                </span>
              </div>
            )}
            {facilities?.hasWifi && (
              <div className="bg-surface rounded-lg p-2.5">
                <span className="text-text-muted block text-xs">WiFi</span>
                <span className="text-success font-medium">
                  {facilities.wifiFree ? 'Free' : 'Available'}
                </span>
              </div>
            )}
            {facilities?.hasUSB && (
              <div className="bg-surface rounded-lg p-2.5">
                <span className="text-text-muted block text-xs">USB Power</span>
                <span className="text-success font-medium">Available</span>
              </div>
            )}
          </div>

          {/* Extensions/Amenities from SerpAPI */}
          {facilities?.rawExtensions && facilities.rawExtensions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {facilities.rawExtensions.map((ext, index) => (
                  <span key={index} className="px-2 py-1 bg-surface rounded-md text-xs text-text-secondary">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Layover Details */}
          {flight.layoverDetails && flight.layoverDetails.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Layovers</h4>
              <div className="space-y-2">
                {flight.layoverDetails.map((layover, index) => (
                  <div key={index} className="flex items-center gap-2 bg-surface rounded-lg p-2.5">
                    <Clock className="w-4 h-4 text-text-secondary" />
                    <span className="text-text-primary font-medium">
                      {formatDuration(layover.durationMinutes)} in {layover.airportName} ({layover.airportCode})
                    </span>
                    {layover.isOvernight && (
                      <span className="px-2 py-0.5 bg-warning/15 text-warning text-xs rounded-full">Overnight</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Select Button (mobile) */}
          {onSelect && (
            <button
              onClick={onSelect}
              className="w-full btn-primary mt-4 md:hidden"
            >
              Select Flight
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FlightCard;
