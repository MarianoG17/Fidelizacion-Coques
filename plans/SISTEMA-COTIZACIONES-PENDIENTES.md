# Sistema de Cotizaciones/Presupuestos Pendientes

## Fecha: 2026-02-21
## Estado: Planificación

---

## 📋 Objetivo

Permitir que los clientes y el staff guarden pedidos como **presupuestos pendientes** que pueden ser:
- Completados posteriormente (agregar información faltante)
- Confirmados y convertidos en pedido real
- Gestionados por atención al cliente

---

## 🎯 Casos de Uso

### Para Clientes:
1. Cliente configura una torta temática compleja
2. No tiene toda la información (ej: falta imagen de referencia)
3. Guarda como **"Presupuesto Pendiente"**
4. Recibe un código/link para acceder más tarde
5. Completa la información faltante
6. Confirma el pedido

### Para Staff/Atención al Cliente:
1. Cliente llama por teléfono para consultar
2. Staff crea presupuesto con la información disponible
3. Marca campos pendientes
4. Cliente envía información faltante (fotos, etc.) por WhatsApp
5. Staff completa el presupuesto
6. Confirma y crea el pedido en WooCommerce

---

## 🗄️ Estructura de Base de Datos

### Tabla: `Presupuesto`

```prisma
model Presupuesto {
  id                Int       @id @default(autoincrement())
  codigo            String    @unique // Código para acceder (ej: "PRES-2024-001")
  clienteId         Int?      // Opcional, puede ser anónimo
  cliente           Cliente?  @relation(fields: [clienteId], references: [id])
  
  // Información del cliente (puede ser manual)
  nombreCliente     String?
  telefonoCliente   String?
  emailCliente      String?
  
  // Datos del pedido
  items             Json      // Array de items del carrito
  precioTotal       Float
  descuento         Float     @default(0)
  
  // Fechas
  fechaEntrega      DateTime?
  horaEntrega       String?
  
  // Estado
  estado            String    @default("PENDIENTE") // PENDIENTE, COMPLETO, CONFIRMADO, CANCELADO
  camposPendientes  Json?     // Array de campos que faltan completar
  
  // Notas
  notasInternas     String?   // Para el staff
  notasCliente      String?   // Del cliente
  
  // Tracking
  creadoPor         String?   // "cliente" o nombre del staff
  creadoEn          DateTime  @default(now())
  actualizadoEn     DateTime  @updatedAt
  confirmadoEn      DateTime? // Cuando se convierte en pedido
  wooOrderId        Int?      // ID del pedido en WooCommerce si se confirmó
  
  @@index([codigo])
  @@index([clienteId])
  @@index([estado])
}
```

---

## 🔧 APIs Necesarias

### 1. Crear Presupuesto
**POST** `/api/presupuestos`
```typescript
{
  items: ItemCarrito[],
  nombreCliente?: string,
  telefonoCliente?: string,
  emailCliente?: string,
  fechaEntrega?: string,
  horaEntrega?: string,
  notasCliente?: string,
  camposPendientes?: string[] // ["imagen_referencia", "color_cubierta", etc.]
}
```

**Respuesta:**
```typescript
{
  codigo: "PRES-2024-001",
  linkAcceso: "https://app.com/presupuestos/PRES-2024-001",
  mensaje: "Presupuesto guardado. Código: PRES-2024-001"
}
```

### 2. Consultar Presupuesto
**GET** `/api/presupuestos/:codigo`

### 3. Actualizar Presupuesto
**PATCH** `/api/presupuestos/:codigo`

### 4. Confirmar Presupuesto (convertir en pedido)
**POST** `/api/presupuestos/:codigo/confirmar`

### 5. Listar Presupuestos (Admin/Staff)
**GET** `/api/presupuestos?estado=PENDIENTE&limite=50`

---

## 🎨 Interfaz de Usuario

### 1. Página de Carrito - Botón Adicional
```
[Proceder al Checkout]  [Guardar como Presupuesto]
```

### 2. Modal de Guardar Presupuesto
```
┌─────────────────────────────────────────┐
│  Guardar como Presupuesto               │
├─────────────────────────────────────────┤
│                                         │
│  Nombre: [________________]             │
│  Teléfono: [______________]             │
│  Email (opcional): [______]             │
│                                         │
│  ¿Qué información te falta?             │
│  ☐ Imagen de referencia                 │
│  ☐ Color de cubierta                    │
│  ☐ Fecha de entrega                     │
│  ☐ Otro: [___________]                  │
│                                         │
│  Notas: [_________________________]     │
│                                         │
│  [Cancelar]  [Guardar Presupuesto]      │
└─────────────────────────────────────────┘
```

### 3. Confirmación
```
✓ Presupuesto Guardado

Código: PRES-2024-001

Guardá este código para acceder más tarde.
También te enviamos un link por WhatsApp/Email.

[Ir a mis presupuestos]  [Cerrar]
```

### 4. Página: `/presupuestos/:codigo`
- Mostrar items del presupuesto
- Campos pendientes destacados
- Formulario para completar información
- Botón "Confirmar Pedido"

### 5. Admin: Gestión de Presupuestos
Ruta: `/admin/presupuestos`

Tabla con:
- Código
- Cliente
- Fecha creación
- Estado (PENDIENTE, COMPLETO, CONFIRMADO)
- Precio total
- Campos pendientes
- Acciones: [Ver] [Editar] [Confirmar] [Cancelar]

---

## 📱 Notificaciones

### WhatsApp/Email Automático
Cuando se crea un presupuesto:
```
🎂 Coques Bakery

Tu presupuesto ha sido guardado.

Código: PRES-2024-001
Link: https://app.coquesbakery.com.ar/presupuestos/PRES-2024-001

Podés completarlo cuando quieras.
¿Dudas? WhatsApp: +54 9 XXX XXXXXXX
```

---

## 🔄 Flujo Completo

### Flujo Cliente:
1. Cliente configura torta en `/tortas`
2. Agrega al carrito
3. En `/carrito`, click en "Guardar como Presupuesto"
4. Completa formulario con datos básicos
5. Marca qué información le falta
6. Recibe código y link
7. Más tarde, accede con el link
8. Completa información pendiente
9. Click en "Confirmar Pedido"
10. Se crea pedido en WooCommerce

### Flujo Staff:
1. Cliente llama por teléfono
2. Staff entra a `/local/presupuestos/nuevo`
3. Configura el pedido con la info del cliente
4. Marca campos pendientes (ej: "Falta imagen")
5. Guarda presupuesto
6. Envía código al cliente por WhatsApp
7. Cliente envía foto por WhatsApp
8. Staff en `/admin/presupuestos` edita y agrega la foto
9. Confirma el presupuesto
10. Se crea pedido en WooCommerce

---

## ✅ Tareas de Implementación

### Backend:
- [ ] Crear migración Prisma para tabla `Presupuesto`
- [ ] API: POST `/api/presupuestos` (crear)
- [ ] API: GET `/api/presupuestos/:codigo` (consultar)
- [ ] API: PATCH `/api/presupuestos/:codigo` (actualizar)
- [ ] API: POST `/api/presupuestos/:codigo/confirmar` (convertir en pedido)
- [ ] API: GET `/api/admin/presupuestos` (listar para admin)
- [ ] Función generadora de códigos únicos (ej: PRES-2024-001)
- [ ] Integración con API de WooCommerce para crear pedido

### Frontend Cliente:
- [ ] Botón "Guardar como Presupuesto" en página carrito
- [ ] Modal para guardar presupuesto
- [ ] Página `/presupuestos/:codigo` para ver/editar
- [ ] Botón "Confirmar Pedido" en presupuesto completo
- [ ] Lista de presupuestos del cliente en `/perfil`

### Frontend Admin/Staff:
- [ ] Página `/admin/presupuestos` con tabla
- [ ] Filtros: Estado, Fecha, Cliente
- [ ] Modal para editar presupuesto
- [ ] Vista detallada de presupuesto
- [ ] Botón confirmar presupuesto
- [ ] Indicador de campos pendientes

### Notificaciones:
- [ ] Template de email con código y link
- [ ] Template de WhatsApp (manual o API)
- [ ] Notificación a staff cuando cliente completa presupuesto

---

## 🚀 Prioridad de Implementación

### Fase 1 (MVP):
1. Base de datos
2. API crear presupuesto
3. API consultar presupuesto
4. Página ver presupuesto
5. Botón en carrito

### Fase 2:
6. API confirmar presupuesto
7. Botón confirmar en frontend
8. Lista de presupuestos en perfil

### Fase 3:
9. Admin: Lista de presupuestos
10. Admin: Editar presupuestos
11. Notificaciones automáticas

---

## 📊 Métricas a Considerar

- Cantidad de presupuestos creados por día
- Tasa de conversión (presupuestos → pedidos confirmados)
- Tiempo promedio entre creación y confirmación
- Campos más frecuentemente pendientes
- Presupuestos abandonados (>7 días sin confirmar)

---

## 🔐 Seguridad

- Códigos únicos no secuenciales (evitar adivinación)
- Validar que cliente solo pueda editar sus propios presupuestos
- Rate limiting en APIs
- Solo staff puede ver todos los presupuestos
- Log de cambios en presupuestos (auditoría)

---

## Notas Adicionales

- Compatible con modo staff actual
- Los presupuestos expiran después de 30 días sin actividad
- Posibilidad de duplicar presupuesto para hacer variaciones
- Export a PDF para enviar por email/WhatsApp
