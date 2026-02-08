import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Settings, Heart, Users, Briefcase, GraduationCap, ChevronDown, Check, KeyRound, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';
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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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

            {/* Change Password */}
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-gray-400" />
              <span className="flex-1 text-left text-sm">Change Password</span>
              <ChevronDown className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                showChangePassword && 'rotate-180'
              )} />
            </button>

            {showChangePassword && (
              <div className="px-3 py-3 bg-gray-50 mx-2 rounded-lg mb-2 space-y-2">
                {pwError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-green-600 text-xs">
                    {pwSuccess}
                  </div>
                )}
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-gray-900"
                />
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-gray-900"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-gray-900"
                />
                <button
                  onClick={async () => {
                    setPwError('');
                    setPwSuccess('');
                    if (!currentPassword) { setPwError('Enter current password'); return; }
                    if (newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return; }
                    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
                    setPwLoading(true);
                    try {
                      await authApi.changePassword(currentPassword, newPassword);
                      setPwSuccess('Password changed successfully!');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setTimeout(() => { setPwSuccess(''); setShowChangePassword(false); }, 2000);
                    } catch (err: unknown) {
                      const error = err as { response?: { data?: { detail?: string } } };
                      setPwError(error.response?.data?.detail || 'Failed to change password');
                    } finally {
                      setPwLoading(false);
                    }
                  }}
                  disabled={pwLoading}
                  className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Changing...</> : 'Update Password'}
                </button>
              </div>
            )}
          </div>

          {/* Logout & Delete Account */}
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

            {/* Delete Account */}
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-red-400 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Delete Account</span>
            </button>

            {showDeleteConfirm && (
              <div className="px-3 py-3 bg-red-50 mx-2 rounded-lg mb-2 space-y-2">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ This will permanently delete your account and all data. This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs">
                    {deleteError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                    className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setDeleteLoading(true);
                      setDeleteError('');
                      try {
                        await authApi.deleteAccount();
                        logout();
                        setIsOpen(false);
                      } catch (err: unknown) {
                        const error = err as { response?: { data?: { detail?: string } } };
                        setDeleteError(error.response?.data?.detail || 'Failed to delete account');
                      } finally {
                        setDeleteLoading(false);
                      }
                    }}
                    disabled={deleteLoading}
                    className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</> : 'Delete Forever'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
