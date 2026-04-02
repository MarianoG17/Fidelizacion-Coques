// src/app/api/admin/sincronizar-pedidos-woo/route.ts
// Trae pedidos completados de WooCommerce y crea los que falten en EventoScan
// Complementa el webhook: cubre los casos en que el webhook no se disparó
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { buildWooHeaders } from '@/lib/woocommerce-headers'
import { normalizarTelefono } from '@/lib/phone'
import { evaluarNivel } from '@/lib/beneficios'

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

  // Obtener local de cafetería una vez
  const local = await prisma.local.findFirst({ where: { tipo: 'cafeteria' } })
  if (!local) {
    return NextResponse.json({ error: 'Local de cafetería no encontrado' }, { status: 500 })
  }

  // Traer pedidos completados de WooCommerce (últimas 2 páginas de 50 = 100 pedidos recientes)
  const PAGES = 2
  const PER_PAGE = 50
  const allOrders: any[] = []

  for (let page = 1; page <= PAGES; page++) {
    try {
      const res = await fetch(
        `${wooUrl}/wp-json/wc/v3/orders?status=completed&per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc`,
        { headers }
      )
      if (!res.ok) break
      const orders = await res.json()
      if (!orders.length) break
      allOrders.push(...orders)
    } catch (e) {
      console.error('[sincronizar-pedidos-woo] Error fetching page', page, e)
      break
    }
  }

  if (allOrders.length === 0) {
    return NextResponse.json({ message: 'No se encontraron pedidos completados en WooCommerce', creados: 0, omitidos: 0 })
  }

  // Obtener IDs de pedidos WooCommerce ya registrados en EventoScan
  const wooIdsEnDB = new Set(
    (await prisma.eventoScan.findMany({
      where: { tipoEvento: 'PEDIDO_TORTA', notas: { startsWith: 'Pedido WooCommerce #' } },
      select: { notas: true },
    })).map(e => e.notas?.replace('Pedido WooCommerce #', '').trim())
  )

  let creados = 0
  let omitidos = 0
  let sinCliente = 0
  const detalle: Array<{ wooId: number; cliente: string; fecha: string; monto: number | null }> = []

  for (const order of allOrders) {
    const wooIdStr = String(order.id)

    // Ya está registrado
    if (wooIdsEnDB.has(wooIdStr)) {
      omitidos++
      continue
    }

    // Buscar cliente por teléfono o email
    const phoneNormalizado = normalizarTelefono(order.billing?.phone ?? '')
    let cliente = phoneNormalizado
      ? await prisma.cliente.findUnique({ where: { phone: phoneNormalizado } })
      : null

    if (!cliente && order.billing?.email) {
      cliente = await prisma.cliente.findUnique({ where: { email: order.billing.email } })
    }

    if (!cliente) {
      sinCliente++
      continue
    }

    // Fecha y monto
    const fechaRaw = order.date_completed || order.date_created
    const fechaPedido = new Date(
      fechaRaw.includes('Z') || fechaRaw.includes('+') ? fechaRaw : fechaRaw + 'Z'
    )
    const monto = order.total ? parseFloat(order.total) : undefined

    // Crear EventoScan
    await prisma.eventoScan.create({
      data: {
        timestamp: fechaPedido,
        clienteId: cliente.id,
        localId: local.id,
        tipoEvento: 'PEDIDO_TORTA',
        metodoValidacion: 'QR',
        contabilizada: true,
        notas: `Pedido WooCommerce #${order.id}`,
        ...(monto ? { monto } : {}),
      },
    })

    await evaluarNivel(cliente.id)

    detalle.push({ wooId: order.id, cliente: cliente.nombre ?? '', fecha: fechaPedido.toISOString(), monto: monto ?? null })
    creados++
  }

  return NextResponse.json({
    success: true,
    pedidosWoo: allOrders.length,
    creados,
    omitidos,
    sinCliente,
    detalle,
  })
}
