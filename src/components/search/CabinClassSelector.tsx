import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown, Check, Armchair } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { CabinClass } from '../../hooks/useFlightSearchParams';

interface CabinClassSelectorProps {
  value: CabinClass;
  onChange: (value: CabinClass) => void;
  compact?: boolean;
  className?: string;
}

const CabinClassSelector: React.FC<CabinClassSelectorProps> = ({
  value,
  onChange,
  compact = false,
  className,
}) => {
  const { t } = useTranslation();

  const CABIN_OPTIONS: { value: CabinClass; labelKey: string; shortLabelKey: string }[] = [
    { value: 'economy', labelKey: 'cabinSelector.economy', shortLabelKey: 'cabinSelector.economyShort' },
    { value: 'premium_economy', labelKey: 'cabinSelector.premiumEconomy', shortLabelKey: 'cabinSelector.premiumEconomyShort' },
    { value: 'business', labelKey: 'cabinSelector.business', shortLabelKey: 'cabinSelector.businessShort' },
    { value: 'first', labelKey: 'cabinSelector.firstClass', shortLabelKey: 'cabinSelector.firstClassShort' },
  ];

  const currentOption = CABIN_OPTIONS.find(opt => opt.value === value) || CABIN_OPTIONS[0];

  return (
    <Menu as="div" className={cn('relative', className)}>
      <Menu.Button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface border border-border rounded-button hover:border-text-muted transition-colors">
        <Armchair className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">{compact ? t(currentOption.shortLabelKey) : t(currentOption.labelKey)}</span>
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
        <Menu.Items className="absolute right-0 z-50 mt-2 w-52 origin-top-right dropdown-menu">
          <div className="p-1">
            <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              {t('cabinSelector.cabinClass')}
            </div>
            {CABIN_OPTIONS.map((option) => (
              <Menu.Item key={option.value}>
                {({ active }) => (
                  <button
                    onClick={() => onChange(option.value)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors',
                      active ? 'bg-surface-alt' : '',
                      value === option.value ? 'bg-primary/5' : ''
                    )}
                  >
                    <span className={cn(
                      'font-medium',
                      value === option.value ? 'text-primary' : 'text-text-primary'
                    )}>
                      {t(option.labelKey)}
                    </span>
                    {value === option.value && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default CabinClassSelector;
