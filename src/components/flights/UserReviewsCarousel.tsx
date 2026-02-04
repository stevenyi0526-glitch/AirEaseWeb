import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, ThumbsUp, ThumbsDown, Utensils, Headphones, Armchair, User } from 'lucide-react';
import type { UserReviewSummary } from '../../api/types';

interface UserReviewsCarouselProps {
  reviews: UserReviewSummary[];
  airlineName?: string;
}

const UserReviewsCarousel: React.FC<UserReviewsCarouselProps> = ({ reviews, airlineName }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      const newScrollLeft = scrollContainerRef.current.scrollLeft + 
        (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  // Rating bar component
  const RatingBar: React.FC<{ rating: number; maxRating?: number; label: string; icon: React.ReactNode }> = ({ 
    rating, 
    maxRating = 5, 
    label, 
    icon 
  }) => {
    const percentage = (rating / maxRating) * 100;
    return (
      <div className="flex items-center gap-2">
        <div className="text-gray-400 w-4">{icon}</div>
        <span className="text-xs text-gray-500 w-16 truncate">{label}</span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 w-6">{rating}</span>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Traveler Reviews
            {airlineName && <span className="text-gray-500 font-normal"> • {airlineName}</span>}
          </h3>
          <p className="text-sm text-gray-500">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} from verified travelers
          </p>
        </div>
        
        {/* Navigation buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ 
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {reviews.map((review, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Header with recommendation badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 capitalize">
                    {review.travelType || 'Traveler'}
                  </p>
                  {review.route && (
                    <p className="text-xs text-gray-400">{review.route}</p>
                  )}
                </div>
              </div>
              
              {/* Recommendation badge */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                review.recommended 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {review.recommended ? (
                  <>
                    <ThumbsUp size={12} />
                    <span>Recommended</span>
                  </>
                ) : (
                  <>
                    <ThumbsDown size={12} />
                    <span>Not Recommended</span>
                  </>
                )}
              </div>
            </div>

            {/* Title */}
            {review.title && (
              <h4 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-1">
                "{review.title}"
              </h4>
            )}

            {/* Review text */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
              {review.review}
            </p>

            {/* Ratings breakdown */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              {review.ratings.food !== undefined && review.ratings.food > 0 && (
                <RatingBar 
                  rating={review.ratings.food} 
                  label="Food" 
                  icon={<Utensils size={12} />} 
                />
              )}
              {review.ratings.service !== undefined && review.ratings.service > 0 && (
                <RatingBar 
                  rating={review.ratings.service} 
                  label="Service" 
                  icon={<Headphones size={12} />} 
                />
              )}
              {review.ratings.seatComfort !== undefined && review.ratings.seatComfort > 0 && (
                <RatingBar 
                  rating={review.ratings.seatComfort} 
                  label="Seat" 
                  icon={<Armchair size={12} />} 
                />
              )}
              {review.ratings.overall !== undefined && review.ratings.overall > 0 && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium text-gray-700">
                    Overall: {review.ratings.overall}/5
                  </span>
                </div>
              )}
            </div>

            {/* Cabin type badge */}
            {review.cabinType && (
              <div className="mt-3 inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600">
                {review.cabinType}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scroll indicator dots */}
      <div className="flex justify-center gap-1 mt-2">
        {reviews.slice(0, Math.min(5, reviews.length)).map((_, index) => (
          <div 
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-gray-300"
          />
        ))}
        {reviews.length > 5 && (
          <span className="text-xs text-gray-400 ml-1">+{reviews.length - 5}</span>
        )}
      </div>
    </div>
  );
};

export default UserReviewsCarousel;
