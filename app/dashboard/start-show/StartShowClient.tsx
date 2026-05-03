"use client"

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSession } from 'next-auth/react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../i18n/LanguageProvider'
import Pusher from 'pusher-js'

type LiveMessage = {
  id: string
  displayName: string
  content: string
  createdAt: string
  takeoverVideoId?: string | null
  emoji3D?: string | null
  duration?: number
}

type Theme = {
  id: string
  name: string
  description: string | null
  thumbnailUrl: string | null
  backgroundVideoUrl: string
  takeovers: ThemeVideo[]
}

type ThemeVideo = {
  id: string
  name: string
  price: number
  videoUrl: string
}

export default function StartShowClient() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { t, locale } = useLanguage()

  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedThemeId, setSelectedThemeId] = useState<string>('')
  
  const [showActive, setShowActive] = useState(false)
  const [showId, setShowId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUrl, setShowUrl] = useState('')
  const [micError, setMicError] = useState<string | null>(null)

  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [displayQueue, setDisplayQueue] = useState<LiveMessage[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeMessage, setActiveMessage] = useState<LiveMessage | null>(null)

  const [spectatorTakeoverUrl, setSpectatorTakeoverUrl] = useState<string | null>(null)
  const takeoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })

  // --- AUDIO REACTIVITY ---
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioLoopRef = useRef<number | null>(null)
  const [audioVisualizerActive, setAudioVisualizerActive] = useState(false)
  const [audioData, setAudioData] = useState({ bass: 0, mids: 0, highs: 0 })

  useEffect(() => {
    fetchThemes()
    
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/admin/themes')
      const data = await res.json()
      if (Array.isArray(data)) {
        setThemes(data)
        if (data.length > 0) setSelectedThemeId(data[0].id)
      } else {
        setThemes([])
      }
    } catch (err) {
      console.error('Erreur chargement thèmes', err)
      setThemes([])
    }
  }

  const fetchMessages = async () => {
    if (!showId) return
    try {
      const response = await fetch(`/api/shows/${showId}/messages`)
      if (!response.ok) return
      const data = await response.json()
      if (Array.isArray(data)) setMessages(data as LiveMessage[])
    } catch {}
  }

  // Lancement du Micro pour réactivité audio (Optionnel)
  const startAudio = async () => {
    if (audioVisualizerActive) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      micStreamRef.current = stream
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = context
      const source = context.createMediaStreamSource(stream)
      sourceNodeRef.current = source
      
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      
      setAudioVisualizerActive(true)
      setMicError(null)

      const loop = () => {
        if (!analyserRef.current) return
        const bins = analyserRef.current.frequencyBinCount
        const data = new Uint8Array(bins)
        analyserRef.current.getByteFrequencyData(data)

        const bassEnd = Math.max(1, Math.floor(bins * 0.05))
        let sumBass = 0; for (let i = 0; i < bassEnd; i++) sumBass += data[i]
        
        const midEnd = Math.max(bassEnd + 1, Math.floor(bins * 0.4))
        let sumMids = 0; for (let i = bassEnd; i < midEnd; i++) sumMids += data[i]
          
        let sumHighs = 0; for (let i = midEnd; i < bins; i++) sumHighs += data[i]

        setAudioData({
          bass: (sumBass / bassEnd) / 255,
          mids: (sumMids / (midEnd - bassEnd)) / 255,
          highs: (sumHighs / (bins - midEnd)) / 255
        })
        audioLoopRef.current = requestAnimationFrame(loop)
      }
      loop()
    } catch (err: any) {
      console.error('Audio error:', err)
      setMicError('Microphone non disponible.')
    }
  }

  const stopAudio = () => {
    if (audioLoopRef.current) cancelAnimationFrame(audioLoopRef.current)
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop())
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close()
    setAudioVisualizerActive(false)
  }

  useEffect(() => {
    if (!showId) return

    // On définit tout de suite une URL par défaut (ça évite que le QR code ne s'affiche jamais si le WebRTC échoue)
    setShowUrl(`${window.location.origin}/send/${showId}`)

    const getLocalIpAddress = async () => {
      try {
        const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        if (!isLocalhost) return // En production, l'origine par défaut suffit

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
        pc.createDataChannel('')
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        
        // Timeout pour éviter de bloquer indéfiniment si pas de réponse STUN
        const ip = await Promise.race([
          new Promise<string>((resolve) => {
            pc.onicecandidate = (event) => {
              if (!event.candidate) return
              const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/
              const ipAddress = ipRegex.exec(event.candidate.candidate)?.[1]
              if (ipAddress) resolve(ipAddress)
            }
          }),
          new Promise<string>((resolve) => setTimeout(() => resolve(''), 2000))
        ])
        
        pc.close()
        if (ip) {
          setShowUrl(`http://${ip}:3000/send/${showId}`)
        }
      } catch (e) {
        console.error('Impossible de récupérer IP locale', e)
      }
    }
    
    getLocalIpAddress()

    // Polling initial + Pusher
    fetchMessages()
    const polling = setInterval(fetchMessages, 5000)
    
    // Initialisation de Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "123", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu"
    });
    const channel = pusher.subscribe(`show-${showId}`);
    channel.bind('new-message', (newMessage: LiveMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });

    return () => {
      clearInterval(polling)
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [showId])

  useEffect(() => {
    const now = Date.now()
    const normalized = [...messages]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const displayable = normalized.filter((msg) => {
      const msgDurationMs = (msg.duration || 5) * 1000
      return now - new Date(msg.createdAt).getTime() <= msgDurationMs
    })
    
    setDisplayQueue(displayable)
    setActiveIndex((prev) => (displayable.length === 0 ? 0 : Math.min(prev, displayable.length - 1)))
  }, [messages])

  useEffect(() => {
    if (!showActive || displayQueue.length === 0) {
      setActiveMessage(null)
      return
    }
    const currentMsg = displayQueue[activeIndex % displayQueue.length]
    const msgDurationMs = (currentMsg.duration || 5) * 1000
    
    setActiveMessage(currentMsg)

    // Gestion du Takeover (Vidéo achetée par le client)
    if (currentMsg.takeoverVideoId) {
      const currentTheme = themes.find(t => t.id === selectedThemeId)
      const takeover = currentTheme?.takeovers.find(tk => tk.id === currentMsg.takeoverVideoId)
      if (takeover) {
        setSpectatorTakeoverUrl(takeover.videoUrl)
        if (takeoverTimeoutRef.current) clearTimeout(takeoverTimeoutRef.current)
        takeoverTimeoutRef.current = setTimeout(() => setSpectatorTakeoverUrl(null), msgDurationMs)
      }
    }
  }, [displayQueue, activeIndex, showActive, selectedThemeId, themes])

  const startShow = async () => {
    if (!selectedThemeId) return alert(t('adminThemesChooseTheme'))
    setLoading(true)
    try {
      const response = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Show - ${new Date().toLocaleString(locale)}`,
          themeId: selectedThemeId
        })
      })
      if (!response.ok) return alert(t('showStartError'))
      const data = await response.json()
      setShowId(data.id)
      setShowActive(true)
      startAudio() // Tente de démarrer le micro pour les vibrations vidéo
    } catch {
      alert(t('showStartError'))
    } finally {
      setLoading(false)
    }
  }

  const endShow = async () => {
    if (!showId) return
    setLoading(true)
    try {
      await fetch(`/api/shows/${showId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, endedAt: new Date().toISOString() })
      })
      stopAudio()
      setShowActive(false)
      setShowId('')
      setShowUrl('')
      setMessages([])
      setDisplayQueue([])
      router.push('/dashboard')
    } catch {
      alert(t('showEndError'))
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">{t('loading')}</div>
  if (!session) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
      <p>{t('mustSignIn')}</p>
      <Link href="/signin" className="mt-4 bg-purple-600 px-4 py-2 rounded">{t('signIn')}</Link>
    </div>
  )

  const qrSize = Math.max(182, Math.floor(Math.min(windowSize.height * 0.295, windowSize.width * 0.32, 340)))
  const isDesktop = windowSize.width >= 1024
  const qrReservePx = isDesktop && showActive ? qrSize + 120 : 0
  const messageScale = 1.0

  const messageNameStyle: CSSProperties = { fontSize: `${Math.max(15, Math.round(30 * messageScale))}px` }
  const messageTextStyle: CSSProperties = { fontSize: `${Math.max(24, Math.round(74 * messageScale))}px`, lineHeight: 1.08 }

  const messageStageStyle: CSSProperties = isDesktop
    ? { left: '50%', top: '74%', width: `${Math.max(340, windowSize.width - qrReservePx - 64)}px`, maxWidth: 'min(88vw, 1400px)', paddingLeft: '18px', paddingRight: '18px', transform: 'translate(-50%, -50%)' }
    : { left: '50%', top: '74%', width: '94vw', paddingLeft: '14px', paddingRight: '14px', transform: 'translate(-50%, -50%)' }

  const qrPanelStyle: CSSProperties = { top: 'max(5.6rem, calc(env(safe-area-inset-top, 0px) + 0.4rem))', right: 'max(0.55rem, calc(env(safe-area-inset-right, 0px) + 0.35rem))' }

  // EFFET AUDIO CSS SUR LA VIDÉO (Scale sur les basses, luminosité sur les mediums)
  const videoAudioStyle: CSSProperties = {
    transform: `scale(${1 + audioData.bass * 0.05})`,
    filter: `brightness(${1 + audioData.mids * 0.3})`,
    transition: 'transform 0.05s ease-out, filter 0.05s ease-out'
  }

  const currentTheme = themes.find(t => t.id === selectedThemeId)

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      
      {/* BACKGROUND VIDÉO (Base ou Takeover) */}
      {showActive && currentTheme && (
        <video 
          key={spectatorTakeoverUrl ? 'takeover' : 'background'} // Force le rechargement de la vidéo quand ça change
          src={spectatorTakeoverUrl || currentTheme.backgroundVideoUrl} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={videoAudioStyle}
        />
      )}

      {/* --- DASHBOARD DJ AVANT LE LANCEMENT (SELECTION DU THEME) --- */}
      {!showActive && (
        <div className="absolute inset-0 z-50 bg-gray-900 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-2">{t('startShowChooseThemeTitle')}</h1>
            <p className="text-gray-400 mb-8">{t('startShowChooseThemeDesc')}</p>

            {themes.length === 0 ? (
              <div className="bg-gray-800 p-8 rounded-xl text-center">
                <p className="text-gray-400 mb-4">{t('startShowNoThemes')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
                {themes.map(theme => (
                  <div 
                    key={theme.id}
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`cursor-pointer rounded-xl overflow-hidden border-4 transition-all ${selectedThemeId === theme.id ? 'border-purple-500 scale-105 shadow-2xl shadow-purple-500/50' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <div className="relative h-48 bg-gray-800">
                      {theme.thumbnailUrl ? (
                        <img src={theme.thumbnailUrl} alt={theme.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">{t('adminThemesNoThumbnail')}</div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-4">
                        <h3 className="text-white font-bold">{theme.name}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={startShow}
              disabled={loading || !selectedThemeId}
              className="w-full max-w-md mx-auto block bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-full text-xl shadow-lg transition-transform hover:scale-105"
            >
              {loading ? t('loading') : t('startShow')}
            </button>
          </div>
        </div>
      )}

      {/* --- AFFICHAGE DU SHOW ACTIF --- */}
      {showActive && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Overlay gradient pour mieux lire le texte */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* QR CODE */}
          {showUrl && (
            <div className="absolute z-30 transition-all duration-1000 ease-out p-4 md:p-6 bg-black/40 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col items-center pointer-events-auto" style={qrPanelStyle}>
              <div className="bg-white p-3 md:p-4 rounded-xl shadow-inner transition-transform duration-700 hover:scale-105">
                <QRCodeSVG value={showUrl} size={qrSize} level="H" includeMargin={false} />
              </div>
              <p className="mt-3 md:mt-4 text-white/90 text-sm md:text-base font-medium tracking-wide text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                {t('scanToSend')}
              </p>
            </div>
          )}

          {/* MESSAGE */}
          {activeMessage && (
            <div className="absolute z-40 flex flex-col items-center justify-center transition-all duration-500 ease-out" style={messageStageStyle}>
              <div className="animate-message-slide-up text-center w-full">
                <div className="inline-flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-xl mb-4 md:mb-6">
                  <span className="text-purple-400 font-bold tracking-wider uppercase" style={messageNameStyle}>
                    {activeMessage.displayName}
                  </span>
                </div>
                <h2 className="text-white font-black tracking-tight" style={{ ...messageTextStyle, textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                  {activeMessage.content}
                </h2>
              </div>
            </div>
          )}

          {/* EMOJI FLOTTANT (Si applicable) */}
          {activeMessage?.emoji3D && (
            <div className="absolute top-1/4 left-1/4 text-9xl animate-bounce">
              {activeMessage.emoji3D}
            </div>
          )}

          {/* BOUTON QUITTER */}
          <button 
            onClick={endShow}
            className="absolute top-6 left-6 z-50 bg-red-600/80 hover:bg-red-600 text-white px-6 py-2 rounded-full backdrop-blur-md transition-all pointer-events-auto"
          >
            {t('endShow')}
          </button>
        </div>
      )}
    </div>
  )
}
