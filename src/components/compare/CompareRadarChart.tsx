import React from 'react';
import { useTranslation } from 'react-i18next';
import { translateAirline } from '../../utils/translate';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Info } from 'lucide-react';
import type { FlightWithScore } from '../../api/types';
import { formatPrice, formatDuration } from '../../utils/formatters';

interface CompareRadarChartProps {
  flights: FlightWithScore[];
}

// Color palette for different flights
const COLORS = [
  '#034891', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
];

// Score explanations for each dimension with calculation formula
const DIMENSION_EXPLANATIONS: Record<string, { description: string; goodScore: string; badScore: string; formula: string[] }> = {
  'Overall': {
    description: 'Weighted average of all score dimensions based on your travel profile',
    goodScore: 'Excellent flight choice with balanced performance across all factors',
    badScore: 'This flight may have trade-offs in some areas',
    formula: ['Score ≥8.5: Excellent', 'Score 7-8.4: Good', 'Score <7: Fair'],
  },
  'Safety': {
    description: 'Based on NTSB accident & incident records for aircraft, airline, and model',
    goodScore: 'Clean safety record with no notable incidents',
    badScore: 'Some safety events recorded in NTSB database',
    formula: ['Starts at 10 (perfect)', 'Airline events: -0.3 each', 'Model events: -0.15 each', 'Plane events: -1.0 each'],
  },
  'Reliability': {
    description: 'Based on airline on-time performance rate (OTP) from historical data',
    goodScore: 'Airline has excellent on-time performance (90%+)',
    badScore: 'This airline may experience delays more frequently',
    formula: ['OTP ≥90%: Excellent (8-10)', 'OTP 75-90%: Good (5-8)', 'OTP <75%: Fair (0-5)'],
  },
  'Comfort': {
    description: 'Seat pitch, width, recline, cabin noise, and overall passenger experience',
    goodScore: 'Spacious seating with generous legroom and modern cabin',
    badScore: 'Limited seat space or older cabin interiors',
    formula: ['Pitch ≥34": +2.5pts', 'Width ≥18": +1.5pts', 'Recline ≥5": +1pt', 'New aircraft: +1pt'],
  },
  'Service': {
    description: 'Crew hospitality, meal quality, entertainment, and onboard amenities',
    goodScore: 'Award-winning service with premium amenities',
    badScore: 'Basic service level with limited amenities',
    formula: ['Rating ≥4.5/5: +3pts', 'Food ≥4/5: +2pts', 'Crew ≥4/5: +1.5pts'],
  },
  'Value': {
    description: 'Price relative to service quality, route, and included amenities',
    goodScore: 'Excellent value for money with good inclusions',
    badScore: 'May be overpriced for the service level',
    formula: ['≥20% below avg: Excellent', '±10% of avg: Good', '>30% above avg: Fair'],
  },
  'Price': {
    description: 'Ticket price compared to other flights on this route (normalized)',
    goodScore: 'Among the lowest prices available',
    badScore: 'Higher priced compared to alternatives',
    formula: ['Lowest 33%: Budget', 'Middle 33%: Moderate', 'Top 33%: Premium'],
  },
  'Duration': {
    description: 'Total flight time relative to fastest option on this route',
    goodScore: 'Fastest or near-fastest flight option',
    badScore: 'Significantly longer than fastest option',
    formula: ['Shortest = 10pts', '-1 pt per 30 min over shortest', 'Max 10pts'],
  },
  'Stops': {
    description: 'Number of connections - multiplies duration score',
    goodScore: 'Direct flight with no connections',
    badScore: 'Multiple stops add travel time and hassle',
    formula: ['0 stops: × 1.0 (direct)', '1 stop: × 0.8 (-20%)', '2+ stops: × 0.6 (-40%)'],
  },
};

/**
 * 3-Stage Classification System for Radar Chart
 * Each dimension is classified into 3 tiers: Excellent (100), Good (60), Fair (30)
 */

// Stage labels are now in i18n translations (radarChart.stage.*)

/**
 * Radar Chart for comparing flight scores across multiple dimensions
 * Uses 0-10 scale consistent with ScoreRadarChart
 * Dimensions classified for labels: Excellent (8-10), Good (5-7.9), Fair (0-4.9)
 */
const CompareRadarChart: React.FC<CompareRadarChartProps> = ({ flights }) => {
  const { t } = useTranslation();

  // Get stage label based on 0-10 score for tooltip display
  const getStageLabel = (dimensionKey: string, score: number): string => {
    if (score >= 8) return t(`radarChart.stage.${dimensionKey}_excellent`);
    if (score >= 5) return t(`radarChart.stage.${dimensionKey}_good`);
    return t(`radarChart.stage.${dimensionKey}_fair`);
  };

  // Note: overallScore is already on 0-10 scale (weighted avg of dimension scores)
  // No normalization needed

  // Get price score (0-10) based on relative comparison
  const getPriceScore = (price: number, flights: FlightWithScore[]): number => {
    const prices = flights.map(f => f.flight.price).sort((a, b) => a - b);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (maxPrice === minPrice) return 10; // All same price
    
    // Higher score for lower price (inverted)
    const normalized = 1 - ((price - minPrice) / (maxPrice - minPrice));
    return 2 + normalized * 8; // Scale to 2-10 range
  };

  // Get duration score (0-10) based on relative comparison to shortest flight
  // NEW ALGORITHM: Shortest flight = 10, deduct based on absolute difference
  // Every 30 minutes over shortest = -1 point
  const getDurationScore = (durationMinutes: number, flights: FlightWithScore[]): number => {
    const durations = flights.map(f => f.flight.durationMinutes);
    const shortestDuration = Math.min(...durations);
    
    if (durationMinutes <= shortestDuration) return 10;
    
    // Penalty: -1 point per 30 minutes over shortest
    const extraMinutes = durationMinutes - shortestDuration;
    const penalty = extraMinutes / 30;
    return Math.max(1, 10 - penalty);
  };

  // Get stops multiplier for efficiency
  // 0 stops = 1.0, 1 stop = 0.8, 2+ stops = 0.6
  const getStopsMultiplier = (stops: number): number => {
    if (stops === 0) return 1.0;
    if (stops === 1) return 0.8;
    return 0.6;
  };

  // Get stops score (0-10): Direct = 10, 1 Stop = 8, 2 stops = 6, 3+ = 4
  const getStopsScore = (stops: number): number => {
    if (stops === 0) return 10;
    if (stops === 1) return 8;
    if (stops === 2) return 6;
    return 4;
  };

  // Get efficiency score (combined duration + stops)
  // NEW: Efficiency = duration_score * stops_multiplier
  // This ensures long flights with stops get appropriately penalized
  const _getEfficiencyScore = (durationMinutes: number, stops: number, flights: FlightWithScore[]): number => {
    const durationScore = getDurationScore(durationMinutes, flights);
    const stopsMultiplier = getStopsMultiplier(stops);
    return Math.max(1, durationScore * stopsMultiplier);
  };
  // Suppress unused variable warning
  void _getEfficiencyScore;

  // Build radar chart data using 0-10 scale
  const dimensionKeys = ['Overall', 'Safety', 'Reliability', 'Comfort', 'Service', 'Value', 'Price', 'Duration', 'Stops'];

  const radarData = [
    {
      dimension: t('radarChart.dim.overall'),
      dimensionKey: 'overall',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, f.score.overallScore])
      ),
    },
    {
      dimension: t('radarChart.dim.safety'),
      dimensionKey: 'safety',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, f.score.dimensions.safety ?? 10])
      ),
    },
    {
      dimension: t('radarChart.dim.reliability'),
      dimensionKey: 'reliability',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, f.score.dimensions.reliability])
      ),
    },
    {
      dimension: t('radarChart.dim.comfort'),
      dimensionKey: 'comfort',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, f.score.dimensions.comfort])
      ),
    },
    {
      dimension: t('radarChart.dim.service'),
      dimensionKey: 'service',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, f.score.dimensions.service])
      ),
    },
    {
      dimension: t('radarChart.dim.value'),
      dimensionKey: 'value',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, f.score.dimensions.value])
      ),
    },
    {
      dimension: t('radarChart.dim.price'),
      dimensionKey: 'price',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, getPriceScore(f.flight.price, flights)])
      ),
    },
    {
      dimension: t('radarChart.dim.duration'),
      dimensionKey: 'duration',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, getDurationScore(f.flight.durationMinutes, flights)])
      ),
    },
    {
      dimension: t('radarChart.dim.stops'),
      dimensionKey: 'stops',
      fullMark: 10,
      ...Object.fromEntries(
        flights.map((f, idx) => [`flight${idx}`, getStopsScore(f.flight.stops)])
      ),
    },
  ];

  return (
    <div className="bg-surface rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-2 text-center">
        {t('radarChart.flightComparisonRadar')}
      </h3>
      <p className="text-sm text-text-secondary text-center mb-4">
        {t('radarChart.scoreScale')} · <span className="font-medium text-green-600">8-10 {t('radarChart.excellent')}</span> • <span className="font-medium text-[#034891]">5-7.9 {t('radarChart.good')}</span> • <span className="font-medium text-amber-600">0-4.9 {t('radarChart.fair')}</span>
      </p>
      
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid 
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis 
              dataKey="dimension" 
              tick={{ 
                fill: '#6b7280', 
                fontSize: 11,
                fontWeight: 500,
              }}
              tickLine={false}
            />
            <PolarRadiusAxis 
              angle={22.5} 
              domain={[0, 10]} 
              tick={false}
              axisLine={false}
            />
            
            {flights.map((flight, idx) => (
              <Radar
                key={flight.flight.id}
                name={`${translateAirline(flight.flight.airline)} (${flight.flight.flightNumber})`}
                dataKey={`flight${idx}`}
                stroke={COLORS[idx]}
                fill={COLORS[idx]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            
            <Legend 
              wrapperStyle={{
                paddingTop: '20px',
              }}
              formatter={(value) => (
                <span className="text-sm font-medium text-text-primary">{value}</span>
              )}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px',
              }}
              formatter={(value, name, props) => {
                const score = value as number;
                const dimensionKey = props.payload?.dimensionKey || 'overall';
                const stageLabel = getStageLabel(dimensionKey, score);
                return [`${score.toFixed(1)}/10 (${stageLabel})`, name];
              }}
              labelStyle={{
                color: '#374151',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score Explanations with Calculation Formulas */}
      <div className="mt-6 pt-4 border-t border-divider">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-text-primary">{t('radarChart.scoreCalcReference')}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dimensionKeys.map((key) => (
            <div key={key} className="bg-surface-alt rounded-lg p-3">
              <h5 className="font-medium text-text-primary text-sm mb-1">{t(`radarChart.dim.${key.toLowerCase()}`)}</h5>
              <p className="text-xs text-text-secondary mb-2">{t(`radarChart.desc.${key.toLowerCase()}`)}</p>
              <div className="bg-white rounded p-2 border border-gray-100">
                <p className="text-xs font-semibold text-gray-600 mb-1">{t('radarChart.formula')}</p>
                {DIMENSION_EXPLANATIONS[key]?.formula.map((line, i) => (
                  <p key={i} className="text-xs text-gray-500">{line}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Original values reference */}
        <div className="mt-4 p-3 bg-[#E6F0FA] rounded-lg">
          <h5 className="font-medium text-[#023670] text-sm mb-2">{t('radarChart.originalValuesRef')}</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {flights.map((f, idx) => (
              <div key={f.flight.id} className="text-xs">
                <span className="font-medium" style={{ color: COLORS[idx] }}>
                  {translateAirline(f.flight.airline)}:
                </span>
                <span className="text-[#034891] ml-1">
                  {formatPrice(f.flight.price, f.flight.currency)} · {formatDuration(f.flight.durationMinutes)} · {f.flight.stops === 0 ? t('radarChart.directFlight') : t(f.flight.stops === 1 ? 'radarChart.stop' : 'radarChart.stops', { count: f.flight.stops })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareRadarChart;
