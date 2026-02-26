# Solución: Visitas Bonus Aparecían en Historial de Mostrador

## 🐛 Problema Identificado

Las **visitas bonus** (que no son visitas físicas reales) estaban apareciendo en el historial de clientes en mostrador, mostrando personas que nunca visitaron el local físicamente pero tenían visitas registradas por:

- Ser referidos por otro cliente
- Completar el cuestionario de satisfacción
- Procesamiento retroactivo de estados del lavadero
- Otros eventos automáticos del sistema

## 🔍 Causa Raíz

El endpoint [`/api/local/historial-escaneos`](./src/app/api/local/historial-escaneos/route.ts) filtraba eventos por:
- `tipoEvento: 'VISITA'`
- `mesaId: null` (para excluir clientes sentados en mesas)

Sin embargo, las **visitas bonus también tienen `mesaId: null`** porque no ocurren en una mesa específica, causando que aparezcan mezcladas con las visitas reales de mostrador.

## ✅ Solución Implementada

### 1. Modificación del Endpoint de Historial

Se actualizó [`src/app/api/local/historial-escaneos/route.ts`](./src/app/api/local/historial-escaneos/route.ts) para excluir visitas bonus basándose en palabras clave en el campo `notas`:

```typescript
where: {
    localId: local.id,
    tipoEvento: { in: ['VISITA', 'BENEFICIO_APLICADO'] },
    timestamp: { gte: inicioHoy },
    mesaId: null, // Solo clientes en mostrador (no en salón)
    NOT: {
        AND: [
            { tipoEvento: 'VISITA' },
            {
                OR: [
                    { notas: { contains: 'bonus', mode: 'insensitive' } },
                    { notas: { contains: 'referir', mode: 'insensitive' } },
                    { notas: { contains: 'cuestionario', mode: 'insensitive' } },
                    { notas: { contains: 'retroactivamente', mode: 'insensitive' } },
                ]
            }
        ]
    }
}
```

### 2. Palabras Clave Detectadas

Las visitas bonus se identifican por estas palabras en el campo `notas`:
- **"bonus"** - Visitas de recompensa general
- **"referir"** - Visitas por referir amigos
- **"cuestionario"** - Visitas por completar encuesta
- **"retroactivamente"** - Visitas procesadas después del hecho

### 3. Lugares donde se Registran Visitas Bonus

Las visitas bonus se crean en:

1. **Registro con referido** ([`src/app/api/auth/register/route.ts:205-214`](./src/app/api/auth/register/route.ts:205))
   ```typescript
   notas: `Visita bonus por referir a ${validatedData.nombre}`
   ```

2. **Completar cuestionario** ([`src/app/api/perfil/cuestionario/route.ts:63-72`](./src/app/api/perfil/cuestionario/route.ts:63))
   ```typescript
   notas: 'Visita bonus por completar cuestionario'
   ```

3. **Procesamiento retroactivo de autos** ([`src/app/api/auth/register/route.ts:163-177`](./src/app/api/auth/register/route.ts:163))
   ```typescript
   notas: `Auto ${pendiente.patente}: ${pendiente.estado} (procesado retroactivamente)`
   ```

## 🧪 Verificación

### Script SQL de Investigación

Creado [`scripts/investigar-visitas-bonus-mostrador.sql`](./scripts/investigar-visitas-bonus-mostrador.sql) para analizar:

1. Todas las visitas con `mesaId: null`
2. Visitas identificadas como bonus por palabras clave
3. Comparación de visitas reales vs bonus por cliente
4. Métodos de validación utilizados

### Pruebas Recomendadas

1. **Verificar historial de mostrador:**
   - Abrir la PWA del staff o navegador
   - Verificar que solo aparezcan clientes que realmente escanearon QR en mostrador
   - Confirmar que clientes con solo visitas bonus NO aparezcan

2. **Ejecutar script SQL:**
   ```sql
   -- Ver clientes con visitas bonus que NO deberían aparecer
   SELECT 
     c.nombre,
     c.phone,
     e.notas,
     e.timestamp
   FROM "EventoScan" e
   JOIN "Cliente" c ON e."clienteId" = c.id
   WHERE e."tipoEvento" = 'VISITA'
     AND e."mesaId" IS NULL
     AND (
       e.notas ILIKE '%bonus%'
       OR e.notas ILIKE '%referir%'
       OR e.notas ILIKE '%cuestionario%'
     )
   ORDER BY e.timestamp DESC;
   ```

3. **Probar escenarios:**
   - Cliente A refiere a Cliente B → Solo Cliente A aparece en historial si escanea físicamente
   - Cliente completa cuestionario → No aparece en historial hasta que escanee QR
   - Cliente registrado desde lavadero → No aparece hasta visitar físicamente

## 📊 Impacto

### Beneficios
- ✅ Historial de mostrador ahora muestra **solo visitas físicas reales**
- ✅ Staff puede confiar en la información mostrada
- ✅ Evita confusión sobre clientes que "nunca vinieron"
- ✅ Mantiene integridad de las visitas bonus para niveles y beneficios

### Sin Efectos Negativos
- ✅ Las visitas bonus **siguen contando** para subir de nivel
- ✅ Los beneficios y logros **no se ven afectados**
- ✅ El sistema de referidos **funciona igual**
- ✅ Solo cambia la visualización en el historial del staff

## 🚀 Despliegue

1. Hacer commit de los cambios
2. Hacer push a GitHub
3. Vercel desplegará automáticamente
4. Verificar en producción que el historial muestre solo visitas reales

## 📝 Notas Adicionales

- **Todas las visitas bonus usan `metodoValidacion: 'OTP_MANUAL'`** porque no son escaneos QR reales
- **El campo `contabilizada: true`** se mantiene para que sumen a niveles
- **La distinción se hace solo en UI del staff**, no afecta lógica de negocio

## 🔮 Mejoras Futuras (Opcional)

Si se necesita una solución más robusta, considerar:

1. **Agregar campo `esVisitaFisica: boolean`** al modelo `EventoScan`
2. **Agregar enum `TipoVisita`** (FISICA, BONUS_REFERIDO, BONUS_CUESTIONARIO, etc.)
3. **Crear índice** para búsquedas más rápidas

Por ahora, la solución basada en `notas` es suficiente y no requiere migración de base de datos.
