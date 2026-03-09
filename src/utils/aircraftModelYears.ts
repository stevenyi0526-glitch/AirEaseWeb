/**
 * Aircraft model introduction years.
 * Used to calculate model age and sort by "Latest Model".
 */
export const AIRCRAFT_MODEL_YEARS: Record<string, number> = {
  // Boeing
  'A220': 2016, 'CS100': 2016, 'CS300': 2016,
  '787': 2011, '787-8': 2011, '787-9': 2014, '787-10': 2018,
  '737 MAX': 2017, '737MAX': 2017, '737-MAX-8': 2017, '737-MAX-9': 2024,
  '777X': 2025, '777-9': 2025,
  '777': 1995, '777-200': 1995, '777-300': 1998, '777-200ER': 1997, '777-300ER': 2004,
  '747-8': 2012, '747': 1970,
  '767': 1982, '767-300': 1988, '767-400': 2000,
  '757': 1983,
  '737-800': 1998, '737-900': 2001, '737-700': 1997, '737': 1968,
  // Airbus
  'A350': 2015, 'A350-900': 2015, 'A350-1000': 2018,
  'A321neo': 2017, 'A320neo': 2016, 'A319neo': 2017,
  'A321LR': 2018, 'A321XLR': 2024,
  'A380': 2007,
  'A330neo': 2018, 'A330-900': 2018, 'A330-800': 2020,
  'A330': 1994, 'A330-200': 1998, 'A330-300': 1994,
  'A340': 1993,
  'A321': 1994, 'A320': 1988, 'A319': 1996,
  // Embraer
  'E195-E2': 2019, 'E190-E2': 2018, 'E175-E2': 2021,
  'E190': 2005, 'E175': 2005, 'E170': 2004,
  // Bombardier / Others
  'CRJ-900': 2003, 'CRJ-700': 2001, 'CRJ': 1992,
  'ATR 72': 1989, 'ATR 42': 1985,
  'Q400': 2000, 'DASH 8': 1984,
};

/**
 * Get the introduction year of an aircraft model.
 * Returns 0 if the model is unknown.
 */
export function getAircraftModelYear(model?: string): number {
  if (!model) return 0;
  const upper = model.toUpperCase();
  for (const [key, year] of Object.entries(AIRCRAFT_MODEL_YEARS)) {
    if (upper.includes(key.toUpperCase())) return year;
  }
  return 0;
}

/**
 * Get the age of an aircraft model in years.
 * Returns null if the model is unknown.
 */
export function getAircraftModelAge(model?: string): number | null {
  const year = getAircraftModelYear(model);
  if (year === 0) return null;
  return new Date().getFullYear() - year;
}
