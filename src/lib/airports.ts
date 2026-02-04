export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
}

// Major international airports
export const AIRPORTS: Airport[] = [
  // Asia Pacific
  { code: 'HKG', city: 'Hong Kong', name: 'Hong Kong International Airport', country: 'Hong Kong' },
  { code: 'SIN', city: 'Singapore', name: 'Singapore Changi Airport', country: 'Singapore' },
  { code: 'NRT', city: 'Tokyo', name: 'Narita International Airport', country: 'Japan' },
  { code: 'HND', city: 'Tokyo', name: 'Haneda Airport', country: 'Japan' },
  { code: 'ICN', city: 'Seoul', name: 'Incheon International Airport', country: 'South Korea' },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport', country: 'Thailand' },
  { code: 'SYD', city: 'Sydney', name: 'Sydney Kingsford Smith Airport', country: 'Australia' },
  { code: 'MEL', city: 'Melbourne', name: 'Melbourne Airport', country: 'Australia' },
  { code: 'PEK', city: 'Beijing', name: 'Beijing Capital International Airport', country: 'China' },
  { code: 'PVG', city: 'Shanghai', name: 'Shanghai Pudong International Airport', country: 'China' },
  { code: 'TPE', city: 'Taipei', name: 'Taiwan Taoyuan International Airport', country: 'Taiwan' },
  { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur International Airport', country: 'Malaysia' },
  { code: 'MNL', city: 'Manila', name: 'Ninoy Aquino International Airport', country: 'Philippines' },
  { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International Airport', country: 'India' },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport', country: 'India' },

  // Europe
  { code: 'LHR', city: 'London', name: 'London Heathrow Airport', country: 'United Kingdom' },
  { code: 'LGW', city: 'London', name: 'London Gatwick Airport', country: 'United Kingdom' },
  { code: 'CDG', city: 'Paris', name: 'Paris Charles de Gaulle Airport', country: 'France' },
  { code: 'FRA', city: 'Frankfurt', name: 'Frankfurt Airport', country: 'Germany' },
  { code: 'MUC', city: 'Munich', name: 'Munich Airport', country: 'Germany' },
  { code: 'AMS', city: 'Amsterdam', name: 'Amsterdam Schiphol Airport', country: 'Netherlands' },
  { code: 'MAD', city: 'Madrid', name: 'Madrid-Barajas Airport', country: 'Spain' },
  { code: 'BCN', city: 'Barcelona', name: 'Barcelona El Prat Airport', country: 'Spain' },
  { code: 'FCO', city: 'Rome', name: 'Leonardo da Vinci–Fiumicino Airport', country: 'Italy' },
  { code: 'ZRH', city: 'Zurich', name: 'Zurich Airport', country: 'Switzerland' },
  { code: 'VIE', city: 'Vienna', name: 'Vienna International Airport', country: 'Austria' },
  { code: 'IST', city: 'Istanbul', name: 'Istanbul Airport', country: 'Turkey' },

  // Middle East
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'United Arab Emirates' },
  { code: 'AUH', city: 'Abu Dhabi', name: 'Abu Dhabi International Airport', country: 'United Arab Emirates' },
  { code: 'DOH', city: 'Doha', name: 'Hamad International Airport', country: 'Qatar' },

  // North America
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'United States' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International Airport', country: 'United States' },
  { code: 'SFO', city: 'San Francisco', name: 'San Francisco International Airport', country: 'United States' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International Airport", country: 'United States' },
  { code: 'MIA', city: 'Miami', name: 'Miami International Airport', country: 'United States' },
  { code: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth International Airport', country: 'United States' },
  { code: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma International Airport', country: 'United States' },
  { code: 'BOS', city: 'Boston', name: 'Boston Logan International Airport', country: 'United States' },
  { code: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson Atlanta International Airport', country: 'United States' },
  { code: 'DEN', city: 'Denver', name: 'Denver International Airport', country: 'United States' },
  { code: 'YYZ', city: 'Toronto', name: 'Toronto Pearson International Airport', country: 'Canada' },
  { code: 'YVR', city: 'Vancouver', name: 'Vancouver International Airport', country: 'Canada' },
];

// Search airports by query (code, city, or name)
export function searchAirports(query: string, limit: number = 10): Airport[] {
  if (!query || query.length < 2) {
    return AIRPORTS.slice(0, limit);
  }

  const q = query.toLowerCase();

  // Exact code match first
  const exactMatch = AIRPORTS.filter(a => a.code.toLowerCase() === q);
  if (exactMatch.length > 0) {
    return exactMatch;
  }

  // Then search by code, city, name
  return AIRPORTS.filter(airport =>
    airport.code.toLowerCase().includes(q) ||
    airport.city.toLowerCase().includes(q) ||
    airport.name.toLowerCase().includes(q) ||
    airport.country.toLowerCase().includes(q)
  ).slice(0, limit);
}

// Get airport by code
export function getAirportByCode(code: string): Airport | undefined {
  return AIRPORTS.find(a => a.code.toUpperCase() === code.toUpperCase());
}

// Popular routes for suggestions
export const POPULAR_ROUTES = [
  { from: 'HKG', to: 'LHR' },
  { from: 'HKG', to: 'NRT' },
  { from: 'SIN', to: 'LHR' },
  { from: 'JFK', to: 'LAX' },
  { from: 'LAX', to: 'NRT' },
  { from: 'LHR', to: 'JFK' },
  { from: 'DXB', to: 'LHR' },
  { from: 'SYD', to: 'LAX' },
];
