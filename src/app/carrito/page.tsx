'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'
import { useCarrito } from '@/hooks/useCarrito'

export default function CarritoPage() {
  const router = useRouter()
  const { items, actualizarCantidad, eliminarItem, vaciarCarrito, cantidadTotal, precioTotal, cargado } = useCarrito()
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [numeroOrden, setNumeroOrden] = useState('')

  // Fecha y hora de entrega
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [horaEntrega, setHoraEntrega] = useState('')
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([])

  // Solo notas opcionales
  const [notas, setNotas] = useState('')

  // Generar fechas disponibles (mínimo 24h, solo lun-sáb)
  useEffect(() => {
    const fechas: string[] = []
    const ahora = new Date()

    // Sumar 24 horas
    ahora.setHours(ahora.getHours() + 24)

    // Generar los próximos 30 días disponibles
    for (let i = 0; i < 60; i++) {
      const fecha = new Date(ahora)
      fecha.setDate(ahora.getDate() + i)

      const diaSemana = fecha.getDay()
      // 0 = domingo, 6 = sábado. Solo lun(1) a sáb(6)
      if (diaSemana >= 1 && diaSemana <= 6) {
        const fechaISO = fecha.toISOString().split('T')[0]
        fechas.push(fechaISO)

        if (fechas.length >= 30) break
      }
    }

    setFechasDisponibles(fechas)

    // Seleccionar primera fecha disponible por defecto
    if (fechas.length > 0) {
      setFechaEntrega(fechas[0])
    }
  }, [])

  // Generar horarios disponibles (9:00 - 18:00, cada hora)
  // Rangos de 1 hora: 09:00-10:00, 10:00-11:00, ..., 18:00-19:00
  function obtenerHorariosDisponibles(): string[] {
    return [
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
    ]
  }

  async function procederCheckout() {
    setError(null)

    // Validar fecha y hora
    if (!fechaEntrega || !horaEntrega) {
      setError('Por favor seleccioná fecha y hora de entrega')
      return
    }

    setProcesando(true)

    try {
      // Obtener token del localStorage
      const token = localStorage.getItem('fidelizacion_token')
      if (!token) {
        setError('Debes iniciar sesión para realizar un pedido')
        router.push('/login')
        return
      }

      // Construir items para el pedido
      const itemsPedido = items.map(item => ({
        productoId: item.productoId,
        varianteId: item.varianteId,
        cantidad: item.cantidad,
      }))

      const response = await fetch('/api/woocommerce/crear-pedido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: itemsPedido,
          notas: notas.trim() || undefined,
          fechaEntrega,
          horaEntrega,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setError('Tu sesión expiró. Por favor iniciá sesión nuevamente.')
          setTimeout(() => router.push('/login'), 2000)
          return
        }
        throw new Error(data.error || 'Error al crear el pedido')
      }

      if (data.success) {
        setNumeroOrden(data.pedido.numero)

        // Vaciar carrito
        vaciarCarrito()

        // Mostrar confirmación
        setMostrarConfirmacion(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pedido')
    } finally {
      setProcesando(false)
    }
  }

  // Función para formatear precio con separador de miles
  function formatearPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  if (!cargado) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent"></div>
      </div>
    )
  }

  // Modal de confirmación
  if (mostrarConfirmacion) {
    return (
      <div className="min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
          <div className="mb-4">
            <span className="text-6xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            ¡Pedido Realizado!
          </h2>
          {numeroOrden && (
            <p className="text-lg font-semibold text-gray-700 mb-3">
              Pedido #{numeroOrden}
            </p>
          )}
          <p className="text-gray-700 mb-4">
            Tu pedido fue enviado exitosamente. Te contactaremos pronto para coordinar la entrega.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Podés ver el estado de tu pedido en tu email o contactarnos directamente.
          </p>
          <button
            onClick={() => router.push('/pass')}
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // Carrito vacío
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <BackButton href="/tortas" />

          <div className="mt-8 text-center py-12">
            <span className="text-6xl mb-4 block">🛒</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Tu carrito está vacío
            </h2>
            <p className="text-gray-600 mb-6">
              Agregá productos desde el catálogo de tortas
            </p>
            <button
              onClick={() => router.push('/tortas')}
              className="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-colors"
            >
              Ver catálogo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/tortas" />

        <div className="mt-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🛒 Tu Carrito
          </h1>
          <p className="text-gray-600">
            {cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'} en tu carrito
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">❌ Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productoId}-${item.varianteId || 'simple'}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Imagen */}
                  {item.imagen ? (
                    <img
                      src={item.imagen}
                      alt={item.nombre}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-3xl">🍰</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.nombre}</h3>
                    {item.nombreVariante && (
                      <p className="text-sm text-gray-600 mt-1">{item.nombreVariante}</p>
                    )}
                    <p className="text-lg font-semibold text-green-600 mt-2">
                      ${formatearPrecio(item.precio)}
                    </p>

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => actualizarCantidad(item.productoId, item.varianteId, item.cantidad - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                      >
                        -
                      </button>
                      <span className="font-semibold text-gray-800 min-w-[30px] text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => actualizarCantidad(item.productoId, item.varianteId, item.cantidad + 1)}
                        className="w-8 h-8 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => eliminarItem(item.productoId, item.varianteId)}
                        className="ml-auto text-red-600 hover:text-red-700 font-semibold text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen y checkout */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 sticky top-4">
              <h3 className="font-bold text-lg text-gray-800 mb-4">
                Resumen del Pedido
              </h3>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-300">
                <div className="flex justify-between text-gray-700">
                  <span>Productos ({cantidadTotal})</span>
                  <span className="font-semibold">${formatearPrecio(precioTotal)}</span>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-300">
                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-green-600">${formatearPrecio(precioTotal)}</span>
                </div>
              </div>

              {/* Fecha de entrega */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de entrega *
                </label>
                <select
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar fecha</option>
                  {fechasDisponibles.map((fecha) => {
                    const fechaObj = new Date(fecha + 'T00:00:00')
                    const nombreDia = fechaObj.toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                    return (
                      <option key={fecha} value={fecha}>
                        {nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Hora de entrega */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Horario de entrega *
                </label>
                <select
                  value={horaEntrega}
                  onChange={(e) => setHoraEntrega(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar horario</option>
                  {obtenerHorariosDisponibles().map((hora) => (
                    <option key={hora} value={hora}>
                      {hora} hs
                    </option>
                  ))}
                </select>
              </div>

              {/* Información de horario */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-orange-800">
                  ⏰ Horario de atención: Lunes a Sábados de 8:30 a 19:00 hs. Los pedidos requieren mínimo 24hs de anticipación.
                </p>
              </div>

              {/* Campo de notas opcionales */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Decoración especial, alergias, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  ℹ️ Los datos de contacto se tomarán de tu perfil. Te contactaremos para coordinar el pago y la entrega.
                </p>
              </div>

              <button
                onClick={procederCheckout}
                disabled={procesando}
                className={`w-full py-3 rounded-lg font-bold transition-colors ${procesando
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
              >
                {procesando ? 'Procesando...' : 'Realizar Pedido'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
