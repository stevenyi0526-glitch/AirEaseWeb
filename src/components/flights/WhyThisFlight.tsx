import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { FlightScore, FlightFacilities } from '../../api/types';
import ScoreBadge from './ScoreBadge';
import ScoreRadarChart from './ScoreRadarChart';
import { cn } from '../../utils/cn';

interface WhyThisFlightProps {
  score: FlightScore;
  facilities?: FlightFacilities;
  flightData?: {
    price?: number;
    durationMinutes?: number;
    stops?: number;
  };
  initialExpanded?: boolean;
  className?: string;
}

/**
 * Collapsible Reason Card
 */
const ReasonCard: React.FC<{
  index: number;
  title: string;
  detail: string;
  isPositive: boolean;
}> = ({ index, title, detail, isPositive }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        'reason-card animate-fade-in cursor-pointer transition-all',
        isOpen && 'bg-primary/5'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-start gap-3 w-full">
        <div className={cn(
          'reason-number flex-shrink-0',
          isPositive ? 'bg-primary' : 'bg-amber-500'
        )}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-text-primary text-sm md:text-base font-medium">
              {title}
            </p>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-text-muted flex-shrink-0 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
          {isOpen && (
            <p className="text-text-secondary text-sm mt-2 animate-fade-in">
              {detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * "AirEase Score Analysis" module matching iOS design
 * - Score badge (GREEN)
 * - Radar chart for dimensions (6 parameters)
 * - Score explanations with collapsible details
 * - Numbered reasons
 */
const WhyThisFlight: React.FC<WhyThisFlightProps> = ({
  score,
  facilities,
  flightData,
  initialExpanded = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Get reasons from explanations
  const reasons = score.explanations || [];

  // Show first 2 when collapsed, all when expanded
  const visibleReasons = isExpanded ? reasons : reasons.slice(0, 2);

  return (
    <div className={cn('bg-surface rounded-card shadow-card overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-divider">
        <div className="flex items-center gap-3">
          <ScoreBadge score={score.overallScore} size="md" showLabel={false} />
          <h3 className="text-lg font-semibold text-text-primary">
            AirEase Score Analysis
          </h3>
        </div>

        {reasons.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-primary font-medium hover:text-primary-hover transition-colors"
          >
            {isExpanded ? 'See less' : 'See more'}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Radar Chart - Using enhanced ScoreRadarChart with 6 dimensions */}
      <div className="px-4 md:px-5 py-4 border-b border-divider">
        <div className="flex justify-center">
          <ScoreRadarChart 
            dimensions={score.dimensions}
            economyDimensions={score.economyDimensions}
            businessDimensions={score.businessDimensions}
            serviceHighlights={score.serviceHighlights}
            size="lg" 
            showExplanations={true}
            showCabinToggle={true}
            flightData={{
              price: flightData?.price,
              durationMinutes: flightData?.durationMinutes,
              stops: flightData?.stops,
              hasWifi: facilities?.hasWifi,
              hasPower: facilities?.hasPower,
              hasIFE: facilities?.hasIFE,
              mealIncluded: facilities?.mealIncluded,
            }}
          />
        </div>
        <p className="text-sm text-text-muted text-center mt-2">
          Score optimized for: <span className="font-medium text-primary">{score.personaWeightsApplied}</span>
        </p>
      </div>

      {/* Reasons List */}
      {reasons.length > 0 && (
        <div className="px-4 md:px-5 py-4 md:py-5 space-y-3">
          <p className="text-sm font-medium text-text-secondary mb-2">Why we recommend this flight</p>
          {visibleReasons.map((reason, index) => (
            <ReasonCard
              key={index}
              index={index}
              title={reason.title}
              detail={reason.detail}
              isPositive={reason.isPositive}
            />
          ))}

          {/* Show remaining count when collapsed */}
          {!isExpanded && reasons.length > 2 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full py-2 text-sm text-primary font-medium hover:text-primary-hover transition-colors"
            >
              +{reasons.length - 2} more reasons
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WhyThisFlight;
