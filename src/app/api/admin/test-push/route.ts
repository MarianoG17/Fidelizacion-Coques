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
        // Buscar un cliente con pushSub activa (el admin normalmente)
        const clientes = await prisma.cliente.findMany({
            where: {
                pushSub: { not: null }
            },
            select: {
                id: true,
                nombre: true,
                pushSub: true
            },
            take: 5 // Solo los primeros 5 con suscripción activa
        })

        if (clientes.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No hay clientes con notificaciones activadas. Activa las notificaciones en tu PWA primero.'
            })
        }

        // Enviar notificación de prueba a todos ellos
        let sent = 0
        for (const cliente of clientes) {
            const success = await sendPushNotification(cliente.pushSub, {
                title: '🧪 Prueba de Notificación',
                body: 'Esta es una notificación de prueba desde el panel admin. ¡Todo funciona correctamente!',
                url: '/pass',
                icon: '/icon-192x192.png'
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
