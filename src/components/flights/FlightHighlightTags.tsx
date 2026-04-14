import React, { useState } from 'react';
import { CheckCircle, Clock, Armchair, Wifi, Zap, Award, Sofa } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { translateText } from '../../utils/translate';

interface HighlightTag {
  id: string;
  labelKey: string;
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
}

// Map highlight strings to tag configurations
const HIGHLIGHT_MAP: Record<string, HighlightTag> = {
  'Top Rated': { 
    id: 'top_rated', 
    labelKey: 'highlights.topRated', 
    icon: Award, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50' 
  },
  'Direct Flight': { 
    id: 'direct', 
    labelKey: 'highlights.directFlight', 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50' 
  },
  'On-Time Performance': { 
    id: 'on_time', 
    labelKey: 'highlights.onTimeRate', 
    icon: Clock, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50' 
  },
  'Extra Legroom': { 
    id: 'legroom', 
    labelKey: 'highlights.extraLegroom', 
    icon: Armchair, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50' 
  },
  'Wi-Fi Available': { 
    id: 'wifi', 
    labelKey: 'highlights.wifiAvailable', 
    icon: Wifi, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50' 
  },
  'Great Value': { 
    id: 'value', 
    labelKey: 'highlights.greatValue', 
    icon: Zap, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50' 
  },
  'Meals Included': { 
    id: 'meals', 
    labelKey: 'highlights.mealsIncluded', 
    icon: CheckCircle, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50' 
  },
  'Easy Connection': { 
    id: 'connection', 
    labelKey: 'highlights.easyConnection', 
    icon: CheckCircle, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50' 
  },
  'Comfortable seating': { 
    id: 'comfortable_seating', 
    labelKey: 'highlights.comfortableSeating', 
    icon: Sofa, 
    color: 'text-[#034891]', 
    bgColor: 'bg-[#E6F0FA]' 
  },
  'Direct flight': { 
    id: 'direct', 
    labelKey: 'highlights.directFlight', 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50' 
  },
};

// Default tag for unknown highlights
const DEFAULT_TAG: HighlightTag = {
  id: 'default',
  labelKey: '',
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
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (!highlights || highlights.length === 0) return null;

  const displayTags = expanded ? highlights : highlights.slice(0, maxTags);
  const remainingCount = highlights.length - maxTags;

  return (
    <div className={cn('flex flex-wrap gap-1 sm:gap-1.5', className)}>
      {displayTags.map((highlight) => {
        const tag = HIGHLIGHT_MAP[highlight] || { ...DEFAULT_TAG, labelKey: '' };
        const Icon = tag.icon;
        const label = tag.labelKey ? t(tag.labelKey) : translateText(highlight);

        return (
          <span
            key={highlight}
            className={cn(
              'inline-flex items-center gap-0.5 sm:gap-1 rounded-full font-medium',
              tag.bgColor,
              tag.color,
              size === 'sm' ? 'px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs' : 'px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs sm:text-sm'
            )}
          >
            <Icon className={cn(
              size === 'sm' ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3 h-3 sm:w-3.5 sm:h-3.5'
            )} />
            {label}
          </span>
        );
      })}
      
      {!expanded && remainingCount > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className={cn(
            'inline-flex items-center rounded-full bg-gray-100 text-gray-600 font-medium cursor-pointer hover:bg-gray-200 transition-colors',
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
          )}
        >
          +{remainingCount} {t('flights.showMore').toLowerCase()}
        </button>
      )}
    </div>
  );
};

export default FlightHighlightTags;
