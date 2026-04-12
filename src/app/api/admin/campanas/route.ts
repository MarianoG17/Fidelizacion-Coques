// src/app/api/admin/campanas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Segmento = 'todos' | 'bronce' | 'plata' | 'oro' | 'sin_nivel' | 'en_riesgo'

interface Destinatario {
    id: string
    nombre: string | null
    email: string | null
    nivel: string
    visitas: number
    proxNivel: string        // nombre del próximo nivel o 'Nivel máximo' (nunca niveles ocultos)
    visitasParaSubir: number // 0 si ya está en el máximo visible
    diasSinVisitar: number   // días desde la última visita
    beneficios: string       // descripción de beneficios del nivel actual
}

function aplicarVariables(texto: string, d: Destinatario): string {
    return texto
        .replace(/\{\{nombre\}\}/g, d.nombre?.split(' ')[0] || 'cliente')
        .replace(/\{\{nivel\}\}/g, d.nivel || 'Sin nivel')
        .replace(/\{\{visitas\}\}/g, String(d.visitas))
        .replace(/\{\{proximo_nivel\}\}/g, d.proxNivel)
        .replace(/\{\{visitas_para_subir\}\}/g, String(d.visitasParaSubir))
        .replace(/\{\{dias_sin_visitar\}\}/g, String(d.diasSinVisitar))
        .replace(/\{\{beneficios\}\}/g, d.beneficios)
}

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

async function enriquecerDestinatarios(
    clientes: { id: string; nombre: string | null; email: string | null; nivel: { nombre: string; orden: number; criterios: unknown; descripcionBeneficios: string | null } | null; _count: { eventos: number } }[],
    niveles: { nombre: string; orden: number; criterios: unknown; esOculto: boolean }[]
): Promise<Destinatario[]> {
    if (clientes.length === 0) return []

    const ahora = new Date()
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ids = clientes.map(c => c.id)

    // Visitas en últimos 30 días por cliente
    const visitasRecientesGrupo = await prisma.eventoScan.groupBy({
        by: ['clienteId'],
        where: { clienteId: { in: ids }, tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace30 } },
        _count: { clienteId: true },
    })
    const visitasRecientesMap = new Map(visitasRecientesGrupo.map(v => [v.clienteId, v._count.clienteId]))

    // Última visita por cliente
    const ultimasVisitas = await prisma.eventoScan.groupBy({
        by: ['clienteId'],
        where: { clienteId: { in: ids }, tipoEvento: 'VISITA', contabilizada: true },
        _max: { timestamp: true },
    })
    const ultimaVisitaMap = new Map(ultimasVisitas.map(v => [v.clienteId, v._max.timestamp]))

    return clientes.map(c => {
        const nivelesPublicos = niveles.filter(n => !n.esOculto)
        const nivelActual = nivelesPublicos.find(n => n.nombre === c.nivel?.nombre)
        const proxNivelObj = nivelActual ? nivelesPublicos.find(n => n.orden === nivelActual.orden + 1) : null
        const visitasRecientes = visitasRecientesMap.get(c.id) || 0
        const criteriosProx = proxNivelObj?.criterios as { visitas?: number } | null
        const visitasParaSubir = proxNivelObj
            ? Math.max(0, (criteriosProx?.visitas || 0) - visitasRecientes)
            : 0

        const ultimaVisita = ultimaVisitaMap.get(c.id)
        const diasSinVisitar = ultimaVisita
            ? Math.floor((ahora.getTime() - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24))
            : 0

        return {
            id: c.id,
            nombre: c.nombre,
            email: c.email,
            nivel: c.nivel?.nombre || 'Sin nivel',
            visitas: c._count.eventos,
            proxNivel: proxNivelObj?.nombre || 'Nivel máximo',
            visitasParaSubir,
            diasSinVisitar,
            beneficios: c.nivel?.descripcionBeneficios || '',
        }
    })
}

async function resolverDestinatarios(segmento: Segmento): Promise<Destinatario[]> {
    const ahora = new Date()
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
    const hace90 = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000)

    const [niveles, idsEnRiesgo] = await Promise.all([
        prisma.nivel.findMany({ orderBy: { orden: 'asc' }, select: { nombre: true, orden: true, criterios: true, esOculto: true, descripcionBeneficios: true } }),
        segmento === 'en_riesgo' ? (async () => {
            const recientes = await prisma.eventoScan.groupBy({
                by: ['clienteId'],
                where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace30 } },
            })
            const idsRecientes = new Set(recientes.map(r => r.clienteId))
            const anteriores = await prisma.eventoScan.groupBy({
                by: ['clienteId'],
                where: { tipoEvento: 'VISITA', contabilizada: true, timestamp: { gte: hace90, lt: hace30 } },
            })
            return anteriores.map(r => r.clienteId).filter(id => !idsRecientes.has(id))
        })() : Promise.resolve(undefined as string[] | undefined),
    ])

    const whereNivel =
        segmento === 'sin_nivel' ? { nivelId: null } :
        segmento === 'bronce' ? { nivel: { nombre: { equals: 'Bronce', mode: 'insensitive' as const } } } :
        segmento === 'plata' ? { nivel: { nombre: { equals: 'Plata', mode: 'insensitive' as const } } } :
        segmento === 'oro' ? { nivel: { nombre: { equals: 'Oro', mode: 'insensitive' as const } } } :
        {}

    const clientes = await prisma.cliente.findMany({
        where: {
            estado: 'ACTIVO',
            email: { not: null },
            ...(idsEnRiesgo ? { id: { in: idsEnRiesgo } } : {}),
            ...whereNivel,
        },
        select: {
            id: true,
            nombre: true,
            email: true,
            nivel: { select: { nombre: true, orden: true, criterios: true, descripcionBeneficios: true } },
            _count: { select: { eventos: { where: { tipoEvento: 'VISITA', contabilizada: true } } } },
        },
    })

    return enriquecerDestinatarios(clientes, niveles)
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

    if (testEmail) {
        const niveles = await prisma.nivel.findMany({ orderBy: { orden: 'asc' }, select: { nombre: true, orden: true, criterios: true, esOculto: true, descripcionBeneficios: true } })

        const clienteReal = await prisma.cliente.findUnique({
            where: { email: testEmail },
            select: {
                id: true,
                nombre: true,
                email: true,
                nivel: { select: { nombre: true, orden: true, criterios: true, descripcionBeneficios: true } },
                _count: { select: { eventos: { where: { tipoEvento: 'VISITA', contabilizada: true } } } },
            },
        })

        let datosTest: Destinatario
        if (clienteReal) {
            const enriquecidos = await enriquecerDestinatarios([clienteReal], niveles)
            datosTest = enriquecidos[0]
        } else {
            datosTest = { id: 'test', nombre: 'María', email: testEmail, nivel: 'Plata', visitas: 8, proxNivel: 'Oro', visitasParaSubir: 4, diasSinVisitar: 12, beneficios: '15% de descuento en tu próxima visita' }
        }

        const cuerpoPers = aplicarVariables(cuerpo, datosTest)
        const html = buildHtml(cuerpoPers)
        const resultado = await sendEmail({ to: testEmail, subject: `[PRUEBA] ${asunto}`, html })
        return NextResponse.json({
            ok: resultado.success,
            test: true,
            datosUsados: {
                nombre: datosTest.nombre?.split(' ')[0] || 'cliente',
                nivel: datosTest.nivel,
                visitas: datosTest.visitas,
                proximo_nivel: datosTest.proxNivel,
                visitas_para_subir: datosTest.visitasParaSubir,
                dias_sin_visitar: datosTest.diasSinVisitar,
                beneficios: datosTest.beneficios,
            },
            error: resultado.error,
        })
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

        const cuerpoPers = aplicarVariables(cuerpo, cliente)
        const html = buildHtml(cuerpoPers)

        const resultado = await sendEmail({ to: cliente.email, subject: asunto, html })
        if (resultado.success) {
            enviados++
        } else {
            errores++
            erroresList.push(cliente.email)
        }

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
