// src/app/api/clientes/validar-qr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBeneficiosActivos } from '@/lib/beneficios'
import { ESTADO_AUTO_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

// POST /api/clientes/validar-qr
// Valida el QR de identificación del cliente y devuelve su información
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { qrData } = body

    if (!qrData) {
      return NextResponse.json(
        { error: 'QR data requerido' },
        { status: 400 }
      )
    }

    // Parsear el QR data
    let parsedData
    try {
      parsedData = JSON.parse(qrData)
    } catch {
      return NextResponse.json(
        { error: 'QR inválido' },
        { status: 400 }
      )
    }

    // Validar que sea un QR de cliente fidelización
    if (parsedData.type !== 'cliente_fidelizacion' || !parsedData.clienteId) {
      return NextResponse.json(
        { error: 'QR no es de cliente fidelización' },
        { status: 400 }
      )
    }

    // Buscar el cliente con sus autos
    const cliente = await prisma.cliente.findUnique({
      where: {
        id: parsedData.clienteId,
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

    // Obtener beneficios activos
    const beneficios = await getBeneficiosActivos(cliente.id)

    // Filtrar beneficios canjeables en mostrador (excluir los de "solo-app")
    const beneficiosCanjeables = beneficios.filter((b: any) => {
      const condiciones = b.condiciones as any
      // Excluir beneficios marcados como soloApp (ej: descuentos de tortas que se aplican automáticamente)
      return !condiciones?.soloApp
    })

    // Retornar información del cliente
    return NextResponse.json({
      data: {
        id: cliente.id,
        nombre: cliente.nombre || 'Cliente',
        phone: cliente.phone,
        nivel: cliente.nivel
          ? {
              nombre: cliente.nivel.nombre,
              orden: cliente.nivel.orden
            }
          : null,
        beneficiosActivos: beneficiosCanjeables.map((b: any) => ({
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
    console.error('[POST /api/clientes/validar-qr]', error)
    return NextResponse.json(
      { error: 'Error al validar QR' },
      { status: 500 }
    )
  }
}
