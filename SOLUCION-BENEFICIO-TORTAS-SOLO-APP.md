# Solución: Ocultar Beneficio de Tortas del Scanner de Staff

## 🎯 Problema Real

El beneficio "bonificacion tortas 15% off" aparece en el scanner del staff, pero **NO debería** porque:
- ✅ Se aplica **automáticamente** al comprar tortas por la app
- ❌ **NO es canjeable** en el mostrador (no se escanea)
- ❌ Por eso nunca se marca como "usado" (porque nunca debió aparecer ahí)

## 📋 Soluciones Posibles

### Solución 1: Usar Campo en Condiciones (RÁPIDA - Sin Migración)

Agregar una propiedad `soloApp: true` en el JSON de condiciones del beneficio para indicar que no se muestra en el scanner.

#### A. Actualizar el Beneficio
```sql
-- Agregar flag soloApp al beneficio de tortas
UPDATE "Beneficio"
SET condiciones = jsonb_set(
  condiciones, 
  '{soloApp}', 
  'true'::jsonb, 
  true
)
WHERE nombre = 'bonificacion tortas 15% off';

-- Verificar
SELECT nombre, condiciones FROM "Beneficio" 
WHERE nombre = 'bonificacion tortas 15% off';
```

#### B. Filtrar en el Staff Scanner

Modificar [`src/app/api/clientes/validar-qr/route.ts`](../src/app/api/clientes/validar-qr/route.ts:79) para filtrar beneficios con `soloApp: true`:

```typescript
beneficiosActivos: beneficios
  .filter((b: any) => {
    const condiciones = b.condiciones as any
    return !condiciones?.soloApp  // ← Filtrar beneficios solo-app
  })
  .map((b: any) => ({
    id: b.id,
    nombre: b.nombre,
    descripcionCaja: b.descripcionCaja,
    requiereEstadoExterno: b.requiereEstadoExterno,
    condiciones: b.condiciones,
  })),
```

**Ventajas**:
- ✅ No requiere migración de BD
- ✅ Usa el campo `condiciones` existente
- ✅ Rápido de implementar

**Desventajas**:
- ⚠️ Menos explícito (hay que recordar que `soloApp` está en condiciones)

---

### Solución 2: Agregar Campo Dedicado (MEJOR - Requiere Migración)

Agregar un campo `canjeableEnMostrador` al modelo `Beneficio` para ser más explícito.

#### A. Crear Migración

```sql
-- prisma/migrations/YYYYMMDD_add_canjeable_mostrador/migration.sql
ALTER TABLE "Beneficio" 
ADD COLUMN "canjeableEnMostrador" BOOLEAN DEFAULT true;

-- Marcar beneficios solo-app como NO canjeables en mostrador
UPDATE "Beneficio"
SET "canjeableEnMostrador" = false
WHERE nombre ILIKE '%tortas%' OR nombre ILIKE '%descuento%tortas%';

-- Verificar
SELECT nombre, "canjeableEnMostrador" FROM "Beneficio";
```

#### B. Actualizar Schema

```prisma
// prisma/schema.prisma
model Beneficio {
  id                    String           @id @default(uuid())
  nombre                String
  descripcionCaja       String
  condiciones           Json
  requiereEstadoExterno Boolean          @default(false)
  estadoExternoTrigger  String?
  localDestinoId        String?
  activo                Boolean          @default(true)
  canjeableEnMostrador  Boolean          @default(true)  // ← NUEVO
  niveles               NivelBeneficio[]
  eventos               EventoScan[]
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
}
```

#### C. Actualizar Código del Scanner

Modificar [`src/app/api/clientes/validar-qr/route.ts`](../src/app/api/clientes/validar-qr/route.ts:65):

```typescript
// Obtener beneficios activos Y canjeables en mostrador
const beneficios = await getBeneficiosActivos(cliente.id)

// Filtrar solo los canjeables en mostrador
const beneficiosCanjeables = beneficios.filter((b: any) => b.canjeableEnMostrador !== false)

// Retornar información del cliente
return NextResponse.json({
  data: {
    ...
    beneficiosActivos: beneficiosCanjeables.map((b: any) => ({
      id: b.id,
      nombre: b.nombre,
      descripcionCaja: b.descripcionCaja,
      requiereEstadoExterno: b.requiereEstadoExterno,
      condiciones: b.condiciones,
    })),
    ...
  },
})
```

#### D. Actualizar Admin Panel (Opcional)

Agregar checkbox en el admin para marcar si un beneficio es canjeable en mostrador.

**Ventajas**:
- ✅ Más explícito y semántico
- ✅ Fácil de filtrar en queries
- ✅ Aparece en el admin para configurar

**Desventajas**:
- ⚠️ Requiere migración de BD
- ⚠️ Más cambios en el código

---

## ✅ Recomendación: Solución 1 (Rápida)

Para una solución inmediata, usa **Solución 1** (flag en condiciones):

### Pasos:
1. Ejecutar SQL para agregar `soloApp: true` al beneficio
2. Actualizar `validar-qr/route.ts` para filtrar beneficios con ese flag
3. El beneficio dejará de aparecer en el scanner

Si más adelante necesitas más beneficios solo-app o quieres mejor estructura, migra a **Solución 2**.

---

## 📝 Archivos a Modificar

### Solución 1 (Rápida):
1. [`scripts/marcar-beneficio-solo-app.sql`](../scripts/marcar-beneficio-solo-app.sql) - SQL para actualizar
2. [`src/app/api/clientes/validar-qr/route.ts`](../src/app/api/clientes/validar-qr/route.ts:79) - Filtrar en scanner

### Solución 2 (Completa):
1. `prisma/migrations/YYYYMMDD_add_canjeable_mostrador/migration.sql` - Migración
2. [`prisma/schema.prisma`](../prisma/schema.prisma:189) - Actualizar modelo
3. [`src/app/api/clientes/validar-qr/route.ts`](../src/app/api/clientes/validar-qr/route.ts) - Filtrar
4. [`src/lib/beneficios.ts`](../src/lib/beneficios.ts:11) - getBeneficiosActivos
5. Admin panel (opcional) - Checkbox para configurar

---

## 🎯 Resultado Esperado

Después de aplicar la solución:

### En el Staff Scanner:
- ❌ Beneficio "bonificacion tortas 15% off" **NO aparece**
- ✅ Otros beneficios (café, lavadero, etc.) **SÍ aparecen**

### En la App del Cliente:
- ✅ El descuento se sigue mostrando como beneficio del nivel
- ✅ Se aplica automáticamente al comprar tortas
- ℹ️ Aparece con badge "Solo online" o "Automático"

### Al Comprar Tortas por la App:
- ✅ El descuento se aplica automáticamente
- ✅ Se crea un EventoScan con `tipoEvento: 'BENEFICIO_APLICADO'`
- ✅ Se marca como usado correctamente

---

**Fecha**: 2026-02-28  
**Problema**: Beneficio de tortas aparece en scanner cuando no debería  
**Causa**: No hay forma de distinguir beneficios "solo-app" vs "canjeables"  
**Solución recomendada**: Agregar flag `soloApp` en condiciones
