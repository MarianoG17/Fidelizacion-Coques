// src/app/api/admin/reparar-fechas-woo/route.ts
// Endpoint de uso único: corrige timestamps de PEDIDO_TORTA importados masivamente
// (que quedaron con la fecha de importación en vez de la fecha real del pedido en WooCommerce)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { buildWooHeaders } from '@/lib/woocommerce-headers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  const wooUrl = process.env.WOOCOMMERCE_URL
  const wooKey = process.env.WOOCOMMERCE_KEY
  const wooSecret = process.env.WOOCOMMERCE_SECRET
  if (!wooUrl || !wooKey || !wooSecret) {
    return NextResponse.json({ error: 'Credenciales WooCommerce no configuradas' }, { status: 500 })
  }
  const headers = buildWooHeaders(wooKey, wooSecret)

  // Buscar todos los PEDIDO_TORTA con notas que tengan número de pedido WooCommerce
  const eventos = await prisma.eventoScan.findMany({
    where: {
      tipoEvento: 'PEDIDO_TORTA',
      notas: { startsWith: 'Pedido WooCommerce #' },
    },
    select: { id: true, timestamp: true, notas: true },
  })

  if (eventos.length === 0) {
    return NextResponse.json({ message: 'No hay eventos PEDIDO_TORTA para reparar', actualizados: 0 })
  }

  // Extraer IDs únicos de WooCommerce
  const wooIds = eventos
    .map(e => e.notas?.replace('Pedido WooCommerce #', '').trim())
    .filter(Boolean) as string[]

  // Fetch en batches de 20 pedidos a WooCommerce
  const BATCH = 20
  const pedidosWoo: Record<string, { fecha: string; monto: number | null }> = {}

  for (let i = 0; i < wooIds.length; i += BATCH) {
    const batch = wooIds.slice(i, i + BATCH)
    try {
      const res = await fetch(
        `${wooUrl}/wp-json/wc/v3/orders?include=${batch.join(',')}&per_page=${BATCH}`,
        { headers }
      )
      if (!res.ok) {
        console.error(`[reparar-fechas-woo] Error WooCommerce batch ${i}: ${res.status}`)
        continue
      }
      const orders: any[] = await res.json()
      for (const order of orders) {
        const fechaRaw = order.date_completed || order.date_created
        if (fechaRaw) {
          pedidosWoo[String(order.id)] = {
            fecha: fechaRaw.includes('Z') || fechaRaw.includes('+') ? fechaRaw : fechaRaw + 'Z',
            monto: order.total ? parseFloat(order.total) : null,
          }
        }
      }
    } catch (e) {
      console.error(`[reparar-fechas-woo] Error fetching batch:`, e)
    }
  }

  // Actualizar cada evento con fecha y monto reales
  let actualizados = 0
  let noEncontrados = 0
  const detalle: { id: string; wooId: string; fechaAntes: string; fechaDespues: string; monto: number | null }[] = []

  for (const evento of eventos) {
    const wooId = evento.notas?.replace('Pedido WooCommerce #', '').trim()
    if (!wooId || !pedidosWoo[wooId]) {
      noEncontrados++
      continue
    }

    const { fecha, monto } = pedidosWoo[wooId]
    const nuevaFecha = new Date(fecha)
    await prisma.eventoScan.update({
      where: { id: evento.id },
      data: { timestamp: nuevaFecha, ...(monto !== null ? { monto } : {}) },
    })

    detalle.push({
      id: evento.id,
      wooId,
      fechaAntes: evento.timestamp.toISOString(),
      fechaDespues: nuevaFecha.toISOString(),
      monto,
    })
    actualizados++
  }

  return NextResponse.json({
    success: true,
    total: eventos.length,
    actualizados,
    noEncontrados,
    detalle,
  })
}
