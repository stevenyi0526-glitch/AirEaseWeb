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
  // Convert to 5-point scale: if 0-10, divide by 2; if 0-100, divide by 20
  const fivePointScore = score <= 10 ? (score / 2).toFixed(1) : (score / 20).toFixed(1);

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
          {fivePointScore}
        </span>
      </div>

      {/* Label */}
      {showLabel && (
        <span className={cn('text-white/90 font-medium mt-0.5', labelSizes[size])}>
          {/* / 5 */}
        </span>
      )}
    </div>
  );
};

export default ScoreBadge;

// Helper to get score color class (for other UI elements)
export function getScoreColorClass(score: number): string {
  const fivePoint = score <= 10 ? score / 2 : score / 20;
  if (fivePoint >= 4.25) return 'bg-score-excellent';
  if (fivePoint >= 3.5) return 'bg-score-good';
  if (fivePoint >= 2.5) return 'bg-score-fair';
  return 'bg-score-poor';
}

// Helper to get score text
export function getScoreText(score: number): string {
  const fivePoint = score <= 10 ? score / 2 : score / 20;
  if (fivePoint >= 4.25) return 'Excellent';
  if (fivePoint >= 3.5) return 'Good';
  if (fivePoint >= 2.5) return 'Fair';
  return 'Poor';
}
