import React from 'react';
import { RotateCcw, Sun, Sunset, Moon, Sunrise } from 'lucide-react';
import { cn } from '../../utils/cn';
import { trackTimeFilter } from '../../api/preferences';
import type { FlightSearchFilters } from '../../hooks/useFlightSearchParams';

interface FilterPanelProps {
  filters: FlightSearchFilters;
  onUpdateFilters: (updates: Partial<FlightSearchFilters>) => void;
  onResetFilters: () => void;
  availableAirlines: Array<{ code: string; name: string; count?: number }>;
  priceRange: { min: number; max: number };
  className?: string;
  /** Whether to track filter changes for personalization (requires auth) */
  trackPreferences?: boolean;
}

// Time period options
const timePeriods = [
  { id: 'morning', label: 'Morning', time: '6AM-12PM', icon: Sunrise, minHour: 6, maxHour: 12 },
  { id: 'afternoon', label: 'Afternoon', time: '12PM-6PM', icon: Sun, minHour: 12, maxHour: 18 },
  { id: 'evening', label: 'Evening', time: '6PM-10PM', icon: Sunset, minHour: 18, maxHour: 22 },
  { id: 'night', label: 'Night', time: '10PM-6AM', icon: Moon, minHour: 22, maxHour: 6 },
];

// Aircraft types
const aircraftTypes = [
  { id: 'widebody', label: 'Widebody', description: '777, A350, 787' },
  { id: 'narrowbody', label: 'Narrowbody', description: 'A320, 737, A321' },
];

// Airline alliances
const alliances = [
  { id: 'star', label: 'Star Alliance', airlines: ['LH', 'SQ', 'TK', 'UA', 'NH'] },
  { id: 'oneworld', label: 'Oneworld', airlines: ['CX', 'BA', 'QF', 'AA', 'JL'] },
  { id: 'skyteam', label: 'SkyTeam', airlines: ['AF', 'KL', 'DL', 'KE', 'MU'] },
];

/**
 * Enhanced Filter Panel for desktop sidebar
 * - Stops filter (Direct, 1 stop, 2 stops, All flights)
 * - Departure time periods
 * - Aircraft type (widebody/narrowbody)
 * - Airline alliances
 * - Price range slider
 * - Airlines multi-select
 */
const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  availableAirlines,
  priceRange,
  className,
  trackPreferences = false,
}) => {
  // Check if any filters are active
  const hasActiveFilters =
    filters.stops !== 'any' ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.airlines.length > 0 ||
    filters.departureTimeMin !== undefined ||
    filters.departureTimeMax !== undefined ||
    filters.aircraftType !== undefined ||
    filters.alliance !== undefined;

  const handleTimePeriodToggle = (minHour: number, maxHour: number) => {
    // Toggle time period filter
    if (filters.departureTimeMin === minHour && filters.departureTimeMax === maxHour) {
      onUpdateFilters({ departureTimeMin: undefined, departureTimeMax: undefined });
    } else {
      onUpdateFilters({ departureTimeMin: minHour, departureTimeMax: maxHour });
      
      // Track the time filter selection for personalization
      if (trackPreferences) {
        trackTimeFilter(`${minHour}-${maxHour}`);
      }
    }
  };

  const handleAllianceSelect = (allianceId: string, airlineCodes: string[]) => {
    if (filters.alliance === allianceId) {
      onUpdateFilters({ alliance: undefined, airlines: [] });
    } else {
      onUpdateFilters({ alliance: allianceId, airlines: airlineCodes });
    }
  };

  return (
    <aside className={cn('w-72 flex-shrink-0 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>

      {/* Stops Filter */}
      <div className="filter-panel">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Stops</h4>
        <div className="space-y-2">
          {[
            { value: 'any', label: 'All Flights' },
            { value: '0', label: 'Direct' },
            { value: '1', label: '1 Stop' },
            { value: '2', label: '2 Stops' },
          ].map((option) => (
            <label
              key={option.value}
              onClick={() => onUpdateFilters({ stops: option.value as FlightSearchFilters['stops'] })}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  filters.stops === option.value
                    ? 'border-primary bg-primary'
                    : 'border-border group-hover:border-text-muted'
                )}
              >
                {filters.stops === option.value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Departure Time Filter */}
      <div className="filter-panel">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Departure Time</h4>
        <div className="grid grid-cols-2 gap-2">
          {timePeriods.map((period) => {
            const isSelected = 
              filters.departureTimeMin === period.minHour && 
              filters.departureTimeMax === period.maxHour;
            const Icon = period.icon;
            return (
              <button
                key={period.id}
                onClick={() => handleTimePeriodToggle(period.minHour, period.maxHour)}
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-text-muted'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 mb-1',
                  isSelected ? 'text-primary' : 'text-text-muted'
                )} />
                <span className={cn(
                  'text-xs font-medium',
                  isSelected ? 'text-primary' : 'text-text-secondary'
                )}>
                  {period.label}
                </span>
                <span className="text-xs text-text-muted">{period.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aircraft Type Filter */}
      <div className="filter-panel">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Aircraft Type</h4>
        <div className="space-y-2">
          {aircraftTypes.map((type) => {
            const isSelected = filters.aircraftType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => onUpdateFilters({ 
                  aircraftType: isSelected ? undefined : type.id 
                })}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-text-muted'
                )}
              >
                <div className="text-left">
                  <span className={cn(
                    'text-sm font-medium block',
                    isSelected ? 'text-primary' : 'text-text-primary'
                  )}>
                    {type.label}
                  </span>
                  <span className="text-xs text-text-muted">{type.description}</span>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-primary bg-primary' : 'border-border'
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Airline Alliance Filter */}
      <div className="filter-panel">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Airline Alliance</h4>
        <div className="space-y-2">
          {alliances.map((alliance) => {
            const isSelected = filters.alliance === alliance.id;
            return (
              <button
                key={alliance.id}
                onClick={() => handleAllianceSelect(alliance.id, alliance.airlines)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-text-muted'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-primary' : 'text-text-primary'
                )}>
                  {alliance.label}
                </span>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-primary bg-primary' : 'border-border'
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="filter-panel">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Price Range</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-text-muted">Min</label>
              <input
                type="number"
                value={filters.minPrice ?? priceRange.min}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onUpdateFilters({
                    minPrice: val === priceRange.min ? undefined : val,
                  });
                }}
                min={priceRange.min}
                max={priceRange.max}
                className="input-field py-2 text-sm"
              />
            </div>
            <span className="text-text-muted mt-4">-</span>
            <div className="flex-1">
              <label className="text-xs text-text-muted">Max</label>
              <input
                type="number"
                value={filters.maxPrice ?? priceRange.max}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onUpdateFilters({
                    maxPrice: val === priceRange.max ? undefined : val,
                  });
                }}
                min={priceRange.min}
                max={priceRange.max}
                className="input-field py-2 text-sm"
              />
            </div>
          </div>
          <div className="text-xs text-text-muted text-center">
            ${priceRange.min} - ${priceRange.max}
          </div>
        </div>
      </div>

      {/* Airlines Filter */}
      {availableAirlines.length > 0 && (
        <div className="filter-panel">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Airlines</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {availableAirlines.map((airline) => {
              const isSelected = filters.airlines.includes(airline.code);
              return (
                <button
                  key={airline.code}
                  type="button"
                  onClick={() => {
                    const newAirlines = isSelected
                      ? filters.airlines.filter(a => a !== airline.code)
                      : [...filters.airlines, airline.code];
                    onUpdateFilters({ airlines: newAirlines, alliance: undefined });
                  }}
                  className="flex items-center gap-3 cursor-pointer group w-full text-left"
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-border group-hover:border-text-muted'
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors truncate block">
                      {airline.name}
                    </span>
                  </div>
                  {airline.count !== undefined && (
                    <span className="text-xs text-text-muted">
                      ({airline.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              if (filters.airlines.length === availableAirlines.length) {
                onUpdateFilters({ airlines: [] });
              } else {
                onUpdateFilters({
                  airlines: availableAirlines.map((a) => a.code),
                });
              }
            }}
            className="mt-2 text-xs text-primary hover:text-primary-hover font-medium"
          >
            {filters.airlines.length === availableAirlines.length
              ? 'Deselect all'
              : 'Select all'}
          </button>
        </div>
      )}
    </aside>
  );
};

export default FilterPanel;
