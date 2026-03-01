'use client'
// src/app/local/page.tsx
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ValidacionResult, MesaLayout, NIVEL_COLORS, ESTADO_AUTO_LABELS, ESTADO_AUTO_COLORS } from '@/types'
import { formatearPatenteDisplay } from '@/lib/patente'
import VistaSalon from './components/VistaSalon'

const LOCAL_API_KEY = process.env.NEXT_PUBLIC_LOCAL_API_KEY || ''

// Importar componentes dinámicamente (solo en cliente)
const QRScanner = dynamic(() => import('@/components/local/QRScanner'), { ssr: false })
const InstallPWAButton = dynamic(() => import('./components/InstallPWAButton'), { ssr: false })

type Pantalla = 'scanner' | 'cliente' | 'confirmar'
type MetodoInput = 'qr' | 'manual'

export default function LocalPage() {
  const router = useRouter()
  const [pantalla, setPantalla] = useState<Pantalla>('scanner')
  const [metodoInput, setMetodoInput] = useState<MetodoInput>('qr')
  const [otpInput, setOtpInput] = useState('')
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null)
  const [ubicacion, setUbicacion] = useState<'mostrador' | 'salon' | null>(null)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<MesaLayout | null>(null)
  const [beneficiosSeleccionados, setBeneficiosSeleccionados] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [eventoRegistrado, setEventoRegistrado] = useState(false)
  const [scannerActivo, setScannerActivo] = useState(true)
  const [mesas, setMesas] = useState<MesaLayout[]>([])
  const [cargandoMesas, setCargandoMesas] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Estados para vista de salón
  const [vistaSalon, setVistaSalon] = useState(false)
  const [estadoSalon, setEstadoSalon] = useState<any>(null)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
  const [mesasOcupadas, setMesasOcupadas] = useState<Set<string>>(new Set())

  // Historial de últimos clientes en mostrador (ahora desde servidor)
  const [clientesMostrador, setClientesMostrador] = useState<Array<{
    id: string
    nombre: string
    phone: string
    nivel: string
    beneficiosDisponibles: Array<{ id: string, nombre: string, descripcionCaja: string }>
    beneficiosAplicados: Array<{ id: string, nombre: string, timestamp: Date }>
    timestamp: Date
  }>>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // Función para cargar historial desde servidor
  async function cargarHistorialMostrador() {
    try {
      setCargandoHistorial(true)
      const res = await fetch('/api/local/historial-escaneos?limit=3', {
        headers: { 'x-local-api-key': LOCAL_API_KEY },
      })

      if (res.ok) {
        const data = await res.json()
        const clientes = data.data.clientes.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp),
          beneficiosAplicados: c.beneficiosAplicados.map((b: any) => ({
            ...b,
            timestamp: new Date(b.timestamp)
          }))
        }))
        setClientesMostrador(clientes)
        console.log('[Local] Historial cargado desde servidor:', clientes.length, 'clientes')
      }
    } catch (error) {
      console.error('[Local] Error cargando historial desde servidor:', error)
    } finally {
      setCargandoHistorial(false)
    }
  }

  // Cargar historial desde servidor al montar
  useEffect(() => {
    cargarHistorialMostrador()
  }, [])

  // Verificar autenticación al cargar la página
  useEffect(() => {
    async function verificarAuth() {
      const token = localStorage.getItem('coques_local_token')

      if (!token) {
        router.push('/local/login')
        return
      }

      // Validar token con el servidor
      try {
        const res = await fetch('/api/auth/local/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await res.json()

        if (!res.ok || !data.valid) {
          console.log('[Local] Token inválido o expirado, redirigiendo al login')
          localStorage.removeItem('coques_local_token')
          router.push('/local/login')
        }
      } catch (error) {
        console.error('[Local] Error verificando token:', error)
        // Si hay error de red, permitir continuar pero loguear el error
      }
    }

    verificarAuth()
  }, [router])

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

        // SI YA ELIGIÓ SALÓN, CREAR SESIÓN INMEDIATAMENTE
        if (ubicacion === 'salon' && mesaSeleccionada) {
          await crearSesionMesa(json.cliente.id, mesaSeleccionada.id)
        }
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

  async function crearSesionMesa(clienteId: string, mesaId: string) {
    try {
      const res = await fetch('/api/sesiones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': LOCAL_API_KEY,
        },
        body: JSON.stringify({ clienteId, mesaId }),
      })

      const data = await res.json()

      if (res.ok) {
        console.log('[Local] Sesión creada:', data.mensaje)
        // Recargar estado del salón si estamos en vista de salón
        if (vistaSalon) {
          cargarEstadoSalon()
        }
      } else {
        console.error('[Local] Error creando sesión:', data.error)
        // Si la mesa está ocupada, mostrar mensaje pero continuar
        if (res.status === 409) {
          setErrorMsg(`Mesa ocupada por otro cliente. Elegí otra mesa.`)
        }
      }
    } catch (error) {
      console.error('[Local] Error en crearSesionMesa:', error)
    }
  }

  async function recargarBeneficiosCliente(clienteId: string) {
    try {
      // Esperar un momento para que evaluarNivel termine (es async)
      await new Promise(resolve => setTimeout(resolve, 800))

      const res = await fetch(`/api/clientes/${clienteId}`, {
        headers: {
          'x-local-api-key': LOCAL_API_KEY,
        },
      })

      if (res.ok) {
        const response = await res.json()
        const clienteActualizado = response.data

        console.log('[Local] Cliente actualizado:', clienteActualizado)

        // Actualizar validación con los nuevos beneficios y nivel
        if (validacion && validacion.cliente) {
          setValidacion({
            valido: true,
            cliente: {
              id: validacion.cliente.id,
              nombre: validacion.cliente.nombre,
              phone: validacion.cliente.phone,
              nivel: clienteActualizado.nivel,
              beneficiosActivos: clienteActualizado.beneficiosActivos,
              autos: clienteActualizado.autos || validacion.cliente.autos
            }
          })
        }

        return clienteActualizado
      }
    } catch (error) {
      console.error('[Local] Error recargando beneficios:', error)
    }
    return null
  }

  async function registrarEvento() {
    if (!validacion?.cliente) return
    setCargando(true)

    try {
      // Si es salón y NO hay sesión activa, crearla primero
      if (ubicacion === 'salon' && mesaSeleccionada && validacion) {
        await crearSesionMesa(validacion.cliente.id, mesaSeleccionada.id)
      }

      // SIEMPRE registrar la visita física primero
      const visitaPayload = {
        clienteId: validacion.cliente.id,
        mesaId: mesaSeleccionada?.id || null,
        tipoEvento: 'VISITA' as const,
        metodoValidacion: metodoInput === 'qr' ? 'QR' as const : 'OTP_MANUAL' as const,
      }

      console.log('Registrando visita física:', visitaPayload)

      const resVisita = await fetch('/api/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': LOCAL_API_KEY,
        },
        body: JSON.stringify(visitaPayload),
      })

      if (!resVisita.ok) {
        const errorData = await resVisita.json().catch(() => ({}))
        console.error('Error al registrar visita:', resVisita.status, errorData)
        setErrorMsg(`Error al registrar visita: ${errorData.error || resVisita.statusText}`)
        return
      }

      const dataVisita = await resVisita.json()
      console.log('Visita registrada:', dataVisita)

      // Si hay beneficios seleccionados, registrarlos como eventos adicionales
      if (beneficiosSeleccionados.length > 0) {
        for (const beneficioId of beneficiosSeleccionados) {
          const beneficioPayload = {
            clienteId: validacion.cliente.id,
            mesaId: mesaSeleccionada?.id || null,
            tipoEvento: 'BENEFICIO_APLICADO' as const,
            beneficioId: beneficioId,
            metodoValidacion: metodoInput === 'qr' ? 'QR' as const : 'OTP_MANUAL' as const,
          }

          console.log('Aplicando beneficio:', beneficioPayload)

          const resBeneficio = await fetch('/api/eventos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-local-api-key': LOCAL_API_KEY,
            },
            body: JSON.stringify(beneficioPayload),
          })

          if (!resBeneficio.ok) {
            const errorData = await resBeneficio.json().catch(() => ({}))
            console.warn('Error al aplicar beneficio:', resBeneficio.status, errorData)
            // No retornar aquí, la visita ya se registró correctamente
          } else {
            const dataBeneficio = await resBeneficio.json()
            console.log('Beneficio aplicado:', dataBeneficio)
          }
        }
      }

      // NUEVO: Recargar beneficios del cliente (por si cambió de nivel)
      const clienteActualizado = await recargarBeneficiosCliente(validacion.cliente.id)

      // Si es mostrador, recargar historial desde servidor para mantenerlo sincronizado
      if (ubicacion === 'mostrador') {
        // Esperar un poco para que el evento se procese completamente
        await new Promise(resolve => setTimeout(resolve, 500))
        await cargarHistorialMostrador()
      }

      // Guardar timestamp para feedback modal (solo para clientes que usan el scanner desde su cuenta)
      // Nota: No guardar para /local porque es el staff escaneando a clientes
      // El feedback se mostrará al CLIENTE en su app después de X minutos
      // localStorage.setItem('ultimo_scan', Date.now().toString())
      // localStorage.removeItem('feedback_scan_visto')

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
    setBeneficiosSeleccionados([])
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

  function seleccionarUbicacion(ubi: 'mostrador' | 'salon') {
    setUbicacion(ubi)
    if (ubi === 'mostrador') {
      setMesaSeleccionada(null)
    } else if (ubi === 'salon') {
      // Cargar estado del salón cuando se elige salón
      cargarEstadoSalon()
    }
  }

  async function cargarEstadoSalon() {
    try {
      const res = await fetch('/api/salon/estado', {
        headers: { 'x-local-api-key': LOCAL_API_KEY },
      })

      if (res.ok) {
        const data = await res.json()
        setEstadoSalon(data.data)

        // Actualizar set de mesas ocupadas
        const ocupadas = new Set<string>()
        data.data.mesas.forEach((item: any) => {
          if (item.ocupada) {
            ocupadas.add(item.mesa.id)
          }
        })
        setMesasOcupadas(ocupadas)
      }
    } catch (error) {
      console.error('[Local] Error cargando estado del salón:', error)
    }
  }

  async function cerrarSesionMesa(sesionId: string) {
    try {
      const res = await fetch(`/api/sesiones/${sesionId}`, {
        method: 'DELETE',
        headers: { 'x-local-api-key': LOCAL_API_KEY },
      })

      if (res.ok) {
        const data = await res.json()
        console.log('[Local] Sesión cerrada:', data.mensaje)

        // Recargar estado del salón
        cargarEstadoSalon()
      }
    } catch (error) {
      console.error('[Local] Error cerrando sesión:', error)
    }
  }

  async function aplicarBeneficioDesdeMesa(clienteId: string, beneficioId: string) {
    try {
      // Registrar evento de beneficio aplicado
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-local-api-key': LOCAL_API_KEY,
        },
        body: JSON.stringify({
          clienteId,
          tipoEvento: 'BENEFICIO_APLICADO',
          beneficioId,
          metodoValidacion: 'QR',
          notas: 'Aplicado desde sesión de mesa',
        }),
      })

      if (res.ok) {
        alert('✅ Beneficio aplicado correctamente')

        // Recargar estado del salón para actualizar beneficios disponibles
        cargarEstadoSalon()
      } else {
        const data = await res.json()
        alert(`❌ Error: ${data.mensaje || 'No se pudo aplicar el beneficio'}`)
      }
    } catch (error) {
      console.error('[Local] Error aplicando beneficio:', error)
      alert('❌ Error aplicando beneficio')
    }
  }

  // useEffect para auto-refresh en vista de salón
  useEffect(() => {
    if (vistaSalon) {
      // Cargar inmediatamente
      cargarEstadoSalon()

      // Actualizar cada 5 segundos
      const id = setInterval(cargarEstadoSalon, 5000)
      setIntervalId(id)

      return () => {
        if (id) clearInterval(id)
      }
    } else {
      // Limpiar intervalo si salimos de la vista de salón
      if (intervalId) {
        clearInterval(intervalId)
        setIntervalId(null)
      }
    }
  }, [vistaSalon])

  // ─── Pantalla Scanner ─────────────────────────────────────────────────────
  if (pantalla === 'scanner') {
    // Detectar si está en modo PWA (app instalada)
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )

    return (
      <>
        <div className="min-h-screen bg-slate-900 flex flex-col items-center py-8 px-4">
          {/* Header con botón de logout */}
          <div className="w-full max-w-sm mb-4 flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold mb-1">App del Local</h1>
              <p className="text-slate-400 text-xs">Equipo atención al cliente</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('coques_local_token')
                router.push('/local/login')
              }}
              className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
              title="Cerrar sesión"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>

          {/* Botones para alternar entre Scanner, Vista Salón, Tomar Pedido y Presupuestos */}
          <div className="w-full max-w-sm mb-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setVistaSalon(false)}
                className={`py-3 rounded-xl font-bold transition text-sm ${!vistaSalon
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300'
                  }`}
              >
                📱 Scanner
              </button>
              <button
                onClick={() => setVistaSalon(true)}
                className={`py-3 rounded-xl font-bold transition text-sm ${vistaSalon
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300'
                  }`}
              >
                🏠 Salón
              </button>
              <button
                onClick={() => window.location.href = '/local/tomar-pedido'}
                className="py-3 rounded-xl font-bold transition text-sm bg-amber-600 hover:bg-amber-700 text-white"
              >
                📝 Pedido
              </button>
              <button
                onClick={() => window.location.href = '/local/presupuestos'}
                className="py-3 rounded-xl font-bold transition text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                💾 Presupuestos
              </button>
            </div>
          </div>

          {vistaSalon ? (
            // ─── Vista de Salón ───
            <div className="w-full max-w-6xl">
              <VistaSalon
                estadoSalon={estadoSalon}
                onCerrarSesion={cerrarSesionMesa}
                onAplicarBeneficio={aplicarBeneficioDesdeMesa}
              />
            </div>
          ) : (
            // ─── Vista de Scanner ───
            <>
              {/* Paso 1: Elegir ubicación (Mostrador o Salón) */}
              {!ubicacion && (
                <div className="w-full max-w-sm">
                  <h2 className="text-white text-lg font-bold mb-3 text-center">
                    ¿Dónde se ubica el cliente?
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => seleccionarUbicacion('mostrador')}
                      className="bg-slate-800 hover:bg-amber-600 rounded-xl p-6 transition-all hover:scale-105 border-2 border-transparent hover:border-amber-500"
                    >
                      <div className="text-4xl mb-2">🪑</div>
                      <p className="font-bold text-white">Mostrador</p>
                    </button>
                    <button
                      onClick={() => seleccionarUbicacion('salon')}
                      className="bg-slate-800 hover:bg-green-600 rounded-xl p-6 transition-all hover:scale-105 border-2 border-transparent hover:border-green-500"
                    >
                      <div className="text-4xl mb-2">🍽️</div>
                      <p className="font-bold text-white">Salón</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 2: Si eligió Salón, seleccionar mesa */}
              {ubicacion === 'salon' && !mesaSeleccionada && (
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white text-lg font-bold">
                      Seleccioná la mesa
                    </h2>
                    <button
                      onClick={() => {
                        setUbicacion(null)
                        setMesaSeleccionada(null)
                      }}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ← Cambiar ubicación
                    </button>
                  </div>
                  <div
                    className="relative bg-slate-800 rounded-2xl mb-4 overflow-hidden"
                    style={{ paddingBottom: '150%' }}
                  >
                    <div className="absolute inset-0 p-3">
                      {mesas.map((mesa: MesaLayout) => {
                        const estaOcupada = mesasOcupadas.has(mesa.id)
                        const mesaSel = mesaSeleccionada as MesaLayout | null
                        const estaSeleccionada = mesaSel?.id === mesa.id
                        return (
                          <button
                            key={mesa.id}
                            onClick={() => setMesaSeleccionada(mesa)}
                            className={`absolute rounded-lg text-xs font-bold transition-all shadow ${estaSeleccionada
                              ? 'bg-blue-600 text-white scale-110 z-10'
                              : estaOcupada
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-green-500 text-white hover:bg-green-600 hover:scale-105'
                              }`}
                            style={{
                              left: `${mesa.posX}%`,
                              top: `${mesa.posY}%`,
                              width: `${mesa.ancho}%`,
                              height: `${mesa.alto}%`,
                            }}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="text-base">
                                {estaOcupada ? '🔴' : '🟢'}
                              </div>
                              <div>{mesa.nombre}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: Scanner (solo si ya eligió ubicación y mesa en caso de salón) */}
              {((ubicacion === 'mostrador') || (ubicacion === 'salon' && mesaSeleccionada)) && (
                <>
                  {/* Info de selección */}
                  <div className="w-full max-w-sm mb-4">
                    <div className="bg-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {ubicacion === 'mostrador' ? '🪑' : '🍽️'}
                          </span>
                          <div>
                            <p className="text-white font-bold">
                              {ubicacion === 'mostrador' ? 'Mostrador' : `Mesa ${mesaSeleccionada?.nombre}`}
                            </p>
                            <p className="text-slate-400 text-sm">
                              {ubicacion === 'mostrador' ? 'Cliente en mostrador' : 'Cliente en salón'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setUbicacion(null)
                            setMesaSeleccionada(null)
                          }}
                          className="text-slate-400 hover:text-white text-sm underline"
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>
                  </div>

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

                  {/* Historial de últimos clientes en mostrador - ABAJO DEL SCANNER */}
                  {ubicacion === 'mostrador' && (
                    <div className="w-full mt-6">
                      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                          <span>📋</span>
                          Últimos clientes atendidos
                          {cargandoHistorial && (
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin ml-2" />
                          )}
                        </h3>
                        {clientesMostrador.length > 0 ? (
                          <div className="space-y-3">
                            {clientesMostrador.map((cliente) => (
                              <div
                                key={cliente.id}
                                className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                              >
                                {/* Header del cliente */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-bold">{cliente.nombre}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                      {cliente.nivel}
                                    </span>
                                  </div>
                                  <span className="text-slate-400 text-xs">
                                    {new Date(cliente.timestamp).toLocaleTimeString('es-AR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>

                                {/* Beneficios aplicados */}
                                {cliente.beneficiosAplicados.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs text-slate-400 mb-1">✓ Beneficios aplicados:</p>
                                    {cliente.beneficiosAplicados.map((b) => (
                                      <div key={b.id} className="bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1 mb-1">
                                        <p className="text-orange-300 text-xs font-semibold">{b.nombre}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Beneficios disponibles */}
                                {cliente.beneficiosDisponibles.length > 0 ? (
                                  <div>
                                    <p className="text-xs text-slate-400 mb-1">Disponibles para aplicar:</p>
                                    {cliente.beneficiosDisponibles.map((b) => (
                                      <div key={b.id} className="bg-green-500/10 border border-green-500/30 rounded px-2 py-1 mb-1">
                                        <p className="text-green-300 text-xs font-semibold">{b.nombre}</p>
                                        <p className="text-green-400/70 text-xs mt-0.5">→ {b.descripcionCaja}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : cliente.beneficiosAplicados.length === 0 ? (
                                  <p className="text-slate-500 text-xs">Sin beneficios</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : !cargandoHistorial ? (
                          <p className="text-slate-500 text-sm text-center py-4">
                            No hay clientes recientes en mostrador hoy
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Botón de instalación PWA */}
        <InstallPWAButton />
      </>
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
          {c.beneficiosActivos.filter((b) => !b.condiciones?.soloApp).length > 0 ? (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                ¿Desea canjear algún beneficio? (puede seleccionar varios)
              </h3>
              <div className="space-y-2 mb-3">
                {c.beneficiosActivos
                  .filter((b) => !b.condiciones?.soloApp)
                  .map((b) => {
                    const isSelected = beneficiosSeleccionados.includes(b.id)
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          if (isSelected) {
                            setBeneficiosSeleccionados(beneficiosSeleccionados.filter(id => id !== b.id))
                          } else {
                            setBeneficiosSeleccionados([...beneficiosSeleccionados, b.id])
                          }
                        }}
                        className={`w-full text-left rounded-xl p-4 border-2 transition-all ${isSelected
                          ? 'bg-green-100 border-green-500 shadow-md'
                          : 'bg-green-50 border-green-200 hover:border-green-400'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                            }`}>
                            {isSelected && (
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
                    )
                  })}
              </div>
              {beneficiosSeleccionados.length > 0 && (
                <button
                  onClick={() => setBeneficiosSeleccionados([])}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  Limpiar selección ({beneficiosSeleccionados.length} seleccionado{beneficiosSeleccionados.length > 1 ? 's' : ''})
                </button>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4 mb-4 text-center">
              <p className="text-gray-500 text-sm">Sin beneficios disponibles</p>
            </div>
          )}

          {/* Botón registrar visita */}
          {!eventoRegistrado && ubicacion && (
            <>
              {/* Info de ubicación seleccionada */}
              <div className={`rounded-xl p-4 mb-4 text-center ${ubicacion === 'mostrador'
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-green-50 border border-green-200'
                }`}>
                <div className="text-3xl mb-2">
                  {ubicacion === 'mostrador' ? '🪑' : '🍽️'}
                </div>
                <p className={`font-semibold ${ubicacion === 'mostrador' ? 'text-amber-800' : 'text-green-800'
                  }`}>
                  {ubicacion === 'mostrador' ? 'Cliente en Mostrador' : `Cliente en Mesa ${mesaSeleccionada?.nombre}`}
                </p>
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
