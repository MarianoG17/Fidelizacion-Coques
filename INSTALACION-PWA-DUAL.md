# Instalación de PWAs Separadas - Coques Bakery

Este documento explica cómo instalar ambas aplicaciones PWA en el mismo dispositivo.

---

## 🎯 Problema Común

Cuando intentas instalar la app de staff en `/local`, el navegador puede mostrar que ya tienes la app instalada (la de clientes). Esto es porque ambas apps comparten el mismo dominio.

---

## ✅ Solución: Instalación Correcta

### **Paso 1: Instalar PWA de Clientes**

1. Abrir el navegador (Chrome, Edge, Safari)
2. Ir a: `https://tu-dominio.vercel.app/`
3. Esperar que aparezca el banner "Instalar app" o hacer clic en el menú:
   - **Chrome Android:** ⋮ → "Instalar aplicación"
   - **iOS Safari:** Compartir → "Agregar a pantalla de inicio"
   - **Chrome Desktop:** Icono ➕ en barra de direcciones
4. Confirmar instalación
5. ✅ La app **"Coques Bakery"** con tema azul se instala

---

### **Paso 2: Limpiar Cache del Navegador (IMPORTANTE)**

Antes de instalar la app de staff, **limpiar el cache** para que el navegador detecte el nuevo manifest:

#### **En Chrome Android:**
1. Ir a: `chrome://settings/clearBrowserData`
2. Seleccionar:
   - ✅ Cookies y datos de sitios
   - ✅ Imágenes y archivos en caché
3. Rango de tiempo: "Última hora"
4. Presionar "Borrar datos"

#### **En iOS Safari:**
1. Ajustes → Safari
2. "Borrar historial y datos de sitios web"
3. Confirmar

#### **En Chrome Desktop:**
1. Presionar `Ctrl + Shift + Delete` (Windows) o `Cmd + Shift + Delete` (Mac)
2. Seleccionar:
   - ✅ Cookies
   - ✅ Imágenes y archivos en caché
3. Presionar "Borrar datos"

---

### **Paso 3: Instalar PWA de Staff**

1. **IMPORTANTE:** Cerrar completamente el navegador y abrirlo de nuevo
2. Ir a: `https://tu-dominio.vercel.app/local`
3. Esperar 3-5 segundos para que el navegador detecte el nuevo manifest
4. Hacer clic en el menú:
   - **Chrome Android:** ⋮ → "Instalar aplicación"
   - **iOS Safari:** Compartir → "Agregar a pantalla de inicio"
   - **Chrome Desktop:** Icono ➕ en barra de direcciones
5. Verificar que el nombre sea **"Coques Staff - Atención al Cliente"**
6. Confirmar instalación
7. ✅ La app **"Coques Staff"** con tema violeta se instala

---

## 🔍 Verificación

### **Ambas apps instaladas correctamente:**

| App | Nombre en Home | Color Tema | URL Inicial |
|-----|----------------|------------|-------------|
| **Clientes** | Coques Bakery | Azul (#1e293b) | `/` |
| **Staff** | Coques Staff | Violeta (#7c3aed) | `/local` |

### **Cómo verificar en Android:**

1. Ir a: `chrome://apps`
2. Deberías ver ambas apps listadas:
   - Coques Bakery
   - Coques Staff - Atención al Cliente

### **Cómo verificar en iOS:**

1. Buscar ambos iconos en la pantalla de inicio
2. Mantener presionado el icono → verificar que tengan nombres diferentes

---

## 🔄 Si No Funciona

### **Método alternativo: Navegación Privada**

1. Abrir una **ventana de incógnito/privada** en el navegador
2. Ir a: `https://tu-dominio.vercel.app/local`
3. Intentar instalar desde ahí
4. El navegador debería detectar el manifest correcto

### **Hard Reset del Service Worker**

1. Ir a: `https://tu-dominio.vercel.app/`
2. Abrir DevTools: `F12` (Desktop) o menú → "Inspeccionar"
3. Ir a pestaña **"Application"** (Chrome) o **"Storage"** (Firefox)
4. Sección **"Service Workers"**
5. Click en **"Unregister"** o **"Delete"**
6. Recargar página: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
7. Cerrar DevTools
8. Ir a `/local` e intentar instalar de nuevo

---

## 🛠️ Troubleshooting

### **"La aplicación ya está instalada"**

**Causa:** El navegador ve el mismo dominio y piensa que es la misma app.

**Solución:**
1. Desinstalar la app de clientes temporalmente
2. Limpiar cache completo
3. Cerrar y reabrir navegador
4. Instalar app de staff primero desde `/local`
5. Luego reinstalar app de clientes desde `/`

### **El nombre sigue siendo "Coques Bakery" al instalar desde /local**

**Causa:** El manifest-staff.json no se está cargando correctamente.

**Solución:**
1. Verificar que el archivo existe: `https://tu-dominio.vercel.app/manifest-staff.json`
2. Abrir DevTools → Network → buscar `manifest-staff.json`
3. Si no se carga, hacer hard reload: `Ctrl + Shift + R`
4. Verificar que el servidor devuelve el archivo con `Content-Type: application/json`

### **El color sigue siendo azul en /local**

**Causa:** El theme-color del manifest anterior está en cache.

**Solución:**
1. Limpiar cache de la aplicación:
   - Android: Configuración → Apps → Coques → Almacenamiento → Borrar datos
   - iOS: Eliminar app y reinstalar
2. En navegador: Limpiar "Datos de sitios y cookies"

---

## 📱 Configuración Técnica

### **Manifests Separados:**

| Archivo | ID Único | Scope | Start URL |
|---------|----------|-------|-----------|
| [`/manifest.json`](public/manifest.json) | `/coques-bakery-app` | `/` | `/` |
| [`/manifest-staff.json`](public/manifest-staff.json) | `/coques-staff-app` | `/local/` | `/local` |

Los **scopes diferentes** (`/` vs `/local/`) y los **IDs únicos** permiten que ambas apps coexistan.

---

## 🎓 Para Desarrolladores

Si estás testeando en local (`localhost`), el proceso es similar pero más simple:
1. No necesitas limpiar cache entre instalaciones
2. Puedes usar "Open as window" en DevTools para simular PWA
3. Cada scope se comporta como una app independiente automáticamente

### **Verificar manifests:**
```bash
# Ver manifest clientes
curl https://tu-dominio.vercel.app/manifest.json

# Ver manifest staff
curl https://tu-dominio.vercel.app/manifest-staff.json
```

### **Layouts que referencian manifests:**
- [`/src/app/layout.tsx`](src/app/layout.tsx) → `manifest.json` (clientes)
- [`/src/app/local/layout.tsx`](src/app/local/layout.tsx) → `manifest-staff.json` (staff)

---

## ✨ Resultado Final

Cuando todo esté correctamente instalado, tendrás:

🔵 **App Clientes:**
- Ícono en home con nombre "Coques Bakery"
- Abre en `/` con tema azul
- Shortcuts: Mi Pass, Tortas

🟣 **App Staff:**
- Ícono en home con nombre "Coques Staff"
- Abre en `/local` con tema violeta
- Shortcuts: Scanner QR, Vista Salón, Tomar Pedido, Presupuestos

Ambas apps funcionan independientemente y pueden estar abiertas al mismo tiempo.
