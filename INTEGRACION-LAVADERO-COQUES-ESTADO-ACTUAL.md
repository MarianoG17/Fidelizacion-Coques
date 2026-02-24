# 🚗 Integración Lavadero ↔️ Coques - Estado Actual

## 📋 Resumen Ejecutivo

La integración entre el lavadero y la app de fidelización Coques está **parcialmente implementada** con dos enfoques que coexisten:

1. ✅ **Sistema interno propio** - Panel `/lavadero` con DB de fidelización
2. ⚠️ **Integración DeltaWash Legacy** - Consulta read-only a DB externa (opcional)

---

## 🎯 Funcionalidades Implementadas

### 1. Panel del Lavadero (`/lavadero`)

**Estado:** ✅ Implementado y funcional

**Características:**
- Login con autenticación JWT para empleados
- Registro de autos por teléfono + patente
- Actualización de estados: `EN_PROCESO` → `LISTO` → `ENTREGADO`
- Scanner QR para identificar clientes rápidamente
- Vista de autos activos en proceso
- Botón de logout

**Endpoints usados:**
- `POST /api/auth/empleado/login` - Login empleados
- `POST /api/estados-auto` - Actualizar estado de auto
- `GET /api/estados-auto?clienteId=...` - Consultar autos del cliente

**Archivos:**
- [`/src/app/lavadero/page.tsx`](fidelizacion-zona/src/app/lavadero/page.tsx)
- [`/src/app/lavadero/login/page.tsx`](fidelizacion-zona/src/app/lavadero/login/page.tsx)
- [`/src/app/api/estados-auto/route.ts`](fidelizacion-zona/src/app/api/estados-auto/route.ts)

---

### 2. Registro de Autos en DB Fidelización

**Estado:** ✅ Implementado

**Modelo de datos:**
```prisma
model Auto {
  id             String      @id @default(uuid())
  clienteId      String
  cliente        Cliente     @relation(fields: [clienteId], references: [id])
  patente        String      // Normalizada: "ABC123" o "AB123CD"
  marca          String?
  modelo         String?
  alias          String?     // "Auto de trabajo", "El familiar"
  activo         Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  estadoActual   EstadoAuto? @relation(fields: [estadoActualId], references: [id])
  estadoActualId String?     @unique
}

model EstadoAuto {
  id         String     @id @default(uuid())
  clienteId  String
  cliente    Cliente    @relation(fields: [clienteId], references: [id])
  patente    String
  estado     String     // "EN_PROCESO", "LISTO", "ENTREGADO"
  localId    String?
  local      Local?     @relation(fields: [localId], references: [id])
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  auto       Auto?
}
```

**Funcionalidad:**
- Cada cliente puede tener múltiples autos
- Cada auto tiene un estado actual
- Estados se actualizan desde el panel del lavadero
- Los clientes ven el estado en `/pass`

---

### 3. Visualización para Clientes

**Estado:** ✅ Implementado en `/pass`

**Dónde se muestra:**
- Tarjeta de pase del cliente ([`/src/app/pass/page.tsx`](fidelizacion-zona/src/app/pass/page.tsx))
- App del local al escanear QR ([`/src/app/local/page.tsx`](fidelizacion-zona/src/app/local/page.tsx))

**Información mostrada:**
- Patente formateada (ABC 123 o AB 123 CD)
- Marca y modelo si están registrados
- Estado actual con colores:
  - 🟡 EN_PROCESO - Amarillo
  - 🟢 LISTO - Verde
  - ⚪ ENTREGADO - Gris (no se muestra)

---

### 4. Beneficios Cruzados

**Estado:** ✅ Implementado

**Beneficio "Café gratis - Lavadero":**
- Se activa cuando el auto está `EN_PROCESO` o `LISTO`
- Disponible para niveles Plata, Oro y Platino
- El cliente puede canjear café gratis en Coques mientras espera su auto

**Lógica:**
```typescript
// En /api/estados-auto
if (estado === 'EN_PROCESO') {
  // Habilitar beneficio "Café gratis - Lavadero"
  // Crear evento BENEFICIO_ACTIVADO
}
```

**Base de datos:**
```sql
-- Beneficio existente
INSERT INTO "Beneficio" (id, nombre, descripcion, ...)
VALUES (
  'beneficio-cafe-lavadero',
  'Café gratis — Lavadero',
  'Café gratis mientras esperás tu auto',
  ...
);
```

---

### 5. Logro "Cliente Completo"

**Estado:** ✅ Implementado

**Condición:** Usar tanto la cafetería como el lavadero
**XP:** 30 puntos
**Tipo:** `USO_CRUZADO`

**Lógica de otorgamiento:**
- Se verifica en cada evento de visita
- Si el cliente tiene visitas en ambos locales → se otorga el logro

---

### 6. Integración DeltaWash Legacy (Opcional)

**Estado:** ⚠️ Implementada pero opcional

**Propósito:** Consultar estados de autos desde la DB legacy de DeltaWash

**Endpoint:**
- `GET /api/deltawash/estado-auto` - Consulta read-only

**Características:**
- Solo lectura (SELECT)
- No modifica la DB de DeltaWash
- Requiere variable `DELTAWASH_DATABASE_URL`
- Si no está configurada, la app funciona igual

**Ventajas:**
- Permite ver autos ya existentes en DeltaWash sin migrar datos
- Sincronización en tiempo real

**Desventajas:**
- Requiere acceso a otra DB
- Complejidad adicional
- Depende de estructura de DeltaWash Legacy

**Documentación:** [`CONFIGURACION-DELTAWASH.md`](fidelizacion-zona/CONFIGURACION-DELTAWASH.md)

---

## 🔄 Flujo Completo de Uso

### Escenario 1: Lavadero con Sistema Propio

```
1. Cliente llega al lavadero con su auto
   ↓
2. Empleado entra a /lavadero (login)
   ↓
3. Opción A: Escanea QR del cliente
   Opción B: Ingresa teléfono + patente manualmente
   ↓
4. Registra recepción → Estado: EN_PROCESO
   ↓
5. Se crea registro en EstadoAuto (DB fidelización)
   ↓
6. Se activa beneficio "Café gratis - Lavadero"
   ↓
7. Cliente ve en /pass:
   - Su auto con estado "En proceso"
   - Beneficio de café gratis disponible
   ↓
8. Cliente va a Coques y canjea café gratis
   ↓
9. Lavadero termina → Empleado actualiza estado a LISTO
   ↓
10. Cliente ve notificación: "Tu auto está listo"
    ↓
11. Cliente retira auto → Estado: ENTREGADO
    ↓
12. Auto desaparece de /pass
```

### Escenario 2: Con DeltaWash Legacy

```
1. Cliente ya está en sistema DeltaWash
   ↓
2. DeltaWash tiene: Cliente.phone + estado.patente
   ↓
3. Cliente abre app de fidelización
   ↓
4. GET /api/deltawash/estado-auto
   ↓
5. Ve autos desde DeltaWash en tiempo real
   ↓
6. (Opcional) Puede vincular el auto a su perfil
```

---

## 📊 Datos Almacenados

### En DB Fidelización (DATABASE_URL)

**Tabla: Cliente**
- id, phone, nombre, email, nivel, etc.

**Tabla: Auto**
- id, clienteId, patente, marca, modelo, alias

**Tabla: EstadoAuto**
- id, clienteId, patente, estado, localId

**Tabla: Beneficio**
- "beneficio-cafe-lavadero"

**Tabla: Logro**
- "Cliente Completo" (USO_CRUZADO)

### En DB DeltaWash Legacy (DELTAWASH_DATABASE_URL) - Opcional

**Solo consulta, no escribe:**
- Tabla: Cliente (phone)
- Tabla: estado (patente, estado, updatedAt)

---

## 🔐 Autenticación y Seguridad

### Panel del Lavadero
- **Login:** Usuario + contraseña (empleados)
- **Token:** JWT con expiración
- **Variables:**
  - `EMPLEADO_USERNAME` (default: "lavadero")
  - `EMPLEADO_PASSWORD` (default: "coques2024")
  - `JWT_SECRET_EMPLEADOS`

### API del Lavadero
- **Header requerido:** `x-api-key: <LAVADERO_API_KEY>`
- **Variable:** `LOCAL_LAVADERO_API_KEY`
- **Verifica:** Tipo de local = "lavadero"

### Clientes
- **Autenticación:** JWT en localStorage
- **Endpoint protegido:** Solo ven SUS propios autos
- **Validación:** El phone viene del JWT, no del query string

---

## 📝 Variables de Entorno Necesarias

### Obligatorias
```env
# Base de datos principal
DATABASE_URL="postgresql://..."

# API Key del lavadero (si usas el panel)
LOCAL_LAVADERO_API_KEY="genera_con_crypto"

# Credenciales empleados lavadero
EMPLEADO_USERNAME="lavadero"
EMPLEADO_PASSWORD="password_segura_aqui"
JWT_SECRET_EMPLEADOS="secret_64_chars"
```

### Opcionales (solo si usas DeltaWash Legacy)
```env
# Base de datos DeltaWash Legacy
DELTAWASH_DATABASE_URL="postgresql://..."
```

---

## ✅ Lo Que Funciona

1. ✅ Registro de autos en el lavadero
2. ✅ Actualización de estados (EN_PROCESO → LISTO → ENTREGADO)
3. ✅ Visualización de estados en `/pass`
4. ✅ Beneficio "Café gratis" cuando auto en proceso
5. ✅ Logro "Cliente Completo" por uso cruzado
6. ✅ Panel `/lavadero` con login y scanner QR
7. ✅ Múltiples autos por cliente
8. ✅ Normalización de patentes (ABC123 o AB123CD)
9. ✅ Colores por estado en la UI

---

## ⚠️ Limitaciones Actuales

1. ❌ No hay notificaciones push cuando el auto está listo
2. ❌ No hay historial de lavados (solo estado actual)
3. ❌ No se registran marca/modelo desde el lavadero (solo patente)
4. ❌ El scanner QR en `/lavadero` no obtiene el teléfono del cliente
5. ❌ No hay integración con sistema de pagos
6. ❌ No hay métricas/dashboard de lavadero en `/admin`
7. ⚠️ Integración DeltaWash Legacy implementada pero sin probar

---

## 🚀 Recomendaciones

### Opción A: Sistema Propio (Recomendado)

**Si solo usás la DB de fidelización:**

✅ **Ventajas:**
- Todo en un solo lugar
- Más simple de mantener
- No depende de sistemas externos
- Ya está implementado y funcional

❌ **Desventajas:**
- Requiere migrar datos si ya tenés clientes en DeltaWash
- El lavadero debe usar el panel `/lavadero` para actualizar estados

**Pasos:**
1. Configurar variables de empleados lavadero
2. Capacitar personal en uso de `/lavadero`
3. Empezar a registrar autos desde el panel
4. NO configurar `DELTAWASH_DATABASE_URL`

---

### Opción B: Integración DeltaWash Legacy

**Si querés mantener DeltaWash y sincronizar:**

✅ **Ventajas:**
- No necesitas migrar datos históricos
- El lavadero sigue usando su sistema actual
- Clientes ven estados en tiempo real

❌ **Desventajas:**
- Dos sistemas que mantener
- Más complejo
- Requiere acceso a DB de DeltaWash
- Riesgo si cambia estructura de DeltaWash

**Pasos:**
1. Configurar `DELTAWASH_DATABASE_URL`
2. Crear usuario read-only en DeltaWash
3. Verificar estructura de tablas coincide
4. Probar endpoint `/api/deltawash/estado-auto`

---

### Opción C: Híbrido (No Recomendado)

Usar ambos sistemas simultáneamente. **No es recomendable** porque:
- Complejidad innecesaria
- Riesgo de inconsistencias
- Difícil de mantener

---

## 🎯 Próximos Pasos Sugeridos

### Corto Plazo (1-2 semanas)

1. **Decidir estrategia:** ¿Opción A o B?
2. **Mejorar scanner QR en lavadero:**
   - Que capture automáticamente el teléfono del cliente
   - Agregar endpoint que devuelva phone en `/api/clientes/validar-qr`
3. **Agregar campos al registro:**
   - Marca y modelo desde el panel del lavadero
   - Mejorar UX de ingreso de datos
4. **Testing completo:**
   - Probar flujo end-to-end
   - Verificar beneficios se activan correctamente
   - Validar logro "Cliente Completo"

### Mediano Plazo (1-2 meses)

5. **Notificaciones push:**
   - Cuando auto esté listo
   - Integrar con OneSignal o similar
6. **Historial de lavados:**
   - Tabla `HistorialEstadoAuto`
   - Ver lavados anteriores en `/perfil`
7. **Métricas en `/admin`:**
   - Cantidad de autos procesados
   - Tiempo promedio de lavado
   - Clientes con uso cruzado

### Largo Plazo (3+ meses)

8. **Integración con pagos:**
   - Pagar desde la app
   - Descuentos automáticos por nivel
9. **Reservas online:**
   - Agendar turno de lavado
   - Notificación cuando toca turno
10. **Programa de puntos compartido:**
    - Acumular puntos por lavados
    - Canjear puntos por servicios premium

---

## 📚 Documentación Relacionada

- [`CONFIGURACION-DELTAWASH.md`](fidelizacion-zona/CONFIGURACION-DELTAWASH.md) - Integración con DB legacy
- [`INTEGRACION-DELTAWASH.md`](fidelizacion-zona/INTEGRACION-DELTAWASH.md) - Arquitectura y flujo
- [`MIGRACION-AUTOS.md`](fidelizacion-zona/MIGRACION-AUTOS.md) - Sistema de múltiples autos
- [`VARIABLES-ENTORNO-EXPLICADAS.md`](fidelizacion-zona/VARIABLES-ENTORNO-EXPLICADAS.md) - Todas las variables
- [`REGLAS.md`](fidelizacion-zona/REGLAS.md) - Reglas de negocio (sección 4.4 y 5.3)

---

## 🐛 Troubleshooting

### El panel del lavadero no carga
- Verificar que `EMPLEADO_PASSWORD` esté configurada
- Verificar login en `/lavadero/login`
- Revisar console del navegador

### No se activa el beneficio de café
- Verificar que el beneficio "beneficio-cafe-lavadero" existe en DB
- Verificar que el cliente tenga nivel Plata o superior
- Revisar logs del endpoint `/api/estados-auto`

### El cliente no ve su auto
- Verificar que el estado NO sea "ENTREGADO"
- Verificar que la patente esté normalizada correctamente
- Verificar que el teléfono coincida (formato E.164: +5491112345678)

---

**Última actualización:** 2026-02-24  
**Autor:** Sistema de Fidelización Coques
