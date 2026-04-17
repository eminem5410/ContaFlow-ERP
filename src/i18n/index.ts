import { useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'

export type Locale = 'es' | 'pt' | 'en'

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'es', label: 'Espanol', flag: 'AR' },
  { code: 'pt', label: 'Portugues', flag: 'BR' },
  { code: 'en', label: 'English', flag: 'US' },
]

export const DEFAULT_LOCALE: Locale = 'es'

const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Espanol',
  pt: 'Portugues',
  en: 'English',
}

// Static imports for all locales — guaranteed to work with ESM/Turbopack
// Total payload: ~40KB (negligible)
import esData from './locales/es.json'
import enData from './locales/en.json'
import ptData from './locales/pt.json'

const ALL_TRANSLATIONS: Record<Locale, Record<string, unknown>> = {
  es: esData,
  en: enData,
  pt: ptData,
}

// Nested key accessor: "accounts.title" → translations.accounts.title
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path // fallback: return the key itself
    }
  }
  return typeof current === 'string' ? current : path
}

/**
 * Custom i18n hook for ContaFlow.
 * Uses Zustand store to persist locale preference.
 * All locale data is loaded statically — no async loading, no F5 issues.
 *
 * Usage:
 *   const { t, locale, setLocale, formatDate } = useTranslation()
 *   <h1>{t('accounts.title')}</h1>
 *   <p>{t('common.save')}</p>
 */
export function useTranslation() {
  const locale = (useAppStore((s) => s.locale) || DEFAULT_LOCALE) as Locale
  const setLocaleStore = useAppStore((s) => s.setLocale)

  // Select translations synchronously from static imports
  const translations = useMemo(() => {
    return ALL_TRANSLATIONS[locale] || ALL_TRANSLATIONS[DEFAULT_LOCALE]
  }, [locale])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let value = getNestedValue(translations as Record<string, unknown>, key)

      // Replace variables: {{count}} → actual value
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        }
      }

      return value
    },
    [translations],
  )

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleStore(newLocale)
    },
    [setLocaleStore],
  )

  const getLocaleLabel = useCallback(
    (loc?: Locale) => LOCALE_LABELS[loc || locale],
    [locale],
  )

  return {
    t,
    locale,
    setLocale,
    getLocaleLabel,
    /** Format a number as ARS currency */
    formatCurrency: (amount: number) =>
      new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
      }).format(amount),
    /** Format a date string */
    formatDate: (dateStr: string) =>
      new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(dateStr)),
  }
}

export type TranslationHook = ReturnType<typeof useTranslation>
