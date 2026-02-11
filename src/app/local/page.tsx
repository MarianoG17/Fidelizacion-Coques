'use client'
// src/app/local/page.tsx
import { useState, useRef } from 'react'
import { ValidacionResult, MesaLayout, NIVEL_COLORS, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'

const LOCAL_API_KEY = process.env.NEXT_PUBLIC_LOCAL_API_KEY || ''

type Pantalla = 'scanner' | 'cliente' | 'confirmar'

export default function LocalPage() {
  const [pantalla, setPantalla] = useState<Pantalla>('scanner')
  const [otpInput, setOtpInput] = useState('')
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<MesaLayout | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [eventoRegistrado, setEventoRegistrado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mesas hardcodeadas para MVP — en prod vienen de /api/mesas
  const mesas: MesaLayout[] = [
    { id: 'm1', nombre: '1', posX: 5, posY: 5, ancho: 18, alto: 18, activa: true },
    { id: 'm2', nombre: '2', posX: 28, posY: 5, ancho: 18, alto: 18, activa: true },
    { id: 'm3', nombre: '3', posX: 51, posY: 5, ancho: 18, alto: 18, activa: true },
    { id: 'm4', nombre: '4', posX: 5, posY: 30, ancho: 18, alto: 18, activa: true },
    { id: 'm5', nombre: '5', posX: 28, posY: 30, ancho: 18, alto: 18, activa: true },
    { id: 'm6', nombre: '6', posX: 51, posY: 30, ancho: 18, alto: 18, activa: true },
    { id: 'barra', nombre: 'Barra', posX: 5, posY: 58, ancho: 64, alto: 12, activa: true },
  ]

  async function validarOTP(otp: string) {
    if (otp.length !== 6) return
    setCargando(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/otp/validar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': LOCAL_API_KEY,
        },
        body: JSON.stringify({ otp }),
      })
      const json = await res.json()

      if (json.valido) {
        setValidacion(json)
        setPantalla('cliente')
      } else {
        setErrorMsg(json.error || 'Código inválido o vencido')
        setOtpInput('')
        inputRef.current?.focus()
      }
    } catch {
      setErrorMsg('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  async function registrarEvento() {
    if (!validacion?.cliente) return
    setCargando(true)

    const tieneBeneficio = validacion.cliente.beneficiosActivos.length > 0
    const beneficioId = tieneBeneficio ? validacion.cliente.beneficiosActivos[0].id : null

    try {
      await fetch('/api/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': LOCAL_API_KEY,
        },
        body: JSON.stringify({
          clienteId: validacion.cliente.id,
          mesaId: mesaSeleccionada?.id || null,
          tipoEvento: tieneBeneficio ? 'BENEFICIO_APLICADO' : 'VISITA',
          beneficioId,
          metodoValidacion: 'OTP_MANUAL',
        }),
      })
      setEventoRegistrado(true)
    } catch {
      setErrorMsg('Error al registrar el evento')
    } finally {
      setCargando(false)
    }
  }

  function resetear() {
    setPantalla('scanner')
    setOtpInput('')
    setValidacion(null)
    setMesaSeleccionada(null)
    setErrorMsg('')
    setEventoRegistrado(false)
  }

  // ─── Pantalla Scanner ─────────────────────────────────────────────────────
  if (pantalla === 'scanner') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center py-8 px-4">
        <h1 className="text-white text-xl font-bold mb-2">App del Local</h1>
        <p className="text-slate-400 text-sm mb-8">Coques</p>

        {/* Input OTP manual */}
        <div className="w-full max-w-sm">
          <div className="bg-slate-800 rounded-2xl p-6">
            <p className="text-slate-300 text-sm text-center mb-4">
              Ingresá el código del cliente
            </p>
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setOtpInput(val)
                setErrorMsg('')
                if (val.length === 6) validarOTP(val)
              }}
              placeholder="_ _ _ _ _ _"
              className="w-full text-center text-4xl font-mono tracking-[0.4em] bg-slate-700 text-white rounded-xl py-4 px-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
              autoFocus
              disabled={cargando}
            />

            {errorMsg && (
              <p className="text-red-400 text-sm text-center mt-3">{errorMsg}</p>
            )}

            {cargando && (
              <div className="flex justify-center mt-4">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <p className="text-slate-500 text-xs text-center mt-4">
            El cliente muestra el código de 6 dígitos desde su app
          </p>
        </div>
      </div>
    )
  }

  // ─── Pantalla Cliente (post-validación) ───────────────────────────────────
  if (pantalla === 'cliente' && validacion?.cliente) {
    const c = validacion.cliente
    const nivelColor = c.nivel ? NIVEL_COLORS[c.nivel] || '#6b7280' : '#6b7280'

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-sm">

          {/* Header cliente */}
          <div className="bg-white rounded-2xl shadow p-5 mb-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-slate-800">{c.nombre}</h2>
              {c.nivel && (
                <span
                  className="px-3 py-1 rounded-full text-white text-xs font-bold"
                  style={{ backgroundColor: nivelColor }}
                >
                  {c.nivel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <p className="text-green-600 text-sm font-medium">Código válido ✓</p>
            </div>
          </div>

          {/* Estado del auto */}
          {c.estadoAuto && c.estadoAuto.estado !== 'ENTREGADO' && (
            <div
              className="rounded-2xl p-4 mb-4 border-2"
              style={{
                backgroundColor: ESTADO_AUTO_COLORS[c.estadoAuto.estado] + '15',
                borderColor: ESTADO_AUTO_COLORS[c.estadoAuto.estado],
              }}
            >
              <p className="font-bold text-slate-800 text-sm">🚗 Auto en el lavadero</p>
              <p
                className="font-semibold text-base mt-1"
                style={{ color: ESTADO_AUTO_COLORS[c.estadoAuto.estado] }}
              >
                {ESTADO_AUTO_LABELS[c.estadoAuto.estado]}
              </p>
            </div>
          )}

          {/* Beneficios activos */}
          {c.beneficiosActivos.length > 0 ? (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Beneficios a aplicar
              </h3>
              {c.beneficiosActivos.map((b) => (
                <div
                  key={b.id}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 mb-2"
                >
                  <p className="font-bold text-green-800">{b.nombre}</p>
                  <p className="text-sm text-green-700 mt-1 font-mono bg-green-100 rounded p-2">
                    → Cargar en Aires: {b.descripcionCaja}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4 mb-4 text-center">
              <p className="text-gray-500 text-sm">Sin beneficios activos en este momento</p>
            </div>
          )}

          {/* Selector de mesas */}
          {!eventoRegistrado && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Seleccioná la mesa
              </h3>
              <div
                className="relative bg-slate-100 rounded-2xl mb-4 overflow-hidden"
                style={{ paddingBottom: '75%' }}
              >
                <div className="absolute inset-0 p-3">
                  {mesas.map((mesa) => (
                    <button
                      key={mesa.id}
                      onClick={() => setMesaSeleccionada(mesa)}
                      className={`absolute rounded-lg text-xs font-bold transition-all ${
                        mesaSeleccionada?.id === mesa.id
                          ? 'bg-slate-800 text-white shadow-lg scale-105'
                          : 'bg-white text-slate-700 shadow hover:bg-slate-200'
                      }`}
                      style={{
                        left: `${mesa.posX}%`,
                        top: `${mesa.posY}%`,
                        width: `${mesa.ancho}%`,
                        height: `${mesa.alto}%`,
                      }}
                    >
                      {mesa.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón registrar */}
              <button
                onClick={registrarEvento}
                disabled={cargando}
                className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50"
              >
                {cargando ? 'Registrando...' : 'Confirmar visita'}
              </button>

              <button
                onClick={resetear}
                className="w-full mt-2 text-gray-400 py-2 text-sm"
              >
                Cancelar
              </button>
            </>
          )}

          {/* Confirmación final */}
          {eventoRegistrado && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-bold text-green-800 text-lg">Visita registrada</p>
              {mesaSeleccionada && (
                <p className="text-green-600 text-sm mt-1">Mesa: {mesaSeleccionada.nombre}</p>
              )}
              <button
                onClick={resetear}
                className="mt-4 w-full bg-slate-800 text-white py-3 rounded-xl font-semibold"
              >
                Nuevo escaneo
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
