// src/app/api/woocommerce/debug-pedido/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/debug-pedido?id=2316
 * Debug endpoint para ver el estado actual de un pedido en WooCommerce
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const pedidoId = searchParams.get('id')

    if (!pedidoId) {
      return NextResponse.json(
        { error: 'Falta parámetro: id' },
        { status: 400 }
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
    
    // Hacer request directo a WooCommerce sin caché
    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders/${pedidoId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Forzar sin caché
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: 'Error al obtener pedido de WooCommerce',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      )
    }

    const order = await response.json()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      pedido: {
        id: order.id,
        numero: order.number,
        estado: order.status,
        estadoRaw: order.status,
        fechaCreacion: order.date_created,
        fechaModificacion: order.date_modified,
        fechaCompletado: order.date_completed,
        billing: {
          nombre: order.billing.first_name + ' ' + order.billing.last_name,
          email: order.billing.email,
          telefono: order.billing.phone,
        },
        items: order.line_items.map((item: any) => ({
          nombre: item.name,
          cantidad: item.quantity,
        })),
        total: order.total,
        urlAdmin: `${wooUrl}/wp-admin/post.php?post=${order.id}&action=edit`,
      }
    })
  } catch (error) {
    console.error('[Debug Pedido] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener pedido',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
