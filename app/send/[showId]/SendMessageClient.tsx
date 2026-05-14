"use client"

import { useState, useEffect, useRef } from 'react'
import { Show, User, DJSettings } from '@prisma/client'
import { useLanguage } from '../../i18n/LanguageProvider'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// --- Clé Publique Stripe (doit commencer par pk_) ---
// À mettre dans votre fichier .env : NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_votre_cle_ici")

type ThemeVideo = {
  id: string
  name: string
  price: number
  videoUrl: string
}

type Theme = {
  id: string
  name: string
  takeovers: ThemeVideo[]
}

type ShowWithUser = Show & {
  user: {
    name: string | null;
    settings: DJSettings | null;
  }
  theme: Theme | null;
}

  // === COMPOSANT DE PAIEMENT STRIPE (Interne) ===
const CheckoutForm = ({ clientSecret, onSuccess, onCancel, amount, messageId }: { clientSecret: string, onSuccess: () => void, onCancel: () => void, amount: number, messageId: string | null }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPaymentError(null);

    // Stripe va valider le paiement.
    // Avec PayPal ou d'autres moyens nécessitant une redirection, 
    // Stripe redirigera l'utilisateur vers la page de paiement puis le ramènera sur "return_url".
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required', // Ne pas rediriger si le paiement (ex: carte) peut se faire sans redirection
    });

    if (error) {
      setPaymentError(error.message || "Une erreur est survenue lors du paiement.");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Paiement validé avec succès sans redirection (ex: carte bancaire)
      // On demande à notre backend de confirmer
      fetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentIntentId: paymentIntent.id,
          messageId: messageId 
        })
      }).then(() => {
        onSuccess();
      }).catch(err => {
        setPaymentError("Erreur lors de la validation du message.");
        setIsProcessing(false);
      });
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-6">
      <div className="bg-white p-4 rounded-xl">
        <PaymentElement />
      </div>
      
      {paymentError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-3 rounded-xl text-sm">
          {paymentError}
        </div>
      )}
      
      <div className="flex gap-4">
        <button 
          type="button" 
          onClick={onCancel}
          disabled={isProcessing}
          className="btn-secondary flex-1"
        >
          Annuler
        </button>
        <button 
          type="submit" 
          disabled={isProcessing || !stripe || !elements}
          className="btn-primary flex-1"
        >
          {isProcessing ? "Paiement en cours..." : `Payer ${amount.toFixed(2)}$`}
        </button>
      </div>
    </form>
  );
}

const LottieCanvasPreview = ({ url, className }: { url: string, className?: string }) => {
  const canvasRef = (useRef<HTMLCanvasElement | null>(null))
  const playerRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const mod = await import('@lottiefiles/dotlottie-web')
      const DotLottie = (mod as any).DotLottie
      if (cancelled || !canvasRef.current || !DotLottie) return

      if (playerRef.current?.destroy) playerRef.current.destroy()
      playerRef.current = new DotLottie({
        canvas: canvasRef.current,
        src: url,
        loop: true,
        autoplay: true,
        renderConfig: {
          autoResize: true,
          devicePixelRatio: 1
        }
      })
    }

    run().catch(() => {})

    return () => {
      cancelled = true
      if (playerRef.current?.destroy) playerRef.current.destroy()
      playerRef.current = null
    }
  }, [url])

  return <canvas ref={canvasRef} className={className} />
}

export default function SendMessageClient({ show }: { show: ShowWithUser }) {
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [price, setPrice] = useState(0)
  const [error, setError] = useState("")

  // Nouveaux états pour les onglets
  const [activeTab, setActiveTab] = useState<'message' | 'emoji' | 'takeover'>('message')
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(5) // Par défaut 5 secondes

  const EFFECTS = show.theme?.takeovers || []

  // Utilisation d'emojis 3D haute qualité (Fluent Emojis de Microsoft via CDN public)
  const HIGH_QUALITY_EMOJIS = [
    // { id: 'heart', icon: '❤️', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20heart/3D/red_heart_3d.png' },
    // { id: 'fire', icon: '🔥', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png' },
    // { id: 'rocket', icon: '🚀', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png' },
    // { id: 'champagne', icon: '🍾', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bottle%20with%20popping%20cork/3D/bottle_with_popping_cork_3d.png' },
    // { id: 'cool', icon: '😎', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Smiling%20face%20with%20sunglasses/3D/smiling_face_with_sunglasses_3d.png' },
    // { id: 'skull', icon: '💀', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Skull/3D/skull_3d.png' },
    // { id: 'money', icon: '💸', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20with%20wings/3D/money_with_wings_3d.png' },
    { id: 'balloon', icon: '🎈', url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Balloon/3D/balloon_3d.png' },
  ]

  const LOTTIE_PRESETS = [
    { id: 'lottie-balloon', label: 'Ballon', url: 'https://lottie.host/585c3d0c-d11e-4bc8-a051-985faf1bd41e/gbRATQ7lrp.lottie' },
    { id: 'lottie-heart', label: 'Cœur', url: 'https://lottie.host/cfc85c2f-851c-4cce-ab50-7b13fa022a18/sYhVa0uwoU.lottie' },
    { id: 'lottie-money', label: 'Money', url: 'https://lottie.host/8e004e1a-e3b0-4f55-b422-27345cd7581e/QHGBZDjsWz.lottie' },
  ]
  
  // Nouveaux états pour Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isPaymentStep, setIsPaymentStep] = useState(false)
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)

  // Nouveaux états pour l'interface TikTok 
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [customLottieUrl, setCustomLottieUrl] = useState('')

  const { t } = useLanguage()

  // Vérifier si l'utilisateur revient d'une redirection PayPal (ou autre moyen Stripe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const query = new URLSearchParams(window.location.search)
      const redirectStatus = query.get('redirect_status')
      const paymentIntentId = query.get('payment_intent')
      // On a besoin de stocker l'ID du message dans localStorage ou de le récupérer depuis le serveur
      // Mais pour simplifier, le backend peut retrouver le message via le payment_intent
      
      if (redirectStatus === 'succeeded' && paymentIntentId) {
        // Le paiement a réussi via la redirection !
        // On demande au serveur de vérifier et de valider le message
        fetch('/api/stripe/confirm-payment', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
             paymentIntentId: paymentIntentId,
             // En cas de redirection (PayPal), on utilise une route spéciale qui trouve le message via l'Intent
             messageId: "auto-detect-from-intent" 
           })
        }).then(() => {
           setSent(true)
           window.history.replaceState({}, '', window.location.pathname)
        }).catch(err => {
           console.error(err)
        })
      } else if (redirectStatus === 'failed') {
        setError("Le paiement a échoué. Veuillez réessayer.")
      }
    }
  }, [])
  
  // Yasaklı kelimeler listesi - Gerçek uygulamada bu listeyi daha kapsamlı yapabilir veya bir API'den çekebilirsiniz
 // Yasaklı kelimeler listesi - Gerçek uygulamada bu listeyi daha kapsamlı yapabilir veya bir API'den çekebilirsiniz
const bannedWords = [
  // Türkçe yasaklı kelimeler
  "amcık", "amık", "çük", "göt", "götveren", "kaltağı", "orospu", "pezevenk", "piç", "sik", "siktir", "yarak", "yarrak", "amına", "aq",
  
  // İngilizce yasaklı kelimeler
  "asshole", "bastard", "bitch", "cock", "cunt", "damn", "dick", "fuck", "motherfucker", "piss", "porn", "pussy", "shit", "slut", "whore",
  
  // Almanca yasaklı kelimeler
  "analritter", "arsch", "arschficker", "arschlecker", "arschloch", "bimbo", "bratze", "bumsen", "bonze", "dödel", "fick", "ficken",
  "flittchen", "fotze", "fratze", "hackfresse", "hure", "hurensohn", "ische", "kackbratze", "kacke", "kacken", "kackwurst", "kampflesbe",
  "kanake", "kimme", "lümmel", "milf", "möpse", "morgenlatte", "möse", "mufti", "muschi", "nackt", "neger", "nigger", "nippel", "nutte",
  "onanieren", "orgasmus", "penis", "pimmel", "pimpern", "pinkeln", "pissen", "pisser", "popel", "poppen", "porno", "reudig", "rosette",
  "schabracke", "schlampe", "scheiße", "scheisser", "schiesser", "schnackeln", "schwanzlutscher", "schwuchtel", "tittchen", "titten",
  "vögeln", "vollpfosten", "wichse", "wichsen", "wichser"
]
  // Metinde yasaklı kelime kontrolü
  const containsBannedWords = (text: string): boolean => {
    const lowerText = text.toLowerCase()
    return bannedWords.some(word => lowerText.includes(word.toLowerCase()))
  }
  
  // Fiyat hesaplama
  const calculatePrice = () => {
    const pricePerChar = show.user.settings?.pricePerChar || 0.1
    let basePrice = message.length * pricePerChar

    // Ajouter le prix du thème 3D s'il est sélectionné
    if (selectedEffect) {
      const effect = EFFECTS.find(e => e.id === selectedEffect)
      if (effect) basePrice += effect.price
    }
    
    // Ajouter le prix pour le temps d'affichage supplémentaire (ex: 1$ par seconde supplémentaire au-delà de 5s)
    if (selectedDuration > 5) {
      const extraSeconds = selectedDuration - 5
      basePrice += extraSeconds * 1 // 1$ par seconde en plus
    }

    return basePrice
  }

  // Recalculer le prix si l'effet, la durée ou le message change
  useEffect(() => {
    setPrice(calculatePrice())
  }, [selectedEffect, message, selectedDuration])
  
  // İsim değiştiğinde kontrol
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setDisplayName(newName)
    
    if (containsBannedWords(newName)) {
      setError(t('errorName'))
    } else {
      setError("")
    }
  }
  
  // Mesaj değiştiğinde kontrol ve fiyat güncelleme
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value
    setMessage(newMessage)
    
    if (containsBannedWords(newMessage)) {
      setError(t('errorMessage'))
    } else {
      setError("")
    }
  }
  
  // Mesaj gönderme et Création de l'intention de paiement
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (containsBannedWords(displayName) || containsBannedWords(message)) {
      setError(t('errorDetected'))
      return
    }
    
    setLoading(true)
    
    try {
      // 1. On demande au backend de créer une intention de paiement sécurisée
      const response = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          showId: show.id,
          displayName,
          content: message,
          takeoverVideoId: selectedEffect, // Utilise la vidéo sélectionnée
          emoji3D: selectedEmoji,
          duration: selectedDuration, // Envoi de la durée au backend
        })
      })
      
      const data = await response.json();

      if (response.ok && data.clientSecret) {
        // 2. Si le backend a répondu OK, on affiche le formulaire de paiement Stripe
        setClientSecret(data.clientSecret);
        setCurrentMessageId(data.messageId);
        setIsPaymentStep(true);
      } else {
        setError(data.error || "Erreur lors de l'initialisation du paiement.");
      }
    } catch (error) {
      console.error('Error initiating payment:', error)
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false)
    }
  }

  // Fonction appelée quand le paiement Stripe est validé avec succès
  const handlePaymentSuccess = () => {
    setSent(true)
    setDisplayName('')
    setMessage('')
    setPrice(0)
    setError("")
    setIsPaymentStep(false)
    setClientSecret(null)
  }

  // Annuler le paiement et revenir à l'édition du message
  const handlePaymentCancel = () => {
    setIsPaymentStep(false)
    setClientSecret(null)
  }
  
  const handleMainSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!displayName) {
      setError(t('errorName') || "Veuillez entrer votre nom")
      setActiveTab('message')
      setIsSheetOpen(true)
      return
    }
    
    // Si aucun message, aucun emoji et aucun takeover n'est sélectionné
    if (!message && !selectedEmoji && !selectedEffect) {
      setError(t('errorMessage') || "Veuillez entrer un message ou sélectionner une animation")
      setActiveTab('message')
      setIsSheetOpen(true)
      return
    }

    handleSubmit(e as React.FormEvent)
  }

  const openSheet = (tab: 'message' | 'emoji' | 'takeover') => {
    setActiveTab(tab)
    setIsSheetOpen(true)
  }

  const isLottieUrl = (url: string) => /\.(lottie|json)(\?|#|$)/i.test(url)
  const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be')
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans selection:bg-purple-500/30">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up-sheet {
          animation: slideUpSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .tiktok-glass {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}} />

      {/* BACKGROUND ANIMÉ (Immersif) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-purple-600/30 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] bg-pink-600/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />
      </div>

      {sent ? (
        // ÉCRAN DE SUCCÈS
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] border border-emerald-500/30">
            <span className="text-5xl">✨</span>
          </div>
          <h2 className="text-3xl font-black mb-4 text-white drop-shadow-lg">{t('messageSentTitle') || 'Envoyé !'}</h2>
          <p className="mb-10 text-white/70 text-lg leading-relaxed max-w-sm">{t('messageSentBody') || 'Votre message apparaîtra bientôt sur l\'écran du DJ.'}</p>
          <button
            onClick={() => setSent(false)}
            className="w-full max-w-xs bg-white text-black font-bold py-4 rounded-full transition-all active:scale-[0.98]"
          >
            {t('sendNewMessage') || 'Envoyer un autre message'}
          </button>
        </div>
      ) : isPaymentStep && clientSecret ? (
        // ÉCRAN DE PAIEMENT STRIPE (Plein écran)
        <div className="relative z-50 flex-1 bg-zinc-950 flex flex-col animate-slide-up-sheet">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900">
            <button onClick={handlePaymentCancel} className="text-white/70 hover:text-white p-2">
              ✕ Annuler
            </button>
            <span className="font-bold">Paiement sécurisé</span>
            <div className="w-16"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 text-center">
              <span className="block text-sm text-purple-300 mb-1">Total à payer</span>
              <span className="text-3xl font-black text-white">${price.toFixed(2)}</span>
            </div>
            
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#a855f7', colorBackground: '#18181b' } } }}>
              <CheckoutForm 
                clientSecret={clientSecret} 
                onSuccess={handlePaymentSuccess} 
                onCancel={handlePaymentCancel} 
                amount={price} 
                messageId={currentMessageId}
              />
            </Elements>
          </div>
        </div>
      ) : (
        // ÉCRAN PRINCIPAL TIKTOK-STYLE
        <>
          {/* HEADER */}
          <div className="relative z-10 p-5 flex justify-between items-start pt-safe">
            <div className="tiktok-glass rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <span className="text-xs font-black tracking-widest uppercase text-white/90">{t('liveShow') || 'LIVE'}</span>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="relative z-10 flex-1 flex items-end p-5 pb-28">
            {/* DJ INFO & SELECTION PREVIEW (Bottom Left) */}
            <div className="flex-1 pr-16 mb-2">
              <h1 className="text-3xl font-black drop-shadow-xl mb-1 flex items-center gap-2">
                {show.user.name || 'DJ'}
                <span className="text-blue-400 text-lg">✓</span>
              </h1>
              <p className="text-sm font-bold text-white/80 drop-shadow-md mb-4 uppercase tracking-wider">{show.title}</p>
              
              {/* Preview Bubble */}
              {(message || selectedEmoji || selectedEffect) && (
                <div className="tiktok-glass rounded-2xl p-4 text-sm mb-2 max-w-[85%] animate-fade-in border-l-4 border-l-purple-500">
                  {displayName && <span className="font-bold text-purple-300 block mb-1">{displayName}</span>}
                  {message && <p className="text-white/95 line-clamp-3 mb-2 leading-relaxed">{message}</p>}
                  <div className="flex flex-wrap gap-2 text-xs font-bold mt-2">
                    {selectedEmoji && (
                      /\.(lottie|json)(\?|#|$)/i.test(selectedEmoji) ? (
                        <span className="bg-pink-500/30 text-pink-200 px-2.5 py-1 rounded-full shadow-inner flex items-center gap-1">
                          Animation: <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-black">Lottie</span>
                        </span>
                      ) : (
                        <span className="bg-pink-500/30 text-pink-200 px-2.5 py-1 rounded-full shadow-inner flex items-center gap-1">
                          Emoji: <img src={selectedEmoji} alt="emoji" className="w-4 h-4 object-contain" />
                        </span>
                      )
                    )}
                    {selectedEffect && <span className="bg-blue-500/30 text-blue-200 px-2.5 py-1 rounded-full shadow-inner">🎬 Takeover</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR ACTIONS (Bottom Right) */}
          <div className="absolute right-4 bottom-[120px] z-20 flex flex-col gap-6 items-center pb-safe">
            <div className="relative group">
              <button onClick={() => openSheet('message')} className="flex flex-col items-center gap-1.5 transition-transform active:scale-90">
                <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-2xl shadow-xl border-2 ${activeTab === 'message' && isSheetOpen ? 'bg-purple-600 border-purple-400' : 'tiktok-glass border-white/20'}`}>
                  📝
                </div>
                <span className="text-[11px] font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Message</span>
              </button>
              {message && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-black">✓</div>}
            </div>

            <div className="relative">
              <button onClick={() => openSheet('emoji')} className="flex flex-col items-center gap-1.5 transition-transform active:scale-90">
                <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-2xl shadow-xl border-2 ${activeTab === 'emoji' && isSheetOpen ? 'bg-pink-600 border-pink-400' : 'tiktok-glass border-white/20'}`}>
                  💖
                </div>
                <span className="text-[11px] font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Emoji</span>
              </button>
              {selectedEmoji && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-black">1</div>}
            </div>

            <div className="relative">
              <button onClick={() => openSheet('takeover')} className="flex flex-col items-center gap-1.5 transition-transform active:scale-90">
                <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-2xl shadow-xl border-2 ${activeTab === 'takeover' && isSheetOpen ? 'bg-blue-600 border-blue-400' : 'tiktok-glass border-white/20'}`}>
                  🎬
                </div>
                <span className="text-[11px] font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Takeover</span>
              </button>
              {selectedEffect && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-black">1</div>}
            </div>
          </div>

          {/* BOTTOM PAY BUTTON (Sticky) */}
          <div className="absolute bottom-0 left-0 w-full p-4 pt-12 bg-gradient-to-t from-black via-black/90 to-transparent z-20 pb-safe">
            <button 
              onClick={handleMainSubmit}
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] flex justify-between items-center px-6 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              <div className="flex items-center gap-3">
                {loading ? (
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                ) : (
                  <span className="text-xl">🚀</span>
                )}
                <span className="text-lg">{t('sendAndPay') || 'Envoyer au DJ'}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full">
                <span>${price.toFixed(2)}</span>
                <span className="text-black/50">→</span>
              </div>
            </button>
          </div>

          {/* BOTTOM SHEET OVERLAY */}
          {isSheetOpen && (
            <div className="absolute inset-0 z-40 flex flex-col justify-end pointer-events-auto">
              {/* BACKDROP */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSheetOpen(false)} />
              
              {/* SHEET CONTENT */}
              <div className="relative bg-zinc-900 rounded-t-[32px] border-t border-white/10 flex flex-col max-h-[85vh] animate-slide-up-sheet shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-safe">
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 cursor-grab" onClick={() => setIsSheetOpen(false)} />
                
                {/* TABS HEADER */}
                <div className="flex px-4 py-3 gap-3 overflow-x-auto no-scrollbar border-b border-white/5">
                  <button onClick={() => setActiveTab('message')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'message' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                    📝 Message
                  </button>
                  <button onClick={() => setActiveTab('emoji')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'emoji' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                    💖 3D Emoji
                  </button>
                  <button onClick={() => setActiveTab('takeover')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'takeover' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>
                    🎬 Takeover
                  </button>
                </div>

                <div className="overflow-y-auto p-5 pb-24 space-y-6">
                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                      <span>⚠️</span> <p>{error}</p>
                    </div>
                  )}

                  {/* GLOBAL INPUTS (Name is always needed) */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">{t('yourName') || 'Votre Nom'}</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={handleNameChange}
                        className="w-full bg-black/50 border border-white/10 text-white px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-white/30 font-medium text-lg"
                        placeholder={t('yourNamePlaceholder') || 'Ex: John Doe'}
                      />
                    </div>
                  </div>

                  {/* TAB: MESSAGE */}
                  <div className={activeTab === 'message' ? 'block animate-fade-in' : 'hidden'}>
                    <div>
                      <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">{t('yourMessage') || 'Votre Message'}</label>
                      <textarea
                        value={message}
                        onChange={handleMessageChange}
                        className="w-full bg-black/50 border border-white/10 text-white px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-white/30 min-h-[120px] font-medium resize-none text-lg"
                        placeholder={t('yourMessagePlaceholder') || 'Écrivez quelque chose de sympa...'}
                      />
                    </div>
                  </div>

                  {/* TAB: EMOJI */}
                  <div className={activeTab === 'emoji' ? 'block animate-fade-in' : 'hidden'}>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-black text-white">Réaction Géante 3D</h3>
                      <p className="text-xs text-white/50">L'emoji apparaîtra en grand sur l'écran !</p>
                    </div>

                    {selectedEmoji && (
                      <div className="mb-5 bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                          <span className="text-sm font-black text-white">Prévisualisation</span>
                          <button
                            type="button"
                            onClick={() => setSelectedEmoji(null)}
                            className="text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 transition"
                          >
                            Retirer
                          </button>
                        </div>
                        <div className="aspect-video bg-black/60 flex items-center justify-center">
                          {isLottieUrl(selectedEmoji) ? (
                            <LottieCanvasPreview url={selectedEmoji} className="w-full h-full" />
                          ) : (
                            <img src={selectedEmoji} alt="preview" className="w-full h-full object-contain" />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {LOTTIE_PRESETS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedEmoji(selectedEmoji === item.url ? null : item.url)}
                          className={`rounded-2xl p-4 text-left border transition-all ${
                            selectedEmoji === item.url
                              ? 'bg-gradient-to-br from-pink-500 to-rose-500 border-white/30 shadow-[0_0_24px_rgba(244,63,94,0.35)]'
                              : 'bg-black/40 border-white/10 hover:bg-black/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-white">{item.label}</span>
                            <span className="text-[10px] font-black bg-black/25 text-white/90 px-2 py-0.5 rounded-full">.lottie</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-white/60">Animation premium</span>
                            <span className="text-[11px] font-black text-white/80">+$2</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {HIGH_QUALITY_EMOJIS.map((emojiObj) => (
                        <button
                          key={emojiObj.id}
                          type="button"
                          onClick={() => setSelectedEmoji(selectedEmoji === emojiObj.url ? null : emojiObj.url)}
                          className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-300 ${
                            selectedEmoji === emojiObj.url 
                              ? 'bg-gradient-to-br from-pink-500 to-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-110 border-2 border-white' 
                              : 'bg-black/40 border border-white/10 hover:bg-black/60'
                          }`}
                        >
                          <img src={emojiObj.url} alt={emojiObj.id} className="w-10 h-10 object-contain drop-shadow-lg" />
                          <span className={`text-[10px] font-black mt-1 ${selectedEmoji === emojiObj.url ? 'text-white' : 'text-white/40'}`}>+$2</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                      <label className="block text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">
                        Animation Lottie (.lottie ou .json)
                      </label>
                      <input
                        type="url"
                        value={customLottieUrl}
                        onChange={(e) => setCustomLottieUrl(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder-white/30 font-medium"
                        placeholder="https://.../animation.json"
                      />
                      <div className="flex gap-3 mt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedEmoji(customLottieUrl.trim() ? customLottieUrl.trim() : null)}
                          disabled={!customLottieUrl.trim()}
                          className="flex-1 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                        >
                          Utiliser
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomLottieUrl('')
                            if (selectedEmoji && /\.(lottie|json)(\?|#|$)/i.test(selectedEmoji)) setSelectedEmoji(null)
                          }}
                          className="px-4 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all border border-white/10"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TAB: TAKEOVER */}
                  <div className={activeTab === 'takeover' ? 'block animate-fade-in' : 'hidden'}>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-black text-white">Prenez le contrôle</h3>
                      <p className="text-xs text-white/50">Remplacez la vidéo du DJ par une animation exclusive.</p>
                    </div>

                    {selectedEffect && (() => {
                      const tk = EFFECTS.find(e => e.id === selectedEffect)
                      if (!tk) return null
                      const videoUrl = tk.videoUrl
                      const ytId = isYouTubeUrl(videoUrl) ? getYouTubeId(videoUrl) : null

                      return (
                        <div className="mb-5 bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                            <div className="min-w-0">
                              <span className="block text-sm font-black text-white truncate">{tk.name}</span>
                              <span className="block text-xs text-white/50">Prévisualisation takeover</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedEffect(null)}
                              className="text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 transition"
                            >
                              Retirer
                            </button>
                          </div>
                          <div className="aspect-video bg-black/60 flex items-center justify-center">
                            {isLottieUrl(videoUrl) ? (
                              <LottieCanvasPreview url={videoUrl} className="w-full h-full" />
                            ) : ytId ? (
                              <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${ytId}&modestbranding=1&rel=0&iv_load_policy=3`}
                                allow="autoplay; encrypted-media"
                                allowFullScreen={false}
                                title="Takeover preview"
                              />
                            ) : (
                              <video
                                src={videoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-contain"
                              />
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    
                    {EFFECTS.length > 0 ? (
                      <div className="space-y-3">
                        {EFFECTS.map((effect) => (
                          <button
                            key={effect.id}
                            type="button"
                            onClick={() => setSelectedEffect(selectedEffect === effect.id ? null : effect.id)}
                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                              selectedEffect === effect.id
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-white shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-[1.02]'
                                : 'bg-black/40 border-white/10 hover:bg-black/60'
                            }`}
                          >
                            <div>
                              <span className="block text-lg font-black text-white">{effect.name}</span>
                              <span className="text-xs text-white/60">Animation Plein Écran</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-lg font-black text-sm bg-black/40 text-white border border-white/10">
                              + ${effect.price}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-center">
                        <span className="text-4xl block mb-2">🎬</span>
                        <p className="text-sm font-bold text-white mb-1">Aucun Takeover disponible</p>
                        <p className="text-xs text-white/50">Le DJ n'a pas encore configuré de vidéos Takeover pour cet événement.</p>
                      </div>
                    )}
                  </div>

                  {/* DURÉE (COMMUNE) */}
                  <div className="pt-6 border-t border-white/10">
                    <label className="flex justify-between text-xs font-bold text-white/50 mb-4 uppercase tracking-wider">
                      <span>Temps à l'écran</span>
                      <span className="text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md">{selectedDuration} sec</span>
                    </label>
                    <input 
                      type="range" 
                      min="5" 
                      max="30" 
                      step="5"
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-[10px] text-white/40 mt-2 font-bold">
                      <span>5s</span>
                      <span>15s (+$10)</span>
                      <span>30s (+$25)</span>
                    </div>
                  </div>

                  {/* BOUTON VALIDER DANS LE SHEET */}
                  <button 
                    onClick={() => setIsSheetOpen(false)}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all border border-white/10 mt-4"
                  >
                    Valider la sélection (${price.toFixed(2)})
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
