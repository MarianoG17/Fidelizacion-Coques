// src/app/api/pass/beneficios-disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, unauthorized } from '@/lib/auth'
import { getBeneficiosActivos } from '@/lib/beneficios'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        // Verificar autenticación del cliente
        const clientePayload = await requireClienteAuth(req)
        if (!clientePayload) {
            return unauthorized('Token no proporcionado o inválido')
        }

        // Obtener el cliente con su nivel
        const cliente = await prisma.cliente.findUnique({
            where: { id: clientePayload.clienteId },
            include: {
                nivel: true,
            },
        })

        if (!cliente) {
            return NextResponse.json(
                { error: 'Cliente no encontrado' },
                { status: 404 }
            )
        }

        if (!cliente.nivel) {
            return NextResponse.json({
                data: {
                    nivel: null,
                    beneficios: [],
                    disponibles: [],
                    usados: [],
                    totalBeneficios: 0,
                    mensaje: 'Aún no tenés un nivel asignado. ¡Visitanos para empezar!',
                },
            })
        }

        // Obtener la fecha actual en Argentina
        const hoy = new Date()
        const fechaArgentina = new Date(
            hoy.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
        )
        const fechaHoyStr = fechaArgentina.toISOString().split('T')[0]

        // Usar la misma lógica que el staff scanner para consistencia
        const beneficiosActivos = await getBeneficiosActivos(clientePayload.clienteId)

        // Obtener todos los beneficios del nivel (incluyendo los no disponibles)
        const nivelId = cliente.nivel!.id
        const todosLosBeneficios = await prisma.beneficio.findMany({
            where: {
                activo: true,
                niveles: {
                    some: { nivelId },
                },
            },
        })

        const beneficioIds = todosLosBeneficios.map(b => b.id)

        // ── Batch: usosHoy para TODOS los beneficios en una sola query ──────────
        const usosHoyResult = await prisma.$queryRaw<Array<{ beneficioId: string, count: bigint }>>`
          SELECT "beneficioId", COUNT(*) as count
          FROM "EventoScan"
          WHERE "clienteId" = ${clientePayload.clienteId}
            AND "beneficioId" = ANY(${beneficioIds}::text[])
            AND DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires') = ${fechaHoyStr}::date
          GROUP BY "beneficioId"
        `
        const usosHoyMap = new Map(usosHoyResult.map(r => [r.beneficioId, Number(r.count)]))

        // ── Batch: usosTotal para beneficios de usoUnico en una sola query ──────
        const beneficiosUnicoIds = todosLosBeneficios
            .filter(b => (b.condiciones as any)?.usoUnico)
            .map(b => b.id)

        let usosUnicoMap = new Map<string, number>()
        if (beneficiosUnicoIds.length > 0) {
            const usosUnicoResult = await prisma.$queryRaw<Array<{ beneficioId: string, count: bigint }>>`
              SELECT "beneficioId", COUNT(*) as count
              FROM "EventoScan"
              WHERE "clienteId" = ${clientePayload.clienteId}
                AND "beneficioId" = ANY(${beneficiosUnicoIds}::text[])
              GROUP BY "beneficioId"
            `
            usosUnicoMap = new Map(usosUnicoResult.map(r => [r.beneficioId, Number(r.count)]))
        }

        // ── Batch: estado de autos (una sola query si algún beneficio lo requiere) ─
        const hayBeneficiosConEstado = todosLosBeneficios.some(b => b.requiereEstadoExterno)
        let clienteConAutos: any = null
        if (hayBeneficiosConEstado) {
            clienteConAutos = await prisma.cliente.findUnique({
                where: { id: clientePayload.clienteId },
                include: {
                    autos: {
                        include: { estadoActual: true }
                    }
                }
            })
        }

        // ── Calcular hora de reset para el mensaje ────────────────────────────────
        const ahoraArg = fechaArgentina
        const minutosParaMedianoche =
            (23 - ahoraArg.getHours()) * 60 + (60 - ahoraArg.getMinutes()) - 1
        const horasRestantes = Math.floor(minutosParaMedianoche / 60)
        const minRestantes = minutosParaMedianoche % 60
        const tiempoRestante = horasRestantes > 0
            ? `en ${horasRestantes}h ${minRestantes}m`
            : `en ${minRestantes} min`

        // ── Mapear beneficios sin queries adicionales ─────────────────────────────
        const beneficiosConUso = todosLosBeneficios.map((beneficio) => {
            const condiciones = beneficio.condiciones as any

            const estaDisponible = beneficiosActivos.some((b: any) => b.id === beneficio.id)
            const cantidadUsosHoy = usosHoyMap.get(beneficio.id) || 0
            const maxPorDia = condiciones?.maxPorDia || 0
            const yaUsado = condiciones?.usoUnico ? (usosUnicoMap.get(beneficio.id) || 0) > 0 : false

            let expirado = false
            let tieneEstadoRequerido = false

            if (beneficio.requiereEstadoExterno && clienteConAutos) {
                tieneEstadoRequerido = clienteConAutos.autos?.some(
                    (auto: any) => auto.estadoActual?.estado === beneficio.estadoExternoTrigger
                ) || false

                if (tieneEstadoRequerido && !estaDisponible && cantidadUsosHoy === 0) {
                    if (beneficio.id === 'beneficio-20porciento-lavadero') {
                        const ahora = new Date()
                        const cierreHoy = new Date(ahora)
                        cierreHoy.setHours(19, 0, 0, 0)
                        expirado = ahora > cierreHoy
                    }
                }
            }

            return {
                id: beneficio.id,
                nombre: beneficio.nombre,
                tipo: condiciones?.tipo || 'OTRO',
                descuento: condiciones?.descuento || null,
                icono: condiciones?.icono || '🎁',
                descripcion: condiciones?.descripcion || '',
                maxPorDia,
                usosHoy: cantidadUsosHoy,
                disponible: estaDisponible && !yaUsado,
                requiereEstadoExterno: beneficio.requiereEstadoExterno,
                estadoExternoTrigger: beneficio.estadoExternoTrigger,
                yaUsado,
                expirado,
                tieneEstadoRequerido,
            }
        })

        // Separar beneficios disponibles y usados
        const disponibles = beneficiosConUso.filter((b) => b.disponible)

        const usados = beneficiosConUso.filter((b) =>
            !b.disponible &&
            (
                b.usosHoy > 0 ||
                b.expirado ||
                (!b.requiereEstadoExterno && b.maxPorDia > 0 && b.usosHoy >= b.maxPorDia)
            )
        )

        return NextResponse.json({
            data: {
                nivel: {
                    id: cliente.nivel.id,
                    nombre: cliente.nivel.nombre,
                    orden: cliente.nivel.orden,
                },
                beneficios: beneficiosConUso,
                disponibles,
                usados,
                totalBeneficios: beneficiosConUso.length,
                mensaje:
                    disponibles.length > 0
                        ? 'Mostrá tu QR al staff para aplicar tus beneficios'
                        : usados.length > 0
                            ? `Ya usaste todos tus beneficios de hoy. ¡Volvé ${tiempoRestante}!`
                            : 'No hay beneficios disponibles en este momento.',
            },
        })
    } catch (error) {
        console.error('Error al obtener beneficios disponibles:', error)
        return NextResponse.json(
            { error: 'Error al obtener beneficios disponibles' },
            { status: 500 }
        )
    }
}
