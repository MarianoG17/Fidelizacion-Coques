// src/app/api/woocommerce/crear-pedido/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireClienteAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface ItemPedido {
  productoId: number
  varianteId?: number
  cantidad: number
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
    const lineItems = items.map(item => {
      const lineItem: any = {
        product_id: item.productoId,
        quantity: item.cantidad,
      }

      // Si tiene variante, agregar variation_id
      if (item.varianteId) {
        lineItem.variation_id = item.varianteId
      }

      return lineItem
    })

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
    
    // Formato español para Ayres IT: "16 Febrero, 2026" (con mayúscula en mes)
    const mesesES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
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
    if (notas) {
      customerNote += `\n📝 Notas adicionales: ${notas}`
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
