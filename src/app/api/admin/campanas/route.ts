// src/app/api/admin/campanas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Segmento = 'todos' | 'bronce' | 'plata' | 'oro' | 'sin_nivel' | 'en_riesgo'

function buildHtml(cuerpoPers: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f8f8f8; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e; padding:32px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:24px; font-weight:700;">Coques Bakery</h1>
      <p style="color:#94a3b8; margin:8px 0 0; font-size:14px;">Programa de Fidelización</p>
    </div>
    <div style="padding:32px; color:#1e293b; font-size:15px; line-height:1.7;">
      ${cuerpoPers.replace(/\n/g, '<br>')}
    </div>
    <div style="background:#f1f5f9; padding:20px; text-align:center; border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8; font-size:12px; margin:0;">
        Recibís este email porque sos parte del programa de puntos de Coques Bakery.<br>
        <a href="https://coques.com.ar" style="color:#6366f1;">coques.com.ar</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

async function resolverDestinatarios(segmento: Segmento) {
    const ahora = new Date()
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
    const hace90 = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000)

    if (segmento === 'en_riesgo') {
        const recientes = await prisma.eventoScan.groupBy({
            by: ['clienteId'],
            where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace30 } },
        })
        const idsRecientes = recientes.map(r => r.clienteId)

        const anteriores = await prisma.eventoScan.groupBy({
            by: ['clienteId'],
            where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace90, lt: hace30 } },
        })
        const idsEnRiesgo = anteriores.map(r => r.clienteId).filter(id => !idsRecientes.includes(id))

        return prisma.cliente.findMany({
            where: { id: { in: idsEnRiesgo }, estado: 'ACTIVO', email: { not: null } },
            select: { id: true, nombre: true, email: true },
        })
    }

    const whereNivel =
        segmento === 'sin_nivel' ? { nivelId: null } :
        segmento === 'bronce' ? { nivel: { nombre: { equals: 'Bronce', mode: 'insensitive' as const } } } :
        segmento === 'plata' ? { nivel: { nombre: { equals: 'Plata', mode: 'insensitive' as const } } } :
        segmento === 'oro' ? { nivel: { nombre: { equals: 'Oro', mode: 'insensitive' as const } } } :
        {}

    return prisma.cliente.findMany({
        where: { estado: 'ACTIVO', email: { not: null }, ...whereNivel },
        select: { id: true, nombre: true, email: true },
    })
}

// GET — preview: cuántos destinatarios tendría el segmento
export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    const segmento = (req.nextUrl.searchParams.get('segmento') || 'todos') as Segmento
    const destinatarios = await resolverDestinatarios(segmento)

    return NextResponse.json({
        count: destinatarios.length,
        destinatarios: destinatarios.slice(0, 5),
    })
}

// POST — enviar campaña (o test si se pasa testEmail)
export async function POST(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    const { segmento, asunto, cuerpo, testEmail } = await req.json()
    if (!asunto || !cuerpo) {
        return NextResponse.json({ error: 'Faltan campos: asunto, cuerpo' }, { status: 400 })
    }

    // Modo test: enviar solo al email indicado
    if (testEmail) {
        const cuerpoPers = cuerpo.replace(/\{\{nombre\}\}/g, 'vos (prueba)')
        const html = buildHtml(cuerpoPers)
        const resultado = await sendEmail({ to: testEmail, subject: `[PRUEBA] ${asunto}`, html })
        return NextResponse.json({ ok: resultado.success, test: true, error: resultado.error })
    }

    if (!segmento) {
        return NextResponse.json({ error: 'Falta campo: segmento' }, { status: 400 })
    }

    const destinatarios = await resolverDestinatarios(segmento as Segmento)
    if (destinatarios.length === 0) {
        return NextResponse.json({ error: 'No hay destinatarios para ese segmento' }, { status: 400 })
    }

    let enviados = 0
    let errores = 0
    const erroresList: string[] = []

    for (const cliente of destinatarios) {
        if (!cliente.email) continue

        const nombrePersonalizado = cliente.nombre?.split(' ')[0] || 'cliente'
        const cuerpoPers = cuerpo.replace(/\{\{nombre\}\}/g, nombrePersonalizado)
        const html = buildHtml(cuerpoPers)

        const resultado = await sendEmail({ to: cliente.email, subject: asunto, html })
        if (resultado.success) {
            enviados++
        } else {
            errores++
            erroresList.push(cliente.email)
        }

        // Pequeña pausa para no saturar la API de Brevo
        await new Promise(r => setTimeout(r, 100))
    }

    return NextResponse.json({
        ok: true,
        enviados,
        errores,
        total: destinatarios.length,
        erroresList: erroresList.slice(0, 10),
    })
}