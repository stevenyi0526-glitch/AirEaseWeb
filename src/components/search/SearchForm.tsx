import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRightLeft, ChevronDown, Search, Plus, X } from 'lucide-react';
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
    if (multiCityLegs.length >= 5) return; // Max 5 legs
    const lastLeg = multiCityLegs[multiCityLegs.length - 1];
    const newDate = new Date(lastLeg.date);
    newDate.setDate(newDate.getDate() + 3);
    setMultiCityLegs([
      ...multiCityLegs,
      { 
        id: Date.now().toString(), 
        from: lastLeg.to, // Auto-fill from previous destination
        to: '', 
        date: formatDateForApi(newDate) 
      }
    ]);
  };
  
  const removeMultiCityLeg = (id: string) => {
    if (multiCityLegs.length <= 2) return; // Minimum 2 legs
    setMultiCityLegs(multiCityLegs.filter(leg => leg.id !== id));
  };
  
  const updateMultiCityLeg = (id: string, field: keyof MultiCityLeg, value: string) => {
    setMultiCityLegs(multiCityLegs.map(leg => 
      leg.id === id ? { ...leg, [field]: value } : leg
    ));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For multi-city, validate all legs
    if (tripType === 'multicity') {
      const isValid = multiCityLegs.every(leg => leg.from && leg.to && leg.date);
      if (!isValid) return;
      
      // Navigate with multi-city params
      // For now, we'll search the first leg and note it's multi-city
      const firstLeg = multiCityLegs[0];
      const params = new URLSearchParams({
        from: firstLeg.from,
        to: firstLeg.to,
        date: firstLeg.date,
        cabin,
        adults: adults.toString(),
        children: children.toString(),
        tripType: 'multicity',
        // Encode all legs for display/future use
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

    // Save search history if authenticated
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
    <form onSubmit={handleSearch} className="bg-surface rounded-card shadow-card p-6">
      {/* Trip Type Selector */}
      <div className="flex gap-2 mb-6">
        {tripTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setTripType(type.value)}
            className={cn(
              'px-4 py-2 rounded-button font-medium transition-colors',
              tripType === type.value
                ? 'bg-primary text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-border'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Multi-city Form */}
      {tripType === 'multicity' ? (
        <div className="space-y-4 mb-4">
          {multiCityLegs.map((leg, index) => (
            <div key={leg.id} className="p-4 bg-surface-alt rounded-lg relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-text-secondary">Flight {index + 1}</span>
                {multiCityLegs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeMultiCityLeg(leg.id)}
                    className="p-1 text-text-muted hover:text-danger transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary z-10" />
                  <input
                    type="date"
                    value={leg.date}
                    onChange={(e) => updateMultiCityLeg(leg.id, 'date', e.target.value)}
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Flight Button */}
          {multiCityLegs.length < 5 && (
            <button
              type="button"
              onClick={addMultiCityLeg}
              className="w-full py-3 border-2 border-dashed border-primary/30 rounded-lg text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add another flight
            </button>
          )}
        </div>
      ) : (
        <>
          {/* From / To - Regular (One-way/Round trip) */}
          <div className="space-y-4 mb-4">
            <div className="relative">
              <CityAutocomplete
                value={from}
                onChange={(value) => setFrom(value)}
                placeholder="Choose departure city"
                label="From"
              />
              <button
                type="button"
                onClick={handleSwapCities}
                className="absolute right-3 top-[38px] p-1.5 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors z-10"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            <div>
              <CityAutocomplete
                value={to}
                onChange={(value) => setTo(value)}
                placeholder="Choose arrival city"
                label="To"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Departure Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {tripType === 'roundtrip' && (
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Return Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Passengers */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Adult (12+)</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAdults(Math.max(1, adults - 1))}
              className="stepper-btn"
              disabled={adults <= 1}
            >
              -
            </button>
            <span className="w-8 text-center font-semibold text-lg text-text-primary">{adults}</span>
            <button
              type="button"
              onClick={() => setAdults(Math.min(9, adults + 1))}
              className="stepper-btn"
              disabled={adults >= 9}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Child (2-12)</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setChildren(Math.max(0, children - 1))}
              className="stepper-btn"
              disabled={children <= 0}
            >
              -
            </button>
            <span className="w-8 text-center font-semibold text-lg text-text-primary">{children}</span>
            <button
              type="button"
              onClick={() => setChildren(Math.min(6, children + 1))}
              className="stepper-btn"
              disabled={children >= 6}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Cabin & Direct */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Cabin</label>
          <div className="relative">
            <select
              value={cabin}
              onChange={(e) => setCabin(e.target.value)}
              className="input-field appearance-none pr-10"
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Stops</label>
          <div className="relative">
            <select
              value={directOnly ? 'direct' : 'all'}
              onChange={(e) => setDirectOnly(e.target.value === 'direct')}
              className="input-field appearance-none pr-10"
            >
              <option value="all">All Flights</option>
              <option value="direct">Direct Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Search Button */}
      <button
        type="submit"
        className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"
      >
        <Search className="w-5 h-5" />
        Flight Search
      </button>
    </form>
  );
};

export default SearchForm;
