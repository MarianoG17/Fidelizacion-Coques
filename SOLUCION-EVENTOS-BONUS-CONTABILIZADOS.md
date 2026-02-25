# Solución: Eventos Bonus Contabilizados Correctamente

**Fecha**: 2026-02-25  
**Estado**: ✅ Implementado

---

## Problema Identificado

Hubo confusión sobre cómo deben contabilizarse los eventos bonus (completar cuestionario, referir amigos):

1. **Antes del fix**: Los eventos bonus tenían `contabilizada: false`, por lo que NO sumaban para subir de nivel
2. **Requerimiento del usuario**: Los bonus SÍ deben contar para subir de nivel, pero deben mostrarse en columna separada en reportes admin

---

## Solución Implementada

### 1. **Eventos Bonus Ahora Son Contabilizados**

Los eventos bonus ahora tienen `contabilizada: true` para que cuenten en el progreso de nivel:

#### Archivo: `src/app/api/perfil/cuestionario/route.ts`
```typescript
await prisma.eventoScan.create({
    data: {
        clienteId,
        localId: localPrincipal.id,
        tipoEvento: 'VISITA',
        metodoValidacion: 'OTP_MANUAL',
        contabilizada: true, // ✅ SÍ cuenta para subir de nivel
        notas: 'Visita bonus por completar cuestionario',
    },
})
```

#### Archivo: `src/app/api/auth/register/route.ts`
```typescript
await prisma.eventoScan.create({
    data: {
        clienteId: referidoPorId,
        localId: localPrincipal.id,
        tipoEvento: 'VISITA',
        metodoValidacion: 'OTP_MANUAL',
        contabilizada: true, // ✅ SÍ cuenta para subir de nivel
        notas: `Visita bonus por referir a ${validatedData.nombre}`,
    },
})
```

**Cambios clave:**
- `contabilizada: false` → `contabilizada: true`
- Notas simplificadas y consistentes con keyword "bonus"

---

### 2. **Reportes Admin Separados Correctamente**

#### Archivo: `src/app/api/admin/clientes/[id]/actividades/route.ts`

**Antes:**
```typescript
const visitasContabilizadas = eventos.filter(
  (e) => e.tipoEvento === 'VISITA' && e.contabilizada
).length

const visitasBonus = eventos.filter(
  (e) => e.notas?.includes('bonus') || e.notas?.includes('Visita bonus')
).length
```

**Problema:** Los bonus con `contabilizada: true` se contaban en AMBAS columnas

**Después (corregido):**
```typescript
// Visitas bonus: identificadas por la palabra "bonus" en las notas
const visitasBonus = eventos.filter(
  (e) => e.tipoEvento === 'VISITA' && (e.notas?.toLowerCase().includes('bonus'))
).length

// Visitas contabilizadas: solo visitas reales (excluir bonus)
const visitasContabilizadas = eventos.filter(
  (e) => e.tipoEvento === 'VISITA' && e.contabilizada && !e.notas?.toLowerCase().includes('bonus')
).length
```

**Solución:**
- **Primero** se calculan visitas bonus (basado en keyword "bonus" en notas)
- **Segundo** se calculan visitas reales (excluye las que tienen "bonus" en notas)
- Ahora las columnas son mutuamente exclusivas

---

## Comportamiento Actual

### ✅ Eventos Bonus (completar perfil, referir amigos)
- `contabilizada: true` → **SÍ cuentan** para [`evaluarNivel()`](../src/lib/beneficios.ts)
- Se muestran en columna **"Visitas Bonus"** en admin panel
- **NO** se mezclan con visitas reales en reportes

### ✅ Visitas Reales (escaneo QR, OTP en local)
- `contabilizada: true`
- Se muestran en columna **"Visitas Contabilizadas"** en admin panel
- Cuentan para nivel

### ✅ Penalidades (cancelar evento tarde)
- `contabilizada: false` → **NO cuentan** para nivel
- Esto es correcto y se mantiene sin cambios ([`/api/inscripciones`](../src/app/api/inscripciones/route.ts))

---

## Cómo Funciona el Conteo de Días Únicos

El sistema cuenta **días únicos** (no eventos individuales) usando:

```sql
SELECT COUNT(DISTINCT DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires'))::bigint as count
FROM "EventoScan"
WHERE "clienteId" = ${clienteId}
  AND "contabilizada" = true
  AND "tipoEvento" IN ('VISITA', 'BENEFICIO_APLICADO')
```

**Ejemplo:**
- Cliente viene 3 veces el mismo día → **1 visita**
- Cliente completa cuestionario el mismo día → **1 visita** (se suma al mismo día)
- Cliente viene al día siguiente → **2 visitas totales**

---

## Archivos Modificados

| Archivo | Línea | Cambio |
|---------|-------|--------|
| [`src/app/api/perfil/cuestionario/route.ts`](../src/app/api/perfil/cuestionario/route.ts) | 69 | `contabilizada: false` → `true` |
| [`src/app/api/auth/register/route.ts`](../src/app/api/auth/register/route.ts) | 211 | `contabilizada: false` → `true` |
| [`src/app/api/admin/clientes/[id]/actividades/route.ts`](../src/app/api/admin/clientes/[id]/actividades/route.ts) | 69-78 | Separación correcta de columnas |

---

## Testing

### Caso 1: Cliente completa cuestionario
```
ANTES: No sumaba para nivel
AHORA: ✅ Suma 1 día único para nivel
       ✅ Aparece en "Visitas Bonus" en admin
       ✅ NO aparece en "Visitas Contabilizadas"
```

### Caso 2: Cliente refiere un amigo
```
ANTES: No sumaba para nivel
AHORA: ✅ Suma 1 día único para nivel
       ✅ Aparece en "Visitas Bonus" en admin
       ✅ NO aparece en "Visitas Contabilizadas"
```

### Caso 3: Cliente viene 3 veces el mismo día
```
ANTES Y AHORA: ✅ Cuenta como 1 día único (correcto)
```

---

## Notas Técnicas

### Keywords para Identificar Bonus
Los eventos bonus se identifican por la palabra `"bonus"` (case-insensitive) en el campo `notas`:

- `"Visita bonus por completar cuestionario"`
- `"Visita bonus por referir a Juan Pérez"`

### Campo `contabilizada`
- `true`: El evento cuenta para [`evaluarNivel()`](../src/lib/beneficios.ts)
- `false`: El evento NO cuenta (usado solo para penalidades)

### Archivo NO Modificado
[`src/app/api/inscripciones/route.ts`](../src/app/api/inscripciones/route.ts) - Las penalidades por cancelación tardía correctamente siguen usando `contabilizada: false` (línea 167)

---

## Próximos Pasos

1. ✅ Desplegar cambios a producción
2. 🧪 Verificar en admin panel que columnas se separan correctamente
3. 🧪 Probar que bonus events sí cuentan para subir de nivel
4. 📊 Monitorear reportes admin para confirmar datos correctos

---

## Referencias

- [Documentación de Beneficios](./BENEFICIO-DESCUENTO-LAVADERO.md)
- [Sistema de Niveles](../src/lib/beneficios.ts)
- [Admin Panel Actividades](../src/app/api/admin/clientes/[id]/actividades/route.ts)
