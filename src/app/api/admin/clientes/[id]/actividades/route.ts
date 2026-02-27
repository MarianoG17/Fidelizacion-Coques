// src/app/api/admin/clientes/[id]/actividades/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const clienteId = params.id

  try {
    // Obtener datos completos del cliente incluyendo perfil
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        nombre: true,
        phone: true,
        email: true,
        fechaCumpleanos: true,
        fuenteConocimiento: true,
        authProvider: true,
        profileImage: true,
        createdAt: true,
      },
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Obtener todos los eventos del cliente
    const eventos = await prisma.eventoScan.findMany({
      where: { clienteId },
      select: {
        id: true,
        timestamp: true,
        tipoEvento: true,
        metodoValidacion: true,
        notas: true,
        contabilizada: true,
        local: {
          select: {
            nombre: true,
            tipo: true,
          },
        },
        beneficio: {
          select: {
            nombre: true,
            descripcionCaja: true,
          },
        },
        mesa: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // Calcular estadísticas
    const totalEventos = eventos.length
    
    // Visitas bonus: identificadas por la palabra "bonus" en las notas
    const visitasBonus = eventos.filter(
      (e) => e.tipoEvento === 'VISITA' && (e.notas?.toLowerCase().includes('bonus'))
    ).length
    
    // Visitas contabilizadas: solo visitas reales (excluir bonus)
    const visitasContabilizadas = eventos.filter(
      (e) => e.tipoEvento === 'VISITA' && e.contabilizada && !e.notas?.toLowerCase().includes('bonus')
    ).length
    const beneficiosAplicados = eventos.filter(
      (e) => e.tipoEvento === 'BENEFICIO_APLICADO'
    ).length

    return NextResponse.json({
      success: true,
      data: {
        cliente,
        eventos,
        estadisticas: {
          totalEventos,
          visitasContabilizadas,
          visitasBonus,
          beneficiosAplicados,
        },
      },
    })
  } catch (error) {
    console.error('Error al obtener actividades del cliente:', error)
    return NextResponse.json(
      { error: 'Error al obtener actividades' },
      { status: 500 }
    )
  }
}
