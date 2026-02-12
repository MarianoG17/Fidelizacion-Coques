# 🔧 Solución al Error "Invalid uuid" en Registro de Eventos

## 🐛 Problema Identificado

El error ocurre al intentar registrar un evento con beneficio:

```javascript
Enviando evento: {
  clienteId: '2163129b-8300-4904-836a-a5cbcaeb7442',  // ✅ UUID válido
  mesaId: null,  // ✅ OK (null es válido)
  tipoEvento: 'BENEFICIO_APLICADO',  // ✅ OK
  beneficioId: 'beneficio-bienvenida',  // ❌ NO ES UUID - ES STRING LEGIBLE
  metodoValidacion: 'QR'  // ✅ OK
}

Error: 400 {error: 'Invalid uuid'}
```

## 🔍 Causa Raíz

El schema de Prisma define que `Beneficio.id` debe ser un UUID:

```prisma
model Beneficio {
  id String @id @default(uuid())  // Espera formato UUID
  // ...
}
```

Pero en tu base de datos, los beneficios tienen IDs legibles como:
- `'beneficio-bienvenida'`
- `'cafe-gratis'`
- etc.

El endpoint `/api/eventos` valida con Zod:

```typescript
beneficioId: z.string().uuid().optional().nullable()
```

Y rechaza cualquier string que NO sea formato UUID.

## ✅ Solución 1: Actualizar IDs a UUID (Recomendado)

Esta es la solución correcta a largo plazo. Actualiza los IDs de beneficios a UUID reales:

### Paso 1: Ver beneficios existentes

```sql
SELECT id, nombre, descripcion FROM "Beneficio";
```

### Paso 2: Generar UUIDs y mapear

Para cada beneficio, genera un UUID nuevo:

```sql
-- Ejemplo para beneficio de bienvenida
UPDATE "Beneficio" 
SET id = gen_random_uuid()::text 
WHERE id = 'beneficio-bienvenida'
RETURNING id, nombre;

-- Copiar el nuevo UUID que retorna
```

### Paso 3: Actualizar relaciones

Necesitarás actualizar todas las tablas que referencian estos IDs:

```sql
-- Ver qué tablas referencian Beneficio
SELECT 
  tc.table_name, 
  kcu.column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
  AND tc.table_name != 'Beneficio';
```

Probablemente:
- `NivelBeneficio.beneficioId`
- `EventoScan.beneficioId`

**IMPORTANTE**: Hazlo en una transacción para evitar inconsistencias:

```sql
BEGIN;

-- 1. Actualizar beneficios con UUIDs nuevos
-- 2. Actualizar relaciones correspondientes
-- 3. Verificar que todo esté OK

COMMIT;  -- O ROLLBACK si hay algún error
```

---

## ✅ Solución 2: Cambiar Validación (Temporal/Rápido)

Si no querés cambiar los IDs ahora, podés relajar la validación en el backend:

### Archivo: `src/app/api/eventos/route.ts`

```typescript
// ANTES (línea 11-17)
const crearEventoSchema = z.object({
  clienteId: z.string().uuid(),
  mesaId: z.string().uuid().optional().nullable(),
  tipoEvento: z.enum(['VISITA', 'BENEFICIO_APLICADO', 'ESTADO_EXTERNO']),
  beneficioId: z.string().uuid().optional().nullable(),  // ❌ Requiere UUID
  metodoValidacion: z.enum(['QR', 'OTP_MANUAL']),
  notas: z.string().optional(),
})

// DESPUÉS
const crearEventoSchema = z.object({
  clienteId: z.string().uuid(),
  mesaId: z.string().uuid().optional().nullable(),
  tipoEvento: z.enum(['VISITA', 'BENEFICIO_APLICADO', 'ESTADO_EXTERNO']),
  beneficioId: z.string().optional().nullable(),  // ✅ Acepta cualquier string
  metodoValidacion: z.enum(['QR', 'OTP_MANUAL']),
  notas: z.string().optional(),
})
```

**Pros**:
- Rápido de implementar
- No requiere cambios en BD

**Contras**:
- Inconsistente con el schema de Prisma
- No valida el formato del ID
- Puede ocultar otros errores

---

## 🎯 Recomendación

**Opción A - Si estás en desarrollo/testing**: Usa Solución 2 (cambiar validación) para continuar probando rápido.

**Opción B - Si vas a producción pronto**: Usa Solución 1 (actualizar IDs a UUID) para mantener consistencia y mejores prácticas.

---

## 📝 Script SQL Completo (Solución 1)

```sql
-- ============================================================================
-- IMPORTANTE: Ejecutar en TRANSACCIÓN para poder hacer ROLLBACK si falla
-- ============================================================================

BEGIN;

-- Paso 1: Crear tabla temporal para mapear IDs viejos → nuevos
CREATE TEMP TABLE beneficio_id_mapping (
    old_id TEXT,
    new_id TEXT
);

-- Paso 2: Para cada beneficio, generar UUID nuevo y guardarlo
INSERT INTO beneficio_id_mapping (old_id, new_id)
SELECT id, gen_random_uuid()::text
FROM "Beneficio";

-- Paso 3: Actualizar NivelBeneficio (si existe)
UPDATE "NivelBeneficio" nb
SET "beneficioId" = m.new_id
FROM beneficio_id_mapping m
WHERE nb."beneficioId" = m.old_id;

-- Paso 4: Actualizar EventoScan (si existe)
UPDATE "EventoScan" es
SET "beneficioId" = m.new_id
FROM beneficio_id_mapping m
WHERE es."beneficioId" = m.old_id;

-- Paso 5: Finalmente actualizar Beneficio
UPDATE "Beneficio" b
SET id = m.new_id
FROM beneficio_id_mapping m
WHERE b.id = m.old_id;

-- Paso 6: Verificar que todo quedó OK
SELECT 'Beneficios actualizados:', COUNT(*) FROM "Beneficio";
SELECT 'NivelBeneficio actualizados:', COUNT(*) FROM "NivelBeneficio";
SELECT 'EventoScan con beneficio:', COUNT(*) FROM "EventoScan" WHERE "beneficioId" IS NOT NULL;

-- Si todo se ve bien:
COMMIT;

-- Si algo salió mal:
-- ROLLBACK;
```

---

## 🧪 Verificación Post-Fix

Después de aplicar cualquiera de las dos soluciones:

1. **Redeploy** en Vercel (o reinicia dev server local)
2. **Ir a** `/local`
3. **Escanear QR** de un cliente
4. **Seleccionar beneficio** y registrar
5. **Verificar consola**: Debe decir `"Evento registrado:"` sin errores
6. **Verificar BD**: El evento debe aparecer en la tabla `EventoScan`
7. **Verificar Admin**: El evento debe aparecer en "Visitas Recientes"

---

## 📞 Necesitás Ayuda?

Si algo no funciona, comparte:
1. El output del query `SELECT id, nombre FROM "Beneficio"`
2. Qué solución elegiste (1 o 2)
3. Los errores que aparecen (si hay)
