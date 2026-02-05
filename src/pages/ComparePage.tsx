import React, { useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, X, Check, Minus, Trophy, Scale, Plane, Wifi, Zap, Monitor, UtensilsCrossed } from 'lucide-react';
import { useCompareStore, useCanCompare } from '../stores/compareStore';
import { formatPrice, formatDuration, formatTime } from '../utils/formatters';
import ScoreBadge from '../components/flights/ScoreBadge';
import CompareRadarChart from '../components/compare/CompareRadarChart';
import ComparePDFExport from '../components/compare/ComparePDFExport';
import { cn } from '../utils/cn';

// Color palette matching CompareRadarChart for flight identification
const FLIGHT_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hex: '#3b82f6' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', hex: '#10b981' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', hex: '#f59e0b' },
];

/**
 * Compare Page - Apple-style vertical flight comparison
 * - Flights displayed as vertical columns/cards
 * - Flight name always visible at top
 * - Sticky header with flight names
 * - Highlight best values
 */
const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const { flights, removeFlight, clearAll } = useCompareStore();
  const canCompare = useCanCompare();
  const radarChartRef = useRef<HTMLDivElement>(null);

  // Redirect if not enough flights
  if (!canCompare) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Scale className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Not enough flights to compare
          </h2>
          <p className="text-text-secondary mb-6">
            Add at least 2 flights to compare them side by side.
          </p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Find best values for highlighting
  const bestPrice = Math.min(...flights.map(f => f.flight.price));
  const bestDuration = Math.min(...flights.map(f => f.flight.durationMinutes));
  const bestScore = Math.max(...flights.map(f => f.score.overallScore));
  const fewestStops = Math.min(...flights.map(f => f.flight.stops));

  // Comparison specs configuration
  const specs = [
    {
      category: 'Flight Details',
      items: [
        {
          label: 'Airease Score',
          getValue: (f: typeof flights[0]) => (
            <ScoreBadge score={f.score.overallScore} size="sm" showLabel={false} />
          ),
          isBest: (f: typeof flights[0]) => f.score.overallScore === bestScore,
        },
        {
          label: 'Price',
          getValue: (f: typeof flights[0]) => (
            <span className="text-lg font-bold text-primary">
              {formatPrice(f.flight.price, f.flight.currency)}
            </span>
          ),
          isBest: (f: typeof flights[0]) => f.flight.price === bestPrice,
        },
        {
          label: 'Duration',
          getValue: (f: typeof flights[0]) => (
            <span className="font-medium text-text-primary">
              {formatDuration(f.flight.durationMinutes)}
            </span>
          ),
          isBest: (f: typeof flights[0]) => f.flight.durationMinutes === bestDuration,
        },
        {
          label: 'Stops',
          getValue: (f: typeof flights[0]) => (
            <span className={cn(
              'font-medium',
              f.flight.stops === 0 ? 'text-success' : 'text-text-primary'
            )}>
              {f.flight.stops === 0 ? 'Direct' : `${f.flight.stops} stop${f.flight.stops > 1 ? 's' : ''}`}
            </span>
          ),
          isBest: (f: typeof flights[0]) => f.flight.stops === fewestStops,
        },
        {
          label: 'Departure',
          getValue: (f: typeof flights[0]) => (
            <span className="text-text-primary font-medium">{formatTime(f.flight.departureTime)}</span>
          ),
          isBest: () => false,
        },
        {
          label: 'Arrival',
          getValue: (f: typeof flights[0]) => (
            <span className="text-text-primary font-medium">{formatTime(f.flight.arrivalTime)}</span>
          ),
          isBest: () => false,
        },
      ],
    },
    {
      category: 'Amenities',
      items: [
        {
          label: 'WiFi',
          icon: Wifi,
          getValue: (f: typeof flights[0]) =>
            f.facilities?.hasWifi ? (
              <span className="flex items-center gap-1.5 text-success font-medium">
                <Check className="w-4 h-4" /> Available
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-text-muted">
                <Minus className="w-4 h-4" /> Not available
              </span>
            ),
          isBest: (f: typeof flights[0]) => f.facilities?.hasWifi === true,
        },
        {
          label: 'Power Outlets',
          icon: Zap,
          getValue: (f: typeof flights[0]) =>
            f.facilities?.hasPower ? (
              <span className="flex items-center gap-1.5 text-success font-medium">
                <Check className="w-4 h-4" /> Available
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-text-muted">
                <Minus className="w-4 h-4" /> Not available
              </span>
            ),
          isBest: (f: typeof flights[0]) => f.facilities?.hasPower === true,
        },
        {
          label: 'Entertainment',
          icon: Monitor,
          getValue: (f: typeof flights[0]) =>
            f.facilities?.hasIFE ? (
              <span className="text-text-primary font-medium">{f.facilities.ifeType}</span>
            ) : (
              <span className="text-text-muted">Not available</span>
            ),
          isBest: (f: typeof flights[0]) => f.facilities?.hasIFE === true,
        },
        {
          label: 'Seat Pitch',
          getValue: (f: typeof flights[0]) => (
            <span className="text-text-primary font-medium">
              {f.facilities?.seatPitchInches ? `${f.facilities.seatPitchInches}"` : '—'}
            </span>
          ),
          isBest: (f: typeof flights[0]) => {
            const maxPitch = Math.max(
              ...flights.map(fl => fl.facilities?.seatPitchInches || 0)
            );
            return f.facilities?.seatPitchInches === maxPitch && maxPitch > 0;
          },
        },
        {
          label: 'Meals',
          icon: UtensilsCrossed,
          getValue: (f: typeof flights[0]) =>
            f.facilities?.mealIncluded ? (
              <span className="text-text-primary font-medium">{f.facilities.mealType}</span>
            ) : (
              <span className="text-text-muted">Not included</span>
            ),
          isBest: (f: typeof flights[0]) => f.facilities?.mealIncluded === true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface shadow-sticky">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to results</span>
            </button>
            <h1 className="text-lg font-semibold text-text-primary">
              Compare Flights
            </h1>
            <div className="flex items-center gap-3">
              <ComparePDFExport flights={flights} radarChartRef={radarChartRef} />
              <button
                onClick={clearAll}
                className="text-sm text-text-muted hover:text-danger transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Flight Cards Header - Apple Style */}
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: `repeat(${flights.length}, 1fr)` }}>
          {flights.map((f, index) => {
            const isBestOverall = f.score.overallScore === bestScore && f.flight.price === bestPrice;
            const flightColor = FLIGHT_COLORS[index % FLIGHT_COLORS.length];
            return (
              <div
                key={f.flight.id}
                className={cn(
                  "bg-surface rounded-2xl shadow-card p-6 relative text-center",
                  isBestOverall && "ring-2 ring-success"
                )}
              >
                {/* Remove button */}
                <button
                  onClick={() => removeFlight(f.flight.id)}
                  className="absolute top-3 right-3 p-1.5 text-text-muted hover:text-danger rounded-full hover:bg-surface-alt transition-colors"
                  aria-label="Remove from compare"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Best overall badge */}
                {isBestOverall && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Best Choice
                  </div>
                )}

                {/* Flight Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mx-auto mb-4">
                  <Plane className="w-8 h-8 text-primary " />
                </div>

                {/* Airline Name - Always Visible */}
                <h2 className="text-xl font-bold text-text-primary mb-1">
                  {f.flight.airline}
                </h2>
                <p className={cn(
                  "text-sm font-medium px-3 py-1 rounded-full inline-block mb-3",
                  flightColor.bg,
                  flightColor.text
                )}>
                  {f.flight.flightNumber}
                </p>

                {/* Route */}
                <div className="flex items-center justify-center gap-2 text-sm text-text-secondary mb-4">
                  <span className="font-medium">{f.flight.departureCityCode}</span>
                  <Plane className="w-3 h-3 text-primary " />
                  <span className="font-medium">{f.flight.arrivalCityCode}</span>
                </div>

                {/* Score Badge */}
                <div className="mb-4">
                  <ScoreBadge score={f.score.overallScore} size="lg" />
                </div>

                {/* Price */}
                <p className="text-3xl font-bold text-primary mb-1">
                  {formatPrice(f.flight.price, f.flight.currency)}
                </p>
                <p className="text-sm text-text-muted">per person</p>
              </div>
            );
          })}
        </div>

        {/* Comparison Specs - Vertical Layout */}
        <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
          {specs.map((section, sectionIndex) => (
            <div key={section.category}>
              {/* Category Header */}
              <div className="bg-surface-alt px-6 py-3 border-b border-divider">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                  {section.category}
                </h3>
              </div>

              {/* Spec Rows */}
              {section.items.map((spec, specIndex) => (
                <div
                  key={spec.label}
                  className={cn(
                    "grid items-center border-b border-divider",
                    specIndex === section.items.length - 1 && sectionIndex === specs.length - 1 && "border-b-0"
                  )}
                  style={{ gridTemplateColumns: `180px repeat(${flights.length}, 1fr)` }}
                >
                  {/* Spec Label */}
                  <div className="px-6 py-4 text-sm font-medium text-text-secondary flex items-center gap-2">
                    {spec.label}
                  </div>

                  {/* Values for each flight */}
                  {flights.map((f) => {
                    const isBest = spec.isBest(f);
                    return (
                      <div
                        key={f.flight.id}
                        className={cn(
                          "px-4 py-4 text-center border-l border-divider flex items-center justify-center gap-2",
                          isBest && "bg-success/5"
                        )}
                      >
                        {spec.getValue(f)}
                        {isBest && (
                          <Trophy className="w-4 h-4 text-success flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {/* Action Buttons Row */}
          <div
            className="grid border-t border-divider bg-surface-alt"
            style={{ gridTemplateColumns: `180px repeat(${flights.length}, 1fr)` }}
          >
            <div className="px-6 py-4" />
            {flights.map((f, index) => {
              const flightColor = FLIGHT_COLORS[index % FLIGHT_COLORS.length];
              return (
                <div key={f.flight.id} className="p-4 border-l border-divider">
                  <Link
                    to={`/flights/${f.flight.id}`}
                    state={{ flightWithScore: f }}
                    className="block w-full py-3 text-center font-semibold rounded-xl transition-all hover:opacity-90"
                    style={{ 
                      backgroundColor: flightColor.hex,
                      color: 'white'
                    }}
                  >
                    Select {f.flight.airline.split(' ')[0]}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Radar Chart Section */}
        <div className="mt-8" ref={radarChartRef}>
          <CompareRadarChart flights={flights} />
        </div>

        {/* Mobile-friendly vertical cards */}
        <div className="mt-8 space-y-6 lg:hidden">
          <h2 className="text-lg font-semibold text-text-primary">Detailed Comparison</h2>
          {flights.map((f) => {
            const isBestPrice = f.flight.price === bestPrice;
            const isBestDuration = f.flight.durationMinutes === bestDuration;

            return (
              <div key={f.flight.id} className="bg-surface rounded-2xl shadow-card overflow-hidden">
                {/* Card Header */}
                <div className="p-5 border-b border-divider bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center">
                        <Plane className="w-6 h-6 text-primary " />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary text-lg">{f.flight.airline}</h3>
                        <p className="text-sm text-text-secondary">{f.flight.flightNumber}</p>
                      </div>
                    </div>
                    <ScoreBadge score={f.score.overallScore} size="sm" />
                  </div>
                </div>

                {/* Specs */}
                <div className="divide-y divide-divider">
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-text-secondary">Price</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-lg">
                        {formatPrice(f.flight.price, f.flight.currency)}
                      </span>
                      {isBestPrice && (
                        <span className="text-xs bg-success-light text-success px-2 py-0.5 rounded-full font-medium">
                          Best
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-text-secondary">Duration</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {formatDuration(f.flight.durationMinutes)}
                      </span>
                      {isBestDuration && (
                        <span className="text-xs bg-success-light text-success px-2 py-0.5 rounded-full font-medium">
                          Fastest
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-text-secondary">Stops</span>
                    <span className={cn(
                      "font-medium",
                      f.flight.stops === 0 ? "text-success" : "text-text-primary"
                    )}>
                      {f.flight.stops === 0 ? 'Direct' : `${f.flight.stops} stop${f.flight.stops > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-text-secondary">Route</span>
                    <span className="flex items-center gap-1 text-text-primary font-medium">
                      {f.flight.departureCityCode}
                      <Plane className="w-3 h-3 text-primarys" />
                      {f.flight.arrivalCityCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-text-secondary">Time</span>
                    <span className="text-text-primary font-medium">
                      {formatTime(f.flight.departureTime)} – {formatTime(f.flight.arrivalTime)}
                    </span>
                  </div>

                  {/* Amenities row */}
                  <div className="px-5 py-3">
                    <span className="text-text-secondary text-sm block mb-2">Amenities</span>
                    <div className="flex flex-wrap gap-2">
                      {f.facilities?.hasWifi && (
                        <span className="flex items-center gap-1 text-xs bg-success-light text-success px-2 py-1 rounded-full">
                          <Wifi className="w-3 h-3" /> WiFi
                        </span>
                      )}
                      {f.facilities?.hasPower && (
                        <span className="flex items-center gap-1 text-xs bg-success-light text-success px-2 py-1 rounded-full">
                          <Zap className="w-3 h-3" /> Power
                        </span>
                      )}
                      {f.facilities?.hasIFE && (
                        <span className="flex items-center gap-1 text-xs bg-primary-light text-primary px-2 py-1 rounded-full">
                          <Monitor className="w-3 h-3" /> {f.facilities.ifeType}
                        </span>
                      )}
                      {f.facilities?.mealIncluded && (
                        <span className="flex items-center gap-1 text-xs bg-primary-light text-primary px-2 py-1 rounded-full">
                          <UtensilsCrossed className="w-3 h-3" /> {f.facilities.mealType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-4 bg-surface-alt">
                  <Link
                    to={`/flights/${f.flight.id}`}
                    state={{ flightWithScore: f }}
                    className="block w-full py-3 btn-primary text-center"
                  >
                    Select {f.flight.airline}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ComparePage;
