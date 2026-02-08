import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2, Briefcase, Users, GraduationCap, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserLabel } from '../../api/types';
import { cn } from '../../utils/cn';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const labels: { value: UserLabel; label: string; icon: typeof Briefcase; description: string }[] = [
  { value: 'business', label: 'Business', icon: Briefcase, description: 'Prioritize comfort & time' },
  { value: 'family', label: 'Family', icon: Users, description: 'Focus on safety & value' },
  { value: 'student', label: 'Student', icon: GraduationCap, description: 'Budget-friendly options' },
];

type Step = 'form' | 'verify';

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { register, verifyEmail, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<UserLabel>('business');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Verification step state
  const [step, setStep] = useState<Step>('form');
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
      setStep('form');
      setVerificationCode(['', '', '', '', '', '']);
      setError('');
      setResendCooldown(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 1: Submit registration form → sends verification email
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await register({ email, username, password, label: selectedLabel });
      setExpiresIn(response.expiresInMinutes);
      setStep('verify');
      setResendCooldown(30);
      // Focus first code input after transition
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit verification code → completes registration
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await verifyEmail(email, code);
      // Success! AuthContext now has token/user set. Close modal.
      onClose();
      setEmail('');
      setUsername('');
      setPassword('');
      setSelectedLabel('business');
      setStep('form');
      setVerificationCode(['', '', '', '', '', '']);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Invalid verification code. Please try again.');
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsLoading(true);

    try {
      const response = await resendVerification(email);
      setExpiresIn(response.expiresInMinutes);
      setResendCooldown(30);
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle individual digit input for verification code
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only

    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1); // only last character
    setVerificationCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newCode.every(d => d !== '')) {
      setTimeout(() => handleVerifyCode(), 150);
    }
  };

  // Handle backspace in code inputs
  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste of full code
  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = [...verificationCode];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setVerificationCode(newCode);

    // Focus the next empty or last input
    const nextEmpty = newCode.findIndex(d => d === '');
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();

    // Auto-submit if all 6 filled
    if (newCode.every(d => d !== '')) {
      setTimeout(() => handleVerifyCode(), 150);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
              <p className="text-gray-500 mt-1">Sign up to unlock all flight results</p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Choose a username"
                    minLength={3}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Create a password"
                    minLength={6}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
              </div>

              {/* Travel Profile Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I travel as...
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {labels.map(({ value, label, icon: Icon, description }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedLabel(value)}
                      className={cn(
                        'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                        selectedLabel === value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <Icon className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-gray-500 text-center mt-0.5 hidden sm:block">
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending verification code...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-airease-blue font-medium hover:underline"
              >
                Sign in
              </button>
            </div>
          </>
        ) : (
          /* ========== STEP 2: Verification Code Input ========== */
          <>
            {/* Back button */}
            <button
              onClick={() => { setStep('form'); setError(''); }}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
              <p className="text-gray-500 mt-2 text-sm">
                We sent a 6-digit code to<br />
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Code expires in {expiresIn} minutes
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
                {error}
              </div>
            )}

            {/* 6-digit code input boxes */}
            <div className="flex justify-center gap-2 mb-6" onPaste={handleCodePaste}>
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className={cn(
                    'w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all',
                    digit
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 focus:border-primary focus:bg-primary/5'
                  )}
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyCode}
              disabled={isLoading || verificationCode.some(d => d === '')}
              className="w-full btn-primary flex items-center justify-center gap-2 mb-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Create Account'
              )}
            </button>

            {/* Resend Code */}
            <div className="text-center text-sm text-gray-500">
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                className={cn(
                  'font-medium inline-flex items-center gap-1',
                  resendCooldown > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-airease-blue hover:underline'
                )}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterModal;
