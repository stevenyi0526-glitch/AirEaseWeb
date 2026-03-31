/**
 * English Date Input Component
 * 
 * Replaces native <input type="date"> which uses the browser/OS locale.
 * This component always displays in English regardless of system language.
 * Outputs date as YYYY-MM-DD string.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  isSameMonth,
  isBefore,
} from 'date-fns';
import { cn } from '../../utils/cn';

interface EnglishDateInputProps {
  value: string;           // YYYY-MM-DD
  onChange: (date: string) => void;
  min?: string;            // YYYY-MM-DD
  className?: string;
  placeholder?: string;
  showIcon?: boolean;
  iconClassName?: string;
}

const EnglishDateInput: React.FC<EnglishDateInputProps> = ({
  value,
  onChange,
  min,
  className,
  placeholder = undefined,
  showIcon = true,
  iconClassName,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const minDate = min ? new Date(min + 'T00:00:00') : undefined;

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) return startOfMonth(selectedDate);
    return startOfMonth(new Date());
  });

  // Position the dropdown
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < 320 ? rect.top - 310 : rect.bottom + 4;
      setDropdownPos({
        top: Math.max(4, top),
        left: Math.max(4, Math.min(rect.left, window.innerWidth - 290)),
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const dropdown = document.getElementById('eng-date-dropdown');
      if (dropdown?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSelectDay = (day: Date) => {
    if (minDate && isBefore(day, minDate)) return;
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  };

  // Build the calendar grid
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const displayValue = selectedDate
    ? format(selectedDate, 'MMM d, yyyy') // Always English via date-fns
    : '';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 text-left w-full',
          className
        )}
      >
        {showIcon && (
          <Calendar className={cn('w-4 h-4 text-primary flex-shrink-0', iconClassName)} />
        )}
        <span className={cn('truncate', displayValue ? 'text-text-primary' : 'text-text-muted')}>
          {displayValue || placeholder || t('dateInput.selectDate')}
        </span>
      </button>

      {open && dropdownPos && createPortal(
        <div
          id="eng-date-dropdown"
          ref={dropdownRef}
          className="fixed z-[9999] w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-3 pt-2">
            {[
              t('dateRangePicker.weekSu'),
              t('dateRangePicker.weekMo'),
              t('dateRangePicker.weekTu'),
              t('dateRangePicker.weekWe'),
              t('dateRangePicker.weekTh'),
              t('dateRangePicker.weekFr'),
              t('dateRangePicker.weekSa'),
            ].map((wd) => (
              <div key={wd} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-3 pb-3">
            {days.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, viewMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDisabled = minDate && isBefore(day, minDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isDisabled && handleSelectDay(day)}
                  disabled={!!isDisabled}
                  className={cn(
                    'w-9 h-9 mx-auto rounded-full text-xs font-medium transition-colors',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !isSelected && !isDisabled && 'text-gray-700 hover:bg-blue-50',
                    isSelected && 'bg-primary text-white',
                    isDisabled && 'text-gray-200 cursor-not-allowed',
                    isToday && !isSelected && 'ring-1 ring-primary/30',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EnglishDateInput;
