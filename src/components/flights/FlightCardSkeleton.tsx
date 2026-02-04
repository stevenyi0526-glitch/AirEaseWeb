import React from 'react';

/**
 * Skeleton loader for FlightCard
 */
const FlightCardSkeleton: React.FC = () => {
  return (
    <div className="flight-card p-4 md:p-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl skeleton" />
          <div>
            <div className="h-5 w-32 skeleton rounded mb-1.5" />
            <div className="h-4 w-20 skeleton rounded" />
          </div>
        </div>
        <div className="w-16 h-16 skeleton rounded-lg" />
      </div>

      {/* Times Row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="h-8 w-16 skeleton rounded mb-1" />
          <div className="h-4 w-10 skeleton rounded mx-auto" />
        </div>

        <div className="flex-1 px-2">
          <div className="h-4 w-16 skeleton rounded mx-auto mb-2" />
          <div className="h-px skeleton" />
        </div>

        <div className="text-center">
          <div className="h-8 w-16 skeleton rounded mb-1" />
          <div className="h-4 w-10 skeleton rounded mx-auto" />
        </div>

        <div className="text-right ml-4">
          <div className="h-8 w-20 skeleton rounded mb-1" />
          <div className="h-3 w-14 skeleton rounded ml-auto" />
        </div>
      </div>

      {/* Date */}
      <div className="h-4 w-32 skeleton rounded mb-3" />

      {/* Divider */}
      <div className="border-t border-divider my-3" />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 skeleton rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 skeleton rounded-button" />
          <div className="h-8 w-16 skeleton rounded-button" />
        </div>
      </div>
    </div>
  );
};

export default FlightCardSkeleton;
