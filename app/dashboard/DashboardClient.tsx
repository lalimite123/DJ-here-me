"use client"

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Session } from 'next-auth'
import { useLanguage } from '../i18n/LanguageProvider'

// Session tipi genişletme
interface ExtendedSession extends Session {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isAdmin?: boolean;
    settings?: {
      artistName?: string;
      // Diğer ayarlar
    } | null;
  } & Record<string, unknown>;
}

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const extendedSession = session as ExtendedSession;
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage()

  useEffect(() => {
    if (status !== 'loading') {
      setLoading(false);
    }
  }, [status]);

  if (loading) {
    return <div className="container mx-auto px-4 py-10">{t('loading')}</div>;
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-slate-300">{t('mustSignIn')}</p>
        <Link 
          href="/signin"
          className="mt-6 btn-primary"
        >
          {t('signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10">
        <div>
          <p className="text-sm text-slate-400">{t('welcome')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold">{t('dashboardTitle')}</h1>
        </div>
        <button 
          onClick={() => {
            window.location.href = '/api/auth/signout?callbackUrl=/';
          }}
          className="btn-secondary"
        >
          {t('signOut')}
        </button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-glass p-7">
          <h2 className="section-title mb-4">{t('activeShow')}</h2>
          <p className="text-slate-300 mb-6">{t('noActiveShow')}</p>
          <Link 
            href="/dashboard/start-show"
            className="btn-primary"
          >
            {t('startShow')}
          </Link>
        </div>
        
        <div className="card-glass p-7">
          <h2 className="section-title mb-5">{t('djProfile')}</h2>
          <div className="space-y-2 mb-6 text-slate-300">
            <p><span className="font-semibold text-slate-100">{t('name')}:</span> {extendedSession.user?.name || 'N/A'}</p>
            <p><span className="font-semibold text-slate-100">{t('email')}:</span> {extendedSession.user?.email || 'N/A'}</p>
            <p><span className="font-semibold text-slate-100">{t('stageName')}:</span> {extendedSession.user?.settings?.artistName || t('notSet')}</p>
          </div>
          <div className="flex flex-col gap-4">
            <Link 
              href="/dashboard/settings"
              className="btn-secondary"
            >
              {t('profileSettings')}
            </Link>
            <Link 
              href="/dashboard/stats" 
              className="btn-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('statsEarnings')}
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-8 card-glass p-7">
        <h2 className="section-title mb-4">{t('pastShows')}</h2>
        <p className="text-slate-300">{t('noPastShows')}</p>
      </div>

      {extendedSession.user?.isAdmin && (
        <div className="mt-8 card-glass p-7 border-purple-500/50 border">
          <h2 className="section-title mb-4 text-purple-400">Section Administrateur</h2>
          <p className="text-slate-300 mb-4">Gérez le catalogue global des thèmes vidéo et des animations.</p>
          <Link 
            href="/dashboard/admin"
            className="btn-primary bg-purple-600 hover:bg-purple-700"
          >
            Accéder au Theme Manager
          </Link>
        </div>
      )}
    </div>
  );
}