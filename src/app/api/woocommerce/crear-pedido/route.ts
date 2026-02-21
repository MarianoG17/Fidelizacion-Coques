// src/app/api/woocommerce/crear-pedido/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireClienteAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Mapeo de nombres de add-ons a SKUs de Ayres (mismo que en tortas/route.ts)
const ADDON_NOMBRE_A_SKU: { [key: string]: string } = {
  // Rellenos
  'Relleno de Dulce de Leche': '467',
  'Relleno de Chocolate': '466',
  'Relleno Nutella': '300', // Sin "de"
  'Relleno Dulce de Leche': '257', // Tarta Frutilla
  'ADICIONALES: Chocolates, Oreos Bañadas y Bombones de DDL.': '260', // Chocotorta

  // Bizcochuelos
  'Bizcochuelo de Vainilla': '399',
  'Bizcochuelo de Chocolate': '398',
  'Bizcochuelo Marmolado': '461',

  // Cubiertas
  'Cubierta Ganache': '464',
  'Cubierta Merengue': '465',
}

interface ItemPedido {
  productoId: number
  varianteId?: number
  cantidad: number
  addOns?: { [nombre: string]: string[] }
  addOnsSkus?: { sku: string; nombre: string }[]
  camposTexto?: { [nombreCampo: string]: string }
}

interface DatosPedido {
  items: ItemPedido[]
  notas?: string
  fechaEntrega?: string
  horaEntrega?: string
  modoStaff?: boolean
  datosCliente?: { nombre: string, telefono: string }
}

/**
 * POST /api/woocommerce/crear-pedido
 * Crear un pedido en WooCommerce usando los datos del cliente logueado
 */
export async function POST(req: NextRequest) {
  try {
    const body: DatosPedido = await req.json()
    const { items, notas, fechaEntrega, horaEntrega, modoStaff, datosCliente } = body

    let cliente = null
    let descuentoPorcentaje = 0

    if (modoStaff) {
      // MODO STAFF: No requiere autenticación de cliente
      console.log('[Staff Order] Pedido para:', datosCliente?.nombre, datosCliente?.telefono)
      descuentoPorcentaje = 0 // Sin descuentos en modo staff
    } else {
      // MODO NORMAL: Cliente autenticado
      const clientePayload = await requireClienteAuth(req)
      if (!clientePayload) {
        return NextResponse.json(
          { error: 'No autorizado. Debes iniciar sesión para realizar un pedido.' },
          { status: 401 }
        )
      }

      // Obtener datos completos del cliente desde la BD (incluyendo nivel)
      cliente = await prisma.cliente.findUnique({
        where: { id: clientePayload.clienteId },
        include: {
          nivel: {
            select: {
              nombre: true,
              descuentoPedidosTortas: true,
            }
          }
        }
      })

      if (!cliente) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        )
      }

      descuentoPorcentaje = cliente.nivel?.descuentoPedidosTortas || 0
    }

    const wooUrl = process.env.WOOCOMMERCE_URL
    const wooKey = process.env.WOOCOMMERCE_KEY
    const wooSecret = process.env.WOOCOMMERCE_SECRET

    if (!wooUrl || !wooKey || !wooSecret) {
      return NextResponse.json(
        { error: 'Credenciales de WooCommerce no configuradas' },
        { status: 500 }
      )
    }

    // Validaciones
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'El pedido debe contener al menos un producto' },
        { status: 400 }
      )
    }

    if (!fechaEntrega || !horaEntrega) {
      return NextResponse.json(
        { error: 'Se requiere fecha y hora de entrega' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'User-Agent': 'FidelizacionApp/1.0',
    }

    // Construir line_items para WooCommerce
    const lineItems: any[] = []

    // Recopilar todos los SKUs de add-ons para buscar sus IDs en WooCommerce
    const addOnSkus: string[] = []
    for (const item of items) {
      if (item.addOns) {
        for (const [nombre, opciones] of Object.entries(item.addOns)) {
          opciones.forEach((opcion: any) => {
            let sku: string | undefined

            // Nuevo formato: objeto con {sku, etiqueta}
            if (typeof opcion === 'object' && opcion.sku) {
              sku = opcion.sku
            }
            // Formato antiguo (backwards compatibility): string con nombre
            else if (typeof opcion === 'string') {
              sku = ADDON_NOMBRE_A_SKU[opcion]
              console.log(`[Crear Pedido] Usando mapeo legacy para: "${opcion}" -> SKU ${sku}`)
            }

            if (sku && !addOnSkus.includes(sku)) {
              addOnSkus.push(sku)
            }
          })
        }
      }
    }

    // Obtener IDs de WooCommerce para los add-ons por SKU
    const skuToProductId: { [sku: string]: number } = {}
    if (addOnSkus.length > 0) {
      try {
        for (const sku of addOnSkus) {
          const skuResponse = await fetch(
            `${wooUrl}/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}&per_page=1`,
            { headers }
          )
          if (skuResponse.ok) {
            const skuData = await skuResponse.json()
            if (skuData.length > 0) {
              skuToProductId[sku] = skuData[0].id
            }
          }
        }
        console.log('[Crear Pedido] SKUs de add-ons encontrados:', skuToProductId)
      } catch (error) {
        console.error('[Crear Pedido] Error buscando SKUs de add-ons:', error)
      }
    }

    // Procesar cada item del pedido
    for (const item of items) {
      // Agregar producto principal
      const lineItem: any = {
        product_id: item.productoId,
        quantity: item.cantidad,
      }

      // Si tiene variante, agregar variation_id
      if (item.varianteId) {
        lineItem.variation_id = item.varianteId
      }

      lineItems.push(lineItem)

      // Agregar add-ons como productos separados
      if (item.addOns) {
        for (const [nombre, opciones] of Object.entries(item.addOns)) {
          opciones.forEach((opcion: any) => {
            let sku: string | undefined
            let etiqueta: string

            // Nuevo formato: objeto con {sku, etiqueta}
            if (typeof opcion === 'object' && opcion.sku) {
              sku = opcion.sku
              etiqueta = opcion.etiqueta
            }
            // Formato antiguo (backwards compatibility): string con nombre
            else if (typeof opcion === 'string') {
              sku = ADDON_NOMBRE_A_SKU[opcion]
              etiqueta = opcion
            } else {
              console.warn(`[Crear Pedido] ✗ Formato de add-on no reconocido:`, opcion)
              return
            }

            if (sku && skuToProductId[sku]) {
              lineItems.push({
                product_id: skuToProductId[sku],
                quantity: item.cantidad, // Cantidad basada en el producto principal
              })
              console.log(`[Crear Pedido] ✓ Agregando add-on: ${etiqueta} (SKU ${sku}, ID ${skuToProductId[sku]})`)
            } else {
              console.warn(`[Crear Pedido] ✗ Add-on no encontrado: "${etiqueta}" | SKU: ${sku || 'NO ENCONTRADO'} | ID: ${sku ? skuToProductId[sku] || 'NO ENCONTRADO EN WOOCOMMERCE' : 'N/A'}`)
            }
          })
        }
      }
    }

    // Estructura del pedido para WooCommerce usando datos del cliente o staff
    const nombreCompleto = modoStaff
      ? (datosCliente?.nombre || 'Cliente')
      : (cliente?.nombre || 'Cliente')

    // Formatear fecha y hora para mostrar
    const fechaObj = new Date(fechaEntrega + 'T00:00:00')
    const fechaFormateada = fechaObj.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    // Formato español para Ayres IT: "16 Febrero, 2026" (mes con MAYÚSCULA inicial!)
    const mesesES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const [year, month, day] = fechaEntrega.split('-')
    const fechaEspanol = `${parseInt(day)} ${mesesES[parseInt(month) - 1]}, ${year}`

    // Crear rango de horario: "17:00 - 18:00"
    const [hora, minutos] = horaEntrega.split(':')
    const horaInicio = `${hora}:${minutos}`
    const horaSiguiente = (parseInt(hora) + 1).toString().padStart(2, '0')
    const horaFin = `${horaSiguiente}:00`
    const rangoHorario = `${horaInicio} - ${horaFin}`

    // Crear fecha/hora completa de entrega en formato ISO y timestamps Unix
    const fechaHoraEntrega = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hora), parseInt(minutos))
    const fechaHoraISO = fechaHoraEntrega.toISOString()
    const fechaHoraLocal = fechaHoraEntrega.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // Timestamps Unix para Ayresit (en segundos, no milisegundos)
    const fechaSoloInicio = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0)
    const timestampFecha = Math.floor(fechaSoloInicio.getTime() / 1000)  // Fecha a las 00:00
    const timestampFechaHora = Math.floor(fechaHoraEntrega.getTime() / 1000)  // Fecha + hora específica

    // Construir notas del cliente con fecha de entrega
    let customerNote = modoStaff
      ? `📦 Pedido desde App de Fidelización (STAFF)\n👤 Cliente: ${datosCliente?.nombre || 'N/A'}\n📞 Teléfono: ${datosCliente?.telefono || 'N/A'}\n📅 Fecha de entrega: ${fechaFormateada}\n⏰ Horario: ${horaEntrega} hs`
      : `📦 Pedido desde App de Fidelización\n👤 Cliente ID: ${cliente?.id}\n📅 Fecha de entrega: ${fechaFormateada}\n⏰ Horario: ${horaEntrega} hs`

    // Agregar campos de texto personalizados (ej: Color de decoración)
    const camposTextoDetalle: string[] = []
    items.forEach((item, index) => {
      if (item.camposTexto && Object.keys(item.camposTexto).length > 0) {
        Object.entries(item.camposTexto).forEach(([nombreCampo, valor]) => {
          if (valor) {
            camposTextoDetalle.push(`${nombreCampo}: ${valor}`)
          }
        })
      }
    })

    if (camposTextoDetalle.length > 0) {
      customerNote += `\n\n🎨 Personalizaciones:\n${camposTextoDetalle.join('\n')}`
    }

    if (notas) {
      customerNote += `\n\n📝 Notas adicionales: ${notas}`
    }

    // Calcular descuento por nivel y aplicarlo directamente en los line_items
    // Los precios en WooCommerce incluyen IVA, pero los campos subtotal/total deben ser SIN IVA
    const IVA_FACTOR = 1.21 // IVA 21% en Argentina
    // Nota: descuentoPorcentaje ya fue calculado arriba en línea 55-95
    const factorDescuento = descuentoPorcentaje > 0 ? (100 - descuentoPorcentaje) / 100 : 1
    let descuentoMontoTotal = 0
    let subtotalPedido = 0

    // Si hay descuento, necesitamos obtener precios y aplicar descuento a cada line_item
    if (descuentoPorcentaje > 0) {
      for (let i = 0; i < lineItems.length; i++) {
        const lineItem = lineItems[i]
        const itemOriginal = items.find(it => it.productoId === lineItem.product_id)

        if (!itemOriginal) continue // Skip add-ons, solo aplicamos descuento a productos principales

        try {
          let precioConIVA = 0

          if (lineItem.variation_id) {
            // Obtener precio de la variante
            const varianteRes = await fetch(
              `${wooUrl}/wp-json/wc/v3/products/${lineItem.product_id}/variations/${lineItem.variation_id}`,
              { headers }
            )
            if (varianteRes.ok) {
              const variante = await varianteRes.json()
              precioConIVA = parseFloat(variante.price) || 0
            }
          } else {
            // Obtener precio del producto simple
            const productoRes = await fetch(
              `${wooUrl}/wp-json/wc/v3/products/${lineItem.product_id}`,
              { headers }
            )
            if (productoRes.ok) {
              const producto = await productoRes.json()
              precioConIVA = parseFloat(producto.price) || 0
            }
          }

          if (precioConIVA > 0) {
            const cantidad = lineItem.quantity

            // Convertir precio con IVA a precio sin IVA
            const precioSinIVA = precioConIVA / IVA_FACTOR
            const subtotalSinIVA = precioSinIVA * cantidad
            let totalSinIVA = subtotalSinIVA * factorDescuento

            // Redondear total con IVA hacia abajo a la centena más cercana
            let totalConIVA = totalSinIVA * IVA_FACTOR
            const totalRedondeado = Math.floor(totalConIVA / 100) * 100

            // Recalcular totalSinIVA basándose en el total redondeado
            totalSinIVA = totalRedondeado / IVA_FACTOR

            // Aplicar descuento en el line_item (precios SIN IVA)
            lineItems[i].subtotal = subtotalSinIVA.toFixed(2)
            lineItems[i].total = totalSinIVA.toFixed(2)

            // Para el log, mostrar valores CON IVA (más fácil de entender)
            const subtotalConIVA = subtotalSinIVA * IVA_FACTOR
            subtotalPedido += subtotalConIVA
            descuentoMontoTotal += (subtotalConIVA - totalRedondeado)
          }
        } catch (error) {
          console.error('[Crear Pedido] Error aplicando descuento a item:', error)
        }
      }

      console.log(`[Crear Pedido] Descuento aplicado: ${descuentoPorcentaje}% = -$${descuentoMontoTotal.toFixed(2)} (Subtotal con IVA: $${subtotalPedido.toFixed(2)}, Total con IVA: $${(subtotalPedido - descuentoMontoTotal).toFixed(2)})`)
    }

    const orderData: any = {
      payment_method: 'cod', // Cash on delivery (pago en efectivo/transferencia)
      payment_method_title: 'Pago al retirar o por transferencia',
      set_paid: false, // No marcar como pagado aún
      status: 'processing', // Estado inicial: procesando (pedido confirmado, pendiente de preparación)
      billing: {
        first_name: nombreCompleto.split(' ')[0] || nombreCompleto,
        last_name: nombreCompleto.split(' ').slice(1).join(' ') || '',
        email: modoStaff ? 'staff@coques.com' : (cliente?.email || ''),
        phone: modoStaff ? (datosCliente?.telefono || '') : (cliente?.phone || ''),
      },
      line_items: lineItems,
      customer_note: customerNote,
      meta_data: [
        {
          key: 'origen',
          value: modoStaff ? 'app_fidelizacion_staff' : 'app_fidelizacion',
        },
        ...(modoStaff ? [] : [{
          key: 'cliente_app_id',
          value: cliente?.id || '',
        }]),
        // *** CAMPOS DE FECHA Y HORA PARA AYRES IT ***
        // Campos que usa el pedido 2284 que funciona (incluyendo timestamps Unix)
        {
          key: '¿Para que fecha querés el pedido?',
          value: fechaEspanol, // Formato: "16 Febrero, 2026" (mes con mayúscula)
        },
        {
          key: '¿En que horario?',
          value: rangoHorario, // Formato: "17:00 - 18:00"
        },
        // Timestamps Unix (críticos para que Ayresit lea la fecha correcta)
        {
          key: '_orddd_lite_timestamp',
          value: timestampFecha.toString(), // Timestamp de fecha (00:00 del día)
        },
        {
          key: '_orddd_lite_timeslot_timestamp',
          value: timestampFechaHora.toString(), // Timestamp de fecha + hora específica
        },
        {
          key: '_orddd_time_slot',
          value: rangoHorario, // "16:00 - 17:00"
        },
      ],
    }

    // Agregar metadata del descuento para referencia (sin usar cupones)
    if (descuentoMontoTotal > 0 && cliente?.nivel) {
      orderData.meta_data.push({
        key: 'descuento_nivel_fidelizacion',
        value: `${cliente.nivel.nombre} - ${descuentoPorcentaje}% = -$${descuentoMontoTotal.toFixed(2)}`
      })
    }
    
    // Agregar metadata staff si aplica
    if (modoStaff && datosCliente) {
      orderData.meta_data.push({
        key: 'pedido_staff',
        value: `Tomado por staff para ${datosCliente.nombre} (${datosCliente.telefono})`
      })
    }

    console.log('[WooCommerce Crear Pedido] Datos:', JSON.stringify(orderData, null, 2))

    // Crear pedido en WooCommerce
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WooCommerce Crear Pedido] Error:', response.status, errorText)
      return NextResponse.json(
        {
          error: 'Error al crear pedido en WooCommerce',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      )
    }

    const order = await response.json()

    console.log(`[WooCommerce Crear Pedido] Pedido creado exitosamente: ${order.id}`)

    // Formatear respuesta
    const pedidoCreado = {
      id: order.id,
      numero: order.number,
      estado: order.status,
      fechaCreacion: order.date_created,
      total: order.total,
      moneda: order.currency,
      metodoPago: order.payment_method_title,
      cliente: modoStaff ? {
        id: 'staff',
        nombre: datosCliente?.nombre || 'Cliente',
        email: 'staff@coques.com',
        telefono: datosCliente?.telefono || '',
      } : {
        id: cliente?.id || '',
        nombre: cliente?.nombre || '',
        email: cliente?.email || '',
        telefono: cliente?.phone || '',
      },
      items: order.line_items?.map((item: any) => ({
        productoId: item.product_id,
        varianteId: item.variation_id || null,
        nombre: item.name,
        cantidad: item.quantity,
        precio: item.price,
        subtotal: item.subtotal,
        total: item.total,
      })) || [],
      urlAdmin: `${wooUrl}/wp-admin/post.php?post=${order.id}&action=edit`,
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido creado exitosamente',
      pedido: pedidoCreado,
    })
  } catch (error) {
    console.error('[WooCommerce Crear Pedido] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al crear pedido',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
