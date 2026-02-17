// src/app/api/admin/reevaluar-niveles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluarNivel } from '@/lib/beneficios'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/reevaluar-niveles
 * Re-evalúa los niveles de TODOS los clientes activos
 * Útil después de correcciones de bugs o cambios en la lógica de niveles
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación de admin
    const adminKey = req.headers.get('x-admin-key')
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('[Admin] Iniciando re-evaluación masiva de niveles...')

    // Obtener todos los clientes activos
    const clientes = await prisma.cliente.findMany({
      where: {
        estado: 'ACTIVO',
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        nivel: {
          select: {
            nombre: true,
            orden: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log(`[Admin] Encontrados ${clientes.length} clientes activos`)

    const resultados = []
    let cambios = 0
    let errores = 0

    // Re-evaluar cada cliente
    for (const cliente of clientes) {
      try {
        const nivelAnterior = cliente.nivel?.nombre || 'Sin nivel'
        const ordenAnterior = cliente.nivel?.orden || 0

        // Evaluar nivel (puede retornar el nuevo nivel si cambió)
        const nuevoNivel = await evaluarNivel(cliente.id)

        if (nuevoNivel && nuevoNivel.orden !== ordenAnterior) {
          cambios++
          resultados.push({
            clienteId: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            nivelAnterior,
            nivelNuevo: nuevoNivel.nombre,
            cambio: true,
          })
          console.log(`[Admin] ✅ ${cliente.nombre} ${cliente.apellido}: ${nivelAnterior} → ${nuevoNivel.nombre}`)
        } else {
          resultados.push({
            clienteId: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            nivelActual: nivelAnterior,
            cambio: false,
          })
        }
      } catch (error) {
        errores++
        console.error(`[Admin] ❌ Error evaluando cliente ${cliente.nombre} ${cliente.apellido}:`, error)
        resultados.push({
          clienteId: cliente.id,
          nombre: `${cliente.nombre} ${cliente.apellido}`,
          error: error instanceof Error ? error.message : 'Error desconocido',
        })
      }
    }

    console.log(`[Admin] Re-evaluación completada: ${cambios} cambios, ${errores} errores de ${clientes.length} clientes`)

    return NextResponse.json({
      success: true,
      message: `Re-evaluación completada: ${cambios} clientes cambiaron de nivel`,
      estadisticas: {
        totalClientes: clientes.length,
        cambiosDeNivel: cambios,
        sinCambios: clientes.length - cambios - errores,
        errores,
      },
      resultados,
    })
  } catch (error) {
    console.error('[Admin] Error en re-evaluación masiva:', error)
    return NextResponse.json(
      {
        error: 'Error al re-evaluar niveles',
        detalle: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
