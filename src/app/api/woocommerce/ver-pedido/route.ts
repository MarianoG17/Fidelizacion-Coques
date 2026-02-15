// src/app/api/woocommerce/ver-pedido/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/ver-pedido?id=2263
 * 
 * Muestra TODOS los meta_data de un pedido incluyendo campos ocultos
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pedidoId = searchParams.get('id')

    if (!pedidoId) {
      return NextResponse.json(
        { error: 'Falta parámetro id en query' },
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
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders/${pedidoId}`,
      { headers }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { 
          error: `Error al obtener pedido ${pedidoId}`, 
          status: response.status,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      )
    }

    const pedido = await response.json()

    return NextResponse.json({
      success: true,
      pedido_id: pedido.id,
      pedido_numero: pedido.number,
      meta_data_completo: pedido.meta_data,
      // Filtrar solo campos relacionados con fecha/hora/delivery
      campos_fecha_hora: pedido.meta_data.filter((m: any) => {
        const key = m.key.toLowerCase()
        return key.includes('fecha') ||
               key.includes('hora') ||
               key.includes('delivery') ||
               key.includes('date') ||
               key.includes('time') ||
               key.includes('orddd') ||
               key.includes('querés')
      })
    })
  } catch (error) {
    console.error('[Ver Pedido] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener pedido',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
