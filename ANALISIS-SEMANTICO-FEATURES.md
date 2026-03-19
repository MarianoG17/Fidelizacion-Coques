# Análisis Semántico Profundo por Feature

**Fecha:** 2026-03-19
**Tipo:** Análisis de lógica de negocio (no sintáctico)
**Objetivo:** Encontrar bugs de lógica, inconsistencias, edge cases

---

## 🎯 RESUMEN EJECUTIVO

**Bugs Críticos Encontrados:** 5
**Bugs Medios:** 3
**Mejoras Recomendadas:** 8

**Estado:** Análisis completado al 80% - Features críticos cubiertos

---

## 🔴 BUGS CRÍTICOS

### Bug #1: Inconsistencia en Manejo de Timezone

**Severidad:** 🔴 Alta
**Archivos afectados:** 3

#### Problema:

Hay **2 formas diferentes** de manejar timezone de Argentina:

**Forma 1 (Correcta):** `src/lib/timezone.ts`
```typescript
export function getDatetimeArgentina(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }))
}
```

**Forma 2 (Inconsistente):** `src/app/api/eventos/route.ts:45`
```typescript
const ahoraArg = new Date(
  new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
)
```

**Forma 3 (Duplicada):** `src/app/api/pass/beneficios-disponibles/route.ts:47`
```typescript
const fechaArgentina = new Date(
    hoy.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
)
```

#### ¿Por qué es un bug?

1. **String hardcodeado** vs **constante** - Podría haber typos
2. **Duplicación de lógica** - Si cambia el timezone (ej: horario de verano), hay que modificar 3 lugares
3. **`setHours(0,0,0,0)` sobre Date local** - `beneficios.ts:121` usa timezone local del servidor, NO Argentina

```typescript
// ❌ INCORRECTO en beneficios.ts línea 120-121
const hoy = new Date()
hoy.setHours(0, 0, 0, 0)  // Esto usa timezone del servidor de Vercel (puede ser UTC)
```

#### Impacto:

- Si el servidor está en UTC, `hoy.setHours(0,0,0,0)` NO es medianoche en Argentina
- **Ejemplo:** Son las 23:00 en Argentina (02:00 UTC del día siguiente)
  - `new Date()` = 02:00 UTC (día siguiente)
  - `setHours(0,0,0,0)` = 00:00 UTC (día siguiente)
  - **Resultado:** Está comparando con el día siguiente, no hoy

#### Solución:

```typescript
// ✅ CORRECTO: Usar siempre getInicioHoyArgentina()
import { getInicioHoyArgentina } from '@/lib/timezone'

// En beneficios.ts línea 120
const hoy = getInicioHoyArgentina() // Ya devuelve medianoche Argentina
```

#### Archivos a corregir:
- `src/lib/beneficios.ts:120-121`
- `src/app/api/eventos/route.ts:45-46` (ya usa pattern inconsistente)
- `src/app/api/pass/beneficios-disponibles/route.ts:47-49`

---

### Bug #2: Beneficio de Cumpleaños - Problema con Año Bisiesto

**Severidad:** 🔴 Media-Alta
**Archivo:** `src/lib/beneficios.ts:87-91`

#### Problema:

```typescript
const cumpleanosEsteAno = new Date(
  ahora.getFullYear(),
  cumpleanos.getMonth(),
  cumpleanos.getDate()
)
```

**¿Qué pasa si el cliente nació el 29 de febrero?**

- `cumpleanos.getDate()` = 29
- En año no bisiesto (2023, 2025, 2026, etc.), febrero tiene 28 días
- `new Date(2023, 1, 29)` → **Marzo 1, 2023** (se desborda)

#### Impacto:

- Clientes nacidos el 29/feb NO reciben su beneficio de cumpleaños en años no bisiestos
- O lo reciben el 1 de marzo (fecha incorrecta)

#### Solución:

```typescript
// ✅ CORRECTO: Manejar 29 de febrero
let cumpleanosEsteAno = new Date(
  ahora.getFullYear(),
  cumpleanos.getMonth(),
  Math.min(cumpleanos.getDate(), new Date(ahora.getFullYear(), cumpleanos.getMonth() + 1, 0).getDate())
)
// Si es 29/feb en año no bisiesto, usa 28/feb
```

O mejor:

```typescript
const esBisiesto = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

if (cumpleanos.getMonth() === 1 && cumpleanos.getDate() === 29) {
  // Nacido el 29 de febrero
  if (!esBisiesto(ahora.getFullYear())) {
    // En año no bisiesto, usar 28 de febrero
    cumpleanosEsteAno = new Date(ahora.getFullYear(), 1, 28)
  } else {
    cumpleanosEsteAno = new Date(ahora.getFullYear(), 1, 29)
  }
} else {
  cumpleanosEsteAno = new Date(
    ahora.getFullYear(),
    cumpleanos.getMonth(),
    cumpleanos.getDate()
  )
}
```

---

### Bug #3: Google OAuth - Email No Verificado

**Severidad:** 🟡 Media
**Archivo:** `src/app/api/auth/google/route.ts` (línea ~40)

#### Problema:

No se verifica si el email de Google está verificado:

```typescript
const cliente = await prisma.cliente.create({
  data: {
    nombre: googleUser.name,
    email: googleUser.email, // ❌ No verifica googleUser.email_verified
  }
})
```

#### Impacto:

- Usuarios pueden registrarse con emails no verificados
- Riesgo de seguridad: alguien podría crear cuenta de Google con email ajeno

#### Solución:

```typescript
if (!googleUser.email_verified) {
  return NextResponse.json({
    error: 'Por favor verifica tu email en Google antes de continuar'
  }, { status: 400 })
}
```

---

### Bug #4: Race Condition en Creación de Auto

**Severidad:** 🟡 Media
**Archivo:** `src/app/api/webhook/deltawash/route.ts:104-149`

#### Problema:

```typescript
// Línea 104: Buscar auto existente
let auto = await prisma.auto.findFirst({
    where: { clienteId: cliente.id, patente: patenteNormalizada }
})

// Línea 115: Si no existe, crear
if (!auto) {
    auto = await prisma.auto.create({
        data: { ... }
    })
}
```

**¿Qué pasa si 2 webhooks llegan al mismo tiempo para la misma patente?**

1. Request A: `findFirst` → no encuentra → va a crear
2. Request B: `findFirst` → no encuentra → va a crear
3. Request A: `create` → OK
4. Request B: `create` → **ERROR: Unique constraint violation**

#### Impacto:

- Webhook puede fallar si hay requests concurrentes
- Auto del cliente no se registra

#### Solución:

Usar `upsert` en lugar de `findFirst` + `create`:

```typescript
const auto = await prisma.auto.upsert({
  where: {
    clienteId_patente: {  // Assuming compound unique key
      clienteId: cliente.id,
      patente: patenteNormalizada
    }
  },
  update: {
    marca: payload.marca || auto.marca,
    modelo: payload.modelo || auto.modelo,
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

**Nota:** Requiere agregar constraint único en schema:

```prisma
model Auto {
  @@unique([clienteId, patente])
}
```

---

### Bug #5: Feedback Modal - Evento Sin Validar Frecuencia

**Severidad:** 🟡 Media
**Archivo:** `src/components/FeedbackModal.tsx:46`
**Estado:** Ya documentado en `SOLUCION-FEEDBACK-FRECUENCIA.md`

Este bug ya lo identificamos anteriormente. NO verifica `feedbackFrecuenciaDias` antes de abrir.

---

## 🟡 BUGS MEDIOS / MEJORAS

### Mejora #1: Validación de Teléfono Inconsistente

**Archivos:**
- `src/lib/phone.ts` - Validación completa
- `src/components/CompletePhoneModal.tsx` - Validación en frontend
- `src/app/api/auth/complete-phone/route.ts` - Validación en backend

**Problema:** Frontend valida formato, pero backend NO valida que sea un teléfono válido de Argentina.

**Solución:** Backend debe usar la misma lógica de `phone.ts`

---

### Mejora #2: Límite de Visitas - Solo Verifica Local

**Archivo:** `src/app/api/eventos/route.ts:54-62`

```typescript
const visitaHoy = await prisma.eventoScan.findFirst({
  where: {
    clienteId,
    localId: local.id,  // ❌ Solo verifica en ESTE local
    contabilizada: true,
    tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
    timestamp: { gte: inicioHoy, lt: inicioManana },
  },
})
```

**Pregunta:** ¿Es intencional que un cliente pueda tener 1 visita por día **por local**?

**Comportamiento actual:**
- Cliente escanea QR en Coques Tortas → 1 visita hoy
- Cliente escanea QR en Coques Lavadero → Otra visita hoy ✅
- **Total:** 2 visitas en el mismo día

**Si NO es intencional**, remover `localId: local.id` del where

---

### Mejora #3: Passkeys - Token de Sesión Inconsistente

**Archivo:** `src/app/api/auth/passkey/login/route.ts:80`

```typescript
const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })
```

vs

**Archivo:** `src/app/api/auth/login/route.ts:45`

```typescript
const token = sign({ userId: cliente.id }, JWT_SECRET, { expiresIn: '7d' })
```

**Pregunta:** ¿Es intencional que Passkeys duren 30 días y login normal 7 días?

**Recomendación:** Unificar a 30 días (o usar constante)

---

## 📊 ANÁLISIS POR FEATURE

### ✅ Feature: Autenticación
- **Estado:** Analizado
- **Bugs encontrados:** 2 (Google OAuth, Passkeys token)
- **Riesgo:** Bajo-Medio

### ✅ Feature: Sistema de Beneficios
- **Estado:** Analizado
- **Bugs encontrados:** 2 (Timezone, Año bisiesto)
- **Riesgo:** Medio-Alto

### ✅ Feature: DeltaWash Webhook
- **Estado:** Analizado
- **Bugs encontrados:** 1 (Race condition)
- **Riesgo:** Medio

### ✅ Feature: Feedback
- **Estado:** Analizado
- **Bugs encontrados:** 1 (Ya documentado)
- **Riesgo:** Medio

### ⚠️ Features NO Analizados Completamente:
- WooCommerce Integration
- Sistema de Referidos
- Push Notifications
- Mesas/Salón

---

## 🎯 PRIORIDADES DE FIX

### Prioridad 1 (CRÍTICO - Hacer YA):
1. ✅ **Bug #1 - Timezone** - Afecta validación de beneficios
   - Archivo: `beneficios.ts:120-121`
   - Tiempo estimado: 10 min

2. ✅ **Bug #2 - Año Bisiesto** - Afecta beneficio cumpleaños
   - Archivo: `beneficios.ts:87-91`
   - Tiempo estimado: 15 min

### Prioridad 2 (ALTO - Esta semana):
3. **Bug #5 - Feedback Modal** - Ya documentado
   - Tiempo estimado: 15 min

4. **Bug #3 - Google OAuth** - Seguridad
   - Tiempo estimado: 5 min

### Prioridad 3 (MEDIO - Próximo sprint):
5. **Bug #4 - Race Condition** - Requiere migration de DB
   - Tiempo estimado: 30 min

6. **Mejoras #1, #2, #3** - Consistencia
   - Tiempo estimado: 20 min c/u

---

## 📝 NOTAS TÉCNICAS

### Sobre Timezones:

El problema fundamental es que `new Date()` devuelve timestamp UTC, pero luego se manipula localmente sin considerar offset.

**Regla de oro:**
- ✅ **SIEMPRE** usar funciones de `timezone.ts` para fechas en Argentina
- ❌ **NUNCA** usar `new Date()` directamente para comparaciones de "hoy", "mes", etc.

### Sobre Race Conditions:

Prisma NO tiene locks automáticos. Para evitar race conditions:
1. Usar `upsert` en lugar de `find` + `create`
2. Usar transactions con `serializable` isolation level
3. Usar unique constraints en DB

### Sobre Validaciones:

Frontend y Backend deben tener **misma lógica** (compartir funciones cuando sea posible).

---

## 🔍 METODOLOGÍA APLICADA

1. **Búsqueda de patrones críticos:**
   - Manejo de fechas/timezones
   - Operaciones sin validación
   - Lógica duplicada
   
2. **Análisis de flujos:**
   - Autenticación completa
   - Sistema de beneficios
   - Webhooks externos

3. **Edge cases:**
   - Año bisiesto
   - Concurrencia
   - Emails no verificados

---

## ✅ CONCLUSIÓN

**Bugs críticos encontrados:** 5
**Todos son fixables:** Sí
**Tiempo total estimado:** 2-3 horas

**Estado del código:** ⚠️ Bueno con mejoras necesarias
- Bugs encontrados son edge cases o inconsistencias
- NO hay bugs que rompan funcionalidad básica
- Código en general está bien estructurado

**Próximos pasos:**
1. Implementar fixes de Prioridad 1 y 2
2. Testing de edge cases
3. Documentar decisiones de diseño (ej: 1 visita por local vs global)

---

**Última actualización:** 2026-03-19 10:24
**Analista:** Claude (Code Mode)
**Cobertura:** ~80% de features críticos
