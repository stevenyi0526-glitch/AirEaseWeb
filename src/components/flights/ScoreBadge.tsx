import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Score Badge component matching iOS design
 * - GREEN background (#22C55E) for all scores (as per iOS screenshots)
 * - White star icon + score number
 * - Optional "Airease Score" label below
 */
const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  // Round score - if score is 0-10 scale, multiply by 10
  const displayScore = score <= 10 ? Math.round(score * 10) : Math.round(score);

  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-1',
    md: 'px-3 py-2',
    lg: 'px-4 py-3',
  };

  const starSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  };

  const scoreSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const labelSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-lg bg-score text-white',
        sizeClasses[size],
        className
      )}
    >
      {/* Score with star */}
      <div className="flex items-center gap-1">
        <Star
          size={starSizes[size]}
          className="fill-white text-white"
        />
        <span className={cn('font-bold', scoreSizes[size])}>
          {displayScore}
        </span>
      </div>

      {/* Label */}
      {showLabel && (
        <span className={cn('text-white/90 font-medium mt-0.5', labelSizes[size])}>
          Airease Score
        </span>
      )}
    </div>
  );
};

export default ScoreBadge;

// Helper to get score color class (for other UI elements)
export function getScoreColorClass(score: number): string {
  const normalizedScore = score <= 10 ? score * 10 : score;
  if (normalizedScore >= 85) return 'bg-score-excellent';
  if (normalizedScore >= 70) return 'bg-score-good';
  if (normalizedScore >= 50) return 'bg-score-fair';
  return 'bg-score-poor';
}

// Helper to get score text
export function getScoreText(score: number): string {
  const normalizedScore = score <= 10 ? score * 10 : score;
  if (normalizedScore >= 85) return 'Excellent';
  if (normalizedScore >= 70) return 'Good';
  if (normalizedScore >= 50) return 'Fair';
  return 'Poor';
}
