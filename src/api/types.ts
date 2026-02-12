// API Types matching backend Pydantic models

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departureCity: string;
  departureCityCode: string;
  departureAirport: string;
  departureAirportCode: string;
  departureTime: string;
  arrivalCity: string;
  arrivalCityCode: string;
  arrivalAirport: string;
  arrivalAirportCode: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  stopCities?: string[];
  cabin: string;
  aircraftModel?: string;
  price: number;
  currency: string;
  seatsRemaining?: number;
  
  // === NEW FIELDS FROM SERPAPI ===
  // Booking and purchase link
  bookingToken?: string;
  
  // Departure token for round trip - used to fetch return flights
  departureToken?: string;
  
  // Airline branding
  airlineLogo?: string;
  
  // Carbon emissions data
  carbonEmissions?: CarbonEmissions;
  
  // Additional flight details from SerpAPI
  flightExtensions?: string[];  // Array of amenities like ["Wi-Fi for a fee", "Average legroom (31 in)"]
  ticketAlsoSoldBy?: string[];  // Partner airlines
  oftenDelayed?: boolean;       // Often delayed by 30+ min
  isOvernight?: boolean;        // Overnight flight indicator
  
  // Layover details
  layoverDetails?: LayoverDetail[];
}

// Carbon emissions information from SerpAPI
export interface CarbonEmissions {
  thisFlightGrams?: number;         // Emissions in grams
  typicalForRouteGrams?: number;    // Typical emissions for this route
  differencePercent?: number;       // Difference from typical (negative = better)
}

// Layover detail from SerpAPI
export interface LayoverDetail {
  durationMinutes: number;
  airportName: string;
  airportCode: string;
  isOvernight?: boolean;
}

export interface ScoreDimensions {
  safety?: number;      // NTSB safety records (10 = clean)
  reliability: number;  // On-time performance score (from airline OTP data)
  comfort: number;
  service: number;
  value: number;
  amenities?: number;   // WiFi, power, IFE, meals
  efficiency?: number;  // Direct flight bonus, duration
}

export interface ScoreExplanation {
  dimension: string;
  title: string;
  detail: string;
  isPositive: boolean;
  cabinClass?: string;  // "economy", "business", or undefined for both
}

// User review summary for display
export interface UserReviewSummary {
  title: string;
  review: string;
  foodRating: number;
  groundServiceRating: number;
  seatComfortRating: number;
  serviceRating: number;
  recommended: boolean;
  travelType: string;
  route: string;
  aircraft?: string;
  cabinType?: string;
  // Computed ratings object for easier access
  ratings: {
    food: number;
    groundService: number;
    seatComfort: number;
    service: number;
    overall?: number;
  };
}

// Service dimension highlights
export interface ServiceHighlights {
  highlights: string[];
  economyHighlights?: string[];
  businessHighlights?: string[];
  foodRating?: number;
  groundServiceRating?: number;
  seatComfortRating?: number;
  serviceRating?: number;
  recommendationRate?: number;
  reviewCount: number;
}

export interface FlightScore {
  overallScore: number;
  dimensions: ScoreDimensions;
  // NEW: Separate scores by cabin class
  economyDimensions?: ScoreDimensions;
  businessDimensions?: ScoreDimensions;
  highlights: string[];
  explanations: ScoreExplanation[];
  // NEW: Service highlights with ratings breakdown
  serviceHighlights?: ServiceHighlights;
  // NEW: User reviews
  userReviews?: UserReviewSummary[];
  personaWeightsApplied: string;
}

export interface FlightFacilities {
  hasWifi?: boolean;
  hasPower?: boolean;
  seatPitchInches?: number;
  seatPitchCategory?: string;  // "Above average", "Average", "Below average"
  hasIFE?: boolean;
  ifeType?: string;            // "On-demand video", "Live TV", "Stream to device"
  mealIncluded?: boolean;
  mealType?: string;
  
  // === NEW FIELDS FROM SERPAPI ===
  legroom?: string;            // Raw legroom string like "31 in"
  wifiFree?: boolean;          // True if WiFi is free
  hasUSB?: boolean;            // USB outlet available
  rawExtensions?: string[];    // Raw extensions array from SerpAPI
}

export interface FlightWithScore {
  flight: Flight;
  score: FlightScore;
  facilities: FlightFacilities;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface PriceHistory {
  flightId: string;
  points: PricePoint[];
  currentPrice: number;
  trend: 'rising' | 'falling' | 'stable';
  
  // === NEW FIELDS FROM SERPAPI PRICE INSIGHTS ===
  priceLevel?: 'low' | 'typical' | 'high';     // Current price level
  typicalPriceRange?: [number, number];        // [low, high] typical price range
  lowestPrice?: number;                        // Lowest price found
}

export interface SearchMeta {
  total: number;
  searchId: string;
  cachedAt?: string;
  restrictedCount: number;
  isAuthenticated: boolean;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PriceInsights {
  lowestPrice?: number;
  priceLevel?: 'low' | 'typical' | 'high';
  typicalPriceRange?: [number, number];
  priceHistory?: [number, number][]; // [timestamp, price] pairs
}

export interface FlightSearchResponse {
  flights: FlightWithScore[];
  meta: SearchMeta;
  priceInsights?: PriceInsights;
}

export interface RoundTripSearchResponse {
  departureFlights: FlightWithScore[];
  returnFlights: FlightWithScore[];
  meta: SearchMeta;
  departurePriceInsights?: PriceInsights;
  returnPriceInsights?: PriceInsights;
}

export interface FlightDetail {
  flight: Flight;
  score: FlightScore;
  facilities: FlightFacilities;
  priceHistory: PriceHistory;
}

// Auth types
export type UserLabel = 'business' | 'family' | 'student';

export interface User {
  id: number;
  email: string;
  username: string;
  createdAt: string;
  isActive: boolean;
  isAdmin: boolean;
  label: UserLabel;
  familyId: string;
}

export interface AuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  label: UserLabel;
}

export interface VerificationResponse {
  message: string;
  email: string;
  expiresInMinutes: number;
}

export interface UpdateUserData {
  username?: string;
  label?: UserLabel;
  firstName?: string;
  lastName?: string;
}

// Search params
export interface SearchParams {
  from: string;
  to: string;
  date: string;
  cabin?: string;
  
  // === NEW SERPAPI SEARCH PARAMETERS ===
  returnDate?: string;         // For round-trip flights
  adults?: number;             // Number of adult passengers (1-9)
  children?: number;           // Number of children
  infantsInSeat?: number;      // Infants in seat
  infantsOnLap?: number;       // Infants on lap
  currency?: string;           // Currency code (USD, CNY, EUR, etc.)
  stops?: number;              // 0=any, 1=nonstop, 2=1 stop or fewer, 3=2 stops or fewer
  includeAirlines?: string;    // Comma-separated airline codes to include
  excludeAirlines?: string;    // Comma-separated airline codes to exclude
  maxPrice?: number;           // Maximum ticket price
  maxDuration?: number;        // Maximum flight duration in minutes
  sortBy?: string;             // Sort by: score/price/duration/departure/arrival
  
  // === TRAVELER TYPE FOR PERSONALIZED SCORING ===
  travelerType?: 'student' | 'business' | 'family' | 'default';  // Affects score weights
}

// === PLACEHOLDERS FOR USER REVIEWS (Connect to SQL Database) ===
// TODO: Connect these interfaces to your SQL database with flight models and user reviews

export interface UserReview {
  id: number;
  flightId: string;
  userId: number;
  rating: number;              // 1-5 stars
  title?: string;
  comment?: string;
  travelDate?: string;
  cabinClass?: string;
  verified?: boolean;          // Verified traveler
  helpful?: number;            // Number of "helpful" votes
  createdAt: string;
  
  // Review dimensions
  seatComfort?: number;        // 1-5
  crewService?: number;        // 1-5
  entertainment?: number;      // 1-5
  foodBeverage?: number;       // 1-5
  valueForMoney?: number;      // 1-5
}

export interface UserExperienceRating {
  flightId: string;
  averageRating: number;       // Overall average rating
  totalReviews: number;
  ratingDistribution: {        // Count of each rating
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  dimensionAverages: {
    seatComfort: number;
    crewService: number;
    entertainment: number;
    foodBeverage: number;
    valueForMoney: number;
  };
  recentReviews: UserReview[]; // Last 5 reviews
}

// Extended FlightWithScore to include user review placeholders
export interface FlightWithScoreExtended extends FlightWithScore {
  // Placeholder fields - connect to SQL database
  userReviewsPlaceholder?: string;     // "Connect to SQL database for user reviews"
  userRatingPlaceholder?: number;      // Average user rating (null until connected)
  userExperience?: UserExperienceRating;
}

// City search
export interface CitySearchResult {
  placeId: string;
  city: string;
  country: string;
  airportCode?: string;
  displayName: string;
}

// Favorites
export interface Favorite {
  id: number;
  flightId: string;
  flightNumber: string;
  airline: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  price: number;
  score: number;
  createdAt: string;
}

export interface CreateFavorite {
  flightId: string;
  flightNumber: string;
  airline: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  price: number;
  score: number;
}

// Travelers
export interface Traveler {
  id: number;
  familyId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  passportNumber?: string;
  dob?: string;
  nationality?: string;
  gender?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface CreateTraveler {
  firstName: string;
  middleName?: string;
  lastName: string;
  passportNumber?: string;
  dob?: string;
  nationality?: string;
  gender?: string;
}

export interface UpdateTraveler {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  passportNumber?: string;
  dob?: string;
  nationality?: string;
  gender?: string;
}
