import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRightLeft, ChevronDown, Search, Plus, X, Plane } from 'lucide-react';
import { formatDateForApi } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import CityAutocomplete from './CityAutocomplete';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

type TripType = 'roundtrip' | 'oneway' | 'multicity';

interface MultiCityLeg {
  id: string;
  from: string;
  to: string;
  date: string;
}

interface SearchFormProps {
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({
  initialFrom = '',
  initialTo = '',
  initialDate = '',
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [tripType, setTripType] = useState<TripType>('roundtrip');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [departureDate, setDepartureDate] = useState(
    initialDate || formatDateForApi(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  );
  const [returnDate, setReturnDate] = useState(
    formatDateForApi(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  );
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [cabin, setCabin] = useState('economy');
  const [directOnly, setDirectOnly] = useState(false);
  
  // Multi-city legs state
  const [multiCityLegs, setMultiCityLegs] = useState<MultiCityLeg[]>([
    { id: '1', from: '', to: '', date: formatDateForApi(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) },
    { id: '2', from: '', to: '', date: formatDateForApi(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)) },
  ]);

  const handleSwapCities = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };
  
  // Multi-city leg handlers
  const addMultiCityLeg = () => {
    if (multiCityLegs.length >= 5) return;
    const lastLeg = multiCityLegs[multiCityLegs.length - 1];
    const newDate = new Date(lastLeg.date);
    newDate.setDate(newDate.getDate() + 3);
    setMultiCityLegs([
      ...multiCityLegs,
      { 
        id: Date.now().toString(), 
        from: lastLeg.to,
        to: '', 
        date: formatDateForApi(newDate) 
      }
    ]);
  };
  
  const removeMultiCityLeg = (id: string) => {
    if (multiCityLegs.length <= 2) return;
    setMultiCityLegs(multiCityLegs.filter(leg => leg.id !== id));
  };
  
  const updateMultiCityLeg = (id: string, field: keyof MultiCityLeg, value: string) => {
    setMultiCityLegs(multiCityLegs.map(leg => 
      leg.id === id ? { ...leg, [field]: value } : leg
    ));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
      return;
    }
    
    if (tripType === 'multicity') {
      const isValid = multiCityLegs.every(leg => leg.from && leg.to && leg.date);
      if (!isValid) return;
      
      const firstLeg = multiCityLegs[0];
      const params = new URLSearchParams({
        from: firstLeg.from,
        to: firstLeg.to,
        date: firstLeg.date,
        cabin,
        adults: adults.toString(),
        children: children.toString(),
        tripType: 'multicity',
        multiCityLegs: JSON.stringify(multiCityLegs.map(l => ({
          from: l.from,
          to: l.to,
          date: l.date
        }))),
      });

      if (directOnly) {
        params.set('stops', '0');
      }
      
      navigate(`/flights?${params.toString()}`);
      return;
    }
    
    if (!from || !to || !departureDate) return;

    if (isAuthenticated) {
      try {
        await apiClient.post('/v1/users/search-history', {
          departure_city: from,
          arrival_city: to,
          departure_date: departureDate,
          return_date: tripType === 'roundtrip' ? returnDate : null,
          passengers: adults + children,
          cabin_class: cabin,
        });
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }

    const params = new URLSearchParams({
      from,
      to,
      date: departureDate,
      cabin,
      adults: adults.toString(),
      children: children.toString(),
      tripType,
    });

    if (directOnly) {
      params.set('stops', '0');
    }

    if (tripType === 'roundtrip' && returnDate) {
      params.set('returnDate', returnDate);
    }

    navigate(`/flights?${params.toString()}`);
  };

  const tripTypes: { value: TripType; label: string }[] = [
    { value: 'roundtrip', label: 'Round trip' },
    { value: 'oneway', label: 'One way' },
    { value: 'multicity', label: 'Multi-city' },
  ];

  return (
    <form onSubmit={handleSearch} className="relative">
      {/* Boarding Pass Container */}
      <div className="relative flex items-stretch bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Left Stub — Plane Icon + Dashed Separator */}
        <div className="relative flex items-center justify-center px-5 border-r-2 border-dashed border-gray-200 flex-shrink-0">
          {/* Top semicircle cutout — clip bottom half so only top arc peeks in */}
          <div className="absolute -top-2.5 -right-2.5 w-5 h-5 overflow-hidden pointer-events-none">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: '#f5f7f8', boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>
          {/* Bottom semicircle cutout — clip top half so only bottom arc peeks in */}
          <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 overflow-hidden pointer-events-none">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: '#f5f7f8', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>
          <div className="p-2.5 rounded-xl bg-white border-2 border-gray-200">
            <Plane className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 py-4 px-5 min-w-0">
          {/* Header row: label + trip type */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase select-none">
              Flight Search 
            </span>
            <div className="flex gap-1">
              {tripTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTripType(type.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200',
                    tripType === type.value
                      ? 'bg-[#8da2fb] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-city Form */}
          {tripType === 'multicity' ? (
            <div className="space-y-3 mb-3">
              {multiCityLegs.map((leg, index) => (
                <div key={leg.id} className="p-3 bg-gray-50 rounded-xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400">Flight {index + 1}</span>
                    {multiCityLegs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeMultiCityLeg(leg.id)}
                        className="p-0.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <CityAutocomplete
                      value={leg.from}
                      onChange={(value) => updateMultiCityLeg(leg.id, 'from', value)}
                      placeholder="From"
                      label=""
                    />
                    <CityAutocomplete
                      value={leg.to}
                      onChange={(value) => updateMultiCityLeg(leg.id, 'to', value)}
                      placeholder="To"
                      label=""
                    />
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8da2fb] z-10" />
                      <input
                        type="date"
                        value={leg.date}
                        onChange={(e) => updateMultiCityLeg(leg.id, 'date', e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8da2fb]/40 focus:border-[#8da2fb]"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {multiCityLegs.length < 5 && (
                <button
                  type="button"
                  onClick={addMultiCityLeg}
                  className="w-full py-2 border-2 border-dashed border-[#8da2fb]/30 rounded-xl text-[#8da2fb] hover:border-[#8da2fb] hover:bg-[#8da2fb]/5 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add another flight
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Row 1: From ↔ To — horizontal in one line */}
              <div className="flex items-end gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <CityAutocomplete
                    value={from}
                    onChange={(value) => setFrom(value)}
                    placeholder="Departure city"
                    label="From"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSwapCities}
                  className="mb-0.5 p-2 rounded-full bg-[#8da2fb] text-white hover:bg-[#7c92f0] transition-colors flex-shrink-0"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 min-w-0">
                  <CityAutocomplete
                    value={to}
                    onChange={(value) => setTo(value)}
                    placeholder="Arrival city"
                    label="To"
                  />
                </div>
              </div>

              {/* Row 2: Dates + Passengers — all inline */}
              <div className={cn(
                'grid gap-2 mb-3',
                tripType === 'roundtrip' ? 'grid-cols-[1fr_1fr_auto_auto]' : 'grid-cols-[1fr_auto_auto]'
              )}>
                <div className="min-w-[140px]">
                  <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Departure</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8da2fb]" />
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full h-9 pl-8 pr-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8da2fb]/40 focus:border-[#8da2fb]"
                      required
                    />
                  </div>
                </div>

                {tripType === 'roundtrip' && (
                  <div className="min-w-[140px]">
                    <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Return</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8da2fb]" />
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full h-9 pl-8 pr-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8da2fb]/40 focus:border-[#8da2fb]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Adults</label>
                  <div className="flex items-center h-9 gap-1 justify-center">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-xs font-semibold transition-colors"
                    >-</button>
                    <span className="w-5 text-center text-sm font-semibold text-gray-700">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(Math.min(9, adults + 1))}
                      disabled={adults >= 9}
                      className="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-xs font-semibold transition-colors"
                    >+</button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Children</label>
                  <div className="flex items-center h-9 gap-1 justify-center">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      className="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-xs font-semibold transition-colors"
                    >-</button>
                    <span className="w-5 text-center text-sm font-semibold text-gray-700">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(Math.min(6, children + 1))}
                      disabled={children >= 6}
                      className="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-xs font-semibold transition-colors"
                    >+</button>
                  </div>
                </div>
              </div>

              {/* Row 3: Cabin + Stops + Search button — inline */}
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Cabin</label>
                  <div className="relative">
                    <select
                      value={cabin}
                      onChange={(e) => setCabin(e.target.value)}
                      className="w-full h-9 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#8da2fb]/40 focus:border-[#8da2fb]"
                    >
                      <option value="economy">Economy</option>
                      <option value="premium_economy">Premium Eco</option>
                      <option value="business">Business</option>
                      <option value="first">First</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Stops</label>
                  <div className="relative">
                    <select
                      value={directOnly ? 'direct' : 'all'}
                      onChange={(e) => setDirectOnly(e.target.value === 'direct')}
                      className="w-full h-9 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#8da2fb]/40 focus:border-[#8da2fb]"
                    >
                      <option value="all">All Flights</option>
                      <option value="direct">Direct Only</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  className={cn(
                    'h-9 px-5 rounded-xl font-semibold text-white transition-all duration-200 flex-shrink-0',
                    'bg-[#8da2fb] hover:bg-[#7c92f0] active:scale-[0.98]',
                    'flex items-center justify-center gap-1.5 text-sm shadow-sm whitespace-nowrap'
                  )}
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
};

export default SearchForm;
