"use client"

import Link from 'next/link';
import { useLanguage } from './i18n/LanguageProvider'

export default function Home() {
  const { t } = useLanguage()

  return (
    <div className="page-shell">
      <div className="absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute top-20 right-0 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative container mx-auto px-4 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <span className="badge mb-6">{t('homeBadge')}</span>
          <h1 className="hero-title mb-6 bg-gradient-to-r from-fuchsia-400 via-purple-300 to-indigo-300 text-transparent bg-clip-text">
            Hear Me DJ
          </h1>
          <p className="hero-subtitle mb-10">{t('homeSubtitle')}</p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signin"
              className="btn-primary"
            >
              {t('djSignIn')}
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          <div className="card-glass p-6">
            <p className="text-lg font-semibold mb-2">{t('featureRealtimeTitle')}</p>
            <p className="text-sm text-slate-400">{t('featureRealtimeDesc')}</p>
          </div>
          <div className="card-glass p-6">
            <p className="text-lg font-semibold mb-2">{t('featureFilterTitle')}</p>
            <p className="text-sm text-slate-400">{t('featureFilterDesc')}</p>
          </div>
          <div className="card-glass p-6">
            <p className="text-lg font-semibold mb-2">{t('featureEarningsTitle')}</p>
            <p className="text-sm text-slate-400">{t('featureEarningsDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}