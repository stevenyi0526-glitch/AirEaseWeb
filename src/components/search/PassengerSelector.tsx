/**
 * Passenger Selector Component
 * 
 * Allows users to modify the number of passengers on the search results page
 */

import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Minus, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PassengerSelectorProps {
  adults: number;
  children: number;
  onChange: (adults: number, children: number) => void;
  className?: string;
  compact?: boolean;
}

const PassengerSelector: React.FC<PassengerSelectorProps> = ({
  adults,
  children,
  onChange,
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempAdults, setTempAdults] = useState(adults);
  const [tempChildren, setTempChildren] = useState(children);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const total = adults + children;

  // Reset temp values when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTempAdults(adults);
      setTempChildren(children);
    }
  }, [isOpen, adults, children]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    onChange(tempAdults, tempChildren);
    setIsOpen(false);
  };

  const incrementAdults = () => {
    if (tempAdults < 9) setTempAdults(tempAdults + 1);
  };

  const decrementAdults = () => {
    if (tempAdults > 1) setTempAdults(tempAdults - 1);
  };

  const incrementChildren = () => {
    if (tempChildren < 8) setTempChildren(tempChildren + 1);
  };

  const decrementChildren = () => {
    if (tempChildren > 0) setTempChildren(tempChildren - 1);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-surface transition-colors',
          'hover:border-primary hover:bg-surface-alt',
          compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'
        )}
      >
        <Users className="w-4 h-4 text-text-secondary" />
        <span className="text-text-primary font-medium">
          {total} {compact ? '' : `passenger${total > 1 ? 's' : ''}`}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-text-secondary transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-surface rounded-xl shadow-dropdown border border-border z-50 overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Adults */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">Adults</div>
                <div className="text-xs text-text-muted">Age 12+</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decrementAdults}
                  disabled={tempAdults <= 1}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                    tempAdults <= 1
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-primary text-primary hover:bg-primary-light'
                  )}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-semibold text-text-primary">
                  {tempAdults}
                </span>
                <button
                  type="button"
                  onClick={incrementAdults}
                  disabled={tempAdults >= 9}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                    tempAdults >= 9
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-primary text-primary hover:bg-primary-light'
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Children */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">Children</div>
                <div className="text-xs text-text-muted">Age 2-11</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decrementChildren}
                  disabled={tempChildren <= 0}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                    tempChildren <= 0
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-primary text-primary hover:bg-primary-light'
                  )}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-semibold text-text-primary">
                  {tempChildren}
                </span>
                <button
                  type="button"
                  onClick={incrementChildren}
                  disabled={tempChildren >= 8}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                    tempChildren >= 8
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-primary text-primary hover:bg-primary-light'
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <div className="px-4 py-3 bg-gray-50 border-t border-border">
            <button
              type="button"
              onClick={handleApply}
              disabled={tempAdults === adults && tempChildren === children}
              className={cn(
                'w-full py-2 rounded-lg font-medium transition-colors',
                tempAdults === adults && tempChildren === children
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
              )}
            >
              Update Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerSelector;
