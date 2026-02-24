# Testing del Sistema de Auto-Actualización PWA

## 🧪 Instrucciones de Prueba

### Preparación

1. **Build inicial:**
   ```bash
   cd fidelizacion-zona
   npm run build
   npm start
   ```

2. **Abrir en navegador:**
   - Chrome: http://localhost:3000
   - Abrir DevTools → Application → Service Workers

### Test 1: Detección de Nueva Versión

1. **Con la app corriendo**, editar `public/sw.js`:
   ```javascript
   const CACHE_NAME = 'fidelizacion-zona-v4' // Cambiar de v3 a v4
   ```

2. **Rebuild sin cerrar el navegador:**
   ```bash
   npm run build
   npm start
   ```

3. **Recargar la página** (F5 o Cmd+R)

4. **Verificar:**
   - ✅ Debería aparecer banner "Nueva versión disponible" en la parte inferior
   - ✅ DevTools → Application → Service Workers → Ver "waiting to activate"

### Test 2: Actualizar Manualmente

1. **Click en "Actualizar ahora"**

2. **Verificar:**
   - ✅ La página se recarga automáticamente
   - ✅ El nuevo SW está activo
   - ✅ El banner desaparece
   - ✅ Console muestra: "✅ SW: Activation complete"

### Test 3: Descartar Banner

1. **Repetir Test 1** para que aparezca el banner

2. **Click en la "✕"**

3. **Verificar:**
   - ✅ El banner se oculta
   - ✅ El SW sigue en estado "waiting"
   - ✅ Al recargar la página, el banner vuelve a aparecer

### Test 4: Verificación Automática

1. **Dejar la app abierta por 60 segundos**

2. **En otra terminal, cambiar el CACHE_NAME y rebuild**

3. **Verificar:**
   - ✅ Después de ~60 segundos, aparece el banner automáticamente
   - ✅ No es necesario recargar manualmente

### Test 5: Múltiples Páginas

1. **Navegar a diferentes rutas:**
   - http://localhost:3000/pass
   - http://localhost:3000/local
   - http://localhost:3000/staff

2. **Cambiar CACHE_NAME y rebuild**

3. **Verificar:**
   - ✅ El banner aparece en TODAS las páginas
   - ✅ Funciona igual en cualquier ruta

## 🔍 Debugging

### Ver estado del SW en Console

```javascript
// Estado actual
navigator.serviceWorker.getRegistration().then(reg => {
    console.log('Active:', reg.active)
    console.log('Waiting:', reg.waiting)
    console.log('Installing:', reg.installing)
})

// Forzar verificación de actualización
navigator.serviceWorker.getRegistration().then(reg => reg.update())
```

### Chrome DevTools

1. **Application → Service Workers:**
   - Ver estado del SW (activo/waiting/installing)
   - Botón "Update" para forzar verificación
   - Botón "Unregister" para limpiar

2. **Console:**
   - Ver logs del SW: "🔧 SW: Installing...", etc.
   - Ver logs del componente

## ✅ Checklist de Validación

- [ ] Banner aparece cuando hay nueva versión
- [ ] Banner tiene diseño elegante (gradiente azul)
- [ ] Botón "Actualizar" recarga la app
- [ ] Botón "✕" oculta el banner
- [ ] Verificación automática cada 60s funciona
- [ ] Funciona en /pass
- [ ] Funciona en /local
- [ ] Funciona en /staff
- [ ] Funciona en navegador desktop
- [ ] Funciona en navegador mobile
- [ ] No hay errores en Console
- [ ] SW toma control después de actualizar

## 🐛 Problemas Comunes

### El banner no aparece

**Solución 1:** Verificar que el SW está registrado
```javascript
navigator.serviceWorker.getRegistration()
```

**Solución 2:** Limpiar cache del navegador
- Chrome → DevTools → Application → Clear storage

**Solución 3:** Verificar que el CACHE_NAME cambió realmente

### El banner aparece pero no actualiza

**Solución 1:** Verificar en Console que el mensaje se envía
- Debería ver: "📨 SW: Message received: {type: 'SKIP_WAITING'}"

**Solución 2:** Verificar que skipWaiting() se ejecuta
- Debería ver: "⚡ SW: Activating new version immediately..."

### Actualización en loop infinito

**Causa:** skipWaiting() se está llamando automáticamente en install
**Solución:** Asegurar que solo se llama cuando el usuario hace click

## 📱 Testing en Producción

1. **Deploy a Vercel**
2. **Abrir app en dispositivo real**
3. **Hacer un nuevo deploy con CACHE_NAME diferente**
4. **Esperar 60 segundos o recargar**
5. **Verificar que el banner aparece**

## 🎯 Criterios de Éxito

✅ La app detecta nuevas versiones automáticamente  
✅ El usuario puede actualizar cuando quiera  
✅ El usuario puede descartar el banner  
✅ La experiencia es fluida y sin interrupciones  
✅ No hay errores en producción
