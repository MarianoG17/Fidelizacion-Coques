# Implementación: Multiplicador x3 para Pedidos de Tortas

## 📋 Resumen

Sistema que permite que cada pedido de tortas desde la app cuente como 3 visitas (configurable) para la evaluación de niveles del programa de fidelización.

**Justificación**: Ticket promedio torta = 3× ticket promedio visita local. Reconocer el mayor valor de estos pedidos incentiva las compras online.

**Mensaje al cliente**: "1 pedido de tortas = 3 visitas"

## 🎯 Objetivos Alcanzados

✅ Campo configurable `tortasMultiplicador` en ConfiguracionApp (default: 3)  
✅ Nuevo tipo de evento `PEDIDO_TORTA` en el sistema  
✅ Evaluación de niveles modificada para aplicar multiplicador  
✅ Webhook WooCommerce para registrar pedidos completados (opcional)  
✅ Interfaz admin para editar multiplicador  
✅ Visualización del desglose en el pass del cliente  

## 📁 Archivos Modificados

### 1. Schema Prisma (`prisma/schema.prisma`)

**Cambios**:
```prisma
// Agregado PEDIDO_TORTA al enum TipoEvento
enum TipoEvento {
  VISITA
  BENEFICIO_APLICADO
  ESTADO_EXTERNO
  ACTIVACION
  ASISTENCIA_EVENTO
  PEDIDO_TORTA  // ← NUEVO
}

// Agregado campo tortasMultiplicador a ConfiguracionApp
model ConfiguracionApp {
  // ... otros campos
  tortasMultiplicador  Int  @default(3)  // ← NUEVO
}
```

### 2. Lógica de Evaluación (`src/lib/beneficios.ts`)

**Función modificada**: `evaluarNivel(clienteId: string)`

**Lógica actualizada**:
```typescript
// 1. Contar visitas normales (días únicos)
const visitasNormales = COUNT(DISTINCT DATE(timestamp)) 
  WHERE tipoEvento IN ('VISITA', 'BENEFICIO_APLICADO')

// 2. Contar pedidos de tortas
const pedidosTortas = COUNT(*) 
  WHERE tipoEvento = 'PEDIDO_TORTA'

// 3. Calcular total
const totalVisitas = visitasNormales + (pedidosTortas × multiplicador)
```

**Logs agregados**:
```
[evaluarNivel] Cliente XXX: 5 visitas normales + 2 pedidos tortas (×3) = 11 visitas totales
```

### 3. Webhook WooCommerce (`src/app/api/woocommerce/webhook/route.ts`)

**Endpoint**: `POST /api/woocommerce/webhook`

**Funcionalidad**:
1. Verifica firma HMAC del webhook
2. Filtra pedidos con estado `completed`
3. Verifica que contenga productos de categoría "Tortas"
4. Busca cliente por teléfono/email
5. Registra evento `PEDIDO_TORTA`
6. Evalúa cambio de nivel automáticamente

**Configuración requerida en WooCommerce**:
- **Topic**: Order updated
- **Delivery URL**: `https://tu-dominio.com/api/woocommerce/webhook`
- **Secret**: Valor de `WOOCOMMERCE_WEBHOOK_SECRET` en `.env`
- **API Version**: WP REST API Integration v3

**Variable de entorno**:
```env
WOOCOMMERCE_WEBHOOK_SECRET=tu_secret_generado
```

### 4. Admin - Configuración UI (`src/app/admin/configuracion/page.tsx`)

**Campo agregado**:
```tsx
<input
  type="number"
  min="1"
  max="10"
  value={config.tortasMultiplicador}
  label="Multiplicador de pedidos de tortas"
  help="Cuántas visitas equivale cada pedido de torta"
/>
```

**Validación**: Entre 1 y 10

### 5. Admin - API Configuración (`src/app/api/admin/configuracion/route.ts`)

**Cambios**:
- GET: Retorna `tortasMultiplicador`
- PUT: Actualiza `tortasMultiplicador` con validación (1-10)

### 6. API Niveles (`src/app/api/pass/niveles/route.ts`)

**Response ampliado**:
```json
{
  "data": {
    "niveles": [...],
    "nivelActual": "Bronce",
    "totalVisitas": 11,
    "desglose": {
      "visitasNormales": 5,
      "pedidosTortas": 2,
      "tortasMultiplicador": 3,
      "periodoDias": 30
    },
    "progreso": {
      "proximoNivel": "Plata",
      "visitasActuales": 11,
      "visitasRequeridas": 12,
      "visitasFaltantes": 1
    }
  }
}
```

### 7. Pass del Cliente UI (`src/app/pass/page.tsx`)

**Visualización agregada** (solo si hay pedidos de tortas):
```
📊 Desglose (últimos 30 días)
🏪 Visitas al local:     5
🍰 Pedidos de tortas:    2 × 3 = 6
────────────────────────────
Total:                   11

💡 Cada pedido de torta cuenta como 3 visitas
```

## 📊 Migración SQL

**Archivo**: `prisma/migrations/20260301_add_tortas_multiplicador.sql`

```sql
-- Agregar PEDIDO_TORTA al enum
ALTER TYPE "TipoEvento" ADD VALUE IF NOT EXISTS 'PEDIDO_TORTA';

-- Agregar campo tortasMultiplicador
ALTER TABLE "ConfiguracionApp" 
ADD COLUMN IF NOT EXISTS "tortasMultiplicador" INTEGER NOT NULL DEFAULT 3;
```

**Aplicar en producción**:
```bash
# Opción 1: Via Prisma
npx prisma migrate deploy

# Opción 2: SQL directo
psql $DATABASE_URL -f prisma/migrations/20260301_add_tortas_multiplicador.sql
```

## 🔄 Flujo de Uso

### Opción A: Registro Manual (Staff)

1. Cliente hace pedido de torta por WooCommerce
2. Pedido se completa (`status: completed`)
3. Webhook dispara automáticamente
4. Sistema registra evento `PEDIDO_TORTA`
5. Cliente sube de nivel automáticamente si corresponde

### Opción B: Registro Manual Alternativo

Si no se usa webhook, el staff puede registrar manualmente:

```typescript
// En el sistema local/staff
await prisma.eventoScan.create({
  data: {
    clienteId: cliente.id,
    localId: local.id,
    tipoEvento: 'PEDIDO_TORTA',
    metodoValidacion: 'QR',
    contabilizada: true,
    notas: 'Pedido torta #12345'
  }
})

await evaluarNivel(cliente.id)
```

## ⚙️ Configuración

### 1. Variables de Entorno

```env
# .env
WOOCOMMERCE_URL=https://tu-tienda.com
WOOCOMMERCE_KEY=ck_xxx
WOOCOMMERCE_SECRET=cs_xxx
WOOCOMMERCE_WEBHOOK_SECRET=whs_xxx  # ← NUEVO (para verificar firma)
```

### 2. Configurar Webhook en WooCommerce

1. Ir a **WooCommerce > Ajustes > Avanzado > Webhooks**
2. Click en **Añadir webhook**
3. Configurar:
   - **Nombre**: Pedido Completado - Fidelización
   - **Estado**: Activo
   - **Tema**: Order updated
   - **URL de entrega**: `https://fidelizacion.coquesbakery.com/api/woocommerce/webhook`
   - **Secreto**: Generar y copiar a `.env` como `WOOCOMMERCE_WEBHOOK_SECRET`
   - **Versión de API**: WP REST API Integration v3

### 3. Ajustar Multiplicador (Admin)

1. Ir a `/admin` → Configuración
2. Editar "Multiplicador de pedidos de tortas"
3. Guardar cambios

**Valores recomendados**:
- `3` (default): ticket promedio torta = 3× visita
- `2`: configuración más conservadora
- `5`: promoción especial temporal

## 🧪 Testing

### Test 1: Crear Evento Manual

```typescript
// En consola de Node o script de test
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { evaluarNivel } = require('./src/lib/beneficios')

// 1. Crear evento PEDIDO_TORTA
await prisma.eventoScan.create({
  data: {
    clienteId: 'cliente-test-id',
    localId: 'local-cafeteria-id',
    tipoEvento: 'PEDIDO_TORTA',
    metodoValidacion: 'QR',
    contabilizada: true,
    notas: 'Test pedido torta'
  }
})

// 2. Evaluar nivel
await evaluarNivel('cliente-test-id')

// 3. Verificar progreso
const niveles = await fetch('/api/pass/niveles', {
  headers: { Authorization: 'Bearer TOKEN' }
})
console.log(niveles.data.desglose)
```

### Test 2: Webhook WooCommerce

```bash
# Simular webhook desde WooCommerce
curl -X POST https://tu-dominio.com/api/woocommerce/webhook \
  -H "Content-Type: application/json" \
  -H "X-WC-Webhook-Signature: HMAC_SHA256_SIGNATURE" \
  -d '{
    "id": 12345,
    "status": "completed",
    "customer_id": 67,
    "billing": {
      "phone": "+5491112345678",
      "email": "cliente@example.com",
      "first_name": "Juan",
      "last_name": "Pérez"
    },
    "line_items": [{
      "product_id": 789,
      "name": "Torta Temática"
    }]
  }'
```

**Verificar**:
1. Logs del servidor: `[Webhook] ✅ Evento PEDIDO_TORTA registrado`
2. Base de datos: nuevo registro en `EventoScan`
3. Cliente subió de nivel si correspondía

### Test 3: UI Pass

1. Hacer login como cliente con pedidos de tortas
2. Ir a `/pass`
3. Verificar que aparece sección "📊 Desglose"
4. Confirmar cálculo: `visitas normales + (pedidos × multiplicador) = total`

## 📈 Métricas y Monitoreo

### Queries útiles

```sql
-- Ver todos los pedidos de tortas registrados
SELECT 
  c.nombre,
  c.phone,
  e.timestamp,
  e.notas
FROM "EventoScan" e
JOIN "Cliente" c ON e."clienteId" = c.id
WHERE e."tipoEvento" = 'PEDIDO_TORTA'
ORDER BY e.timestamp DESC;

-- Clientes que subieron de nivel por pedidos de tortas
SELECT 
  c.nombre,
  n.nombre as nivel_actual,
  COUNT(e.id) as total_pedidos_tortas
FROM "Cliente" c
JOIN "Nivel" n ON c."nivelId" = n.id
JOIN "EventoScan" e ON c.id = e."clienteId"
WHERE e."tipoEvento" = 'PEDIDO_TORTA'
GROUP BY c.id, c.nombre, n.nombre
ORDER BY total_pedidos_tortas DESC;

-- Impacto del multiplicador en progreso de niveles
SELECT 
  COUNT(DISTINCT DATE(e.timestamp)) as visitas_normales,
  COUNT(*) FILTER (WHERE e."tipoEvento" = 'PEDIDO_TORTA') as pedidos_tortas,
  (SELECT "tortasMultiplicador" FROM "ConfiguracionApp" LIMIT 1) as multiplicador
FROM "EventoScan" e
WHERE e."clienteId" = 'CLIENTE_ID'
  AND e."contabilizada" = true
  AND e.timestamp >= NOW() - INTERVAL '30 days';
```

## 🚀 Deploy

### Checklist Pre-Deploy

- [ ] Migración SQL aplicada en producción
- [ ] Variable `WOOCOMMERCE_WEBHOOK_SECRET` configurada
- [ ] Webhook configurado en WooCommerce
- [ ] Prisma client regenerado (`npx prisma generate`)
- [ ] Tests pasando

### Pasos de Deploy

```bash
# 1. Generar cliente Prisma
cd fidelizacion-zona
npx prisma generate

# 2. Aplicar migración (Vercel automático o manual)
npx prisma migrate deploy

# 3. Deploy a Vercel
git add .
git commit -m "feat: Implementar multiplicador x3 para pedidos de tortas"
git push origin main

# 4. Verificar en Vercel que se aplicó la migración
# 5. Configurar webhook en WooCommerce (producción)
```

### Post-Deploy

1. Verificar en admin: `/admin/configuracion` → campo multiplicador visible
2. Test webhook: crear pedido de prueba en WooCommerce
3. Verificar logs en Vercel
4. Confirmar con cliente de prueba que el desglose se muestra

## 🎓 Educación al Cliente

### Mensaje en App

Ya implementado en el pass:
> 💡 Cada pedido de torta cuenta como 3 visitas

### Comunicación Sugerida

**Email/Push al lanzar feature**:
```
🎉 ¡Nueva forma de sumar puntos!

Ahora tus pedidos de tortas desde la app valen TRIPLE 🍰×3

1 pedido de torta = 3 visitas al local

¡Sumá más rápido y alcanzá beneficios exclusivos! 🎁
```

## 🔧 Troubleshooting

### Problema: Webhook no dispara

**Verificar**:
1. URL correcta en configuración WooCommerce
2. Webhook en estado "Activo"
3. Secret correcto en `.env`
4. Logs de WooCommerce (herramientas > logs)

**Solución**: Re-enviar webhook desde WooCommerce admin

### Problema: Cliente no sube de nivel

**Verificar**:
1. Pedido está en estado `completed`
2. Producto pertenece a categoría "Tortas"
3. Cliente existe en sistema (por teléfono/email)
4. Evento se creó en base de datos

**Debug**:
```sql
-- Ver eventos del cliente
SELECT * FROM "EventoScan" 
WHERE "clienteId" = 'XXX' 
ORDER BY timestamp DESC;

-- Ver configuración
SELECT "tortasMultiplicador", "nivelesPeriodoDias" 
FROM "ConfiguracionApp";
```

### Problema: Desglose no se muestra

**Verificar**:
1. Cliente tiene al menos 1 pedido de torta
2. API `/api/pass/niveles` retorna `desglose`
3. Frontend recibe y parsea correctamente

## 📚 Referencias

- [PEDIDOS_TORTAS_WOOCOMMERCE.md](./PEDIDOS_TORTAS_WOOCOMMERCE.md) - Sistema de pedidos
- [APLICAR-MIGRACION-NIVELES-PERIODO.md](./APLICAR-MIGRACION-NIVELES-PERIODO.md) - Sistema de niveles
- [WooCommerce Webhooks Documentation](https://woocommerce.com/document/webhooks/)

---

**Fecha de implementación**: 2026-03-01  
**Versión**: 1.0.0  
**Autor**: Sistema de Fidelización Coques Bakery
