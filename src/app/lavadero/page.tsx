'use client'
// src/app/lavadero/page.tsx
// Panel interno del lavadero — actualizar estado de autos
import { useState } from 'react'
import { EstadoAuto, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'
import { normalizarPatente, formatearPatenteDisplay } from '@/lib/patente'

const LAVADERO_API_KEY = process.env.NEXT_PUBLIC_LAVADERO_API_KEY || ''

const ESTADOS: EstadoAuto[] = ['RECIBIDO', 'EN_LAVADO', 'EN_SECADO', 'LISTO', 'ENTREGADO']

interface AutoActivo {
  phone: string
  nombre?: string
  patente: string
  marca?: string
  modelo?: string
  estado: EstadoAuto
}

export default function LavaderoPage() {
  const [phone, setPhone] = useState('')
  const [patente, setPatente] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [autosActivos, setAutosActivos] = useState<AutoActivo[]>([])

  async function actualizarEstado(
    phoneTarget: string,
    estado: EstadoAuto,
    patenteTarget: string,
    marcaTarget?: string,
    modeloTarget?: string
  ) {
    setCargando(true)
    setMensaje('')

    const phoneFormatted = phoneTarget.startsWith('+')
      ? phoneTarget
      : `+549${phoneTarget.replace(/\D/g, '')}`

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

        if (estado === 'RECIBIDO') {
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

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Botón Volver */}
        <button
          onClick={() => (window.location.href = '/')}
          className="flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Volver</span>
        </button>

        <h1 className="text-2xl font-bold mb-1">Panel Lavadero</h1>
        <p className="text-slate-400 text-sm mb-8">Gestión de estados de autos</p>

        {/* Ingreso de nuevo auto */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-slate-200 mb-4">Registrar auto</h2>
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
              onClick={() => actualizarEstado(phone, 'RECIBIDO', patente)}
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
                  <div key={auto.phone} className="bg-slate-800 rounded-2xl p-4">
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
                      {ESTADOS.filter((e) => e !== auto.estado && e !== 'RECIBIDO').map((estado) => (
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
