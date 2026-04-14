import React, { useState } from 'react';
import { Lock, Loader2, Eye, EyeOff, ShieldAlert, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

interface PasswordUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PasswordUpdateModal: React.FC<PasswordUpdateModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { clearPasswordUpdateRequired, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const requirements = [
    { key: 'pwReqLength', met: newPassword.length > 8 },
    { key: 'pwReqUpper', met: /[A-Z]/.test(newPassword) },
    { key: 'pwReqLower', met: /[a-z]/.test(newPassword) },
    { key: 'pwReqNumber', met: /[0-9]/.test(newPassword) },
  ];
  const allMet = requirements.every(r => r.met);

  const handleClose = () => {
    // User refused to update password — force logout
    logout();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allMet) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch', 'Passwords do not match.'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('auth.newPasswordMustDiffer', 'New password must be different from current password.'));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
      clearPasswordUpdateRequired();
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || t('auth.failedChangePassword'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('auth.passwordUpdateRequired', 'Password Update Required')}</h2>
          <p className="text-gray-500 mt-1 text-sm">
            {t('auth.passwordUpdateDesc', 'Your password does not meet our new security requirements. Please update it to continue using AirEase.')}
          </p>
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-left text-xs">
            <p className="font-semibold mb-1 text-gray-700">{t('auth.passwordRequirements', 'Password requirements:')}</p>
            <ul className="space-y-0.5">
              {requirements.map((req) => (
                <li key={req.key} className={`flex items-center gap-1.5 ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                  {req.met ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <span className="w-3.5 h-3.5 flex-shrink-0 inline-flex items-center justify-center">•</span>}
                  {t(`auth.${req.key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {success ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">
            {t('auth.passwordChanged', 'Password updated successfully!')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.currentPassword', 'Current Password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.newPassword', 'New Password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.confirmPassword', 'Confirm New Password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !allMet}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('auth.updating', 'Updating...')}
                </>
              ) : (
                t('auth.updatePassword', 'Update Password')
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('auth.skipAndLogout', 'Skip & Log out')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordUpdateModal;
