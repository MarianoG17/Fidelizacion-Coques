// src/app/api/admin/pedidos/detalle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { buildWooHeaders } from '@/lib/woocommerce-headers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  const wooId = new URL(req.url).searchParams.get('wooId')
  if (!wooId) return NextResponse.json({ error: 'wooId requerido' }, { status: 400 })

  const wooUrl = process.env.WOOCOMMERCE_URL
  const wooKey = process.env.WOOCOMMERCE_KEY
  const wooSecret = process.env.WOOCOMMERCE_SECRET
  if (!wooUrl || !wooKey || !wooSecret) {
    return NextResponse.json({ error: 'Credenciales WooCommerce no configuradas' }, { status: 500 })
  }

  try {
    const res = await fetch(`${wooUrl}/wp-json/wc/v3/orders/${wooId}`, {
      headers: buildWooHeaders(wooKey, wooSecret),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `WooCommerce devolvió ${res.status}` }, { status: res.status })
    }
    const order = await res.json()

    return NextResponse.json({
      id: order.id,
      status: order.status,
      dateCreated: order.date_created,
      dateCompleted: order.date_completed,
      total: order.total,
      currency: order.currency,
      billing: {
        firstName: order.billing?.first_name,
        lastName: order.billing?.last_name,
        phone: order.billing?.phone,
        email: order.billing?.email,
        address: [order.billing?.address_1, order.billing?.city].filter(Boolean).join(', '),
      },
      lineItems: (order.line_items ?? []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        subtotal: item.subtotal,
        total: item.total,
        sku: item.sku || null,
        metaData: (item.meta_data ?? [])
          .filter((m: any) => !m.key.startsWith('_'))
          .map((m: any) => ({ key: m.key, value: typeof m.value === 'string' ? m.value : JSON.stringify(m.value) })),
      })),
      shippingLines: (order.shipping_lines ?? []).map((s: any) => ({
        name: s.method_title,
        total: s.total,
      })),
      customerNote: order.customer_note || null,
      paymentMethod: order.payment_method_title || null,
    })
  } catch (e) {
    console.error('[pedidos/detalle] Error:', e)
    return NextResponse.json({ error: 'Error al obtener detalle de WooCommerce' }, { status: 500 })
  }
}
