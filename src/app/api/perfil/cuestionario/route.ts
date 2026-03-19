// src/app/api/perfil/cuestionario/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'
import { evaluarNivel } from '@/lib/beneficios'
import { evaluarLogros } from '@/lib/logros'

export const dynamic = 'force-dynamic'

const FUENTES_VALIDAS = ['Amigos', 'Instagram', 'Google Maps', 'Vi luz y entré']

// POST /api/perfil/cuestionario - Completar cuestionario opcional (cumpleaños + fuente conocimiento)
export async function POST(req: NextRequest) {
    try {
        const clienteId = await verificarToken(req)
        if (!clienteId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await req.json()
        const { fechaCumpleanos, fuenteConocimiento } = body

        // Validaciones
        if (fechaCumpleanos) {
            const fecha = new Date(fechaCumpleanos)
            if (isNaN(fecha.getTime())) {
                return NextResponse.json(
                    { error: 'Fecha de cumpleaños inválida' },
                    { status: 400 }
                )
            }

            // Verificar si el cliente ya tiene una fecha de cumpleaños establecida
            const clienteActual = await prisma.cliente.findUnique({
                where: { id: clienteId },
                select: { fechaCumpleanos: true }
            })

            if (clienteActual?.fechaCumpleanos) {
                return NextResponse.json(
                    { error: 'La fecha de cumpleaños no puede ser modificada una vez establecida' },
                    { status: 403 }
                )
            }
        }

        if (fuenteConocimiento && !FUENTES_VALIDAS.includes(fuenteConocimiento)) {
            return NextResponse.json(
                {
                    error: `Fuente de conocimiento inválida. Opciones: ${FUENTES_VALIDAS.join(', ')}`,
                },
                { status: 400 }
            )
        }

        // Actualizar perfil del cliente
        const cliente = await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                fechaCumpleanos: fechaCumpleanos ? new Date(fechaCumpleanos) : undefined,
                fuenteConocimiento: fuenteConocimiento || undefined,
            },
            include: {
                nivel: true,
            },
        })

        // BONUS: Registrar visita extra contabilizada como recompensa
        const localPrincipal = await prisma.local.findFirst({
            where: {
                tipo: 'cafeteria',
                activo: true
            }
        })
        if (localPrincipal) {
            await prisma.eventoScan.create({
                data: {
                    timestamp: getDatetimeArgentina(), // ✅ Fix Bug #9: Timezone Argentina
                    clienteId,
                    localId: localPrincipal.id,
                    tipoEvento: 'VISITA',
                    metodoValidacion: 'BONUS_CUESTIONARIO', // Diferente de visitas reales
                    contabilizada: true, // SÍ cuenta para subir de nivel
                    notas: 'Visita bonus por completar cuestionario',
                },
            })

            // Evaluar nivel y logros después del bonus - evaluar nivel primero
            evaluarNivel(clienteId)
                .then(() => evaluarLogros(clienteId))
                .catch(console.error)
        }

        console.log(`[Cuestionario] Cliente ${clienteId} completó cuestionario y recibió visita extra`)

        return NextResponse.json({
            data: {
                nombre: cliente.nombre,
                fechaCumpleanos: cliente.fechaCumpleanos
                    ? new Date(cliente.fechaCumpleanos).toISOString().split('T')[0]
                    : null,
                fuenteConocimiento: cliente.fuenteConocimiento,
                nivel: cliente.nivel?.nombre || 'Bronce',
            },
            message: '¡Gracias! Completaste tu perfil y ganaste 1 visita extra 🎉',
        })
    } catch (error) {
        console.error('[POST /api/perfil/cuestionario] Error:', error)
        return NextResponse.json(
            { error: 'Error al guardar cuestionario' },
            { status: 500 }
        )
    }
}
