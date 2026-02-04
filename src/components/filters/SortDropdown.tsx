import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown, Check, Award, DollarSign, Clock, Plane } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { SortBy } from '../../hooks/useFlightSearchParams';

interface SortOption {
  value: SortBy;
  label: string;
  description: string;
  icon: typeof Award;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'score', label: 'AirEase Score', description: 'Best overall experience', icon: Award },
  { value: 'price', label: 'Lowest Price', description: 'Most affordable first', icon: DollarSign },
  { value: 'duration', label: 'Shortest Flight', description: 'Quickest journey time', icon: Clock },
  { value: 'departure', label: 'Earliest Departure', description: 'Morning flights first', icon: Plane },
  { value: 'arrival', label: 'Earliest Arrival', description: 'Land sooner', icon: Plane },
];

interface SortDropdownProps {
  value: SortBy;
  onChange: (value: SortBy) => void;
  className?: string;
}

/**
 * Enhanced Sort dropdown component with icons and descriptions
 */
const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  className,
}) => {
  const currentOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  return (
    <Menu as="div" className={cn('relative', className)}>
      <Menu.Button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border rounded-button hover:border-text-muted transition-colors">
        <CurrentIcon className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">{currentOption.label}</span>
        <ChevronDown className="w-4 h-4" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-64 origin-top-right dropdown-menu">
          <div className="p-1">
            <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Sort Results By
            </div>
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Menu.Item key={option.value}>
                  {({ active }) => (
                    <button
                      onClick={() => onChange(option.value)}
                      className={cn(
                        'flex items-start gap-3 w-full px-3 py-2.5 rounded-lg transition-colors',
                        active ? 'bg-surface-alt' : '',
                        value === option.value
                          ? 'bg-primary/5'
                          : ''
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5 mt-0.5 flex-shrink-0',
                        value === option.value ? 'text-primary' : 'text-text-muted'
                      )} />
                      <div className="flex-1 text-left">
                        <div className={cn(
                          'text-sm font-medium',
                          value === option.value ? 'text-primary' : 'text-text-primary'
                        )}>
                          {option.label}
                        </div>
                        <div className="text-xs text-text-muted">
                          {option.description}
                        </div>
                      </div>
                      {value === option.value && (
                        <Check className="w-4 h-4 text-primary mt-0.5" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default SortDropdown;
