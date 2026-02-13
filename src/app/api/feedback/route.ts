// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarToken } from '@/lib/auth'

// POST /api/feedback - Enviar feedback
export async function POST(req: NextRequest) {
    try {
        const clienteId = await verificarToken(req)
        if (!clienteId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { calificacion, comentario, eventoScanId } = await req.json()

        // Validar calificación (1-5)
        if (!calificacion || calificacion < 1 || calificacion > 5) {
            return NextResponse.json({ error: 'Calificación inválida (1-5)' }, { status: 400 })
        }

        // Obtener el local desde eventoScanId si existe
        let localId = null
        if (eventoScanId) {
            const evento = await prisma.eventoScan.findUnique({
                where: { id: eventoScanId },
                select: { localId: true },
            })
            localId = evento?.localId
        }

        // Si no hay eventoScanId, usar el primer local (por defecto Coques)
        if (!localId) {
            const local = await prisma.local.findFirst({
                where: { tipo: 'cafeteria' },
                select: { id: true },
            })
            localId = local?.id
        }

        if (!localId) {
            return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })
        }

        // Crear el feedback
        const feedback = await prisma.feedback.create({
            data: {
                clienteId,
                localId,
                eventoScanId,
                calificacion,
                comentario: comentario || null,
                enviadoGoogleMaps: false, // se marcará como true si el cliente hace click
            },
        })

        // Si la calificación es 4 o 5, devolver URL de Google Maps
        let googleMapsUrl = null
        if (calificacion >= 4) {
            googleMapsUrl = 'https://maps.app.goo.gl/9Djh6rCHD7jkzcqS6'
        }

        // Otorgar logro de feedback positivo si es primera vez
        if (calificacion >= 4) {
            const logroPrimeraCalificacion = await prisma.logro.findFirst({
                where: { tipo: 'FEEDBACK_POSITIVO' },
            })

            if (logroPrimeraCalificacion) {
                // Verificar si ya tiene este logro
                const yaObtenido = await prisma.logroCliente.findUnique({
                    where: {
                        clienteId_logroId: {
                            clienteId,
                            logroId: logroPrimeraCalificacion.id,
                        },
                    },
                })

                if (!yaObtenido) {
                    await prisma.logroCliente.create({
                        data: {
                            clienteId,
                            logroId: logroPrimeraCalificacion.id,
                            visto: false,
                        },
                    })
                }
            }
        }

        return NextResponse.json({
            data: {
                feedback: {
                    id: feedback.id,
                    calificacion: feedback.calificacion,
                },
                googleMapsUrl, // solo si calificación >= 4
                message: calificacion >= 4
                    ? '¡Gracias por tu calificación! Te invitamos a compartir tu experiencia en Google Maps'
                    : 'Gracias por tu feedback. Lo usaremos para mejorar nuestro servicio',
            },
        })
    } catch (error) {
        console.error('Error al crear feedback:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

// GET /api/feedback - Obtener historial de feedback del cliente
export async function GET(req: NextRequest) {
    try {
        const clienteId = await verificarToken(req)
        if (!clienteId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const feedbacks = await prisma.feedback.findMany({
            where: { clienteId },
            select: {
                id: true,
                calificacion: true,
                comentario: true,
                enviadoGoogleMaps: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20, // últimos 20 feedbacks
        })

        return NextResponse.json({ data: feedbacks })
    } catch (error) {
        console.error('Error al obtener feedbacks:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

// PATCH /api/feedback/[id] - Marcar como enviado a Google Maps
export async function PATCH(req: NextRequest) {
    try {
        const clienteId = await verificarToken(req)
        if (!clienteId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { feedbackId } = await req.json()

        // Verificar que el feedback pertenece al cliente
        const feedback = await prisma.feedback.findFirst({
            where: {
                id: feedbackId,
                clienteId,
            },
        })

        if (!feedback) {
            return NextResponse.json({ error: 'Feedback no encontrado' }, { status: 404 })
        }

        // Marcar como enviado a Google Maps
        await prisma.feedback.update({
            where: { id: feedbackId },
            data: { enviadoGoogleMaps: true },
        })

        return NextResponse.json({
            data: { success: true },
            message: '¡Gracias por dejarnos tu reseña en Google!'
        })
    } catch (error) {
        console.error('Error al actualizar feedback:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
