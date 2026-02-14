# 🔧 Troubleshooting Cloudflare - WooCommerce API Bloqueada

## ❌ Problema Persistente

Después de crear la Page Rule, sigue dando **403 Forbidden**.

---

## ✅ Checklist de Verificación para el Admin

### 1. Verificar que la Page Rule existe y está activa

**En Cloudflare Dashboard:**

1. Ve a **Rules → Page Rules**
2. Verifica que veas una regla similar a:

```
URL Pattern: coques.com.ar/wp-json/wc/*
Settings:
  ✓ Security Level: Medium (o Essentially Off)
  ✓ Browser Integrity Check: Off
Status: Active (no debería decir "Disabled")
```

**⚠️ Importante:** 
- La URL debe ser **exactamente** `coques.com.ar/wp-json/wc/*`
- NO incluir `https://` ni `www.`
- El `*` al final es obligatorio

---

### 2. Verificar la URL exacta de la regla

**URLs que funcionan:**
- ✅ `coques.com.ar/wp-json/wc/*`
- ✅ `*.coques.com.ar/wp-json/wc/*` (si usas subdominios)
- ✅ `*coques.com.ar/wp-json/wc/*` (más amplio)

**URLs que NO funcionan:**
- ❌ `https://coques.com.ar/wp-json/wc/*` (no incluir protocolo)
- ❌ `coques.com.ar/wp-json/wc` (falta el `/*` al final)
- ❌ `coques.com.ar/wp-json/*` (demasiado amplio, pero debería funcionar)

---

### 3. Verificar el orden de las Page Rules

Si tienes múltiples Page Rules, el **orden importa**. Cloudflare aplica solo la primera que coincida.

**Ejemplo de problema:**

```
Orden 1: coques.com.ar/* → Security Level: High
Orden 2: coques.com.ar/wp-json/wc/* → Security Level: Medium
```

En este caso, **la Orden 1 se aplica primero** y bloquea la API.

**Solución:**
- Arrastra la regla de `/wp-json/wc/*` hacia arriba
- Debe estar ANTES de cualquier regla más general

---

### 4. Verificar que no hay otras reglas bloqueando

#### A) Firewall Rules / WAF Rules

1. Ve a **Security → WAF**
2. Ve a **Custom rules**
3. Verifica que no haya ninguna regla que bloquee:
   - User-Agent específicos
   - IPs de Vercel
   - Headers específicos

Si hay alguna regla bloqueando, créale una excepción para `/wp-json/wc/*`

#### B) Rate Limiting

1. Ve a **Security → WAF → Rate limiting rules**
2. Si hay reglas activas, verifica que no afecten la API

#### C) Bot Fight Mode

1. Ve a **Security → Bots**
2. Si **Bot Fight Mode** está activado:
   - No se puede desactivar solo para ciertas rutas en plan gratuito
   - Puede estar bloqueando peticiones de Vercel
   - **Solución:** Usar Security Level "Essentially Off" en la Page Rule

---

### 5. Verificar IP Access Rules

1. Ve a **Security → WAF → Tools → IP Access Rules**
2. Verifica que no haya:
   - Bloqueos de rangos de IPs que incluyan Vercel
   - Bloqueos de países (Vercel usa IPs de varios países)

---

### 6. Verificar que no está en "Under Attack Mode"

1. Ve a **Overview** en Cloudflare
2. Arriba a la derecha, verifica que el modo de seguridad NO esté en:
   - "I'm Under Attack" ⚠️
   - "Essentially Off" es OK
   - "High" o "Medium" depende de tu Page Rule

Si está en "Under Attack", cámbialo a "Medium" o "Low"

---

### 7. Purge Cache de Cloudflare

A veces el cache puede estar guardando el error 403:

1. Ve a **Caching → Configuration**
2. Haz clic en **Purge Everything**
3. Confirma
4. Espera 30 segundos
5. Prueba de nuevo

---

### 8. Verificar tiempo de propagación

Los cambios de Cloudflare pueden tardar:
- Page Rules: **Inmediato** (1-2 minutos)
- Cambios de DNS: 5-30 minutos
- Cambios de SSL: 10-15 minutos

**¿Cuánto tiempo pasó desde que creaste la regla?**
- Si hace menos de 5 minutos: **Esperar un poco más**
- Si hace más de 10 minutos: **Hay otro problema**

---

## 🧪 Prueba Alternativa

### Opción 1: Desactivar Cloudflare temporalmente

**Solo para TEST (5 minutos):**

1. Ve a **Overview** en Cloudflare
2. Arriba a la derecha, cambia a **Development Mode** (ON)
3. Esto desactiva temporalmente todo caching y optimizaciones
4. Prueba el diagnóstico de nuevo
5. Si funciona: El problema está en Cloudflare
6. Si NO funciona: El problema está en otro lado

**⚠️ IMPORTANTE:** Vuelve a poner Development Mode en OFF después de probar.

---

### Opción 2: Bypass Cloudflare desde WordPress

**Método avanzado - Solo si nada más funciona:**

En WordPress, instalar plugin "Cloudflare":
1. Instalar plugin oficial de Cloudflare
2. Conectar con API Token
3. En settings del plugin, agregar:
   - Bypass cache para `/wp-json/wc/*`
   - Permitir IPs específicas sin challenge

---

## 📸 Capturas de Pantalla Útiles

**Pedile al admin que te envíe capturas de:**

1. **Page Rules configurada:**
   - Debe verse la regla con la URL exacta
   - Estado "Active"
   - Settings configurados

2. **Security → Events (últimos 5 minutos):**
   - Puede mostrar qué regla específica está bloqueando
   - Mostrará el "Ray ID" del bloqueo

3. **Overview → Security Level:**
   - Para confirmar el modo general del sitio

---

## 🔍 Verificación Técnica desde tu lado

### Test 1: Verificar con cURL (más info)

Voy a crear un endpoint de prueba más detallado que muestre:
- Headers enviados por nuestra app
- Headers recibidos de Cloudflare
- Ray ID de Cloudflare (para buscar en logs)

### Test 2: Probar endpoint diferente

Intentar con un endpoint más simple de WooCommerce que no requiera autenticación:

```
GET https://coques.com.ar/wp-json/wc/v3/system_status/tools
```

Si este también da 403: Cloudflare está bloqueando TODO `/wp-json/wc/*`  
Si este funciona pero `/products` no: El problema está en la autenticación o permisos de WooCommerce

---

## 💡 Configuración Más Agresiva (Último Recurso)

Si **nada** funciona, prueba esto:

### Page Rule Alternativa:

```
URL: *coques.com.ar/wp-json/*
Settings:
  - Security Level: Essentially Off
  - Browser Integrity Check: Off
  - Cache Level: Bypass
  - Disable Security: On
```

**Advertencia:** Esto desactiva TODA la seguridad de Cloudflare en `/wp-json/`

Solo usar si:
1. Todas las opciones anteriores fallaron
2. Es temporal mientras debuggean
3. Entienden el riesgo de seguridad

---

## 📞 Información para Soporte de Cloudflare

Si el admin necesita contactar a Cloudflare:

**Información a proveer:**
- Dominio: coques.com.ar
- Ruta problemática: `/wp-json/wc/v3/products`
- Error: 403 Forbidden
- Ray ID: (aparece en los logs de Security Events)
- Configuración intentada: Page Rule con Security Level Medium/Off
- Plan de Cloudflare: (Free/Pro/Business)

**Pregunta específica:**
"Configuré una Page Rule para `/wp-json/wc/*` con Security Level Medium, pero las peticiones desde Vercel siguen dando 403. ¿Qué más puede estar bloqueando las peticiones?"

---

## 🎯 Siguiente Paso

1. **Revisar TODOS los puntos del checklist arriba**
2. **Enviarme capturas de pantalla** de la Page Rule y Security Events
3. **Decirme cuánto tiempo pasó** desde que creó la regla
4. **Probar Development Mode** temporalmente

Con esa información podré darte una solución más específica.
