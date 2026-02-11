// src/app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">☕🚗</div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Fidelización Zona
          </h1>
          <p className="text-slate-300 text-lg">
            Sistema de beneficios Coques + Lavadero
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Cliente */}
          <Link
            href="/pass"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-6 transition-all border border-white/20 hover:border-white/30 group"
          >
            <div className="text-3xl mb-3">🎫</div>
            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
              Mi Pass
            </h2>
            <p className="text-slate-400 text-sm">
              Accedé a tu tarjeta de fidelización
            </p>
          </Link>

          {/* Activar cuenta */}
          <Link
            href="/activar"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-6 transition-all border border-white/20 hover:border-white/30 group"
          >
            <div className="text-3xl mb-3">✨</div>
            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-green-300 transition-colors">
              Activar Cuenta
            </h2>
            <p className="text-slate-400 text-sm">
              Registrate y empezá a acumular beneficios
            </p>
          </Link>

          {/* Local Coques */}
          <Link
            href="/local"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-6 transition-all border border-white/20 hover:border-white/30 group"
          >
            <div className="text-3xl mb-3">☕</div>
            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
              App Local Coques
            </h2>
            <p className="text-slate-400 text-sm">
              Para el personal del café
            </p>
          </Link>

          {/* Lavadero */}
          <Link
            href="/lavadero"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-6 transition-all border border-white/20 hover:border-white/30 group"
          >
            <div className="text-3xl mb-3">🚗</div>
            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
              Panel Lavadero
            </h2>
            <p className="text-slate-400 text-sm">
              Gestión de estados de autos
            </p>
          </Link>

          {/* Admin */}
          <Link
            href="/admin"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-6 transition-all border border-white/20 hover:border-white/30 group sm:col-span-2"
          >
            <div className="text-3xl mb-3">⚙️</div>
            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
              Panel Admin
            </h2>
            <p className="text-slate-400 text-sm">
              Métricas, clientes y gestión de eventos especiales
            </p>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-slate-500 text-sm">
            Sistema de fidelización integrado para Coques y Lavadero
          </p>
        </div>
      </div>
    </div>
  )
}
