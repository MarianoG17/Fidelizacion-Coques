'use client'
import Link from 'next/link'

export default function StaffPage() {
  const fecha = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-white/80 text-lg mb-2">Panel de Gestión</h2>
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-3">Fidelización Zona - Staff</h1>
          <p className="text-white/70 capitalize">{fecha}</p>
        </div>

        {/* Sección Staff */}
        <div>
          <h2 className="text-white text-2xl font-bold mb-6 flex items-center gap-2">
            <span>👨‍💼</span> Herramientas de Gestión
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* App Coques */}
            <Link href="/local" className="group">
              <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-5xl">☕</div>
                  <h3 className="text-2xl font-bold text-amber-600">App Coques</h3>
                </div>
                <p className="text-gray-600 mb-4">Validar clientes y registrar visitas</p>
                <div className="flex items-center gap-2 text-amber-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Abrir</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* Panel Lavadero */}
            <Link href="/lavadero" className="group">
              <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-5xl">🚗</div>
                  <h3 className="text-2xl font-bold text-cyan-600">Lavadero</h3>
                </div>
                <p className="text-gray-600 mb-4">Gestión de estados de autos</p>
                <div className="flex items-center gap-2 text-cyan-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Abrir</span>
                  <span>→</span>
                </div>
              </div>
            </Link>

            {/* Panel Admin */}
            <Link href="/admin" className="group">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-5xl">⚙️</div>
                  <h3 className="text-2xl font-bold">Admin</h3>
                </div>
                <p className="text-white/90 mb-4">Métricas, clientes y eventos</p>
                <div className="flex items-center gap-2 font-semibold group-hover:gap-3 transition-all">
                  <span>Abrir</span>
                  <span>→</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Credenciales */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border-2 border-white/20">
              <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span>🔑</span> API Keys de Prueba
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-white/80">
                  <strong className="text-white">Coques:</strong><br />
                  <code className="bg-black/20 px-2 py-1 rounded text-xs break-all">coques-api-key-dev-change-in-prod</code>
                </p>
                <p className="text-white/80">
                  <strong className="text-white">Lavadero:</strong><br />
                  <code className="bg-black/20 px-2 py-1 rounded text-xs break-all">lavadero-api-key-dev-change-in-prod</code>
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border-2 border-white/20">
              <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span>🔐</span> Acceso Admin
              </h4>
              <p className="text-white/80 text-sm mb-2">
                Usar extensión ModHeader para agregar:
              </p>
              <div className="bg-black/20 rounded px-3 py-2">
                <p className="text-white/90 text-xs font-mono">
                  Header: <strong>x-admin-key</strong><br />
                  Value: [tu ADMIN_KEY de Vercel]
                </p>
              </div>
            </div>
          </div>

          {/* Info adicional */}
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-5 border-2 border-white/20">
            <p className="text-white/90 text-sm">
              <strong className="text-white">Cliente de prueba:</strong> Juan Pérez • Tel: <code className="bg-black/20 px-2 py-1 rounded ml-1">1112345678</code>
            </p>
          </div>

          {/* Link a home pública */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all backdrop-blur-sm border border-white/20"
            >
              <span>←</span>
              <span>Volver a Home Pública</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
