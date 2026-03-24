/**
 * Filter Dropdown — sits next to the Sort dropdown in the header bar.
 * Contains all filter options including passengers and cabin class.
 * Uses batch-apply: changes are staged locally and only applied on "Apply Filters".
 */

import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, Sun, Sunset, Moon, Sunrise, Plus, Minus, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { trackTimeFilter } from '../../api/preferences';
import EnglishDateInput from '../common/EnglishDateInput';
import CityAutocomplete from '../search/CityAutocomplete';
import type { FlightSearchFilters, MultiCityLeg } from '../../hooks/useFlightSearchParams';
import type { CabinClass, TripType } from '../../hooks/useFlightSearchParams';
import { formatDateForApi } from '../../utils/formatters';

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
  { id: 'star', label: 'Star Alliance' },
  { id: 'oneworld', label: 'Oneworld' },
  { id: 'skyteam', label: 'SkyTeam' },
];

const allianceAirlines: Record<string, string[]> = {
  star: ['LH', 'SQ', 'TK', 'UA', 'NH'],
  oneworld: ['CX', 'BA', 'QF', 'AA', 'JL'],
  skyteam: ['AF', 'KL', 'DL', 'KE', 'MU'],
};

// Cabin class options
const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];

interface FilterDropdownProps {
  filters: FlightSearchFilters;
  onUpdateFilters: (updates: Partial<FlightSearchFilters>) => void;
  onResetFilters: () => void;
  availableAirlines: Array<{ code: string; name: string; count?: number }>;
  priceRange: { min: number; max: number };
  hasActiveFilters: boolean;
  trackPreferences?: boolean;
  className?: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  priceRange,
  hasActiveFilters,
  trackPreferences = false,
  className,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ---- Local draft state (staged, not yet applied) ----
  const [draftTripType, setDraftTripType] = useState<TripType>(filters.tripType);
  const [draftDate, setDraftDate] = useState(filters.date);
  const [draftReturnDate, setDraftReturnDate] = useState(filters.returnDate);
  const [draftStops, setDraftStops] = useState(filters.stops);
  const [draftDepTimeMin, setDraftDepTimeMin] = useState(filters.departureTimeMin);
  const [draftDepTimeMax, setDraftDepTimeMax] = useState(filters.departureTimeMax);
  const [draftAircraftType, setDraftAircraftType] = useState(filters.aircraftType);
  const [draftAlliance, setDraftAlliance] = useState(filters.alliance);
  const [draftMinPrice, setDraftMinPrice] = useState(filters.minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(filters.maxPrice);
  const [draftAdults, setDraftAdults] = useState(filters.adults);
  const [draftChildren, setDraftChildren] = useState(filters.children);
  const [draftCabin, setDraftCabin] = useState<CabinClass>(filters.cabin);
  
  // Multi-city legs draft state
  const defaultLegs: MultiCityLeg[] = [
    { from: filters.from || '', to: filters.to || '', date: filters.date || formatDateForApi(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) },
    { from: filters.to || '', to: '', date: formatDateForApi(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)) },
  ];
  const [draftMultiCityLegs, setDraftMultiCityLegs] = useState<MultiCityLeg[]>(
    filters.multiCityLegs.length >= 2 ? filters.multiCityLegs : defaultLegs
  );

  // Sync draft state when dropdown opens or filters change externally
  useEffect(() => {
    if (isOpen) {
      setDraftTripType(filters.tripType);
      setDraftDate(filters.date);
      setDraftReturnDate(filters.returnDate);
      setDraftStops(filters.stops);
      setDraftDepTimeMin(filters.departureTimeMin);
      setDraftDepTimeMax(filters.departureTimeMax);
      setDraftAircraftType(filters.aircraftType);
      setDraftAlliance(filters.alliance);
      setDraftMinPrice(filters.minPrice);
      setDraftMaxPrice(filters.maxPrice);
      setDraftAdults(filters.adults);
      setDraftChildren(filters.children);
      setDraftCabin(filters.cabin);
      setDraftMultiCityLegs(
        filters.multiCityLegs.length >= 2 
          ? filters.multiCityLegs 
          : [
              { from: filters.from || '', to: filters.to || '', date: filters.date || formatDateForApi(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) },
              { from: filters.to || '', to: '', date: formatDateForApi(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)) },
            ]
      );
    }
  }, [isOpen]);

  // Close on outside click (but NOT if clicking inside EnglishDateInput's portal calendar)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Ignore clicks inside the EnglishDateInput's portal dropdown
      const dateDropdown = document.getElementById('eng-date-dropdown');
      if (dateDropdown?.contains(target)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleTimePeriodToggle = (minHour: number, maxHour: number) => {
    if (draftDepTimeMin === minHour && draftDepTimeMax === maxHour) {
      setDraftDepTimeMin(undefined);
      setDraftDepTimeMax(undefined);
    } else {
      setDraftDepTimeMin(minHour);
      setDraftDepTimeMax(maxHour);
    }
  };

  const handleAllianceSelect = (allianceId: string) => {
    if (draftAlliance === allianceId) {
      setDraftAlliance(undefined);
    } else {
      setDraftAlliance(allianceId);
    }
  };

  // Apply all staged filters at once
  const handleApply = () => {
    const updates: Partial<FlightSearchFilters> = {
      tripType: draftTripType,
      date: draftDate,
      returnDate: draftReturnDate,
      stops: draftStops,
      departureTimeMin: draftDepTimeMin,
      departureTimeMax: draftDepTimeMax,
      aircraftType: draftAircraftType,
      alliance: draftAlliance,
      airlines: draftAlliance ? (allianceAirlines[draftAlliance] || []) : [],
      minPrice: draftMinPrice,
      maxPrice: draftMaxPrice,
      adults: draftAdults,
      children: draftChildren,
      cabin: draftCabin,
    };
    
    // If multi-city, include legs and sync from/to/date from first leg
    if (draftTripType === 'multicity' && draftMultiCityLegs.length >= 2) {
      updates.multiCityLegs = draftMultiCityLegs;
      updates.from = draftMultiCityLegs[0].from;
      updates.to = draftMultiCityLegs[0].to;
      updates.date = draftMultiCityLegs[0].date;
    }
    
    onUpdateFilters(updates);

    // Track time preference if applicable
    if (trackPreferences && draftDepTimeMin !== undefined && draftDepTimeMax !== undefined) {
      trackTimeFilter(`${draftDepTimeMin}-${draftDepTimeMax}`);
    }

    setIsOpen(false);
  };

  const handleReset = () => {
    setDraftTripType(filters.tripType);
    setDraftDate(filters.date);
    setDraftReturnDate(filters.returnDate);
    setDraftStops('any');
    setDraftDepTimeMin(undefined);
    setDraftDepTimeMax(undefined);
    setDraftAircraftType(undefined);
    setDraftAlliance(undefined);
    setDraftMinPrice(undefined);
    setDraftMaxPrice(undefined);
    setDraftAdults(1);
    setDraftChildren(0);
    setDraftCabin('economy');
    onResetFilters();
    setIsOpen(false);
  };

  // Check if draft differs from current filters
  const hasDraftChanges =
    draftTripType !== filters.tripType ||
    draftDate !== filters.date ||
    draftReturnDate !== filters.returnDate ||
    draftStops !== filters.stops ||
    draftDepTimeMin !== filters.departureTimeMin ||
    draftDepTimeMax !== filters.departureTimeMax ||
    draftAircraftType !== filters.aircraftType ||
    draftAlliance !== filters.alliance ||
    draftMinPrice !== filters.minPrice ||
    draftMaxPrice !== filters.maxPrice ||
    draftAdults !== filters.adults ||
    draftChildren !== filters.children ||
    draftCabin !== filters.cabin;

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-button transition-colors',
          hasActiveFilters
            ? 'bg-primary-light border border-primary text-primary'
            : 'text-text-secondary hover:text-text-primary bg-surface border border-border hover:border-text-muted'
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="hidden sm:inline">{t('filters.title')}</span>
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-h-[80vh] origin-top-right bg-surface rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">{t('filters.title')}</h3>
              {hasActiveFilters && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('filters.reset')}
                </button>
              )}
            </div>

            {/* Trip Type */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.tripType')}</h4>
              <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
                {([
                  { value: 'oneway' as TripType, label: t('filters.oneWay') },
                  { value: 'roundtrip' as TripType, label: t('filters.roundTrip') },
                  { value: 'multicity' as TripType, label: t('filters.multiCity') },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraftTripType(opt.value)}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
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
            {draftTripType === 'multicity' ? (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.multiCityLegs')}</h4>
                <div className="space-y-2">
                  {draftMultiCityLegs.map((leg, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded-lg relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-text-muted">{t('search.flight', { number: index + 1 })}</span>
                        {draftMultiCityLegs.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeMultiCityLeg(index)}
                            className="p-0.5 text-text-muted hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <CityAutocomplete
                          value={leg.from}
                          onChange={(value) => updateMultiCityLeg(index, 'from', value)}
                          placeholder={t('search.from')}
                          label=""
                        />
                        <CityAutocomplete
                          value={leg.to}
                          onChange={(value) => updateMultiCityLeg(index, 'to', value)}
                          placeholder={t('search.to')}
                          label=""
                        />
                      </div>
                      <EnglishDateInput
                        value={leg.date}
                        onChange={(val) => updateMultiCityLeg(index, 'date', val)}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-8 pl-2.5 pr-2 text-xs border border-border rounded-lg bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary"
                        iconClassName="w-3.5 h-3.5"
                      />
                    </div>
                  ))}
                  {draftMultiCityLegs.length < 5 && (
                    <button
                      type="button"
                      onClick={addMultiCityLeg}
                      className="w-full py-1.5 border border-dashed border-primary/30 rounded-lg text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      {t('filters.addFlight')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.travelDates')}</h4>
              <div className="space-y-2">
                {/* Departure Date */}
                <div>
                  <label className="text-[10px] text-text-muted mb-1 block">{t('filters.departure')}</label>
                  <EnglishDateInput
                    value={draftDate}
                    onChange={(newDate) => {
                      setDraftDate(newDate);
                      if (draftReturnDate && newDate > draftReturnDate) {
                        setDraftReturnDate(newDate);
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-9 pl-2.5 pr-2 text-xs border border-border rounded-lg bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary"
                    iconClassName="w-3.5 h-3.5"
                  />
                </div>

                {/* Return Date — only for round-trip */}
                {draftTripType === 'roundtrip' && (
                  <div>
                    <label className="text-[10px] text-text-muted mb-1 block">{t('filters.returnDate')}</label>
                    <EnglishDateInput
                      value={draftReturnDate}
                      onChange={(newDate) => setDraftReturnDate(newDate)}
                      min={draftDate || new Date().toISOString().split('T')[0]}
                      className="h-9 pl-2.5 pr-2 text-xs border border-border rounded-lg bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary"
                      iconClassName="w-3.5 h-3.5"
                    />
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Passengers */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.passengers')}</h4>
              <div className="space-y-3">
                {/* Adults */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-text-primary">{t('filters.adults')}</span>
                    <span className="text-[10px] text-text-muted ml-1">12+</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => draftAdults > 1 && setDraftAdults(draftAdults - 1)}
                      disabled={draftAdults <= 1}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center border transition-colors',
                        draftAdults <= 1
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-primary text-primary hover:bg-primary-light'
                      )}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold text-text-primary">{draftAdults}</span>
                    <button
                      type="button"
                      onClick={() => draftAdults < 9 && setDraftAdults(draftAdults + 1)}
                      disabled={draftAdults >= 9}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center border transition-colors',
                        draftAdults >= 9
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-primary text-primary hover:bg-primary-light'
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {/* Children */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-text-primary">{t('filters.children')}</span>
                    <span className="text-[10px] text-text-muted ml-1">2-11</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => draftChildren > 0 && setDraftChildren(draftChildren - 1)}
                      disabled={draftChildren <= 0}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center border transition-colors',
                        draftChildren <= 0
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-primary text-primary hover:bg-primary-light'
                      )}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold text-text-primary">{draftChildren}</span>
                    <button
                      type="button"
                      onClick={() => draftChildren < 8 && setDraftChildren(draftChildren + 1)}
                      disabled={draftChildren >= 8}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center border transition-colors',
                        draftChildren >= 8
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-primary text-primary hover:bg-primary-light'
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cabin Class */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.cabinClass')}</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {CABIN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDraftCabin(option.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left',
                      draftCabin === option.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-text-secondary hover:border-text-muted'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t(`filters.${option.value === 'premium_economy' ? 'premiumEconomy' : option.value === 'first' ? 'firstClass' : option.value}`)}</span>
                      {draftCabin === option.value && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stops */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.stops')}</h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'any', label: t('filters.all') },
                  { value: '0', label: t('filters.direct') },
                  { value: '1', label: t('filters.oneStop') },
                  { value: '2', label: t('filters.twoStops') },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDraftStops(option.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      draftStops === option.value
                        ? 'bg-primary text-white'
                        : 'bg-surface-alt text-text-secondary hover:bg-gray-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Departure Time */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.departureTime')}</h4>
              <div className="grid grid-cols-4 gap-1.5">
                {timePeriods.map((period) => {
                  const isSelected = draftDepTimeMin === period.minHour && draftDepTimeMax === period.maxHour;
                  const Icon = period.icon;
                  return (
                    <button
                      key={period.id}
                      onClick={() => handleTimePeriodToggle(period.minHour, period.maxHour)}
                      className={cn(
                        'flex flex-col items-center p-2 rounded-lg border transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-text-muted'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 mb-0.5', isSelected ? 'text-primary' : 'text-text-muted')} />
                      <span className={cn('text-[10px] font-medium', isSelected ? 'text-primary' : 'text-text-secondary')}>
                        {t(`filters.${period.id}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aircraft Type */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.aircraftType')}</h4>
              <div className="flex gap-1.5">
                {aircraftTypes.map((type) => {
                  const isSelected = draftAircraftType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setDraftAircraftType(isSelected ? undefined : type.id)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg border text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-text-muted'
                      )}
                    >
                      <span className={cn('text-xs font-medium block', isSelected ? 'text-primary' : 'text-text-primary')}>
                        {t(`filters.${type.id}`)}
                      </span>
                      <span className="text-[10px] text-text-muted">{type.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alliance */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.alliance')}</h4>
              <div className="flex flex-wrap gap-1.5">
                {alliances.map((alliance) => (
                  <button
                    key={alliance.id}
                    onClick={() => handleAllianceSelect(alliance.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      draftAlliance === alliance.id
                        ? 'bg-primary text-white'
                        : 'bg-surface-alt text-text-secondary hover:bg-gray-200'
                    )}
                  >
                    {alliance.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{t('filters.priceRange')}</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={draftMinPrice ?? priceRange.min}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDraftMinPrice(val === priceRange.min ? undefined : val);
                    }}
                    min={priceRange.min}
                    max={priceRange.max}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg focus:ring-1 focus:ring-primary"
                    placeholder={t('filters.min')}
                  />
                </div>
                <span className="text-text-muted text-xs">-</span>
                <div className="flex-1">
                  <input
                    type="number"
                    value={draftMaxPrice ?? priceRange.max}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDraftMaxPrice(val === priceRange.max ? undefined : val);
                    }}
                    min={priceRange.min}
                    max={priceRange.max}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg focus:ring-1 focus:ring-primary"
                    placeholder={t('filters.max')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Apply Button Footer */}
          <div className="px-4 py-3 border-t border-border bg-gray-50">
            <button
              type="button"
              onClick={handleApply}
              className={cn(
                'w-full py-2.5 rounded-xl font-semibold text-sm transition-colors',
                hasDraftChanges
                  ? 'bg-primary text-white hover:bg-primary-hover shadow-md'
                  : 'bg-primary text-white hover:bg-primary-hover'
              )}
            >
              {t('filters.applyFilters')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
