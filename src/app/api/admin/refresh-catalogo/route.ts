// src/app/api/admin/refresh-catalogo/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/refresh-catalogo
 * Fuerza un refresco del catálogo desde WooCommerce y actualiza el cache en Neon.
 * Requiere x-admin-key header.
 */
export async function POST(req: NextRequest) {
    const adminKey = req.headers.get('x-admin-key')
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.coques.com.ar'
        const res = await fetch(`${appUrl}/api/woocommerce/tortas?refresh=1`, {
            method: 'GET',
            cache: 'no-store',
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return NextResponse.json(
                { error: 'Error al refrescar catálogo', details: err },
                { status: res.status }
            )
        }

        const data = await res.json()
        return NextResponse.json({
            success: true,
            message: `Catálogo actualizado: ${data.count} productos`,
        })
    } catch (error) {
        return NextResponse.json(
            { error: 'Error al refrescar catálogo', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        )
    }
}
