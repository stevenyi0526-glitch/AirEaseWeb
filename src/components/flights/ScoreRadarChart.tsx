import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Clock, Zap, Sofa, HeartHandshake, Gem, DollarSign, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ScoreDimensions, ServiceHighlights } from '../../api/types';

// Cabin class selector type
type CabinClassView = 'overall' | 'economy' | 'business';

interface ScoreRadarChartProps {
  dimensions: ScoreDimensions;
  economyDimensions?: ScoreDimensions;
  businessDimensions?: ScoreDimensions;
  serviceHighlights?: ServiceHighlights;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showExplanations?: boolean;
  showCabinToggle?: boolean;
  color?: string;
  flightData?: {
    price?: number;
    durationMinutes?: number;
    shortestDuration?: number;  // NEW: Shortest flight duration for this route (baseline for scoring)
    stops?: number;
    hasWifi?: boolean;
    hasPower?: boolean;
    hasIFE?: boolean;
    mealIncluded?: boolean;
  };
}

// Score calculation reference for each dimension - shows how points are calculated
const DIMENSION_CALC_REFERENCE: Record<string, string[]> = {
  'Reliability': [
    '• On-time rate ≥90%: High score (8-10)',
    '• On-time rate 75-90%: Good score (6-8)',
    '• On-time rate <75%: Fair score (3-6)',
    '• Based on airline historical OTP data',
  ],
  'Comfort': [
    '• Seat pitch ≥34": +2.5 pts (Extra legroom)',
    '• Seat pitch 32-34": +1.5 pts (Standard+)',
    '• Seat pitch <32": +0.5 pts (Compact)',
    '• Seat width ≥18": +1.5 pts',
    '• Recline ≥5": +1.0 pts',
    '• Newer aircraft (<10 yrs): +1.0 pts',
  ],
  'Service': [
    '• Service rating ≥4.5/5: +3.0 pts',
    '• Service rating 3.5-4.5: +2.0 pts',
    '• Food quality ≥4.0/5: +2.0 pts',
    '• Crew friendliness ≥4.0: +1.5 pts',
    '• Lounge access (business): +1.0 pts',
  ],
  'Value': [
    '• Price ≥20% below avg: High (8-10)',
    '• Price ±10% of avg: Good (6-8)',
    '• Price 10-30% above avg: Fair (4-6)',
    '• Price >30% above avg: Low (2-4)',
    '• Includes quality vs price ratio',
  ],
  'Amenities': [
    '• WiFi available: +2.5 pts',
    '• Power outlets: +2.5 pts',
    '• In-flight entertainment: +2.5 pts',
    '• Meals included: +2.5 pts',
    '• Max score: 10 (all amenities)',
  ],
  'Efficiency': [
    '• Duration score: shortest flight = 10',
    '• -1 point per 30 min over shortest',
    '• Direct (0 stops): × 1.0 multiplier',
    '• 1 stop: × 0.8 multiplier',
    '• 2+ stops: × 0.6 multiplier',
    '• Final = duration × stop multiplier',
  ],
};

// Score explanations for each dimension
const DIMENSION_EXPLANATIONS: Record<string, { description: string; getExplanation: (score: number) => string }> = {
  'Reliability': {
    description: 'Airline on-time performance rate',
    getExplanation: (score) => score >= 8 ? 'Excellent on-time rate (90%+)' : score >= 6 ? 'Good punctuality (75-90%)' : 'May experience delays (<75%)'
  },
  'Comfort': {
    description: 'Seat space, cabin quality & amenities',
    getExplanation: (score) => score >= 8 ? 'Spacious seating with premium cabin' : score >= 5 ? 'Comfortable seating arrangement' : 'Standard seating with limited space'
  },
  'Service': {
    description: 'Crew hospitality & onboard experience',
    getExplanation: (score) => score >= 8 ? 'Award-winning cabin service' : score >= 5 ? 'Attentive crew service' : 'Basic service level'
  },
  'Value': {
    description: 'Price vs quality ratio',
    getExplanation: (score) => score >= 8 ? 'Great deal (≥20% below avg)' : score >= 6 ? 'Fair price (±10% of avg)' : score >= 4 ? 'Above average price' : 'Premium pricing (>30% above avg)'
  },
  'Amenities': {
    description: 'WiFi, power, entertainment & meals',
    getExplanation: (score) => score >= 8 ? 'Full amenities (WiFi+Power+IFE+Meal)' : score >= 5 ? 'Partial amenities included' : 'Limited onboard amenities'
  },
  'Efficiency': {
    description: 'Flight duration relative to fastest option',
    getExplanation: (score) => score >= 9 ? 'Fastest/near-fastest direct flight' : score >= 7 ? 'Quick flight with minimal stops' : score >= 5 ? 'Moderate journey time' : 'Long journey with stops'
  },
};

// Icon and color mapping for each dimension
const DIMENSION_STYLES: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  'Reliability': { icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
  'Comfort': { icon: Sofa, color: 'text-blue-600', bg: 'bg-blue-50' },
  'Service': { icon: HeartHandshake, color: 'text-purple-600', bg: 'bg-purple-50' },
  'Value': { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'Amenities': { icon: Gem, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  'Efficiency': { icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' },
};

const ScoreRadarChart: React.FC<ScoreRadarChartProps> = ({
  dimensions,
  economyDimensions,
  businessDimensions,
  serviceHighlights,
  size = 'md',
  showExplanations = false,
  showCabinToggle = false,
  flightData,
}) => {
  // State for cabin class selection
  const [cabinView, setCabinView] = useState<CabinClassView>('overall');
  // State for expanded calculation reference cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (subject: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  };

  // Get the active dimensions based on cabin class selection
  const getActiveDimensions = (): ScoreDimensions => {
    switch (cabinView) {
      case 'economy':
        return economyDimensions || dimensions;
      case 'business':
        return businessDimensions || dimensions;
      default:
        return dimensions;
    }
  };

  const activeDimensions = getActiveDimensions();

  // Calculate amenities score based on available amenities
  // Must match backend ScoringService.calculate_amenities_score logic
  const calculateAmenitiesScore = () => {
    if (!flightData) return activeDimensions.comfort;
    
    // Check if any amenity data is available
    const hasAmenityData = flightData.hasWifi !== undefined || 
                           flightData.hasPower !== undefined || 
                           flightData.hasIFE !== undefined || 
                           flightData.mealIncluded !== undefined;
    
    if (!hasAmenityData) return activeDimensions.comfort;
    
    // Calculate raw score from available amenities
    let score = 0;
    if (flightData.hasWifi) score += 2.5;
    if (flightData.hasPower) score += 2.5;
    if (flightData.hasIFE) score += 2.5;
    if (flightData.mealIncluded) score += 2.5;
    
    // Apply baseline minimum (matching backend BASELINE_SCORE = 6.5)
    // But for display, show actual score to be transparent
    return score;
  };

  // Calculate efficiency score based on duration and stops
  // NEW ALGORITHM:
  // 1. Duration is the PRIMARY factor - shorter = better
  // 2. If shortestDuration is provided, score is relative to that baseline
  // 3. Stops act as a MULTIPLIER (0 stop = 1.0, 1 stop = 0.8, 2+ stops = 0.6)
  // 4. Final efficiency = duration_score * stop_multiplier
  const calculateEfficiencyScore = () => {
    if (!flightData) return activeDimensions.value;
    
    const stops = flightData.stops ?? 0;
    const durationMinutes = flightData.durationMinutes;
    const shortestDuration = flightData.shortestDuration;
    
    // Step 1: Calculate duration score (primary factor)
    let durationScore: number;
    if (durationMinutes && shortestDuration && shortestDuration > 0) {
      // Relative scoring: shortest flight = 10, deduct based on difference
      // Every 30 minutes over shortest = -1 point
      const extraMinutes = durationMinutes - shortestDuration;
      if (extraMinutes <= 0) {
        durationScore = 10.0;
      } else {
        const penalty = extraMinutes / 30.0;
        durationScore = Math.max(1.0, 10.0 - penalty);
      }
    } else if (durationMinutes) {
      // No baseline provided - use absolute scale
      const hours = durationMinutes / 60.0;
      if (hours <= 2) durationScore = 10.0;
      else if (hours <= 4) durationScore = 9.0;
      else if (hours <= 6) durationScore = 8.0;
      else if (hours <= 10) durationScore = 6.0;
      else if (hours <= 15) durationScore = 4.0;
      else if (hours <= 24) durationScore = 2.5;
      else durationScore = 1.5;  // Very long flights (>24h)
    } else {
      durationScore = 7.0;  // No duration data - neutral score
    }
    
    // Step 2: Apply stop multiplier (secondary factor)
    let stopMultiplier: number;
    if (stops === 0) stopMultiplier = 1.0;     // Direct flight - full score
    else if (stops === 1) stopMultiplier = 0.8; // 1 stop - 20% reduction
    else stopMultiplier = 0.6;                  // 2+ stops - 40% reduction
    
    // Step 3: Calculate final efficiency
    return Math.max(1.0, Math.min(10.0, durationScore * stopMultiplier));
  };

  // Get service explanation based on serviceHighlights
  const getServiceExplanation = (score: number): string => {
    if (serviceHighlights) {
      const cabinHighlights = cabinView === 'business' 
        ? serviceHighlights.businessHighlights 
        : cabinView === 'economy'
        ? serviceHighlights.economyHighlights
        : serviceHighlights.highlights;
      
      if (cabinHighlights && cabinHighlights.length > 0) {
        return cabinHighlights.slice(0, 2).join('. ');
      }
    }
    // Fallback to generic explanation
    if (score >= 8) return 'Award-winning cabin service';
    if (score >= 5) return 'Attentive crew service';
    return 'Basic service level';
  };

  // Dynamic explanations that use serviceHighlights when available
  const getDimensionExplanation = (subject: string, score: number): string => {
    if (subject === 'Service') {
      return getServiceExplanation(score);
    }
    return DIMENSION_EXPLANATIONS[subject]?.getExplanation(score) || '';
  };

  // Keep scores in 0-10 scale for display
  const data = [
    { subject: 'Reliability', A: activeDimensions.reliability, rawValue: activeDimensions.reliability, fullMark: 10 },
    { subject: 'Comfort', A: activeDimensions.comfort, rawValue: activeDimensions.comfort, fullMark: 10 },
    { subject: 'Service', A: activeDimensions.service, rawValue: activeDimensions.service, fullMark: 10 },
    { subject: 'Value', A: activeDimensions.value, rawValue: activeDimensions.value, fullMark: 10 },
    { subject: 'Amenities', A: calculateAmenitiesScore(), rawValue: calculateAmenitiesScore(), fullMark: 10 },
    { subject: 'Efficiency', A: calculateEfficiencyScore(), rawValue: calculateEfficiencyScore(), fullMark: 10 },
  ];

  // Generate dynamic calculation reference for Amenities based on actual flight data
  const getDynamicCalcReference = (subject: string): string[] => {
    if (subject === 'Amenities' && flightData) {
      const lines: string[] = [];
      if (flightData.hasWifi) lines.push('• WiFi available: +2.5 pts');
      if (flightData.hasPower) lines.push('• Power outlets: +2.5 pts');
      if (flightData.hasIFE) lines.push('• In-flight entertainment: +2.5 pts');
      if (flightData.mealIncluded) lines.push('• Meals included: +2.5 pts');
      
      if (lines.length === 0) {
        lines.push('• No amenities data available');
      }
      
      const totalScore = calculateAmenitiesScore();
      lines.push(`• Total: ${totalScore.toFixed(1)} pts`);
      return lines;
    }
    return DIMENSION_CALC_REFERENCE[subject] || [];
  };

  // Size configurations
  const sizes = {
    sm: { containerSize: 500, radius: 180, chartSize: 280 },
    md: { containerSize: 700, radius: 250, chartSize: 400 },
    lg: { containerSize: 800, radius: 280, chartSize: 500 },
  };

  const { containerSize, radius, chartSize } = sizes[size];

  // Angles for positioning cards around the chart
  // -90 degrees is at the top (12 o'clock position)
  const angles = [
    -90,  // Reliability (Top)
    -30,  // Comfort (Top Right)
    30,   // Service (Bottom Right)
    90,   // Value (Bottom)
    150,  // Amenities (Bottom Left)
    210   // Efficiency (Top Left)
  ];

  const CENTER = containerSize / 2;

  // Calculate pixel position for each card
  const getPixelPosition = (index: number) => {
    const angleInDegrees = angles[index];
    const angleInRadians = (angleInDegrees * Math.PI) / 180;
    const x = CENTER + Math.cos(angleInRadians) * radius;
    const y = CENTER + Math.sin(angleInRadians) * radius;
    return { left: x, top: y };
  };

  if (!showExplanations) {
    // Simple radar chart without cards
    return (
      <div style={{ width: chartSize, height: chartSize }} className="mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid gridType="polygon" stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={false}
            />
            <Radar
              name="Airline"
              dataKey="A"
              stroke="#10b981"
              strokeWidth={2}
              fill="#34d399"
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Full layout with radar chart and surrounding cards
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Cabin class toggle buttons */}
      {showCabinToggle && (economyDimensions || businessDimensions) && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCabinView('overall')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              cabinView === 'overall'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Overall
          </button>
          {economyDimensions && (
            <button
              onClick={() => setCabinView('economy')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                cabinView === 'economy'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Economy Class
            </button>
          )}
          {businessDimensions && (
            <button
              onClick={() => setCabinView('business')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                cabinView === 'business'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Business Class
            </button>
          )}
        </div>
      )}

      {/* Core layout container with fixed size for accurate positioning */}
      <div 
        className="relative mx-auto" 
        style={{ width: containerSize, height: containerSize }}
      >
        
        {/* Center radar chart */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div style={{ width: chartSize, height: chartSize }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid gridType="polygon" stroke="#e5e7eb" />
                {/* Hide default labels since we use custom cards */}
                <PolarAngleAxis dataKey="subject" tick={false} />
                <Radar
                  name="Airline"
                  dataKey="A"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="#34d399"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Surrounding description cards */}
        {data.map((item, index) => {
          const pos = getPixelPosition(index);
          const style = DIMENSION_STYLES[item.subject];
          const Icon = style.icon;
          const isExpanded = expandedCards.has(item.subject);
          const calcRef = getDynamicCalcReference(item.subject);

          return (
            <div
              key={item.subject}
              className="absolute flex flex-col p-4 rounded-xl shadow-lg border border-gray-100 transition-all hover:shadow-xl bg-white z-10"
              style={{
                left: pos.left,
                top: pos.top,
                // Position the card center at the calculated coordinate
                transform: 'translate(-50%, -50%)',
                width: isExpanded ? '280px' : '224px',
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${style.bg}`}>
                    <Icon size={18} className={style.color} />
                  </div>
                  <span className="font-bold text-gray-700">{item.subject}</span>
                </div>
                <span className={`text-lg font-bold ${style.color}`}>
                  {item.A.toFixed(1)}<span className="text-gray-400 text-sm">/10</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed mb-2">
                {getDimensionExplanation(item.subject, item.rawValue)}
              </p>
              
              {/* How it's calculated button */}
              <button
                onClick={() => toggleCardExpansion(item.subject)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
              >
                <Info size={12} />
                {isExpanded ? 'Hide calculation' : 'How it\'s calculated'}
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              
              {/* Expandable calculation reference */}
              {isExpanded && calcRef && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Scoring Formula:</p>
                  <ul className="space-y-1">
                    {calcRef.map((line, i) => (
                      <li key={i} className="text-xs text-gray-500 leading-relaxed">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreRadarChart;
