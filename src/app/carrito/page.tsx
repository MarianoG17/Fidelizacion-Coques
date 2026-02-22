'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BackButton from '@/components/shared/BackButton'
import { useCarrito } from '@/hooks/useCarrito'

interface ProductoUpselling {
  id: number
  nombre: string
  descripcion: string
  imagen: string | null
  precio: string
  precioRegular: string
  precioOferta: string | null
  enStock: boolean
  tipo: string
}

function CarritoPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, actualizarCantidad, actualizarItem, eliminarItem, vaciarCarrito, cantidadTotal, precioTotal, cargado, agregarItem } = useCarrito()
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [numeroOrden, setNumeroOrden] = useState('')

  // Detectar modo staff
  const modoStaff = sessionStorage.getItem('pedido_staff_modo') === 'staff'
  const [datosCliente, setDatosCliente] = useState<{ nombre: string, telefono: string } | null>(null)

  // Estado para productos de upselling
  const [productosUpselling, setProductosUpselling] = useState<ProductoUpselling[]>([])
  const [cargandoUpselling, setCargandoUpselling] = useState(false)

  // Estado para imagen expandida
  const [imagenExpandida, setImagenExpandida] = useState<string | null>(null)

  // Fecha y hora de entrega
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [horaEntrega, setHoraEntrega] = useState('')
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([])

  // Estados para edición de productos
  const [productoEditando, setProductoEditando] = useState<any>(null)
  const [camposTextoEditando, setCamposTextoEditando] = useState<{[key: string]: string}>({})
  
  // Solo notas opcionales
  const [notas, setNotas] = useState('')

  // Estado para nivel y descuento del cliente
  const [nivelCliente, setNivelCliente] = useState<{ nivel: string, descuento: number } | null>(null)

  // Estado para modal de presupuesto
  const [mostrarModalPresupuesto, setMostrarModalPresupuesto] = useState(false)
  const [guardandoPresupuesto, setGuardandoPresupuesto] = useState(false)
  const [codigoPresupuesto, setCodigoPresupuesto] = useState<string | null>(null)

  // Cargar datos según el modo
  useEffect(() => {
    if (modoStaff) {
      // Modo staff: cargar datos del cliente desde sessionStorage
      const clienteData = sessionStorage.getItem('pedido_staff_cliente')
      if (clienteData) {
        setDatosCliente(JSON.parse(clienteData))
      }
    } else {
      // Modo normal: buscar nivel del cliente autenticado
      fetchNivelCliente()
    }
  }, [modoStaff])

  // Cargar nivel del cliente (solo en modo normal)
  async function fetchNivelCliente() {
    if (modoStaff) return

    const token = localStorage.getItem('fidelizacion_token')
    if (!token) return

    try {
      const res = await fetch('/api/pass', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        if (data.data.nivel) {
          setNivelCliente({
            nivel: data.data.nivel.nombre,
            descuento: data.data.nivel.descuentoPedidosTortas || 0
          })
        }
      }
    } catch (error) {
      console.error('Error al obtener nivel del cliente:', error)
    }
  }

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

  // Cargar productos de upselling
  useEffect(() => {
    if (items.length > 0) {
      cargarProductosUpselling()
    }
  }, [items.length])

  async function cargarProductosUpselling() {
    setCargandoUpselling(true)
    try {
      const response = await fetch('/api/woocommerce/upselling')
      const data = await response.json()

      if (data.success && data.products) {
        // Filtrar productos que no estén ya en el carrito
        const productosNoEnCarrito = data.products.filter((prod: ProductoUpselling) =>
          !items.some(item => item.productoId === prod.id)
        )
        setProductosUpselling(productosNoEnCarrito.slice(0, 3)) // Máximo 3 productos
      }
    } catch (error) {
      console.error('Error cargando upselling:', error)
    } finally {
      setCargandoUpselling(false)
    }
  }

  function agregarUpselling(producto: ProductoUpselling) {
    agregarItem({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: parseFloat(producto.precio),
      imagen: producto.imagen,
    })

    // Remover de la lista de upselling
    setProductosUpselling(prev => prev.filter(p => p.id !== producto.id))
  }

  // Función para abrir edición de producto
  function abrirEdicionProducto(item: any) {
    setProductoEditando(item)
    setCamposTextoEditando(item.camposTexto || {})
  }

  // Función para guardar edición
  function guardarEdicion() {
    if (!productoEditando) return
    
    actualizarItem(productoEditando.productoId, productoEditando.varianteId, {
      camposTexto: Object.keys(camposTextoEditando).length > 0 ? camposTextoEditando : undefined,
    })
    
    cerrarEdicion()
  }

  function cerrarEdicion() {
    setProductoEditando(null)
    setCamposTextoEditando({})
  }

  async function guardarComoPresupuesto() {
    setGuardandoPresupuesto(true)
    setError(null)

    try {
      const token = localStorage.getItem('fidelizacion_token')
      let clienteId: string | undefined
      let nombreCliente: string | undefined
      let telefonoCliente: string | undefined

      if (modoStaff) {
        // Modo staff - obtener datos del sessionStorage
        nombreCliente = datosCliente?.nombre
        telefonoCliente = datosCliente?.telefono
      } else if (token) {
        // Modo normal - obtener clienteId del token
        const perfilRes = await fetch('/api/perfil', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (perfilRes.ok) {
          const perfilData = await perfilRes.json()
          clienteId = perfilData.data.id
          nombreCliente = perfilData.data.nombre
          telefonoCliente = perfilData.data.phone
        }
      }

      const presupuestoData = {
        clienteId,
        nombreCliente,
        telefonoCliente,
        items: items.map(item => ({
          productoId: item.productoId,
          varianteId: item.varianteId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio,
          precioAddOns: item.precioAddOns || 0,
          addOns: item.addOns || {},
          camposTexto: item.camposTexto || {},
          rendimiento: item.rendimiento
        })),
        precioTotal: totalConDescuento,
        descuento: montoDescuento,
        fechaEntrega: fechaEntrega || null,
        horaEntrega: horaEntrega || null,
        notasCliente: notas || null,
        creadoPor: modoStaff ? 'STAFF' : 'CLIENTE'
      }

      const response = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presupuestoData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar presupuesto')
      }

      setCodigoPresupuesto(data.presupuesto.codigo)
      setMostrarModalPresupuesto(true)

    } catch (err: any) {
      console.error('Error al guardar presupuesto:', err)
      setError(err.message || 'Error al guardar presupuesto')
    } finally {
      setGuardandoPresupuesto(false)
    }
  }

  async function procederCheckout() {
    setError(null)

    // Validar fecha y hora
    if (!fechaEntrega || !horaEntrega) {
      setError('Por favor seleccioná fecha y hora de entrega')
      return
    }

    // Validación estricta de campos personalizados
    for (const item of items) {
      if (item.camposTexto) {
        for (const [nombreCampo, valor] of Object.entries(item.camposTexto)) {
          if (!valor || valor.trim() === '') {
            setError(`⚠️ Falta completar el campo: ${nombreCampo}`)
            return
          }
        }
      }
    }

    setProcesando(true)

    try {
      let token = null
      let headers: any = {
        'Content-Type': 'application/json',
      }

      if (modoStaff) {
        // Modo staff: no requiere token de cliente
        // Pero podría requerir token de staff para autenticación
        const staffToken = localStorage.getItem('coques_local_token')
        if (staffToken) {
          headers['X-Staff-Token'] = staffToken
        }
      } else {
        // Modo normal: requiere token de cliente
        token = localStorage.getItem('fidelizacion_token')
        if (!token) {
          setError('Debes iniciar sesión para realizar un pedido')
          router.push('/login')
          return
        }
        headers['Authorization'] = `Bearer ${token}`
      }

      // Construir items para el pedido
      const itemsPedido = items.map(item => ({
        productoId: item.productoId,
        varianteId: item.varianteId,
        cantidad: item.cantidad,
        addOns: item.addOns,
        camposTexto: item.camposTexto,
      }))

      const body: any = {
        items: itemsPedido,
        notas: notas.trim() || undefined,
        fechaEntrega,
        horaEntrega,
      }

      // Si es modo staff, agregar datos del cliente
      if (modoStaff && datosCliente) {
        body.modoStaff = true
        body.datosCliente = datosCliente
      }

      const response = await fetch('/api/woocommerce/crear-pedido', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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

  // Función para extraer el número de porciones del texto de rendimiento
  function extraerPorciones(rendimiento: string | null | undefined): number {
    if (!rendimiento) return 0

    // Buscar rangos como "10 a 12" y tomar el valor máximo
    const rangoMatch = rendimiento.match(/(\d+)\s*a\s*(\d+)/)
    if (rangoMatch) {
      const min = parseInt(rangoMatch[1])
      const max = parseInt(rangoMatch[2])
      return max // Tomar el valor máximo
    }

    // Buscar un solo número
    const numeroMatch = rendimiento.match(/(\d+)/)
    if (numeroMatch) {
      return parseInt(numeroMatch[1])
    }

    return 0
  }

  // Calcular rendimiento total del carrito
  const rendimientoTotal = items.reduce((total, item) => {
    const porcionesItem = extraerPorciones(item.rendimiento)
    return total + (porcionesItem * item.cantidad)
  }, 0)

  // Verificar si hay torta temática en el carrito (tiene campos de texto con temática)
  const tieneTortaTematica = useMemo(() =>
    items.some(item =>
      item.camposTexto && Object.keys(item.camposTexto).some(campo =>
        campo.toLowerCase().includes('temática')
      )
    ), [items]
  )

  // NO aplicar descuento si hay torta temática en el carrito
  const descuentoPorcentaje = useMemo(() =>
    tieneTortaTematica ? 0 : (nivelCliente?.descuento || 0),
    [tieneTortaTematica, nivelCliente]
  )

  const montoDescuento = useMemo(() =>
    precioTotal * (descuentoPorcentaje / 100),
    [precioTotal, descuentoPorcentaje]
  )

  const totalConDescuento = useMemo(() =>
    precioTotal - montoDescuento,
    [precioTotal, montoDescuento]
  )

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

                    {/* Mostrar add-ons si existen */}
                    {item.addOns && Object.keys(item.addOns).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(item.addOns).map(([nombre, opciones]) => {
                          // Soportar formato antiguo (string[]) y nuevo ({sku, etiqueta}[])
                          let etiquetas: string[] = []

                          if (Array.isArray(opciones) && opciones.length > 0) {
                            if (typeof opciones[0] === 'string') {
                              // Formato antiguo
                              etiquetas = opciones as unknown as string[]
                            } else if (typeof opciones[0] === 'object' && 'etiqueta' in opciones[0]) {
                              // Formato nuevo
                              etiquetas = (opciones as Array<{ sku: string, etiqueta: string }>).map(o => o.etiqueta)
                            }
                          }

                          return (
                            <div key={nombre} className="text-xs text-gray-600">
                              <span className="font-medium">{nombre}:</span>{' '}
                              {etiquetas.join(', ')}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Mostrar campos de texto personalizados */}
                    {item.camposTexto && Object.keys(item.camposTexto).length > 0 && (
                      <div className="mt-1">
                        {Object.entries(item.camposTexto).map(([nombre, valor]) => (
                          <div key={nombre} className="text-xs text-gray-600">
                            <span className="font-medium">{nombre}:</span>{' '}
                            {valor}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mostrar rendimiento */}
                    {item.rendimiento && (
                      <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
                        <span>👥</span> {item.rendimiento}
                      </p>
                    )}

                    <div className="mt-2">
                      <p className="text-lg font-semibold text-green-600">
                        ${formatearPrecio(item.precio)}
                      </p>
                      {item.precioAddOns && item.precioAddOns > 0 && (
                        <p className="text-xs text-gray-600">
                          + ${formatearPrecio(item.precioAddOns)} en adicionales
                        </p>
                      )}
                    </div>

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
                  <span>Subtotal ({cantidadTotal})</span>
                  <span className="font-semibold">${formatearPrecio(precioTotal)}</span>
                </div>
                {/* Mostrar rendimiento total si hay items con rendimiento */}
                {rendimientoTotal > 0 && (
                  <div className="flex justify-between text-purple-700 bg-purple-50 p-2 rounded">
                    <span className="flex items-center gap-1">
                      <span>👥</span>
                      <span className="font-medium">Rendimiento total</span>
                    </span>
                    <span className="font-bold">{rendimientoTotal} porciones</span>
                  </div>
                )}
                {/* Mostrar descuento si aplica */}
                {nivelCliente && nivelCliente.descuento > 0 && (
                  <div className="flex justify-between text-purple-700 bg-purple-50 p-2 rounded">
                    <span className="flex items-center gap-1">
                      <span>🎁</span>
                      <span className="font-medium">Descuento Nivel {nivelCliente.nivel} ({nivelCliente.descuento}%)</span>
                    </span>
                    <span className="font-bold">-${formatearPrecio(montoDescuento)}</span>
                  </div>
                )}
              </div>

              <div className="mb-6 pb-6 border-b border-gray-300">
                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-green-600">${formatearPrecio(totalConDescuento)}</span>
                </div>
              </div>

              {/* Fecha de entrega */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de entrega *
                </label>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => {
                    const fecha = e.target.value
                    // Validar que sea un día laborable (lun-sáb)
                    const fechaObj = new Date(fecha + 'T00:00:00')
                    const diaSemana = fechaObj.getDay()
                    if (diaSemana === 0) {
                      alert('Los domingos no hay entregas. Por favor selecciona otro día.')
                      return
                    }
                    setFechaEntrega(fecha)
                  }}
                  min={fechasDisponibles[0] || ''}
                  max={fechasDisponibles[fechasDisponibles.length - 1] || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Entregas de lunes a sábado (no hay entregas los domingos)
                </p>
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

              {/* Sección de Upselling */}
              {productosUpselling.length > 0 && (
                <div className="mb-6 pb-6 border-b border-gray-300">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">
                    ¿Querés agregar algo más? 🍪
                  </h4>
                  <div className="relative">
                    {/* Carousel horizontal con 3 items visibles */}
                    <div
                      id="upselling-carousel"
                      className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
                      style={{
                        scrollbarWidth: 'thin',
                        msOverflowStyle: 'auto',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    >
                      {productosUpselling.map((producto) => (
                        <div
                          key={producto.id}
                          className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow flex-shrink-0 w-64 snap-start"
                        >
                          <div className="flex flex-col gap-2">
                            {producto.imagen ? (
                              <img
                                src={producto.imagen}
                                alt={producto.nombre}
                                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setImagenExpandida(producto.imagen)}
                              />
                            ) : (
                              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-4xl">🍪</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <h5 className="font-semibold text-sm text-gray-800 line-clamp-1">
                                {producto.nombre}
                              </h5>
                              {producto.descripcion && (
                                <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                  {producto.descripcion}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-bold text-green-600">
                                  ${formatearPrecio(parseFloat(producto.precio))}
                                </span>
                                <button
                                  onClick={() => agregarUpselling(producto)}
                                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  + Agregar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botones de navegación */}
                    {productosUpselling.length > 3 && (
                      <>
                        <button
                          onClick={() => {
                            const carousel = document.getElementById('upselling-carousel')
                            if (carousel) carousel.scrollBy({ left: -280, behavior: 'smooth' })
                          }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all"
                          aria-label="Anterior"
                        >
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const carousel = document.getElementById('upselling-carousel')
                            if (carousel) carousel.scrollBy({ left: 280, behavior: 'smooth' })
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all"
                          aria-label="Siguiente"
                        >
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}

                    {/* Indicador de scroll */}
                    <p className="text-xs text-gray-500 text-center mt-2">← Deslizá o usá las flechas para ver más →</p>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="space-y-2">
                <button
                  onClick={guardarComoPresupuesto}
                  disabled={guardandoPresupuesto || items.length === 0}
                  className={`w-full py-3 rounded-lg font-bold transition-colors ${guardandoPresupuesto || items.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {guardandoPresupuesto ? 'Guardando...' : '💾 Guardar como Presupuesto'}
                </button>

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

      {/* Modal de presupuesto guardado */}
      {mostrarModalPresupuesto && codigoPresupuesto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setMostrarModalPresupuesto(false)
            setCodigoPresupuesto(null)
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-6xl">💾</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
              Presupuesto Guardado
            </h3>
            <p className="text-gray-600 mb-4 text-center">
              Tu presupuesto ha sido guardado exitosamente.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Código de presupuesto:</strong>
              </p>
              <p className="text-2xl font-bold text-blue-600 text-center tracking-wider">
                {codigoPresupuesto}
              </p>
            </div>
            <p className="text-xs text-gray-600 mb-4 text-center">
              Guardá este código para consultar o confirmar tu presupuesto más tarde.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codigoPresupuesto)
                  alert('Código copiado al portapapeles')
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                📋 Copiar código
              </button>
              <button
                onClick={() => {
                  setMostrarModalPresupuesto(false)
                  setCodigoPresupuesto(null)
                  router.push(`/local/presupuestos/${codigoPresupuesto}`)
                }}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Ver presupuesto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de imagen expandida */}
      {imagenExpandida && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setImagenExpandida(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setImagenExpandida(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ✕
            </button>
            <img
              src={imagenExpandida}
              alt="Imagen ampliada"
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function CarritoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando carrito...</div>}>
      <CarritoPageContent />
    </Suspense>
  )
}
