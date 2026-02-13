-- Script para actualizar descripciones de beneficios por nivel y crear logros
-- Actualizar descripciones de beneficios por nivel
UPDATE "Nivel"
SET "descripcionBeneficios" = '🥤 Vaso de agua de cortesía con el almuerzo\n💰 10% de descuento en cafetería después del almuerzo'
WHERE "nombre" = 'Bronce';
UPDATE "Nivel"
SET "descripcionBeneficios" = '🥤 Vaso de agua de cortesía con el almuerzo\n💰 20% de descuento en cafetería después del almuerzo'
WHERE "nombre" = 'Plata';
UPDATE "Nivel"
SET "descripcionBeneficios" = '🥤 Vaso de agua o limonada de cortesía con el almuerzo\n💰 30% de descuento en cafetería después del almuerzo\n⭐ Acceso prioritario a eventos especiales'
WHERE "nombre" = 'Oro';
UPDATE "Nivel"
SET "descripcionBeneficios" = '🥤 Vaso de agua o limonada de cortesía con el almuerzo\n💰 30% de descuento en cafetería después del almuerzo\n⭐ Acceso prioritario a eventos especiales\n🎂 20% de descuento en tortas clásicas durante la semana de tu cumpleaños'
WHERE "nombre" = 'Platino';
-- Insertar logros iniciales
-- Logro: Primera Visita
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Primera Visita',
        '¡Bienvenido a Fidelización Zona! Hiciste tu primera visita.',
        'PRIMERA_VISITA',
        '👋',
        '{"visitas": 1}'::jsonb,
        10,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Cliente Frecuente (5 visitas)
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Cliente Frecuente',
        'Visitaste 5 veces. ¡Sos parte de la familia!',
        'VISITAS_CONSECUTIVAS',
        '🔥',
        '{"visitas": 5}'::jsonb,
        25,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Racha Semanal
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Racha Semanal',
        'Visitaste 3 días consecutivos en la misma semana',
        'VISITAS_CONSECUTIVAS',
        '📅',
        '{"visitasConsecutivas": 3, "diasVentana": 7}'::jsonb,
        30,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Subiste a Bronce
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "nivelId",
        "criterios",
        "puntosXp",
        "activo"
    )
SELECT gen_random_uuid(),
    'Nivel Bronce',
    '¡Alcanzaste el nivel Bronce!',
    'NIVEL_ALCANZADO',
    '🥉',
    "id",
    '{}'::jsonb,
    20,
    true
FROM "Nivel"
WHERE "nombre" = 'Bronce' ON CONFLICT DO NOTHING;
-- Logro: Subiste a Plata
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "nivelId",
        "criterios",
        "puntosXp",
        "activo"
    )
SELECT gen_random_uuid(),
    'Nivel Plata',
    '¡Alcanzaste el nivel Plata!',
    'NIVEL_ALCANZADO',
    '🥈',
    "id",
    '{}'::jsonb,
    50,
    true
FROM "Nivel"
WHERE "nombre" = 'Plata' ON CONFLICT DO NOTHING;
-- Logro: Subiste a Oro
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "nivelId",
        "criterios",
        "puntosXp",
        "activo"
    )
SELECT gen_random_uuid(),
    'Nivel Oro',
    '¡Alcanzaste el nivel Oro! Sos un cliente VIP',
    'NIVEL_ALCANZADO',
    '🥇',
    "id",
    '{}'::jsonb,
    100,
    true
FROM "Nivel"
WHERE "nombre" = 'Oro' ON CONFLICT DO NOTHING;
-- Logro: Subiste a Platino
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "nivelId",
        "criterios",
        "puntosXp",
        "activo"
    )
SELECT gen_random_uuid(),
    'Nivel Platino',
    '¡Alcanzaste el máximo nivel! Sos un cliente legendario',
    'NIVEL_ALCANZADO',
    '💎',
    "id",
    '{}'::jsonb,
    200,
    true
FROM "Nivel"
WHERE "nombre" = 'Platino' ON CONFLICT DO NOTHING;
-- Logro: Referiste a 2 Amigos
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Embajador',
        'Referiste a 2 amigos que se activaron. ¡Gracias por compartir!',
        'REFERIDOS',
        '🤝',
        '{"referidosActivados": 2}'::jsonb,
        50,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Referiste a 5 Amigos
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Influencer',
        'Referiste a 5 amigos. ¡Sos un verdadero influencer!',
        'REFERIDOS',
        '🌟',
        '{"referidosActivados": 5}'::jsonb,
        100,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Feedback Positivo
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Crítico Positivo',
        'Dejaste tu primer feedback positivo (4-5 estrellas)',
        'FEEDBACK_POSITIVO',
        '⭐',
        '{"calificacion": 4}'::jsonb,
        15,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Uso Cruzado (Cafetería + Lavadero)
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Cliente Completo',
        'Usaste tanto la cafetería como el lavadero',
        'USO_CRUZADO',
        '🔄',
        '{"usosCruzados": 1}'::jsonb,
        30,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Madrugador (antes de las 9am)
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Madrugador',
        'Visitaste antes de las 9:00 AM',
        'MADRUGADOR',
        '🌅',
        '{"horaBefore": "09:00"}'::jsonb,
        10,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Cumpleañero
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        '¡Feliz Cumpleaños!',
        'Visitaste durante la semana de tu cumpleaños',
        'CUMPLEANOS',
        '🎂',
        '{}'::jsonb,
        25,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Aniversario de Cliente
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Un Año Juntos',
        '¡Cumpliste 1 año como cliente!',
        'ANIVERSARIO',
        '🎊',
        '{"anos": 1}'::jsonb,
        50,
        true
    ) ON CONFLICT DO NOTHING;
-- Logro: Cliente VIP (Platino por 6 meses)
INSERT INTO "Logro" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "icono",
        "criterios",
        "puntosXp",
        "activo"
    )
VALUES (
        gen_random_uuid(),
        'Cliente VIP',
        'Mantuviste el nivel Platino por 6 meses',
        'CLIENTE_VIP',
        '👑',
        '{"nivelPlatino": true, "meses": 6}'::jsonb,
        200,
        true
    ) ON CONFLICT DO NOTHING;