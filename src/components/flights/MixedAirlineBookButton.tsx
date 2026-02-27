import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { StepForward, Loader2, ExternalLink } from 'lucide-react';
import { fetchBookingLinks, type BookingLink } from '../../api/booking';
import { cn } from '../../utils/cn';

interface MixedAirlineBookButtonProps {
  /** Booking tokens from all selected flights (departure + return, or multi-city legs) */
  bookingTokens: string[];
  departureId?: string;
  arrivalId?: string;
  outboundDate?: string;
  returnDate?: string;
  airlineName?: string;
  /** Fallback action if no links available */
  onFallback: () => void;
}

/**
 * "Book Now | ▶" button for mixed-airline bookings.
 * Hovering reveals a vertical list of booking platforms to the right.
 */
const MixedAirlineBookButton: React.FC<MixedAirlineBookButtonProps> = ({
  bookingTokens,
  departureId,
  arrivalId,
  outboundDate,
  returnDate,
  airlineName,
  onFallback: _onFallback,
}) => {
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last-fetched tokens so we refetch when selections change
  const lastTokensRef = useRef<string>('');
  const fetchingRef = useRef(false);

  // Create a stable key from all tokens
  const tokensKey = bookingTokens.filter(Boolean).sort().join('|');

  // Fetch booking links (refetch whenever tokens change)
  const fetchLinks = useCallback(async () => {
    // Skip if already fetched for these tokens, or already in-flight
    if (lastTokensRef.current === tokensKey || fetchingRef.current) return;
    fetchingRef.current = true;
    lastTokensRef.current = tokensKey;
    setLoading(true);
    console.log('[MixedAirlineBookButton] fetchLinks called', {
      tokenCount: bookingTokens.length,
      tokenLengths: bookingTokens.map(t => t?.length ?? 0),
      departureId, arrivalId, outboundDate, returnDate,
    });
    try {
      const result = await fetchBookingLinks({
        bookingTokens,
        departureId,
        arrivalId,
        outboundDate,
        returnDate,
        airlineName,
      });
      console.log('[MixedAirlineBookButton] fetchLinks result', {
        linkCount: result.length,
        links: result.map(l => l.name),
      });
      setLinks(result);
    } catch (err) {
      console.error('[MixedAirlineBookButton] fetchLinks error', err);
      setLinks([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [tokensKey, bookingTokens, departureId, arrivalId, outboundDate, returnDate, airlineName]);

  // Reset cache when tokens change
  useEffect(() => {
    // When tokensKey changes, clear old links so next hover triggers a fresh fetch
    setLinks([]);
    lastTokensRef.current = '';
    fetchingRef.current = false;
  }, [tokensKey]);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowMenu(true);
    fetchLinks();
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => setShowMenu(false), 200);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Close on outside click (check both the button container and the portal menu)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inContainer && !inMenu) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const handlePlatformClick = (link: BookingLink) => {
    window.open(link.url, '_blank', 'noopener,noreferrer');
    setShowMenu(false);
  };

  // Compute portal menu position: anchored above the button, right-aligned
  useEffect(() => {
    if (!showMenu || !containerRef.current) return;
    const updatePosition = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const menuWidth = 320;
      // Right-align: right edge of menu = right edge of button
      let left = rect.right - menuWidth;
      // Clamp to viewport left edge
      if (left < 8) left = 8;
      // Position above the button
      setMenuPos({ top: rect.top, left });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showMenu]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main button: [ Book Now | ▶ ] */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // On click, if links loaded show menu, otherwise fallback
          if (links.length > 0) {
            setShowMenu((prev) => !prev);
          } else {
            fetchLinks().then(() => setShowMenu(true));
          }
        }}
        className={cn(
          'flex items-center text-sm font-medium rounded-lg transition-all',
          'bg-[#034891] text-white hover:bg-[#023670]',
          showMenu && 'bg-[#023670]'
        )}
      >
        <span className="px-4 py-2 flex items-center gap-1.5">
          <ExternalLink className="w-4 h-4" />
          Book Now
        </span>
        <span className="border-l border-white/30 px-2 py-2 flex items-center">
          <StepForward className="w-4 h-4" />
        </span>
      </button>

      {/* Dropdown menu — rendered via portal so it escapes overflow:hidden ancestors */}
      {showMenu && menuPos && createPortal(
        <div
          ref={menuRef}
          className={cn(
            'fixed z-[9999]',
            'bg-white rounded-2xl shadow-2xl border border-gray-200',
            'min-w-[280px] w-[320px] py-3 px-2',
            'animate-fade-in'
          )}
          style={{
            top: menuPos.top,
            left: menuPos.left,
            transform: 'translateY(-100%) translateY(-8px)',
          }}
          onMouseEnter={() => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="px-3 py-2 text-sm font-bold text-gray-700 border-b border-gray-100 mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[#034891]" />
            Choose Booking Platform
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading platforms…</span>
            </div>
          ) : links.length === 0 ? (
            <div className="px-4 py-5 text-sm text-gray-400 text-center">
              No booking platforms found
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {links.map((link, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlatformClick(link);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    'hover:bg-[#034891]/8 hover:shadow-sm text-gray-700 hover:text-[#034891]',
                    'text-left w-full border border-transparent hover:border-[#034891]/20'
                  )}
                >
                  {/* Airline badge or generic icon */}
                  {link.isAirline ? (
                    <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 text-[#034891] flex items-center justify-center text-base font-bold">
                      ✈️
                    </span>
                  ) : (
                    <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-base font-bold">
                      🌐
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">{link.name}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {link.isAirline ? 'Airline Official' : 'Travel Agency'}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MixedAirlineBookButton;
