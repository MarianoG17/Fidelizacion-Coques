// src/app/api/feedback/email/route.ts
// Procesa encuestas de satisfacción enviadas por link de email (sin login)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFeedbackToken } from '@/lib/feedback-token'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const { token, calificacion, comentario } = await req.json()

        if (!token || !calificacion || calificacion < 1 || calificacion > 5) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
        }

        const payload = await verifyFeedbackToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 401 })
        }

        const { visitaId, clienteId } = payload

        // Devolver ok si ya existe feedback para esta visita (idempotente)
        const yaRespondido = await prisma.feedback.findFirst({
            where: { clienteId, eventoScanId: visitaId },
        })
        if (yaRespondido) {
            const config = await prisma.configuracionApp.findFirst({ select: { googleMapsUrl: true, feedbackMinEstrellas: true } })
            return NextResponse.json({
                ok: true,
                yaRespondido: true,
                googleMapsUrl: yaRespondido.calificacion >= (config?.feedbackMinEstrellas ?? 4)
                    ? (config?.googleMapsUrl ?? null) : null,
            })
        }

        // Obtener local desde la visita
        const visita = await prisma.eventoScan.findUnique({
            where: { id: visitaId },
            select: { localId: true, clienteId: true },
        })
        // Verificar que el token corresponde a este cliente
        if (visita?.clienteId && visita.clienteId !== clienteId) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }

        let localId = visita?.localId
        if (!localId) {
            const local = await prisma.local.findFirst({ where: { tipo: 'cafeteria' }, select: { id: true } })
            localId = local?.id
        }
        if (!localId) {
            return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })
        }

        const config = await prisma.configuracionApp.findFirst({
            select: { googleMapsUrl: true, feedbackMinEstrellas: true },
        })

        await prisma.feedback.create({
            data: {
                clienteId,
                localId,
                eventoScanId: visitaId,
                calificacion,
                comentario: comentario?.trim() || null,
                enviadoGoogleMaps: false,
            },
        })

        // Otorgar logro de primer feedback positivo si corresponde
        if (calificacion >= (config?.feedbackMinEstrellas ?? 4)) {
            const logro = await prisma.logro.findFirst({ where: { tipo: 'FEEDBACK_POSITIVO' } })
            if (logro) {
                const yaObtenido = await prisma.logroCliente.findUnique({
                    where: { clienteId_logroId: { clienteId, logroId: logro.id } },
                })
                if (!yaObtenido) {
                    await prisma.logroCliente.create({
                        data: { clienteId, logroId: logro.id, visto: false },
                    })
                }
            }
        }

        const minEstrellas = config?.feedbackMinEstrellas ?? 4
        return NextResponse.json({
            ok: true,
            googleMapsUrl: calificacion >= minEstrellas ? (config?.googleMapsUrl ?? null) : null,
        })
    } catch (error) {
        console.error('[Feedback Email] Error:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
