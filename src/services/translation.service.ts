import { Injectable, signal, effect, computed } from '@angular/core';
import { Language } from '../models';

// Import translation files
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';
import { ku_sorani } from '../i18n/ku_sorani';
import { ku_badini } from '../i18n/ku_badini';

type Translations = typeof en;

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private selectedLanguage = signal<Language | null>(null);
  private translations = signal<Translations>(en);
  private rtlLanguages: Language[] = ['ar', 'ku_sorani'];

  isRtl = computed(() => {
    const lang = this.selectedLanguage();
    return lang ? this.rtlLanguages.includes(lang) : false;
  });

  constructor() {
    // This effect runs whenever the selected language changes.
    effect(() => {
      const lang = this.selectedLanguage();
      this.loadTranslations(lang);
      
      // Set document direction for RTL support
      if (lang && this.rtlLanguages.includes(lang)) {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = lang;
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = lang || 'en';
      }
    });
  }

  setLanguage(language: Language | null): void {
    this.selectedLanguage.set(language);
  }

  private loadTranslations(language: Language | null): void {
    let newTranslations: Translations;
    switch (language) {
      case 'ar':
        newTranslations = this.mergeTranslations(en, ar);
        break;
      case 'ku_sorani':
        newTranslations = this.mergeTranslations(en, ku_sorani);
        break;
      case 'ku_badini':
        newTranslations = this.mergeTranslations(en, ku_badini);
        break;
      default:
        newTranslations = en;
        break;
    }
    this.translations.set(newTranslations);
  }

  // Deep merge to ensure English is used as a fallback for any missing keys.
  private mergeTranslations(target: any, source: any): Translations {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeTranslations(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }


  /**
   * Translates a given key into the currently selected language.
   * Supports nested keys (e.g., 'admin.panelTitle') and dynamic parameters.
   * @param key The key of the translation string.
   * @param params An object of parameters to replace in the string (e.g., { name: 'World' } for 'Hello, {{name}}').
   * @returns The translated string.
   */
  translate(key: string, params?: { [key: string]: string | number }): string {
    const keys = key.split('.');
    let result: any = this.translations();
    
    // Traverse nested keys
    for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
            console.warn(`Translation key not found: ${key}`);
            return key; // Return the key itself as a fallback
        }
    }
    
    let translatedString = String(result);

    // Replace dynamic parameters
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translatedString = translatedString.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(paramValue));
      }
    }

    return translatedString;
  }
}