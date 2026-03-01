# Análisis: Feedback por Pedidos de Tortas

## Situación Actual

### Sistema Implementado
- ✅ **Feedback por visita física**: Notificación 10 minutos después del escaneo en mostrador
- ✅ **Limitación**: Una notificación cada 7 días (configurable via `feedbackFrecuenciaDias`)

## Propuesta Evaluada

### Agregar feedback por pedidos confirmados
- Trigger: 24 horas después de que el pedido cambie a estado "ENTREGADO/COBRADO/PROCESADO"
- Tiempo configurado: `feedbackDiasPedidoTorta = 1` día

## Problema Identificado ⚠️

### Escenario típico de pedido:
1. **Cliente hace pedido online** → Presupuesto creado
2. **Fecha de entrega llegó** → Cliente viene a retirar
3. **Empleado escanea QR del cliente** → Registra visita física
   - ⏰ 10 minutos después → **Notificación de feedback #1**
4. **24 horas después de retirado** → **Notificación de feedback #2** ❌

### Resultado: Cliente recibe 2 notificaciones por la misma experiencia

## Análisis de Soluciones

### Opción 1: Mantener solo feedback por visita física (RECOMENDADO ✅)
**Ventajas:**
- ✅ Simple y directo
- ✅ Captura la experiencia completa (producto + atención)
- ✅ No es redundante
- ✅ Feedback cercano a la experiencia (10 min vs 24 horas)

**Desventajas:**
- ❌ No captura feedback de pedidos con delivery (si se implementa en el futuro)

### Opción 2: Dual con limitación de 7 días
**Ventajas:**
- ✅ La limitación de 7 días evita duplicados si retira rápido
- ✅ Podría capturar feedback de pedidos delivery

**Desventajas:**
- ❌ Si retira al día siguiente, ambas notificaciones caen en la misma semana
- ❌ Complejidad innecesaria
- ❌ Usuario puede confundirse con dos notificaciones

### Opción 3: Feedback por pedidos SOLO si no hubo visita física
**Lógica:**
```typescript
// Al generar notificación por pedido:
// 1. Verificar si hubo visita física en las últimas 48 horas
// 2. Si hubo visita → NO generar notificación (ya la recibió)
// 3. Si NO hubo visita → Generar notificación por pedido
```

**Ventajas:**
- ✅ Cubre ambos casos sin duplicar
- ✅ Útil para delivery futuro

**Desventajas:**
- ❌ Complejidad adicional
- ❌ Actualmente no hay delivery, es innecesario

### Opción 4: Feedback por pedidos SOLO para delivery
**Lógica:**
```typescript
// Agregar campo en Presupuesto: tipoEntrega: "RETIRO" | "DELIVERY"
// Solo generar notificación si tipoEntrega === "DELIVERY"
```

**Ventajas:**
- ✅ No se superpone con visitas físicas
- ✅ Útil cuando implementen delivery

**Desventajas:**
- ❌ Requiere modificar modelo Presupuesto
- ❌ Actualmente no existe delivery

## Recomendación Final

### ✅ Mantener solo el sistema actual (Opción 1)

**Razones:**
1. **No hay delivery actualmente** - Todos los pedidos son retiro en local
2. **El escaneo captura todo** - Cuando retiran, se registra la visita física
3. **Feedback más cercano** - 10 minutos es mejor que 24 horas para capturar la experiencia
4. **Simplicidad** - Menos código, menos bugs, mejor mantenimiento

**La limitación de 7 días ES suficiente** porque:
- Evita spam de notificaciones
- Cliente típicamente no viene más de 1 vez por semana
- Si viene más seguido, ya dieron feedback reciente

## Implementación Futura (si agregan delivery)

Cuando implementen delivery, se podría:

1. **Agregar campo en Presupuesto:**
```prisma
model Presupuesto {
  // ... campos existentes
  tipoEntrega  String?  // "RETIRO" | "DELIVERY"
}
```

2. **Modificar generación de notificaciones:**
```typescript
async function generarNotificacionesPedidoEntregado(clienteId: string) {
  // Buscar pedidos entregados hace X días
  const pedidos = await prisma.presupuesto.findMany({
    where: {
      clienteId,
      estado: 'ENTREGADO',
      tipoEntrega: 'DELIVERY', // ← Solo delivery
      confirmadoEn: {
        gte: hace24Horas,
        lte: hace48Horas
      }
    }
  })
  
  // Verificar si NO hubo visita física reciente
  const visitaReciente = await prisma.eventoScan.findFirst({
    where: {
      clienteId,
      timestamp: { gte: hace48Horas }
    }
  })
  
  if (!visitaReciente && pedidos.length > 0) {
    // Crear notificación FEEDBACK_PENDIENTE
  }
}
```

## Configuración Actual

En `ConfiguracionApp`:
```prisma
feedbackHabilitado          Boolean  @default(true)
feedbackTiempoVisitaMinutos Int      @default(10)   // ✅ Activo
feedbackDiasPedidoTorta     Int      @default(1)    // ⏸️ Reservado para futuro
feedbackFrecuenciaDias      Int      @default(7)    // ✅ Activo
feedbackMinEstrellas        Int      @default(4)    // ✅ Activo
```

## Conclusión

**No implementar feedback por pedidos de tortas en este momento.**

Mantener el sistema actual que es:
- ✅ Simple
- ✅ Efectivo
- ✅ No redundante
- ✅ Fácil de mantener

La limitación de **7 días entre feedbacks** es suficiente para evitar spam y mantener una buena experiencia de usuario.

---

**Fecha de análisis:** 2026-03-01  
**Estado:** Sistema actual es óptimo para el modelo de negocio actual (sin delivery)
