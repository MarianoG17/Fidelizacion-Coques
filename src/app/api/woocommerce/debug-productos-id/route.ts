// src/app/api/woocommerce/debug-productos-id/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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

    // IDs que estamos buscando
    const productosIds = [852, 853, 854, 855, 860]
    
    const resultados = []

    for (const id of productosIds) {
      try {
        const response = await fetch(
          `${wooUrl}/wp-json/wc/v3/products/${id}`,
          { headers }
        )

        if (response.ok) {
          const producto = await response.json()
          resultados.push({
            id: producto.id,
            nombre: producto.name,
            sku: producto.sku,
            precio: producto.price,
            status: producto.status,
            encontrado: true
          })
        } else {
          resultados.push({
            id: id,
            error: `Status ${response.status}`,
            encontrado: false
          })
        }
      } catch (error) {
        resultados.push({
          id: id,
          error: error instanceof Error ? error.message : 'Error desconocido',
          encontrado: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      resultados,
      resumen: {
        total: productosIds.length,
        encontrados: resultados.filter(r => r.encontrado).length,
        noEncontrados: resultados.filter(r => !r.encontrado).length
      }
    })

  } catch (error) {
    console.error('[Debug Productos ID] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error al buscar productos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
