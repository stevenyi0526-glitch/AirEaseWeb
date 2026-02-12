import React from 'react';
import { Sparkles, Star, Check, X } from 'lucide-react';
import type { FlightWithScore } from '../../api/types';
import FlightCard from './FlightCard';

/** A single requirement check for the AI recommendation checklist */
interface AIRequirementCheck {
  label: string;
  met: boolean;
}

interface AIRecommendationsProps {
  recommendations: Array<FlightWithScore & {
    recommendation_score?: number;
    recommendation_reasons?: string[];
    ai_requirement_checks?: AIRequirementCheck[];
  }>;
  explanation: string;
  isLoading?: boolean;
  onFlightClick?: (flight: FlightWithScore) => void;
  displayCurrency?: string;
  isAISearch?: boolean;
}

/**
 * AI Recommendations Component
 * 
 * Displays the TOP 1 AI-recommended flight with a special frame.
 * Reuses FlightCard component and wraps it with AI recommendation styling.
 */
const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  recommendations,
  explanation,
  isLoading = false,
  onFlightClick: _onFlightClick,
  displayCurrency = 'USD',
  isAISearch = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-amber-50 rounded-2xl p-4 mb-6 border-2 border-blue-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-amber-500">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">AI Top Pick</h3>
            <p className="text-sm text-gray-500">Finding your perfect flight...</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded-lg" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="flex-1 h-1 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  // Get only the top pick
  const topPick = recommendations[0];
  const reasons = topPick.recommendation_reasons || [];
  const requirementChecks = (topPick as { ai_requirement_checks?: AIRequirementCheck[] }).ai_requirement_checks || [];

  return (
    <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-amber-50 rounded-2xl p-4 mb-6 border-2 border-blue-200 shadow-md relative overflow-hidden">
      {/* Decorative background sparkles */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
        <Sparkles className="w-full h-full text-blue-500" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-amber-500 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 text-lg">AI Top Pick</h3>
              <span className="text-xs bg-gradient-to-r from-blue-500 to-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
                {isAISearch ? 'Best Match' : '#1 For You'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{explanation}</p>
          </div>
        </div>
      </div>

      {/* AI Search: Requirement checklist with ticks */}
      {isAISearch && requirementChecks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 relative z-10">
          {requirementChecks.map((check, i) => (
            <span
              key={i}
              className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 border ${
                check.met
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {check.met ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <X className="w-3.5 h-3.5 text-gray-400" />
              )}
              {check.label}
            </span>
          ))}
        </div>
      )}

      {/* Classic search: Star-based recommendation reasons */}
      {!isAISearch && reasons.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 relative z-10">
          {reasons.map((reason, i) => (
            <span
              key={i}
              className="text-xs bg-white/80 backdrop-blur-sm text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-medium flex items-center gap-1"
            >
              <Star className="w-3 h-3 text-blue-500" />
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* Reuse FlightCard component */}
      <div className="relative z-10">
        <FlightCard
          flightWithScore={topPick}
          showCompare={true}
          displayCurrency={displayCurrency}
        />
      </div>
    </div>
  );
};

export default AIRecommendations;
