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

    // Obtener pedidos del cliente por email
    // Usando búsqueda por billing_email (funciona mejor que customer)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders?search=${encodeURIComponent(cliente.email)}&per_page=50&orderby=date&order=desc`,
      {
        method: 'GET',
        headers,
        signal: controller.signal,
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

    // Filtrar solo pedidos con el cliente_app_id correcto o email coincidente
    const pedidosFiltrados = orders.filter((order: any) => {
      const clienteAppId = order.meta_data?.find((m: any) => m.key === 'cliente_app_id')?.value
      return order.billing.email === cliente.email || clienteAppId === cliente.id
    })

    // Formatear respuesta
    const pedidos = pedidosFiltrados.map((order: any) => ({
      id: order.id,
      numero: order.number,
      estado: order.status,
      estadoTexto: getEstadoTexto(order.status),
      fechaCreacion: order.date_created,
      fechaActualizacion: order.date_modified,
      total: order.total,
      moneda: order.currency,
      metodoPago: order.payment_method_title,
      items: order.line_items?.map((item: any) => ({
        nombre: item.name,
        cantidad: item.quantity,
        precio: item.price,
        total: item.total,
        imagen: item.image?.src || null,
      })) || [],
      urlAdmin: `${wooUrl}/wp-admin/post.php?post=${order.id}&action=edit`,
    }))

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
