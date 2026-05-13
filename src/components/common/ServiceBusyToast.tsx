import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';

/**
 * Global gentle reminder for backend timeouts / 5xx.
 *
 * 监听 client.ts 派发的 `airease:service-busy` 事件，浮出一个右下角 toast，
 * 4 秒后自动隐藏；4 秒内若再次触发则刷新计时，避免高频请求时反复弹出新 toast。
 */
export default function ServiceBusyToast() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = () => {
      setVisible(true);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, 4000);
    };
    window.addEventListener('airease:service-busy', handler);
    return () => {
      window.removeEventListener('airease:service-busy', handler);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl bg-amber-50 border border-amber-200 shadow-lg p-3 flex items-start gap-2"
      role="status"
      aria-live="polite"
    >
      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">{t('common.serviceBusy')}</p>
        <p className="text-xs text-amber-800 mt-0.5">{t('common.serviceBusyHint')}</p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="p-0.5 text-amber-700 hover:text-amber-900 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
