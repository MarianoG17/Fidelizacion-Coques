# Diagnóstico: Beneficio "bonificacion tortas 15% off" No Se Marca Como Usado

## 📋 Contexto

El beneficio de descuento del 15% en tortas no se marca como "usado" después de canjearlo, aunque otros beneficios sí funcionan correctamente.

### Historial
- **Antes**: El descuento estaba **hardcodeado** en el campo `descuentoPedidosTortas` del modelo `Nivel`
- **Después**: Se migró a un beneficio gestionable desde el admin panel
- **Problema**: Después de la migración, no se marca como usado

---

## 🔍 Análisis del Código

### 1. Flujo de Canje de Beneficios

#### A. Frontend (Staff scanner)
[`src/app/local/page.tsx:519-540`](../src/app/local/page.tsx:519)
```typescript
const aplicarBeneficio = async (clienteId: string, beneficioId: string) => {
  const res = await fetch('/api/eventos', {
    method: 'POST',
    body: JSON.stringify({
      clienteId,
      tipoEvento: 'BENEFICIO_APLICADO',
      beneficioId,          // ← Se envía el ID del beneficio
      metodoValidacion: 'QR',
    }),
  })
}
```

#### B. Backend (Registro de evento)
[`src/app/api/eventos/route.ts:66-86`](../src/app/api/eventos/route.ts:66)
```typescript
const evento = await prisma.eventoScan.create({
  data: {
    clienteId,
    localId: local.id,
    tipoEvento: 'BENEFICIO_APLICADO',
    beneficioId: beneficioId || undefined,  // ← Se registra en EventoScan
    ...
  },
})
```

#### C. Verificación de Uso
[`src/lib/beneficios.ts:72-77`](../src/lib/beneficios.ts:72)
```typescript
if (condiciones.usoUnico) {
  const usado = await prisma.eventoScan.count({
    where: { clienteId, beneficioId: beneficio.id },  // ← Busca por beneficioId
  })
  if (usado > 0) return null  // ← Oculta beneficio si ya se usó
}
```

#### D. Mostrar Beneficios Usados
[`src/app/api/pass/beneficios-disponibles/route.ts:78-99`](../src/app/api/pass/beneficios-disponibles/route.ts:78)
```typescript
// Contar usos hoy
const usosHoy = await prisma.$queryRaw`
  SELECT COUNT(*) as count
  FROM "EventoScan"
  WHERE "clienteId" = ${clientePayload.clienteId}
    AND "beneficioId" = ${beneficio.id}  // ← Compara con beneficio.id
    AND DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires') = ${fechaHoyStr}::date
`
```

---

## 🎯 Posibles Causas del Problema

### Causa #1: ID del Beneficio Cambiado ⭐ (MÁS PROBABLE)
**Descripción**: Cuando migraron el descuento de hardcoded a beneficio en el admin, se creó con un **ID nuevo**, pero puede haber referencias a un ID antiguo o incorrecto.

**Cómo ocurre**:
1. Antes: Descuento en `nivel.descuentoPedidosTortas` (no era un beneficio)
2. Después: Se crea beneficio "bonificacion tortas 15% off" con ID UUID nuevo
3. **Problema**: El staff scanner muestra el beneficio pero con un ID incorrecto

**Verificación**:
```sql
-- Ver el ID real del beneficio
SELECT id, nombre FROM "Beneficio" WHERE nombre ILIKE '%tortas%' OR nombre ILIKE '%15%';

-- Ver qué IDs se están usando en los EventoScan
SELECT DISTINCT "beneficioId" FROM "EventoScan" 
WHERE "beneficioId" IN (
  SELECT id FROM "Beneficio" WHERE nombre ILIKE '%tortas%'
);
```

---

### Causa #2: Condiciones Mal Configuradas
**Descripción**: El beneficio no tiene `usoUnico: true` o `maxPorDia` configurado correctamente.

**Cómo ocurre**:
- Si `condiciones.usoUnico` es `false` o `undefined`, no se marca como "usado permanentemente"
- Solo aparecerá como "usado hoy" si hay `maxPorDia` y se alcanzó el límite

**Verificación**:
```sql
SELECT 
  nombre,
  condiciones->'usoUnico' as uso_unico,
  condiciones->'maxPorDia' as max_por_dia,
  condiciones
FROM "Beneficio"
WHERE nombre ILIKE '%tortas%' OR nombre ILIKE '%15%';
```

**Configuración correcta** para beneficio de uso único:
```json
{
  "tipo": "DESCUENTO",
  "descuento": 0.15,
  "usoUnico": true,    // ← IMPORTANTE
  "descripcion": "15% de descuento en tu pedido de tortas",
  "icono": "🍰"
}
```

---

### Causa #3: EventoScan No Se Crea
**Descripción**: El registro del `EventoScan` falla silenciosamente y no se guarda en la BD.

**Cómo ocurre**:
- Error en la validación del `beneficioId` (schema espera UUID válido)
- Error de permisos de la API Key del local
- Excepción no capturada

**Verificación**:
```sql
-- Ver si hay EventoScan para este beneficio
SELECT 
  e.id,
  e."clienteId",
  e."beneficioId",
  e.timestamp,
  c.nombre as cliente,
  b.nombre as beneficio
FROM "EventoScan" e
LEFT JOIN "Cliente" c ON c.id = e."clienteId"
LEFT JOIN "Beneficio" b ON b.id = e."beneficioId"
WHERE e."beneficioId" IN (
  SELECT id FROM "Beneficio" WHERE nombre ILIKE '%tortas%'
)
ORDER BY e.timestamp DESC;
```

---

### Causa #4: Beneficio No Está Asignado al Nivel
**Descripción**: El beneficio existe pero no está asociado al nivel del cliente.

**Verificación**:
```sql
-- Ver a qué niveles está asignado
SELECT 
  b.id,
  b.nombre as beneficio,
  n.nombre as nivel,
  n.orden
FROM "Beneficio" b
LEFT JOIN "NivelBeneficio" nb ON nb."beneficioId" = b.id
LEFT JOIN "Nivel" n ON n.id = nb."nivelId"
WHERE b.nombre ILIKE '%tortas%' OR b.nombre ILIKE '%15%';
```

---

## 🧪 Plan de Diagnóstico

### Paso 1: Ejecutar Script de Debug
Ejecuta [`scripts/debug-beneficio-tortas.sql`](../scripts/debug-beneficio-tortas.sql) para obtener:
- ID real del beneficio
- Configuración de condiciones
- Historial de usos registrados
- Asignación a niveles

### Paso 2: Verificar Configuración
```sql
-- Configuración completa del beneficio
SELECT 
  id,
  nombre,
  activo,
  requiereEstadoExterno,
  condiciones
FROM "Beneficio"
WHERE nombre = 'bonificacion tortas 15% off';
```

**Configuración esperada**:
```json
{
  "tipo": "DESCUENTO",
  "descuento": 0.15,
  "usoUnico": true,
  "maxPorDia": 1,
  "descripcion": "15% de descuento en tu pedido de tortas",
  "icono": "🍰"
}
```

### Paso 3: Simular Canje y Verificar
1. **Canjear el beneficio** desde el staff scanner
2. **Verificar que se creó el EventoScan**:
```sql
SELECT * FROM "EventoScan"
WHERE "clienteId" = 'TU_CLIENTE_ID'
AND "tipoEvento" = 'BENEFICIO_APLICADO'
ORDER BY timestamp DESC
LIMIT 5;
```

3. **Recargar beneficios disponibles** y ver si aparece como "usado"

---

## ✅ Soluciones Según la Causa

### Si es Causa #1 (ID incorrecto)
**Solución**: Actualizar el ID del beneficio en el admin o asegurarse de que el staff scanner use el ID correcto.

No hay código que arreglar, es un problema de **datos** en la BD.

### Si es Causa #2 (Condiciones mal configuradas)
**Solución**: Actualizar las condiciones del beneficio:

```sql
UPDATE "Beneficio"
SET condiciones = jsonb_set(condiciones, '{usoUnico}', 'true', true)
WHERE nombre = 'bonificacion tortas 15% off';

-- Verificar
SELECT nombre, condiciones FROM "Beneficio" 
WHERE nombre = 'bonificacion tortas 15% off';
```

### Si es Causa #3 (EventoScan no se crea)
**Solución**: Revisar logs del servidor al momento de canjear y corregir el error.

### Si es Causa #4 (No asignado al nivel)
**Solución**: Asignar el beneficio al nivel Oro:

```sql
-- Obtener IDs
SELECT id, nombre FROM "Beneficio" WHERE nombre = 'bonificacion tortas 15% off';
SELECT id, nombre FROM "Nivel" WHERE nombre = 'Oro';

-- Asignar (reemplazar con IDs reales)
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
VALUES ('NIVEL_ORO_ID', 'BENEFICIO_TORTAS_ID')
ON CONFLICT DO NOTHING;
```

---

##  Resumen Ejecutivo

| Aspecto | Estado |
|---------|--------|
| **Síntoma** | Beneficio no se marca como "usado" después de canjearlo |
| **Beneficio** | "bonificacion tortas 15% off" |
| **Otros beneficios** | ✅ Funcionan correctamente |
| **Causa más probable** | ID del beneficio cambió al migrar de hardcoded a admin |
| **Impacto** | Los clientes pueden canjear el beneficio múltiples veces |

### Próxima Acción
1. Ejecutar [`scripts/debug-beneficio-tortas.sql`](../scripts/debug-beneficio-tortas.sql)
2. Compartir los resultados
3. Aplicar la solución correspondiente

---

**Fecha**: 2026-02-28  
**Archivos relacionados**:
- [`src/app/api/eventos/route.ts`](../src/app/api/eventos/route.ts)
- [`src/lib/beneficios.ts`](../src/lib/beneficios.ts)
- [`src/app/api/pass/beneficios-disponibles/route.ts`](../src/app/api/pass/beneficios-disponibles/route.ts)
- [`scripts/debug-beneficio-tortas.sql`](../scripts/debug-beneficio-tortas.sql)
