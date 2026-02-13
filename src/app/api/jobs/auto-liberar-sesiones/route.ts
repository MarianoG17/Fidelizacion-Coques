import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/jobs/auto-liberar-sesiones
// Este endpoint debe ser llamado por un cron job externo (ej: Vercel Cron, GitHub Actions)
export async function GET(req: NextRequest) {
  try {
    // Los cron jobs de Vercel ya están autenticados automáticamente
    // No necesitamos validación adicional
    
    const ahora = new Date()
    const hace60Min = new Date(ahora.getTime() - 60 * 60 * 1000)

    // Buscar sesiones activas con más de 60 minutos
    const sesionesExpiradas = await prisma.sesionMesa.findMany({
      where: {
        activa: true,
        inicioSesion: {
          lt: hace60Min,
        },
      },
    })

    // Cerrar cada sesión
    const resultados = await Promise.all(
      sesionesExpiradas.map(async (sesion) => {
        const duracion = Math.floor(
          (ahora.getTime() - sesion.inicioSesion.getTime()) / 60000
        )

        return prisma.sesionMesa.update({
          where: { id: sesion.id },
          data: {
            activa: false,
            finSesion: ahora,
            cerradaPor: 'TIMEOUT',
            duracionMinutos: duracion,
          },
        })
      })
    )

    return NextResponse.json({
      mensaje: `${resultados.length} sesiones liberadas por timeout`,
      sesionesLiberadas: resultados.length,
    })
  } catch (error) {
    console.error('[GET /api/jobs/auto-liberar-sesiones]', error)
    return NextResponse.json(
      { error: 'Error en job de auto-liberación' },
      { status: 500 }
    )
  }
}
