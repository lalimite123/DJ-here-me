"use client"

import { signIn } from "next-auth/react"
import { useLanguage } from "../i18n/LanguageProvider"

export default function SignInPage() {
  const { t } = useLanguage()

  return (
    <div className="page-shell">
      <div className="absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute top-20 right-0 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[55%_45%] lg:items-center">
          <div className="space-y-6 lg:pr-10">
            <span className="badge">{t("signinBadge")}</span>
            <h1 className="hero-title bg-gradient-to-r from-fuchsia-300 via-purple-300 to-indigo-300 text-transparent bg-clip-text">
              {t("signinTitle")}
            </h1>
            <p className="text-2xl sm:text-3xl text-slate-200">{t("signinSubtitle")}</p>

            <div className="space-y-4 text-slate-200 text-xl sm:text-2xl">
              <p>{t("signinBodyPrimary")}</p>
              <p>{t("signinBodySecondary")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card-glass p-5">
                <p className="text-sm text-slate-400 mb-2">{t("signinFeatureTitle")}</p>
                <p className="text-base text-slate-100 font-semibold">{t("signinFeatureHighlight")}</p>
              </div>
              <div className="card-glass p-5">
                <p className="text-sm text-slate-400 mb-2">{t("signinFeatureTitleAlt")}</p>
                <p className="text-base text-slate-100 font-semibold">{t("signinFeatureHighlightAlt")}</p>
              </div>
            </div>
          </div>

          <div className="card-glass p-8">
            <h2 className="text-2xl font-semibold mb-3">{t("signinCardTitle")}</h2>
            <p className="text-slate-300 mb-6">{t("signinCardSubtitle")}</p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="btn-primary w-full"
            >
              {t("djSignIn")}
            </button>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => signIn("credentials", { email: "test@dj.com", callbackUrl: "/dashboard" })}
                className="btn-secondary w-full mt-4 bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
              >
                🛠️ Mode Dev: Se connecter (Test DJ)
              </button>
            )}
            <p className="mt-4 text-xs text-slate-400">{t("signinNote")}</p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="section-title mb-6 text-center">{t("howItWorksTitle")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-glass p-6 how-card">
              <div className="badge mb-4">1</div>
              <h3 className="text-lg font-semibold mb-2">{t("howStep1Title")}</h3>
              <p className="text-sm text-slate-300">{t("howStep1Body")}</p>
              <div className="mt-6 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <span className="block h-full w-1/3 rounded-full bg-fuchsia-500 how-bar" />
              </div>
            </div>
            <div className="card-glass p-6 how-card">
              <div className="badge mb-4">2</div>
              <h3 className="text-lg font-semibold mb-2">{t("howStep2Title")}</h3>
              <p className="text-sm text-slate-300">{t("howStep2Body")}</p>
              <div className="mt-6 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 how-ping" />
                <span className="text-xs text-slate-400">{t("howStep2Pulse")}</span>
              </div>
            </div>
            <div className="card-glass p-6 how-card">
              <div className="badge mb-4">3</div>
              <h3 className="text-lg font-semibold mb-2">{t("howStep3Title")}</h3>
              <p className="text-sm text-slate-300">{t("howStep3Body")}</p>
              <div className="mt-6 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">▶</span>
                <span className="text-xs text-slate-400">{t("howStep3Slide")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
