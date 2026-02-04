import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, Briefcase, Users, GraduationCap } from 'lucide-react';
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

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<UserLabel>('business');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register({ email, username, password, label: selectedLabel });
      onClose();
      setEmail('');
      setUsername('');
      setPassword('');
      setSelectedLabel('business');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
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

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-500 mt-1">Sign up to unlock all flight results</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                Creating account...
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
      </div>
    </div>
  );
};

export default RegisterModal;
