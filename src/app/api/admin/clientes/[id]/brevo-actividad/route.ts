// src/app/api/admin/clientes/[id]/brevo-actividad/route.ts
// Consulta actividad de emails en Brevo para un contacto específico
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

const BREVO_BASE = 'https://api.brevo.com/v3'

const EVENT_LABELS: Record<string, { label: string; icono: string; color: string }> = {
    delivered:    { label: 'Entregado',        icono: '📬', color: 'text-green-400' },
    opened:       { label: 'Abierto',          icono: '👀', color: 'text-blue-400' },
    clicks:       { label: 'Click en link',    icono: '🔗', color: 'text-purple-400' },
    click:        { label: 'Click en link',    icono: '🔗', color: 'text-purple-400' },
    softBounce:   { label: 'Rebote suave',     icono: '⚠️', color: 'text-yellow-400' },
    hardBounce:   { label: 'Rebote permanente',icono: '❌', color: 'text-red-400' },
    unsubscribed: { label: 'Se dio de baja',   icono: '🚫', color: 'text-red-400' },
    spam:         { label: 'Marcado como spam',icono: '⛔', color: 'text-red-500' },
    blocked:      { label: 'Bloqueado',        icono: '🔒', color: 'text-slate-400' },
    request:      { label: 'Enviado',          icono: '📤', color: 'text-slate-300' },
    deferred:     { label: 'Diferido',         icono: '⏳', color: 'text-yellow-300' },
    invalid_email:{ label: 'Email inválido',   icono: '❓', color: 'text-red-400' },
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    if (!process.env.BREVO_API_KEY) {
        return NextResponse.json({ error: 'BREVO_API_KEY no configurada' }, { status: 503 })
    }

    // Obtener email del cliente
    const cliente = await prisma.cliente.findUnique({
        where: { id: params.id },
        select: { email: true, nombre: true },
    })

    if (!cliente?.email) {
        return NextResponse.json({ actividad: [], sinEmail: true })
    }

    const headers = {
        'api-key': process.env.BREVO_API_KEY,
        'Accept': 'application/json',
    }

    try {
        // 1. Emails transaccionales (bienvenida, reactivación, feedback, etc.)
        const urlTransac = `${BREVO_BASE}/smtp/statistics/contacts/${encodeURIComponent(cliente.email)}?limit=50`
        const resTransac = await fetch(urlTransac, { headers })
        const dataTransac = resTransac.ok ? await resTransac.json() : null

        // 2. Campañas enviadas al contacto
        const urlCampanas = `${BREVO_BASE}/contacts/${encodeURIComponent(cliente.email)}/campaignStats`
        const resCampanas = await fetch(urlCampanas, { headers })
        const dataCampanas = resCampanas.ok ? await resCampanas.json() : null

        // Normalizar eventos transaccionales
        const eventosTransac: any[] = []
        for (const msg of dataTransac?.messagesSent ?? []) {
            // El evento más relevante por mensaje (el de mayor prioridad)
            const prioridad = ['spam','hardBounce','unsubscribed','clicks','click','opened','delivered','softBounce','deferred','blocked','request']
            const eventoTop = prioridad
                .map(p => (msg.events ?? []).find((e: any) => e.name === p))
                .find(Boolean)

            eventosTransac.push({
                tipo: 'transaccional',
                messageId: msg.messageId,
                asunto: msg.subject || '(sin asunto)',
                fecha: msg.date,
                evento: eventoTop?.name ?? 'request',
                eventoFecha: eventoTop?.time ?? msg.date,
                link: eventoTop?.link ?? null,
                // Todos los eventos del mensaje para referencia
                todosEventos: (msg.events ?? []).map((e: any) => ({ name: e.name, time: e.time })),
            })
        }

        // Normalizar campañas
        const eventosCampanas: any[] = []
        for (const stat of dataCampanas?.messagesSent ?? []) {
            const prioridad = ['spam','hardBounce','unsubscribed','clicks','click','opened','delivered','softBounce','deferred','blocked','request']
            const eventoTop = prioridad
                .map(p => (stat.events ?? []).find((e: any) => e.name === p))
                .find(Boolean)

            eventosCampanas.push({
                tipo: 'campana',
                messageId: stat.messageId,
                asunto: stat.subject || '(campaña)',
                fecha: stat.date,
                evento: eventoTop?.name ?? 'request',
                eventoFecha: eventoTop?.time ?? stat.date,
                todosEventos: (stat.events ?? []).map((e: any) => ({ name: e.name, time: e.time })),
            })
        }

        // Unir y ordenar por fecha desc
        const actividad = [...eventosTransac, ...eventosCampanas].sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )

        return NextResponse.json({
            email: cliente.email,
            actividad,
            labels: EVENT_LABELS,
            raw: {
                transaccionales: dataTransac?.messagesSent?.length ?? 0,
                campanas: dataCampanas?.messagesSent?.length ?? 0,
            },
        })
    } catch (error) {
        console.error('[Brevo actividad] Error:', error)
        return NextResponse.json({ error: 'Error consultando Brevo' }, { status: 500 })
    }
}
