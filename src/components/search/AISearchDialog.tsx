import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  Plane,
  Calendar,
  Users,
  Clock,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  sendMessageToGemini,
  isSearchComplete,
  convertToSearchParams,
} from '../../api/gemini';
import type { AIConversationMessage, AISearchParams } from '../../api/gemini';

interface AISearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_PARAMS: AISearchParams = {
  departure_city: '',
  departure_city_code: '',
  arrival_city: '',
  arrival_city_code: '',
  date: '',
  return_date: undefined,
  time_preference: 'any',
  passengers: { adults: 1, children: 0, infants: 0 },
  cabin_class: 'economy',
  max_stops: null,
  priority: 'balanced',
  additional_requirements: [],
  is_complete: false,
  missing_fields: ['departure_city', 'arrival_city', 'date'],
};

const AISearchDialog: React.FC<AISearchDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AIConversationMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentParams, setCurrentParams] = useState<AISearchParams>(INITIAL_PARAMS);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setCurrentParams(INITIAL_PARAMS);
      setInputValue('');
      setError(null);
    }
  }, [isOpen]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: AIConversationMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessageToGemini(message, messages);
      
      const assistantMessage: AIConversationMessage = {
        role: 'assistant',
        content: response.message,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentParams(response.search_params);
    } catch (err) {
      console.error('Error:', err);
      setError(t('aiDialog.errorMessage'));
      const errorMessage: AIConversationMessage = {
        role: 'assistant',
        content: t('aiDialog.errorApology'),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!isSearchComplete(currentParams)) return;

    const searchParams = convertToSearchParams(currentParams);
    const params = new URLSearchParams({
      from: searchParams.from,
      to: searchParams.to,
      date: searchParams.date,
      cabin: searchParams.cabin,
      adults: searchParams.adults.toString(),
      children: searchParams.children.toString(),
    });

    if (searchParams.stops !== null) {
      params.set('stops', searchParams.stops.toString());
    }

    // Mark this as an AI search for query-based recommendations
    params.set('aiSearch', '1');
    params.set('aiTimePreference', searchParams.timePreference || 'any');
    // Map the priority to a sort_by value for the recommendation engine
    const priorityToSortBy: Record<string, string> = {
      cheapest: 'price',
      fastest: 'duration',
      most_comfortable: 'comfort',
      best_value: 'price',
      balanced: 'score',
    };
    params.set('aiSortBy', priorityToSortBy[searchParams.priority] || 'score');
    // Also set sortBy for the flight list ordering
    params.set('sortBy', priorityToSortBy[searchParams.priority] || 'score');

    // Build a summary of the conversation as the AI query
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    if (userMessages.length > 0) {
      params.set('aiQuery', userMessages.join(' → '));
    }

    // Apply time filter based on preference
    if (searchParams.timePreference && searchParams.timePreference !== 'any') {
      const timeRanges: Record<string, [string, string]> = {
        morning: ['6', '12'],
        afternoon: ['12', '18'],
        evening: ['18', '22'],
        night: ['22', '6'],
      };
      const range = timeRanges[searchParams.timePreference];
      if (range) {
        params.set('depMin', range[0]);
        params.set('depMax', range[1]);
      }
    }

    onClose();
    navigate(`/flights?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const getTimePreferenceLabel = (pref: string) => {
    const labels: Record<string, string> = {
      morning: t('aiDialog.timeMorning'),
      afternoon: t('aiDialog.timeAfternoon'),
      evening: t('aiDialog.timeEvening'),
      night: t('aiDialog.timeNight'),
      any: t('aiDialog.timeAny'),
    };
    return labels[pref] || pref;
  };

  const getCabinLabel = (cabin: string) => {
    const labels: Record<string, string> = {
      economy: t('aiDialog.cabinEconomy'),
      premium_economy: t('aiDialog.cabinPremiumEconomy'),
      business: t('aiDialog.cabinBusiness'),
      first: t('aiDialog.cabinFirst'),
    };
    return labels[cabin] || cabin;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      cheapest: t('aiDialog.priorityCheapest'),
      fastest: t('aiDialog.priorityFastest'),
      most_comfortable: t('aiDialog.priorityComfortable'),
      best_value: t('aiDialog.priorityBestValue'),
      balanced: t('aiDialog.priorityBalanced'),
    };
    return labels[priority] || priority;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-4xl h-[85vh] bg-surface rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-200 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('aiDialog.title')}</h2>
              <p className="text-sm text-text-secondary">{t('aiDialog.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-alt transition-colors"
          >
            <X className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome Message */}
              {messages.length === 0 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-200 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-text-primary leading-relaxed">
                          {t('aiDialog.welcomeMessage')}
                        </p>
                        <ul className="mt-3 space-y-2 text-text-secondary text-sm">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            {t('aiDialog.example1')}
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            {t('aiDialog.example2')}
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            {t('aiDialog.example3')}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Queries */}
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-3">{t('aiDialog.tryAsking')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        t('aiDialog.suggestedQuery1'),
                        t('aiDialog.suggestedQuery2'),
                        t('aiDialog.suggestedQuery3'),
                        t('aiDialog.suggestedQuery4'),
                      ].map((query, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(query)}
                          className="text-left p-3 rounded-xl border border-divider hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-text-secondary hover:text-text-primary"
                        >
                          "{query}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-3',
                    msg.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      msg.role === 'user'
                        ? 'bg-primary'
                        : 'bg-gradient-to-br from-blue-500 to-blue-200'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <Users className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-surface-alt text-text-primary rounded-tl-sm'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-200 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-surface-alt rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-text-secondary">{t('aiDialog.thinking')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 text-danger">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-divider bg-surface">
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('aiDialog.inputPlaceholder')}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-alt border border-divider focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-text-primary placeholder:text-text-muted"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    'p-3 rounded-xl transition-all',
                    inputValue.trim() && !isLoading
                      ? 'bg-primary text-white hover:bg-primary-hover shadow-lg'
                      : 'bg-surface-alt text-text-muted cursor-not-allowed'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Search Parameters Panel */}
          <div className="w-80 border-l border-divider bg-surface-alt/50 flex flex-col">
            <div className="p-4 border-b border-divider">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" />
                {t('aiDialog.searchParameters')}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Route */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {t('aiDialog.route')}
                </label>
                <div className="bg-surface rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-success" />
                    <span className={cn(
                      'text-sm',
                      currentParams.departure_city ? 'text-text-primary' : 'text-text-muted italic'
                    )}>
                      {currentParams.departure_city || t('aiDialog.departureCityNotSet')}
                    </span>
                    {currentParams.departure_city_code && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {currentParams.departure_city_code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-danger" />
                    <span className={cn(
                      'text-sm',
                      currentParams.arrival_city ? 'text-text-primary' : 'text-text-muted italic'
                    )}>
                      {currentParams.arrival_city || t('aiDialog.arrivalCityNotSet')}
                    </span>
                    {currentParams.arrival_city_code && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {currentParams.arrival_city_code}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {t('aiDialog.date')}
                </label>
                <div className="bg-surface rounded-xl p-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className={cn(
                    'text-sm',
                    currentParams.date ? 'text-text-primary' : 'text-text-muted italic'
                  )}>
                    {currentParams.date
                      ? new Date(currentParams.date).toLocaleDateString('zh-TW', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : t('aiDialog.dateNotSet')}
                  </span>
                </div>
              </div>

              {/* Time Preference */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {t('aiDialog.timePreference')}
                </label>
                <div className="bg-surface rounded-xl p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm text-text-primary">
                    {getTimePreferenceLabel(currentParams.time_preference)}
                  </span>
                </div>
              </div>

              {/* Passengers */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {t('aiDialog.passengers')}
                </label>
                <div className="bg-surface rounded-xl p-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-text-primary">
                    {currentParams.passengers.adults !== 1
                      ? t('aiDialog.adultCountPlural', { count: currentParams.passengers.adults })
                      : t('aiDialog.adultCount', { count: currentParams.passengers.adults })}
                    {currentParams.passengers.children > 0 && (currentParams.passengers.children !== 1
                      ? t('aiDialog.childCountPlural', { count: currentParams.passengers.children })
                      : t('aiDialog.childCount', { count: currentParams.passengers.children }))}
                    {currentParams.passengers.infants > 0 && (currentParams.passengers.infants !== 1
                      ? t('aiDialog.infantCountPlural', { count: currentParams.passengers.infants })
                      : t('aiDialog.infantCount', { count: currentParams.passengers.infants }))}
                  </span>
                </div>
              </div>

              {/* Cabin Class */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {t('aiDialog.cabinClass')}
                </label>
                <div className="bg-surface rounded-xl p-3">
                  <span className="text-sm text-text-primary capitalize">
                    {getCabinLabel(currentParams.cabin_class)}
                  </span>
                </div>
              </div>

              {/* Stops */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {t('aiDialog.stops')}
                </label>
                <div className="bg-surface rounded-xl p-3">
                  <span className="text-sm text-text-primary">
                    {currentParams.max_stops === 0
                      ? t('aiDialog.directOnly')
                      : currentParams.max_stops === 1
                      ? t('aiDialog.maxStops1')
                      : currentParams.max_stops === 2
                      ? t('aiDialog.maxStops2')
                      : t('aiDialog.anyStops')}
                  </span>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {t('aiDialog.priority')}
                </label>
                <div className="bg-surface rounded-xl p-3">
                  <span className="text-sm text-text-primary">
                    {getPriorityLabel(currentParams.priority)}
                  </span>
                </div>
              </div>

              {/* Missing Fields */}
              {currentParams.missing_fields.length > 0 && !currentParams.is_complete && (
                <div className="bg-warning/10 rounded-xl p-3">
                  <p className="text-xs font-medium text-warning mb-2">{t('aiDialog.missingInfo')}</p>
                  <ul className="text-xs text-text-secondary space-y-1">
                    {currentParams.missing_fields.map((field, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-warning" />
                        {field.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Search Button */}
            <div className="p-4 border-t border-divider">
              <button
                onClick={handleSearch}
                disabled={!isSearchComplete(currentParams)}
                className={cn(
                  'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
                  isSearchComplete(currentParams)
                    ? 'bg-blue-500 text-white shadow-lg hover:shadow-xl hover:bg-blue-600 hover:scale-[1.02]'
                    : 'bg-surface-alt text-text-muted cursor-not-allowed'
                )}
              >
                <Plane className="w-5 h-5" />
                {t('aiDialog.searchFlights')}
              </button>
              {!isSearchComplete(currentParams) && (
                <p className="text-xs text-text-muted text-center mt-2">
                  {t('aiDialog.completeAllFields')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISearchDialog;
