import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, DollarSign, Plane, Star, ChevronRight } from 'lucide-react';
import type { FlightWithScore } from '../../api/types';
import { formatTime, formatDuration, formatPrice } from '../../utils/formatters';
import ScoreBadge from './ScoreBadge';
import { cn } from '../../utils/cn';

interface AIRecommendationsProps {
  recommendations: Array<FlightWithScore & {
    recommendation_score?: number;
    recommendation_reasons?: string[];
  }>;
  explanation: string;
  isLoading?: boolean;
  onFlightClick?: (flight: FlightWithScore) => void;
}

/**
 * AI Recommendations Component
 * 
 * Displays the top 3 AI-recommended flights at the top of search results.
 * Shows personalized reasons for each recommendation.
 */
const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  recommendations,
  explanation,
  isLoading = false,
  onFlightClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">AI Recommendations</h3>
            <p className="text-sm text-gray-500">Analyzing your preferences...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border border-purple-100 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">AI Recommendations</h3>
            <p className="text-sm text-gray-600">{explanation}</p>
          </div>
        </div>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
          Personalized
        </span>
      </div>

      {/* Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.slice(0, 3).map((rec, index) => {
          const flight = rec.flight;
          const score = rec.score;
          const reasons = rec.recommendation_reasons || [];

          return (
            <Link
              key={flight.id}
              to={`/flights/${flight.id}`}
              state={{ flightWithScore: rec }}
              onClick={() => onFlightClick?.(rec)}
              className={cn(
                "bg-white rounded-xl p-4 hover:shadow-lg transition-all hover:-translate-y-1 border",
                index === 0 ? "border-purple-200 ring-2 ring-purple-100" : "border-gray-100"
              )}
            >
              {/* Rank Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" 
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {index + 1}
                  </span>
                  {index === 0 && (
                    <span className="text-xs text-purple-600 font-medium">Top Pick</span>
                  )}
                </div>
                <ScoreBadge score={score.overallScore} size="sm" />
              </div>

              {/* Airline & Route */}
              <div className="mb-3">
                <p className="font-semibold text-gray-800 truncate">
                  {flight.airline}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{flight.departureCityCode}</span>
                  <Plane className="w-3 h-3" />
                  <span>{flight.arrivalCityCode}</span>
                </div>
              </div>

              {/* Flight Details */}
              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(flight.departureTime)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <span>{formatDuration(flight.durationMinutes)}</span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-600">
                    {formatPrice(flight.price, flight.currency)}
                  </span>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded",
                  flight.stops === 0 
                    ? "bg-green-100 text-green-700" 
                    : "bg-gray-100 text-gray-600"
                )}>
                  {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Recommendation Reasons */}
              {reasons.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {reasons.slice(0, 2).map((reason, i) => (
                      <span
                        key={i}
                        className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full"
                      >
                        <Star className="w-3 h-3 inline mr-1" />
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* View Details Arrow */}
              <div className="flex items-center justify-end mt-2 text-purple-600">
                <span className="text-xs font-medium">View Details</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AIRecommendations;
