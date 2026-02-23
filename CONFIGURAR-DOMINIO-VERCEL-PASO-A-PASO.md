# 🎯 Configurar Dominio Personalizado - Paso a Paso Completo

## ✅ Respuesta Rápida

**Sí, esa información es suficiente.** El CNAME `cname.vercel-dns.com` es universal para **todos** los proyectos de Vercel. Pero hay 2 pasos:

1. **Tu admin configura el DNS** (CNAME)
2. **Vos configurás Vercel** (agregar el dominio en tu proyecto)

---

## 📋 Proceso Completo (2 Partes)

### PARTE 1: Tu Administrador (DNS) ⚙️

**Información para tu admin:**

```
Dominio base: coques.com.ar
Subdominio a crear: app.coques.com.ar

Configuración DNS:
- Tipo: CNAME
- Nombre/Host: app
- Valor/Apunta a: cname.vercel-dns.com
- TTL: 3600 (o automático/default)
```

**¿Por qué es genérico?**

`cname.vercel-dns.com` es el DNS de **toda** la infraestructura de Vercel. Es como una puerta de entrada única que luego redirecciona al proyecto correcto según el dominio solicitado.

**Analogía:**
- Es como el número de teléfono de una empresa (genérico)
- Cuando llamás y decís tu nombre, te pasan con tu departamento específico
- Vercel funciona igual: ve el dominio (`app.coques.com.ar`) y te manda a tu proyecto

---

### PARTE 2: Vos (Vercel Dashboard) 🖥️

**Este paso es CRUCIAL** - sin esto, aunque el DNS esté bien, no va a funcionar.

#### 1. Ir a tu proyecto en Vercel

```
https://vercel.com/dashboard
```

- Seleccionar tu proyecto de fidelización
- Click en **Settings** (arriba)
- Click en **Domains** (menú lateral)

#### 2. Agregar tu dominio personalizado

En la sección "Domains", hay un campo de texto:

```
[ app.coques.com.ar ]  [Add]
```

- Escribir: `app.coques.com.ar`
- Click en **"Add"**

#### 3. Vercel te va a mostrar instrucciones

Vercel detecta automáticamente que es un subdominio y te dice:

```
⚠️ Invalid Configuration

For app.coques.com.ar, please add the following DNS record:

Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

**Esto es lo que tu admin necesita configurar.**

#### 4. Esperar verificación

Una vez que tu admin configure el CNAME:

- Esperar de 5 minutos a 48 horas (usualmente < 1 hora)
- Vercel verifica automáticamente cada pocos minutos
- Podés forzar la verificación con el botón **"Refresh"**

#### 5. Cuando se verifica correctamente

Verás:

```
✅ app.coques.com.ar
   Production Branch: main
   SSL Certificate: Active
```

**¡Listo!** Tu dominio está funcionando.

---

## 🔍 ¿Cómo sabe Vercel qué proyecto mostrar?

Cuando alguien visita `app.coques.com.ar`:

1. **DNS resuelve:** `app.coques.com.ar` → `cname.vercel-dns.com` → IP de Vercel
2. **Request HTTP llega a Vercel** con header: `Host: app.coques.com.ar`
3. **Vercel busca internamente:** "¿Qué proyecto tiene configurado `app.coques.com.ar`?"
4. **Encuentra tu proyecto** (porque lo agregaste en el dashboard)
5. **Sirve tu aplicación**

Por eso **AMBOS pasos son necesarios:**
- DNS (para que el navegador llegue a Vercel)
- Dashboard (para que Vercel sepa qué proyecto mostrar)

---

## 📧 Email COMPLETO para tu Administrador

```
Asunto: Configurar subdominio para app de fidelización

Hola [Nombre],

Necesito configurar el subdominio app.coques.com.ar para nuestra 
aplicación de fidelización.

DOMINIO: coques.com.ar
SUBDOMINIO A CREAR: app.coques.com.ar

CONFIGURACIÓN DNS REQUERIDA:

Tipo de registro: CNAME
Nombre/Host: app
Valor/Apunta a: cname.vercel-dns.com
TTL: 3600 (o el valor por defecto del panel)

NOTAS IMPORTANTES:

1. NO es una IP, es un registro CNAME
2. El valor "cname.vercel-dns.com" es correcto y es el mismo para 
   todos los proyectos de Vercel (así funciona su infraestructura)
3. NO usar registro A con IP (las IPs de Vercel cambian)
4. El SSL se configura automáticamente después

Una vez configurado, avisame para que yo complete la configuración 
del lado de Vercel.

El cambio puede tardar desde unos minutos hasta 48 horas en 
propagarse (usualmente funciona en menos de 1 hora).

Documentación oficial:
https://vercel.com/docs/concepts/projects/domains/add-a-domain

Gracias.
```

---

## ✅ Checklist Completo

### Antes de hablar con tu admin:

- [x] Tener el dominio listo: `app.coques.com.ar`
- [x] Tener la info del CNAME: `cname.vercel-dns.com`
- [x] Tener el proyecto deployado en Vercel

### Tu admin hace:

- [ ] Accede al panel DNS de `coques.com.ar`
- [ ] Crea registro CNAME:
  - Nombre: `app`
  - Valor: `cname.vercel-dns.com`
  - TTL: `3600` o automático
- [ ] Guarda los cambios
- [ ] Te avisa cuando está listo

### Vos hacés (en Vercel):

- [ ] Ir a tu proyecto en Vercel
- [ ] Settings → Domains
- [ ] Agregar: `app.coques.com.ar`
- [ ] Esperar verificación (puede tardar)
- [ ] Verificar que aparece ✅
- [ ] Configurar variable de entorno:
  ```
  NEXT_PUBLIC_APP_URL=https://app.coques.com.ar
  ```
- [ ] Redeploy del proyecto
- [ ] Probar en el navegador: `https://app.coques.com.ar`

### Verificación final:

- [ ] La app carga correctamente
- [ ] HTTPS funciona (candado verde)
- [ ] No hay warnings de seguridad
- [ ] Los links internos funcionan
- [ ] Los emails tendrán el dominio correcto

---

## 🐛 Troubleshooting

### El dominio no verifica en Vercel

**Ver el error específico:**

Vercel te dice exactamente qué está mal:

- **"DNS records not found"**
  → Tu admin no configuró el CNAME todavía, o no se propagó
  → Esperar o pedirle que verifique

- **"Invalid Configuration"**
  → El CNAME está mal configurado
  → Verificar que apunta exactamente a `cname.vercel-dns.com`

- **"Conflicting DNS records"**
  → Hay otro registro (A, AAAA, etc.) interfiriendo
  → Eliminar registros viejos para `app.coques.com.ar`

### Verificar el DNS manualmente

**Desde CMD (Windows):**

```cmd
nslookup app.coques.com.ar
```

**Resultado esperado:**
```
Server:  ...
Address:  ...

Non-authoritative answer:
Name:    cname.vercel-dns.com
Address:  76.76.21.21
Aliases:  app.coques.com.ar
```

**Si sale diferente:**
- El CNAME no está configurado
- O no se propagó todavía

**Herramienta online:**

https://dnschecker.org/

- Buscar: `app.coques.com.ar`
- Tipo: `CNAME`
- Debería mostrar: `cname.vercel-dns.com`

---

## 💡 Preguntas Frecuentes

### 1. ¿El CNAME es igual para todos los proyectos de Vercel?

**Sí.** Todos los proyectos de Vercel usan `cname.vercel-dns.com`.

Vercel identifica tu proyecto por el dominio que agregaste en el dashboard, no por el CNAME.

### 2. ¿Y si tengo múltiples proyectos en Vercel?

Cada proyecto tiene su propio dominio:
- Proyecto 1: `app.coques.com.ar` → usa `cname.vercel-dns.com`
- Proyecto 2: `admin.coques.com.ar` → usa `cname.vercel-dns.com`
- Proyecto 3: `api.coques.com.ar` → usa `cname.vercel-dns.com`

**Todos usan el mismo CNAME.** Lo que cambia es el nombre del subdominio y en qué proyecto lo agregás en el dashboard.

### 3. ¿Puedo usar un dominio raíz (sin www o app)?

Sí, pero es más complicado:

- Algunos proveedores DNS no permiten CNAME en el dominio raíz
- Necesitarías "CNAME Flattening" o "ALIAS records"
- O usar registros A (con las limitaciones mencionadas antes)

**Recomendación:** Usar subdominio (`app.coques.com.ar`) es más simple y funciona siempre.

### 4. ¿Cuánto tarda en funcionar?

**DNS Propagation:**
- Mínimo: 5-10 minutos
- Máximo: 48 horas
- Típico: 30 minutos - 2 horas

**SSL Certificate:**
- Se genera automáticamente después que el DNS funciona
- Tarda 5-15 minutos adicionales
- Es gratis (Let's Encrypt)

### 5. ¿Qué pasa con el dominio viejo de Vercel?

Tu dominio `.vercel.app` original seguirá funcionando:
- No se borra
- Podés seguir usándolo
- Es útil para testing

Ambos dominios funcionarán:
- ✅ `https://app.coques.com.ar` (tu dominio personalizado)
- ✅ `https://tu-proyecto.vercel.app` (dominio original)

---

## 🎯 Resumen Ultra Corto

**Para tu admin:**
```
CNAME: app → cname.vercel-dns.com
```

**Para vos:**
1. Agregar `app.coques.com.ar` en Vercel Dashboard
2. Esperar verificación
3. Configurar `NEXT_PUBLIC_APP_URL`
4. Redeploy

**Tiempo total:** 1-3 horas (mayormente esperando)

---

**La información es genérica porque así funciona la infraestructura de Vercel. No necesitás nada más específico de tu proyecto - Vercel lo detecta automáticamente cuando agregás el dominio en el dashboard.** 🚀
