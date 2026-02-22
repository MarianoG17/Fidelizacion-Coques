'use client'

import { useState, useEffect, useMemo, useCallback, Suspense, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import BackButton from '@/components/shared/BackButton'
import { useCarrito } from '@/hooks/useCarrito'

interface AddOnOpcion {
  etiqueta: string
  precio: number
  precioTipo: string
  wooId?: number
  sku?: string
}

interface AddOn {
  nombre: string
  descripcion: string
  tipo: 'radio' | 'checkbox'
  requerido: boolean
  opciones: AddOnOpcion[]
}

interface CampoTexto {
  nombre: string
  placeholder: string
  requerido: boolean
}

interface Variante {
  id: number
  precio: string
  precioRegular: string
  precioOferta: string
  enStock: boolean
  stock: number | null
  nombreVariante: string
  atributos: Array<{ nombre: string; valor: string }>
  imagen: string | null
  rendimiento?: string | null
}

interface Producto {
  id: number
  nombre: string
  tipo: 'simple' | 'variable'
  descripcion: string
  imagen: string | null
  imagenes: string[]
  precio: string
  precioRegular: string
  precioOferta: string | null
  enStock: boolean
  stock: number | null
  variantes: Variante[]
  precioMin: number | null
  precioMax: number | null
  rendimiento?: string | null
  addOns?: AddOn[]
  camposTexto?: CampoTexto[]
}

function TortasPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { agregarItem, cantidadTotal } = useCarrito()

  // Detectar si está en modo staff
  const modoStaff = searchParams.get('modo') === 'staff'
  const [datosCliente, setDatosCliente] = useState<{ nombre: string, telefono: string } | null>(null)

  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Variante | null>(null)
  const [agregado, setAgregado] = useState(false)
  const [addOnsSeleccionados, setAddOnsSeleccionados] = useState<{ [key: string]: Array<{ sku: string | undefined, etiqueta: string, id: string }> }>({})
  const [camposTextoValores, setCamposTextoValores] = useState<{ [nombreCampo: string]: string }>({})
  const [cargandoVariaciones, setCargandoVariaciones] = useState(false)
  const [nivelCliente, setNivelCliente] = useState<{ nivel: string, descuento: number } | null>(null)

  useEffect(() => {
    cargarTortas()

    if (modoStaff) {
      // Cargar datos del cliente desde sessionStorage
      const clienteData = sessionStorage.getItem('pedido_staff_cliente')
      if (clienteData) {
        setDatosCliente(JSON.parse(clienteData))
      } else {
        // Si no hay datos del cliente, redirigir a tomar datos
        router.push('/local/tomar-pedido')
      }
    } else {
      // Modo normal: buscar nivel del cliente autenticado
      fetchNivelCliente()
    }
  }, [modoStaff, router])

  async function fetchNivelCliente() {
    if (modoStaff) return // No buscar nivel en modo staff

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

  // ⚡ PREFETCHING: Cargar variaciones en segundo plano después de la carga inicial
  useEffect(() => {
    if (!loading && productos.length > 0) {
      // Esperar 500ms para que la UI se renderice primero
      const timer = setTimeout(() => {
        prefetchVariaciones()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, productos])

  async function prefetchVariaciones() {
    // Identificar productos variables que necesitan variaciones
    const productosVariables = productos.filter(p =>
      p.tipo === 'variable' &&
      (p.variantes.length === 0 || (p.variantes.length === 1 && p.variantes[0].nombreVariante === 'Mini'))
    )

    console.log(`[Prefetch] Cargando variaciones de ${productosVariables.length} productos en segundo plano...`)

    // Cargar variaciones en paralelo (todas a la vez en background)
    const promesas = productosVariables.map(async (producto) => {
      try {
        const response = await fetch(`/api/woocommerce/variaciones/${producto.id}`)
        const data = await response.json()

        if (data.success && data.variaciones.length > 0) {
          return {
            id: producto.id,
            variaciones: [...producto.variantes, ...data.variaciones]
          }
        }
      } catch (error) {
        console.error(`[Prefetch] Error cargando variaciones de producto ${producto.id}:`, error)
      }
      return null
    })

    const resultados = await Promise.all(promesas)

    // Actualizar productos con variaciones pre-cargadas
    setProductos(prevProductos =>
      prevProductos.map(p => {
        const resultado = resultados.find(r => r && r.id === p.id)
        if (resultado) {
          return { ...p, variantes: resultado.variaciones }
        }
        return p
      })
    )

    console.log('[Prefetch] Variaciones pre-cargadas en segundo plano ✓')
  }

  // Manejar el botón atrás del navegador cuando el modal está abierto
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (productoSeleccionado) {
        e.preventDefault()
        cerrarDetalles()
      }
    }

    if (productoSeleccionado) {
      // Agregar entrada al historial para poder detectar el botón atrás
      window.history.pushState({ modalAbierto: true }, '')
      window.addEventListener('popstate', handlePopState)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [productoSeleccionado])

  async function cargarTortas() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/woocommerce/tortas')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar tortas')
      }

      if (data.success) {
        setProductos(data.products || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function abrirDetalles(producto: Producto) {
    setProductoSeleccionado(producto)
    setVarianteSeleccionada(null)

    // Si por alguna razón las variaciones no están pre-cargadas, cargarlas ahora (fallback)
    const tieneSoloMini = producto.variantes.length === 1 && producto.variantes[0].nombreVariante === 'Mini'
    const noTieneVariantes = producto.variantes.length === 0

    if (producto.tipo === 'variable' && (tieneSoloMini || noTieneVariantes)) {
      setCargandoVariaciones(true)
      try {
        const response = await fetch(`/api/woocommerce/variaciones/${producto.id}`)
        const data = await response.json()

        if (data.success && data.variaciones.length > 0) {
          // Combinar variaciones mini existentes con las de WooCommerce
          const variacionesCompletas = [...producto.variantes, ...data.variaciones]
          producto.variantes = variacionesCompletas

          // Actualizar producto en el estado
          setProductos(prevProductos =>
            prevProductos.map(p => p.id === producto.id ? { ...p, variantes: variacionesCompletas } : p)
          )
        }
      } catch (error) {
        console.error('Error cargando variaciones:', error)
      } finally {
        setCargandoVariaciones(false)
      }
    }

    // Seleccionar primera variante si hay disponibles
    if (producto.variantes.length > 0) {
      // Ordenar variantes por precio (de menor a mayor)
      const variantesOrdenadas = [...producto.variantes].sort((a, b) =>
        parseFloat(a.precio) - parseFloat(b.precio)
      )
      producto.variantes = variantesOrdenadas
      setVarianteSeleccionada(variantesOrdenadas[0])
    }

    // Inicializar add-ons requeridos con su primera opción
    const addOnsIniciales: { [key: string]: Array<{ sku: string | undefined, etiqueta: string, id: string }> } = {}
    if (producto.addOns && producto.addOns.length > 0) {
      producto.addOns.forEach(addOn => {
        if (addOn.requerido && addOn.opciones.length > 0) {
          const primeraOpcion = addOn.opciones[0]
          addOnsIniciales[addOn.nombre] = [{
            sku: primeraOpcion.sku,
            etiqueta: primeraOpcion.etiqueta,
            id: primeraOpcion.sku || primeraOpcion.wooId?.toString() || primeraOpcion.etiqueta
          }]
        }
      })
    }
    setAddOnsSeleccionados(addOnsIniciales)

    // Resetear campos de texto
    setCamposTextoValores({})
  }

  // Función para formatear precio con separador de miles
  // ⚡ OPTIMIZACIÓN: Memoizar función de formateo
  const formatearPrecio = useCallback((precio: string | number): string => {
    const precioNum = typeof precio === 'string' ? parseFloat(precio) : precio
    return precioNum.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [])

  function cerrarDetalles() {
    setProductoSeleccionado(null)
    setVarianteSeleccionada(null)
    setAgregado(false)

    // Si hay una entrada de historial del modal, ir atrás
    if (window.history.state?.modalAbierto) {
      window.history.back()
    }
  }

  function toggleAddOn(addOnNombre: string, opcionId: string, opcionSku: string | undefined, opcionEtiqueta: string, tipo: 'radio' | 'checkbox' = 'checkbox') {
    setAddOnsSeleccionados(prev => {
      const nuevosAddOns = { ...prev }
      const opcionObj = { sku: opcionSku, etiqueta: opcionEtiqueta, id: opcionId }

      if (tipo === 'radio') {
        // Para radio buttons, reemplazar la selección
        nuevosAddOns[addOnNombre] = [opcionObj]
      } else {
        // Para checkboxes, toggle normal
        if (!nuevosAddOns[addOnNombre]) {
          nuevosAddOns[addOnNombre] = []
        }

        // Usar ID único en vez de SKU para comparar
        const index = nuevosAddOns[addOnNombre].findIndex(o => o.id === opcionId)
        if (index > -1) {
          // Ya está seleccionado, removerlo
          nuevosAddOns[addOnNombre] = nuevosAddOns[addOnNombre].filter(o => o.id !== opcionId)
          if (nuevosAddOns[addOnNombre].length === 0) {
            delete nuevosAddOns[addOnNombre]
          }
        } else {
          // No está seleccionado, agregarlo
          // Límite especial para colores del bizcochuelo (máximo 4)
          if (addOnNombre.includes('Colores del Bizcochuelo')) {
            if (nuevosAddOns[addOnNombre].length >= 4) {
              alert('Podés seleccionar hasta 4 colores máximo')
              return prev // No agregar, retornar estado anterior
            }
          }
          nuevosAddOns[addOnNombre].push(opcionObj)
        }
      }

      return nuevosAddOns
    })
  }

  // ⚡ OPTIMIZACIÓN: Memoizar cálculo de precio total con descuento
  const calcularPrecioTotal = useCallback((): { precioOriginal: number, precioConDescuento: number, descuento: number } => {
    let precioOriginal = 0

    if (productoSeleccionado) {
      if (varianteSeleccionada) {
        precioOriginal = parseFloat(varianteSeleccionada.precio)
      } else {
        precioOriginal = parseFloat(productoSeleccionado.precio)
      }

      // Sumar precios de add-ons seleccionados
      if (productoSeleccionado.addOns) {
        productoSeleccionado.addOns.forEach(addOn => {
          const seleccionados = addOnsSeleccionados[addOn.nombre] || []
          seleccionados.forEach(seleccion => {
            // Buscar por ID (que puede ser SKU, wooId o etiqueta)
            const opcion = addOn.opciones.find(o =>
              (o.sku && o.sku === seleccion.sku) ||
              (o.wooId && o.wooId.toString() === seleccion.id) ||
              o.etiqueta === seleccion.id
            )
            if (opcion) {
              precioOriginal += opcion.precio
            }
          })
        })
      }
    }

    // Verificar si es Torta Temática (tiene campos personalizados con temática)
    const esTortaTematica = productoSeleccionado?.camposTexto?.some(campo =>
      campo.nombre.toLowerCase().includes('temática')
    ) || false

    // NO aplicar descuento si es torta temática (SKU 20)
    const porcentajeDescuento = esTortaTematica ? 0 : (nivelCliente?.descuento || 0)
    const montoDescuento = precioOriginal * (porcentajeDescuento / 100)
    const precioConDescuento = precioOriginal - montoDescuento

    return {
      precioOriginal,
      precioConDescuento,
      descuento: montoDescuento
    }
  }, [productoSeleccionado, varianteSeleccionada, addOnsSeleccionados, nivelCliente])

  // ⚡ OPTIMIZACIÓN: Memoizar función de agregar al carrito
  const agregarAlCarrito = useCallback(() => {
    if (!productoSeleccionado) return

    // Si es producto variable, necesita variante seleccionada
    if (productoSeleccionado.variantes.length > 0 && !varianteSeleccionada) {
      alert('Por favor seleccioná un tamaño')
      return
    }

    // Validar campos de texto requeridos
    if (productoSeleccionado.camposTexto) {
      for (const campo of productoSeleccionado.camposTexto) {
        if (campo.requerido && !camposTextoValores[campo.nombre]?.trim()) {
          alert(`Por favor completá el campo: ${campo.nombre}`)
          return
        }
      }
    }

    // Calcular precio de add-ons
    let precioAddOns = 0
    if (productoSeleccionado.addOns) {
      productoSeleccionado.addOns.forEach(addOn => {
        const seleccionados = addOnsSeleccionados[addOn.nombre] || []
        seleccionados.forEach(seleccion => {
          // Buscar por ID (que puede ser SKU, wooId o etiqueta)
          const opcion = addOn.opciones.find(o =>
            (o.sku && o.sku === seleccion.sku) ||
            (o.wooId && o.wooId.toString() === seleccion.id) ||
            o.etiqueta === seleccion.id
          )
          if (opcion) {
            precioAddOns += opcion.precio
          }
        })
      })
    }

    const item = {
      productoId: productoSeleccionado.id,
      varianteId: varianteSeleccionada?.id,
      nombre: productoSeleccionado.nombre,
      nombreVariante: varianteSeleccionada?.nombreVariante,
      precio: varianteSeleccionada ? parseFloat(varianteSeleccionada.precio) : parseFloat(productoSeleccionado.precio),
      imagen: varianteSeleccionada?.imagen || productoSeleccionado.imagen,
      rendimiento: varianteSeleccionada?.rendimiento || productoSeleccionado.rendimiento,
      addOns: Object.keys(addOnsSeleccionados).length > 0 ? addOnsSeleccionados : undefined,
      precioAddOns: precioAddOns > 0 ? precioAddOns : undefined,
      camposTexto: Object.keys(camposTextoValores).length > 0 ? camposTextoValores : undefined,
    }

    agregarItem(item)
    setAgregado(true)

    // Ocultar mensaje después de 2 segundos
    setTimeout(() => setAgregado(false), 2000)
  }, [productoSeleccionado, varianteSeleccionada, addOnsSeleccionados, camposTextoValores, agregarItem])

  // ⚡ OPTIMIZACIÓN: Memoizar productos filtrados (si agregas filtros en el futuro)
  const productosVisibles = useMemo(() => productos, [productos])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner con branding de Coques Bakery */}
      <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Imagen de fondo */}
        <div className="absolute inset-0 opacity-30">
          <Image
            src="/Banner Coques Bakery Rogel.jpg"
            alt="Coques Bakery"
            fill
            className="object-cover"
            priority
            quality={75}
          />
        </div>

        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60"></div>

        {/* Contenido del hero */}
        <div className="relative h-full flex flex-col items-center justify-center px-4">
          <Image
            src="/Coques-Logo-Color-V1.0 (5).png"
            alt="Coques Bakery Logo"
            width={112}
            height={112}
            className="h-20 md:h-28 w-auto mb-4 drop-shadow-2xl"
            priority
            quality={85}
          />
          <p className="text-white text-lg md:text-xl font-light tracking-wide text-center drop-shadow-lg">
            Tortas artesanales de alta calidad
          </p>
        </div>
      </div>

      {/* Banner de modo staff - sticky */}
      {modoStaff && datosCliente && (
        <div className="sticky top-0 z-50 bg-amber-600 text-white shadow-lg border-b-4 border-amber-700">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white text-amber-600 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                📝
              </div>
              <div>
                <p className="font-bold text-lg">Pedido para: {datosCliente.nombre}</p>
                <p className="text-sm text-amber-100">Tel: {datosCliente.telefono}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  sessionStorage.removeItem('pedido_staff_cliente')
                  sessionStorage.removeItem('pedido_staff_modo')
                  router.push('/local/tomar-pedido')
                }}
                className="px-4 py-2 bg-white text-amber-600 rounded-lg font-semibold hover:bg-amber-50 transition-colors text-sm"
              >
                Cambiar cliente
              </button>
              <div className="text-right">
                <p className="text-xs text-amber-100">Modo Staff</p>
                <p className="text-sm font-semibold">Equipo Coques</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4">
        <BackButton href={modoStaff ? "/local" : "/pass"} />

        <div className="mt-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🍰 Tortas Clásicas
          </h1>
          <p className="text-gray-600">
            Descubrí nuestra selección de tortas artesanales
          </p>
        </div>

        {/* Botón flotante del carrito */}
        {cantidadTotal > 0 && (
          <button
            onClick={() => router.push(modoStaff ? '/carrito?staff=true' : '/carrito')}
            className="fixed bottom-6 right-6 bg-gray-800 text-white p-4 rounded-full shadow-lg hover:bg-gray-700 transition-all z-50 flex items-center gap-2"
          >
            <span className="text-2xl">🛒</span>
            <span className="bg-white text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
              {cantidadTotal}
            </span>
          </button>
        )}

        {/* Loading - Skeleton Screens */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Skeleton imagen */}
                <div className="h-64 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>

                {/* Skeleton contenido */}
                <div className="p-4 space-y-3">
                  {/* Título */}
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  {/* Descripción */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                  </div>
                  {/* Precio */}
                  <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  {/* Botón */}
                  <div className="h-10 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">❌ Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={cargarTortas}
              className="mt-3 text-sm text-red-600 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Grid de productos */}
        {!loading && !error && productos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">No hay tortas disponibles en este momento</p>
          </div>
        )}

        {!loading && productosVisibles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productosVisibles.map((producto) => (
              <div
                key={producto.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => abrirDetalles(producto)}
              >
                {/* Imagen */}
                {producto.imagen ? (
                  <div className="relative h-64 bg-gray-100">
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <span className="text-6xl">🍰</span>
                  </div>
                )}

                {/* Contenido */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    {producto.nombre}
                  </h3>

                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {producto.descripcion}
                    </p>
                  )}

                  {/* Mostrar rendimiento si está disponible */}
                  {producto.rendimiento && (
                    <p className="text-xs text-purple-600 font-medium mb-3 flex items-center gap-1">
                      <span>👥</span> {producto.rendimiento}
                    </p>
                  )}

                  {/* Precio */}
                  <div className="mb-3">
                    {producto.tipo === 'simple' ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          ${formatearPrecio(producto.precio)}
                        </span>
                        {producto.precioOferta && (
                          <span className="text-sm text-gray-400 line-through">
                            ${formatearPrecio(producto.precioRegular)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-700">
                        {producto.precioMin === producto.precioMax ? (
                          <span className="text-2xl font-bold text-green-600">
                            ${formatearPrecio(producto.precioMin || 0)}
                          </span>
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            Desde ${formatearPrecio(producto.precioMin || 0)}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {producto.variantes.length} tamaños disponibles
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botón */}
                  <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                    Ver detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de detalles */}
        {productoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  {productoSeleccionado.nombre}
                </h2>
                <button
                  onClick={cerrarDetalles}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6">
                {/* Imagen principal */}
                {productoSeleccionado.imagen && (
                  <div className="mb-6">
                    <img
                      src={varianteSeleccionada?.imagen || productoSeleccionado.imagen}
                      alt={productoSeleccionado.nombre}
                      loading="lazy"
                      className="w-full h-80 object-cover rounded-xl"
                    />
                  </div>
                )}

                {/* Descripción */}
                {productoSeleccionado.descripcion && (
                  <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed">
                      {productoSeleccionado.descripcion}
                    </p>
                  </div>
                )}

                {/* Variantes */}
                {cargandoVariaciones ? (
                  <div className="mb-6 p-8 bg-gray-50 rounded-xl text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
                    <p className="text-gray-600">Cargando tamaños disponibles...</p>
                  </div>
                ) : productoSeleccionado.variantes.length > 0 ? (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3">Tamaños disponibles</h3>
                    <div className="space-y-3">
                      {productoSeleccionado.variantes.map((variante) => (
                        <button
                          key={variante.id}
                          onClick={() => setVarianteSeleccionada(variante)}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${varianteSeleccionada?.id === variante.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                            }`}
                          disabled={!variante.enStock}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">
                                {variante.nombreVariante}
                              </p>
                              {/* Mostrar rendimiento de la variante */}
                              {variante.rendimiento && (
                                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                                  <span>👥</span> {variante.rendimiento}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-green-600">
                                ${formatearPrecio(variante.precio)}
                              </p>
                              {variante.precioOferta && (
                                <p className="text-sm text-gray-400 line-through">
                                  ${formatearPrecio(variante.precioRegular)}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Producto simple */
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Precio</p>
                        {productoSeleccionado.rendimiento && (
                          <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
                            <span>👥</span> {productoSeleccionado.rendimiento}
                          </p>
                        )}
                        {productoSeleccionado.enStock ? (
                          <p className="text-sm text-green-600 font-medium mt-1">
                            ✓ En stock
                          </p>
                        ) : (
                          <p className="text-sm text-red-600 font-medium mt-1">
                            Sin stock
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${formatearPrecio(productoSeleccionado.precio)}
                        </p>
                        {productoSeleccionado.precioOferta && (
                          <p className="text-sm text-gray-400 line-through">
                            ${formatearPrecio(productoSeleccionado.precioRegular)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add-ons opcionales */}
                {productoSeleccionado.addOns && productoSeleccionado.addOns.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3">Adicionales</h3>
                    <div className="space-y-4">
                      {productoSeleccionado.addOns.map((addOn, index) => {
                        // Lógica para mostrar "Colores del Bizcochuelo" solo si se eligió "Bizcochuelo Colores"
                        if (addOn.nombre.includes('Colores del Bizcochuelo')) {
                          const bizcochuelo = addOnsSeleccionados['Bizcochuelo']?.[0]
                          const esBizcochuloColores = bizcochuelo?.etiqueta?.includes('Colores')
                          if (!esBizcochuloColores) {
                            return null // No mostrar si no se eligió bizcochuelo de colores
                          }
                        }

                        return (
                          <Fragment key={addOn.nombre}>
                            <div className="border border-gray-200 rounded-xl p-4">
                              {/* Solo mostrar título si hay más de una opción */}
                              {addOn.opciones.length > 1 && (
                                <>
                                  <h4 className="font-semibold text-gray-800 mb-2">
                                    {addOn.nombre}
                                    {addOn.requerido && <span className="text-red-500 ml-1">*</span>}
                                  </h4>
                                  {addOn.descripcion && (
                                    <p className="text-sm text-gray-600 mb-3">{addOn.descripcion}</p>
                                  )}
                                </>
                              )}
                              <div className="space-y-2">
                                {addOn.opciones.map((opcion) => (
                                  <label
                                    key={opcion.etiqueta}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <input
                                        type={addOn.tipo === 'radio' ? 'radio' : 'checkbox'}
                                        name={addOn.tipo === 'radio' ? addOn.nombre : undefined}
                                        checked={addOnsSeleccionados[addOn.nombre]?.some(o => o.id === (opcion.sku || opcion.wooId?.toString() || opcion.etiqueta)) || false}
                                        onChange={() => toggleAddOn(addOn.nombre, opcion.sku || opcion.wooId?.toString() || opcion.etiqueta, opcion.sku, opcion.etiqueta, addOn.tipo)}
                                        className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                                      />
                                      <span className="text-gray-800">{opcion.etiqueta}</span>
                                    </div>
                                    {opcion.precio > 0 && (
                                      <span className="text-green-600 font-semibold">
                                        +${formatearPrecio(opcion.precio)}
                                      </span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Mostrar campo "Color de la cubierta" justo después de "Tipo de cubierta" */}
                            {addOn.nombre === 'Tipo de cubierta' && (() => {
                              const cubierta = addOnsSeleccionados['Tipo de cubierta']?.[0]
                              const esButtercream = cubierta?.etiqueta?.includes('Buttercream')
                              const campoColor = productoSeleccionado.camposTexto?.find(c => c.nombre.includes('Color de la cubierta'))

                              if (esButtercream && campoColor) {
                                return (
                                  <div className="border border-gray-200 rounded-xl p-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                      {campoColor.nombre}
                                      {campoColor.requerido && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    <input
                                      type="text"
                                      value={camposTextoValores[campoColor.nombre] || ''}
                                      onChange={(e) => setCamposTextoValores(prev => ({
                                        ...prev,
                                        [campoColor.nombre]: e.target.value
                                      }))}
                                      placeholder={campoColor.placeholder}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </Fragment>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Campos de texto personalizados */}
                {productoSeleccionado.camposTexto && productoSeleccionado.camposTexto.length > 0 && (
                  <div className="mb-6">
                    <div className="space-y-4">
                      {productoSeleccionado.camposTexto.map((campo) => {
                        // NO mostrar "Color de la cubierta" aquí - se muestra después del selector de tipo de cubierta
                        if (campo.nombre.includes('Color de la cubierta')) {
                          return null
                        }

                        // Lógica para mostrar campos de Cookies solo si se eligió "Cookies Temáticas"
                        if (campo.nombre.includes('Cantidad de Cookies') ||
                            campo.nombre.includes('Descripción Cookies') ||
                            campo.nombre.includes('URL Imagen Referencia Cookies')) {
                          // Buscar cualquier add-on que contenga "Cookies" en su nombre
                          const cookiesSeleccionadas = Object.keys(addOnsSeleccionados).find(key =>
                            key.toLowerCase().includes('cookies')
                          )
                          if (!cookiesSeleccionadas || !addOnsSeleccionados[cookiesSeleccionadas] ||
                              addOnsSeleccionados[cookiesSeleccionadas].length === 0) {
                            return null // No mostrar si no se eligieron cookies
                          }
                        }

                        return (
                          <div key={campo.nombre}>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {campo.nombre}
                              {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                              type="text"
                              value={camposTextoValores[campo.nombre] || ''}
                              onChange={(e) => setCamposTextoValores(prev => ({
                                ...prev,
                                [campo.nombre]: e.target.value
                              }))}
                              placeholder={campo.placeholder}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Descuento por nivel */}
                {nivelCliente && nivelCliente.descuento > 0 && (
                  <div className="mb-6 bg-purple-900/20 border border-purple-500 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-purple-700">
                          🎁 Beneficio Nivel {nivelCliente.nivel}
                        </p>
                        <p className="text-xs text-purple-600">
                          {nivelCliente.descuento}% de descuento en tu pedido
                        </p>
                      </div>
                      <p className="text-xl font-bold text-purple-700">
                        -{formatearPrecio(calcularPrecioTotal().descuento)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Precio total */}
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="space-y-2">
                    {nivelCliente && nivelCliente.descuento > 0 && (
                      <div className="flex justify-between items-center text-gray-500">
                        <span className="text-sm">Subtotal:</span>
                        <span className="text-lg line-through">
                          ${formatearPrecio(calcularPrecioTotal().precioOriginal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-lg">Total a pagar:</span>
                      <span className="text-3xl font-bold text-green-600">
                        ${formatearPrecio(calcularPrecioTotal().precioConDescuento)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mensaje de éxito */}
                {agregado && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                    <p className="text-green-800 font-semibold text-center">
                      ✓ Agregado al carrito
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3">
                  <button
                    onClick={agregarAlCarrito}
                    disabled={
                      (productoSeleccionado.tipo === 'variable' && !varianteSeleccionada) ||
                      (productoSeleccionado.tipo === 'variable' && varianteSeleccionada && !varianteSeleccionada.enStock) ||
                      (productoSeleccionado.tipo === 'simple' && !productoSeleccionado.enStock)
                    }
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${(productoSeleccionado.tipo === 'variable' && !varianteSeleccionada) ||
                      (productoSeleccionado.tipo === 'variable' && varianteSeleccionada && !varianteSeleccionada.enStock) ||
                      (productoSeleccionado.tipo === 'simple' && !productoSeleccionado.enStock)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                  >
                    {productoSeleccionado.tipo === 'variable' && !varianteSeleccionada
                      ? 'Seleccioná un tamaño'
                      : '🛒 Agregar al Carrito'}
                  </button>

                  <button
                    onClick={cerrarDetalles}
                    className="px-6 py-3 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TortasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>}>
      <TortasPageContent />
    </Suspense>
  )
}
