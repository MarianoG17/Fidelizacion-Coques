// src/app/api/admin/clientes/[id]/brevo-actividad/route.ts
// Consulta actividad de emails en Brevo para un contacto específico
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

const BREVO_BASE = 'https://api.brevo.com/v3'

// Prioridad para mostrar el estado más relevante de un mensaje
const PRIORIDAD_EVENTOS = ['spam', 'hardBounce', 'unsubscribed', 'clicks', 'opened', 'delivered', 'softBounce', 'deferred', 'blocked', 'request', 'invalid_email']

const EVENT_LABELS: Record<string, { label: string; icono: string; color: string }> = {
    delivered:     { label: 'Entregado',         icono: '📬', color: 'text-green-400' },
    opened:        { label: 'Abierto',           icono: '👀', color: 'text-blue-400' },
    clicks:        { label: 'Click en link',     icono: '🔗', color: 'text-purple-400' },
    softBounce:    { label: 'Rebote suave',       icono: '⚠️', color: 'text-yellow-400' },
    hardBounce:    { label: 'Rebote permanente', icono: '❌', color: 'text-red-400' },
    unsubscribed:  { label: 'Se dio de baja',    icono: '🚫', color: 'text-red-400' },
    spam:          { label: 'Marcado spam',      icono: '⛔', color: 'text-red-500' },
    blocked:       { label: 'Bloqueado',         icono: '🔒', color: 'text-slate-400' },
    request:       { label: 'Enviado',           icono: '📤', color: 'text-slate-300' },
    deferred:      { label: 'Diferido',          icono: '⏳', color: 'text-yellow-300' },
    invalid_email: { label: 'Email inválido',    icono: '❓', color: 'text-red-400' },
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

    const cliente = await prisma.cliente.findUnique({
        where: { id: params.id },
        select: { email: true },
    })

    if (!cliente?.email) {
        return NextResponse.json({ actividad: [], sinEmail: true })
    }

    const headers = {
        'api-key': process.env.BREVO_API_KEY,
        'Accept': 'application/json',
    }

    try {
        // Endpoint correcto: devuelve eventos individuales por email del destinatario
        const url = `${BREVO_BASE}/smtp/statistics/events?email=${encodeURIComponent(cliente.email)}&limit=100&sort=desc`
        const res = await fetch(url, { headers })

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}))
            console.error('[Brevo actividad] API error:', res.status, errBody)
            return NextResponse.json({
                error: `Brevo devolvió ${res.status}: ${errBody.message || res.statusText}`,
            }, { status: 502 })
        }

        const data = await res.json()
        // Respuesta: { events: [{ email, date, subject, messageId, event, tag, ip, link, from, templateId }] }
        const rawEvents: any[] = data.events ?? []

        // Agrupar por messageId para mostrar un item por email enviado
        const byMessage = new Map<string, { asunto: string; fecha: string; eventos: { event: string; date: string; link?: string }[] }>()

        for (const ev of rawEvents) {
            const mid = ev.messageId || ev.date  // fallback a fecha si no hay messageId
            if (!byMessage.has(mid)) {
                byMessage.set(mid, { asunto: ev.subject || '(sin asunto)', fecha: ev.date, eventos: [] })
            }
            byMessage.get(mid)!.eventos.push({ event: ev.event, date: ev.date, link: ev.link })
        }

        // Normalizar a formato de respuesta
        const actividad = Array.from(byMessage.entries()).map(([messageId, msg]) => {
            // Estado más relevante del mensaje
            const eventoTop = PRIORIDAD_EVENTOS
                .map(p => msg.eventos.find(e => e.event === p))
                .find(Boolean)

            return {
                tipo: 'transaccional',
                messageId,
                asunto: msg.asunto,
                fecha: msg.fecha,
                evento: eventoTop?.event ?? 'request',
                eventoFecha: eventoTop?.date ?? msg.fecha,
                link: eventoTop?.link ?? null,
                todosEventos: msg.eventos.map(e => ({ name: e.event, time: e.date })),
            }
        })

        // Ordenar por fecha desc (el agrupado puede perder el orden)
        actividad.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

        return NextResponse.json({
            email: cliente.email,
            actividad,
            labels: EVENT_LABELS,
            total: actividad.length,
        })
    } catch (error) {
        console.error('[Brevo actividad] Error:', error)
        return NextResponse.json({ error: 'Error consultando Brevo' }, { status: 500 })
    }
}
