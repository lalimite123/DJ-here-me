"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '../../i18n/LanguageProvider'

interface Message {
  id: string
  displayName: string
  content: string
  payment: number
  paid: boolean
  createdAt: string
}

interface ShowDetails {
  id: string
  title: string
  createdAt: string
  endedAt: string | null
  messageCount: number
  totalEarnings: number
  messages: Message[]
}

interface PastShow {
  id: string
  title: string
  createdAt: string
  endedAt: string | null
  messageCount: number
  totalEarnings: number
}

type TrendPoint = {
  label: string
  value: number
}

export default function ShowStatsDashboard() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const { t, locale } = useLanguage()
  const [pastShows, setPastShows] = useState<PastShow[]>([])
  const [filteredShows, setFilteredShows] = useState<PastShow[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalMessages, setTotalMessages] = useState(0)
  const [selectedShow, setSelectedShow] = useState<ShowDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  
  // Tarih filtresi için state'ler
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  
  // Sayfalama için state'ler
  const [currentPage, setCurrentPage] = useState(1)
  const [showsPerPage] = useState(10)
  
  // Sayfa yüklendiğinde, bu ayın 1'inden itibaren olan tarihi default olarak ayarla
  useEffect(() => {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Format: YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    setStartDate(formatDate(firstDayOfMonth))
    setEndDate(formatDate(new Date()))
  }, [])

  // Geçmiş showları getir
  useEffect(() => {
    let isActive = true;
    if (session?.user && startDate && endDate) {
      fetchPastShows();
    }
    return () => { isActive = false; };
  }, [session?.user?.email, startDate, endDate]);

  const fetchPastShows = async () => {
    try {
      setLoading(true)
      // API'ye tarih filtresi parametrelerini ekle - Tarih biçimini düzelt
      const response = await fetch(`/api/shows/past?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`)
      
      if (response.ok) {
        const data = await response.json()
        
        const normalizedData = data.map((show: PastShow & { showId?: string }) => ({
          ...show,
          id: show.id || show.showId || ""
        }))

        // Client tarafında da tarih filtrelemesi yap
        const startDateTime = new Date(startDate + 'T00:00:00Z').getTime()
        const endDateTime = new Date(endDate + 'T23:59:59Z').getTime()
        
        const filteredData = normalizedData.filter((show: PastShow) => {
          const showDate = new Date(show.createdAt).getTime()
          return showDate >= startDateTime && showDate <= endDateTime
        })
        
        setPastShows(filteredData)
        setFilteredShows(filteredData)
        setCurrentPage(1) // Yeni veri geldiğinde ilk sayfaya dön
        
        // Toplam kazanç ve mesaj sayısını hesapla
        let totalEarning = 0
        let messages = 0
        
        filteredData.forEach((show: PastShow) => {
          if (show.totalEarnings) {
            totalEarning += parseFloat(Number(show.totalEarnings).toFixed(2))
          }
          messages += show.messageCount || 0
        })
        
        setTotalEarnings(parseFloat(totalEarning.toFixed(2)))
        setTotalMessages(messages)
      } else {
        console.error("Geçmiş showlar alınamadı")
      }
    } catch (error) {
      console.error("Veri alınırken hata:", error)
    } finally {
      setLoading(false)
    }
  }

  // Tarih aralığını filtrele ve verileri getir
  const handleFilterDates = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPastShows()
  }

  // Show detaylarını getir
  const fetchShowDetails = async (showId?: string) => {
    try {
      const normalizedId = String(showId || "").trim()
      if (!normalizedId) {
        setDetailError(t('detailsMissingId'))
        setIsModalOpen(true)
        return
      }
      setDetailError("")
      setDetailLoading(true)
      setIsModalOpen(true)
      setSelectedShow(null)
      const response = await fetch(`/api/shows/${encodeURIComponent(normalizedId)}/details`)
      
      if (response.ok) {
        const data = await response.json()
        setSelectedShow(data)
        setIsModalOpen(true)  // Modal'ı açık tut
      } else {
        console.error("Show detayları alınamadı")
        const errorBody = await response.json().catch(() => null)
        const detailText = errorBody?.details ? `${errorBody.details}` : errorBody?.error
        const message = detailText ? `${t('detailsLoadError')} (${detailText})` : t('detailsLoadError')
        setDetailError(message)
      }
    } catch (error) {
      console.error("Detaylar alınırken hata:", error)
      setDetailError(t('detailsLoadError'))
    } finally {
      setDetailLoading(false)
    }
  }

  // Modal'ı kapat
  const closeModal = () => {
    setIsModalOpen(false)
  }

  // Tarih formatını düzenle
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(locale)
  }

  // Show süresini hesapla
  const calculateDuration = (startDate: string, endDate: string | null) => {
    if (!endDate) return t('ongoing')
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) {
      return t('durationMinutes', { minutes: diffMins })
    }
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return t('durationHoursMinutes', { hours, minutes: mins })
  }

  // Sayfalama için gösterilecek showları hesapla
  const indexOfLastShow = currentPage * showsPerPage
  const indexOfFirstShow = indexOfLastShow - showsPerPage
  const currentShows = filteredShows.slice(indexOfFirstShow, indexOfLastShow)
  const totalPages = Math.ceil(filteredShows.length / showsPerPage)

  // Sayfa değiştirme fonksiyonu
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const buildTrend = (): TrendPoint[] => {
    const ordered = [...filteredShows].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    return ordered.map((show) => ({
      label: formatDate(show.createdAt),
      value: Number(show.totalEarnings || 0)
    }))
  }

  const trendPoints = buildTrend()

  const getSvgPath = (points: TrendPoint[], width: number, height: number) => {
    if (points.length === 0) return ""
    const maxValue = Math.max(...points.map((p) => p.value), 1)
    const stepX = width / Math.max(points.length - 1, 1)
    return points
      .map((point, index) => {
        const x = index * stepX
        const y = height - (point.value / maxValue) * height
        return `${index === 0 ? 'M' : 'L'}${x},${y}`
      })
      .join(' ')
  }

  const getTrendCoords = (points: TrendPoint[], width: number, height: number) => {
    if (points.length === 0) return [] as { x: number; y: number; value: number }[]
    const maxValue = Math.max(...points.map((p) => p.value), 1)
    const stepX = width / Math.max(points.length - 1, 1)
    return points.map((point, index) => {
      const x = index * stepX
      const y = height - (point.value / maxValue) * height
      return { x, y, value: point.value }
    })
  }

  const getTopSenders = () => {
    if (!selectedShow?.messages?.length) return [] as { name: string; total: number; count: number }[]
    const totals = selectedShow.messages.reduce<Record<string, { name: string; total: number; count: number }>>(
      (acc, message) => {
        const name = message.displayName || 'Anon'
        if (!acc[name]) {
          acc[name] = { name, total: 0, count: 0 }
        }
        acc[name].total += Number(message.payment || 0)
        acc[name].count += 1
        return acc
      },
      {}
    )
    return Object.values(totals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }

  const topSenders = getTopSenders()
  const topEarningShow = [...filteredShows].sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))[0]
  const topMessageShow = [...filteredShows].sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))[0]
  const topShowsByEarnings = [...filteredShows]
    .sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))
    .slice(0, 3)

  if (status === 'loading' || loading) {
    return <div className="container mx-auto p-6 text-white">{t('loading')}</div>
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 text-white">
        <p>{t('mustSignIn')}</p>
        <Link 
          href="/signin"
          className="mt-4 bg-purple-600 text-white px-4 py-2 rounded inline-block"
        >
          {t('signIn')}
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 bg-gray-900 text-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-100">{t('statsTitle')}</h1>
        <Link
          href="/dashboard"
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
        >
          {t('backToDashboard')}
        </Link>
      </div>
      
      {/* Tarih Filtresi */}
      <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-lg">
        <form onSubmit={handleFilterDates} className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">
              {t('startDate')}
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border-gray-700 bg-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
              required
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">
              {t('endDate')}
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border-gray-700 bg-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            {t('filter')}
          </button>
        </form>
      </div>
      
      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-6 rounded-lg shadow-lg text-white">
          <h3 className="text-xl font-semibold mb-2">{t('totalShows')}</h3>
          <p className="text-4xl font-bold">{pastShows.length}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-700 to-teal-800 p-6 rounded-lg shadow-lg text-white">
          <h3 className="text-xl font-semibold mb-2">{t('totalEarnings')}</h3>
          <p className="text-4xl font-bold">€{totalEarnings.toFixed(2)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-600 to-orange-700 p-6 rounded-lg shadow-lg text-white">
          <h3 className="text-xl font-semibold mb-2">{t('totalMessages')}</h3>
          <p className="text-4xl font-bold">{totalMessages}</p>
        </div>
      </div>
      
      {/* Tablo */}
      <div className="mb-4 overflow-x-auto">
        <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <thead className="bg-gray-700 text-gray-200">
            <tr>
              <th className="py-3 px-4 text-left">{t('tableShowName')}</th>
              <th className="py-3 px-4 text-left">{t('tableDate')}</th>
              <th className="py-3 px-4 text-left">{t('tableDuration')}</th>
              <th className="py-3 px-4 text-right">{t('tableMessageCount')}</th>
              <th className="py-3 px-4 text-right">{t('tableEarnings')}</th>
              <th className="py-3 px-4 text-center">{t('tableActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {currentShows.length > 0 ? (
              currentShows.map(show => (
                <tr key={show.id} className="bg-gray-800 hover:bg-gray-700 transition-colors">
                  <td className="py-3 px-4 text-gray-200">{show.title}</td>
                  <td className="py-3 px-4 text-gray-200">{formatDate(show.createdAt)}</td>
                  <td className="py-3 px-4 text-gray-200">{calculateDuration(show.createdAt, show.endedAt)}</td>
                  <td className="py-3 px-4 text-right text-gray-200">{show.messageCount || 0}</td>
                  <td className="py-3 px-4 text-right text-gray-200">€{Number(show.totalEarnings || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => fetchShowDetails((show as any).id || (show as any).showId)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                    >
                      {t('details')}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 px-4 text-center text-gray-400">
                  {t('noShowsInRange')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Sayfalama */}
      {filteredShows.length > 0 && (
        <div className="flex justify-between items-center mb-8">
          <div className="text-sm text-gray-400">
            {t('paginationSummary', { total: filteredShows.length, currentPage, totalPages })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
            >
              {t('previous')}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => paginate(pageNum)}
                className={`px-3 py-1 rounded ${pageNum === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {/* Kazanç Dashboardu */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-10">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-2">{t('topEarningShow')}</h2>
          {topEarningShow ? (
            <div>
              <p className="text-gray-200 font-medium">{topEarningShow.title}</p>
              <p className="text-emerald-300 text-2xl font-bold">€{Number(topEarningShow.totalEarnings || 0).toFixed(2)}</p>
            </div>
          ) : (
            <p className="text-gray-400">{t('noTopShow')}</p>
          )}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-2">{t('topMessageShow')}</h2>
          {topMessageShow ? (
            <div>
              <p className="text-gray-200 font-medium">{topMessageShow.title}</p>
              <p className="text-indigo-300 text-2xl font-bold">{topMessageShow.messageCount}</p>
            </div>
          ) : (
            <p className="text-gray-400">{t('noTopShow')}</p>
          )}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-2">{t('topShows')}</h2>
          {topShowsByEarnings.length > 0 ? (
            <div className="space-y-2">
              {topShowsByEarnings.map((show, index) => (
                <div key={show.id} className="flex items-center justify-between text-sm text-gray-200">
                  <span>{index + 1}. {show.title}</span>
                  <span className="text-emerald-300">€{Number(show.totalEarnings || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">{t('noTopShow')}</p>
          )}
        </div>
      </div>

      {/* Kazanç Trendi */}
      <div className="mb-10 bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('earningsTrend')}</h2>
          <span className="text-sm text-gray-400">{t('trendSubtitle')}</span>
        </div>
        {trendPoints.length > 0 ? (
          <div className="relative">
            <svg viewBox="0 0 400 160" className="w-full h-40">
              <defs>
                <linearGradient id="trend" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path
                d={getSvgPath(trendPoints, 400, 140)}
                fill="none"
                stroke="url(#trend)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {getTrendCoords(trendPoints, 400, 140).map((point, index) => (
                <g key={`point-${index}`}>
                  <circle cx={point.x} cy={point.y} r={4} fill="#f472b6" />
                  <text
                    x={point.x}
                    y={Math.max(point.y - 8, 12)}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#e5e7eb"
                  >
                    €{point.value.toFixed(2)}
                  </text>
                </g>
              ))}
            </svg>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-400">
              {trendPoints.slice(-4).map((point) => (
                <span key={point.label} className="bg-gray-700/70 px-2 py-1 rounded">
                  {point.label}: €{point.value.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-400">{t('noTrendData')}</p>
        )}
      </div>
      
      {/* Seçilen Show Detay Modal'ı */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full" role="dialog" aria-modal="true" aria-labelledby="modal-headline">
              <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-white" id="modal-headline">
                      {selectedShow?.title ? `${selectedShow.title} ${t('showDetails')}` : t('detailsLoading')}
                    </h3>
                    <div className="mt-2">
                      {detailLoading && (
                        <p className="text-gray-300">{t('detailsLoading')}</p>
                      )}
                      {detailError && (
                        <p className="text-rose-300">{detailError}</p>
                      )}
                      {!detailLoading && !detailError && selectedShow && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <h3 className="text-lg font-semibold mb-2 text-gray-200">{t('showInfo')}</h3>
                              <p className="text-gray-300">
                                <span className="font-medium">{t('start')}:</span> {formatDate(selectedShow.createdAt)}
                              </p>
                              {selectedShow.endedAt && (
                                <p className="text-gray-300">
                                  <span className="font-medium">{t('end')}:</span> {formatDate(selectedShow.endedAt)}
                                </p>
                              )}
                              <p className="text-gray-300">
                                <span className="font-medium">{t('duration')}:</span> {calculateDuration(selectedShow.createdAt, selectedShow.endedAt)}
                              </p>
                              <p className="text-gray-300">
                                <span className="font-medium">{t('totalEarningsLabel')}:</span> €{
                                  (selectedShow.messages || [])
                                    .reduce((sum, message) => sum + (Number(message.payment) || 0), 0)
                                    .toFixed(2)
                                }
                              </p>
                            </div>
                            
                            <div>
                              <h3 className="text-lg font-semibold mb-2 text-gray-200">{t('showStats')}</h3>
                              <p className="text-gray-300">
                                <span className="font-medium">{t('totalMessagesLabel')}:</span> {selectedShow.messageCount}
                              </p>
                              <p className="text-gray-300">
                                <span className="font-medium">{t('paidMessages')}:</span> {selectedShow.messages.filter(m => m.payment > 0).length}
                              </p>
                              <p className="text-gray-300">
                                <span className="font-medium">{t('avgPayment')}:</span> €{(
                                  selectedShow.messages.reduce((sum, m) => sum + (m.payment || 0), 0) / 
                                  Math.max(1, selectedShow.messages.filter(m => m.payment > 0).length)
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>
                    
                          {/* Mesaj Listesi */}
                          <div>
                            <h3 className="text-lg font-medium text-gray-200">{t('messagesTitle')}</h3>
                            {selectedShow.messages.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {selectedShow.messages.map(message => (
                                <div 
                                  key={message.id} 
                                  className={`p-3 bg-gray-700 rounded border-l-4 ${message.payment > 0 ? 'border-green-500' : 'border-gray-600'}`}
                                >
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <p className="font-medium text-gray-200">
                                      {message.displayName}
                                      <span className="ml-2 text-sm bg-green-800 text-green-100 px-2 py-1 rounded-full">
                                        €{Number(message.payment || 0).toFixed(2)}
                                      </span>
                                    </p>
                                    <p className="text-sm text-gray-400">{formatDate(message.createdAt)}</p>
                                  </div>
                                  <p className="mt-1 text-gray-300">{message.content}</p>
                                </div>
                              ))}
                            </div>
                            ) : (
                              <p className="text-gray-400">{t('noMessagesInShow')}</p>
                            )}
                          </div>

                          {/* Top Senders */}
                          <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-200">{t('topSenders')}</h3>
                            {topSenders.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {topSenders.map((sender, index) => (
                                  <div key={sender.name} className="flex items-center justify-between bg-gray-700/70 rounded px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="h-6 w-6 rounded-full bg-purple-600 text-xs flex items-center justify-center">
                                        {index + 1}
                                      </span>
                                      <span className="text-gray-200">{sender.name}</span>
                                      <span className="text-xs text-gray-400">({sender.count})</span>
                                    </div>
                                    <span className="text-emerald-300 font-semibold">€{sender.total.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400">{t('noTopSenders')}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeModal}
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}