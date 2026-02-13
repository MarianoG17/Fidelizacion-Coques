/**
 * API: Consultar estado de autos en DeltaWash Legacy (SOLO LECTURA)
 *
 * Integración en tiempo real con la base de DeltaWash (Neon)
 * para mostrar el estado de autos en proceso de lavado.
 *
 * GET /api/deltawash/estado-auto
 * Requiere: Authorization: Bearer <jwt>
 *
 * IMPORTANTE: Esta integración es SOLO de LECTURA.
 * NO modifica, inserta ni elimina datos en la base DeltaWash.
 *
 * SEGURIDAD: El teléfono se obtiene del JWT del usuario autenticado.
 * Cada usuario solo puede ver el estado de SUS propios autos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireClienteAuth, unauthorized } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Función para obtener cliente DeltaWash (lazy initialization)
function getDeltaWashDB() {
    if (!process.env.DELTAWASH_DATABASE_URL) {
        return null;
    }
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DELTAWASH_DATABASE_URL,
            },
        },
    }) as any;
}

interface AutoEnLavadero {
    patente: string;
    marca?: string;
    modelo?: string;
    estado: string;
    updatedAt: Date;
    localOrigenId?: string;
    notas?: string;
}

export async function GET(req: NextRequest) {
    try {
        // SEGURIDAD: Obtener teléfono del JWT autenticado
        const payload = await requireClienteAuth(req);
        if (!payload) return unauthorized('Debes iniciar sesión');

        const phone = payload.phone;

        // Verificar que la integración esté configurada
        const deltaWashDB = getDeltaWashDB();
        if (!deltaWashDB) {
            return NextResponse.json(
                {
                    error: 'Integración con DeltaWash no configurada',
                    autosEnLavadero: []
                },
                { status: 200 }
            );
        }

        // Consultar autos en proceso en DeltaWash (estado != entregado)
        // NOTA: La tabla se llama "estado" y los valores son: "en proceso", "listo", "entregado"
        const autosEnDeltaWash = await deltaWashDB.$queryRaw<any[]>`
      SELECT
        c.phone as "clientePhone",
        e.patente,
        e.estado,
        e.notas,
        e."updatedAt",
        e."createdAt"
      FROM "estado" e
      JOIN "Cliente" c ON c.id = e."clienteId"
      WHERE c.phone = ${phone}
        AND LOWER(e.estado) != 'entregado'
        AND e.patente IS NOT NULL
        AND e.patente != ''
      ORDER BY e."updatedAt" DESC
    `;

        // Si no hay autos en proceso, retornar vacío
        if (!autosEnDeltaWash || autosEnDeltaWash.length === 0) {
            return NextResponse.json({
                autosEnLavadero: [],
                mensaje: 'No tienes autos en proceso de lavado'
            });
        }

        // Enriquecer con datos de la base local si el auto ya está registrado
        const autosEnriquecidos: AutoEnLavadero[] = await Promise.all(
            autosEnDeltaWash.map(async (autoDelWash: any) => {
                // Normalizar patente
                const patenteNormalizada = autoDelWash.patente
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '');

                // Buscar en la base local si tenemos más info del auto
                const cliente = await (prisma as any).cliente.findUnique({
                    where: { phone },
                    include: {
                        autos: {
                            where: {
                                patente: patenteNormalizada,
                            },
                        },
                    },
                });

                const autoLocal = cliente?.autos?.[0];

                return {
                    patente: patenteNormalizada,
                    marca: autoLocal?.marca || undefined,
                    modelo: autoLocal?.modelo || undefined,
                    alias: autoLocal?.alias || undefined,
                    estado: autoDelWash.estado, // "en proceso", "listo", o "entregado"
                    updatedAt: autoDelWash.updatedAt,
                    notas: autoDelWash.notas,
                };
            })
        );

        return NextResponse.json({
            autosEnLavadero: autosEnriquecidos,
            totalEnProceso: autosEnriquecidos.length,
        });

    } catch (error: any) {
        console.error('Error consultando DeltaWash:', error);

        return NextResponse.json(
            {
                error: 'Error al consultar el estado del auto',
                details: error.message,
                autosEnLavadero: []
            },
            { status: 500 }
        );
    }
}

// NOTA: Método POST eliminado para garantizar que la integración sea SOLO de LECTURA.
// La base DeltaWash Legacy NO se modifica desde este sistema.
