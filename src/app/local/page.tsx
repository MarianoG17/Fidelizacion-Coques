'use client'
// src/app/local/page.tsx
import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ValidacionResult, MesaLayout, NIVEL_COLORS, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'
import { formatearPatenteDisplay } from '@/lib/patente'

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
  const [ubicacion, setUbicacion] = useState<'mostrador' | 'salon' | null>(null)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<MesaLayout | null>(null)
  const [beneficioSeleccionado, setBeneficioSeleccionado] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [eventoRegistrado, setEventoRegistrado] = useState(false)
  const [scannerActivo, setScannerActivo] = useState(true)
  const [mesas, setMesas] = useState<MesaLayout[]>([])
  const [cargandoMesas, setCargandoMesas] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cargar mesas desde la base de datos
  useEffect(() => {
    console.log('[Local] Iniciando carga de mesas...')
    async function cargarMesas() {
      try {
        console.log('[Local] Llamando a /api/mesas con API key:', LOCAL_API_KEY ? 'Configurada' : 'NO CONFIGURADA')
        const res = await fetch('/api/mesas', {
          headers: { 'x-local-api-key': LOCAL_API_KEY },
        })
        console.log('[Local] Respuesta de /api/mesas:', res.status, res.statusText)

        if (res.ok) {
          const data = await res.json()
          console.log('[Local] Mesas cargadas desde DB:', data.data.mesas.length)
          const mesasMapeadas = data.data.mesas.map((m: any) => ({
            id: m.id,
            nombre: m.nombre,
            posX: m.posX,
            posY: m.posY,
            ancho: m.ancho,
            alto: m.alto,
            activa: true,
          }))
          console.log('[Local] Primera mesa:', mesasMapeadas[0])
          setMesas(mesasMapeadas)
        } else {
          const errorText = await res.text()
          console.error('[Local] Error al cargar mesas:', res.status, errorText)
          console.log('[Local] Usando mesas FALLBACK (hardcodeadas)')
          setMesas(MESAS_FALLBACK)
        }
      } catch (error) {
        console.error('[Local] Excepción al cargar mesas:', error)
        console.log('[Local] Usando mesas FALLBACK (hardcodeadas)')
        setMesas(MESAS_FALLBACK)
      } finally {
        setCargandoMesas(false)
      }
    }
    cargarMesas()
  }, [])

  // Mesas fallback (solo se usan si falla la API)
  const MESAS_FALLBACK: MesaLayout[] = [
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

    try {
      const payload = {
        clienteId: validacion.cliente.id,
        mesaId: mesaSeleccionada?.id || null,
        tipoEvento: beneficioSeleccionado ? 'BENEFICIO_APLICADO' : 'VISITA',
        beneficioId: beneficioSeleccionado,
        metodoValidacion: metodoInput === 'qr' ? 'QR' : 'OTP_MANUAL',
      }

      console.log('Enviando evento:', payload)

      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': LOCAL_API_KEY,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Error al registrar evento:', res.status, errorData)
        setErrorMsg(`Error al registrar evento: ${errorData.error || res.statusText}`)
        return
      }

      const data = await res.json()
      console.log('Evento registrado:', data)
      setEventoRegistrado(true)
    } catch (error) {
      console.error('Error en fetch:', error)
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
    setUbicacion(null)
    setMesaSeleccionada(null)
    setBeneficioSeleccionado(null)
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
        <div className="w-full max-w-sm mb-4">
          <button
            onClick={() => (window.location.href = '/')}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Volver</span>
          </button>
        </div>

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

          {/* Autos del cliente */}
          {c.autos && c.autos.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Autos registrados
              </h3>
              <div className="space-y-2">
                {c.autos.map((auto) => (
                  <div
                    key={auto.id}
                    className={`rounded-xl p-3 ${auto.estadoActual && auto.estadoActual.estado !== 'ENTREGADO'
                      ? 'border-2'
                      : 'border border-gray-200 bg-gray-50'
                      }`}
                    style={
                      auto.estadoActual && auto.estadoActual.estado !== 'ENTREGADO'
                        ? {
                          backgroundColor: ESTADO_AUTO_COLORS[auto.estadoActual.estado] + '15',
                          borderColor: ESTADO_AUTO_COLORS[auto.estadoActual.estado],
                        }
                        : {}
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-800">
                          {formatearPatenteDisplay(auto.patente)}
                        </p>
                        {(auto.marca || auto.modelo) && (
                          <p className="text-sm text-gray-600">
                            {[auto.marca, auto.modelo].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                      {auto.estadoActual && auto.estadoActual.estado !== 'ENTREGADO' && (
                        <div className="text-right">
                          <p className="text-xs text-gray-600">En lavadero</p>
                          <p
                            className="font-semibold text-sm"
                            style={{ color: ESTADO_AUTO_COLORS[auto.estadoActual.estado] }}
                          >
                            {ESTADO_AUTO_LABELS[auto.estadoActual.estado]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beneficios activos - seleccionables */}
          {c.beneficiosActivos.length > 0 ? (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                ¿Desea canjear algún beneficio?
              </h3>
              <div className="space-y-2 mb-3">
                {c.beneficiosActivos.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBeneficioSeleccionado(beneficioSeleccionado === b.id ? null : b.id)}
                    className={`w-full text-left rounded-xl p-4 border-2 transition-all ${beneficioSeleccionado === b.id
                      ? 'bg-green-100 border-green-500 shadow-md'
                      : 'bg-green-50 border-green-200 hover:border-green-400'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${beneficioSeleccionado === b.id
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300'
                        }`}>
                        {beneficioSeleccionado === b.id && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-green-800">{b.nombre}</p>
                        <p className="text-sm text-green-700 mt-1 font-mono bg-white/50 rounded p-2">
                          → Cargar en Aires: {b.descripcionCaja}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setBeneficioSeleccionado(null)}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                No canjear beneficio en esta visita
              </button>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4 mb-4 text-center">
              <p className="text-gray-500 text-sm">Sin beneficios disponibles</p>
            </div>
          )}

          {/* Selección de ubicación */}
          {!ubicacion && !eventoRegistrado && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                ¿Dónde se ubica el cliente?
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setUbicacion('mostrador')}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-transparent hover:border-amber-500"
                >
                  <div className="text-4xl mb-2">🪑</div>
                  <p className="font-bold text-slate-800">Mostrador</p>
                </button>
                <button
                  onClick={() => setUbicacion('salon')}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-transparent hover:border-green-500"
                >
                  <div className="text-4xl mb-2">🍽️</div>
                  <p className="font-bold text-slate-800">Salón</p>
                </button>
              </div>
              <button
                onClick={resetear}
                className="w-full mt-2 text-gray-400 py-2 text-sm"
              >
                Cancelar
              </button>
            </>
          )}

          {/* Selector de mesas (solo si eligió Salón) */}
          {ubicacion === 'salon' && !eventoRegistrado && (
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
                className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Mostrador - registro directo sin mesa */}
          {ubicacion === 'mostrador' && !eventoRegistrado && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                <div className="text-3xl mb-2">🪑</div>
                <p className="text-amber-800 font-semibold">Cliente en Mostrador</p>
              </div>

              {/* Botón registrar */}
              <button
                onClick={registrarEvento}
                disabled={cargando}
                className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
