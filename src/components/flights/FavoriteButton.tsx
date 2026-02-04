import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useAuth } from '../../contexts/AuthContext';
import type { FlightWithScore } from '../../api/types';
import { cn } from '../../utils/cn';

interface FavoriteButtonProps {
  flightWithScore: FlightWithScore;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  flightWithScore,
  size = 'md',
  showLabel = false,
  className,
}) => {
  const { isAuthenticated } = useAuth();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const [isLoading, setIsLoading] = useState(false);

  const flightId = flightWithScore.flight.id;
  const isFaved = isFavorite(flightId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Could trigger login modal here
      alert('Please sign in to save favorites');
      return;
    }

    setIsLoading(true);
    try {
      if (isFaved) {
        await removeFavorite(flightId);
      } else {
        await addFavorite(flightWithScore);
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-1.5 rounded-lg transition-all',
        sizeClasses[size],
        isFaved
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-gray-100 text-gray-400 hover:text-red-400 hover:bg-red-50',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={isFaved ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isLoading ? (
        <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
      ) : (
        <Heart
          className={cn(iconSizes[size], isFaved && 'fill-current')}
        />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isFaved ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton;
