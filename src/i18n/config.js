import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import pt from '../locales/pt.json';
import zh from '../locales/zh.json';
import ur from '../locales/ur.json';

// Get device language using expo-localization
const getDeviceLanguage = () => {
  try {
    // Get device locales (returns array of locale strings in order of preference)
    const locales = Localization.getLocales();
    console.log('Device locales detected:', locales);

    if (locales && locales.length > 0) {
      // Try each locale in order of preference
      for (const locale of locales) {
        const languageCode = locale.languageCode?.toLowerCase();

        // Map device language to supported languages
        const supportedLanguages = ['en', 'hi', 'fr', 'es', 'pt', 'zh', 'ur'];
        if (supportedLanguages.includes(languageCode)) {
          console.log('Matched device language:', languageCode);
          return languageCode;
        }
      }
    }

    // Default to English if no match found
    console.log('No matching language found, defaulting to English');
    return 'en';
  } catch (error) {
    console.error('Error detecting device language:', error);
    return 'en';
  }
};

// Language detector plugin - only uses OS language, no storage
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      // Always use device locale
      const detectedLanguage = getDeviceLanguage();
      console.log('Using detected OS language:', detectedLanguage);
      callback(detectedLanguage);
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: () => {
    // No-op: we don't cache language preferences anymore
    // Always follow OS language
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      fr: { translation: fr },
      es: { translation: es },
      pt: { translation: pt },
      zh: { translation: zh },
      ur: { translation: ur },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
    compatibilityJSON: 'v3', // Use v3 format for better React Native compatibility
  });

export default i18n;
