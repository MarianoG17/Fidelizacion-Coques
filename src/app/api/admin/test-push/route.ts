// src/app/api/admin/test-push/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/push'

export async function POST(req: NextRequest) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { telefono } = body

        // Si se especifica un teléfono, buscar solo ese cliente
        if (telefono) {
            const cliente = await prisma.cliente.findUnique({
                where: { phone: telefono },
                select: {
                    id: true,
                    nombre: true,
                    pushSub: true
                }
            })

            if (!cliente) {
                return NextResponse.json({
                    success: false,
                    message: `No se encontró cliente con teléfono ${telefono}`
                })
            }

            if (!cliente.pushSub) {
                return NextResponse.json({
                    success: false,
                    message: `El cliente ${cliente.nombre} no tiene notificaciones activadas`
                })
            }

            const success = await sendPushNotification(cliente.pushSub, {
                title: '🧪 Prueba de Notificación',
                body: `Hola ${cliente.nombre}! Esta es una notificación de prueba. ¡Todo funciona correctamente!`,
                url: '/pass',
                icon: '/icon-192x192.png'
            }, {
                clienteId: cliente.id,
                tipo: 'TEST'
            })

            return NextResponse.json({
                success,
                message: success
                    ? `✅ Notificación enviada a ${cliente.nombre}`
                    : `❌ Error al enviar a ${cliente.nombre}`
            })
        }

        // Si no se especifica teléfono, enviar a los primeros 5 (comportamiento original)
        const todosLosClientes = await prisma.cliente.findMany({
            select: {
                id: true,
                nombre: true,
                pushSub: true
            }
        })

        const clientes = todosLosClientes
            .filter(c => c.pushSub !== null)
            .slice(0, 5)

        if (clientes.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No hay clientes con notificaciones activadas. Activa las notificaciones en tu PWA primero.'
            })
        }

        let sent = 0
        for (const cliente of clientes) {
            const success = await sendPushNotification(cliente.pushSub, {
                title: '🧪 Prueba de Notificación',
                body: 'Esta es una notificación de prueba desde el panel admin. ¡Todo funciona correctamente!',
                url: '/pass',
                icon: '/icon-192x192.png'
            }, {
                clienteId: cliente.id,
                tipo: 'TEST'
            })

            if (success) sent++
        }

        return NextResponse.json({
            success: true,
            message: `Notificaciones enviadas a ${sent} de ${clientes.length} clientes con push activo`
        })
    } catch (error) {
        console.error('Error al enviar push de prueba:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Error al enviar notificación. Revisa los logs del servidor.'
            },
            { status: 500 }
        )
    }
}
