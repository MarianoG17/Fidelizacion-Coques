/**
 * Script de Migración: Autos en Proceso desde BD Antigua
 * 
 * Migra autos que NO están en estado ENTREGADO desde la base antigua
 * a la nueva base con el sistema de múltiples autos por cliente.
 * 
 * USO:
 * 1. Configurar las variables de conexión abajo
 * 2. Ejecutar: npx ts-node scripts/migrate-autos-from-old-db.ts
 */

import { PrismaClient as PrismaClientOld } from '@prisma/client';
import { PrismaClient as PrismaClientNew } from '@prisma/client';

// CONFIGURACIÓN DE CONEXIONES
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL || '';
const NEW_DATABASE_URL = process.env.DATABASE_URL || '';

if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) {
    console.error('❌ ERROR: Faltan variables de entorno');
    console.error('   OLD_DATABASE_URL: URL de la base antigua en Neon');
    console.error('   DATABASE_URL: URL de la base nueva en Neon');
    process.exit(1);
}

// Cliente Prisma para base antigua
const prismaOld = new PrismaClientOld({
  datasources: {
    db: {
      url: OLD_DATABASE_URL,
    },
  },
}) as any;

// Cliente Prisma para base nueva
const prismaNew = new PrismaClientNew({
  datasources: {
    db: {
      url: NEW_DATABASE_URL,
    },
  },
}) as any;

interface AutoAMigrar {
    clientePhone: string;
    patente: string;
    marca?: string;
    modelo?: string;
    estado: string;
    localOrigenId: string;
    notas?: string;
    createdAt: Date;
    updatedAt: Date;
}

async function main() {
    console.log('🚀 Iniciando migración de autos en proceso...\n');

    try {
        // PASO 1: Obtener autos en proceso de la BD antigua (estado != ENTREGADO)
        console.log('📥 Consultando autos en proceso desde BD antigua...');

        const estadosEnProceso = await prismaOld.$queryRaw<any[]>`
      SELECT 
        c.phone as "clientePhone",
        ea.patente,
        ea.estado,
        ea."localOrigenId",
        ea.notas,
        ea."createdAt",
        ea."updatedAt"
      FROM "EstadoAuto" ea
      JOIN "Cliente" c ON c.id = ea."clienteId"
      WHERE ea.estado != 'ENTREGADO'
        AND ea.patente IS NOT NULL 
        AND ea.patente != ''
      ORDER BY ea."createdAt" ASC
    `;

        console.log(`✅ Encontrados ${estadosEnProceso.length} autos en proceso\n`);

        if (estadosEnProceso.length === 0) {
            console.log('ℹ️  No hay autos para migrar. Saliendo...');
            return;
        }

        // PASO 2: Mostrar resumen
        console.log('📊 Resumen de autos a migrar:');
        console.log('═══════════════════════════════════════════');
        const estadosCounts = estadosEnProceso.reduce((acc: any, auto: any) => {
            acc[auto.estado] = (acc[auto.estado] || 0) + 1;
            return acc;
        }, {});

        Object.entries(estadosCounts).forEach(([estado, count]) => {
            console.log(`   ${estado}: ${count} auto(s)`);
        });
        console.log('═══════════════════════════════════════════\n');

        // PASO 3: Confirmar migración
        console.log('⚠️  Se migrarán estos autos a la nueva base de datos.');
        console.log('   Presiona Ctrl+C para cancelar...\n');

        // Esperar 3 segundos antes de continuar
        await new Promise(resolve => setTimeout(resolve, 3000));

        // PASO 4: Migrar cada auto
        let migradosExitoso = 0;
        let errores = 0;

        for (const autoViejo of estadosEnProceso) {
            try {
                console.log(`\n🔄 Migrando: ${autoViejo.patente} (${autoViejo.clientePhone})`);

                // Buscar o crear cliente en la nueva BD
                let cliente = await prismaNew.cliente.findUnique({
                    where: { phone: autoViejo.clientePhone },
                });

                if (!cliente) {
                    console.log(`   ⚠️  Cliente ${autoViejo.clientePhone} no existe en BD nueva`);
                    console.log(`   📝 Creando cliente PRE_REGISTRADO...`);

                    cliente = await prismaNew.cliente.create({
                        data: {
                            phone: autoViejo.clientePhone,
                            estado: 'PRE_REGISTRADO',
                            fuenteOrigen: 'LAVADERO',
                        },
                    });
                }

                // Normalizar patente (eliminar espacios y mayúsculas)
                const patenteNormalizada = autoViejo.patente
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '');

                // Verificar si el auto ya existe
                const autoExistente = await prismaNew.auto.findUnique({
                    where: {
                        clienteId_patente: {
                            clienteId: cliente.id,
                            patente: patenteNormalizada,
                        },
                    },
                });

                if (autoExistente) {
                    console.log(`   ⚠️  Auto ya existe en BD nueva, actualizando estado...`);

                    // Actualizar o crear estado
                    await prismaNew.estadoAuto.upsert({
                        where: { autoId: autoExistente.id },
                        update: {
                            estado: autoViejo.estado as any,
                            localOrigenId: autoViejo.localOrigenId,
                            notas: autoViejo.notas,
                        },
                        create: {
                            autoId: autoExistente.id,
                            estado: autoViejo.estado as any,
                            localOrigenId: autoViejo.localOrigenId,
                            notas: autoViejo.notas,
                        },
                    });
                } else {
                    console.log(`   ➕ Creando nuevo auto y estado...`);

                    // Crear auto nuevo con su estado
                    const nuevoAuto = await prismaNew.auto.create({
                        data: {
                            clienteId: cliente.id,
                            patente: patenteNormalizada,
                            marca: autoViejo.marca || null,
                            modelo: autoViejo.modelo || null,
                            activo: true,
                            estadoActual: {
                                create: {
                                    estado: autoViejo.estado as any,
                                    localOrigenId: autoViejo.localOrigenId,
                                    notas: autoViejo.notas,
                                },
                            },
                        },
                    });
                }

                console.log(`   ✅ Migrado exitosamente`);
                migradosExitoso++;

            } catch (error: any) {
                console.error(`   ❌ Error migrando auto:`, error.message);
                errores++;
            }
        }

        // PASO 5: Resumen final
        console.log('\n\n═══════════════════════════════════════════');
        console.log('📊 RESUMEN DE MIGRACIÓN');
        console.log('═══════════════════════════════════════════');
        console.log(`✅ Migrados exitosamente: ${migradosExitoso}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📋 Total procesados: ${estadosEnProceso.length}`);
        console.log('═══════════════════════════════════════════\n');

    } catch (error: any) {
        console.error('❌ ERROR CRÍTICO:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await prismaOld.$disconnect();
        await prismaNew.$disconnect();
    }
}

// Ejecutar migración
main()
    .then(() => {
        console.log('✨ Migración completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
