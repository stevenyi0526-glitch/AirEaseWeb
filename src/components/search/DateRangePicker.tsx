import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
 *   1st click  → sets departure date (clears return)
 *   2nd click  → sets return date (must be after departure)
 *   3rd click  → resets: sets new departure, clears return
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

  // Parse current selections
  const depDate = departureDate ? new Date(departureDate + 'T00:00:00') : null;
  const retDate = returnDate ? new Date(returnDate + 'T00:00:00') : null;

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

  // Compute & keep dropdown position in sync with trigger (scroll/resize aware)
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,   // 8px gap below trigger
        left: rect.left,
      });
    }
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
    if (isSelectingReturn) {
      // We're picking the return date
      if (isBefore(date, depDate!) || isSameDay(date, depDate!)) {
        // Clicked same or earlier date → restart: set as new departure
        onDepartureChange(dateStr);
        onReturnChange('');
      } else {
        // Valid return date
        onReturnChange(dateStr);
        setOpen(false);
      }
    } else {
      // Picking departure (or resetting)
      onDepartureChange(dateStr);
      onReturnChange('');
    }
  }, [isRoundTrip, isSelectingReturn, depDate, today, onDepartureChange, onReturnChange]);

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
      <div className="w-[280px]">
        {/* Month title */}
        <div className="text-center font-semibold text-sm text-text-primary mb-2">
          {format(monthStart, 'MMMM yyyy')}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-xs text-text-muted mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
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
                  // Departure date
                  isDep && 'bg-[#034891] text-white rounded-l-full font-semibold',
                  // Return date
                  isRet && 'bg-[#034891] text-white rounded-r-full font-semibold',
                  // Hovered preview
                  isHovered && !isDep && !isRet && 'bg-primary/20 rounded-r-full',
                  // Range start/end rounding
                  isDep && retDate && 'rounded-r-none',
                  isRet && 'rounded-l-none',
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
              <label className="block text-xs font-semibold text-gray-400 mb-1">Departure</label>
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
                <span className="truncate">{departureDate ? format(new Date(departureDate + 'T00:00:00'), 'MMM d, yyyy') : 'Select date'}</span>
              </button>
            </div>
            {/* Return button */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-gray-400 mb-1">Return</label>
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
                <span className="truncate">{returnDate ? format(new Date(returnDate + 'T00:00:00'), 'MMM d, yyyy') : 'Select date'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Departure</label>
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
              <span className="truncate">{departureDate ? format(new Date(departureDate + 'T00:00:00'), 'MMM d, yyyy') : 'Select date'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Calendar dropdown — rendered via portal to escape overflow-hidden containers */}
      {open && dropdownPos && createPortal(
        <div
          id="date-range-dropdown"
          className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 animate-fade-in"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
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
                  ? '← Select return date'
                  : 'Select departure date →'
                : 'Select departure date'}
            </div>

            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Two-month calendar */}
          <div className="flex gap-6">
            {renderMonth(leftMonth)}
            {renderMonth(rightMonth)}
          </div>

          {/* Footer: selected dates summary */}
          {isRoundTrip && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-text-muted text-xs">Departure: </span>
                  <span className="font-medium text-text-primary">
                    {depDate ? format(depDate, 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-xs">Return: </span>
                  <span className="font-medium text-text-primary">
                    {retDate ? format(retDate, 'MMM d, yyyy') : '—'}
                  </span>
                </div>
              </div>
              {depDate && retDate && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-1.5 bg-[#034891] text-white text-sm font-medium rounded-lg hover:bg-[#023670] transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateRangePicker;
