// src/app/api/jobs/inactividad/route.ts
// Cron job diario — ejecutado por Vercel Cron o llamada externa
// Configura en vercel.json:
// { "crons": [{ "path": "/api/jobs/inactividad", "schedule": "0 3 * * *" }] }

import { NextRequest, NextResponse } from 'next/server'
import { getHaceNDias } from '@/lib/timezone'
import { prisma } from '@/lib/prisma'

const DIAS_INACTIVIDAD = 90
const JOB_SECRET = process.env.JOB_SECRET || 'dev-job-secret'

export async function POST(req: NextRequest) {
  // Verificar que es una llamada autorizada (Vercel Cron o manual)
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${JOB_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Usar timezone Argentina — ver APRENDIZAJES.md sección 1
  const fechaLimite = getHaceNDias(DIAS_INACTIVIDAD)

  try {
    // Buscar clientes activos que no tuvieron eventos en los últimos 90 días
    const clientesInactivos = await prisma.cliente.findMany({
      where: {
        estado: 'ACTIVO',
        nivel: { orden: { gt: 1 } }, // Solo los que tienen nivel > Bronce
        eventos: {
          none: { timestamp: { gte: fechaLimite } },
        },
      },
      include: { nivel: true },
    })

    let bajados = 0

    for (const cliente of clientesInactivos) {
      const nivelActual = cliente.nivel
      if (!nivelActual || nivelActual.orden <= 1) continue

      // Buscar el nivel inmediatamente inferior
      const nivelInferior = await prisma.nivel.findFirst({
        where: { orden: nivelActual.orden - 1 },
      })
      if (!nivelInferior) continue

      await prisma.$transaction(async (tx) => {
        await tx.cliente.update({
          where: { id: cliente.id },
          data: { nivelId: nivelInferior.id },
        })

        // Noticia informando el cambio
        await tx.noticia.create({
          data: {
            clienteId: cliente.id,
            titulo: `Tu nivel cambió a ${nivelInferior.nombre}`,
            cuerpo: `Por inactividad de más de ${DIAS_INACTIVIDAD} días, bajaste a ${nivelInferior.nombre}. ¡Volvé a visitarnos para recuperar tu nivel!`,
            tipo: 'NIVEL',
          },
        })
      })

      bajados++
    }

    console.log(`[JOB inactividad] Procesados: ${clientesInactivos.length}, bajados: ${bajados}`)

    return NextResponse.json({
      procesados: clientesInactivos.length,
      bajados,
      fechaEjecucion: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[JOB inactividad]', error)
    return NextResponse.json({ error: 'Error en el job' }, { status: 500 })
  }
}
