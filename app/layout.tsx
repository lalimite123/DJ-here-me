import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from './AuthProvider'
import { LanguageProvider } from './i18n/LanguageProvider'
import TopBar from './TopBar'

export const metadata: Metadata = {
  title: 'Hear Me DJ',
  description: 'DJ ve dinleyiciler için gerçek zamanlı etkileşim platformu',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="font-sans">
        <LanguageProvider>
          <AuthProvider>
            <TopBar />
            <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
              {children}
            </main>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}