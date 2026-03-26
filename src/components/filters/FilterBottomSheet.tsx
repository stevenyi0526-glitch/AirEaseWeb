import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, RotateCcw, Plus, Minus, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import EnglishDateInput from '../common/EnglishDateInput';
import CityAutocomplete from '../search/CityAutocomplete';
import type { FlightSearchFilters, MultiCityLeg } from '../../hooks/useFlightSearchParams';
import type { CabinClass } from '../../hooks/useFlightSearchParams';
import { formatDateForApi } from '../../utils/formatters';

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];

interface FilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  filters: FlightSearchFilters;
  onUpdateFilters: (updates: Partial<FlightSearchFilters>) => void;
  onResetFilters: () => void;
  availableAirlines: Array<{ code: string; name: string; count?: number }>;
  priceRange: { min: number; max: number };
  currencySymbol?: string;
}

/**
 * Mobile filter bottom sheet using Headless UI Dialog
 * Uses batch-apply: changes are staged locally and only applied on "Apply Filters".
 */
const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  open,
  onClose,
  filters,
  onUpdateFilters,
  onResetFilters,
  priceRange,
  currencySymbol = '$',
}) => {
  const { t } = useTranslation();
  // Draft state
  const [draftTripType, setDraftTripType] = useState(filters.tripType);
  const [draftDate, setDraftDate] = useState(filters.date);
  const [draftReturnDate, setDraftReturnDate] = useState(filters.returnDate);
  const [draftStops, setDraftStops] = useState(filters.stops);
  const [draftMinPrice, setDraftMinPrice] = useState(filters.minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(filters.maxPrice);
  const [draftAdults, setDraftAdults] = useState(filters.adults);
  const [draftChildren, setDraftChildren] = useState(filters.children);
  const [draftCabin, setDraftCabin] = useState<CabinClass>(filters.cabin);
  
  // Multi-city legs draft state
  const buildDefaultLegs = (): MultiCityLeg[] => [
    { from: filters.from || '', to: filters.to || '', date: filters.date || formatDateForApi(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) },
    { from: filters.to || '', to: '', date: formatDateForApi(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)) },
  ];
  const [draftMultiCityLegs, setDraftMultiCityLegs] = useState<MultiCityLeg[]>(
    filters.multiCityLegs.length >= 2 ? filters.multiCityLegs : buildDefaultLegs()
  );

  // Multi-city leg handlers
  const updateMultiCityLeg = (index: number, field: keyof MultiCityLeg, value: string) => {
    setDraftMultiCityLegs(prev => prev.map((leg, i) => i === index ? { ...leg, [field]: value } : leg));
  };
  const addMultiCityLeg = () => {
    if (draftMultiCityLegs.length >= 5) return;
    const lastLeg = draftMultiCityLegs[draftMultiCityLegs.length - 1];
    const newDate = new Date(lastLeg.date);
    newDate.setDate(newDate.getDate() + 3);
    setDraftMultiCityLegs([...draftMultiCityLegs, { from: lastLeg.to, to: '', date: formatDateForApi(newDate) }]);
  };
  const removeMultiCityLeg = (index: number) => {
    if (draftMultiCityLegs.length <= 2) return;
    setDraftMultiCityLegs(prev => prev.filter((_, i) => i !== index));
  };

  // Sync draft when sheet opens
  useEffect(() => {
    if (open) {
      setDraftTripType(filters.tripType);
      setDraftDate(filters.date);
      setDraftReturnDate(filters.returnDate);
      setDraftStops(filters.stops);
      setDraftMinPrice(filters.minPrice);
      setDraftMaxPrice(filters.maxPrice);
      setDraftAdults(filters.adults);
      setDraftChildren(filters.children);
      setDraftCabin(filters.cabin);
      setDraftMultiCityLegs(filters.multiCityLegs.length >= 2 ? filters.multiCityLegs : buildDefaultLegs());
    }
  }, [open]);

  const hasActiveFilters =
    filters.stops !== 'any' ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.adults !== 1 ||
    filters.children !== 0 ||
    filters.cabin !== 'economy';

  const handleApply = () => {
    const updates: Record<string, any> = {
      tripType: draftTripType,
      date: draftDate,
      returnDate: draftReturnDate,
      stops: draftStops,
      minPrice: draftMinPrice,
      maxPrice: draftMaxPrice,
      adults: draftAdults,
      children: draftChildren,
      cabin: draftCabin,
    };
    if (draftTripType === 'multicity') {
      updates.multiCityLegs = draftMultiCityLegs;
      // Sync from/to/date from the first leg
      if (draftMultiCityLegs.length > 0) {
        updates.from = draftMultiCityLegs[0].from;
        updates.to = draftMultiCityLegs[0].to;
        updates.date = draftMultiCityLegs[0].date;
      }
    }
    onUpdateFilters(updates);
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
                  {t('filters.title')}
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
                {/* Trip Type */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">{t('filters.tripType')}</h4>
                  <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                    {([
                      { value: 'oneway' as const, label: t('filters.oneWay') },
                      { value: 'roundtrip' as const, label: t('filters.roundTrip') },
                      { value: 'multicity' as const, label: t('filters.multiCity') },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftTripType(opt.value)}
                        className={cn(
                          "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all",
                          draftTripType === opt.value
                            ? "bg-white text-primary shadow-sm"
                            : "text-text-muted hover:text-text-primary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Travel Dates / Multi-City Legs */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">
                    {draftTripType === 'multicity' ? t('filters.multiCityLegs') : t('filters.travelDates')}
                  </h4>

                  {draftTripType === 'multicity' ? (
                    <div className="space-y-3">
                      {draftMultiCityLegs.map((leg, idx) => (
                        <div key={idx} className="relative bg-gray-50 rounded-xl p-3 space-y-2 border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-primary">{t('search.flight', { number: idx + 1 })}</span>
                            {draftMultiCityLegs.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeMultiCityLeg(idx)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-text-muted mb-0.5 block">{t('search.from')}</label>
                              <CityAutocomplete
                                value={leg.from}
                                onChange={(val) => updateMultiCityLeg(idx, 'from', val)}
                                placeholder={t('search.departureCity')}
                                className="w-full h-10 px-2.5 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-text-muted mb-0.5 block">{t('search.to')}</label>
                              <CityAutocomplete
                                value={leg.to}
                                onChange={(val) => updateMultiCityLeg(idx, 'to', val)}
                                placeholder={t('search.arrivalCity')}
                                className="w-full h-10 px-2.5 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-text-muted mb-0.5 block">{t('feedbackModal.date')}</label>
                            <EnglishDateInput
                              value={leg.date}
                              onChange={(val) => updateMultiCityLeg(idx, 'date', val)}
                              min={idx > 0 && draftMultiCityLegs[idx - 1].date ? draftMultiCityLegs[idx - 1].date : new Date().toISOString().split('T')[0]}
                              className="w-full h-10 pl-10 pr-3 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              showIcon
                              iconClassName="text-primary"
                            />
                          </div>
                        </div>
                      ))}

                      {draftMultiCityLegs.length < 5 && (
                        <button
                          type="button"
                          onClick={addMultiCityLeg}
                          className="w-full py-2 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          + {t('filters.addFlight')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Departure Date */}
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">{t('filters.departure')}</label>
                        <EnglishDateInput
                          value={draftDate}
                          onChange={(val) => {
                            setDraftDate(val);
                            if (draftReturnDate && val > draftReturnDate) {
                              setDraftReturnDate(val);
                            }
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full h-11 pl-10 pr-3 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          showIcon
                          iconClassName="text-primary"
                        />
                      </div>

                      {/* Return Date — only for round-trip */}
                      {draftTripType === 'roundtrip' && (
                        <div>
                          <label className="text-xs text-text-muted mb-1 block">{t('filters.returnDate')}</label>
                          <EnglishDateInput
                            value={draftReturnDate}
                            onChange={(val) => setDraftReturnDate(val)}
                            min={draftDate || new Date().toISOString().split('T')[0]}
                            className="w-full h-11 pl-10 pr-3 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                            showIcon
                            iconClassName="text-primary"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Passengers */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">{t('filters.passengers')}</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text-primary">{t('filters.adults')}</div>
                        <div className="text-xs text-text-muted">12+</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => draftAdults > 1 && setDraftAdults(draftAdults - 1)}
                          disabled={draftAdults <= 1}
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                            draftAdults <= 1
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-primary text-primary hover:bg-primary-light'
                          )}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-semibold text-text-primary">{draftAdults}</span>
                        <button
                          type="button"
                          onClick={() => draftAdults < 9 && setDraftAdults(draftAdults + 1)}
                          disabled={draftAdults >= 9}
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                            draftAdults >= 9
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-primary text-primary hover:bg-primary-light'
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text-primary">{t('filters.children')}</div>
                        <div className="text-xs text-text-muted">2-11</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => draftChildren > 0 && setDraftChildren(draftChildren - 1)}
                          disabled={draftChildren <= 0}
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                            draftChildren <= 0
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-primary text-primary hover:bg-primary-light'
                          )}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-semibold text-text-primary">{draftChildren}</span>
                        <button
                          type="button"
                          onClick={() => draftChildren < 8 && setDraftChildren(draftChildren + 1)}
                          disabled={draftChildren >= 8}
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                            draftChildren >= 8
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-primary text-primary hover:bg-primary-light'
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cabin Class */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">{t('filters.cabinClass')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {CABIN_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDraftCabin(option.value)}
                        className={cn(
                          'px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
                          draftCabin === option.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-text-secondary hover:border-text-muted'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{t(`filters.${option.value === 'premium_economy' ? 'premiumEconomy' : option.value === 'first' ? 'firstClass' : option.value}`)}</span>
                          {draftCabin === option.value && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stops Filter */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">{t('filters.stops')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'any', label: t('filters.allFlights') },
                      { value: '0', label: t('filters.direct') },
                      { value: '1', label: t('filters.oneStop') },
                      { value: '2', label: t('filters.twoStops') },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDraftStops(option.value)}
                        className={cn(
                          'chip',
                          draftStops === option.value && 'active'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-3">{t('filters.priceRange')} ({currencySymbol})</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-text-muted mb-1 block">{t('filters.min')}</label>
                      <input
                        type="number"
                        value={draftMinPrice ?? priceRange.min}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setDraftMinPrice(isNaN(val) ? undefined : val);
                        }}
                        className="input-field py-2.5"
                      />
                    </div>
                    <span className="text-text-muted mt-5">–</span>
                    <div className="flex-1">
                      <label className="text-xs text-text-muted mb-1 block">{t('filters.max')}</label>
                      <input
                        type="number"
                        value={draftMaxPrice ?? priceRange.max}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setDraftMaxPrice(isNaN(val) ? undefined : val);
                        }}
                        className="input-field py-2.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 p-4 border-t border-divider bg-surface">
                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 flex-1 py-3 btn-secondary"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('filters.reset')}
                  </button>
                )}
                <button
                  onClick={handleApply}
                  className="flex-1 py-3 btn-primary"
                >
                  {t('filters.applyFilters')}
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
