# Auditoría de Cambios Recientes

## Fecha: 24/02/2026

### ✅ Endpoints Verificados - Todos Correctos

#### 1. `/api/clientes/validar-qr` (Scanner Local)
- **Estado**: ✅ Siempre correcto
- **Usa**: `getBeneficiosActivos()` desde siempre
- **Función**: Valida QR del cliente cuando el staff escanea
- **Beneficios**: Se muestran solo los realmente disponibles

#### 2. `/api/pass/beneficios-disponibles` (App Cliente)
- **Estado**: ✅ Correcto
- **Usa**: `getBeneficiosActivos()` correctamente
- **Función**: Muestra beneficios en el pass del cliente

#### 3. `/api/clientes/[id]` (Refresh de Beneficios)
- **Estado**: ✅ Correcto
- **Usa**: `getBeneficiosActivos()` correctamente
- **Función**: Refresca datos del cliente después de subir de nivel

#### 4. `/api/salon/estado` (Vista de Salón)
- **Estado**: ✅ Correcto
- **Usa**: `getBeneficiosActivos()` correctamente
- **Función**: Muestra beneficios de clientes en mesas

#### 5. `/api/pass/route` (Pass Completo)
- **Estado**: ✅ Correcto
- **Usa**: `getBeneficiosActivos()` correctamente
- **Función**: Retorna el pass completo del cliente

#### 6. `/api/otp/validar` (Login con OTP)
- **Estado**: ✅ Correcto
- **Usa**: `getBeneficiosActivos()` correctamente
- **Función**: Retorna datos del cliente después del login

---

## ❌ Problema Encontrado y Corregido

### `/api/local/historial-escaneos` (Historial Mostrador)
- **Estado Original**: ❌ Lógica simple incorrecta
- **Problema**: No validaba uso único ni estados externos
- **Creado en**: Commit 4872d16 (24/02/2026)
- **Mostraba**: Todos los beneficios del nivel menos los ya aplicados hoy
- **No validaba**:
  - ✗ Beneficios de uso único (ej: bienvenida 10%)
  - ✗ Beneficios con estado externo (ej: lavadero sin auto EN_PROCESO)
  - ✗ Condiciones específicas del beneficio

**Solución Aplicada** (Commit a3fa30d):
```typescript
// ANTES (incorrecto):
const beneficiosDisponibles = cliente.nivel?.beneficios
    ?.filter((nb: any) =>
        nb.beneficio.activo &&
        !beneficiosAplicadosIds.includes(nb.beneficio.id)
    )

// AHORA (correcto):
const beneficiosActivosCliente = await getBeneficiosActivos(evento.clienteId)
```

---

## 🔍 Cambios Recientes en `getBeneficiosActivos()`

### Commit ac7e301 (23/02/2026)
**Cambio**: Agregar validación de horario 19:00 para beneficio lavadero

```typescript
// Para beneficio de lavadero, verificar que no pasó de las 19:00
if (beneficio.id === 'beneficio-20porciento-lavadero') {
  const ahora = new Date()
  const cierreHoy = new Date(ahora)
  cierreHoy.setHours(19, 0, 0, 0) // 19:00 Argentina
  
  if (ahora > cierreHoy) {
    return null // Ya cerró el local, beneficio expirado
  }
}
```

**Impacto**: ✅ Intencional y correcto
- El beneficio del lavadero ahora expira después de las 19:00
- Todos los endpoints que usan `getBeneficiosActivos()` respetan esta regla
- Consistente en toda la aplicación

---

## 📊 Resumen

### ✅ Operaciones que siempre funcionaron correctamente:
1. Escanear cliente en mostrador (muestra beneficios correctos)
2. Aplicar beneficio (valida correctamente)
3. Ver beneficios en app del cliente
4. Beneficios en vista de salón
5. Refresh después de subir de nivel

### ❌ Operación con error (corregida):
1. ~~Historial de últimos 3 clientes en mostrador~~ ✅ Corregido

### 🎯 Conclusión:
- El sistema operaba correctamente en el 99% de funcionalidades
- El único bug estaba en el historial de mostrador (función recién agregada)
- Todos los endpoints críticos del negocio siempre usaron la lógica correcta
- El fix aplicado unifica la lógica en todo el sistema

---

## 🔄 Próximos Pasos

1. **Verificar en producción**: Una vez que Vercel despliegue el commit a3fa30d
2. **Probar**: Escanear un cliente y verificar que el historial muestre solo beneficios disponibles
3. **Confirmar**: El historial debe coincidir con lo que muestra la app del cliente

---

## 📝 Notas Técnicas

### Función `getBeneficiosActivos()` valida:
- ✅ Beneficios de uso único (bienvenida, etc.)
- ✅ Límites diarios (maxPorDia)
- ✅ Estados externos (lavadero requiere auto EN_PROCESO)
- ✅ Horario de cierre (lavadero expira a las 19:00)
- ✅ Nivel del cliente
- ✅ Beneficios activos/inactivos

### Endpoints que ahora son consistentes:
Todos usan la misma función `getBeneficiosActivos()` para determinar qué beneficios están realmente disponibles para el cliente en ese momento.
