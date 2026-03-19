// src/app/api/admin/eventos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        const { estado } = await req.json()
        const { id } = params

        const evento = await prisma.eventoEspecial.update({
            where: { id },
            data: { estado },
        })

        // Si se cancela, notificar a los inscriptos
        if (estado === 'CANCELADO') {
            const inscripciones = await prisma.inscripcion.findMany({
                where: { eventoId: id, estado: 'CONFIRMADA' },
                include: { cliente: true },
            })

            // Crear noticias para cada inscripto
            await Promise.all(
                inscripciones.map((inscripcion: any) =>
                    prisma.noticia.create({
                        data: {
                            clienteId: inscripcion.clienteId,
                            titulo: 'Evento cancelado',
                            cuerpo: `El evento "${evento.titulo}" fue cancelado. Disculpá las molestias.`,
                            tipo: 'ADVERTENCIA',
                        },
                    })
                )
            )
        }

        return NextResponse.json({ data: evento })
    } catch (error) {
        console.error('Error al actualizar evento:', error)
        return NextResponse.json(
            { error: 'Error al actualizar evento' },
            { status: 500 }
        )
    }
}
