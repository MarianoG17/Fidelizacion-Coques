# 🔧 Solución: Ajustes Múltiples Sistema de Fidelización

**Fecha:** 28 de Febrero 2026  
**Problemas identificados:** 4 puntos a resolver

---

## 📋 Resumen de Problemas

1. ❌ Descuento de tortas está hardcodeado en campo `descuentoPedidosTortas` del nivel, no como beneficio visible
2. ❌ Referencia a nivel "Platino" que no existe en logros y otros componentes
3. ❌ Completar perfil otorga una "visita" que confunde en estadísticas (parece que visitó el local pero no es cierto)
4. ✅ Sistema actual de descuentos en tortas (verificado)

---

## 🔍 Hallazgos Técnicos

### 1. Descuento de Tortas (Hardcodeado)

**Ubicación actual:** Campo en tabla `Nivel`
```sql
-- prisma/schema.prisma línea 178
descuentoPedidosTortas  Int   @default(0)  // Porcentaje de descuento
```

**Valores actuales:**
- Bronce: 5%
- Plata: 10% (estimado)
- Oro: 15% (estimado)

**Problema:**
- No aparece en `/admin/beneficios`
- No se puede modificar desde el admin
- No aparece explícitamente en `/logros` como beneficio

**Solución:** Crear beneficios reales en tabla `Beneficio` y deprecar el campo hardcodeado

---

### 2. Referencia a "Platino"

**Ubicado en:**
- [`src/app/pass/page.tsx:293`](src/app/pass/page.tsx:293) - Icono 💎
- [`src/app/logros/page.tsx:50`](src/app/logros/page.tsx:50) - Icono 💎
- [`src/app/admin/components/EventosEspeciales.tsx:305`](src/app/admin/components/EventosEspeciales.tsx:305) - Option
- [`src/app/admin/components/Clientes.tsx:259`](src/app/admin/components/Clientes.tsx:259) - Option

**Problema:**
- El nivel "Platino" no existe en tu sistema
- Solo tienes: Bronce, Plata, Oro
- Esto causa confusión

**Solución:** Eliminar todas las referencias a "Platino"

---

### 3. "Visita" al Completar Perfil

**Necesito investigar más:**
- Buscar en código donde se registra EventoScan al completar perfil
- Ver si se está contando como "visita" en estadísticas
- Determinar si es un logro o evento bonus

**Posibles ubicaciones:**
- `/api/perfil` - Al actualizar perfil
- `/api/logros` - Sistema de evaluación de logros
- `/api/auth/complete-phone` - Al completar registro OAuth

---

## ✅ SOLUCIONES PROPUESTAS

### Solución 1: Crear Beneficios de Descuento en Tortas

```sql
-- Script SQL para ejecutar en Neon
-- Archivo: scripts/crear-beneficios-descuento-tortas.sql

-- ============================================
-- 1. CREAR BENEFICIOS DE DESCUENTO EN TORTAS
-- ============================================

-- Beneficio Bronce: 5% OFF en tortas
INSERT INTO "Beneficio" (
    id,
    nombre,
    "descripcionCaja",
    condiciones,
    "requiereEstadoExterno",
    activo,
    "createdAt",
    "updatedAt"
) VALUES (
    'beneficio-5porciento-tortas-bronce',
    '🎂 5% OFF en pedidos de tortas',
    'DESCUENTO 5% TORTAS - Aplicar 5% descuento en pedidos de tortas',
    jsonb_build_object(
        'tipo', 'DESCUENTO_TORTAS',
        'porcentajeDescuento', 5,
        'maxPorDia', 999,  -- Sin límite diario
        'maxPorMes', 999,  -- Sin límite mensual
        'icono', '🎂',
        'descripcion', '5% de descuento en todos tus pedidos de tortas'
    ),
    false,  -- No requiere estado externo
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    "descripcionCaja" = EXCLUDED."descripcionCaja",
    condiciones = EXCLUDED.condiciones,
    "updatedAt" = NOW();

-- Beneficio Plata: 10% OFF en tortas
INSERT INTO "Beneficio" (
    id,
    nombre,
    "descripcionCaja",
    condiciones,
    "requiereEstadoExterno",
    activo,
    "createdAt",
    "updatedAt"
) VALUES (
    'beneficio-10porciento-tortas-plata',
    '🎂 10% OFF en pedidos de tortas',
    'DESCUENTO 10% TORTAS - Aplicar 10% descuento en pedidos de tortas',
    jsonb_build_object(
        'tipo', 'DESCUENTO_TORTAS',
        'porcentajeDescuento', 10,
        'maxPorDia', 999,
        'maxPorMes', 999,
        'icono', '🎂',
        'descripcion', '10% de descuento en todos tus pedidos de tortas'
    ),
    false,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    "descripcionCaja" = EXCLUDED."descripcionCaja",
    condiciones = EXCLUDED.condiciones,
    "updatedAt" = NOW();

-- Beneficio Oro: 15% OFF en tortas
INSERT INTO "Beneficio" (
    id,
    nombre,
    "descripcionCaja",
    condiciones,
    "requiereEstadoExterno",
    activo,
    "createdAt",
    "updatedAt"
) VALUES (
    'beneficio-15porciento-tortas-oro',
    '🎂 15% OFF en pedidos de tortas',
    'DESCUENTO 15% TORTAS - Aplicar 15% descuento en pedidos de tortas',
    jsonb_build_object(
        'tipo', 'DESCUENTO_TORTAS',
        'porcentajeDescuento', 15,
        'maxPorDia', 999,
        'maxPorMes', 999,
        'icono', '🎂',
        'descripcion', '15% de descuento en todos tus pedidos de tortas'
    ),
    false,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    "descripcionCaja" = EXCLUDED."descripcionCaja",
    condiciones = EXCLUDED.condiciones,
    "updatedAt" = NOW();

-- ============================================
-- 2. ASIGNAR BENEFICIOS A NIVELES
-- ============================================

-- Bronce: 5%
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id, 'beneficio-5porciento-tortas-bronce'
FROM "Nivel" n
WHERE n.nombre = 'Bronce'
ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;

-- Plata: 10%
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id, 'beneficio-10porciento-tortas-plata'
FROM "Nivel" n
WHERE n.nombre = 'Plata'
ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;

-- Oro: 15%
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id, 'beneficio-15porciento-tortas-oro'
FROM "Nivel" n
WHERE n.nombre = 'Oro'
ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;

-- ============================================
-- 3. VERIFICACIÓN
-- ============================================

SELECT 
    n.nombre as nivel,
    b.nombre as beneficio,
    b.condiciones->>'porcentajeDescuento' as descuento
FROM "NivelBeneficio" nb
JOIN "Nivel" n ON nb."nivelId" = n.id
JOIN "Beneficio" b ON nb."beneficioId" = b.id
WHERE b.id LIKE 'beneficio-%tortas%'
ORDER BY n.orden;

-- ============================================
-- 4. DEPRECAR CAMPO ANTIGUO (FUTURO)
-- ============================================

/*
IMPORTANTE: NO ejecutar esto todavía. Primero:
1. Verificar que los beneficios nuevos funcionan
2. Actualizar el código para leer de beneficios en vez de descuentoPedidosTortas
3. Después ejecutar esto para limpiar:

UPDATE "Nivel" SET "descuentoPedidosTortas" = 0;

Y eventualmente remover el campo del schema.prisma en una migración futura.
*/
```

---

### Solución 2: Eliminar Referencias a "Platino"

**Archivos a modificar:**

#### A) `src/app/pass/page.tsx`
```typescript
// ELIMINAR línea 293
const nivelIcons: Record<string, string> = {
    'Bronce': '🥉',
    'Plata': '🥈',
    'Oro': '🥇',
    // 'Platino': '💎',  ← ELIMINAR
}
```

#### B) `src/app/logros/page.tsx`
```typescript
// ELIMINAR línea 50
const getNivelIcon = (nombreNivel: string): string => {
    const icons: Record<string, string> = {
        'Bronce': '🥉',
        'Plata': '🥈',
        'Oro': '🥇',
        // 'Platino': '💎',  ← ELIMINAR
    }
    return icons[nombreNivel] || '🎯'
}
```

#### C) `src/app/admin/components/EventosEspeciales.tsx`
```typescript
// ELIMINAR línea 305
<select>
  <option>Bronce</option>
  <option>Plata</option>
  <option>Oro</option>
  {/* <option>Platino</option>  ← ELIMINAR */}
</select>
```

#### D) `src/app/admin/components/Clientes.tsx`
```typescript
// ELIMINAR línea 259
<select>
  <option>Bronce</option>
  <option>Plata</option>
  <option>Oro</option>
  {/* <option>Platino</option>  ← ELIMINAR */}
</select>
```

---

### Solución 3: Investigar "Visita" al Completar Perfil

**Necesito más información:**

¿Podés ejecutar esta query en Neon para ver si hay EventoScan de tipo especial?

```sql
-- Ver si hay eventos de tipo "completar perfil" o similar
SELECT 
    es."metodoValidacion",
    es."notas",
    COUNT(*) as cantidad
FROM "EventoScan" es
WHERE es."notas" ILIKE '%perfil%'
   OR es."notas" ILIKE '%completar%'
   OR es."notas" ILIKE '%bonus%'
GROUP BY es."metodoValidacion", es."notas";

-- Ver primeros eventos de cada cliente
SELECT 
    c.nombre,
    c.telefono,
    MIN(es."timestamp") as primera_visita,
    es."metodoValidacion",
    es."notas"
FROM "Cliente" c
JOIN "EventoScan" es ON es."clienteId" = c.id
GROUP BY c.id, c.nombre, c.telefono, es."metodoValidacion", es."notas"
ORDER BY primera_visita DESC
LIMIT 20;
```

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Inmediato (Hoy)
1. ✅ Ejecutar script de beneficios de tortas en Neon
2. ✅ Eliminar referencias a "Platino" en los 4 archivos
3. ❓ Ejecutar queries de investigación sobre "visita al completar perfil"

### Fase 2: Después (Próxima sesión)
4. Actualizar código para leer descuentos de tortas desde beneficios (en vez de `descuentoPedidosTortas`)
5. Corregir lógica de "visita al completar perfil" según lo que encontremos
6. Deprecar campo `descuentoPedidosTortas` del schema

---

## 📝 Notas Importantes

1. **Beneficios de tortas:**
   - Por ahora conviven el campo viejo (`descuentoPedidosTortas`) y los beneficios nuevos
   - El código actual sigue usando el campo viejo
   - Los beneficios nuevos se verán en `/admin/beneficios` pero NO se aplicarán automáticamente
   - Necesitamos actualizar el código de WooCommerce para leer de beneficios

2. **Platino:**
   - Cambio seguro, solo visual
   - No afecta base de datos
   - Elimina confusión en admin y usuarios

3. **Visita al completar perfil:**
   - Necesito ver los resultados de las queries para diagnosticar
   - Posibles soluciones:
     - Marcar como "evento bonus" en vez de "visita"
     - Filtrar en estadísticas para no contarlo como visita real
     - Eliminar el otorgamiento de visita bonus

---

**¿Querés que proceda con Fase 1 (crear scripts y modificar archivos para eliminar Platino)?**
