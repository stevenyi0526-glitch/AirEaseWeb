import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Settings, Heart, Users, Briefcase, GraduationCap, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserLabel } from '../../api/types';
import { cn } from '../../utils/cn';

interface UserProfileDropdownProps {
  isHomePage?: boolean;
}

const labelConfig: Record<UserLabel, { icon: typeof Briefcase; label: string; color: string; bgColor: string }> = {
  business: { icon: Briefcase, label: 'Business', color: 'text-blue-600 bg-blue-100', bgColor: 'bg-blue-500' },
  family: { icon: Users, label: 'Family', color: 'text-green-600 bg-green-100', bgColor: 'bg-emerald-500' },
  student: { icon: GraduationCap, label: 'Student', color: 'text-purple-600 bg-purple-100', bgColor: 'bg-purple-500' },
};

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ isHomePage = false }) => {
  const { user, updateUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLabelPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const currentLabel = (user.label as UserLabel) || 'business';
  const LabelIcon = labelConfig[currentLabel].icon;

  const handleLabelChange = async (newLabel: UserLabel) => {
    if (newLabel === currentLabel || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateUser({ label: newLabel });
      setShowLabelPicker(false);
    } catch (error) {
      console.error('Failed to update label:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          isHomePage
            ? 'text-white hover:bg-white/10'
            : 'text-text-primary hover:bg-surface-alt'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isHomePage ? 'bg-white/20' : 'bg-primary-light'
        )}>
          <User className={cn(
            'w-4 h-4',
            isHomePage ? 'text-white' : 'text-primary'
          )} />
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="font-medium text-sm">{user.username}</span>
          <span className={cn(
            'text-xs flex items-center gap-1',
            isHomePage ? 'text-white/70' : 'text-text-muted'
          )}>
            <LabelIcon className="w-3 h-3" />
            {labelConfig[currentLabel].label}
          </span>
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900">{user.username}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            
            {/* Current Label Badge with distinct colors */}
            <div className={cn(
              'inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold text-white',
              currentLabel === 'business' && 'bg-blue-500',
              currentLabel === 'family' && 'bg-emerald-500',
              currentLabel === 'student' && 'bg-purple-500'
            )}>
              <LabelIcon className="w-3 h-3" />
              {labelConfig[currentLabel].label} Traveler
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Change Label */}
            <button
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="flex-1 text-left text-sm">Change Travel Profile</span>
              <ChevronDown className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                showLabelPicker && 'rotate-180'
              )} />
            </button>

            {/* Label Picker */}
            {showLabelPicker && (
              <div className="px-2 py-2 bg-gray-50 mx-2 rounded-lg mb-2">
                {(Object.keys(labelConfig) as UserLabel[]).map((label) => {
                  const config = labelConfig[label];
                  const isSelected = label === currentLabel;
                  return (
                    <button
                      key={label}
                      onClick={() => handleLabelChange(label)}
                      disabled={isUpdating}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mb-1.5 last:mb-0',
                        isSelected 
                          ? 'bg-white shadow-md ring-2 ring-offset-1' 
                          : 'hover:bg-white/70 hover:shadow-sm',
                        isSelected && label === 'business' && 'ring-blue-500',
                        isSelected && label === 'family' && 'ring-emerald-500',
                        isSelected && label === 'student' && 'ring-purple-500',
                        isUpdating && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {/* Colored icon background */}
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        label === 'business' && 'bg-blue-500',
                        label === 'family' && 'bg-emerald-500',
                        label === 'student' && 'bg-purple-500'
                      )}>
                        <config.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className={cn('text-sm block', isSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {label === 'business' && 'Prioritize reliability & service'}
                          {label === 'family' && 'Prioritize comfort & service'}
                          {label === 'student' && 'Prioritize price & value'}
                        </span>
                      </div>
                      {isSelected && <Check className={cn(
                        'w-5 h-5',
                        label === 'business' && 'text-blue-500',
                        label === 'family' && 'text-emerald-500',
                        label === 'student' && 'text-purple-500'
                      )} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Favorites */}
            <Link
              to="/favorites"
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Heart className="w-4 h-4 text-gray-400" />
              <span className="text-sm">My Favorites</span>
            </Link>

            {/* Travelers */}
            <Link
              to="/travelers"
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Saved Travelers</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-1 mt-1">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
