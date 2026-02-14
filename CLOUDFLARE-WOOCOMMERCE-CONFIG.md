# 🛡️ Configuración de Cloudflare para WooCommerce API

## ⚠️ Problema Detectado

El diagnóstico muestra **Error 403 (Forbidden)** al intentar acceder a la API de WooCommerce. Esto indica que **Cloudflare está bloqueando las peticiones** de la aplicación de fidelización.

```json
{
  "pruebaConexion": {
    "url": "https://coques.com.ar/wp-json/wc/v3/system_status",
    "status": 403,
    "statusText": "Forbidden"
  }
}
```

## 🔒 Nota Importante sobre Seguridad

**"Essentially Off" solo afecta la ruta de la API de WooCommerce**, no todo el sitio:
- ✅ Tu admin de WordPress sigue protegido
- ✅ Tus páginas siguen protegidas
- ✅ La API de WooCommerce tiene su propia autenticación (Consumer Key/Secret)
- ✅ Sin credenciales válidas, nadie puede usar la API

**Es como tener dos puertas**: Cloudflare (más permisivo para API) + Autenticación WooCommerce (credenciales).

---

## ✅ Soluciones (Ordenadas por Seguridad)

### Opción 1: Security Level "Medium" (MÁS SEGURA)

Mantiene protección básica pero permite APIs legítimas.

**Pasos en Cloudflare:**

1. Ve a tu sitio en **Cloudflare Dashboard**
2. Ve a **Rules → Page Rules**
3. Crea una nueva regla:

   **URL:** `coques.com.ar/wp-json/wc/*`
   
   **Settings:**
   - **Security Level**: `Medium`
   - **Browser Integrity Check**: `Off`
   
4. Guarda la regla

**Ventajas:**
- ✅ Mantiene protección contra ataques básicos
- ✅ Permite peticiones legítimas de APIs
- ✅ Bloquea tráfico sospechoso conocido

**Desventajas:**
- ⚠️ Puede seguir bloqueando algunas peticiones legítimas si Vercel usa IPs marcadas

---

### Opción 2: Essentially Off (MÁS PERMISIVA)

Si la Opción 1 no funciona, usa esta.

**Pasos en Cloudflare:**

1. Ve a tu sitio en **Cloudflare Dashboard**
2. Ve a **Rules → Page Rules** (o **Reglas → Reglas de página**)
3. Haz clic en **Create Page Rule** (Crear regla de página)
4. Configura:

   **URL:** `coques.com.ar/wp-json/wc/*`
   
   **Settings (Configuración):**
   - **Security Level**: `Essentially Off` (Desactivado esencialmente)
   - **Browser Integrity Check**: `Off` (Desactivado)
   - **Disable Security**: No activar
   
5. Guarda la regla

**Importante:** Las Page Rules son limitadas en el plan gratuito (3 reglas). Si ya usaste todas, considera las otras opciones.

---

### Opción 2: WAF Rules (Firewall Rules) - Más Granular

Si tienes plan Pro o superior, o quieres más control:

1. Ve a **Security → WAF** (o **Seguridad → WAF**)
2. Ve a **Custom rules** (Reglas personalizadas)
3. Crea una regla nueva:

   **Rule name:** `Allow WooCommerce API`
   
   **Field:** `URI Path`  
   **Operator:** `starts with`  
   **Value:** `/wp-json/wc/`
   
   **Then:** `Skip` → Select `All remaining custom rules`
   
4. Guarda y deploy

---

### Opción 3: IP Access Rules - Whitelist de Vercel

Permitir todas las IPs de Vercel (puede ser menos seguro):

1. Ve a **Security → WAF** → **Tools**
2. Ve a **IP Access Rules**
3. Agrega estas reglas:

**IMPORTANTE:** Vercel usa rangos de IP dinámicos. La mejor opción es usar Page Rules o WAF Rules basadas en la ruta, no en IP.

---

### Opción 4: Desactivar "Bot Fight Mode" para API

1. Ve a **Security → Bots**
2. Si tienes **Bot Fight Mode** activado:
   - No se puede desactivar solo para ciertas rutas en el plan gratuito
   - Considera usar Page Rules o WAF Rules en su lugar

---

### Opción 5: Ajustar Security Level (Temporal, NO RECOMENDADO)

**SOLO para pruebas**, luego usa Page Rules:

1. Ve a **Security → Settings**
2. Cambia **Security Level** de `High` a `Medium` o `Low`
3. Prueba la conexión
4. **IMPORTANTE:** Vuelve a subirlo y usa Page Rules en su lugar

---

## 📋 Configuración Completa Recomendada

### 1. Page Rule Principal (ESENCIAL)

```
URL: coques.com.ar/wp-json/wc/*
Settings:
  - Security Level: Essentially Off
  - Browser Integrity Check: Off
```

### 2. Page Rule Alternativa (si prefieres)

```
URL: coques.com.ar/wp-json/*
Settings:
  - Security Level: Medium
  - Browser Integrity Check: Off
  - Bot Fight Mode: Off (si está disponible)
```

---

## 🔒 Seguridad Adicional (Opcional)

Si te preocupa la seguridad después de abrir la API:

### Opción A: Usar Cloudflare Access

1. Configurar Cloudflare Access para proteger `/wp-json/wc/`
2. Permitir solo peticiones con headers específicos

### Opción B: Firewall Rule con User-Agent

Crear una regla que permita solo peticiones con un User-Agent específico:

```
Field: User Agent
Operator: contains
Value: "FidelizacionApp"

Action: Allow
```

Luego, en la aplicación, agregar este User-Agent a las peticiones.

---

## 🆘 Si Nada Funciona

### Verificar Cloudflare está activo

1. Haz un `ping coques.com.ar` o usa [whatsmydns.net](https://www.whatsmydns.net/)
2. Si las IPs son de Cloudflare (comienzan con `104.`, `172.`, etc.), Cloudflare está activo

### Ver Logs de Firewall

1. Ve a **Security → Events** en Cloudflare
2. Busca eventos bloqueados de las IPs de Vercel
3. Crea reglas de exclusión basadas en lo que veas

### Contactar Soporte de WooCommerce

Si el problema persiste, puede ser que WooCommerce tenga alguna configuración adicional de seguridad.

---

## 📞 Información para el Administrador

**Para configurar correctamente:**

1. **La opción más simple:** Crear una Page Rule para `coques.com.ar/wp-json/wc/*` con Security Level en "Essentially Off"

2. **Tiempo estimado:** 5 minutos

3. **Riesgo de seguridad:** Bajo, solo afecta las rutas de la API de WooCommerce

4. **Beneficio:** Permitirá que la app de fidelización consulte productos y cree pedidos automáticamente

---

## 🎯 Resumen para el Admin de Cloudflare

### Configuración Recomendada (Prueba en este orden)

**Primera opción (Más segura):**
```
1. Ir a: Cloudflare → Rules → Page Rules
2. Crear regla nueva
3. URL: coques.com.ar/wp-json/wc/*
4. Setting 1: Security Level → Medium
5. Setting 2: Browser Integrity Check → Off
6. Guardar y probar

Si funciona: ¡Listo! ✅
Si sigue dando 403: Continúa con la segunda opción ↓
```

**Segunda opción (Si la primera no funciona):**
```
1. Editar la misma regla
2. Cambiar Security Level de "Medium" a "Essentially Off"
3. Guardar y probar
```

### ¿Por qué es seguro?

1. **Solo afecta `/wp-json/wc/*`** → El resto del sitio mantiene seguridad High/Medium
2. **La API tiene autenticación propia** → Sin Consumer Key/Secret válidos, nadie puede acceder
3. **WordPress también protege** → Límites de peticiones, permisos, etc.

Esto permitirá que las peticiones de la API REST de WooCommerce pasen sin ser bloqueadas por Cloudflare, manteniendo el resto del sitio protegido.
