// src/app/api/woocommerce/mis-pedidos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireClienteAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { evaluarNivel } from '@/lib/beneficios'
import { getDatetimeArgentina } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/mis-pedidos
 * Obtener pedidos del cliente logueado desde WooCommerce
 */
export async function GET(req: NextRequest) {
  // Reducir caché a 30 segundos para mostrar estados actualizados más rápido
  // Los pedidos cambian de estado frecuentemente (processing → completed)
  const cacheTime = 30 // 30 segundos

  try {
    // Verificar autenticación del cliente
    const clientePayload = await requireClienteAuth(req)
    if (!clientePayload) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      )
    }

    // Obtener email del cliente desde la BD
    const cliente = await prisma.cliente.findUnique({
      where: { id: clientePayload.clienteId },
      select: {
        id: true,
        email: true,
        nombre: true,
      }
    })

    if (!cliente || !cliente.email) {
      return NextResponse.json(
        { error: 'Cliente no encontrado o sin email registrado' },
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

    const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'User-Agent': 'FidelizacionApp/1.0',
    }

    console.log(`[Mis Pedidos] Cliente email: ${cliente.email}, ID: ${cliente.id}`)

    // Paso 1: Buscar el ID del cliente en WooCommerce por email
    let wooCustomerId: number | null = null
    try {
      const customerRes = await fetch(
        `${wooUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(cliente.email)}&per_page=1`,
        { headers, next: { revalidate: 300 } }
      )
      if (customerRes.ok) {
        const customers = await customerRes.json()
        if (customers.length > 0) {
          wooCustomerId = customers[0].id
          console.log(`[Mis Pedidos] WooCommerce customer ID encontrado: ${wooCustomerId}`)
        }
      }
    } catch (err) {
      console.warn('[Mis Pedidos] No se pudo buscar customer ID, se usará fallback por email:', err)
    }

    // Paso 2: Buscar pedidos — por customer ID si existe, si no por todos + filtro email
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const ordersUrl = wooCustomerId
      ? `${wooUrl}/wp-json/wc/v3/orders?customer=${wooCustomerId}&per_page=50&orderby=date&order=desc`
      : `${wooUrl}/wp-json/wc/v3/orders?per_page=50&orderby=date&order=desc`

    const response = await fetch(ordersUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      next: { revalidate: cacheTime },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WooCommerce Mis Pedidos] Error:', response.status, errorText)
      return NextResponse.json(
        {
          error: 'Error al obtener pedidos de WooCommerce',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      )
    }

    const orders = await response.json()
    console.log(`[Mis Pedidos] Total orders fetched: ${orders.length} (customer filter: ${wooCustomerId ? 'sí' : 'no'})`)

    // Filtrar por email o cliente_app_id (necesario cuando no hay customer ID)
    const pedidosFiltrados = wooCustomerId
      ? orders // Ya están filtrados por WooCommerce
      : orders.filter((order: any) => {
          const clienteAppId = order.meta_data?.find((m: any) => m.key === 'cliente_app_id')?.value
          return order.billing.email === cliente.email || clienteAppId === cliente.id
        })

    console.log(`[Mis Pedidos] Pedidos del cliente: ${pedidosFiltrados.length}`)

    // Formatear respuesta
    const pedidos = pedidosFiltrados.map((order: any) => {
      // Extraer fecha y hora de entrega de los metadatos
      const fechaEntregaMeta = order.meta_data?.find((m: any) => m.key === '¿Para que fecha querés el pedido?')
      const horaEntregaMeta = order.meta_data?.find((m: any) => m.key === '¿En que horario?')

      return {
        id: order.id,
        numero: order.number,
        estado: order.status,
        estadoTexto: getEstadoTexto(order.status),
        fechaCreacion: order.date_created,
        fechaActualizacion: order.date_modified,
        fechaEntrega: fechaEntregaMeta?.value || null,
        horaEntrega: horaEntregaMeta?.value || null,
        total: order.total,
        moneda: order.currency,
        metodoPago: order.payment_method_title,
        items: order.line_items?.map((item: any) => {
          // Calcular precio con IVA incluido
          const precioConIva = parseFloat(item.price) + (parseFloat(item.total_tax) / item.quantity)
          const totalConIva = parseFloat(item.total) + parseFloat(item.total_tax)

          return {
            nombre: item.name,
            cantidad: item.quantity,
            precio: precioConIva.toFixed(2),
            total: totalConIva.toFixed(2),
            imagen: item.image?.src || null,
          }
        }) || [],
        urlAdmin: `${wooUrl}/wp-admin/post.php?post=${order.id}&action=edit`,
      }
    })

    // ✨ REGISTRO AUTOMÁTICO DE PEDIDOS DE TORTAS COMPLETADOS
    // Crear eventos PEDIDO_TORTA para pedidos completados que no tengan evento registrado
    try {
      // Obtener local de cafetería
      const local = await prisma.local.findFirst({
        where: { tipo: 'cafeteria' }
      })

      if (local) {
        // Filtrar solo pedidos completados
        const pedidosCompletados = pedidosFiltrados.filter((order: any) => order.status === 'completed')

        // Procesar cada pedido completado
        const resultados = await Promise.allSettled(
          pedidosCompletados.map(async (order: any) => {
            // Verificar si ya existe un evento PEDIDO_TORTA para este pedido
            const eventoExistente = await prisma.eventoScan.findFirst({
              where: {
                clienteId: cliente.id,
                tipoEvento: 'PEDIDO_TORTA',
                notas: `Pedido WooCommerce #${order.id}`,
              }
            })

            // Si no existe, crear el evento
            if (!eventoExistente) {
              await prisma.eventoScan.create({
                data: {
                  timestamp: getDatetimeArgentina(),
                  clienteId: cliente.id,
                  localId: local.id,
                  tipoEvento: 'PEDIDO_TORTA',
                  metodoValidacion: 'QR',
                  contabilizada: true,
                  notas: `Pedido WooCommerce #${order.id}`,
                }
              })

              console.log(`[Mis Pedidos] ✅ Evento PEDIDO_TORTA creado automáticamente para pedido #${order.id}`)

              // Evaluar si el cliente sube de nivel
              const resultado = await evaluarNivel(cliente.id)
              if (resultado) {
                console.log(`[Mis Pedidos] 🎉 Cliente ${cliente.nombre || cliente.id} subió de nivel: ${resultado.nombre}`)
              }
            }
          })
        )

        // Log de errores con detalle para debugging
        const fallidos = resultados.filter(r => r.status === 'rejected')
        if (fallidos.length > 0) {
          console.error(`[Mis Pedidos] ${fallidos.length}/${pedidosCompletados.length} eventos PEDIDO_TORTA fallaron:`,
            fallidos.map(r => (r as PromiseRejectedResult).reason)
          )
        }
      }
    } catch (error) {
      // No bloqueamos la respuesta si hay error en el registro automático
      console.error('[Mis Pedidos] Error en registro automático de pedidos:', error)
    }

    return NextResponse.json({
      success: true,
      pedidos,
      total: pedidos.length,
    })
  } catch (error) {
    console.error('[WooCommerce Mis Pedidos] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener pedidos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Convertir estado de WooCommerce a texto legible en español
 */
function getEstadoTexto(status: string): string {
  const estados: Record<string, string> = {
    'pending': 'Pendiente de pago',
    'processing': 'Procesando',
    'on-hold': 'En espera',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    'refunded': 'Reembolsado',
    'failed': 'Fallido',
  }
  return estados[status] || status
}
