'use client'
// src/app/qr/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PassData, NIVEL_COLORS } from '@/types'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

const REFRESH_INTERVAL = 5000

export default function QRPage() {
  const router = useRouter()
  const [pass, setPass] = useState<PassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(30)

  const fetchPass = useCallback(async () => {
    const token = localStorage.getItem('fidelizacion_token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const res = await fetchWithRetry('/api/pass', {
        headers: { Authorization: `Bearer ${token}` },
        maxRetries: 3,
        timeout: 15000,
        retryDelay: 1000,
      })

      if (res.status === 401) {
        localStorage.removeItem('fidelizacion_token')
        router.push('/login')
        return
      }

      const json = await res.json()
      if (!json.data) throw new Error('Datos inválidos')

      setPass(json.data)
      setCountdown(json.data.otp.tiempoRestante)
      setError(null)
      setLoading(false)
    } catch {
      setError('connection')
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('fidelizacion_token')
    if (!token) { router.push('/login'); return }
    fetchPass()
    const interval = setInterval(fetchPass, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchPass, router])

  // Countdown visual
  useEffect(() => {
    if (!pass) return
    setCountdown(pass.otp.tiempoRestante)
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? pass.otp.tiempoRestante : c - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [pass?.otp.token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !pass) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-5xl mb-4">📡</p>
          <p className="text-gray-600 mb-4">No se pudo cargar el QR</p>
          <button
            onClick={() => { setLoading(true); fetchPass() }}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const progress = (countdown / 30) * 100
  const circumference = 2 * Math.PI * 26

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-28 pt-8 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Mi QR</h1>
          <p className="text-sm text-gray-500 mt-1">Mostralo al staff para validar tu visita</p>
        </div>

        {/* Card QR */}
        <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center">
          {/* Nombre y nivel */}
          <p className="text-lg font-semibold text-slate-700 mb-1">{pass.nombre}</p>
          {pass.nivel && (
            <span className="text-sm text-white font-semibold px-3 py-0.5 rounded-full mb-5"
              style={{ backgroundColor: NIVEL_COLORS[pass.nivel.nombre] || '#6b7280' }}>
              {pass.nivel.nombre}
            </span>
          )}

          {/* QR image */}
          <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-inner mb-4">
            <img
              src={pass.otp.qrDataUrl}
              alt="QR de validación"
              className="w-60 h-60 rounded-xl"
            />
          </div>

          {/* Countdown con anillo SVG */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle
                  cx="30" cy="30" r="26" fill="none"
                  stroke="#7c3aed" strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-800">
                {countdown}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">segundos restantes</p>
          </div>

          {/* Código manual */}
          <div className="w-full bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
            <p className="text-sm text-gray-400 mb-1">Código manual</p>
            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-slate-800">
              {pass.otp.token}
            </span>
          </div>
        </div>

        <p className="text-sm text-center text-gray-400 mt-4">
          🔄 Se actualiza automáticamente cada 30 segundos
        </p>
      </div>

      {/* Navegación inferior fija */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
          <Link href="/pass" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            <span className="text-sm font-medium">Pass</span>
          </Link>

          <Link href="/logros" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-sm font-medium">Beneficios</span>
          </Link>

          {/* Botón QR central elevado — activo */}
          <Link href="/qr" className="flex flex-col items-center gap-0.5 relative -top-4">
            <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-200 border-4 border-white">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm8-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm10 1h-2v2h2v2h-2v2h2v-2h2v2h2v-2h-2v-2h2v-2h-2v2h-2v-2zm-2-2h2v2h-2v-2z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-purple-600">Mi QR</span>
          </Link>

          <Link href="/historial" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Historial</span>
          </Link>

          <Link href="/perfil" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
