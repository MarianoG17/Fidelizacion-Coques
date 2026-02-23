# 🗺️ Mapa Completo de URLs de la Aplicación

## 🌐 Dominio Principal

**Una vez configurado el dominio personalizado:**
```
https://app.coques.com.ar
```

**Actualmente (temporal):**
```
https://tu-proyecto.vercel.app
```

---

## 👥 SECCIÓN CLIENTES (Aplicación de Fidelización)

### URL Base: `/` (raíz)

| URL | Descripción | Acceso |
|-----|-------------|--------|
| **`/`** | Home / Landing page | Público |
| **`/login`** | Login de clientes | Público |
| **`/pass`** | Pase de fidelización (QR, nivel, beneficios) | Clientes |
| **`/perfil`** | Perfil del cliente | Clientes |
| **`/logros`** | Ver logros desbloqueados | Clientes |
| **`/historial`** | Historial de visitas y beneficios | Clientes |
| **`/tortas`** | Catálogo de tortas (pedidos WooCommerce) | Clientes |
| **`/carrito`** | Carrito de compras | Clientes |
| **`/presupuestos/[codigo]`** | Ver presupuesto específico | Cliente con código |
| **`/presupuestos/[codigo]/editar`** | Editar presupuesto (cliente) | Cliente con código |
| **`/recuperar-password`** | Recuperar contraseña | Público |
| **`/reset-password/[token]`** | Restablecer contraseña con token | Público (con token) |

**Ejemplo completo:**
```
https://app.coques.com.ar/pass
https://app.coques.com.ar/perfil
https://app.coques.com.ar/tortas
```

---

## 🏪 SECCIÓN LOCAL (Staff/Atención al Cliente)

### URL Base: `/local`

| URL | Descripción | Acceso | Login |
|-----|-------------|--------|-------|
| **`/local`** | Dashboard del local (vista salón + mesas) | Staff | ✅ Requerido |
| **`/local/login`** | Login del personal | Público | - |
| **`/local/tomar-pedido`** | Tomar pedido manual | Staff | ✅ Requerido |
| **`/local/presupuestos`** | Lista de presupuestos | Staff | ✅ Requerido |
| **`/local/presupuestos/[codigo]`** | Ver presupuesto (staff) | Staff | ✅ Requerido |
| **`/local/presupuestos/[codigo]/editar`** | Editar presupuesto (staff) | Staff | ✅ Requerido |

**Credenciales de login:**
```
Usuario: coques
Contraseña: (configurada en COQUES_LOCAL_PASSWORD)
```

**Ejemplo completo:**
```
https://app.coques.com.ar/local
https://app.coques.com.ar/local/tomar-pedido
https://app.coques.com.ar/local/presupuestos
```

**Funcionalidades:**
- ✅ Ver estado del salón (mesas ocupadas/libres)
- ✅ Escanear QR de clientes (sumar visitas)
- ✅ Gestionar sesiones de mesas
- ✅ Tomar pedidos manuales
- ✅ Gestionar presupuestos

---

## 👨‍💼 SECCIÓN ADMIN (Administración)

### URL Base: `/admin`

| URL | Descripción | Acceso | Login |
|-----|-------------|--------|-------|
| **`/admin`** | Dashboard administrativo | Admin | ⚠️ A implementar |
| **`/admin/beneficios`** | Gestionar beneficios | Admin | ⚠️ A implementar |
| **`/admin/niveles`** | Gestionar niveles (Bronce, Plata, Oro) | Admin | ⚠️ A implementar |
| **`/admin/woocommerce-test`** | Testing de WooCommerce | Admin | ⚠️ A implementar |

**Ejemplo completo:**
```
https://app.coques.com.ar/admin
https://app.coques.com.ar/admin/beneficios
https://app.coques.com.ar/admin/niveles
```

**Funcionalidades:**
- 📊 Ver estadísticas generales
- 👥 Gestionar clientes
- 🎁 Crear/editar beneficios
- 🏆 Configurar niveles
- 📈 Ver métricas del programa
- 🎉 Gestionar eventos especiales

**Estado actual:**
- ⚠️ Las páginas existen pero falta agregar autenticación/login
- ⚠️ Actualmente son públicas (cualquiera puede acceder)
- ⚠️ Recomendado: agregar sistema de login para admin

---

## 🔄 Comparación: Local vs Admin

| Aspecto | `/local` (Staff) | `/admin` (Administrador) |
|---------|------------------|--------------------------|
| **Usuarios** | Personal del local | Tú (dueño/admin) |
| **Login** | ✅ `coques` + password | ⚠️ Falta implementar |
| **Propósito** | Operaciones diarias | Configuración y análisis |
| **Funciones** | Escanear QR, mesas, pedidos | Gestionar beneficios, niveles, stats |
| **Frecuencia** | Uso diario constante | Uso ocasional (configuración) |
| **Dispositivo** | Tablet/celular en el local | Computadora de oficina |

---

## 🚪 SECCIÓN LAVADERO (Opcional - Separada)

### URL Base: `/lavadero`

| URL | Descripción |
|-----|-------------|
| **`/lavadero`** | Dashboard del lavadero |
| **`/lavadero/login`** | Login del lavadero |

**Nota:** Sistema separado para el lavadero (DeltaWash). Usa su propia autenticación.

---

## 🔗 URLs Especiales (No visibles en menú)

### APIs (Backend)

Estas URLs son para comunicación entre sistemas, no para navegación humana:

```
/api/auth/login
/api/auth/register
/api/auth/forgot-password
/api/pass/beneficios-disponibles
/api/woocommerce/tortas
/api/presupuestos
... (muchas más)
```

---

## 📱 Instalación como PWA

La aplicación puede instalarse como app en el dispositivo:

**Para clientes:**
- Manifest: `/manifest.json`
- Instala como "Coques Pass"

**Para staff:**
- Manifest: `/manifest-staff.json`
- Instala como "Coques Staff"

Ver guía: [`INSTALACION-PWA-DUAL.md`](fidelizacion-zona/INSTALACION-PWA-DUAL.md)

---

## 🎯 Resumen por Audiencia

### 📱 Clientes (App móvil)

**URLs principales que usan:**
```
/login                    - Ingresar
/pass                     - Ver su pase/QR
/perfil                   - Su perfil
/logros                   - Sus logros
/tortas                   - Hacer pedidos
/historial                - Ver historial
```

**Cómo acceden:**
- Instalando la PWA en su celular
- O navegando directamente desde el navegador

---

### 🏪 Staff (Tablet en el local)

**URLs principales que usan:**
```
/local/login              - Ingresar
/local                    - Dashboard salón
/local/tomar-pedido       - Tomar pedido
/local/presupuestos       - Ver presupuestos
```

**Cómo acceden:**
- Tablet fija en el local
- Instalando PWA Staff
- Usuario: `coques` + password

**Tareas diarias:**
1. Login al entrar al local
2. Ver estado del salón (mesas)
3. Escanear QR de clientes
4. Gestionar sesiones de mesas
5. Tomar pedidos

---

### 👨‍💼 Tú/Admin (Computadora)

**URLs principales que usarás:**
```
/admin                    - Dashboard admin
/admin/beneficios         - Gestionar beneficios
/admin/niveles            - Configurar niveles
```

**Cómo accedes:**
- Desde tu computadora
- Navegador normal
- ⚠️ Actualmente sin login (recomendado agregarlo)

**Tareas ocasionales:**
1. Ver estadísticas del programa
2. Crear/editar beneficios
3. Ajustar criterios de niveles
4. Ver métricas de clientes
5. Gestionar eventos especiales

---

## 🔐 Sistemas de Autenticación

### 1. Clientes (`/login`)
- Email + contraseña
- JWT almacenado en localStorage
- Registro público disponible

### 2. Staff Local (`/local/login`)
- Usuario fijo: `coques`
- Contraseña configurada en env: `COQUES_LOCAL_PASSWORD`
- JWT almacenado en localStorage

### 3. Admin (`/admin`)
- ⚠️ Actualmente sin autenticación
- Recomendado: agregar login separado
- O usar mismo sistema que staff pero con roles

---

## 📊 Flujo Típico de Uso

### Cliente nuevo:

1. `app.coques.com.ar` → Ve landing
2. `/login` → Click en "Registrarse"
3. Se registra → Recibe email de bienvenida
4. `/pass` → Ve su QR y nivel (Bronce)
5. Va al local → Staff escanea su QR
6. `/historial` → Ve su visita registrada
7. `/logros` → Ve logros desbloqueados
8. `/tortas` → Hace un pedido

### Staff en el día a día:

1. `/local/login` → Ingresa al empezar el turno
2. `/local` → Ve el salón vacío al abrir
3. Cliente llega → Asigna mesa (click en mesa)
4. Cliente pide QR → Escanea QR del cliente
5. Cliente se va → Libera mesa
6. Cliente pregunta por presupuesto → `/local/presupuestos`

### Tú como admin:

1. `/admin` → Dashboard general
2. `/admin/beneficios` → Crear beneficio de "Café gratis"
3. `/admin/niveles` → Ajustar criterio de nivel Oro (de 15 a 20 visitas)
4. Ver métricas → Analizar engagement
5. Repetir cuando sea necesario (semanal/mensual)

---

## 🌐 URLs Completas con Dominio

**Una vez configurado `app.coques.com.ar`:**

### Para compartir con clientes:
```
https://app.coques.com.ar/login
```

### Para el staff (pueden guardarlo en favoritos):
```
https://app.coques.com.ar/local/login
```

### Para vos:
```
https://app.coques.com.ar/admin
```

### Para presupuestos (se envían por WhatsApp):
```
https://app.coques.com.ar/presupuestos/ABC123
```

---

## 📝 Notas Importantes

### Sobre `/local` vs `/admin`:

**`/local`:**
- ✅ Tiene login implementado
- ✅ Funcionalidad completa
- ✅ Listo para producción
- 🎯 Uso: Personal del local

**`/admin`:**
- ⚠️ Sin login (público actualmente)
- ✅ Funcionalidad implementada
- ⚠️ Recomendado agregar autenticación antes de producción
- 🎯 Uso: Solo vos (dueño/admin)

### Recomendación:

Por ahora, podés usar `/admin` sin problemas porque:
1. La URL no se comparte públicamente
2. Nadie más la conoce
3. Solo vos la usarás

**Pero para producción seria:**
- Agregar login para `/admin`
- O restringir acceso por IP
- O usar VPN
- O agregar autenticación básica HTTP

---

## 🎯 TL;DR (Resumen Ultra Corto)

**Dominio:** `app.coques.com.ar`

**3 Secciones Principales:**

1. **`/`** (raíz) → App de clientes
   - Login, pase, beneficios, pedidos

2. **`/local`** → Panel del staff
   - Login: `coques` + password
   - Mesas, escanear QR, presupuestos

3. **`/admin`** → Panel administrativo
   - Sin login (solo para vos)
   - Beneficios, niveles, estadísticas

**¡Eso es todo!** 🎉
