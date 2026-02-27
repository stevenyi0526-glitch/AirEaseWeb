/**
 * AirEase - Booking Tracker Component
 * Tracks "Book Now" clicks and shows a return-visit popup
 * encouraging users to continue their booking.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plane, ArrowRight } from 'lucide-react';

interface BookingRecord {
  flightId: string;
  airline: string;
  flightNumber: string;
  route: string;
  price: number;
  currency: string;
  bookingUrl?: string;
  timestamp: number;
}

const STORAGE_KEY = 'airease_booking_history';

/**
 * Save a booking click to localStorage
 */
export function trackBookingClick(record: Omit<BookingRecord, 'timestamp'>) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as BookingRecord[];
    existing.unshift({ ...record, timestamp: Date.now() });
    // Keep only last 10 records
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 10)));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Get recent booking records (within last 7 days)
 */
function getRecentBookings(): BookingRecord[] {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as BookingRecord[];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return records.filter(r => r.timestamp > sevenDaysAgo);
  } catch {
    return [];
  }
}

/**
 * Check if user has dismissed the popup recently (within 24h)
 */
function isDismissedRecently(): boolean {
  try {
    const dismissed = localStorage.getItem('airease_booking_popup_dismissed');
    if (!dismissed) return false;
    return Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * BookingReturnPopup - Shown on return visits when user has pending bookings
 */
export function BookingReturnPopup() {
  const [visible, setVisible] = useState(false);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Only show after a small delay (user has returned to the site)
    const timer = setTimeout(() => {
      if (isDismissedRecently()) return;
      const recent = getRecentBookings();
      if (recent.length > 0) {
        setBooking(recent[0]);
        setVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem('airease_booking_popup_dismissed', Date.now().toString());
    } catch {
      // ignore
    }
  }, []);

  if (!visible || !booking) return null;

  const timeAgo = (() => {
    const diff = Date.now() - booking.timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  })();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#034891] to-[#0560B8] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Plane className="w-4 h-4" />
            <span className="text-sm font-semibold">Continue Booking?</span>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-2">
            You viewed this flight <span className="font-medium">{timeAgo}</span>:
          </p>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-900">{booking.airline}</p>
              <p className="text-xs text-gray-500">{booking.flightNumber} • {booking.route}</p>
            </div>
            <p className="text-lg font-bold text-[#034891]">
              {booking.currency === 'USD' ? '$' : booking.currency}{booking.price}
            </p>
          </div>
          <button
            onClick={() => {
              dismiss();
              if (booking.flightId) {
                navigate(`/flights/${booking.flightId}`);
              }
            }}
            className="w-full py-2.5 bg-gradient-to-r from-[#034891] to-[#0560B8] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-[#023670] hover:to-[#034891] transition-all"
          >
            <span>View Flight Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingReturnPopup;
