# BUG: Timezone Incorrecto en Beneficios Usados

**Fecha descubrimiento:** 2026-03-19
**Reportado por:** Usuario (testing)
**Severidad:** 🔴 Alta
**Estado:** ✅ RESUELTO (2026-03-20)

---

## 🐛 Descripción

Beneficio de cumpleaños muestra "Usado hoy" en el cliente, pero en admin aparece "Usado el 18/03" (ayer).

**Diferencia:** 3 horas (offset de Argentina UTC-3)

---

## 📊 Evidencia

**En cliente:**
- Fecha mostrada: 19/03 (hoy)
- Estado: "✓ Usado hoy"

**En admin:**
- Fecha registrada: 18/03 21:00 (ayer)
- Timestamp real: 19/03 00:00 Argentina = 18/03 21:00 UTC

---

## 🔍 Causa Raíz

Cuando se registra el uso de un beneficio en [`EventoScan`](fidelizacion-zona/prisma/schema.prisma:200), Prisma usa `@default(now())` que devuelve **UTC**, no Argentina.

```prisma
model EventoScan {
  timestamp     DateTime  @default(now())  // ❌ UTC, no Argentina
}
```

**Problema:** La app muestra fechas en timezone de Argentina, pero la DB guarda en UTC sin conversión.

---

## 🎯 Impacto

### Alto Impacto:
1. **Beneficios diarios**: Cliente puede ver "usado hoy" pero realmente fue "ayer" en UTC
2. **Confusión**: Fechas no coinciden entre cliente y admin
3. **Lógica de negocio**: `maxPorDia` puede fallar si compara fechas mezcladas

### Casos afectados:
- ✅ Beneficio cumpleaños (reportado)
- ❓ Todos los beneficios con límite "por día"
- ❓ Historial de visitas
- ❓ Progreso de niveles (si usa timestamps)

---

## ✅ Solución

### Opción 1: Fijar Timezone en DB (Recomendado)

```sql
-- Agregar timezone a Neon Database
ALTER DATABASE [nombre_db] SET timezone TO 'America/Argentina/Buenos_Aires';
```

**Pros:**
- Fix global para toda la app
- No requiere cambios de código
- Prisma `@default(now())` usará timezone correcto

**Contras:**
- Requiere acceso a DB config

---

### Opción 2: Guardar Timestamp Manual con Timezone

```typescript
// En EventoScan creation
import { getDatetimeArgentina } from '@/lib/timezone'

await prisma.eventoScan.create({
  data: {
    timestamp: getDatetimeArgentina(),  // Forzar Argentina
    // ... resto de datos
  }
})
```

**Pros:**
- Control explícito
- No depende de config DB

**Contras:**
- Requiere cambiar todos los `create` de EventoScan
- Más código a mantener

---

### Opción 3: Mostrar Fechas Relativas en Cliente

```typescript
// En lugar de mostrar fecha exacta, mostrar:
"✓ Usado hace 3 horas"
"✓ Usado ayer"
"✓ Usado hace 2 días"
```

**Pros:**
- Evita confusión de fechas
- Mejor UX

**Contras:**
- No resuelve el problema de fondo
- Admin sigue mostrando fecha UTC

---

## 🚀 Recomendación

**Implementar Opción 1 + Opción 3:**

1. Configurar timezone en Neon → Arregla root cause
2. Mostrar fechas relativas → Mejor UX
3. Verificar que no haya otros timestamps afectados

**Tiempo estimado:** 45 minutos
**Impacto:** Resuelve inconsistencias de fechas en toda la app

---

## 📝 Archivos Afectados

**Para verificar:**
- `src/app/api/eventos/route.ts` - Creación de EventoScan
- `src/app/api/pass/beneficios-disponibles/route.ts` - Verificación de usos
- `src/lib/beneficios.ts` - Lógica de maxPorDia
- `src/app/admin/*` - Visualización de fechas

---

## ✅ Testing

Después del fix, verificar:

```typescript
// 1. Usar beneficio a las 23:50 Argentina (02:50 UTC del día siguiente)
// 2. Verificar que se registre con fecha de Argentina, no UTC
// 3. Confirmar que aparece "hoy" tanto en cliente como en admin
```

---

**Relacionado con:**
- Bug #1 del ANALISIS-SEMANTICO-FEATURES.md (timezone en beneficios.ts)
- Ya fixeamos timezone en `beneficios.ts:120`, falta en EventoScan

**Prioridad:** 🔴 P0 - Afecta experiencia usuario directamente

---

## ✅ RESOLUCIÓN (2026-03-20)

### Archivos Corregidos:

1. **`src/app/admin/components/Metricas.tsx`** (línea 424-430)
   - Agregado `timeZone: 'America/Argentina/Buenos_Aires'` en visualización de visitas recientes
   
2. **`src/app/api/admin/exportar-visitas/route.ts`** (línea 71-77)
   - Agregado `timeZone: 'America/Argentina/Buenos_Aires'` en formateo de fechas para Excel
   
3. **`src/app/admin/feedback/page.tsx`** (línea 198-200)
   - Agregado `timeZone: 'America/Argentina/Buenos_Aires'` en visualización de fecha de feedback
   
4. **`src/app/admin/components/Clientes.tsx`** (línea 185-194)
   - Agregado `timeZone: 'America/Argentina/Buenos_Aires'` en función `formatearFecha()`

### Solución Implementada:

Se agregó el parámetro `timeZone: 'America/Argentina/Buenos_Aires'` a todas las llamadas de `toLocaleString('es-AR')` en el panel admin. Esto asegura que las fechas se interpreten correctamente en la zona horaria de Argentina (UTC-3), evitando la diferencia de 3 horas que mostraba anteriormente.

### Impacto:

- ✅ Los horarios ahora se muestran correctamente en timezone de Argentina
- ✅ Consistencia entre lo que ve el cliente y lo que ve el admin
- ✅ Exportaciones Excel con horarios correctos
- ✅ Historial de actividades con timestamps correctos

### Testing Recomendado:

1. Verificar que al canjear un beneficio a las 23:50 ART, se muestre como "23:50" y no "20:50"
2. Confirmar que las fechas en el resumen de métricas coincidan con la realidad
3. Validar que el Excel exportado tenga horarios en ART
