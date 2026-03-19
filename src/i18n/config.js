import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import hi from '../locales/hi.json';

const LANGUAGE_STORAGE_KEY = '@coral_clash_language';

// Get device language using Intl API (works without native rebuild)
const getDeviceLanguage = () => {
  try {
    // Use Intl.NumberFormat to get locale
    const locale = Intl.NumberFormat().resolvedOptions().locale;
    console.log('Device locale detected:', locale);

    // Extract language code (e.g., 'en-US' -> 'en', 'hi-IN' -> 'hi')
    const languageCode = locale.split('-')[0].toLowerCase();

    // Map device language to supported languages
    const supportedLanguages = ['en', 'hi'];
    return supportedLanguages.includes(languageCode) ? languageCode : 'en';
  } catch (error) {
    console.error('Error detecting device language:', error);
    return 'en';
  }
};

// Language detector plugin
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      // Try to get stored language preference first
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLanguage) {
        console.log('Using stored language:', storedLanguage);
        return callback(storedLanguage);
      }

      // Fall back to device locale
      const detectedLanguage = getDeviceLanguage();
      console.log('Using detected language:', detectedLanguage);
      callback(detectedLanguage);
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      console.log('Caching language:', language);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Error caching language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
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
