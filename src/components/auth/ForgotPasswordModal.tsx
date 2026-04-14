import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, Lock, Loader2, ArrowLeft, RefreshCw, KeyRound, CheckCircle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

type Step = 'email' | 'verify' | 'success';

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [expiresIn, setExpiresIn] = useState(10);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('email');
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode(['', '', '', '', '', '']);
      setError('');
      setResendCooldown(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const requirements = [
    { key: 'pwReqLength', met: newPassword.length > 8 },
    { key: 'pwReqUpper', met: /[A-Z]/.test(newPassword) },
    { key: 'pwReqLower', met: /[a-z]/.test(newPassword) },
    { key: 'pwReqNumber', met: /[0-9]/.test(newPassword) },
  ];
  const allMet = requirements.every(r => r.met);

  // Step 1: Submit email to get reset code
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      setExpiresIn(response.expiresInMinutes);
      setStep('verify');
      setResendCooldown(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || t('auth.failedSendResetCode'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit code + new password
  const handleResetPassword = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError(t('auth.enterFullCodeBeforeReset'));
      return;
    }
    if (!allMet) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await authApi.resetPassword(email, code, newPassword);
      setStep('success');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || t('auth.invalidOrExpiredCode'));
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      setExpiresIn(response.expiresInMinutes);
      setResendCooldown(30);
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || t('auth.failedResendCode'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle individual digit input
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newCode = [...verificationCode];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setVerificationCode(newCode);
    const nextEmpty = newCode.findIndex(d => d === '');
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Step 1: Enter Email ── */}
        {step === 'email' && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('auth.forgotPasswordTitle')}</h2>
              <p className="text-gray-500 mt-1">{t('auth.forgotPasswordDesc')}</p>
            </div>

            <form onSubmit={handleSubmitEmail} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder={t('auth.emailPlaceholder')}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />{t('auth.sending')}</>
                ) : (
                  t('auth.sendResetCode')
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              {t('auth.rememberPassword')}{' '}
              <button onClick={onSwitchToLogin} className="text-airease-blue font-medium hover:underline">
                {t('auth.signInLink')}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Enter Code + New Password ── */}
        {step === 'verify' && (
          <>
            <div className="text-center mb-6">
              <button
                onClick={() => { setStep('email'); setError(''); }}
                className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('auth.checkEmail')}</h2>
              <p className="text-gray-500 mt-1">
                {t('auth.checkEmailDesc')} <span className="font-medium text-gray-700">{email}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{t('auth.codeExpires', { minutes: expiresIn })}</p>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* 6-digit code input */}
            <div className="flex gap-2 justify-center mb-4" onPaste={handleCodePaste}>
              {verificationCode.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-gray-900"
                />
              ))}
            </div>

            {/* New password fields */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.newPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder={t('auth.newPasswordPlaceholder')}
                  />
                </div>
              </div>

              {/* Password requirements checklist */}
              {newPassword.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg text-xs">
                  <p className="font-semibold mb-1 text-gray-700">{t('auth.passwordRequirements')}</p>
                  <ul className="space-y-0.5">
                    {requirements.map((req) => (
                      <li key={req.key} className={`flex items-center gap-1.5 ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                        {req.met ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <span className="w-3.5 h-3.5 flex-shrink-0 inline-flex items-center justify-center">•</span>}
                        {t(`auth.${req.key}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleResetPassword}
              disabled={isLoading || !allMet}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{t('auth.resetting')}</>
              ) : (
                t('auth.resetPassword')
              )}
            </button>

            {/* Resend */}
            <div className="mt-4 text-center">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? t('auth.resendIn', { seconds: resendCooldown }) : t('auth.resendCode')}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Success ── */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.passwordReset')}</h2>
            <p className="text-gray-500 mb-6">
              {t('auth.passwordResetDesc')}
            </p>
            <button
              onClick={() => { onClose(); onSwitchToLogin(); }}
              className="w-full btn-primary"
            >
              {t('auth.signIn')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
