// src/app/page.tsx
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const fecha = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    // Verificar si el usuario tiene token
    const token = localStorage.getItem('fidelizacion_token')
    setIsLoggedIn(!!token)
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-white/80 text-lg mb-2">Bienvenido/a</h2>
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-3">Fidelización Zona</h1>
          <p className="text-white/70 capitalize">{fecha}</p>
        </div>

        {/* Sección Clientes */}
        {!loading && (
          <div className="mb-8">
            <h2 className="text-white text-2xl font-bold mb-6 flex items-center gap-2">
              <span>👥</span> Para Clientes
            </h2>
            
            <div className={`grid ${isLoggedIn ? 'md:grid-cols-1 max-w-xl' : 'md:grid-cols-2'} gap-6 mb-8`}>
              {/* Mi Pass */}
              <Link href="/pass" className="group">
              <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">🎫</div>
                    <div>
                      <h3 className="text-3xl font-bold text-purple-600 mb-1">Mi Pass</h3>
                      <p className="text-gray-600">Accedé a tu tarjeta digital</p>
                    </div>
                  </div>
                  <div className="text-4xl text-purple-400 group-hover:scale-110 transition-transform">
                    →
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-purple-700">
                    ✓ Ver tu QR code dinámico<br />
                    ✓ Consultar beneficios activos<br />
                    ✓ Estado de tu auto en el lavadero
                  </p>
                </div>
              </div>
              </Link>

              {/* Activar Cuenta - Solo si NO está logueado */}
              {!isLoggedIn && (
                <Link href="/activar" className="group">
                  <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="text-5xl">✨</div>
                        <div>
                          <h3 className="text-3xl font-bold text-green-600 mb-1">Registrarse</h3>
                          <p className="text-gray-600">Creá tu cuenta gratis</p>
                        </div>
                      </div>
                      <div className="text-4xl text-green-400 group-hover:scale-110 transition-transform">
                        →
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm text-green-700">
                        ✓ Sin costos de inscripción<br />
                        ✓ Beneficios desde el primer día<br />
                        ✓ Acumulá puntos por cada visita
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {/* Login Link - Solo si NO está logueado */}
            {!isLoggedIn && (
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all backdrop-blur-sm border border-white/20"
                >
                  <span>🔑</span>
                  <span>¿Ya tenés cuenta? Iniciá sesión</span>
                </Link>
              </div>
            )}

            {/* Info de prueba */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border-2 border-white/20">
              <p className="text-white/90 text-sm">
                <strong className="text-white">Cliente de prueba:</strong> Juan Pérez • Tel: <code className="bg-black/20 px-2 py-1 rounded ml-1">+5491112345678</code>
              </p>
            </div>

            {/* Link discreto para Staff */}
            <div className="mt-8 text-center">
              <Link
                href="/staff"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white/90 text-xs font-medium transition-all"
              >
                <span>🔑</span>
                <span>Acceso Staff</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
