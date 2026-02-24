// src/app/api/jobs/sincronizar-deltawash/route.ts
/**
 * Job: Sincronizar estados de autos desde DeltaWash Legacy a Fidelización
 * 
 * Propósito:
 * - Leer estados de autos desde DELTAWASH_DATABASE_URL (solo lectura)
 * - Crear/actualizar registros en EstadoAuto de DATABASE_URL
 * - Permitir que los beneficios automáticos funcionen correctamente
 * 
 * Configuración:
 * - Ejecutar cada 5 minutos via cron de Vercel
 * - Requiere DELTAWASH_DATABASE_URL configurada
 * 
 * Seguridad:
 * - Solo lectura en DeltaWash
 * - Requiere CRON_SECRET para ejecutar
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { triggerBeneficiosPorEstado } from '@/lib/beneficios'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 segundos máximo

// Cliente de DeltaWash (lazy initialization)
function getDeltaWashDB() {
  if (!process.env.DELTAWASH_DATABASE_URL) {
    return null
  }
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DELTAWASH_DATABASE_URL,
      },
    },
  }) as any
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación del cron job
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que DeltaWash esté configurado
    const deltaWashDB = getDeltaWashDB()
    if (!deltaWashDB) {
      return NextResponse.json({
        error: 'DELTAWASH_DATABASE_URL no configurada',
        sincronizados: 0
      }, { status: 200 })
    }

    console.log('[Sync DeltaWash] Iniciando sincronización...')

    // 1. Obtener todos los autos EN PROCESO o LISTO desde DeltaWash
    const autosEnDeltaWash = await deltaWashDB.$queryRaw<any[]>`
      SELECT
        c.phone as "clientePhone",
        e.patente,
        e.estado,
        e."updatedAt",
        e.notas
      FROM "estado" e
      JOIN "Cliente" c ON c.id = e."clienteId"
      WHERE LOWER(e.estado) IN ('en proceso', 'listo')
        AND e.patente IS NOT NULL
        AND e.patente != ''
      ORDER BY e."updatedAt" DESC
    `

    console.log(`[Sync DeltaWash] Encontrados ${autosEnDeltaWash.length} autos activos en DeltaWash`)

    let sincronizados = 0
    let errores = 0
    const beneficiosActivados: string[] = []

    // 2. Para cada auto en DeltaWash, sincronizar con Fidelización
    for (const autoDW of autosEnDeltaWash) {
      try {
        // Normalizar patente
        const patenteNormalizada = autoDW.patente
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')

        // Normalizar estado: "en proceso" → "EN_PROCESO", "listo" → "LISTO"
        const estadoNormalizado = autoDW.estado.toLowerCase() === 'en proceso'
          ? 'EN_PROCESO'
          : autoDW.estado.toLowerCase() === 'listo'
            ? 'LISTO'
            : 'ENTREGADO'

        // Buscar cliente en Fidelización por teléfono
        const cliente = await prisma.cliente.findUnique({
          where: { phone: autoDW.clientePhone },
          include: {
            autos: {
              where: { patente: patenteNormalizada },
            },
          },
        })

        if (!cliente) {
          console.log(`[Sync DeltaWash] Cliente ${autoDW.clientePhone} no encontrado en Fidelización`)
          continue
        }

        // Buscar o crear el auto
        let auto = cliente.autos[0]

        if (!auto) {
          // Crear auto en Fidelización
          auto = await prisma.auto.create({
            data: {
              clienteId: cliente.id,
              patente: patenteNormalizada,
              activo: true,
            },
          })
          console.log(`[Sync DeltaWash] Auto ${patenteNormalizada} creado en Fidelización`)
        }

        // Verificar estado actual
        const estadoActual = await prisma.estadoAuto.findUnique({
          where: { autoId: auto.id },
        })

        const estadoCambio = !estadoActual || estadoActual.estado !== estadoNormalizado

        // Crear o actualizar estado
        await prisma.estadoAuto.upsert({
          where: { autoId: auto.id },
          update: {
            estado: estadoNormalizado,
            notas: autoDW.notas || undefined,
            updatedAt: new Date(),
          },
          create: {
            autoId: auto.id,
            estado: estadoNormalizado,
            notas: autoDW.notas || null,
            localOrigenId: (await prisma.local.findFirst({ where: { tipo: 'lavadero' } }))?.id || '',
          },
        })

        sincronizados++

        // Si el estado cambió a EN_PROCESO, disparar beneficios
        if (estadoCambio && estadoNormalizado === 'EN_PROCESO') {
          const beneficios = await triggerBeneficiosPorEstado(cliente.id, 'EN_PROCESO')
          if (beneficios.length > 0) {
            beneficiosActivados.push(`${cliente.nombre || cliente.phone}: ${beneficios[0].nombre}`)
            console.log(`[Sync DeltaWash] ✅ Beneficio activado para ${cliente.phone}`)
          }
        }

      } catch (error: any) {
        console.error(`[Sync DeltaWash] Error procesando auto ${autoDW.patente}:`, error.message)
        errores++
      }
    }

    // 3. Marcar autos como ENTREGADO si ya no están en DeltaWash
    const autosActivosEnFidelizacion = await prisma.estadoAuto.findMany({
      where: {
        estado: { in: ['EN_PROCESO', 'LISTO'] },
      },
      include: {
        auto: {
          include: {
            cliente: true,
          },
        },
      },
    })

    const patentesEnDeltaWash = new Set(
      autosEnDeltaWash.map((a: any) => a.patente.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    )

    let marcadosEntregados = 0

    for (const estadoAuto of autosActivosEnFidelizacion) {
      if (!patentesEnDeltaWash.has(estadoAuto.auto.patente)) {
        // Auto ya no está en DeltaWash → marcar como entregado
        await prisma.estadoAuto.update({
          where: { id: estadoAuto.id },
          data: {
            estado: 'ENTREGADO',
            updatedAt: new Date(),
          },
        })
        marcadosEntregados++
        console.log(`[Sync DeltaWash] Auto ${estadoAuto.auto.patente} marcado como ENTREGADO`)
      }
    }

    const resultado = {
      success: true,
      timestamp: new Date().toISOString(),
      estadisticas: {
        autosEnDeltaWash: autosEnDeltaWash.length,
        sincronizados,
        errores,
        marcadosEntregados,
        beneficiosActivados: beneficiosActivados.length,
      },
      beneficiosActivados,
    }

    console.log('[Sync DeltaWash] Sincronización completada:', resultado.estadisticas)

    return NextResponse.json(resultado)

  } catch (error: any) {
    console.error('[Sync DeltaWash] Error fatal:', error)
    return NextResponse.json(
      {
        error: 'Error en sincronización',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
