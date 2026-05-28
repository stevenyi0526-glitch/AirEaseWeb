import type { TFunction } from 'i18next';
import type { ScoreExplanation } from '../api/types';

// Fallback titles per dimension when backend ships an explanation without an
// i18nKey. Without this, hover tooltips render the backend's English (or
// hard-coded simplified Chinese) title verbatim, leaking untranslated text
// like "Airline Reliability" or "Value for Money" in zh-TW / other locales.
const DIMENSION_TITLE_FALLBACK_KEYS: Record<string, string> = {
  safety: 'detail.scoreDimSafety',
  reliability: 'detail.scoreDimReliability',
  comfort: 'detail.scoreDimComfort',
  service: 'detail.scoreDimService',
  value: 'detail.scoreDimValue',
  amenities: 'detail.scoreDimAmenities',
  efficiency: 'detail.scoreDimEfficiency',
};

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
    // No i18n key — try to at least translate the dimension-name title via the
    // standard detail.scoreDim* keys so users don't see raw English nouns.
    const dimKey = (exp.dimension || '').toLowerCase();
    const fallbackTitleKey = DIMENSION_TITLE_FALLBACK_KEYS[dimKey];
    const title = fallbackTitleKey
      ? t(fallbackTitleKey, { defaultValue: exp.title })
      : exp.title;
    return { title, detail: exp.detail };
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
