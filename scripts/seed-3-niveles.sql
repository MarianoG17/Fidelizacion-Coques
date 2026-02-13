-- Script para configurar 3 niveles (Bronce, Plata, Oro) con beneficios específicos
-- Eliminar nivel Platino si existe
DELETE FROM "Nivel"
WHERE "nombre" = 'Platino';
-- Actualizar descripciones de beneficios por nivel (3 niveles)
UPDATE "Nivel"
SET "descripcionBeneficios" = '🥤 Vaso de agua de cortesía con el almuerzo
💰 10% de descuento en cafetería post almuerzo'
WHERE "nombre" = 'Bronce';
UPDATE "Nivel"
SET "descripcionBeneficios" = '🥤 Vaso de agua de cortesía con el almuerzo
💰 20% de descuento en cafetería post almuerzo'
WHERE "nombre" = 'Plata';
UPDATE "Nivel"
SET "descripcionBeneficios" = '🥤 Vaso de agua o limonada de cortesía con el almuerzo
💰 30% de descuento en cafetería post almuerzo
⭐ Acceso prioritario a eventos especiales
🎂 20% de descuento en tortas clásicas durante la semana de tu cumpleaños'
WHERE "nombre" = 'Oro';
-- Si los niveles no existen, crearlos (solo para primera vez)
-- Bronce
INSERT INTO "Nivel" (
        "id",
        "nombre",
        "orden",
        "criterios",
        "descripcionBeneficios"
    )
VALUES (
        gen_random_uuid(),
        'Bronce',
        1,
        '{"visitas": 3, "diasVentana": 30, "usosCruzados": 0, "visitasTotal": 0}'::jsonb,
        '🥤 Vaso de agua de cortesía con el almuerzo
💰 10% de descuento en cafetería post almuerzo'
    ) ON CONFLICT ("nombre") DO
UPDATE
SET "descripcionBeneficios" = EXCLUDED."descripcionBeneficios",
    "criterios" = EXCLUDED."criterios";
-- Plata
INSERT INTO "Nivel" (
        "id",
        "nombre",
        "orden",
        "criterios",
        "descripcionBeneficios"
    )
VALUES (
        gen_random_uuid(),
        'Plata',
        2,
        '{"visitas": 6, "diasVentana": 30, "usosCruzados": 1, "visitasTotal": 10}'::jsonb,
        '🥤 Vaso de agua de cortesía con el almuerzo
💰 20% de descuento en cafetería post almuerzo'
    ) ON CONFLICT ("nombre") DO
UPDATE
SET "descripcionBeneficios" = EXCLUDED."descripcionBeneficios",
    "criterios" = EXCLUDED."criterios";
-- Oro
INSERT INTO "Nivel" (
        "id",
        "nombre",
        "orden",
        "criterios",
        "descripcionBeneficios"
    )
VALUES (
        gen_random_uuid(),
        'Oro',
        3,
        '{"visitas": 10, "diasVentana": 30, "usosCruzados": 2, "visitasTotal": 25}'::jsonb,
        '🥤 Vaso de agua o limonada de cortesía con el almuerzo
💰 30% de descuento en cafetería post almuerzo
⭐ Acceso prioritario a eventos especiales
🎂 20% de descuento en tortas clásicas durante la semana de tu cumpleaños'
    ) ON CONFLICT ("nombre") DO
UPDATE
SET "descripcionBeneficios" = EXCLUDED."descripcionBeneficios",
    "criterios" = EXCLUDED."criterios";