/**
 * API: Consultar estado de autos en DeltaWash Legacy
 *
 * Integración en tiempo real con la base de DeltaWash (Neon)
 * para mostrar el estado de autos en proceso de lavado.
 *
 * GET /api/deltawash/estado-auto
 * Requiere: Authorization: Bearer <jwt>
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

        // Consultar autos en proceso en DeltaWash (estado != ENTREGADO)
        const autosEnDeltaWash = await deltaWashDB.$queryRaw<any[]>`
      SELECT 
        c.phone as "clientePhone",
        ea.patente,
        ea.estado,
        ea."localOrigenId",
        ea.notas,
        ea."updatedAt",
        ea."createdAt"
      FROM "EstadoAuto" ea
      JOIN "Cliente" c ON c.id = ea."clienteId"
      WHERE c.phone = ${phone}
        AND ea.estado != 'ENTREGADO'
        AND ea.patente IS NOT NULL 
        AND ea.patente != ''
      ORDER BY ea."updatedAt" DESC
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
                    estado: autoDelWash.estado,
                    updatedAt: autoDelWash.updatedAt,
                    localOrigenId: autoDelWash.localOrigenId,
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

// Endpoint para vincular auto de DeltaWash con la base local
// POST /api/deltawash/estado-auto
// Requiere: Authorization: Bearer <jwt>
export async function POST(req: NextRequest) {
  try {
    // SEGURIDAD: Obtener teléfono del JWT autenticado
    const payload = await requireClienteAuth(req);
    if (!payload) return unauthorized('Debes iniciar sesión');

    const phone = payload.phone;
    
    const body = await req.json();
    const { patente } = body;

    if (!patente) {
      return NextResponse.json(
        { error: 'Patente requerida' },
        { status: 400 }
      );
    }

        // Normalizar patente
        const patenteNormalizada = patente
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');

        // Buscar cliente local
        const cliente = await (prisma as any).cliente.findUnique({
            where: { phone },
        });

        if (!cliente) {
            return NextResponse.json(
                { error: 'Cliente no encontrado en sistema de fidelización' },
                { status: 404 }
            );
        }

        // Verificar que el auto exista en DeltaWash
        const deltaWashDB = getDeltaWashDB();
        if (!deltaWashDB) {
            return NextResponse.json(
                { error: 'Integración con DeltaWash no configurada' },
                { status: 503 }
            );
        }

        const autoEnDeltaWash = await deltaWashDB.$queryRaw<any[]>`
      SELECT 
        ea.patente,
        ea.estado
      FROM "EstadoAuto" ea
      JOIN "Cliente" c ON c.id = ea."clienteId"
      WHERE c.phone = ${phone}
        AND UPPER(REGEXP_REPLACE(ea.patente, '[^A-Z0-9]', '', 'g')) = ${patenteNormalizada}
      LIMIT 1
    `;

        if (!autoEnDeltaWash || autoEnDeltaWash.length === 0) {
            return NextResponse.json(
                { error: 'Auto no encontrado en DeltaWash para este teléfono' },
                { status: 404 }
            );
        }

        // Crear o actualizar auto en la base local
        const autoLocal = (await (prisma as any).auto.upsert({
            where: {
                clienteId_patente: {
                    clienteId: cliente.id,
                    patente: patenteNormalizada,
                },
            },
            update: {
                activo: true,
            },
            create: {
                clienteId: cliente.id,
                patente: patenteNormalizada,
                activo: true,
            },
        })) as any;

        return NextResponse.json({
            success: true,
            mensaje: 'Auto vinculado correctamente',
            auto: autoLocal,
        });

    } catch (error: any) {
        console.error('Error vinculando auto:', error);

        return NextResponse.json(
            {
                error: 'Error al vincular el auto',
                details: error.message
            },
            { status: 500 }
        );
    }
}
