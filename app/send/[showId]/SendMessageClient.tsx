"use client"

import { useState, useEffect } from 'react'
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

export default function SendMessageClient({ show }: { show: ShowWithUser }) {
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [price, setPrice] = useState(0)
  const [error, setError] = useState("")

  // Nouveaux états pour les effets (Takeover 3D)
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(5) // Par défaut 5 secondes

  const EFFECTS = show.theme?.takeovers || []

  const EMOJIS = ['❤️', '🔥', '🚀', '🍾', '😎', '💀', '💸']
  
  // Nouveaux états pour Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isPaymentStep, setIsPaymentStep] = useState(false)
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)

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
  
  return (
    <div className="page-shell py-10 px-4">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-0 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute top-24 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <div className="relative max-w-md mx-auto">
        <div className="text-center mb-8">
          <span className="badge mb-3">{t('liveShow')}</span>
          <h1 className="text-3xl font-bold">{show.user.name || 'DJ'}</h1>
          <p className="text-lg text-slate-300 mt-2">{show.title}</p>
        </div>
        
        {sent ? (
          <div className="card-glass p-7 text-center border border-emerald-500/30">
            <h2 className="text-xl font-bold mb-4 text-emerald-300">{t('messageSentTitle')}</h2>
            <p className="mb-6 text-slate-300">{t('messageSentBody')}</p>
            <button
              onClick={() => setSent(false)}
              className="btn-primary"
            >
              {t('sendNewMessage')}
            </button>
          </div>
        ) : isPaymentStep && clientSecret ? (
          <div className="card-glass p-7">
            <h2 className="text-2xl font-bold mb-6 text-center">Paiement sécurisé</h2>
            <p className="text-center text-slate-300 mb-6">Montant total: <span className="font-bold text-emerald-300">{price.toFixed(2)}$</span></p>
            
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
              <CheckoutForm 
                clientSecret={clientSecret} 
                onSuccess={handlePaymentSuccess} 
                onCancel={handlePaymentCancel} 
                amount={price} 
                messageId={currentMessageId}
              />
            </Elements>
          </div>
        ) : (
          <div className="card-glass p-7">
            <h2 className="text-2xl font-bold mb-6">{t('sendMessageTitle')}</h2>
            
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-3 rounded-xl mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="label">{t('yourName')}</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={handleNameChange}
                  className="input-field"
                  placeholder={t('yourNamePlaceholder')}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="message" className="label">{t('yourMessage')}</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={handleMessageChange}
                  className="textarea-field"
                  placeholder={t('yourMessagePlaceholder')}
                  required
                />
              </div>

            {/* --- NOUVELLE SECTION : EFFETS VISUELS --- */}
            {EFFECTS.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  1. Achetez une Animation Vidéo Géante ! (Optionnel)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {EFFECTS.map((effect) => (
                    <button
                      key={effect.id}
                      type="button"
                      onClick={() => setSelectedEffect(selectedEffect === effect.id ? null : effect.id)}
                      className={`px-3 py-2 rounded-lg border transition-all flex flex-col items-center justify-center text-center ${
                        selectedEffect === effect.id
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium scale-[1.02] shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base font-bold">{effect.name}</span>
                      <span className={`text-xs mt-1 ${selectedEffect === effect.id ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>+ ${effect.price}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center italic">
                  Cette vidéo recouvrira l'écran de la scène pendant l'affichage de votre message !
                </p>
              </div>
            )}

            {/* --- NOUVELLE SECTION : DUREE D'AFFICHAGE --- */}
            <div className="pt-4 border-t border-gray-100">
              <label className="flex justify-between text-sm font-bold text-gray-800 mb-3">
                <span>3. Durée d'affichage à l'écran</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selectedDuration} secondes</span>
              </label>
              
              <div className="px-2">
                <input 
                  type="range" 
                  min="5" 
                  max="30" 
                  step="5"
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                  <span>5s (Inclus)</span>
                  <span>15s (+$10)</span>
                  <span>30s (+$25)</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center italic">
                +1$ par seconde supplémentaire au-delà de 5s.
              </p>
            </div>
              
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span>{t('price')}:</span>
                  <span className="text-xl font-bold text-emerald-300">${price.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {t('pricePerChar')} ${show.user.settings?.pricePerChar || 0.1}
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || !message || !displayName || error !== ""}
                className={`w-full btn-primary ${(loading || !message || !displayName || error !== "") ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? t('processing') : t('sendAndPay')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}