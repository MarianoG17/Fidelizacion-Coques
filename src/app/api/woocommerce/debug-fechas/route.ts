// src/app/api/woocommerce/debug-fechas/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/woocommerce/debug-fechas?orderId=123
 * Diagnosticar qué campos de fecha/hora están presentes en un pedido
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const orderId = searchParams.get('orderId')

        if (!orderId) {
            return NextResponse.json(
                { error: 'Se requiere orderId como parámetro' },
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
          'User-Agent': 'FidelizacionApp/1.0',
        }
    
        // Obtener detalles del pedido con timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
    
        const response = await fetch(
          `${wooUrl}/wp-json/wc/v3/orders/${orderId}`,
          {
            headers,
            signal: controller.signal,
          }
        )
    
        clearTimeout(timeoutId)

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

        // Filtrar campos de fecha/hora que nos interesan
        const camposFecha = [
            'e_deliverydate',
            '_e_deliverydate',
            'orddd_lite_delivery_date',
            '¿Para que fecha querés el pedido?',
        ]

        const camposHora = [
            'orddd_lite_time_slot',
            '¿En que horario?',
        ]

        const metadataFecha = order.meta_data?.filter((item: any) =>
            camposFecha.includes(item.key)
        ) || []

        const metadataHora = order.meta_data?.filter((item: any) =>
            camposHora.includes(item.key)
        ) || []

        // Información resumida
        const resumen = {
            pedidoId: order.id,
            pedidoNumero: order.number,
            fechaCreacion: order.date_created,
            estado: order.status,

            camposFechaEncontrados: metadataFecha.map((item: any) => ({
                key: item.key,
                value: item.value,
                id: item.id
            })),

            camposHoraEncontrados: metadataHora.map((item: any) => ({
                key: item.key,
                value: item.value,
                id: item.id
            })),

            todoElMetadata: order.meta_data?.map((item: any) => ({
                key: item.key,
                value: item.value,
                id: item.id
            })) || [],
        }

        return NextResponse.json({
            success: true,
            diagnostico: resumen,
            recomendacion: metadataFecha.length === 0 && metadataHora.length === 0
                ? '⚠️ No se encontraron campos de fecha/hora. Puede que WooCommerce no esté guardando estos campos o use nombres diferentes.'
                : `✅ Se encontraron ${metadataFecha.length} campos de fecha y ${metadataHora.length} campos de hora.`
        })
    } catch (error) {
        console.error('[Debug Fechas] Error:', error)
        return NextResponse.json(
            {
                error: 'Error al diagnosticar campos de fecha/hora',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
