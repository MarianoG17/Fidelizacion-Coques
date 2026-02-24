// src/app/api/clientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLocalAuth, unauthorized } from '@/lib/auth'
import { getBeneficiosActivos } from '@/lib/beneficios'
import { ESTADO_AUTO_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/clientes/[id]
// Obtiene los datos actualizados de un cliente (requiere autenticación local)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const local = await requireLocalAuth(req)
    if (!local) return unauthorized('API Key de local inválida')

    const clienteId = params.id

    // Buscar el cliente con sus autos
    const cliente = await prisma.cliente.findUnique({
      where: {
        id: clienteId,
        estado: 'ACTIVO'
      },
      include: {
        nivel: true,
        autos: {
          where: { activo: true },
          include: { estadoActual: true },
        },
      },
    }) as any

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado o inactivo' },
        { status: 404 }
      )
    }

    // Obtener beneficios activos actualizados
    const beneficios = await getBeneficiosActivos(cliente.id)

    // Retornar información del cliente
    return NextResponse.json({
      data: {
        id: cliente.id,
        nombre: cliente.nombre || 'Cliente',
        phone: cliente.phone,
        nivel: cliente.nivel?.nombre || null,
        beneficiosActivos: beneficios.map((b: any) => ({
          id: b!.id,
          nombre: b!.nombre,
          descripcionCaja: b!.descripcionCaja,
          requiereEstadoExterno: b!.requiereEstadoExterno,
          condiciones: b!.condiciones,
        })),
        autos: cliente.autos.map((auto: any) => ({
          id: auto.id,
          patente: auto.patente,
          marca: auto.marca,
          modelo: auto.modelo,
          alias: auto.alias,
          estadoActual: auto.estadoActual
            ? {
                estado: auto.estadoActual.estado,
                label: ESTADO_AUTO_LABELS[auto.estadoActual.estado as keyof typeof ESTADO_AUTO_LABELS],
                updatedAt: auto.estadoActual.updatedAt.toISOString(),
              }
            : null,
        })),
        createdAt: cliente.createdAt.toISOString(),
        lastVisit: cliente.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[GET /api/clientes/[id]]', error)
    return NextResponse.json(
      { error: 'Error al obtener cliente' },
      { status: 500 }
    )
  }
}
