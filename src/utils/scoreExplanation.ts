import type { TFunction } from 'i18next';
import type { ScoreExplanation } from '../api/types';

/**
 * Render a localized title + detail for a score explanation.
 *
 * The backend may attach an `i18nKey` (e.g. "scoreExplain.seatPitch") plus
 * `i18nParams` describing the data points. Some params are themselves keys
 * pointing to a localized fragment — by convention any param whose name ends
 * in "Key" is looked up via `t()` before being substituted.
 *
 * Falls back to the English `title` / `detail` shipped by the backend when
 * no `i18nKey` is provided, or when the key is missing from the locale.
 */
export function renderScoreExplanation(
  exp: ScoreExplanation,
  t: TFunction,
): { title: string; detail: string } {
  if (!exp.i18nKey) {
    return { title: exp.title, detail: exp.detail };
  }

  const titleKey = `${exp.i18nKey}.title`;
  const detailKey = `${exp.i18nKey}.detail`;

  // Resolve any *Key params via t() so the detail string can compose.
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(exp.i18nParams ?? {})) {
    if (k.endsWith('Key') && typeof v === 'string') {
      const newKey = k.slice(0, -3); // "qualityKey" → "quality"
      params[newKey] = t(v, { defaultValue: v });
    } else {
      params[k] = v;
    }
  }

  const translatedTitle = t(titleKey, { defaultValue: exp.title });
  const translatedDetail = t(detailKey, { ...params, defaultValue: exp.detail });
  return { title: translatedTitle, detail: translatedDetail };
}
