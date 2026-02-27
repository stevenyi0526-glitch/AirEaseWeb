import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRightLeft, ChevronDown, Search, Plus, X, Plane } from 'lucide-react';
import { formatDateForApi } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import CityAutocomplete from './CityAutocomplete';
import DateRangePicker from './DateRangePicker';
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
        <div className="flex-1 py-5 px-6 min-w-0">
          {/* Header row: label + trip type */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase select-none">
              Flight Search 
            </span>
            <div className="flex gap-1.5">
              {tripTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTripType(type.value)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                    tripType === type.value
                      ? 'bg-[#034891] text-white shadow-sm'
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
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#034891] z-10" />
                      <input
                        type="date"
                        value={leg.date}
                        onChange={(e) => updateMultiCityLeg(leg.id, 'date', e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#034891]/40 focus:border-[#034891]"
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
                  className="w-full py-2 border-2 border-dashed border-[#034891]/30 rounded-xl text-[#034891] hover:border-[#034891] hover:bg-[#034891]/5 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add another flight
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Row 1: From ↔ To — horizontal in one line */}
              <div className="flex items-end gap-2 mb-4">
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
                  className="mb-1 p-2.5 rounded-full bg-[#034891] text-white hover:bg-[#023670] transition-colors flex-shrink-0"
                >
                  <ArrowRightLeft className="w-4 h-4" />
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
                'grid gap-3 mb-4',
                tripType === 'roundtrip' ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto_auto]'
              )}>
                <div className={cn(tripType === 'roundtrip' ? 'min-w-[320px]' : 'min-w-[200px]')}>
                  <DateRangePicker
                    departureDate={departureDate}
                    returnDate={returnDate}
                    onDepartureChange={setDepartureDate}
                    onReturnChange={setReturnDate}
                    isRoundTrip={tripType === 'roundtrip'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Adults</label>
                  <div className="flex items-center h-12 gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-sm font-semibold transition-colors"
                    >-</button>
                    <span className="w-6 text-center text-lg font-semibold text-gray-700">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(Math.min(9, adults + 1))}
                      disabled={adults >= 9}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-sm font-semibold transition-colors"
                    >+</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Children</label>
                  <div className="flex items-center h-12 gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-sm font-semibold transition-colors"
                    >-</button>
                    <span className="w-6 text-center text-lg font-semibold text-gray-700">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(Math.min(6, children + 1))}
                      disabled={children >= 6}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-sm font-semibold transition-colors"
                    >+</button>
                  </div>
                </div>
              </div>

              {/* Row 3: Cabin + Stops + Search button — inline */}
              <div className="flex items-end gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Cabin</label>
                  <div className="relative">
                    <select
                      value={cabin}
                      onChange={(e) => setCabin(e.target.value)}
                      className="w-full h-12 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-base text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#034891]/40 focus:border-[#034891] truncate"
                    >
                      <option value="economy">Economy</option>
                      <option value="premium_economy">Premium Eco</option>
                      <option value="business">Business</option>
                      <option value="first">First</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Stops</label>
                  <div className="relative">
                    <select
                      value={directOnly ? 'direct' : 'all'}
                      onChange={(e) => setDirectOnly(e.target.value === 'direct')}
                      className="w-full h-12 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-base text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#034891]/40 focus:border-[#034891] truncate"
                    >
                      <option value="all">All Flights</option>
                      <option value="direct">Direct Only</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  className={cn(
                    'h-12 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex-shrink-0',
                    'bg-[#034891] hover:bg-[#023670] active:scale-[0.98]',
                    'flex items-center justify-center gap-2 text-base shadow-sm whitespace-nowrap'
                  )}
                >
                  <Search className="w-5 h-5" />
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
