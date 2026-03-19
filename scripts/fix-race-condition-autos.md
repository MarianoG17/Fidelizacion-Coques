# Fix Race Condition en Autos DeltaWash

## 🐛 Problema: Race Condition

### ¿Qué es un Race Condition?

Cuando 2 requests llegan **al mismo tiempo** al webhook de DeltaWash:

```typescript
// Request A y Request B llegan SIMULTÁNEAMENTE para la misma patente

// Request A:
let auto = await prisma.auto.findFirst({ where: { patente: "ABC123" } })
// Resultado: null (no existe)

// Request B (al mismo tiempo):
let auto = await prisma.auto.findFirst({ where: { patente: "ABC123" } })
// Resultado: null (no existe todavía)

// Request A:
auto = await prisma.auto.create({ data: { patente: "ABC123" } })
// ✅ OK - Auto creado

// Request B:
auto = await prisma.auto.create({ data: { patente: "ABC123" } })
// ❌ ERROR: Unique constraint violation - patente ya existe
```

### Impacto

- Webhook falla con error 500
- Auto no se registra en el sistema
- Cliente no recibe notificaciones

### Frecuencia

- **Baja** - Solo si DeltaWash envía 2 webhooks simultáneos
- Más probable en:
  - Reintentos automáticos
  - Múltiples estados cambiando rápido
  - Alta carga del servidor

---

## ✅ Solución: Usar `upsert`

### Paso 1: Agregar Unique Constraint en DB

**Archivo:** `prisma/schema.prisma`

```prisma
model Auto {
  id              String          @id @default(uuid())
  clienteId       String
  cliente         Cliente         @relation(fields: [clienteId], references: [id])
  patente         String
  marca           String?
  modelo          String?
  alias           String?         // Nombre personalizado para el auto (ej: "Mi auto")
  activo          Boolean         @default(true)
  estadoActual    EstadoAuto?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([clienteId, patente])  // ✅ AGREGAR ESTA LÍNEA
  @@index([clienteId])
  @@index([patente])
}
```

### Paso 2: Crear Migration

Ejecutar en terminal:

```bash
cd fidelizacion-zona
npx prisma migrate dev --name add-unique-constraint-cliente-patente
```

Esto genera:
- `prisma/migrations/YYYYMMDDHHMMSS_add_unique_constraint_cliente_patente/migration.sql`
- Actualiza la base de datos local

### Paso 3: Actualizar Código del Webhook

**Archivo:** `src/app/api/webhook/deltawash/route.ts`

```typescript
// ❌ ANTES (líneas 104-149)
let auto = await prisma.auto.findFirst({
    where: { clienteId: cliente.id, patente: patenteNormalizada }
})

if (!auto) {
    auto = await prisma.auto.create({
        data: {
            clienteId: cliente.id,
            patente: patenteNormalizada,
            marca: payload.marca || 'Desconocida',
            modelo: payload.modelo || 'Desconocido',
            activo: true,
        }
    })
}

// ✅ DESPUÉS - Usar upsert (atómico, sin race condition)
const auto = await prisma.auto.upsert({
  where: {
    clienteId_patente: {
      clienteId: cliente.id,
      patente: patenteNormalizada
    }
  },
  update: {
    // Actualizar marca/modelo si vienen nuevos datos
    marca: payload.marca || undefined,
    modelo: payload.modelo || undefined,
    activo: true,
  },
  create: {
    clienteId: cliente.id,
    patente: patenteNormalizada,
    marca: payload.marca || 'Desconocida',
    modelo: payload.modelo || 'Desconocido',
    activo: true,
  }
})
```

---

## 📋 Script Completo de Aplicación

### 1. Verificar Schema Actual

```bash
cd fidelizacion-zona
cat prisma/schema.prisma | grep -A 15 "model Auto"
```

Buscar si ya tiene `@@unique([clienteId, patente])`

### 2. Si NO tiene el constraint, agregarlo:

Editar `prisma/schema.prisma` y agregar la línea:

```prisma
model Auto {
  // ... campos existentes ...
  
  @@unique([clienteId, patente])  // ← AGREGAR AQUÍ
  @@index([clienteId])
  @@index([patente])
}
```

### 3. Crear y aplicar migration

```bash
# Desarrollo (local)
npx prisma migrate dev --name add-unique-constraint-cliente-patente

# Producción (Vercel/Railway)
npx prisma migrate deploy
```

### 4. Actualizar código del webhook

Ver cambios completos en el diff abajo.

---

## 🔧 Migration SQL Generada

```sql
-- CreateIndex
CREATE UNIQUE INDEX "Auto_clienteId_patente_key" ON "Auto"("clienteId", "patente");
```

**Nota:** Esta migration es **safe** - no borra datos, solo agrega constraint.

---

## ⚠️ Verificaciones Pre-Aplicación

### Verificar que no haya duplicados existentes:

```sql
SELECT clienteId, patente, COUNT(*)
FROM "Auto"
GROUP BY clienteId, patente
HAVING COUNT(*) > 1;
```

**Si hay duplicados:**
1. Identificar cuál es el correcto (más reciente?)
2. Eliminar duplicados manualmente
3. Luego aplicar la migration

---

## 🚀 Pasos de Deployment

### Opción A: Desarrollo Local → Producción

```bash
# 1. Local: Crear migration
npx prisma migrate dev --name add-unique-constraint-cliente-patente

# 2. Commit
git add prisma/
git commit -m "feat: Add unique constraint to prevent race condition in autos"
git push

# 3. Vercel auto-deploya y corre: npx prisma migrate deploy
```

### Opción B: Directamente en Producción (si no hay local DB)

```bash
# 1. Conectar a DB de producción
export DATABASE_URL="postgresql://..."

# 2. Aplicar migration
npx prisma migrate deploy

# 3. Deploy código actualizado
git push
```

---

## ✅ Testing

Después de aplicar:

1. **Test manual:**
   - Enviar 2 webhooks simultáneos con misma patente
   - Ambos deberían responder 200 OK

2. **Verificar DB:**
   ```sql
   SELECT * FROM "Auto" WHERE patente = 'ABC123';
   -- Debería haber solo 1 registro, no duplicados
   ```

3. **Monitorear logs:**
   - No deberían aparecer errores de "Unique constraint violation"

---

## 📊 Impacto

- **Riesgo:** 🟢 Muy bajo
- **Breaking changes:** ❌ No
- **Downtime:** ❌ No
- **Data loss:** ❌ No

**Safe to deploy** ✅

---

**Fecha:** 2026-03-19
**Bug:** #8 del ANALISIS-SEMANTICO-FEATURES.md
