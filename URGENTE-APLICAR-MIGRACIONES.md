# 🚨 URGENTE: Aplicar Migraciones en Base de Datos

## ❌ Error Actual en Producción

```
The column `Cliente.fechaCumpleanos` does not exist in the current database.
```

**Causa**: El código se desplegó exitosamente en Vercel, pero las nuevas columnas/tablas **NO existen** en la base de datos de producción.

**Solución**: Aplicar las migraciones SQL **AHORA**.

---

## ✅ PASO 1: Conectarse a Neon

1. Ir a: https://console.neon.tech
2. Seleccionar el proyecto: **Fidelización Zona**
3. Click en **"SQL Editor"**

---

## ✅ PASO 2: Ejecutar Migración Principal (COPIAR TODO)

**⚠️ IMPORTANTE**: Copiar y pegar **TODO** el contenido del archivo [`prisma/migrations/20260213_add_nuevas_funcionalidades/migration.sql`](prisma/migrations/20260213_add_nuevas_funcionalidades/migration.sql) en el editor SQL de Neon.

```sql
-- Migration: Nuevas funcionalidades (Referidos, Feedback, Gamificación, Cumpleaños)

-- Agregar nuevos campos a Cliente
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "fechaCumpleanos" TIMESTAMP(3);
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "codigoReferido" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "referidoPorId" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "referidosActivados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP(3);

-- Agregar índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_codigoReferido_key" ON "Cliente"("codigoReferido");
CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_resetPasswordToken_key" ON "Cliente"("resetPasswordToken");

-- Agregar índices de búsqueda
CREATE INDEX IF NOT EXISTS "Cliente_codigoReferido_idx" ON "Cliente"("codigoReferido");
CREATE INDEX IF NOT EXISTS "Cliente_resetPasswordToken_idx" ON "Cliente"("resetPasswordToken");

-- Agregar relación de auto-referencia para referidos
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_referidoPorId_fkey" FOREIGN KEY ("referidoPorId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Agregar campo de descripción de beneficios a Nivel
ALTER TABLE "Nivel" ADD COLUMN IF NOT EXISTS "descripcionBeneficios" TEXT;

-- Crear enum TipoLogro
DO $$ BEGIN
    CREATE TYPE "TipoLogro" AS ENUM (
        'PRIMERA_VISITA',
        'VISITAS_CONSECUTIVAS',
        'NIVEL_ALCANZADO',
        'REFERIDOS',
        'FEEDBACK_POSITIVO',
        'CUMPLEANOS',
        'ANIVERSARIO',
        'USO_CRUZADO',
        'MADRUGADOR',
        'CLIENTE_VIP'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla Feedback
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "eventoScanId" TEXT,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "enviadoGoogleMaps" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- Crear índices para Feedback
CREATE INDEX IF NOT EXISTS "Feedback_clienteId_idx" ON "Feedback"("clienteId");
CREATE INDEX IF NOT EXISTS "Feedback_localId_idx" ON "Feedback"("localId");
CREATE INDEX IF NOT EXISTS "Feedback_calificacion_idx" ON "Feedback"("calificacion");
CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- Agregar foreign keys a Feedback
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Crear tabla Logro
CREATE TABLE IF NOT EXISTS "Logro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" "TipoLogro" NOT NULL,
    "icono" TEXT,
    "nivelId" TEXT,
    "criterios" JSONB NOT NULL,
    "puntosXp" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Logro_pkey" PRIMARY KEY ("id")
);

-- Crear índices para Logro
CREATE INDEX IF NOT EXISTS "Logro_tipo_idx" ON "Logro"("tipo");
CREATE INDEX IF NOT EXISTS "Logro_nivelId_idx" ON "Logro"("nivelId");

-- Agregar foreign key a Logro
ALTER TABLE "Logro" ADD CONSTRAINT "Logro_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Nivel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Crear tabla LogroCliente
CREATE TABLE IF NOT EXISTS "LogroCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "logroId" TEXT NOT NULL,
    "obtenidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LogroCliente_pkey" PRIMARY KEY ("id")
);

-- Crear índices para LogroCliente
CREATE UNIQUE INDEX IF NOT EXISTS "LogroCliente_clienteId_logroId_key" ON "LogroCliente"("clienteId", "logroId");
CREATE INDEX IF NOT EXISTS "LogroCliente_clienteId_idx" ON "LogroCliente"("clienteId");
CREATE INDEX IF NOT EXISTS "LogroCliente_logroId_idx" ON "LogroCliente"("logroId");
CREATE INDEX IF NOT EXISTS "LogroCliente_obtenidoEn_idx" ON "LogroCliente"("obtenidoEn");

-- Agregar foreign keys a LogroCliente
ALTER TABLE "LogroCliente" ADD CONSTRAINT "LogroCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogroCliente" ADD CONSTRAINT "LogroCliente_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Generar códigos de referido para clientes existentes
UPDATE "Cliente" 
SET "codigoReferido" = UPPER(SUBSTRING(MD5(RANDOM()::text || id) FROM 1 FOR 8))
WHERE "codigoReferido" IS NULL AND "estado" = 'ACTIVO';
```

✅ Click en **"Run"**
✅ Debe decir: **"Success"** o mostrar las tablas creadas

---

## ✅ PASO 3: Ejecutar Seed de 3 Niveles (COPIAR TODO)

**Copiar y pegar** el contenido completo de [`scripts/seed-3-niveles.sql`](scripts/seed-3-niveles.sql):

```sql
-- Script para configurar 3 niveles (Bronce, Plata, Oro) con beneficios específicos

-- Eliminar nivel Platino si existe
DELETE FROM "Nivel" WHERE "nombre" = 'Platino';

-- Actualizar descripciones de beneficios por nivel (3 niveles)
UPDATE "Nivel" SET 
  "descripcionBeneficios" = '🥤 Vaso de agua de cortesía con el almuerzo
💰 10% de descuento en cafetería post almuerzo'
WHERE "nombre" = 'Bronce';

UPDATE "Nivel" SET 
  "descripcionBeneficios" = '🥤 Vaso de agua de cortesía con el almuerzo
💰 20% de descuento en cafetería post almuerzo'
WHERE "nombre" = 'Plata';

UPDATE "Nivel" SET 
  "descripcionBeneficios" = '🥤 Vaso de agua o limonada de cortesía con el almuerzo
💰 30% de descuento en cafetería post almuerzo
⭐ Acceso prioritario a eventos especiales
🎂 20% de descuento en tortas clásicas durante la semana de tu cumpleaños'
WHERE "nombre" = 'Oro';

-- Si los niveles no existen, crearlos (solo para primera vez)
-- Bronce
INSERT INTO "Nivel" ("id", "nombre", "orden", "criterios", "descripcionBeneficios")
VALUES (
  gen_random_uuid(),
  'Bronce',
  1,
  '{"visitas": 3, "diasVentana": 30, "usosCruzados": 0, "visitasTotal": 0}'::jsonb,
  '🥤 Vaso de agua de cortesía con el almuerzo
💰 10% de descuento en cafetería post almuerzo'
) ON CONFLICT ("nombre") DO UPDATE SET 
  "descripcionBeneficios" = EXCLUDED."descripcionBeneficios",
  "criterios" = EXCLUDED."criterios";

-- Plata
INSERT INTO "Nivel" ("id", "nombre", "orden", "criterios", "descripcionBeneficios")
VALUES (
  gen_random_uuid(),
  'Plata',
  2,
  '{"visitas": 6, "diasVentana": 30, "usosCruzados": 1, "visitasTotal": 10}'::jsonb,
  '🥤 Vaso de agua de cortesía con el almuerzo
💰 20% de descuento en cafetería post almuerzo'
) ON CONFLICT ("nombre") DO UPDATE SET 
  "descripcionBeneficios" = EXCLUDED."descripcionBeneficios",
  "criterios" = EXCLUDED."criterios";

-- Oro
INSERT INTO "Nivel" ("id", "nombre", "orden", "criterios", "descripcionBeneficios")
VALUES (
  gen_random_uuid(),
  'Oro',
  3,
  '{"visitas": 10, "diasVentana": 30, "usosCruzados": 2, "visitasTotal": 25}'::jsonb,
  '🥤 Vaso de agua o limonada de cortesía con el almuerzo
💰 30% de descuento en cafetería post almuerzo
⭐ Acceso prioritario a eventos especiales
🎂 20% de descuento en tortas clásicas durante la semana de tu cumpleaños'
) ON CONFLICT ("nombre") DO UPDATE SET 
  "descripcionBeneficios" = EXCLUDED."descripcionBeneficios",
  "criterios" = EXCLUDED."criterios";
```

✅ Click en **"Run"**
✅ Debe decir: **"Success"**

---

## ✅ PASO 4: Ejecutar Seed de Logros (COPIAR SOLO HASTA LÍNEA 150)

**⚠️ IMPORTANTE**: El archivo es largo. Copiar desde el inicio hasta aproximadamente la línea 150 (todos los INSERTs).

**Ver contenido completo en**: [`scripts/seed-beneficios-logros.sql`](scripts/seed-beneficios-logros.sql)

Contenido resumido (ejecutar TODO el archivo):
```sql
-- Script para actualizar descripciones de beneficios por nivel y crear logros

UPDATE "Nivel" SET "descripcionBeneficios" = '...' WHERE "nombre" = 'Bronce';
-- ... más updates

-- Logro: Primera Visita
INSERT INTO "Logro" (...) VALUES (...) ON CONFLICT DO NOTHING;

-- Logro: Cliente Frecuente
INSERT INTO "Logro" (...) VALUES (...) ON CONFLICT DO NOTHING;

-- ... (total 13 logros)
```

✅ Click en **"Run"**
✅ Debe decir: **"Success"**

---

## ✅ PASO 5: Verificar que Funcionó

### 5.1 Verificar Nuevas Tablas
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Feedback', 'Logro', 'LogroCliente');
```
**Debe retornar 3 filas** ✅

### 5.2 Verificar Nuevas Columnas en Cliente
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Cliente' 
AND column_name IN ('fechaCumpleanos', 'codigoReferido', 'referidosActivados');
```
**Debe retornar 3 filas** ✅

### 5.3 Verificar Logros Creados
```sql
SELECT COUNT(*) as total FROM "Logro";
```
**Debe retornar: total = 13** (o más) ✅

### 5.4 Verificar Niveles
```sql
SELECT nombre, orden FROM "Nivel" ORDER BY orden;
```
**Debe retornar 3 filas: Bronce (1), Plata (2), Oro (3)** ✅

---

## ✅ PASO 6: Probar la App en Producción

1. Ir a: https://fidelizacion-coques-813u.vercel.app/pass
2. Login con tu cuenta de prueba
3. **NO debería haber más errores** ✅
4. Deberías ver tu pass correctamente

---

## 🔍 Verificar Logs en Vercel

1. Ir a: https://vercel.com/tu-cuenta/fidelizacion-coques/logs
2. Refrescar la app: https://fidelizacion-coques-813u.vercel.app/pass
3. Los logs ahora deberían mostrar **SUCCESS** sin errores de Prisma

---

## ⏱️ Tiempo Estimado Total

- PASO 2 (Migración): **2 minutos**
- PASO 3 (3 Niveles): **1 minuto**
- PASO 4 (Logros): **2 minutos**
- PASO 5 (Verificación): **1 minuto**
- PASO 6 (Prueba): **1 minuto**

**Total: ~7 minutos** ⏱️

---

## 🆘 Si algo falla

### Error: "relation 'Feedback' already exists"
**Es OK**: Significa que ya se ejecutó antes. Continuar con siguiente paso.

### Error: "duplicate key value violates unique constraint"
**Es OK**: Significa que ya se ejecutó antes. Continuar con siguiente paso.

### Error: No se puede conectar a Neon
1. Verificar que estés en el proyecto correcto
2. Verificar que la base de datos esté activa (no suspendida)
3. Refrescar la página de Neon

---

## ✅ Resultado Esperado

Después de aplicar las migraciones:

- ✅ La app funciona sin errores en producción
- ✅ `/api/pass` carga correctamente
- ✅ Clientes activos tienen códigos de referido generados
- ✅ Sistema de 3 niveles activo
- ✅ 13 logros disponibles
- ✅ PWA instalable en móviles

---

**Una vez completado, ¡la app estará 100% funcional en producción!** 🚀
