'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation, LOCALES, type Locale } from '@/i18n'

const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇦🇷',
  pt: '🇧🇷',
  en: '🇺🇸',
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5 text-slate-600 hover:text-slate-900" aria-label="Cambiar idioma">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline text-xs font-medium">
            {LOCALE_FLAGS[locale]} {locale.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={locale === loc.code ? 'bg-emerald-50 text-emerald-700 font-medium' : ''}
          >
            <span className="mr-2">{LOCALE_FLAGS[loc.code]}</span>
            {loc.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
