// src/app/api/woocommerce/comparar-pedidos/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/comparar-pedidos?pedido_bueno=2263&pedido_app=2270
 * 
 * Compara los meta_data de dos pedidos para identificar diferencias
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pedidoBuenoId = searchParams.get('pedido_bueno') // El que SÍ funciona en Ayres IT
    const pedidoAppId = searchParams.get('pedido_app') // El que NO funciona

    if (!pedidoBuenoId || !pedidoAppId) {
      return NextResponse.json(
        { error: 'Falta pedido_bueno o pedido_app en query params' },
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

    // Obtener ambos pedidos
    const [pedidoBueno, pedidoApp] = await Promise.all([
      fetch(`${wooUrl}/wp-json/wc/v3/orders/${pedidoBuenoId}`, { headers }).then(r => r.json()),
      fetch(`${wooUrl}/wp-json/wc/v3/orders/${pedidoAppId}`, { headers }).then(r => r.json()),
    ])

    // Extraer solo los meta_data para comparar
    const metaBueno = pedidoBueno.meta_data || []
    const metaApp = pedidoApp.meta_data || []

    // Filtrar campos relacionados con fecha/hora/delivery
    const palabrasClave = ['fecha', 'hora', 'delivery', 'time', 'date', 'entrega', 'scheduled', 'querés', 'horario']
    
    const metaBuenoFiltrado = metaBueno.filter((m: any) => 
      palabrasClave.some(palabra => 
        m.key.toLowerCase().includes(palabra)
      )
    )

    const metaAppFiltrado = metaApp.filter((m: any) => 
      palabrasClave.some(palabra => 
        m.key.toLowerCase().includes(palabra)
      )
    )

    // Encontrar campos que están en pedidoBueno pero NO en pedidoApp
    const camposFaltantes = metaBuenoFiltrado.filter((campoBueno: any) => 
      !metaAppFiltrado.some((campoApp: any) => campoApp.key === campoBueno.key)
    )

    // Encontrar campos que tienen valores diferentes
    const camposDiferentes = metaBuenoFiltrado.filter((campoBueno: any) => {
      const campoApp = metaAppFiltrado.find((c: any) => c.key === campoBueno.key)
      return campoApp && campoApp.value !== campoBueno.value
    })

    return NextResponse.json({
      success: true,
      pedidoBueno: {
        id: pedidoBueno.id,
        numero: pedidoBueno.number,
        meta_data_relacionado: metaBuenoFiltrado,
      },
      pedidoApp: {
        id: pedidoApp.id,
        numero: pedidoApp.number,
        meta_data_relacionado: metaAppFiltrado,
      },
      analisis: {
        camposFaltantes: camposFaltantes.length > 0 ? camposFaltantes : 'Ninguno',
        camposDiferentes: camposDiferentes.length > 0 ? camposDiferentes.map((c: any) => ({
          key: c.key,
          valorBueno: c.value,
          valorApp: metaAppFiltrado.find((m: any) => m.key === c.key)?.value,
        })) : 'Ninguno',
      },
      todosLosCamposBueno: metaBueno,
      todosLosCamposApp: metaApp,
    })
  } catch (error) {
    console.error('[Comparar Pedidos] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al comparar pedidos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
