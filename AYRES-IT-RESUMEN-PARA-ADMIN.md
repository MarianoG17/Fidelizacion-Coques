# Resumen: Integración Ayres IT - Para Admin de WooCommerce

## 📋 Situación Actual

La app de fidelización ahora envía correctamente los campos de fecha y hora de entrega al crear pedidos en WooCommerce, pero el plugin "Edit Order Delivery Date and/or Time" de Ayres IT **no está reconociendo** estos campos en los pedidos nuevos.

## ✅ Lo que SÍ funciona

- **Pedido #2263**: Configurado manualmente por el admin, muestra correctamente fecha y hora en Ayres IT
- **Pedidos desde la app**: Se crean correctamente en WooCommerce con estado "Procesando"
- **Campos personalizados**: Los pedidos de la app incluyen los campos españoles correctos

## ❌ El problema

Los pedidos nuevos desde la app **no muestran fecha/hora en el plugin de Ayres IT**, a pesar de tener los campos idénticos al pedido #2263 que sí funciona.

---

## 🔍 Lo que necesita revisar el Admin de WooCommerce

### 1. Configuración del plugin "Edit Order Delivery Date and/or Time"

**Ubicación**: WooCommerce → Settings → Order Delivery Date & Time

Revisar:
- ✅ ¿Está el plugin activo y configurado?
- ✅ ¿Qué campos está esperando el plugin?
- ✅ ¿Hay alguna configuración de "fuente de datos" o "origen de pedidos"?
- ✅ ¿Hay filtros por método de pago o tipo de pedido?
- ✅ ¿El plugin requiere que los campos se creen de alguna forma específica (via API especial)?

### 2. Comparación de campos personalizados

**Pedido #2263 (FUNCIONA)** tiene en Campos Personalizados:
```
¿Para que fecha querés el pedido? = 16 febrero, 2026
¿En que horario? = 17:00 - 18:00
```

**Pedidos nuevos desde la app** tienen EXACTAMENTE los mismos campos:
```
¿Para que fecha querés el pedido? = 16 febrero, 2026
¿En que horario? = 17:00 - 18:00
```

**PERO**: El plugin de Ayres IT no los reconoce en los pedidos nuevos.

### 3. Posibles causas (para que el admin investigue)

#### A) El plugin tiene una API especial
- Algunos plugins de delivery date requieren que uses **su propia API** para crear pedidos
- No basta con agregar los campos como meta_data
- Necesita revisar la documentación del plugin

#### B) Configuración de "orígenes permitidos"
- El plugin puede tener configuración para aceptar solo pedidos de ciertas fuentes
- Verificar si hay settings como "Allow from REST API" o similar

#### C) Campos ocultos o ID internos
- El plugin puede estar guardando data en campos ocultos con nombres tipo `_orddd_timestamp`
- Revisar con F12 o phpMyAdmin qué campos tiene REALMENTE el pedido #2263 en la base de datos

#### D) Hook de WooCommerce
- El plugin puede estar usando hooks como `woocommerce_checkout_update_order_meta`
- No se dispara cuando creamos pedidos via REST API
- Necesitaría configuración especial

### 4. Preguntas para el desarrollador del plugin o soporte de Ayres IT

1. **¿Cómo se deben crear pedidos via WooCommerce REST API para que el plugin los reconozca?**
2. **¿Hay campos especiales o meta_data específicos que debemos enviar?**
3. **¿El plugin tiene webhooks o endpoints propios para recibir fecha/hora?**
4. **¿Por qué el pedido #2263 funciona pero los nuevos no?** (con capturas de los campos personalizados)

---

## 📊 Lo que ya hemos intentado (código de la app)

### Versión 1: Campos en inglés técnicos
```javascript
meta_data: [
  { key: '_delivery_date', value: '2026-02-16' },
  { key: 'delivery_date', value: '2026-02-16' },
  { key: '_delivery_time', value: '17:00' },
  // ... más variantes
]
```
**Resultado**: La columna aparecía en Ayres IT pero vacía

### Versión 2: Campos en español (igual que pedido #2263)
```javascript
meta_data: [
  { 
    key: '¿Para que fecha querés el pedido?', 
    value: '16 Febrero, 2026'  // ⚠️ Mes con mayúscula
  },
  { 
    key: '¿En que horario?', 
    value: '17:00 - 18:00' 
  }
]
```
**Resultado**: Plugin mostraba "1 Enero, 1970" (fecha incorrecta)

### Versión 3: Mes en minúscula (formato exacto de pedido #2263)
```javascript
meta_data: [
  { 
    key: '¿Para que fecha querés el pedido?', 
    value: '16 febrero, 2026'  // ✅ Mes en minúscula
  },
  { 
    key: '¿En que horario?', 
    value: '17:00 - 18:00' 
  }
]
```
**Resultado**: Sigue sin funcionar (actual)

---

## 📁 Archivos relevantes del código

### API de creación de pedidos
**Archivo**: `src/app/api/woocommerce/crear-pedido/route.ts`

**Líneas 117-176**: Formato de fecha y envío de meta_data
```typescript
// Formato español para Ayres IT: "16 febrero, 2026" (mes en minúscula!)
const mesesES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const dia = fechaSeleccionada.getDate()
const mes = mesesES[fechaSeleccionada.getMonth()]
const anio = fechaSeleccionada.getFullYear()
const fechaEspanol = `${dia} ${mes}, ${anio}` // "16 febrero, 2026"

// Rango de horario: "17:00 - 18:00"
const horaInicio = horaSeleccionada
const [hora, mins] = horaInicio.split(':')
const horaFin = `${parseInt(hora) + 1}:00`
const rangoHorario = `${horaInicio} - ${horaFin}`

// Envío a WooCommerce
meta_data: [
  {
    key: '¿Para que fecha querés el pedido?',
    value: fechaEspanol,
  },
  {
    key: '¿En que horario?',
    value: rangoHorario,
  },
]
```

---

## 💡 Posibles soluciones (para que el admin pruebe)

### Opción 1: Usar API específica del plugin
Si el plugin tiene su propia API, debemos usarla:
```bash
# Ejemplo hipotético
POST /wp-json/orddd/v1/set-delivery-date
{
  "order_id": 2266,
  "delivery_date": "2026-02-16",
  "delivery_time": "17:00"
}
```

### Opción 2: Crear pedido manualmente primero, luego actualizarlo
1. Crear pedido en WooCommerce via REST API (sin fecha)
2. Inmediatamente actualizar con la API del plugin de Ayres IT
3. Cambiar código de la app para hacer 2 requests

### Opción 3: Configuración del plugin
- Habilitar "Allow orders from REST API"
- Mapear campos personalizados a campos del plugin
- Configurar "default delivery settings"

### Opción 4: Contactar soporte de Ayres IT
Enviarles:
- Screenshot del pedido #2263 (funciona)
- Screenshot de pedido nuevo (no funciona)
- Preguntarles por qué uno funciona y otro no

---

## 📧 Template para contactar soporte

```
Asunto: Pedidos via REST API no son reconocidos por plugin

Hola,

Estoy usando el plugin "Edit Order Delivery Date and/or Time" en mi tienda WooCommerce.

PROBLEMA:
- Pedidos creados manualmente en el admin: ✅ El plugin muestra fecha/hora correctamente
- Pedidos creados via WooCommerce REST API: ❌ El plugin no reconoce los campos

DATOS ENVIADOS:
Estoy enviando los campos exactamente como aparecen en un pedido funcional:

meta_data: [
  {
    "key": "¿Para que fecha querés el pedido?",
    "value": "16 febrero, 2026"
  },
  {
    "key": "¿En que horario?",
    "value": "17:00 - 18:00"
  }
]

PREGUNTA:
¿Hay alguna configuración especial o API del plugin que deba usar para que 
los pedidos creados via REST API sean reconocidos?

Gracias.
```

---

## 🔗 Enlaces útiles

- **Pedido funcional**: WooCommerce → Pedidos → #2263
- **Pedidos de prueba**: Buscar por "origen" = "app_fidelizacion"
- **Plugin settings**: WooCommerce → Settings → Order Delivery Date
- **WooCommerce REST API docs**: https://woocommerce.github.io/woocommerce-rest-api-docs/

---

## 📅 Próximos pasos

1. **Admin revisa configuración del plugin** (esta semana)
2. **Admin contacta soporte de Ayres IT** si es necesario
3. **Admin comparte hallazgos** sobre cómo debe enviarse la fecha/hora
4. **Ajustamos el código de la app** según lo que indique el admin
5. **Testing final** con pedido real

---

## ✉️ Contacto

Si el admin necesita información adicional sobre:
- Qué campos exactos estamos enviando
- Cómo se ve la estructura del request a WooCommerce
- Acceso al código fuente

**Avisar para coordinar** una sesión donde podamos trabajar juntos en la solución.
