import { en } from './locales/en'
import { ptBR } from './locales/pt-BR'

export type Locale = 'en' | 'pt-BR'
export type TranslationKey = keyof typeof en
export type TranslationKeyMap = Record<TranslationKey, string>

const dictionaries: Record<Locale, TranslationKeyMap> = {
  en,
  'pt-BR': ptBR,
}

export function detectLocale(languages: readonly string[] = navigator.languages): Locale {
  const normalized = languages.map((language) => language.toLowerCase())
  if (normalized.some((language) => language === 'pt-br' || language.startsWith('pt-'))) {
    return 'pt-BR'
  }
  return 'en'
}

export function t(
  locale: Locale,
  key: TranslationKey,
  values: Record<string, string> = {},
): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key]
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value),
    template,
  )
}

export function translationKeys(locale: Locale): string[] {
  return Object.keys(dictionaries[locale]).sort()
}
