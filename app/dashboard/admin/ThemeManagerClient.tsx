"use client"

import { useState, useEffect } from 'react'

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

export default function ThemeManagerClient() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(false)
  
  // États pour le formulaire principal (Thème)
  const [themeName, setThemeName] = useState('')
  const [themeDesc, setThemeDesc] = useState('')
  const [bgVideoFile, setBgVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  // États pour l'ajout d'une sous-vidéo (Takeover) à un thème existant
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [takeoverName, setTakeoverName] = useState('')
  const [takeoverPrice, setTakeoverPrice] = useState(5)
  const [takeoverFile, setTakeoverFile] = useState<File | null>(null)

  useEffect(() => {
    fetchThemes()
  }, [])

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/admin/themes')
      const data = await res.json()
      if (Array.isArray(data)) {
        setThemes(data)
      } else {
        setThemes([])
      }
    } catch (err) {
      console.error('Erreur chargement thèmes', err)
      setThemes([])
    }
  }

  // --- GESTION DES SOUMISSIONS ---

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!themeName || !bgVideoFile) return alert("Nom et vidéo requis")

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('name', themeName)
      if (themeDesc) formData.append('description', themeDesc)
      formData.append('backgroundVideo', bgVideoFile)
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile)

      console.log("Envoi au serveur...")
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        alert("Thème créé avec succès !")
        setThemeName('')
        setThemeDesc('')
        setBgVideoFile(null)
        setThumbnailFile(null)
        fetchThemes()
      } else {
        const err = await res.json()
        alert("Erreur: " + err.error)
      }
    } catch (err) {
      console.error(err)
      alert("Une erreur inattendue est survenue.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddTakeover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThemeId || !takeoverName || !takeoverFile) return alert("Remplissez tous les champs")

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('name', takeoverName)
      formData.append('price', takeoverPrice.toString())
      formData.append('video', takeoverFile)

      const res = await fetch(`/api/admin/themes/${selectedThemeId}/videos`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        alert("Animation ajoutée au thème !")
        setTakeoverName('')
        setTakeoverPrice(5)
        setTakeoverFile(null)
        fetchThemes()
      } else {
        const err = await res.json()
        alert("Erreur: " + err.error)
      }
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'ajout.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-12">

      {/* SECTION 1: CRÉER UN NOUVEAU THÈME */}
      <section className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">1. Créer un Nouveau Thème</h2>
        
        <form onSubmit={handleCreateTheme} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom du Thème (ex: Cyberpunk City)</label>
            <input 
              type="text" 
              required
              value={themeName}
              onChange={e => setThemeName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optionnel)</label>
            <input 
              type="text" 
              value={themeDesc}
              onChange={e => setThemeDesc(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vidéo de Fond Principale (Boucle)</label>
            <input 
              type="file" 
              accept="video/*"
              required
              onChange={e => setBgVideoFile(e.target.files?.[0] || null)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">La vidéo sera sauvegardée directement sur le serveur.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Miniature (Image JPG/PNG)</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? `Upload en cours...` : "Créer le Thème & Uploader la vidéo"}
          </button>
        </form>
      </section>

      <hr className="border-gray-700" />

      {/* SECTION 2: AJOUTER DES SOUS-VIDÉOS (TAKEOVERS) */}
      <section className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">2. Ajouter une Animation (Takeover) à un Thème</h2>
        
        {themes.length === 0 ? (
          <p className="text-gray-400 italic">Créez d'abord un thème ci-dessus.</p>
        ) : (
          <form onSubmit={handleAddTakeover} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sélectionner le Thème Parent</label>
              <select 
                required
                value={selectedThemeId || ''}
                onChange={e => setSelectedThemeId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="" disabled>-- Choisir un thème --</option>
                {themes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nom de l'Animation (ex: Laser Rouge)</label>
              <input 
                type="text" 
                required
                value={takeoverName}
                onChange={e => setTakeoverName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Prix pour le public ($)</label>
              <input 
                type="number" 
                min="0"
                step="0.5"
                required
                value={takeoverPrice}
                onChange={e => setTakeoverPrice(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Vidéo d'Animation (Takeover)</label>
              <input 
                type="file" 
                accept="video/*"
                required
                onChange={e => setTakeoverFile(e.target.files?.[0] || null)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Sauvegardée directement sur le serveur.</p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? `Upload en cours...` : "Ajouter l'Animation"}
            </button>
          </form>
        )}
      </section>

      <hr className="border-gray-700" />

      {/* SECTION 3: CATALOGUE ACTUEL */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">3. Catalogue des Thèmes Existants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {themes.map(theme => (
            <div key={theme.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              {theme.thumbnailUrl ? (
                <img src={theme.thumbnailUrl} alt={theme.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-900 flex items-center justify-center">
                  <span className="text-gray-500">Pas de miniature</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="text-xl font-bold text-white">{theme.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{theme.description}</p>
                
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Animations associées ({theme.takeovers.length}) :</h4>
                  <ul className="space-y-2">
                    {theme.takeovers.map(tk => (
                      <li key={tk.id} className="flex justify-between bg-gray-900 p-2 rounded text-sm">
                        <span className="text-white">{tk.name}</span>
                        <span className="text-green-400 font-bold">{tk.price}$</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}