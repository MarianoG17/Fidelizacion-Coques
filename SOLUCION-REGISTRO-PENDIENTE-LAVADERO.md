# 🚗 Solución: Registro Pendiente Lavadero → Coques

## 📋 Problema Identificado

**Flujo actual problemático:**
1. Cliente va al lavadero → Registran su auto (teléfono + patente)
2. Cliente NO tiene la app de Coques todavía
3. Cliente descarga la app DESPUÉS y se registra
4. ❌ **Problema:** El beneficio de café gratis ya se activó pero el cliente no existía, no puede verlo

---

## ✅ Solución Implementada

### Sistema de Estados Pendientes

Cuando el lavadero registra un auto de un cliente que **aún no está en Coques**:

1. ✅ El webhook guarda el estado en [`EstadoAutoPendiente`](fidelizacion-zona/prisma/schema.prisma)
2. ✅ Cuando el cliente se registra en Coques, se procesan **automáticamente** todos sus pendientes
3. ✅ Se crean los autos, estados y **se activan los beneficios retroactivamente**

---

## 🔄 Flujo Completo Nuevo

### Escenario: Cliente va primero al lavadero

```
1. Cliente llega al lavadero (sin app de Coques)
   ↓
2. Empleado registra: teléfono +5491112345678 + patente ABC123
   ↓
3. Webhook POST /api/webhook/deltawash recibe:
   {
     "phone": "+5491112345678",
     "patente": "ABC123",
     "estado": "en proceso"
   }
   ↓
4. Sistema busca cliente con ese teléfono
   → NO EXISTE en Coques todavía
   ↓
5. ✅ Crea registro en EstadoAutoPendiente:
   - phone: +5491112345678
   - patente: ABC123
   - estado: EN_PROCESO
   - procesado: false
   ↓
6. Respuesta al lavadero:
   {
     "success": true,
     "pendiente": true,
     "message": "Se procesará cuando el cliente se registre"
   }
   ↓
7. ⏰ [TIEMPO PASA] Cliente va a Coques
   ↓
8. Cliente descarga la app y se registra:
   - Email: cliente@email.com
   - Password: ******
   - Teléfono: 1112345678
   ↓
9. POST /api/auth/register ejecuta:
   a) Crea el cliente
   b) 🔍 Busca EstadoAutoPendiente con phone=1112345678 y procesado=false
   c) ✅ ENCUENTRA el registro del lavadero
   d) Crea Auto en DB
   e) Crea EstadoAuto (EN_PROCESO)
   f) 🎁 Activa beneficio "Café gratis - Lavadero"
   g) Marca pendiente como procesado=true
   ↓
10. ✅ Cliente abre /pass y VE:
    - Su auto ABC123 en proceso
    - Beneficio de café gratis disponible para canjear
```

---

## 📊 Modelo de Datos

### Tabla: EstadoAutoPendiente

```prisma
model EstadoAutoPendiente {
  id              String         @id @default(uuid())
  phone           String         // Teléfono del cliente (sin registrar en Coques)
  patente         String         // Patente del auto
  estado          EstadoAutoEnum // EN_PROCESO, LISTO, ENTREGADO
  marca           String?        // Marca del auto (opcional)
  modelo          String?        // Modelo del auto (opcional)
  notas           String?        // Notas adicionales
  localOrigenId   String?        // ID del local lavadero
  procesado       Boolean        @default(false)  // ✅ true cuando se procesa
  procesadoEn     DateTime?      // timestamp cuando se procesó
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([phone])
  @@index([procesado])
  @@index([phone, procesado])  // búsqueda eficiente de pendientes
}
```

---

## 🔧 Archivos Modificados

### 1. Schema de Prisma
- **Archivo:** [`prisma/schema.prisma`](fidelizacion-zona/prisma/schema.prisma)
- **Cambio:** Agregado modelo `EstadoAutoPendiente`

### 2. Migración SQL
- **Archivo:** [`prisma/migrations/20260224_add_estado_auto_pendiente.sql`](fidelizacion-zona/prisma/migrations/20260224_add_estado_auto_pendiente.sql)
- **Ejecutar:** `psql DATABASE_URL < prisma/migrations/20260224_add_estado_auto_pendiente.sql`

### 3. Webhook DeltaWash
- **Archivo:** [`src/app/api/webhook/deltawash/route.ts`](fidelizacion-zona/src/app/api/webhook/deltawash/route.ts)
- **Cambio:** Si cliente no existe, guarda en `EstadoAutoPendiente` en vez de retornar error

**Antes:**
```typescript
if (!cliente) {
    return NextResponse.json({
        success: false,
        message: 'Cliente no registrado'
    })
}
```

**Ahora:**
```typescript
if (!cliente) {
    // Guardar estado pendiente
    await prisma.estadoAutoPendiente.create({
        data: {
            phone: payload.phone,
            patente: patenteNormalizada,
            estado: estadoNormalizado,
            // ...
            procesado: false,
        },
    })
    
    return NextResponse.json({
        success: true,
        pendiente: true,
        message: 'Se procesará cuando el cliente se registre'
    })
}
```

### 4. Endpoint de Registro
- **Archivo:** [`src/app/api/auth/register/route.ts`](fidelizacion-zona/src/app/api/auth/register/route.ts)
- **Cambio:** Después de crear el cliente, procesa estados pendientes

**Nuevo código agregado:**
```typescript
// Procesar estados de auto pendientes del lavadero
const estadosPendientes = await prisma.estadoAutoPendiente.findMany({
  where: {
    phone: validatedData.phone,
    procesado: false,
  },
})

for (const pendiente of estadosPendientes) {
  // 1. Crear auto
  const auto = await prisma.auto.create({ ... })
  
  // 2. Crear estado
  await prisma.estadoAuto.create({ ... })
  
  // 3. Activar beneficios si está EN_PROCESO
  if (pendiente.estado === 'EN_PROCESO') {
    await triggerBeneficiosPorEstado(cliente.id, 'EN_PROCESO')
  }
  
  // 4. Marcar como procesado
  await prisma.estadoAutoPendiente.update({
    where: { id: pendiente.id },
    data: {
      procesado: true,
      procesadoEn: new Date(),
    },
  })
}
```

---

## ✅ Ventajas de Esta Solución

1. ✅ **No cambia el flujo del lavadero** - Siguen registrando igual
2. ✅ **Automático** - El cliente no hace nada extra, solo registrarse
3. ✅ **Retroactivo** - Procesa todos los pendientes acumulados
4. ✅ **Sin pérdida de datos** - Todo queda guardado aunque el cliente tarde en registrarse
5. ✅ **Beneficios garantizados** - Si el auto está EN_PROCESO, el beneficio se activa
6. ✅ **Trazabilidad** - Queda registrado cuándo se procesó cada pendiente
7. ✅ **Escalable** - Si el cliente va varias veces al lavadero antes de registrarse, procesa todos

---

## 🧪 Testing Manual

### Caso 1: Cliente va al lavadero antes de registrarse

```bash
# 1. Simular webhook del lavadero (cliente no existe en Coques)
curl -X POST http://localhost:3000/api/webhook/deltawash \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DELTAWASH_WEBHOOK_SECRET" \
  -d '{
    "phone": "+5491122334455",
    "patente": "XYZ789",
    "estado": "en proceso",
    "marca": "Toyota",
    "modelo": "Corolla"
  }'

# Resultado esperado:
# {
#   "success": true,
#   "pendiente": true,
#   "message": "Estado guardado. Se procesará cuando el cliente se registre"
# }

# 2. Verificar que se guardó como pendiente
psql $DATABASE_URL -c "SELECT * FROM \"EstadoAutoPendiente\" WHERE phone = '+5491122334455';"

# Resultado esperado: 1 fila con procesado=false

# 3. Cliente se registra en /activar
# → Ingresar:
#    - Nombre: Juan Pérez
#    - Email: juan@email.com
#    - Teléfono: 1122334455
#    - Password: ******

# 4. Verificar que se procesó automáticamente
psql $DATABASE_URL -c "
  SELECT 
    c.nombre,
    a.patente,
    ea.estado,
    eap.procesado
  FROM \"Cliente\" c
  LEFT JOIN \"Auto\" a ON a.\"clienteId\" = c.id
  LEFT JOIN \"EstadoAuto\" ea ON ea.\"autoId\" = a.id
  LEFT JOIN \"EstadoAutoPendiente\" eap ON eap.phone = c.phone
  WHERE c.phone = '1122334455';
"

# Resultado esperado:
# nombre      | patente | estado     | procesado
# ------------|---------|------------|----------
# Juan Pérez  | XYZ789  | EN_PROCESO | true

# 5. Cliente abre /pass
# → Debería ver:
#   - Auto XYZ789 en proceso (badge amarillo)
#   - Beneficio "Café gratis - Lavadero" disponible
```

### Caso 2: Cliente ya registrado (flujo normal)

```bash
# 1. Cliente ya existe en Coques
# 2. Webhook del lavadero
curl -X POST http://localhost:3000/api/webhook/deltawash \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DELTAWASH_WEBHOOK_SECRET" \
  -d '{
    "phone": "+5491112345678",
    "patente": "ABC123",
    "estado": "en proceso"
  }'

# Resultado esperado:
# {
#   "success": true,
#   "mensaje": "Estado sincronizado correctamente",
#   "cliente": { ... },
#   "beneficiosActivados": [...]
# }

# NO se crea EstadoAutoPendiente porque el cliente ya existe
```

---

## 🚀 Deploy

### 1. Aplicar migración en producción

```bash
# Conectar a la DB de producción
psql $DATABASE_URL < prisma/migrations/20260224_add_estado_auto_pendiente.sql
```

### 2. Deploy en Vercel

```bash
# El código ya está commiteado
git push origin main

# Vercel detecta el push y deploya automáticamente
```

### 3. Verificar variables de entorno

En Vercel → Settings → Environment Variables:
- ✅ `DELTAWASH_WEBHOOK_SECRET` configurada
- ✅ `DATABASE_URL` apunta a producción

---

## 📱 Experiencia del Cliente

### Timeline del cliente:

**Lunes 10:00 AM** - Va al lavadero
```
"Hola, dejame el auto para lavar"
→ Empleado registra teléfono + patente
→ Sistema guarda pendiente
```

**Lunes 10:15 AM** - Va a Coques mientras espera
```
"Uy, tienen app de fidelización, me la bajo"
→ Se registra con su email y teléfono
→ 🎉 Sistema procesa automáticamente el registro del lavadero
```

**Lunes 10:16 AM** - Abre la app
```
📱 Ve su auto en proceso
🎁 Ve beneficio "Café gratis - Lavadero" disponible
→ Lo canjea mientras espera
```

**Lunes 11:00 AM** - Auto listo
```
📱 Ve en la app "Tu auto está listo"
→ Lo retira
```

---

## 🔍 Monitoreo y Logs

### Ver estados pendientes no procesados

```sql
SELECT 
  id,
  phone,
  patente,
  estado,
  "createdAt",
  EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 3600 AS horas_pendiente
FROM "EstadoAutoPendiente"
WHERE procesado = false
ORDER BY "createdAt" DESC;
```

### Ver estadísticas de procesamiento

```sql
SELECT 
  procesado,
  COUNT(*) as cantidad,
  MIN("createdAt") as mas_antiguo,
  MAX("createdAt") as mas_reciente
FROM "EstadoAutoPendiente"
GROUP BY procesado;
```

### Ver clientes que se registraron con pendientes

```sql
SELECT 
  c.nombre,
  c.phone,
  c."createdAt" as registro_coques,
  COUNT(eap.id) as pendientes_procesados,
  ARRAY_AGG(eap.patente) as patentes
FROM "Cliente" c
JOIN "EstadoAutoPendiente" eap ON eap.phone = c.phone
WHERE eap.procesado = true
GROUP BY c.id
ORDER BY c."createdAt" DESC;
```

---

## 🐛 Troubleshooting

### El cliente se registró pero no ve el beneficio

1. Verificar que el pendiente se creó:
```sql
SELECT * FROM "EstadoAutoPendiente" 
WHERE phone LIKE '%1112345678%';
```

2. Verificar que se procesó:
```sql
SELECT procesado, "procesadoEn" FROM "EstadoAutoPendiente" 
WHERE phone LIKE '%1112345678%';
```

3. Verificar que se creó el auto:
```sql
SELECT a.* FROM "Auto" a
JOIN "Cliente" c ON a."clienteId" = c.id
WHERE c.phone LIKE '%1112345678%';
```

4. Verificar que se activó el beneficio:
```sql
SELECT b.nombre, bc.* 
FROM "BeneficioCliente" bc
JOIN "Beneficio" b ON bc."beneficioId" = b.id
JOIN "Cliente" c ON bc."clienteId" = c.id
WHERE c.phone LIKE '%1112345678%'
AND b.id = 'beneficio-cafe-lavadero';
```

### El webhook no guarda el pendiente

- Verificar que `DELTAWASH_WEBHOOK_SECRET` está correcta
- Verificar logs en Vercel: `/api/webhook/deltawash`
- El teléfono debe estar en formato E.164: `+5491112345678`

---

## 📚 Referencias

- [Documentación de integración lavadero](fidelizacion-zona/INTEGRACION-LAVADERO-COQUES-ESTADO-ACTUAL.md)
- [Webhook DeltaWash](fidelizacion-zona/WEBHOOK-DELTAWASH-INTEGRACION.md)
- [Beneficio café lavadero](fidelizacion-zona/BENEFICIO-DESCUENTO-LAVADERO.md)
- [Schema Prisma](fidelizacion-zona/prisma/schema.prisma)

---

**Última actualización:** 2026-02-24  
**Estado:** ✅ Implementado y listo para testing
