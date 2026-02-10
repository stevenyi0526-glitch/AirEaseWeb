import React, { useState, useRef, useEffect } from 'react';
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

const SUGGESTED_QUERIES = [
  "Find me the cheapest flight from Hong Kong to Tokyo next weekend",
  "I need a comfortable morning flight to Singapore tomorrow",
  "What's the fastest way to get from London to New York on Friday?",
  "Book 2 adults and 1 child to Paris in business class",
];

const AISearchDialog: React.FC<AISearchDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
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
      setError('Sorry, I encountered an error. Please try again.');
      const errorMessage: AIConversationMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Could you please try again?',
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
      morning: '🌅 Morning (6am-12pm)',
      afternoon: '☀️ Afternoon (12pm-6pm)',
      evening: '🌆 Evening (6pm-10pm)',
      night: '🌙 Night (10pm-6am)',
      any: '🕐 Any time',
    };
    return labels[pref] || pref;
  };

  const getCabinLabel = (cabin: string) => {
    const labels: Record<string, string> = {
      economy: 'Economy',
      premium_economy: 'Premium Economy',
      business: 'Business',
      first: 'First Class',
    };
    return labels[cabin] || cabin;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      cheapest: '💰 Cheapest',
      fastest: '⚡ Fastest',
      most_comfortable: '✨ Most Comfortable',
      best_value: '🎯 Best Value',
      balanced: '⚖️ Balanced',
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-gradient-to-r from-primary/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">AirEase AI Assistant</h2>
              <p className="text-sm text-text-secondary">Tell me about your ideal flight</p>
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
                  <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-2xl p-6 border border-primary/10">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-text-primary leading-relaxed">
                          Hi! I'm your AI flight search assistant. Tell me where you want to go
                          and I'll help you find the perfect flight. You can describe your trip
                          naturally, like:
                        </p>
                        <ul className="mt-3 space-y-2 text-text-secondary text-sm">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            "Find me a morning flight from Hong Kong to Shanghai next Friday"
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            "I need the cheapest business class to London for 2 adults"
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            "What's the most comfortable direct flight to Tokyo?"
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Queries */}
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-3">Try asking:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {SUGGESTED_QUERIES.map((query, idx) => (
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
                        : 'bg-gradient-to-br from-primary to-purple-500'
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-surface-alt rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-text-secondary">Thinking...</span>
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
                  placeholder="Describe your ideal flight..."
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
                Search Parameters
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Route */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Route
                </label>
                <div className="bg-surface rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-success" />
                    <span className={cn(
                      'text-sm',
                      currentParams.departure_city ? 'text-text-primary' : 'text-text-muted italic'
                    )}>
                      {currentParams.departure_city || 'Departure city not set'}
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
                      {currentParams.arrival_city || 'Arrival city not set'}
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
                  Date
                </label>
                <div className="bg-surface rounded-xl p-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className={cn(
                    'text-sm',
                    currentParams.date ? 'text-text-primary' : 'text-text-muted italic'
                  )}>
                    {currentParams.date
                      ? new Date(currentParams.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Date not set'}
                  </span>
                </div>
              </div>

              {/* Time Preference */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Time Preference
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
                  Passengers
                </label>
                <div className="bg-surface rounded-xl p-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-text-primary">
                    {currentParams.passengers.adults} Adult{currentParams.passengers.adults !== 1 ? 's' : ''}
                    {currentParams.passengers.children > 0 && `, ${currentParams.passengers.children} Child${currentParams.passengers.children !== 1 ? 'ren' : ''}`}
                    {currentParams.passengers.infants > 0 && `, ${currentParams.passengers.infants} Infant${currentParams.passengers.infants !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Cabin Class */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Cabin Class
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
                  Stops
                </label>
                <div className="bg-surface rounded-xl p-3">
                  <span className="text-sm text-text-primary">
                    {currentParams.max_stops === 0
                      ? 'Direct flights only'
                      : currentParams.max_stops === 1
                      ? 'Max 1 stop'
                      : currentParams.max_stops === 2
                      ? 'Max 2 stops'
                      : 'Any number of stops'}
                  </span>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Priority
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
                  <p className="text-xs font-medium text-warning mb-2">Missing information:</p>
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
                    ? 'bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                    : 'bg-surface-alt text-text-muted cursor-not-allowed'
                )}
              >
                <Plane className="w-5 h-5" />
                Search Flights
              </button>
              {!isSearchComplete(currentParams) && (
                <p className="text-xs text-text-muted text-center mt-2">
                  Complete all required fields to search
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
