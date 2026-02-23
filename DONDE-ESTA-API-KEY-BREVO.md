# 🔍 Dónde Encontrar la API Key en Brevo

## ⚠️ IMPORTANTE: Webhooks ≠ API Keys

**Webhooks** son para recibir notificaciones de Brevo (NO es lo que necesitamos)

**API Keys** son para enviar emails desde tu app (ES lo que necesitamos)

---

## 📍 Cómo Llegar a las API Keys

### Método 1: Link Directo (Más Rápido) ⭐

Una vez que estés logueado en Brevo, pegá este link en tu navegador:

```
https://app.brevo.com/settings/keys/api
```

**¡Eso te lleva directo!**

---

### Método 2: Navegación Manual

Si el link no funciona, seguí estos pasos:

#### 1. En el Dashboard de Brevo:

Buscá en el **menú lateral izquierdo** (o arriba a la derecha):

**Icono de engranaje ⚙️** o texto que diga **"Settings"**

#### 2. Dentro de Settings:

Vas a ver varias opciones en el menú lateral. Buscá:

**"SMTP & API"**

O puede decir solo:

**"API"**

O también puede estar como:

**"API Keys"**

#### 3. Click en esa sección

Deberías ver una página con:
- Título: "API keys" o "Your API Keys"
- Un botón: "Create a new API key" o "Generate API key"

---

## 🖼️ Cómo Se Ve (Descripción Visual)

### Página de API Keys:

```
┌─────────────────────────────────────────────┐
│  API Keys                                   │
├─────────────────────────────────────────────┤
│                                             │
│  [🔑 Create a new API key]  [Generate]     │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Your API keys:                            │
│                                             │
│  (Lista de keys si ya tenés)               │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 Estructura del Menú de Settings

Cuando estés en **Settings**, vas a ver algo así:

```
Settings
├── Account
├── Company
├── Users & Teams
├── SMTP & API  ← ¡ACÁ!
│   ├── SMTP
│   └── API Keys  ← ¡ENTRAR ACÁ!
├── Webhooks  ← NO es acá (esto es otra cosa)
├── Senders & IP
└── ...
```

---

## ❌ NO Confundir con:

### Webhooks (NO es lo que necesitamos)

**Webhooks** se usan para:
- Recibir notificaciones cuando un email fue entregado
- Recibir notificaciones cuando alguien abrió un email
- Recibir notificaciones de bounces/errores

**NO los necesitamos ahora.** Son opcionales y para uso avanzado.

### SMTP (NO es lo que necesitamos)

**SMTP** es para:
- Configurar clientes de email como Outlook, Gmail
- Enviar emails desde servidores con usuario/contraseña

**NO lo necesitamos.** Nosotros usamos la API.

---

## 🔑 Cuando Encuentres "API Keys"

### Crear la API Key:

1. **Click en:** "Create a new API key" o "Generate"

2. **Te va a pedir:**
   - **Name:** Ponele un nombre (ej: "Coques Fidelizacion")
   - **Permissions:** Dejar por defecto (suele ser "Sending access" o "Full access")

3. **Click en:** "Create" o "Generate"

4. **COPIAR INMEDIATAMENTE:**
   
   Te va a mostrar algo como:
   ```
   xkeysib-abc123def456...
   ```
   
   **⚠️ Se muestra UNA SOLA VEZ**
   
5. **Guardar en archivo de texto:**
   ```
   BREVO_API_KEY=xkeysib-abc123def456...
   ```

---

## 🌐 Diferentes Versiones del Dashboard

Brevo puede verse diferente según:
- Tu idioma
- Si es cuenta nueva o vieja
- El plan que tengas

**Pero la API Key SIEMPRE está en:**
- Settings → SMTP & API → API Keys
- O directamente: https://app.brevo.com/settings/keys/api

---

## 📱 Si Usas el Dashboard en Español

El menú puede decir:

```
Configuración
├── Cuenta
├── Empresa
├── Usuarios y equipos
├── SMTP y API  ← ¡ACÁ!
│   ├── SMTP
│   └── Claves API  ← ¡ENTRAR ACÁ!
├── Webhooks  ← NO
├── Remitentes e IP
└── ...
```

---

## 🆘 Si Aún No Lo Encontrás

### Opción 1: Buscar

En el dashboard de Brevo, arriba suele haber una barra de búsqueda.

Buscá: **"API"** o **"API Key"**

### Opción 2: Ayuda de Brevo

En el dashboard, buscar el botón de ayuda (generalmente abajo a la derecha):
- Icono de chat 💬
- Icono de signo de pregunta ❓

Escribir: "Where are my API keys?"

### Opción 3: Documentación

Ir a:
```
https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-API-keys
```

---

## ✅ Cómo Saber que Encontraste el Lugar Correcto

**Estás en el lugar correcto si ves:**

✅ Título: "API keys" o "Claves API"
✅ Botón: "Create a new API key" o "Generate"
✅ Las keys tienen formato: `xkeysib-xxxxxxxxxxxxx`
✅ URL del navegador dice: `/settings/keys/api` o similar

**NO estás en el lugar correcto si:**

❌ Dice "Webhooks"
❌ Dice "SMTP Settings"
❌ Pide usuario y contraseña SMTP
❌ Habla de "endpoints" para recibir datos

---

## 🎬 Paso a Paso con Capturas Mentales

Imaginate esto:

1. **Página principal** de Brevo después de login
   - Dashboard con estadísticas

2. **Click en el engranaje ⚙️** (arriba derecha o menú lateral)
   - Te lleva a Settings/Configuración

3. **En el menú lateral de Settings**, buscás:
   - "SMTP & API" o "API"
   - Puede tener un icono de llave 🔑 o código </> 

4. **Click ahí**
   - Si hay submenú, click en "API Keys"

5. **Página de API Keys**
   - Botón azul/verde: "Create a new API key"
   - Tabla con keys existentes (si tenés)

---

## 💡 Consejo Pro

Una vez que encuentres donde está, **agregalo a favoritos** en tu navegador:

```
https://app.brevo.com/settings/keys/api
```

Así la próxima vez es más rápido.

---

## 📧 Si Nada Funciona

Contactá al soporte de Brevo:

**Mensaje sugerido:**

```
Hello,

I'm trying to find where to create an API key to send transactional emails 
from my application, but I can only see the Webhooks section. 

Could you please tell me how to access the API Keys section?

Thank you.
```

**Enviar a:** support@brevo.com

O usar el chat en vivo del dashboard (si está disponible).

---

## 🎯 Resumen Ultra Corto

1. ⚙️ **Settings** (engranaje)
2. 🔑 **SMTP & API** 
3. 📝 **API Keys**
4. ➕ **Create a new API key**
5. 📋 **Copiar la key**

**O directamente:** https://app.brevo.com/settings/keys/api

---

**¡Cualquier cosa avisame y te ayudo en tiempo real!** 🚀
