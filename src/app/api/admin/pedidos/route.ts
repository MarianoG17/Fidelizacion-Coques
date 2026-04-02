// src/app/api/admin/pedidos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('clienteId')

  try {
    const pedidos = await prisma.eventoScan.findMany({
      where: {
        tipoEvento: 'PEDIDO_TORTA',
        ...(clienteId ? { clienteId } : {}),
      },
      select: {
        id: true,
        timestamp: true,
        notas: true,
        monto: true,
        clienteId: true,
        cliente: {
          select: {
            nombre: true,
            phone: true,
            nivel: { select: { nombre: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    })

    const data = pedidos.map(p => ({
      id: p.id,
      timestamp: p.timestamp.toISOString(),
      notas: p.notas,
      monto: p.monto ? Number(p.monto) : null,
      clienteId: p.clienteId,
      clienteNombre: p.cliente?.nombre ?? null,
      clientePhone: p.cliente?.phone ?? null,
      clienteNivel: p.cliente?.nivel?.nombre ?? null,
    }))

    const totalMonto = data.reduce((sum, p) => sum + (p.monto ?? 0), 0)

    return NextResponse.json({ data, total: data.length, totalMonto })
  } catch (error) {
    console.error('Error al obtener pedidos:', error)
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 })
  }
}
