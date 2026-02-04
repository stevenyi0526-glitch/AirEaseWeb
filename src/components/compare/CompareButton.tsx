import React from 'react';
import { Scale, Check } from 'lucide-react';
import { useCompareStore } from '../../stores/compareStore';
import type { FlightWithScore } from '../../api/types';
import { cn } from '../../utils/cn';

interface CompareButtonProps {
  flightWithScore: FlightWithScore;
  variant?: 'default' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Button to add/remove a flight from the compare list
 */
const CompareButton: React.FC<CompareButtonProps> = ({
  flightWithScore,
  variant = 'outline',
  size = 'sm',
  className,
}) => {
  const { addFlight, removeFlight, isInCompare, canAddMore } = useCompareStore();
  const isComparing = isInCompare(flightWithScore.flight.id);
  const canAdd = canAddMore();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isComparing) {
      removeFlight(flightWithScore.flight.id);
    } else if (canAdd) {
      addFlight(flightWithScore);
    }
  };

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  // Variant styles
  const variantClasses = {
    default: cn(
      'bg-primary text-white',
      isComparing
        ? 'bg-success'
        : canAdd
        ? 'hover:bg-primary-hover'
        : 'bg-text-muted cursor-not-allowed'
    ),
    outline: cn(
      'border bg-surface',
      isComparing
        ? 'border-success text-success'
        : canAdd
        ? 'border-border text-text-secondary hover:border-primary hover:text-primary'
        : 'border-border text-text-muted cursor-not-allowed'
    ),
    text: cn(
      isComparing
        ? 'text-success'
        : canAdd
        ? 'text-text-secondary hover:text-primary'
        : 'text-text-muted cursor-not-allowed'
    ),
  };

  return (
    <button
      onClick={handleClick}
      disabled={!canAdd && !isComparing}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-button transition-all duration-200',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      title={
        isComparing
          ? 'Remove from compare'
          : canAdd
          ? 'Add to compare'
          : 'Compare list is full (max 3)'
      }
    >
      {isComparing ? (
        <>
          <Check size={iconSizes[size]} />
          <span>Comparing</span>
        </>
      ) : (
        <>
          <Scale size={iconSizes[size]} />
          <span>Compare</span>
        </>
      )}
    </button>
  );
};

export default CompareButton;
