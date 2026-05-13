import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  isAfter,
  isSameMonth,
} from 'date-fns';
import { cn } from '../../utils/cn';

interface DateRangePickerProps {
  departureDate: string;   // YYYY-MM-DD
  returnDate: string;      // YYYY-MM-DD
  onDepartureChange: (date: string) => void;
  onReturnChange: (date: string) => void;
  /** Whether to show the return date picker (round trip mode) */
  isRoundTrip: boolean;
}

/**
 * Travel-style date range picker.
 * Round-trip mode:
 *   1st click on a day            → sets departure (clears return)
 *   2nd click on the SAME day     → same-day round trip (return = departure)
 *   2nd click on a LATER day      → sets return
 *   2nd click on an EARLIER day   → restart: that day becomes new departure
 *   3rd click on the SAME day     → deselect both (only when dep == ret == that day)
 * One-way mode:
 *   Each click sets the departure date.
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  departureDate,
  returnDate,
  onDepartureChange,
  onReturnChange,
  isRoundTrip,
}) => {
  const [open, setOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { t } = useTranslation();

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Parse current selections.
  // Bug 2548162: in one-way mode the parent may still be holding a stale
  // returnDate from a previous round-trip search. Ignore it locally so the
  // calendar never shows two highlighted days when the user has switched to
  // a single-leg trip.
  const depDate = departureDate ? new Date(departureDate + 'T00:00:00') : null;
  const retDate = isRoundTrip && returnDate ? new Date(returnDate + 'T00:00:00') : null;

  // Which month to show (left calendar)
  const [viewMonth, setViewMonth] = useState(() => {
    if (depDate) return startOfMonth(depDate);
    return startOfMonth(new Date());
  });

  // Close on outside click (handles both trigger + portal dropdown)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const dropdown = document.getElementById('date-range-dropdown');
      if (dropdown?.contains(target)) return;
      setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Compute & keep dropdown position in sync with trigger (scroll/resize aware).
  // Bug 2548101: when the trigger scrolls behind a sticky page header the
  // dropdown was visually "floating" on top of that header. Auto-close the
  // picker once the trigger scrolls partially off-screen so the user gets a
  // consistent visual stack instead of overlap.
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Approximate sticky-header height (~64px) plus a small margin.
    if (rect.bottom < 80 || rect.top > window.innerHeight - 40) {
      setOpen(false);
      return;
    }
    setDropdownPos({
      top: rect.bottom + 8,   // 8px gap below trigger
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);  // capture phase for nested scrolls
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Selection state: 'selecting-departure' | 'selecting-return'
  // If round trip AND departure is set AND return is NOT set → selecting return
  // Otherwise → selecting departure
  const isSelectingReturn = isRoundTrip && depDate && !retDate;

  const handleDateClick = useCallback((date: Date) => {
    if (isBefore(date, today)) return; // Can't pick past dates

    const dateStr = format(date, 'yyyy-MM-dd');

    if (!isRoundTrip) {
      // One-way: just set departure
      onDepartureChange(dateStr);
      setOpen(false);
      return;
    }

    // Round trip logic
    const clickedDep = !!depDate && isSameDay(date, depDate);
    const clickedRet = !!retDate && isSameDay(date, retDate);

    // Third-click deselect: same-day round trip already set, click that day again → clear both
    if (clickedDep && clickedRet) {
      onDepartureChange('');
      onReturnChange('');
      return;
    }

    if (isSelectingReturn) {
      // We're picking the return date
      if (clickedDep) {
        // Same-day round trip — return on the same day as departure
        onReturnChange(dateStr);
        setOpen(false);
      } else if (isBefore(date, depDate!)) {
        // Earlier than departure → restart: that day becomes new departure
        onDepartureChange(dateStr);
        onReturnChange('');
      } else {
        // Valid (later) return date
        onReturnChange(dateStr);
        setOpen(false);
      }
    } else {
      // Picking departure (or both were set and user is restarting from this day)
      onDepartureChange(dateStr);
      onReturnChange('');
    }
  }, [isRoundTrip, isSelectingReturn, depDate, retDate, today, onDepartureChange, onReturnChange]);

  // Build calendar grid for a month
  const buildCalendarDays = (monthStart: Date) => {
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sun
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let d = calendarStart;
    while (d <= calendarEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  };

  const leftMonth = viewMonth;
  const rightMonth = addMonths(viewMonth, 1);

  const renderMonth = (monthStart: Date) => {
    const days = buildCalendarDays(monthStart);

    return (
      <div className={cn("w-[280px]", isMobile && "w-full")}>
        {/* Month title */}
        <div className="text-center font-semibold text-sm text-text-primary mb-2">
          {format(monthStart, 'MMMM yyyy')}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-xs text-text-muted mb-1">
          {[
            t('dateRangePicker.weekSu'),
            t('dateRangePicker.weekMo'),
            t('dateRangePicker.weekTu'),
            t('dateRangePicker.weekWe'),
            t('dateRangePicker.weekTh'),
            t('dateRangePicker.weekFr'),
            t('dateRangePicker.weekSa'),
          ].map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, monthStart);
            const isPast = isBefore(day, today);
            const isDisabled = isPast || !inMonth;
            const isDep = depDate && isSameDay(day, depDate);
            const isRet = retDate && isSameDay(day, retDate);

            // Highlight range between dep and ret (or dep and hovered)
            let inRange = false;
            if (depDate && inMonth && !isDisabled) {
              if (retDate) {
                inRange = isAfter(day, depDate) && isBefore(day, retDate);
              } else if (isSelectingReturn && hoveredDate && isAfter(hoveredDate, depDate)) {
                inRange = isAfter(day, depDate) && isBefore(day, hoveredDate);
              }
            }

            // Is this the hovered date (while selecting return)?
            const isHovered = hoveredDate && isSameDay(day, hoveredDate) && isSelectingReturn && !isDisabled && inMonth;

            return (
              <button
                key={i}
                type="button"
                disabled={isDisabled}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => !isDisabled && inMonth && setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                className={cn(
                  'relative h-9 text-sm transition-colors',
                  // Base
                  !inMonth && 'invisible',
                  inMonth && isPast && 'text-text-muted/40 cursor-not-allowed',
                  inMonth && !isPast && 'hover:bg-primary/10 cursor-pointer text-text-primary',
                  // Range background
                  inRange && 'bg-primary/10',
                  // Same-day round trip → single fully-rounded pill
                  isDep && isRet && 'bg-[#034891] text-white rounded-full font-semibold',
                  // Departure date (multi-day)
                  isDep && !isRet && 'bg-[#034891] text-white rounded-l-full font-semibold',
                  // Return date (multi-day)
                  isRet && !isDep && 'bg-[#034891] text-white rounded-r-full font-semibold',
                  // Hovered preview
                  isHovered && !isDep && !isRet && 'bg-primary/20 rounded-r-full',
                  // Range start/end rounding (only when dep and ret are on different days)
                  isDep && retDate && !isRet && 'rounded-r-none',
                  isRet && !isDep && 'rounded-l-none',
                  // Today indicator
                  isSameDay(day, today) && !isDep && !isRet && 'font-bold text-primary',
                )}
              >
                {format(day, 'd')}
                {isSameDay(day, today) && !isDep && !isRet && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Open the calendar, optionally hinting which date to pick first
  const openCalendar = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger buttons */}
      <div ref={triggerRef}>
        {isRoundTrip ? (
          <div className="flex gap-2">
            {/* Departure button */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-gray-400 mb-1">{t('dateRangePicker.departure')}</label>
              <button
                type="button"
                onClick={openCalendar}
                className={cn(
                  'flex items-center gap-2 h-12 px-3 rounded-lg border bg-white text-base transition-all w-full',
                  open
                    ? 'border-[#034891] ring-2 ring-[#034891]/40'
                    : 'border-gray-200 hover:border-gray-300',
                  !departureDate ? 'text-gray-400' : 'text-gray-700'
                )}
              >
                <Calendar className="w-4 h-4 text-[#034891] flex-shrink-0" />
                <span className="truncate">{departureDate ? format(new Date(departureDate + 'T00:00:00'), 'MMM d, yyyy') : t('dateRangePicker.selectDate')}</span>
              </button>
            </div>
            {/* Return button */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-gray-400 mb-1">{t('dateRangePicker.return')}</label>
              <button
                type="button"
                onClick={openCalendar}
                className={cn(
                  'flex items-center gap-2 h-12 px-3 rounded-lg border bg-white text-base transition-all w-full',
                  open
                    ? 'border-[#034891] ring-2 ring-[#034891]/40'
                    : 'border-gray-200 hover:border-gray-300',
                  !returnDate ? 'text-gray-400' : 'text-gray-700'
                )}
              >
                <Calendar className="w-4 h-4 text-[#034891] flex-shrink-0" />
                <span className="truncate">{returnDate ? format(new Date(returnDate + 'T00:00:00'), 'MMM d, yyyy') : t('dateRangePicker.selectDate')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{t('dateRangePicker.departure')}</label>
            <button
              type="button"
              onClick={openCalendar}
              className={cn(
                'flex items-center gap-2 h-12 px-3 rounded-lg border bg-white text-base transition-all w-full',
                open
                  ? 'border-[#034891] ring-2 ring-[#034891]/40'
                  : 'border-gray-200 hover:border-gray-300',
                !departureDate ? 'text-gray-400' : 'text-gray-700'
              )}
            >
              <Calendar className="w-4 h-4 text-[#034891] flex-shrink-0" />
              <span className="truncate">{departureDate ? format(new Date(departureDate + 'T00:00:00'), 'MMM d, yyyy') : t('dateRangePicker.selectDate')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Calendar dropdown — rendered via portal to escape overflow-hidden containers */}
      {open && dropdownPos && createPortal(
        <>
          {/* Mobile backdrop */}
          {isMobile && (
            <div className="fixed inset-0 z-[9998] bg-black/30" onClick={() => setOpen(false)} />
          )}
          <div
            id="date-range-dropdown"
            className={cn(
              "fixed z-[9999] bg-white shadow-2xl border border-gray-200 animate-fade-in",
              isMobile
                ? "inset-x-3 rounded-2xl p-4"
                : "rounded-2xl p-5"
            )}
            style={isMobile
              ? { top: '50%', transform: 'translateY(-50%)' }
              : { top: dropdownPos.top, left: dropdownPos.left }
            }
          >
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            {/* Instruction text */}
            <div className="text-xs text-text-muted text-center">
              {isRoundTrip
                ? isSelectingReturn
                  ? t('dateRangePicker.selectReturnDate')
                  : t('dateRangePicker.selectDepartureDateArrow')
                : t('dateRangePicker.selectDepartureDate')}
            </div>

            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Calendar — single month on mobile, two months on desktop */}
          {isMobile ? (
            <div className="flex justify-center">
              {renderMonth(leftMonth)}
            </div>
          ) : (
            <div className="flex gap-6">
              {renderMonth(leftMonth)}
              {renderMonth(rightMonth)}
            </div>
          )}

          {/* Footer: selected dates summary */}
          {isRoundTrip && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
                <div>
                  <span className="text-text-muted text-xs">{t('dateRangePicker.dep')}</span>
                  <span className="font-medium text-text-primary">
                    {depDate ? format(depDate, 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-xs">{t('dateRangePicker.ret')}</span>
                  <span className="font-medium text-text-primary">
                    {retDate ? format(retDate, 'MMM d, yyyy') : '—'}
                  </span>
                </div>
              </div>
              {depDate && retDate && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 sm:px-4 py-1.5 bg-[#034891] text-white text-sm font-medium rounded-lg hover:bg-[#023670] transition-colors flex-shrink-0"
                >
                  {t('dateRangePicker.done')}
                </button>
              )}
            </div>
          )}
        </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default DateRangePicker;
