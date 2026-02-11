'use client'
// src/app/local/page.tsx
import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { ValidacionResult, MesaLayout, NIVEL_COLORS, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'

const LOCAL_API_KEY = process.env.NEXT_PUBLIC_LOCAL_API_KEY || ''

// Importar QR Scanner dinámicamente (solo en cliente)
const QRScanner = dynamic(() => import('@/components/local/QRScanner'), { ssr: false })

type Pantalla = 'scanner' | 'cliente' | 'confirmar'
type MetodoInput = 'qr' | 'manual'

export default function LocalPage() {
  const [pantalla, setPantalla] = useState<Pantalla>('scanner')
  const [metodoInput, setMetodoInput] = useState<MetodoInput>('qr')
  const [otpInput, setOtpInput] = useState('')
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<MesaLayout | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [eventoRegistrado, setEventoRegistrado] = useState(false)
  const [scannerActivo, setScannerActivo] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Layout del salón según imagen - Coordenadas aproximadas en %
  const mesas: MesaLayout[] = [
    // Fila superior izquierda
    { id: 's1', nombre: 'S1', posX: 2, posY: 2, ancho: 8, alto: 8, activa: true },
    { id: 's3', nombre: 'S3', posX: 12, posY: 2, ancho: 8, alto: 8, activa: true },
    { id: 's5', nombre: 'S5', posX: 22, posY: 2, ancho: 8, alto: 8, activa: true },
    { id: 's7', nombre: 'S7', posX: 32, posY: 2, ancho: 8, alto: 8, activa: true },
    // Fila 2 izquierda
    { id: 's2', nombre: 'S2', posX: 2, posY: 12, ancho: 8, alto: 8, activa: true },
    { id: 's4', nombre: 'S4', posX: 12, posY: 12, ancho: 8, alto: 8, activa: true },
    { id: 's6', nombre: 'S6', posX: 22, posY: 12, ancho: 8, alto: 8, activa: true },
    // Columna central
    { id: 's8', nombre: 'S8', posX: 45, posY: 5, ancho: 8, alto: 8, activa: true },
    { id: 's9', nombre: 'S9', posX: 42, posY: 15, ancho: 8, alto: 8, activa: true },
    { id: 's10', nombre: 'S10', posX: 42, posY: 25, ancho: 8, alto: 8, activa: true },
    { id: 's11', nombre: 'S11', posX: 38, posY: 35, ancho: 8, alto: 8, activa: true },
    { id: 's12', nombre: 'S12', posX: 38, posY: 45, ancho: 8, alto: 8, activa: true },
    // Columna derecha
    { id: 'g21', nombre: 'G21', posX: 70, posY: 12, ancho: 8, alto: 8, activa: true },
    { id: 'g22', nombre: 'G22', posX: 70, posY: 24, ancho: 8, alto: 8, activa: true },
    { id: 'g23', nombre: 'G23', posX: 82, posY: 18, ancho: 8, alto: 8, activa: true },
    // Mesa individual centro
    { id: 's13', nombre: 'S13', posX: 48, posY: 58, ancho: 8, alto: 8, activa: true },
    // Zona inferior - Grupo de mesas 4x2
    { id: 's25', nombre: 'S25', posX: 38, posY: 75, ancho: 7, alto: 7, activa: true },
    { id: 's21', nombre: 'S21', posX: 46, posY: 75, ancho: 7, alto: 7, activa: true },
    { id: 's24', nombre: 'S24', posX: 38, posY: 83, ancho: 7, alto: 7, activa: true },
    { id: 's20', nombre: 'S20', posX: 46, posY: 83, ancho: 7, alto: 7, activa: true },
    { id: 's23', nombre: 'S23', posX: 38, posY: 91, ancho: 7, alto: 7, activa: true },
    { id: 's19', nombre: 'S19', posX: 46, posY: 91, ancho: 7, alto: 7, activa: true },
    { id: 's22', nombre: 'S22', posX: 38, posY: 99, ancho: 7, alto: 7, activa: true },
    { id: 's18', nombre: 'S18', posX: 46, posY: 99, ancho: 7, alto: 7, activa: true },
    // Mesas laterales inferiores
    { id: 's17', nombre: 'S17', posX: 26, posY: 82, ancho: 7, alto: 7, activa: true },
    { id: 's16', nombre: 'S16', posX: 26, posY: 95, ancho: 7, alto: 7, activa: true },
    { id: 's14', nombre: 'S14', posX: 58, posY: 72, ancho: 7, alto: 7, activa: true },
    { id: 's15', nombre: 'S15', posX: 65, posY: 92, ancho: 7, alto: 7, activa: true },
  ]

  async function validarOTP(otp: string) {
    if (otp.length !== 6) return
    setCargando(true)
    setErrorMsg('')

    console.log('[Local] Validando OTP:', otp)

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

      console.log('[Local] Respuesta validación:', json)

      if (json.valido) {
        setValidacion(json)
        setPantalla('cliente')
        setScannerActivo(false)
      } else {
        setErrorMsg(json.error || 'Código inválido o vencido')
        setOtpInput('')
        inputRef.current?.focus()
        setScannerActivo(true)
      }
    } catch (error) {
      console.error('[Local] Error de conexión:', error)
      setErrorMsg('Error de conexión')
      setScannerActivo(true)
    } finally {
      setCargando(false)
    }
  }

  function handleQrScan(decodedText: string) {
    if (!decodedText || cargando) return

    console.log('[Local] QR escaneado:', decodedText)
    
    // El QR puede contener una URL otpauth:// o solo el token de 6 dígitos
    const tokenMatch = decodedText.match(/\d{6}/)

    if (tokenMatch) {
      const token = tokenMatch[0]
      console.log('[Local] Token extraído:', token)
      setScannerActivo(false)
      validarOTP(token)
    } else {
      console.warn('[Local] No se encontró token de 6 dígitos en el QR')
      setErrorMsg('QR no válido. Asegurate de escanear el QR del cliente.')
      setScannerActivo(true)
    }
  }

  function handleQrError(error: string) {
    console.error('[QR Scanner Error]', error)
    setErrorMsg('Error al acceder a la cámara')
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
          metodoValidacion: metodoInput === 'qr' ? 'QR_SCANNER' : 'OTP_MANUAL',
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
    setMetodoInput('qr')
    setOtpInput('')
    setValidacion(null)
    setMesaSeleccionada(null)
    setErrorMsg('')
    setEventoRegistrado(false)
    setScannerActivo(true)
  }

  function cambiarMetodo(metodo: MetodoInput) {
    setMetodoInput(metodo)
    setErrorMsg('')
    setOtpInput('')
    if (metodo === 'qr') {
      setScannerActivo(true)
    } else {
      setScannerActivo(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ─── Pantalla Scanner ─────────────────────────────────────────────────────
  if (pantalla === 'scanner') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center py-8 px-4">
        <h1 className="text-white text-xl font-bold mb-2">App del Local</h1>
        <p className="text-slate-400 text-sm mb-8">Coques - Empleados</p>

        {/* Selector de método */}
        <div className="w-full max-w-sm mb-4">
          <div className="bg-slate-800 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => cambiarMetodo('qr')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${metodoInput === 'qr'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              📷 Escanear QR
            </button>
            <button
              onClick={() => cambiarMetodo('manual')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${metodoInput === 'manual'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              ⌨️ Código manual
            </button>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {metodoInput === 'qr' ? (
            // ─── Scanner QR ───
            <div className="bg-slate-800 rounded-2xl p-6">
              <p className="text-slate-300 text-sm text-center mb-4">
                Pedile al cliente que muestre su QR
              </p>

              {scannerActivo ? (
                <QRScanner
                  onScan={handleQrScan}
                  onError={handleQrError}
                  isActive={scannerActivo}
                />
              ) : (
                <div className="aspect-square bg-slate-700 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Validando...</p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-300 text-sm text-center">{errorMsg}</p>
                  <button
                    onClick={() => {
                      setErrorMsg('')
                      setScannerActivo(true)
                    }}
                    className="w-full mt-2 text-red-300 text-xs underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {cargando && (
                <div className="flex justify-center mt-4">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            // ─── Input Manual ───
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
          )}

          <p className="text-slate-500 text-xs text-center mt-4">
            {metodoInput === 'qr'
              ? 'El cliente muestra su QR desde la app /pass'
              : 'El cliente muestra el código de 6 dígitos'
            }
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
              <p className="text-green-600 text-sm font-medium">
                Código válido ✓ ({metodoInput === 'qr' ? 'QR' : 'Manual'})
              </p>
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
                style={{ paddingBottom: '120%' }}
              >
                <div className="absolute inset-0 p-3">
                  {mesas.map((mesa) => (
                    <button
                      key={mesa.id}
                      onClick={() => setMesaSeleccionada(mesa)}
                      className={`absolute rounded-lg text-xs font-bold transition-all ${mesaSeleccionada?.id === mesa.id
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
