// src/app/api/perfil/cuestionario/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'

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
        await prisma.eventoScan.create({
            data: {
                clienteId,
                localId: process.env.LOCAL_ID!, // Usar el local principal
                tipoEvento: 'VISITA',
                metodo: 'OTP_MANUAL',
                contabilizada: true,
                descripcion: 'Visita bonus por completar cuestionario',
            },
        })

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
