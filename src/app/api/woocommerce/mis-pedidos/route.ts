// src/app/api/woocommerce/mis-pedidos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireClienteAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // ⚡ OPTIMIZACIÓN: Reducir de 100 a 20 pedidos
    // La mayoría de usuarios solo necesitan ver sus pedidos más recientes
    // Esto reduce el tiempo de respuesta de ~5s a ~1-2s
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // Reducido de 15s a 10s

    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders?per_page=20&orderby=date&order=desc`,
      {
        method: 'GET',
        headers,
        signal: controller.signal,
        next: { revalidate: cacheTime } // Caché de Next.js
      }
    )

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

    console.log(`[Mis Pedidos] Cliente email: ${cliente.email}, ID: ${cliente.id}`)
    console.log(`[Mis Pedidos] Total orders fetched: ${orders.length}`)
    
    // Filtrar solo pedidos con el cliente_app_id correcto o email coincidente
    const pedidosFiltrados = orders.filter((order: any) => {
      const clienteAppId = order.meta_data?.find((m: any) => m.key === 'cliente_app_id')?.value
      const emailMatch = order.billing.email === cliente.email
      const idMatch = clienteAppId === cliente.id
      
      console.log(`[Mis Pedidos] Order #${order.number}: email=${order.billing.email} (match: ${emailMatch}), cliente_app_id=${clienteAppId} (match: ${idMatch})`)
      
      return emailMatch || idMatch
    })
    
    console.log(`[Mis Pedidos] Filtered orders: ${pedidosFiltrados.length}`)

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
