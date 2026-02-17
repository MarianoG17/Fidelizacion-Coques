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
  addOns?: {[nombre: string]: string[]}
  addOnsSkus?: {sku: string; nombre: string}[]
  camposTexto?: {[nombreCampo: string]: string}
}

interface DatosPedido {
  items: ItemPedido[]
  notas?: string
  fechaEntrega?: string
  horaEntrega?: string
}

/**
 * POST /api/woocommerce/crear-pedido
 * Crear un pedido en WooCommerce usando los datos del cliente logueado
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación del cliente
    const clientePayload = await requireClienteAuth(req)
    if (!clientePayload) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión para realizar un pedido.' },
        { status: 401 }
      )
    }

    // Obtener datos completos del cliente desde la BD
    const cliente = await prisma.cliente.findUnique({
      where: { id: clientePayload.clienteId },
      select: {
        id: true,
        nombre: true,
        email: true,
        phone: true,
      }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
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

    const body: DatosPedido = await req.json()
    const { items, notas, fechaEntrega, horaEntrega } = body

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

    // Estructura del pedido para WooCommerce usando datos del cliente
    const nombreCompleto = cliente.nombre || 'Cliente'

    // Formatear fecha y hora para mostrar
    const fechaObj = new Date(fechaEntrega + 'T00:00:00')
    const fechaFormateada = fechaObj.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    
    // Formato español para Ayres IT: "16 febrero, 2026" (mes en minúscula!)
    const mesesES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    const [year, month, day] = fechaEntrega.split('-')
    const fechaEspanol = `${parseInt(day)} ${mesesES[parseInt(month) - 1]}, ${year}`
    
    // Crear rango de horario: "17:00 - 18:00"
    const [hora, minutos] = horaEntrega.split(':')
    const horaInicio = `${hora}:${minutos}`
    const horaSiguiente = (parseInt(hora) + 1).toString().padStart(2, '0')
    const horaFin = `${horaSiguiente}:00`
    const rangoHorario = `${horaInicio} - ${horaFin}`
    
    // Crear fecha/hora completa de entrega en formato ISO y otros formatos
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
    
    // Construir notas del cliente con fecha de entrega
    let customerNote = `📦 Pedido desde App de Fidelización\n👤 Cliente ID: ${cliente.id}\n📅 Fecha de entrega: ${fechaFormateada}\n⏰ Horario: ${horaEntrega} hs`
    
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

    const orderData = {
      payment_method: 'cod', // Cash on delivery (pago en efectivo/transferencia)
      payment_method_title: 'Pago al retirar o por transferencia',
      set_paid: false, // No marcar como pagado aún
      status: 'processing', // Estado inicial: procesando (pedido confirmado, pendiente de preparación)
      billing: {
        first_name: nombreCompleto.split(' ')[0] || nombreCompleto,
        last_name: nombreCompleto.split(' ').slice(1).join(' ') || '',
        email: cliente.email || '',
        phone: cliente.phone || '',
      },
      line_items: lineItems,
      customer_note: customerNote,
      meta_data: [
        {
          key: 'origen',
          value: 'app_fidelizacion',
        },
        {
          key: 'cliente_app_id',
          value: cliente.id,
        },
        // *** SOLO LOS 2 CAMPOS QUE USA AYRES IT ***
        // Eliminamos todos los campos técnicos adicionales que confunden al sistema
        {
          key: '¿Para que fecha querés el pedido?',
          value: fechaEspanol, // Formato: "16 Febrero, 2026"
        },
        {
          key: '¿En que horario?',
          value: rangoHorario, // Formato: "17:00 - 18:00"
        },
      ],
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
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.phone,
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
