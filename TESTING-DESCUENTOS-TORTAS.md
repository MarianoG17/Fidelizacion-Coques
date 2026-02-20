# Testing: Sistema de Descuentos por Nivel en Tortas

## ✅ Implementación Completada

### Archivos Modificados:
1. ✅ [`prisma/schema.prisma`](prisma/schema.prisma:1) - Campo `descuentoPedidosTortas` agregado
2. ✅ [`prisma/migrations/20260220_add_descuento_tortas/migration.sql`](prisma/migrations/20260220_add_descuento_tortas/migration.sql:1) - Migración aplicada
3. ✅ [`src/app/admin/niveles/page.tsx`](src/app/admin/niveles/page.tsx:1) - Panel admin actualizado
4. ✅ [`src/app/api/admin/niveles/[id]/route.ts`](src/app/api/admin/niveles/[id]/route.ts:1) - API admin actualizada
5. ✅ [`src/app/api/pass/route.ts`](src/app/api/pass/route.ts:1) - API pass actualizada para incluir descuento
6. ✅ [`src/app/tortas/page.tsx`](src/app/tortas/page.tsx:1) - UI de tortas con descuentos
7. ✅ [`src/app/api/woocommerce/crear-pedido/route.ts`](src/app/api/woocommerce/crear-pedido/route.ts:1) - Envío de cupón a WooCommerce

## 📋 Plan de Testing

### 1. Configuración Inicial

**Paso 1: Aplicar descuentos por defecto**
```bash
cd fidelizacion-zona
# Los descuentos ya están en 0 por defecto tras la migración
# Ejecutar script SQL para configurar valores iniciales:
```

```sql
-- En Neon Console o psql:
UPDATE "Nivel" SET "descuentoPedidosTortas" = 5 WHERE "nombre" = 'Bronce';
UPDATE "Nivel" SET "descuentoPedidosTortas" = 10 WHERE "nombre" = 'Plata';
UPDATE "Nivel" SET "descuentoPedidosTortas" = 15 WHERE "nombre" = 'Oro';
UPDATE "Nivel" SET "descuentoPedidosTortas" = 20 WHERE "nombre" = 'Platino';
```

O usar el script incluido:
```bash
# Ejecutar en la consola de Neon o herramienta SQL:
psql $DATABASE_URL -f scripts/configurar-descuentos-tortas.sql
```

### 2. Testing del Panel Admin

**Objetivo:** Verificar que el admin puede editar los porcentajes de descuento

**Pasos:**
1. Ir a `/admin` e ingresar la admin key
2. Navegar a `/admin/niveles`
3. Verificar que se muestra la columna "Descuento Tortas" con los valores actuales
4. Hacer clic en "Editar" en un nivel
5. Cambiar el valor del descuento (ej: cambiar Bronce de 5% a 8%)
6. Hacer clic en "Guardar"
7. Verificar que el cambio se reflejó correctamente

**Resultado esperado:**
- ✅ Columna "Descuento Tortas" visible
- ✅ Valores editables con input numérico (0-100)
- ✅ Cambios se guardan correctamente
- ✅ Alert de confirmación se muestra
- ✅ Tabla se actualiza con el nuevo valor

### 3. Testing de la API /api/pass

**Objetivo:** Verificar que el endpoint devuelve el descuento del nivel

**Pasos:**
1. Iniciar sesión como cliente en la app
2. Obtener el token JWT del localStorage
3. Hacer request a `/api/pass` con el token

**Request:**
```bash
curl -X GET "https://tu-app.vercel.app/api/pass" \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

**Resultado esperado:**
```json
{
  "data": {
    "clienteId": "...",
    "nombre": "...",
    "nivel": {
      "nombre": "Plata",
      "orden": 2,
      "descripcionBeneficios": "...",
      "descuentoPedidosTortas": 10
    },
    ...
  }
}
```

- ✅ Campo `descuentoPedidosTortas` presente en `nivel`
- ✅ Valor correcto según el nivel del cliente

### 4. Testing de la Página de Tortas

**Objetivo:** Verificar que se muestra el descuento en la UI

**Pasos:**
1. Iniciar sesión como cliente con nivel Bronce, Plata u Oro
2. Navegar a `/tortas`
3. Seleccionar una torta y abrir detalles
4. Seleccionar tamaño y adicionales
5. Verificar el cálculo del descuento

**Resultado esperado:**
- ✅ Se muestra badge morado "🎁 Beneficio Nivel [nombre]"
- ✅ Indica el porcentaje de descuento
- ✅ Muestra el monto del descuento calculado
- ✅ Subtotal tachado si hay descuento
- ✅ Total final con descuento aplicado en verde
- ✅ Cálculo correcto: Total = (Torta + Adicionales) * (1 - descuento%)

**Ejemplo de cálculo:**
- Torta: $15,000
- Adicionales: $3,000
- Subtotal: $18,000
- Nivel Plata (10%): -$1,800
- **Total: $16,200**

### 5. Testing de Creación de Pedido en WooCommerce

**Objetivo:** Verificar que el descuento se envía como cupón a WooCommerce

**Pasos:**
1. Agregar una torta al carrito
2. Ir a `/carrito`
3. Completar fecha, hora y notas
4. Hacer clic en "Confirmar Pedido"
5. Verificar en el panel de WooCommerce

**Request esperado (logs del servidor):**
```json
{
  "line_items": [...],
  "coupon_lines": [
    {
      "code": "NIVEL_PLATA",
      "discount": "1800.00",
      "discount_tax": "0"
    }
  ],
  "meta_data": [
    ...
    {
      "key": "descuento_nivel",
      "value": "Plata - 10%"
    }
  ]
}
```

**En WooCommerce (Admin Panel):**
- ✅ Pedido creado con estado "Processing"
- ✅ Cupón "NIVEL_PLATA" aplicado (o el nivel correspondiente)
- ✅ Monto del descuento correcto
- ✅ Total del pedido refleja el descuento
- ✅ Metadata `descuento_nivel` visible

**En Ayres IT:**
- ✅ Pedido visible en el sistema
- ✅ Descuento aplicado correctamente
- ✅ Total coincide con el calculado en la app

### 6. Testing de Casos Edge

**Caso 1: Cliente sin nivel**
- Resultado: No se muestra descuento, precio normal

**Caso 2: Nivel con 0% de descuento**
- Resultado: No se muestra badge de descuento

**Caso 3: Cambio de descuento mientras el cliente navega**
- Resultado: Descuento se actualiza al refrescar `/tortas`

**Caso 4: Múltiples items en el carrito**
- Resultado: Descuento se aplica al total de todos los items de tortas

## 🔍 Checklist de Verificación

### Base de Datos
- [ ] Migración aplicada correctamente
- [ ] Campo `descuentoPedidosTortas` existe en tabla `Nivel`
- [ ] Valores por defecto configurados (5%, 10%, 15%, 20%)

### Admin Panel
- [ ] Columna "Descuento Tortas" visible en tabla
- [ ] Input numérico funciona (0-100)
- [ ] Validación de rango funciona
- [ ] Cambios se guardan correctamente
- [ ] Leyenda actualizada con descripción del nuevo campo

### API Backend
- [ ] `/api/pass` incluye `descuentoPedidosTortas` en respuesta
- [ ] `/api/admin/niveles/[id]` acepta campo en PATCH
- [ ] Validación de rango 0-100 funciona
- [ ] Prisma Client regenerado correctamente

### Frontend - Tortas
- [ ] Nivel del cliente se carga al entrar a `/tortas`
- [ ] Badge de descuento se muestra si > 0%
- [ ] Cálculo de descuento correcto
- [ ] Subtotal tachado se muestra
- [ ] Total con descuento en verde
- [ ] Formato de moneda correcto (separador de miles)

### Integración WooCommerce
- [ ] Cupón se genera con código `NIVEL_[NOMBRE]`
- [ ] Monto del descuento calculado correctamente
- [ ] `coupon_lines` se envía en el body
- [ ] Metadata `descuento_nivel` incluida
- [ ] Pedido en WooCommerce muestra el cupón aplicado
- [ ] Total del pedido es correcto

### Ayres IT
- [ ] Pedido visible en el sistema
- [ ] Descuento aplicado visible
- [ ] Total correcto

## 📊 Valores de Testing Recomendados

### Productos para probar:
- **Torta simple:** $15,000
- **Torta con adicionales:** $18,000 (torta + rellenos)
- **Torta grande:** $25,000

### Niveles a probar:
- **Bronce (5%):** Descuento de $750 en torta de $15,000
- **Plata (10%):** Descuento de $1,500 en torta de $15,000
- **Oro (15%):** Descuento de $2,250 en torta de $15,000

## 🐛 Debugging

### Si el descuento no aparece:
1. Verificar que el cliente tenga nivel asignado
2. Verificar que el nivel tenga descuento > 0
3. Revisar console del navegador para errores en `/api/pass`
4. Verificar localStorage tiene token válido

### Si el descuento no se aplica en WooCommerce:
1. Revisar logs del servidor en `/api/woocommerce/crear-pedido`
2. Verificar que `coupon_lines` esté en el request
3. Verificar permisos de WooCommerce API
4. Revisar que el cálculo del subtotal sea correcto

### Si el admin panel no guarda:
1. Verificar admin_key en localStorage
2. Revisar Network tab para errores 401
3. Verificar logs del servidor
4. Confirmar que la migración se aplicó

## 📝 Notas Importantes

- El descuento **solo se aplica en `/tortas`**, no en otros beneficios
- El descuento es sobre el **total del pedido** (torta base + adicionales)
- El cupón se envía a WooCommerce con el formato `NIVEL_[NOMBRE]`
- Ayres IT ve el descuento como un cupón genérico
- Los porcentajes son **editables por el admin** en cualquier momento
- Los cambios en porcentajes **no afectan pedidos ya creados**

## ✅ Deployment Checklist

Antes de hacer deploy a producción:
- [ ] Migración aplicada en base de datos de producción
- [ ] Descuentos configurados con valores deseados
- [ ] Testing completo en desarrollo
- [ ] Prisma Client generado
- [ ] Variables de entorno verificadas
- [ ] Documentación actualizada
- [ ] Testing en staging (si existe)
