// src/app/api/woocommerce/debug-addons/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/debug-addons?producto=nombre-del-producto
 * Debug para ver los add-ons de un producto específico
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const productoNombre = searchParams.get('producto') || 'tarta de frutilla'

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

        // Buscar producto por nombre
        const searchResponse = await fetch(
            `${wooUrl}/wp-json/wc/v3/products?search=${encodeURIComponent(productoNombre)}&per_page=5`,
            { headers }
        )

        if (!searchResponse.ok) {
            return NextResponse.json(
                { error: 'No se pudo buscar el producto' },
                { status: searchResponse.status }
            )
        }

        const products = await searchResponse.json()

        if (products.length === 0) {
            return NextResponse.json({
                error: 'No se encontró el producto',
                busqueda: productoNombre
            })
        }

        // Obtener el primer producto encontrado
        const product = products[0]

        // Extraer todos los meta_data
        const metaData = product.meta_data || []

        // Buscar específicamente _product_addons
        const addonsMetaData = metaData.filter((meta: any) =>
            meta.key === '_product_addons'
        )

        // También buscar otras variaciones del key
        const allAddonsKeys = metaData.filter((meta: any) =>
            meta.key.toLowerCase().includes('addon') ||
            meta.key.toLowerCase().includes('add-on')
        )

        return NextResponse.json({
            success: true,
            producto: {
                id: product.id,
                nombre: product.name,
                tipo: product.type,
            },
            addonsEncontrados: {
                _product_addons: addonsMetaData,
                otrasKeys: allAddonsKeys
            },
            todoMetaData: metaData,
            cantidadMetaData: metaData.length
        }, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        })
    } catch (error) {
        console.error('[Debug Add-ons] Error:', error)
        return NextResponse.json(
            {
                error: 'Error al debuggear add-ons',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
