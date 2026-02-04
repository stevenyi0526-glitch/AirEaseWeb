/**
 * AirEase - Feedback Modal Component
 * 反馈与纠错管理弹窗
 */

import { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { ReportCategory, ReportCreate } from '../../api/reports';
import { REPORT_CATEGORIES, submitReport } from '../../api/reports';

interface FlightInfo {
  id?: string;
  airline?: string;
  flightNumber?: string;
  route?: string;
  date?: string;
  aircraftModel?: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightInfo?: FlightInfo;
  userEmail?: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  flightInfo,
  userEmail: initialEmail = '',
}: FeedbackModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState<ReportCategory>('other');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Manual flight info input (when not provided via props)
  const [manualFlightNumber, setManualFlightNumber] = useState('');
  const [manualAirline, setManualAirline] = useState('');
  const [manualRoute, setManualRoute] = useState('');
  const [manualDate, setManualDate] = useState('');

  // Determine if we have pre-filled flight info
  const hasPrefilledFlightInfo = !!flightInfo;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !content) {
      setErrorMessage('Please fill in your email and feedback content');
      setSubmitStatus('error');
      return;
    }

    if (content.length < 10) {
      setErrorMessage('Feedback content must be at least 10 characters');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Use prefilled flight info or manual input
      const finalFlightInfo = hasPrefilledFlightInfo ? {
        airline: flightInfo.airline,
        flightNumber: flightInfo.flightNumber,
        route: flightInfo.route,
        date: flightInfo.date,
        aircraftModel: flightInfo.aircraftModel,
      } : (manualFlightNumber || manualAirline || manualRoute || manualDate) ? {
        flightNumber: manualFlightNumber || undefined,
        airline: manualAirline || undefined,
        route: manualRoute || undefined,
        date: manualDate || undefined,
      } : undefined;

      const reportData: ReportCreate = {
        userEmail: email,
        category,
        content,
        flightId: flightInfo?.id,
        flightInfo: finalFlightInfo,
      };

      await submitReport(reportData);
      setSubmitStatus('success');
      
      // Reset form after success
      setTimeout(() => {
        setEmail(initialEmail);
        setCategory('other');
        setContent('');
        setSubmitStatus('idle');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit report:', error);
      setErrorMessage('Submission failed. Please try again later.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubmitStatus('idle');
      setErrorMessage('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Feedback & Report</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-sm text-white/80 mt-1">
            Report data issues or suggest improvements
          </p>
        </div>

        {/* Flight Info Banner (if provided via props) */}
        {hasPrefilledFlightInfo && (
          <div className="bg-blue-50 dark:bg-blue-900/30 px-6 py-3 border-b border-blue-100 dark:border-blue-800">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Related Flight: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {flightInfo.flightNumber && `${flightInfo.flightNumber} `}
                {flightInfo.airline && `(${flightInfo.airline}) `}
                {flightInfo.route && `• ${flightInfo.route}`}
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="We'll use this to respond to your feedback"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-400"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Flight Info Input (only when not prefilled) */}
          {!hasPrefilledFlightInfo && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Flight Information <span className="text-gray-400 font-normal">(optional)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={manualFlightNumber}
                    onChange={(e) => setManualFlightNumber(e.target.value)}
                    placeholder="Flight # (e.g., CA123)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder:text-gray-400"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={manualAirline}
                    onChange={(e) => setManualAirline(e.target.value)}
                    placeholder="Airline"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder:text-gray-400"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={manualRoute}
                    onChange={(e) => setManualRoute(e.target.value)}
                    placeholder="Route (e.g., HKG → PVG)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder:text-gray-400"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    onFocus={(e) => (e.target.type = 'date')}
                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                    placeholder="Flight Date"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder:text-gray-400"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Issue Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Please describe the issue or suggestion in detail (minimum 10 characters)..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-400 resize-none"
              required
              minLength={10}
              maxLength={2000}
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-400 text-right mt-1">
              {content.length}/2000
            </div>
          </div>

          {/* Status Messages */}
          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Submitted successfully! Thank you for your feedback.</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || submitStatus === 'success'}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 
                     bg-gradient-to-r from-blue-600 to-purple-600 
                     hover:from-blue-700 hover:to-purple-700
                     text-white font-medium rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : submitStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Submitted
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Feedback
              </>
            )}
          </button>

          {/* Privacy Note */}
          <p className="text-xs text-center text-gray-400">
            Your feedback helps us improve. We'll respond via email.
          </p>
        </form>
      </div>
    </div>
  );
}
