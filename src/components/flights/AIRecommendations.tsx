import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Star, Check, X } from 'lucide-react';
import type { FlightWithScore } from '../../api/types';
import FlightCard from './FlightCard';

// Map of backend English reason strings → i18n keys
const REASON_TRANSLATIONS: Record<string, string> = {
  'Direct flight ✓': 'aiRecommendations.directFlight',
  'Short duration': 'aiRecommendations.shortDuration',
  'Great value': 'aiRecommendations.greatValue',
  'Good price': 'aiRecommendations.goodPrice',
  'High comfort': 'aiRecommendations.highComfort',
  'Comfortable': 'aiRecommendations.comfortable',
  'Efficient': 'aiRecommendations.efficient',
  'Reliable & premium service': 'aiRecommendations.reliablePremium',
  'Highly reliable': 'aiRecommendations.highlyReliable',
  'Premium service': 'aiRecommendations.premiumService',
  'Family-friendly amenities': 'aiRecommendations.familyFriendly',
  'Budget-friendly': 'aiRecommendations.budgetFriendly',
};

// Regex patterns for dynamic reason strings
const DYNAMIC_REASON_PATTERNS: Array<{ pattern: RegExp; key: string; extract?: (m: RegExpMatchArray) => Record<string, string> }> = [
  { pattern: /^Departs (\d+:\d+)–(\d+:\d+)/, key: 'aiRecommendations.departsTimeRange', extract: (m) => ({ start: m[1], end: m[2] }) },
  { pattern: /^Excellent score: (\d+)/, key: 'aiRecommendations.excellentScore', extract: (m) => ({ score: m[1] }) },
  { pattern: /^Great score: (\d+)/, key: 'aiRecommendations.greatScore', extract: (m) => ({ score: m[1] }) },
  { pattern: /^Your airline: (.+)/, key: 'aiRecommendations.yourAirline', extract: (m) => ({ airline: m[1] }) },
];

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
  onSelect?: (flight: FlightWithScore) => void;
  isSelected?: (flight: FlightWithScore) => boolean;
  displayCurrency?: string;
  isAISearch?: boolean;
  priceLabel?: 'round trip' | 'per person';
  isTicketLoading?: boolean;
}

/**
 * AI Recommendations Component
 * 
 * Displays the TOP 1 AI-recommended flight with a special frame.
 * Reuses FlightCard component and wraps it with AI recommendation styling.
 */
const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  recommendations,
  explanation: _explanation,
  isLoading = false,
  onFlightClick: _onFlightClick,
  onSelect,
  isSelected,
  displayCurrency = 'USD',
  isAISearch = false,
  priceLabel,
  isTicketLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-white rounded-2xl p-4 mb-6 border-2 border-blue-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-200">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{t('aiRecommendations.aiTopPick')}</h3>
            <p className="text-sm text-gray-500">{t('aiRecommendations.findingPerfectFlight')}</p>
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
    <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-white rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-blue-200 shadow-md relative overflow-visible">
      {/* Decorative background sparkles */}
      <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 opacity-10 pointer-events-none">
        <Sparkles className="w-full h-full text-blue-500" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-blue-200 shadow-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 text-base sm:text-lg">{t('aiRecommendations.aiTopPick')}</h3>
              <span className="text-[10px] sm:text-xs bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                {isAISearch ? t('aiRecommendations.topPick') : t('aiRecommendations.forYou')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Search: Requirement checklist with ticks */}
      {isAISearch && requirementChecks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 relative z-10">
          {requirementChecks.map((check, i) => (
            <span
              key={i}
              className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium flex items-center gap-1 sm:gap-1.5 border ${
                check.met
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {check.met ? (
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
              ) : (
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
              )}
              {check.label}
            </span>
          ))}
        </div>
      )}

      {/* Classic search: Star-based recommendation reasons */}
      {!isAISearch && reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 relative z-10">
          {reasons.map((reason, i) => (
            <span
              key={i}
              className="text-[10px] sm:text-xs bg-white/80 backdrop-blur-sm text-blue-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-200 font-medium flex items-center gap-1"
            >
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
              {(() => {
                // Try exact match first
                const exactKey = REASON_TRANSLATIONS[reason];
                if (exactKey) return t(exactKey);
                // Try dynamic patterns
                for (const { pattern, key, extract } of DYNAMIC_REASON_PATTERNS) {
                  const m = reason.match(pattern);
                  if (m) return t(key, extract?.(m));
                }
                return reason;
              })()}
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
          onSelect={onSelect ? () => onSelect(topPick) : undefined}
          isSelected={isSelected ? isSelected(topPick) : false}
          priceLabel={priceLabel}
          isTicketLoading={isTicketLoading}
        />
      </div>
    </div>
  );
};

export default AIRecommendations;
