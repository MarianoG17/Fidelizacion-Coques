# 🚀 Deploy del Sistema de Presupuestos

## Pre-requisitos

✅ Todo el código está implementado
✅ Base de datos local actualizada con `prisma db push`
✅ Prisma Client regenerado

## Pasos para Deploy

### 1. Verificar que compile sin errores

```bash
cd fidelizacion-zona
npm run build
```

**Posibles errores de TypeScript:**
- Si hay errores sobre `prisma.presupuesto`, ejecutar: `npx prisma generate`
- Los errores deberían resolverse automáticamente

### 2. Hacer commit de los cambios

```bash
git add .
git commit -m "feat: Sistema de presupuestos/cotizaciones completo

- Modelo Presupuesto en base de datos
- APIs REST para crear, consultar y confirmar presupuestos
- Botón 'Guardar como Presupuesto' en carrito
- Página de detalle de presupuesto
- Dashboard de gestión para staff en /local/presupuestos
- Integración con WooCommerce para crear pedidos
"
git push origin main
```

### 3. Deploy automático a Vercel

Si tienes GitHub conectado a Vercel:
- El push a `main` triggereará deploy automático
- Vercel build incluirá `prisma generate` automáticamente
- Esperar a que el build termine

### 4. Aplicar migración de base de datos en producción

**IMPORTANTE:** Necesitas actualizar la base de datos de producción.

#### Opción A: Via Vercel Dashboard
```bash
# En tu máquina local, conectado a la DB de producción
DATABASE_URL="tu-connection-string-produccion" npx prisma db push
```

#### Opción B: Via script SQL directo

Si prefieres SQL directo, ejecuta esto en tu base de datos de producción:

```sql
-- Crear enum EstadoPresupuesto
CREATE TYPE "EstadoPresupuesto" AS ENUM ('PENDIENTE', 'COMPLETO', 'CONFIRMADO', 'CANCELADO');

-- Crear tabla Presupuesto
CREATE TABLE "Presupuesto" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT,
    "nombreCliente" TEXT,
    "telefonoCliente" TEXT,
    "emailCliente" TEXT,
    "items" JSONB NOT NULL,
    "precioTotal" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaEntrega" TIMESTAMP(3),
    "horaEntrega" TEXT,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'PENDIENTE',
    "camposPendientes" JSONB,
    "notasInternas" TEXT,
    "notasCliente" TEXT,
    "creadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "confirmadoEn" TIMESTAMP(3),
    "wooOrderId" INTEGER,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- Crear índices
CREATE UNIQUE INDEX "Presupuesto_codigo_key" ON "Presupuesto"("codigo");
CREATE INDEX "Presupuesto_codigo_idx" ON "Presupuesto"("codigo");
CREATE INDEX "Presupuesto_clienteId_idx" ON "Presupuesto"("clienteId");
CREATE INDEX "Presupuesto_estado_idx" ON "Presupuesto"("estado");
CREATE INDEX "Presupuesto_creadoEn_idx" ON "Presupuesto"("creadoEn");

-- Crear foreign key
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_clienteId_fkey" 
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Agregar relación en Cliente
-- (Nota: La relación es virtual en Prisma, no requiere cambio en la tabla Cliente)
```

#### Opción C: Via Prisma Migrate (si usas migraciones)

```bash
# Crear migración
npx prisma migrate dev --create-only --name add_presupuesto_model

# Deployar a producción
DATABASE_URL="tu-connection-string-produccion" npx prisma migrate deploy
```

### 5. Verificar Variables de Entorno en Vercel

Asegurate que estas variables estén configuradas en Vercel:

```env
DATABASE_URL=postgresql://...
WOOCOMMERCE_URL=https://tu-tienda.com
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
```

### 6. Testing en Producción

Una vez deployado, probar:

#### A. Crear Presupuesto
1. Ir a `/tortas` en producción
2. Configurar una torta temática
3. Agregar al carrito
4. Click "💾 Guardar como Presupuesto"
5. Verificar que se genera código

#### B. Consultar Presupuesto
1. Ir a `/presupuestos/CODIGO-GENERADO`
2. Verificar que muestre todos los datos
3. No confirmar aún (solo verificar que cargue)

#### C. Staff - Buscar Presupuesto
1. Ir a `/local` en producción
2. Click "💾 Presupuestos"
3. Buscar por el código generado
4. Verificar que lo encuentre

#### D. Confirmar Presupuesto (prueba completa)
1. Desde `/presupuestos/CODIGO`
2. Click "✅ Confirmar Presupuesto"
3. Verificar que cree pedido en WooCommerce
4. Ir al admin de WooCommerce
5. Buscar el pedido creado
6. Verificar que tenga:
   - Line items correctos
   - Meta data de add-ons
   - Campos personalizados
   - Fecha/hora de entrega
   - Nota `_presupuesto_codigo`

### 7. Monitoreo Post-Deploy

Revisar Vercel logs para errores:
- Ir a Vercel Dashboard → Functions
- Buscar errores en:
  - `/api/presupuestos`
  - `/api/presupuestos/[codigo]`
  - `/api/presupuestos/[codigo]/confirmar`

### 8. Rollback (si algo falla)

Si hay problemas críticos:

```bash
# Revertir commit
git revert HEAD
git push origin main

# Vercel deploiará automáticamente la versión anterior

# Eliminar tabla Presupuesto si es necesario
DROP TABLE "Presupuesto" CASCADE;
DROP TYPE "EstadoPresupuesto";
```

## Checklist Post-Deploy

- [ ] Build exitoso en Vercel
- [ ] Base de datos actualizada con tabla Presupuesto
- [ ] Crear presupuesto funciona
- [ ] Consultar presupuesto funciona
- [ ] Dashboard `/local/presupuestos` accesible
- [ ] Confirmar presupuesto crea pedido WooCommerce
- [ ] Pedido WooCommerce tiene todos los datos correctos
- [ ] No hay errores en Vercel logs

## Comunicación al Equipo

Una vez deployado, informar al equipo:

```
🎉 NUEVA FUNCIONALIDAD: Sistema de Presupuestos

✅ Ya pueden guardar pedidos como presupuestos
✅ Clientes reciben código único (ej: PRE-12ABC34-5DEF67)
✅ Staff puede buscar y confirmar presupuestos desde /local → Presupuestos

Casos de uso:
- Cliente indeciso → guardar presupuesto
- Falta información → guardar y completar después
- Cotización rápida → enviar código por WhatsApp

Ubicaciones:
- Cliente: Carrito → "Guardar como Presupuesto"
- Staff: /local → Botón "💾 Presupuestos"
- Ver detalle: /presupuestos/CODIGO
```

## Problemas Comunes

### Error: Property 'presupuesto' does not exist

**Solución:**
```bash
npx prisma generate
npm run build
```

### Error: Table "Presupuesto" doesn't exist

**Solución:**
```bash
# Aplicar migración de DB (ver paso 4)
DATABASE_URL="tu-db-prod" npx prisma db push
```

### Error al crear pedido WooCommerce

**Revisar:**
- Variables de entorno WOOCOMMERCE_* en Vercel
- Permisos de API Keys en WooCommerce
- Logs de Vercel Functions

### Presupuesto no se encuentra por código

**Verificar:**
- Código ingresado correctamente (case-sensitive)
- Presupuesto existe en DB: `SELECT * FROM "Presupuesto" WHERE codigo = 'PRE-...'`
- API `/api/presupuestos/CODIGO` responde correctamente

---

**Documentación completa:** SISTEMA-PRESUPUESTOS-IMPLEMENTADO.md
**Fecha de deploy:** ${new Date().toISOString().split('T')[0]}
