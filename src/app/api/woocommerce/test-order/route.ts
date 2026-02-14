// src/app/api/woocommerce/test-order/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/woocommerce/test-order
 * Prueba de creación de pedido en WooCommerce
 * 
 * Body esperado:
 * {
 *   clienteEmail: string,
 *   clienteNombre: string,
 *   clienteTelefono: string,
 *   productoId: number,
 *   cantidad: number
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const wooUrl = process.env.WOOCOMMERCE_URL
        const wooKey = process.env.WOOCOMMERCE_KEY
        const wooSecret = process.env.WOOCOMMERCE_SECRET

        if (!wooUrl || !wooKey || !wooSecret) {
            return NextResponse.json(
                {
                    error: 'Credenciales de WooCommerce no configuradas',
                    missing: {
                        url: !wooUrl,
                        key: !wooKey,
                        secret: !wooSecret
                    }
                },
                { status: 500 }
            )
        }

        const body = await req.json()
        const { clienteEmail, clienteNombre, clienteTelefono, productoId, cantidad = 1 } = body

        if (!clienteEmail || !productoId) {
            return NextResponse.json(
                { error: 'Se requiere clienteEmail y productoId' },
                { status: 400 }
            )
        }

        // Crear autenticación básica
        const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')

        // Estructura del pedido para WooCommerce
        const orderData = {
            payment_method: 'cod', // Cash on delivery (efectivo contra entrega)
            payment_method_title: 'Pago en efectivo',
            set_paid: false, // No marcar como pagado aún
            billing: {
                first_name: clienteNombre || 'Cliente',
                email: clienteEmail,
                phone: clienteTelefono || '',
            },
            line_items: [
                {
                    product_id: productoId,
                    quantity: cantidad,
                },
            ],
            customer_note: 'Pedido realizado desde la App de Fidelización',
        }

        console.log('[WooCommerce Test Order] Creando pedido:', JSON.stringify(orderData, null, 2))

        // Crear pedido en WooCommerce
        const response = await fetch(
            `${wooUrl}/wp-json/wc/v3/orders`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[WooCommerce Test Order] Error:', response.status, errorText)
            return NextResponse.json(
                {
                    error: 'Error al crear pedido en WooCommerce',
                    status: response.status,
                    details: errorText
                },
                { status: response.status }
            )
        }

        const order = await response.json()

        console.log(`[WooCommerce Test Order] Pedido creado: ${order.id}`)

        // Formatear respuesta
        const formatted = {
            id: order.id,
            numero: order.number,
            estado: order.status,
            total: order.total,
            moneda: order.currency,
            fechaCreacion: order.date_created,
            cliente: {
                nombre: order.billing?.first_name || '',
                email: order.billing?.email || '',
                telefono: order.billing?.phone || '',
            },
            items: order.line_items?.map((item: any) => ({
                productoId: item.product_id,
                nombre: item.name,
                cantidad: item.quantity,
                precio: item.price,
                total: item.total,
            })) || [],
            urlAdmin: `${wooUrl}/wp-admin/post.php?post=${order.id}&action=edit`,
        }

        return NextResponse.json({
            success: true,
            message: 'Pedido creado exitosamente en WooCommerce',
            order: formatted,
            raw: order, // incluir datos completos para debugging
        })
    } catch (error) {
        console.error('[WooCommerce Test Order] Error:', error)
        return NextResponse.json(
            {
                error: 'Error al crear pedido en WooCommerce',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
