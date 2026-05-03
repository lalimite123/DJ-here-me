"use client"

import { useLanguage } from "../../i18n/LanguageProvider"

export default function AdminHeader() {
  const { t } = useLanguage()

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
        {t('adminThemesTitle')} <span className="text-purple-500">{t('adminThemesSubtitle')}</span>
      </h1>
      <p className="text-gray-400">{t('adminThemesDesc')}</p>
    </div>
  )
}
