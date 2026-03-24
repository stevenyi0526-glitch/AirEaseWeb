// Date and time formatters
import i18n from '../i18n';

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const lang = i18n.language;
  if (lang === 'zh-TW') {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'CNY' ? 'USD' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const getScoreColor = (score: number): string => {
  if (score >= 85) return 'score-badge-excellent';
  if (score >= 70) return 'score-badge-good';
  if (score >= 50) return 'score-badge-fair';
  return 'score-badge-poor';
};

export const getScoreBgColor = (score: number): string => {
  if (score >= 85) return 'bg-score-excellent';
  if (score >= 70) return 'bg-score-good';
  if (score >= 50) return 'bg-score-fair';
  return 'bg-score-poor';
};

export const formatDateForApi = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return i18n.t('home.greeting.morning');
  if (hour < 18) return i18n.t('home.greeting.afternoon');
  return i18n.t('home.greeting.evening');
};
