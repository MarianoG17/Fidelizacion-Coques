// src/app/api/admin/comunicaciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

// Plantillas por defecto (se usan si la DB no tiene la plantilla aún)
const DEFAULTS: Record<string, { nombre: string; asunto: string; cuerpo: string; variables: string[] }> = {
    bienvenida: {
        nombre: 'Bienvenida',
        asunto: '¡Bienvenido a Coques Bakery! 🎉',
        cuerpo: `Hola {{nombre}},

¡Gracias por registrarte en nuestro programa de fidelización! 🎉

Acumulá visitas y subí de nivel (Bronce → Plata → Oro), desbloqueá beneficios exclusivos y mostrá tu QR en el local para sumar puntos con cada visita.

🎁 Como regalo de bienvenida, en tu primer pedido de tortas por la web tenés un 10% de descuento automático.

📲 Para instalar la app en tu celular:
Android: Abrí en Chrome → menú ⋮ → "Agregar a pantalla de inicio"
iPhone: Abrí en Safari → botón compartir → "Agregar a pantalla de inicio"

¡Esperamos verte pronto!`,
        variables: ['{{nombre}}'],
    },
    reactivacion: {
        nombre: 'Te extrañamos',
        asunto: '¡{{nombre}}, te extrañamos en Coques Bakery! ☕',
        cuerpo: `Hola {{nombre}},

Hace un tiempo que no te vemos por acá y lo extrañamos 🥐☕

Pasate cuando quieras — tus puntos te están esperando y seguís sumando beneficios con cada visita.

¡Acordate de mostrar tu QR al llegar para sumar la visita! 📱

¡Esperamos verte pronto!`,
        variables: ['{{nombre}}'],
    },
    cumpleanos_7dias: {
        nombre: 'Aviso de cumpleaños (7 días antes)',
        asunto: '{{nombre}}, ¡tu semana de cumple arranca en 7 días! 🎂',
        cuerpo: `Hola {{nombre}},

Dentro de una semana es tu cumpleaños y en Coques lo queremos celebrar con vos. 🎂

🎁 TU BENEFICIO DE CUMPLEAÑOS
Durante los días anteriores y posteriores a tu cumpleaños tenés activo un beneficio especial exclusivo para vos.

No hace falta que hagas nada: cuando venís al local en esos días, el equipo lo aplica automáticamente. Solo avisá que es tu semana de cumple.

¿No podés venir? Recordá que cada compra por nuestra web suma como 3 visitas al programa.

¡Que sea una semana increíble!`,
        variables: ['{{nombre}}'],
    },
}

// GET — devuelve todas las plantillas (DB o defaults)
export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    const ids = Object.keys(DEFAULTS)
    const rows = await prisma.plantillaEmail.findMany({ where: { id: { in: ids } } })
    const map = new Map(rows.map(r => [r.id, r]))

    const plantillas = ids.map(id => {
        const def = DEFAULTS[id]
        const row = map.get(id)
        return {
            id,
            nombre: row?.nombre ?? def.nombre,
            asunto: row?.asunto ?? def.asunto,
            cuerpo: row?.cuerpo ?? def.cuerpo,
            activa: row?.activa ?? true,
            variables: def.variables,
            updatedAt: row?.updatedAt ?? null,
            esDefault: !row,
        }
    })

    return NextResponse.json({ plantillas })
}

// DELETE — restaura una plantilla a su default (borra la row del DB)
export async function DELETE(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    const id = req.nextUrl.searchParams.get('id')
    if (!id || !(id in DEFAULTS)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    await prisma.plantillaEmail.deleteMany({ where: { id } })
    return NextResponse.json({ ok: true })
}

// PATCH — guarda cambios de una plantilla
export async function PATCH(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    const { id, asunto, cuerpo, activa } = await req.json()
    if (!id || !(id in DEFAULTS)) {
        return NextResponse.json({ error: 'ID de plantilla inválido' }, { status: 400 })
    }
    if (!asunto?.trim() || !cuerpo?.trim()) {
        return NextResponse.json({ error: 'Faltan asunto o cuerpo' }, { status: 400 })
    }

    const def = DEFAULTS[id]
    const plantilla = await prisma.plantillaEmail.upsert({
        where: { id },
        create: {
            id,
            nombre: def.nombre,
            asunto: asunto.trim(),
            cuerpo: cuerpo.trim(),
            activa: activa ?? true,
            variables: def.variables,
        },
        update: {
            asunto: asunto.trim(),
            cuerpo: cuerpo.trim(),
            ...(activa !== undefined && { activa }),
        },
    })

    return NextResponse.json({ ok: true, plantilla })
}
