/**
 * Helpers shared across auth modals to defensively read error responses
 * and to validate an email address strictly (TLD required).
 */

/**
 * Extract a string error message from an unknown error thrown by axios.
 *
 * FastAPI returns 422 validation errors with `detail` shaped as an array of
 * objects (e.g. `[{ msg, loc, type }]`), not a string. Passing such a value
 * straight into React state caused blank pages when something later tried to
 * render it (Bug 2548057). This helper always returns a plain string and
 * falls back to a translated default.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { detail?: unknown; message?: unknown } };
    message?: string;
  };
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // Pydantic-style: [{msg, loc, type}, ...]
    const first = detail[0] as { msg?: unknown; message?: unknown };
    const msg = (first?.msg ?? first?.message);
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  const message = e?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof e?.message === 'string' && e.message.trim()) return e.message;
  return fallback;
}

/**
 * Strict email validator used by login/registration/forgot-password.
 *
 * Rejects values that the HTML5 `type="email"` widget incorrectly accepts,
 * such as `user@com` (no TLD) or `user@.qq.com` (leading dot in domain).
 * This is the frontend half of the fix for Bug 2548057.
 *
 * Returns null when valid, otherwise an i18n-friendly error key string the
 * caller can pass through `t()`.
 */
export function validateEmailFormat(email: string): string | null {
  const v = email.trim();
  if (!v) return 'auth.emailRequired';
  // Local part: 1+ chars not containing @ or whitespace
  // Domain: at least one label, then '.', then a TLD of length >= 2
  // Disallow leading/trailing dots in any label.
  const re = /^[^\s@]+@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
  if (!re.test(v)) return 'auth.invalidEmailFormat';
  return null;
}
