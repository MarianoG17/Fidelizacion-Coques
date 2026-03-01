# FORZAR ACTUALIZACIÓN DEL SERVICE WORKER

## Problema Actual
- ✅ Icono del navegador (favicon) actualizado a pavlova
- ❌ Notificaciones push siguen mostrando la taza de café

## Causa
El navegador tiene cacheado el Service Worker v7 (o anterior) con los iconos antiguos de notificaciones. Necesitas **forzar la actualización manual** del Service Worker.

---

## 🚀 SOLUCIÓN INMEDIATA - Desregistrar Service Worker

### Opción 1: Chrome/Edge (RECOMENDADO)

1. **Abrir en el navegador**: `chrome://serviceworker-internals/`

2. **Buscar** "fidelizacion" en la página

3. **Hacer click en "Unregister"** junto a tu sitio

4. **Recargar la página** de la app (F5)

5. **Verificar**:
   - Volver a `chrome://serviceworker-internals/`
   - Debería mostrar versión "v8" o estar re-registrado
   
6. **Probar notificación push**:
   - Ir a la app
   - Esperar una notificación o enviar una de prueba
   - ✅ Debería mostrar el icono pavlova

---

### Opción 2: Desde DevTools

1. **Abrir DevTools** (F12)

2. **Ir a la pestaña "Application"**

3. **Click en "Service Workers"** en el menú lateral

4. **Hacer click en "Unregister"** junto al Service Worker activo

5. **Cerrar DevTools y recargar la página** (F5)

6. **Verificar** que se registre el nuevo SW v8

---

### Opción 3: Limpiar Todo (Nuclear)

Si las opciones anteriores no funcionan:

1. **Abrir DevTools** (F12)

2. **Ir a "Application" → "Storage"**

3. **Click en "Clear site data"**

4. **Seleccionar todo** y click en "Clear site data"

5. **Cerrar DevTools y recargar** (F5)

6. La app se reiniciará completamente con el SW v8

---

## 📱 En Dispositivo Móvil

Si estás probando desde un teléfono:

### Android Chrome:
1. Ir a `chrome://serviceworker-internals/`
2. Buscar "fidelizacion"
3. Tocar "Unregister"
4. Recargar la app

### iOS Safari:
1. **Desinstalar la PWA** del teléfono
2. **Ir al sitio** en Safari
3. **Reinstalar la PWA**
4. ✅ Tendrá el SW v8 desde el inicio

---

## ✅ Verificación Post-Actualización

### 1. Verificar Versión del SW
```
chrome://serviceworker-internals/
```
Buscar "fidelizacion" y confirmar que está usando:
- **Status**: ACTIVATED o RUNNING
- **Script URL**: Debe terminar en `/sw.js`
- **Version**: Debería ser la más reciente

### 2. Verificar en Consola
Abrir DevTools → Console y ejecutar:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log(reg))
})
```

### 3. Probar Notificación
La mejor manera es enviar una notificación push de prueba:
- Ir a la app
- Activar notificaciones si aún no están activas
- Esperar o enviar una notificación de prueba
- ✅ Verificar que el icono sea la pavlova

---

## 🔍 Debugging

### Ver Cache Actual
En DevTools Console:
```javascript
caches.keys().then(console.log)
```

Debería mostrar: `["fidelizacion-zona-v8"]`

Si muestra `v7` o anterior, el SW no se actualizó correctamente.

### Ver Iconos Cacheados
```javascript
caches.open('fidelizacion-zona-v8').then(cache => {
  cache.keys().then(keys => {
    keys.forEach(req => console.log(req.url))
  })
})
```

Debería incluir:
- `/icon-192x192-v2.png?v=v8`
- `/icon-512x512-v2.png?v=v8`

---

## ⏱️ Por Qué No Se Actualizó Automáticamente

El banner "Nueva versión disponible" funciona para:
- ✅ Contenido de la app (páginas, componentes)
- ✅ Cache de datos
- ✅ Manifest.json (favicon)

**PERO** las notificaciones push son manejadas por el Service Worker, y algunos navegadores:
1. **Cachean agresivamente** el código del SW
2. **No actualizan inmediatamente** si hay un SW activo
3. **Requieren desregistro manual** para forzar actualización completa

Por eso necesitas desregistrarlo manualmente.

---

## 📊 Resumen Ejecutivo

| Aspecto | Estado |
|---------|--------|
| **Icono del navegador** | ✅ Actualizado (pavlova) |
| **Icono de notificaciones** | ❌ Pendiente actualización SW |
| **Solución** | Desregistrar SW en `chrome://serviceworker-internals/` |
| **Tiempo estimado** | 30 segundos |
| **Requiere acción manual** | Sí, por esta vez |

---

## 🎯 Próximos Cambios de Iconos

Para **futuras actualizaciones**, este mismo proceso será necesario si cambias los iconos nuevamente.

**Alternativa automática**: Incrementar la versión del SW y esperar 24-48 horas para que los navegadores lo actualicen naturalmente (pero es más lento).

---

**Fecha**: 2026-02-28  
**Issue**: Notificaciones con icono cacheado  
**Solución**: Desregistro manual de SW
