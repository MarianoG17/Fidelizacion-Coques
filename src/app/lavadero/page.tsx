'use client'
// src/app/lavadero/page.tsx
// Panel interno del lavadero — actualizar estado de autos y scanner QR
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EstadoAuto, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'
import { normalizarPatente, formatearPatenteDisplay } from '@/lib/patente'
import dynamic from 'next/dynamic'

// Importar QRScanner dinámicamente para evitar problemas de SSR
const QRScanner = dynamic(() => import('@/components/local/QRScanner'), {
  ssr: false,
  loading: () => <div className="text-center text-slate-400">Cargando escáner...</div>,
})

const LAVADERO_API_KEY = process.env.NEXT_PUBLIC_LAVADERO_API_KEY || ''

const ESTADOS: EstadoAuto[] = ['EN_PROCESO', 'LISTO', 'ENTREGADO']

interface AutoActivo {
  phone: string
  nombre?: string
  patente: string
  marca?: string
  modelo?: string
  estado: EstadoAuto
}

export default function LavaderoPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [patente, setPatente] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [autosActivos, setAutosActivos] = useState<AutoActivo[]>([])
  const [mostrarScanner, setMostrarScanner] = useState(false)

  // Verificar autenticación al cargar
  useEffect(() => {
    const token = localStorage.getItem('empleado_token')
    if (!token) {
      router.push('/lavadero/login')
      return
    }
    setAuthenticated(true)
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('empleado_token')
    router.push('/lavadero/login')
  }

  async function actualizarEstado(
    phoneTarget: string,
    estado: EstadoAuto,
    patenteTarget: string,
    marcaTarget?: string,
    modeloTarget?: string
  ) {
    setCargando(true)
    setMensaje('')

    // Solo números, sin prefijo +549
    const phoneFormatted = phoneTarget.replace(/\D/g, '')

    const patenteNormalizada = normalizarPatente(patenteTarget)

    try {
      const res = await fetch('/api/estados-auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': LAVADERO_API_KEY,
        },
        body: JSON.stringify({
          phone: phoneFormatted,
          patente: patenteNormalizada,
          estado,
          marca: marcaTarget,
          modelo: modeloTarget,
        }),
      })

      const json = await res.json()

      if (res.ok) {
        setMensaje(
          json.beneficiosDisparados?.length > 0
            ? `✓ Estado actualizado · Se habilitó beneficio en Coques: ${json.beneficiosDisparados[0].nombre}`
            : `✓ ${formatearPatenteDisplay(patenteNormalizada)} - ${ESTADO_AUTO_LABELS[estado]}`
        )

        // Actualizar lista de autos activos
        setAutosActivos((prev) => {
          const key = `${phoneFormatted}-${patenteNormalizada}`
          const idx = prev.findIndex((a) => `${a.phone}-${a.patente}` === key)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = { ...next[idx], estado }
            return next
          }
          return [
            ...prev,
            {
              phone: phoneFormatted,
              patente: patenteNormalizada,
              marca: marcaTarget,
              modelo: modeloTarget,
              estado,
            },
          ]
        })

        if (estado === 'EN_PROCESO') {
          setPhone('')
          setPatente('')
          setNombre('')
        }
      } else {
        setMensaje('Error: ' + (json.error || 'Desconocido'))
      }
    } catch {
      setMensaje('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  const handleScanSuccess = async (otp: string) => {
    setCargando(true)
    setMensaje('')
    setMostrarScanner(false)

    try {
      // Validar el QR escaneado
      const res = await fetch('/api/clientes/validar-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      })

      const json = await res.json()

      if (res.ok && json.valido && json.cliente) {
        // Obtener datos del cliente
        setNombre(json.cliente.nombre || '')
        
        // Si el cliente tiene autos, usar el primero
        if (json.cliente.autos && json.cliente.autos.length > 0) {
          const primerAuto = json.cliente.autos[0]
          setPatente(primerAuto.patente)
          
          // Extraer teléfono del cliente (necesitamos agregarlo a la respuesta)
          setMensaje(`✓ Cliente identificado: ${json.cliente.nombre}`)
        } else {
          setMensaje(`✓ Cliente identificado: ${json.cliente.nombre}. Agregá la patente manualmente.`)
        }
      } else {
        setMensaje('Error: QR inválido o expirado')
      }
    } catch {
      setMensaje('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Verificando autenticación...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header con logout */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Panel Lavadero</h1>
            <p className="text-slate-400 text-sm">Gestión de estados de autos</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium">Salir</span>
          </button>
        </div>

        {/* Botón Scanner QR */}
        <button
          onClick={() => setMostrarScanner(!mostrarScanner)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-semibold mb-4 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          {mostrarScanner ? 'Cerrar escáner' : 'Escanear QR del cliente'}
        </button>

        {/* Scanner QR */}
        {mostrarScanner && (
          <div className="bg-slate-800 rounded-2xl p-5 mb-6">
            <QRScanner
              onScan={handleScanSuccess}
              isActive={mostrarScanner}
            />
            <button
              onClick={() => setMostrarScanner(false)}
              className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl transition-colors"
            >
              Cerrar escáner
            </button>
          </div>
        )}

        {/* Ingreso manual de auto */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-slate-200 mb-4">Registrar auto manualmente</h2>
          <div className="space-y-3">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Celular del cliente (ej: 1112345678)"
              className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={patente}
              onChange={(e) => setPatente(e.target.value.toUpperCase())}
              placeholder="Patente (ABC123 o AB123CD)"
              className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
            <button
              onClick={() => actualizarEstado(phone, 'EN_PROCESO', patente)}
              disabled={!phone || !patente || cargando}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {cargando ? 'Registrando...' : 'Registrar recepción'}
            </button>
          </div>
        </div>

        {mensaje && (
          <div className={`rounded-xl p-3 mb-6 text-sm text-center ${
            mensaje.startsWith('Error') ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
          }`}>
            {mensaje}
          </div>
        )}

        {/* Autos activos */}
        {autosActivos.filter(a => a.estado !== 'ENTREGADO').length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-200 mb-4">Autos en proceso</h2>
            <div className="space-y-3">
              {autosActivos
                .filter((a) => a.estado !== 'ENTREGADO')
                .map((auto) => (
                  <div key={`${auto.phone}-${auto.patente}`} className="bg-slate-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-white text-lg">
                          {formatearPatenteDisplay(auto.patente)}
                        </p>
                        {(auto.marca || auto.modelo) && (
                          <p className="text-sm text-slate-400">
                            {[auto.marca, auto.modelo].filter(Boolean).join(' ')}
                          </p>
                        )}
                        <p className="font-mono text-xs text-slate-500 mt-0.5">{auto.phone}</p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: ESTADO_AUTO_COLORS[auto.estado] + '33',
                          color: ESTADO_AUTO_COLORS[auto.estado],
                        }}
                      >
                        {ESTADO_AUTO_LABELS[auto.estado]}
                      </span>
                    </div>

                    {/* Botones de estado */}
                    <div className="grid grid-cols-2 gap-2">
                      {ESTADOS.filter((e) => e !== auto.estado && e !== 'EN_PROCESO').map((estado) => (
                        <button
                          key={estado}
                          onClick={() =>
                            actualizarEstado(auto.phone, estado, auto.patente, auto.marca, auto.modelo)
                          }
                          disabled={cargando}
                          className="py-2 px-3 rounded-lg text-xs font-semibold transition-colors"
                          style={{
                            backgroundColor: ESTADO_AUTO_COLORS[estado] + '33',
                            color: ESTADO_AUTO_COLORS[estado],
                          }}
                        >
                          → {ESTADO_AUTO_LABELS[estado]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
