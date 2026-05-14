"use client"

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSession } from 'next-auth/react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../i18n/LanguageProvider'
import Pusher from 'pusher-js'

import Orb from './animations/Orb'
import BeatSceneWrapper from './animations/BeatSceneWrapper'
import Beat2SceneWrapper from './animations/Beat2SceneWrapper'
import Disco2Wrapper from './animations/Disco2Wrapper'

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

const STATIC_THEMES: Theme[] = [
  { id: 'static-orb', name: '3D Orb (Audio React)', description: 'Génératif 3D', thumbnailUrl: null, backgroundVideoUrl: '', takeovers: [] },
  { id: 'static-beat', name: 'Beat Scene (Minimal)', description: 'SVG Reactif', thumbnailUrl: null, backgroundVideoUrl: '', takeovers: [] },
  { id: 'static-beat2', name: 'Beat 2 (Butterfly)', description: 'SVG Symétrique', thumbnailUrl: null, backgroundVideoUrl: '', takeovers: [] },
  { id: 'static-disco2', name: 'Disco Grid', description: 'Canvas Reactif', thumbnailUrl: null, backgroundVideoUrl: '', takeovers: [] },
]

export default function StartShowClient() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { t, locale } = useLanguage()

  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedThemeId, setSelectedThemeId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'static' | 'custom'>('static')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [showActive, setShowActive] = useState(false)
  const [showId, setShowId] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [showUrl, setShowUrl] = useState('')
  const [micError, setMicError] = useState<string | null>(null)

  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [displayQueue, setDisplayQueue] = useState<LiveMessage[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeMessage, setActiveMessage] = useState<LiveMessage | null>(null)

  const [spectatorTakeoverUrl, setSpectatorTakeoverUrl] = useState<string | null>(null)
  const takeoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [bgYtPlaying, setBgYtPlaying] = useState(false)
  const [tkYtPlaying, setTkYtPlaying] = useState(false)

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
        const allThemes = [...STATIC_THEMES, ...data]
        setThemes(allThemes)
        if (allThemes.length > 0) setSelectedThemeId(allThemes[0].id)
      } else {
        setThemes([...STATIC_THEMES])
        setSelectedThemeId(STATIC_THEMES[0].id)
      }
    } catch (err) {
      console.error('Erreur chargement thèmes', err)
      setThemes([...STATIC_THEMES])
      setSelectedThemeId(STATIC_THEMES[0].id)
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
    setIsPreparing(true)
    
    try {
      const isStatic = selectedThemeId.startsWith('static-')
      const response = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Show - ${new Date().toLocaleString(locale)}`,
          themeId: isStatic ? null : selectedThemeId
        })
      })
      if (!response.ok) {
        setIsPreparing(false)
        return alert(t('showStartError'))
      }
      
      const data = await response.json()
      setShowId(data.id)
      
      // On affiche le show (qui va charger l'iframe en arrière-plan sous l'overlay)
      setShowActive(true)
      startAudio() 

      // On garde l'overlay de chargement pendant 3 secondes pour laisser le temps à YouTube de bufferiser
      setTimeout(() => {
        setIsPreparing(false)
      }, 3000)

    } catch {
      setIsPreparing(false)
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

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be')
  }

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const bgVideoUrl = currentTheme?.backgroundVideoUrl || ''
  const isBgYT = isYouTubeUrl(bgVideoUrl)
  const bgYtId = isBgYT ? getYouTubeId(bgVideoUrl) : null

  const tkVideoUrl = spectatorTakeoverUrl || ''
  const isTkYT = tkVideoUrl ? isYouTubeUrl(tkVideoUrl) : false
  const tkYtId = isTkYT ? getYouTubeId(tkVideoUrl) : null

  // Ref pour injecter l'API YouTube dynamiquement
  const ytApiInjected = useRef(false)
  const bgPlayerRef = useRef<any>(null)
  const tkPlayerRef = useRef<any>(null)

  // Injecter le script YouTube IFrame API une seule fois
  useEffect(() => {
    if (showActive && (isBgYT || isTkYT) && !ytApiInjected.current) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
      } else {
        document.head.appendChild(tag)
      }
      ytApiInjected.current = true
    }
  }, [showActive, isBgYT, isTkYT])

  // Initialiser le lecteur de fond (Background) avec l'API YouTube
  useEffect(() => {
    if (!showActive || !isBgYT || !bgYtId) return;
    
    let checkYTInterval: NodeJS.Timeout;
    
    const initPlayer = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        bgPlayerRef.current = new (window as any).YT.Player('yt-bg-player', {
          videoId: bgYtId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            playlist: bgYtId, // Nécessaire pour le loop
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3
          },
          events: {
            onReady: (event: any) => {
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.PLAYING) {
                setBgYtPlaying(true);
                // Polling pour relancer la vidéo AVANT qu'elle n'atteigne la fin (Seamless Loop)
                if (checkYTInterval) clearInterval(checkYTInterval);
                checkYTInterval = setInterval(() => {
                  if (!event.target.getCurrentTime || !event.target.getDuration) return;
                  const currentTime = event.target.getCurrentTime();
                  const duration = event.target.getDuration();
                  // Si on est à moins de 0.4 secondes de la fin, on force le retour au début
                  if (duration > 0 && (duration - currentTime) <= 0.4) {
                    event.target.seekTo(0);
                  }
                }, 100);
              } else {
                if (checkYTInterval) clearInterval(checkYTInterval);
              }

              // Fallback au cas où le polling raterait
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                event.target.seekTo(0);
                event.target.playVideo();
              }
            }
          }
        });
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (checkYTInterval) clearInterval(checkYTInterval);
      if (bgPlayerRef.current && bgPlayerRef.current.destroy) {
        bgPlayerRef.current.destroy();
      }
    };
  }, [showActive, isBgYT, bgYtId]);

  // Initialiser le lecteur Takeover avec l'API YouTube
  useEffect(() => {
    if (!showActive || !spectatorTakeoverUrl || !isTkYT || !tkYtId) return;

    let checkTkYTInterval: NodeJS.Timeout;

    const initPlayer = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        tkPlayerRef.current = new (window as any).YT.Player('yt-tk-player', {
          videoId: tkYtId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            playlist: tkYtId,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3
          },
          events: {
            onReady: (event: any) => {
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.PLAYING) {
                setTkYtPlaying(true);
                if (checkTkYTInterval) clearInterval(checkTkYTInterval);
                checkTkYTInterval = setInterval(() => {
                  if (!event.target.getCurrentTime || !event.target.getDuration) return;
                  const currentTime = event.target.getCurrentTime();
                  const duration = event.target.getDuration();
                  if (duration > 0 && (duration - currentTime) <= 0.4) {
                    event.target.seekTo(0);
                  }
                }, 100);
              } else {
                if (checkTkYTInterval) clearInterval(checkTkYTInterval);
              }

              if (event.data === (window as any).YT.PlayerState.ENDED) {
                event.target.seekTo(0);
                event.target.playVideo();
              }
            }
          }
        });
      }
    };

    // On s'assure que l'API est dispo (elle devrait l'être via le bgPlayer)
    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      // Cas de fallback
      setTimeout(initPlayer, 500); 
    }

    return () => {
      if (checkTkYTInterval) clearInterval(checkTkYTInterval);
      if (tkPlayerRef.current && tkPlayerRef.current.destroy) {
        tkPlayerRef.current.destroy();
      }
      setTkYtPlaying(false);
    };
  }, [spectatorTakeoverUrl, isTkYT, tkYtId, showActive]);


  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      
      {/* OVERLAY DE PREPARATION DU SHOW */}
      {isPreparing && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-3xl font-bold text-white tracking-widest animate-pulse">{t('preparingShow')}</h2>
        </div>
      )}

      {/* BACKGROUND VIDÉO (Base ou Takeover) */}
      {showActive && currentTheme && (
        <>
          {/* LECTEUR DU THEME DE FOND (Toujours rendu, masqué si Takeover) */}
          {currentTheme.id === 'static-orb' ? (
            <div className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-500 ${spectatorTakeoverUrl ? 'opacity-0' : 'opacity-100'}`}>
              <Orb bassLevel={audioData.bass} midLevel={audioData.mids} highLevel={audioData.highs} />
            </div>
          ) : currentTheme.id === 'static-beat' ? (
            <div className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-500 ${spectatorTakeoverUrl ? 'opacity-0' : 'opacity-100'}`}>
              <BeatSceneWrapper analyser={analyserRef.current} />
            </div>
          ) : currentTheme.id === 'static-beat2' ? (
            <div className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-500 ${spectatorTakeoverUrl ? 'opacity-0' : 'opacity-100'}`}>
              <Beat2SceneWrapper analyser={analyserRef.current} />
            </div>
          ) : currentTheme.id === 'static-disco2' ? (
            <div className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-500 ${spectatorTakeoverUrl ? 'opacity-0' : 'opacity-100'}`}>
              <Disco2Wrapper analyser={analyserRef.current} />
            </div>
          ) : isBgYT && bgYtId ? (
            <div
              className={`absolute inset-0 w-[120vw] h-[120vh] -left-[10vw] -top-[10vh] object-cover z-0 pointer-events-none select-none transition-opacity duration-500 ${(spectatorTakeoverUrl || !bgYtPlaying) ? 'opacity-0' : 'opacity-100'}`}
              style={videoAudioStyle}
            >
              <div id="yt-bg-player" className="w-full h-full pointer-events-none" />
            </div>
          ) : (
            <video 
              src={bgVideoUrl} 
              autoPlay 
              loop 
              muted 
              playsInline 
              className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${spectatorTakeoverUrl ? 'opacity-0' : 'opacity-100'}`}
              style={videoAudioStyle}
            />
          )}

          {/* LECTEUR DU TAKEOVER (Rendu par-dessus uniquement quand actif) */}
          {spectatorTakeoverUrl && (
            <>
              {isTkYT && tkYtId ? (
                <div
                  className={`absolute inset-0 w-[120vw] h-[120vh] -left-[10vw] -top-[10vh] object-cover z-10 pointer-events-none select-none transition-opacity duration-500 ${!tkYtPlaying ? 'opacity-0' : 'opacity-100'}`}
                  style={videoAudioStyle}
                >
                  <div id="yt-tk-player" className="w-full h-full pointer-events-none" />
                </div>
              ) : (
                <video 
                  src={tkVideoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="absolute inset-0 w-full h-full object-cover z-10 animate-fade-in pointer-events-none"
                  style={videoAudioStyle}
                />
              )}
            </>
          )}
        </>
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
              <>
                {/* TABS */}
                <div className="flex space-x-4 mb-8 border-b border-gray-700 pb-4">
                  <button
                    onClick={() => setActiveTab('static')}
                    className={`px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'static' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    {t('staticAnimationsCategory')}
                  </button>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`px-6 py-3 rounded-lg font-bold transition-colors ${activeTab === 'custom' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    {t('customThemesCategory')}
                  </button>
                </div>

                {/* THEMES GRID */}
                <div className="mb-12">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {themes
                      .filter(t => activeTab === 'static' ? t.id.startsWith('static-') : !t.id.startsWith('static-'))
                      .map(theme => (
                      <div 
                        key={theme.id}
                        onClick={() => {
                          setSelectedThemeId(theme.id)
                          setIsModalOpen(true)
                        }}
                        className={`cursor-pointer rounded-xl overflow-hidden border-4 transition-all border-transparent opacity-80 hover:opacity-100 hover:scale-105 hover:border-purple-500`}
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
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMATION DU THEME */}
      {isModalOpen && selectedThemeId && !showActive && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">
              {themes.find(t => t.id === selectedThemeId)?.name}
            </h2>
            <div className="relative h-48 bg-gray-800 rounded-xl mb-6 overflow-hidden border border-gray-700">
              {themes.find(t => t.id === selectedThemeId)?.thumbnailUrl ? (
                <img 
                  src={themes.find(t => t.id === selectedThemeId)?.thumbnailUrl!} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {t('adminThemesNoThumbnail')}
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {t('close')}
              </button>
              <button 
                onClick={() => {
                  setIsModalOpen(false)
                  startShow()
                }}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-purple-500/30"
              >
                {loading ? t('loading') : t('startShow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AFFICHAGE DU SHOW ACTIF --- */}
      {showActive && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Overlay gradient pour mieux lire le texte */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* MINI-VISUALISEUR AUDIO (S'affiche par-dessus les vidéos) */}
          {currentTheme && !currentTheme.id.startsWith('static-') && !spectatorTakeoverUrl && (
            <div className="absolute bottom-6 left-6 w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-2 border-white/20 bg-black/40 backdrop-blur-sm pointer-events-none z-20 shadow-[0_0_30px_rgba(136,0,255,0.3)]">
              <BeatSceneWrapper analyser={analyserRef.current} isMini={true} />
            </div>
          )}

          {/* QR CODE */}
          {showUrl && !spectatorTakeoverUrl && (
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

          {/* ANIMATION FLUIDE MULTI-EMOJIS (Performances optimisées avec Emojis 3D) */}
          {activeMessage?.emoji3D && (
            <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden" style={{ perspective: '1000px' }}>
              {/* Particules lumineuses douces */}
              <div 
                className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.15)_0%,transparent_60%)] opacity-0" 
                style={{ animation: 'smoothEmojiRise 6s ease-out forwards' }} 
              />
              
              {/* Conteneur principal pour forcer l'accélération matérielle */}
              <div className="absolute inset-0" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
                {/* 15 Emojis générés de manière fluide */}
                {[...Array(15)].map((_, i) => {
                  const isMain = i === 0;
                  // Distribution plus harmonieuse
                  const leftPos = isMain ? 50 : 10 + Math.random() * 80;
                  const delay = isMain ? 0 : Math.random() * 2;
                  const duration = isMain ? 6 : 5 + Math.random() * 3;
                  const size = isMain ? 'clamp(12rem, 25vw, 24rem)' : `clamp(4rem, ${8 + Math.random() * 6}vw, 12rem)`;
                  const animName = i % 2 === 0 ? 'smoothEmojiRise' : 'smoothEmojiRiseAlt';
                  
                  // Déterminer si emoji3D est une URL (nouvelle version) ou un texte (ancienne version/fallback)
                  const isUrl = activeMessage.emoji3D?.startsWith('http');
                  
                  return (
                    <div 
                      key={`smooth-emoji-${i}`}
                      className="absolute bottom-0 flex items-center justify-center"
                      style={{
                        left: `${leftPos}%`,
                        marginLeft: isMain ? 'calc(-1 * clamp(6rem, 12.5vw, 12rem))' : '0', // Centrer le principal
                        width: size,
                        height: size,
                        opacity: 0,
                        animation: `${animName} ${duration}s ease-in-out forwards`,
                        animationDelay: `${delay}s`,
                        filter: isMain 
                          ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.4)) drop-shadow(0 0 20px rgba(255,255,255,0.2))' 
                          : 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
                        zIndex: isMain ? 20 : 10,
                        willChange: 'transform, opacity', // Optimisation GPU
                      }}
                    >
                      {isUrl ? (
                        <img 
                          src={activeMessage.emoji3D!} 
                          alt="emoji" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span style={{ fontSize: size }}>{activeMessage.emoji3D}</span>
                      )}
                    </div>
                  );
                })}
              </div>
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
