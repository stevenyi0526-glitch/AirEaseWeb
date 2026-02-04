import React from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, Scale, Plane } from 'lucide-react';
import { useCompareStore, useCompareCount, useCanCompare } from '../../stores/compareStore';
import { formatPrice, formatDuration } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface CompareTrayProps {
  className?: string;
}

/**
 * Compare Tray component
 * - Desktop: Right sidebar column
 * - Mobile: Sticky bottom bar
 */
const CompareTray: React.FC<CompareTrayProps> = ({ className }) => {
  const { flights, removeFlight, clearAll } = useCompareStore();
  const count = useCompareCount();
  const canCompare = useCanCompare();

  // Don't render if no flights
  if (count === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop: Right Column Tray */}
      <aside className={cn(
        'hidden lg:block w-80 flex-shrink-0',
        className
      )}>
        <div className="sticky top-24 compare-tray overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-surface-alt border-b border-divider">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-text-primary">
                Compare ({count}/3)
              </h3>
            </div>
            {count > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-text-muted hover:text-danger transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Flight Cards */}
          <div className="p-4 space-y-3">
            {flights.map((f) => (
              <div
                key={f.flight.id}
                className="relative bg-surface-alt rounded-lg p-3 pr-10"
              >
                <button
                  onClick={() => removeFlight(f.flight.id)}
                  className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-danger rounded-full hover:bg-surface transition-colors"
                  aria-label="Remove from compare"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-text-primary">
                    {f.flight.airlineCode}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {f.flight.flightNumber.split(' / ')[0]}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-text-secondary">
                    {f.flight.departureCityCode}
                    <Plane className="w-3 h-3 text-primary" />
                    {f.flight.arrivalCityCode}
                  </span>
                  <span className="font-semibold text-primary">
                    {formatPrice(f.flight.price, f.flight.currency)}
                  </span>
                </div>

                <div className="text-xs text-text-muted mt-1">
                  {formatDuration(f.flight.durationMinutes)} • {f.flight.stops === 0 ? 'Direct' : `${f.flight.stops} stop${f.flight.stops > 1 ? 's' : ''}`}
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 3 - count }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border-2 border-dashed border-border rounded-lg p-4 text-center"
              >
                <span className="text-text-muted text-sm">
                  Add a flight to compare
                </span>
              </div>
            ))}
          </div>

          {/* Compare Button */}
          <div className="p-4 pt-0">
            {canCompare ? (
              <Link
                to="/compare"
                className="flex items-center justify-center gap-2 w-full py-3 btn-primary"
              >
                Compare Flights
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 w-full py-3 btn-primary opacity-50 cursor-not-allowed"
              >
                Add at least 2 flights
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile: Sticky Bottom Bar */}
      <div className="lg:hidden sticky-compare-bar safe-bottom z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Flight avatars */}
            <div className="flex -space-x-2">
              {flights.slice(0, 3).map((f) => (
                <div
                  key={f.flight.id}
                  className="w-9 h-9 rounded-full bg-primary-light border-2 border-surface flex items-center justify-center text-xs font-bold text-primary"
                >
                  {f.flight.airlineCode.slice(0, 2)}
                </div>
              ))}
            </div>
            <div>
              <span className="text-sm font-medium text-text-primary">
                {count} flight{count !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearAll}
                className="block text-xs text-text-muted hover:text-danger"
              >
                Clear
              </button>
            </div>
          </div>

          {canCompare ? (
            <Link
              to="/compare"
              className="px-5 py-2.5 btn-primary text-sm"
            >
              Compare
            </Link>
          ) : (
            <span className="text-sm text-text-muted">
              Add {2 - count} more
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default CompareTray;
