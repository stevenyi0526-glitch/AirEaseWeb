import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import zhTW from './zh-TW';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      'zh-TW': zhTW,
    },
    lng: 'zh-TW', // Default to Traditional Chinese
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
  });

export default i18n;
