"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLanguage } from "./i18n/LanguageProvider"

const languageOptions = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français"
} as const

export default function TopBar() {
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()

  if (pathname?.startsWith("/dashboard/start-show")) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-base sm:text-lg font-semibold text-white">
          Hear Me DJ
        </Link>
        <div className="flex items-center gap-2">
          <label htmlFor="language" className="text-xs sm:text-sm text-slate-300">
            {t("languageLabel")}
          </label>
          <select
            id="language"
            value={lang}
            onChange={(event) => setLang(event.target.value as keyof typeof languageOptions)}
            className="lang-select"
          >
            {Object.entries(languageOptions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}
