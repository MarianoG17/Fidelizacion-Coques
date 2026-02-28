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
        // Nota: Ya validamos que cliente.nivel existe arriba
        const nivelId = cliente.nivel!.id
        const todosLosBeneficios = await prisma.beneficio.findMany({
            where: {
                activo: true,
                niveles: {
                    some: {
                        nivelId,
                    },
                },
            },
        })

        // Para cada beneficio, verificar cuántas veces lo usó hoy
        const beneficiosConUso = await Promise.all(
            todosLosBeneficios.map(async (beneficio) => {
                const condiciones = beneficio.condiciones as any

                // Verificar si está en la lista de activos (disponibles)
                const estaDisponible = beneficiosActivos.some((b: any) => b.id === beneficio.id)

                // Contar usos hoy
                const usosHoy = await prisma.$queryRaw<Array<{ count: bigint }>>`
                  SELECT COUNT(*) as count
                  FROM "EventoScan"
                  WHERE "clienteId" = ${clientePayload.clienteId}
                    AND "beneficioId" = ${beneficio.id}
                    AND DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires') = ${fechaHoyStr}::date
                `

                const cantidadUsosHoy = Number(usosHoy[0]?.count || 0)
                const maxPorDia = condiciones?.maxPorDia || 0

                // Verificar si ya fue usado (para beneficios de uso único)
                let yaUsado = false
                if (condiciones?.usoUnico) {
                    const usosTotal = await prisma.eventoScan.count({
                        where: {
                            clienteId: clientePayload.clienteId,
                            beneficioId: beneficio.id,
                        },
                    })
                    yaUsado = usosTotal > 0
                }

                // Detectar si el beneficio expiró por tiempo (ej: lavadero después de 19:00)
                // Solo se considera "expirado" si el cliente tiene/tuvo el estado necesario
                let expirado = false
                let tieneEstadoRequerido = false

                if (beneficio.requiereEstadoExterno) {
                    // Verificar si el cliente tiene el estado requerido actualmente
                    const clienteConAutos = await prisma.cliente.findUnique({
                        where: { id: clientePayload.clienteId },
                        include: {
                            autos: {
                                include: {
                                    estadoActual: true
                                }
                            }
                        }
                    })

                    tieneEstadoRequerido = clienteConAutos?.autos?.some(
                        (auto: any) => auto.estadoActual?.estado === beneficio.estadoExternoTrigger
                    ) || false

                    // Solo verificar expiración si tiene el estado requerido pero no está disponible
                    if (tieneEstadoRequerido && !estaDisponible && cantidadUsosHoy === 0) {
                        // Verificar específicamente el beneficio del lavadero
                        if (beneficio.id === 'beneficio-20porciento-lavadero') {
                            const ahora = new Date()
                            const cierreHoy = new Date(ahora)
                            cierreHoy.setHours(19, 0, 0, 0) // 19:00 Argentina
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
                    yaUsado, // Para mostrar al usuario si es de uso único
                    expirado, // Para distinguir "expirado por tiempo" vs "usado hoy"
                    tieneEstadoRequerido, // Para determinar si debe mostrarse
                }
            })
        )

        // Separar beneficios disponibles y usados
        const disponibles = beneficiosConUso.filter((b) => b.disponible)

        // Mostrar en "usados" SOLO si:
        // 1. Se usó HOY (usosHoy > 0) - incluye beneficios de uso único usados hoy
        // 2. Está expirado HOY por tiempo (expirado === true)
        // 3. Alcanzó límite diario HOY (!requiereEstadoExterno && usosHoy >= maxPorDia)
        //
        // IMPORTANTE: Beneficios de uso único solo aparecen el DÍA que se usaron,
        // no en días posteriores (eliminamos b.yaUsado de la condición)
        const usados = beneficiosConUso.filter((b) =>
            !b.disponible &&
            (
                b.usosHoy > 0 ||  // Se usó hoy (cubre uso único y recurrentes)
                b.expirado ||     // Expiró hoy por tiempo
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
                            ? 'Ya usaste todos tus beneficios de hoy. ¡Volvé mañana!'
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
