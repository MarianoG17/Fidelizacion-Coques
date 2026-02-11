// src/app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-7xl">☕</span>
            <span className="text-7xl">🚗</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl">
            Fidelización Zona
          </h1>
          <p className="text-xl text-white/90 font-medium">
            Sistema integrado Coques + Lavadero
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* ========== SECCIÓN CLIENTES ========== */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              👥 Para Clientes
            </h2>
            <div className="space-y-4">
              <Link
                href="/pass"
                className="block group relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl mb-4">🎫</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Mi Pass
                  </h3>
                  <p className="text-gray-600">
                    Accedé a tu tarjeta de fidelización digital con QR
                  </p>
                </div>
              </Link>

              <Link
                href="/activar"
                className="block group relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl mb-4">✨</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Activar Cuenta
                  </h3>
                  <p className="text-gray-600">
                    Registrate y empezá a acumular beneficios
                  </p>
                </div>
              </Link>
            </div>

            <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/30">
              <h4 className="text-white font-bold text-sm mb-2">📱 Cliente de prueba</h4>
              <p className="text-white/80 text-sm">
                Tel: <code className="bg-black/20 px-2 py-1 rounded">+5491112345678</code>
              </p>
            </div>
          </div>

          {/* ========== SECCIÓN STAFF ========== */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              👨‍💼 Para Staff
            </h2>
            <div className="space-y-4">
              <Link
                href="/local"
                className="block group relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl mb-4">☕</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    App Coques
                  </h3>
                  <p className="text-gray-600">
                    Scanner QR y registro de visitas
                  </p>
                </div>
              </Link>

              <Link
                href="/lavadero"
                className="block group relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl mb-4">🚗</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Panel Lavadero
                  </h3>
                  <p className="text-gray-600">
                    Gestión de estados de autos
                  </p>
                </div>
              </Link>

              <Link
                href="/admin"
                className="block group relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl mb-4">⚙️</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Administración
                  </h3>
                  <p className="text-gray-600">
                    Métricas, clientes y eventos
                  </p>
                </div>
              </Link>
            </div>

            <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/30">
              <h4 className="text-white font-bold text-sm mb-2">🔑 API Keys de prueba</h4>
              <div className="space-y-1 text-white/80 text-xs">
                <p><strong>Coques:</strong> <code className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">coques-api-key-dev-change-in-prod</code></p>
                <p><strong>Lavadero:</strong> <code className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">lavadero-api-key-dev-change-in-prod</code></p>
                <p><strong>Admin:</strong> Header <code className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">x-admin-key</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
