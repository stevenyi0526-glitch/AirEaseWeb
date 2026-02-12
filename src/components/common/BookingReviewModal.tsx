/**
 * AirEase - Booking Review Modal
 * "Comeback Review" popup that appears 1.5s after user clicks Book Now.
 * Submits to the same reports_and_user_reflections table as FeedbackModal.
 */

import { useState, useEffect } from 'react';
import { X, Star, Plane, CheckCircle, Loader2, AlertCircle, MapPin, Calendar } from 'lucide-react';
import { submitReport } from '../../api/reports';

interface FlightInfo {
  id?: string;
  airline?: string;
  flightNumber?: string;
  route?: string;
  date?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureCityCode?: string;
  arrivalCityCode?: string;
  aircraftModel?: string;
  price?: number;
  currency?: string;
  overallScore?: number;
}

interface BookingReviewModalProps {
  /** When set to a truthy value (Date.now()), triggers the 1.5s delayed open */
  triggerTimestamp: number;
  flightInfo: FlightInfo;
  userEmail?: string;
}

/**
 * A centered modal that pops up 1.5 seconds after `triggerTimestamp` changes.
 * The user can rate (1-5 stars) + leave a comment.
 * Data is sent to POST /reports/ with category "booking_review".
 */
export function BookingReviewModal({
  triggerTimestamp,
  flightInfo,
  userEmail = '',
}: BookingReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Show modal 1.5s after triggerTimestamp changes (and is > 0)
  useEffect(() => {
    if (!triggerTimestamp) return;
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [triggerTimestamp]);

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    // Reset state for next use
    setTimeout(() => {
      setRating(0);
      setHoverRating(0);
      setComment('');
      setSubmitStatus('idle');
      setErrorMessage('');
    }, 300);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await submitReport({
        userEmail: userEmail || 'anonymous@airease.ai',
        category: 'other',
        content: `[BOOKING REVIEW: ${rating}/5] ${comment || 'No additional comment'}`,
        flightId: flightInfo.id,
        flightInfo: {
          airline: flightInfo.airline,
          flightNumber: flightInfo.flightNumber,
          route: flightInfo.route,
          date: flightInfo.date,
        },
      });
      setSubmitStatus('success');
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch {
      setErrorMessage('Failed to submit review. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Darkened backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-[fadeInScale_0.3s_ease-out]">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-5 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-2 top-8 w-16 h-16 bg-white/5 rounded-full" />
          
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">How's the experience?</h2>
              <p className="text-sm text-white/70">Share your thoughts before you go</p>
            </div>
          </div>
        </div>

        {/* Flight info card */}
        <div className="mx-6 -mt-3 relative z-10">
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-100 dark:border-gray-600 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {flightInfo.airline || 'Airline'}
              </span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                {flightInfo.flightNumber || ''}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{flightInfo.route || `${flightInfo.departureCityCode || '?'} → ${flightInfo.arrivalCityCode || '?'}`}</span>
              </div>
              {flightInfo.date && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{flightInfo.date}</span>
                </div>
              )}
            </div>

            {(flightInfo.price != null && flightInfo.price > 0) && (
              <div className="mt-2 text-right">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {flightInfo.currency === 'USD' ? '$' : (flightInfo.currency || '$')}{flightInfo.price}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rating & Comment */}
        <div className="px-6 pt-5 pb-6 space-y-4">
          {/* Star rating */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Rate your browsing experience
            </p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  disabled={isSubmitting || submitStatus === 'success'}
                  className="transition-transform hover:scale-125 active:scale-95 disabled:cursor-not-allowed"
                >
                  <Star
                    className={`w-9 h-9 transition-all duration-150 ${
                      star <= (hoverRating || rating)
                        ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                        : 'text-gray-300 dark:text-gray-500'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 h-4">
              {(hoverRating || rating) > 0
                ? ratingLabels[hoverRating || rating]
                : 'Tap a star to rate'}
            </p>
          </div>

          {/* Comment */}
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any thoughts or suggestions? (optional)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                       bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-400 resize-none transition-all"
              maxLength={1000}
              disabled={isSubmitting || submitStatus === 'success'}
            />
            <div className="text-xs text-gray-400 text-right mt-0.5">
              {comment.length}/1000
            </div>
          </div>

          {/* Status Messages */}
          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Thank you for your review! ✈️</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting || submitStatus === 'success'}
            className="w-full flex items-center justify-center gap-2 px-6 py-3
                     bg-gradient-to-r from-sky-500 to-blue-600
                     hover:from-sky-600 hover:to-blue-700
                     text-white font-semibold rounded-xl
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : submitStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Submitted!
              </>
            ) : (
              <>
                <Star className="w-5 h-5" />
                Submit Review
              </>
            )}
          </button>

          {/* Skip link */}
          {submitStatus !== 'success' && (
            <button
              onClick={handleClose}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingReviewModal;
