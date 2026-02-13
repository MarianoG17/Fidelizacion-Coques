// src/app/api/pass/beneficios-disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireClienteAuth, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        // Verificar autenticación del cliente
        const clientePayload = await requireClienteAuth(req)
        if (!clientePayload) {
            return unauthorized('Token no proporcionado o inválido')
        }

        // Obtener el cliente con su nivel y beneficios
        const cliente = await prisma.cliente.findUnique({
            where: { id: clientePayload.clienteId },
            include: {
                nivel: {
                    include: {
                        beneficios: {
                            include: {
                                beneficio: true,
                            },
                        },
                    },
                },
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

        // Obtener todos los beneficios del nivel del cliente
        const beneficiosNivel = cliente.nivel.beneficios.map((nb) => nb.beneficio)

        // Para cada beneficio, verificar cuántas veces lo usó hoy
        const beneficiosConUso = await Promise.all(
            beneficiosNivel
                .filter((b) => b.activo) // Solo beneficios activos
                .map(async (beneficio) => {
                    const condiciones = beneficio.condiciones as any

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
                    const disponible = maxPorDia === 0 || cantidadUsosHoy < maxPorDia

                    return {
                        id: beneficio.id,
                        nombre: beneficio.nombre,
                        tipo: condiciones?.tipo || 'OTRO',
                        descuento: condiciones?.descuento || null,
                        icono: condiciones?.icono || '🎁',
                        descripcion: condiciones?.descripcion || '',
                        maxPorDia,
                        usosHoy: cantidadUsosHoy,
                        disponible,
                        requiereEstadoExterno: beneficio.requiereEstadoExterno,
                        estadoExternoTrigger: beneficio.estadoExternoTrigger,
                    }
                })
        )

        // Separar beneficios disponibles y usados
        const disponibles = beneficiosConUso.filter((b) => b.disponible)
        const usados = beneficiosConUso.filter((b) => !b.disponible)

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
                        : 'Ya usaste todos tus beneficios de hoy. ¡Volvé mañana!',
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
