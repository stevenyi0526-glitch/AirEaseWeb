import React from 'react';
import { CheckCircle, Clock, Armchair, Wifi, Zap, Award } from 'lucide-react';
import { cn } from '../../utils/cn';

interface HighlightTag {
  id: string;
  label: string;
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
}

// Map highlight strings to tag configurations
const HIGHLIGHT_MAP: Record<string, HighlightTag> = {
  'Top Rated': { 
    id: 'top_rated', 
    label: 'Top Rated', 
    icon: Award, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50' 
  },
  'Direct Flight': { 
    id: 'direct', 
    label: 'Direct Flight', 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50' 
  },
  'On-Time Performance': { 
    id: 'on_time', 
    label: 'High On-Time Rate', 
    icon: Clock, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50' 
  },
  'Extra Legroom': { 
    id: 'legroom', 
    label: 'Extra Legroom', 
    icon: Armchair, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50' 
  },
  'Wi-Fi Available': { 
    id: 'wifi', 
    label: 'Wi-Fi Available', 
    icon: Wifi, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50' 
  },
  'Great Value': { 
    id: 'value', 
    label: 'Great Value', 
    icon: Zap, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50' 
  },
  'Meals Included': { 
    id: 'meals', 
    label: 'Meals Included', 
    icon: CheckCircle, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50' 
  },
  'Easy Connection': { 
    id: 'connection', 
    label: 'Easy Connection', 
    icon: CheckCircle, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50' 
  },
};

// Default tag for unknown highlights
const DEFAULT_TAG: HighlightTag = {
  id: 'default',
  label: '',
  icon: CheckCircle,
  color: 'text-gray-600',
  bgColor: 'bg-gray-50',
};

interface FlightHighlightTagsProps {
  highlights: string[];
  maxTags?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Display flight experience highlight tags
 */
const FlightHighlightTags: React.FC<FlightHighlightTagsProps> = ({
  highlights,
  maxTags = 3,
  size = 'sm',
  className,
}) => {
  if (!highlights || highlights.length === 0) return null;

  const displayTags = highlights.slice(0, maxTags);
  const remainingCount = highlights.length - maxTags;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {displayTags.map((highlight) => {
        const tag = HIGHLIGHT_MAP[highlight] || { ...DEFAULT_TAG, label: highlight };
        const Icon = tag.icon;

        return (
          <span
            key={highlight}
            className={cn(
              'inline-flex items-center gap-1 rounded-full font-medium',
              tag.bgColor,
              tag.color,
              size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
            )}
          >
            <Icon className={cn(
              size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
            )} />
            {tag.label}
          </span>
        );
      })}
      
      {remainingCount > 0 && (
        <span className={cn(
          'inline-flex items-center rounded-full bg-gray-100 text-gray-600 font-medium',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        )}>
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

export default FlightHighlightTags;
