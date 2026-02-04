import React from 'react';
import { Plane } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchLoadingProps {
  from?: string;
  to?: string;
  className?: string;
}

/**
 * Animated loading component for flight search
 * Shows a plane flying between cities with progress animation
 */
const SearchLoading: React.FC<SearchLoadingProps> = ({ from, to, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      {/* Animated plane flying */}
      <div className="relative w-64 h-16 mb-6">
        {/* Flight path line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
        
        {/* Departure dot */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
        
        {/* Arrival dot */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
        
        {/* Flying plane animation */}
        <div className="absolute top-1/2 -translate-y-1/2 animate-fly-plane">
          <div className="relative">
            <Plane className="w-8 h-8 text-primary transform rotate-0" />
            {/* Trail effect */}
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-0.5 bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </div>
      </div>
      
      {/* Route text */}
      {from && to && (
        <div className="flex items-center gap-3 text-lg font-medium text-text-primary mb-4">
          <span>{from}</span>
          <Plane className="w-5 h-5 text-primary" />
          <span>{to}</span>
        </div>
      )}
      
      {/* Loading text */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-text-secondary animate-pulse">
          Searching for the best flights...
        </p>
        <p className="text-sm text-text-muted">
          Powered by Google Flights
        </p>
      </div>
      
      {/* Loading dots */}
      <div className="flex gap-1.5 mt-4">
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

export default SearchLoading;
