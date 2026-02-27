import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { FlightSearchFilters } from '../../hooks/useFlightSearchParams';

interface FilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  filters: FlightSearchFilters;
  onUpdateFilters: (updates: Partial<FlightSearchFilters>) => void;
  onResetFilters: () => void;
  availableAirlines: Array<{ code: string; name: string; count?: number }>;
  priceRange: { min: number; max: number };
}

/**
 * Mobile filter bottom sheet using Headless UI Dialog
 */
const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  open,
  onClose,
  filters,
  onUpdateFilters,
  onResetFilters,
  availableAirlines,
  priceRange,
}) => {
  const hasActiveFilters =
    filters.stops !== 'any' ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.airlines.length > 0;

  const handleApply = () => {
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        {/* Sheet */}
        <div className="fixed inset-x-0 bottom-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <Dialog.Panel className="bottom-sheet max-h-[85vh] flex flex-col safe-bottom">
              {/* Handle */}
              <div className="bottom-sheet-handle" />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
                <Dialog.Title className="text-lg font-semibold text-text-primary">
                  Filters
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-text-muted hover:text-text-primary rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Stops Filter */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">Stops</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'any', label: 'All Flights' },
                      { value: '0', label: 'Direct' },
                      { value: '1', label: '1 Stop' },
                      { value: '2', label: '2 Stops' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onUpdateFilters({ stops: option.value })}
                        className={cn(
                          'chip',
                          filters.stops === option.value && 'active'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">Price Range</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-text-muted mb-1 block">Min</label>
                      <input
                        type="number"
                        value={filters.minPrice ?? priceRange.min}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          onUpdateFilters({
                            minPrice: val === priceRange.min ? undefined : val,
                          });
                        }}
                        className="input-field py-2.5"
                      />
                    </div>
                    <span className="text-text-muted mt-5">–</span>
                    <div className="flex-1">
                      <label className="text-xs text-text-muted mb-1 block">Max</label>
                      <input
                        type="number"
                        value={filters.maxPrice ?? priceRange.max}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          onUpdateFilters({
                            maxPrice: val === priceRange.max ? undefined : val,
                          });
                        }}
                        className="input-field py-2.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Airlines */}
                {availableAirlines.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Airlines</h4>
                    <div className="space-y-2">
                      {availableAirlines.map((airline) => {
                        const isSelected = filters.airlines.includes(airline.code);
                        return (
                          <label
                            key={airline.code}
                            className="flex items-center gap-3 py-2 cursor-pointer"
                          >
                            <div
                              className={cn(
                                'w-6 h-6 rounded border-2 flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary'
                                  : 'border-border'
                              )}
                            >
                              {isSelected && (
                                <svg
                                  className="w-4 h-4 text-white"
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
                            <span className="flex-1 text-text-primary">
                              {airline.name}
                            </span>
                            {airline.count !== undefined && (
                              <span className="text-sm text-text-muted">
                                ({airline.count})
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 p-4 border-t border-divider bg-surface">
                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 flex-1 py-3 btn-secondary"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                )}
                <button
                  onClick={handleApply}
                  className="flex-1 py-3 btn-primary"
                >
                  Apply Filters
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FilterBottomSheet;
