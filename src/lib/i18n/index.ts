import { SupportedLanguage } from '@/types/airqua';
import { EN_TRANSLATIONS } from './en';
import { TA_TRANSLATIONS } from './ta';
import { TranslationDictionary, Translations } from './types';

export type { Translations, TranslationDictionary } from './types';

export const DICTIONARY: TranslationDictionary = {
  en: EN_TRANSLATIONS,
  ta: TA_TRANSLATIONS,
};

/**
 * Returns the localized UI dictionary for the active language (`en` or `ta`).
 */
export function getDictionary(lang: SupportedLanguage): Translations {
  return DICTIONARY[lang] || DICTIONARY.en;
}
