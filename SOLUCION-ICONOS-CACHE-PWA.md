# Solución: Iconos Antiguos en Cache PWA

## Problema Detectado
La PWA mostraba la imagen antigua de la taza de café aunque se habían actualizado los iconos a los nuevos (v2).

## Causa Raíz
1. **Referencias antiguas en Service Worker**: En las líneas 96-97 del `sw.js`, las notificaciones push seguían usando `/icon-192x192.png` en lugar de `/icon-192x192-v2.png`
2. **Cache no actualizado**: La versión v6 del cache tenía los iconos antiguos
3. **Archivos duplicados**: Existían tanto `icon-192x192.png` como `icon-192x192-v2.png`, causando confusión

## Solución Implementada

### 1. Actualización del Service Worker
```javascript
// Antes (v6)
const CACHE_NAME = 'fidelizacion-zona-v6'
icon: '/icon-192x192.png',
badge: '/icon-192x192.png',

// Después (v7)
const CACHE_NAME = 'fidelizacion-zona-v7' // v7: Fix iconos v2 en push notifications
icon: '/icon-192x192-v2.png',
badge: '/icon-192x192-v2.png',
```

### 2. Eliminación de Archivos Antiguos
Se eliminaron los iconos obsoletos:
- ❌ `icon-192x192.png` (taza de café)
- ❌ `icon-512x512.png` (taza de café)

Se mantienen solo los nuevos:
- ✅ `icon-192x192-v2.png` (torta Rogel)
- ✅ `icon-512x512-v2.png` (torta Rogel)

### 3. Archivos Modificados
- [`public/sw.js`](public/sw.js:2) - Versión v7 del cache
- Eliminados `icon-192x192.png` e `icon-512x512.png`

## Instrucciones de Despliegue

### 1. Commit y Push a GitHub
```bash
cd fidelizacion-zona
git add .
git commit -m "fix: Actualizar iconos PWA a v2 en Service Worker y eliminar archivos antiguos"
git push origin main
```

### 2. Verificar Deploy en Vercel
Vercel detectará automáticamente el push y desplegará la nueva versión. Esperar 1-2 minutos.

### 3. Probar la Actualización

#### En Dispositivos ya Instalados:
1. **Abrir la PWA** en el teléfono
2. Esperar 10-15 segundos (el SW detecta la nueva versión)
3. Debería aparecer el banner: **"Nueva versión disponible - Actualizar ahora"**
4. Hacer click en **"Actualizar ahora"**
5. La app se refrescará automáticamente
6. **Verificar que el icono cambie** de la taza de café a la torta Rogel

#### Nueva Instalación:
1. Desinstalar la PWA antigua del dispositivo
2. Ir a `https://fidelizacion.ayresit.com.ar`
3. Instalar de nuevo
4. El icono debería ser la torta Rogel desde el inicio

### 4. Limpiar Cache del Navegador (opcional)
Si no aparece el banner de actualización:
1. En Chrome/Edge: Ir a `chrome://serviceworker-internals/`
2. Buscar "fidelizacion"
3. Click en **"Unregister"**
4. Recargar la página
5. El nuevo SW (v7) se instalará automáticamente

## Verificación Post-Deploy

### Checklist ✅
- [ ] Service Worker actualizado a v7
- [ ] Iconos v2 en manifest.json
- [ ] Iconos v2 en notificaciones push
- [ ] Archivos antiguos eliminados
- [ ] Banner de actualización funciona
- [ ] Icono del app muestra torta Rogel

### Comandos de Verificación
```bash
# Ver archivos en public/
ls -la public/*.png

# Debería mostrar solo:
# icon-192x192-v2.png
# icon-512x512-v2.png
# icon-simple.svg
```

## Impacto
- ✅ Usuarios verán el icono correcto (torta Rogel)
- ✅ Cache se limpiará automáticamente al actualizar
- ✅ Notificaciones push usarán el icono correcto
- ⚠️ Usuarios deben hacer click en "Actualizar ahora" para ver el cambio

## Notas Técnicas
- El cambio de v6 a v7 fuerza la invalidación del cache
- El sistema de auto-actualización detectará el cambio automáticamente
- No requiere intervención manual del usuario (más allá del click en actualizar)
- Los iconos antiguos ya no existen en el servidor

## Próximos Pasos
1. Hacer deploy de estos cambios
2. Monitorear la actualización en dispositivos de prueba
3. Notificar a usuarios si es necesario (opcional)

---
**Fecha**: 2026-02-28  
**Versión SW**: v6 → v7  
**Archivos**: [`sw.js`](public/sw.js), iconos PNG
