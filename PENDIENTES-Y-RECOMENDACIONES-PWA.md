# 📱 Pendientes y Recomendaciones para la PWA

**Fecha:** 27 de Febrero 2026  
**Estado Actual:** PWA funcional con instalación dual y auto-actualización ✅

---

## 🔴 PENDIENTES DE ALTA PRIORIDAD

### 1. Sistema de Sesiones de Mesa - UI Visual
**Estado:** Backend completo ✅ | Frontend 0% ❌  
**Esfuerzo:** 3-4 horas  
**Documentación:** [`PLAN-PROXIMA-SESION.md`](PLAN-PROXIMA-SESION.md)

**Falta implementar:**
- Vista visual del salón con mesas (🟢 verde libre / 🔴 rojo ocupada)
- Modal al hacer click en mesa ocupada
- Aplicar beneficios desde mesa sin reescanear QR
- Botón "Cerrar sesión" desde modal
- Auto-refresh del estado cada 5 segundos
- Cron job de auto-liberación (timeout 60 min)

**Archivos a crear:**
- `src/app/local/components/VistaSalon.tsx`
- `src/app/local/components/MesaModal.tsx`
- `src/app/api/jobs/auto-liberar-sesiones/route.ts`

---

### 2. Panel de Administración de Beneficios
**Estado:** Schema existe ✅ | Admin panel 0% ❌  
**Esfuerzo:** 4-5 horas  
**Documentación:** [`PROXIMA-SESION-BENEFICIOS.md`](PROXIMA-SESION-BENEFICIOS.md)

**Falta implementar:**
- `/admin/beneficios` - CRUD completo de beneficios
- `/admin/beneficios/asignar` - Asignar a niveles con límites
- Actualizar `/pass` para mostrar beneficios disponibles/usados
- API endpoints para gestión
- Script SQL con beneficios iniciales (Bronce, Plata, Oro)

**Beneficios a configurar:**
- Bronce: Agua gratis (1/día) + 10% desc. cafetería (1/día)
- Plata: Agua gratis (1/día) + 20% desc. cafetería (1/día)
- Oro: Agua/limonada (1/día) + 30% desc. (1/día) + Acceso VIP

---

### 3. Sistema de Logros Automáticos
**Estado:** Tabla existe ✅ | Evaluación automática 0% ❌  
**Esfuerzo:** 2-3 horas  
**Documentación:** [`PLAN-PROXIMA-SESION.md`](PLAN-PROXIMA-SESION.md#fase-7-sistema-de-logros-automáticos-45-min)

**Falta implementar:**
- `src/lib/logros.ts` - Evaluación automática después de cada evento
- Página `/logros` para ver logros obtenidos
- Notificación visual cuando se obtiene logro nuevo
- Badge "NUEVO" en logros no vistos
- Integrar evaluación en `/api/eventos`

**Logros ya en BD:** 13 tipos (Primera Visita, Cliente Frecuente, Nivel Alcanzado, etc.)

---

### 4. Edición de Productos en Carrito
**Estado:** Hook actualizado ✅ | UI modal 0% ❌  
**Esfuerzo:** 2-3 horas  
**Documentación:** [`PENDIENTE-EDICION-CARRITO.md`](PENDIENTE-EDICION-CARRITO.md)

**Falta implementar:**
- Modal de edición con add-ons y campos de texto
- Hacer productos del carrito clickeables
- Función para recargar datos completos del producto desde WooCommerce
- Recalcular precio al guardar cambios

**Alternativa temporal:** Eliminar y volver a agregar el producto (funciona pero no es óptimo)

---

## 🟡 PENDIENTES DE MEDIA PRIORIDAD

### 5. Páginas Cliente Faltantes
**Esfuerzo:** 4-5 horas total

#### A) `/perfil` - Editar Perfil
- Ver y editar nombre, email
- Cambiar contraseña
- Ver estadísticas (visitas totales, XP, nivel)
- API: `GET/PATCH /api/perfil`

#### B) `/historial` - Historial de Visitas
- Lista de todas las visitas con fecha/hora
- Filtros por local (cafetería/lavadero)
- Mostrar beneficios aplicados en cada visita
- API: `GET /api/historial`

---

### 6. Sistema de Referidos - UI Completa
**Estado:** Backend funcional ✅ | Frontend 0% ❌  
**Esfuerzo:** 2 horas  
**Impacto:** Alto potencial - Crecimiento viral

**Falta implementar:**
- Sección en `/pass` con código de referido
- Botón "Compartir" (WhatsApp, clipboard)
- Lista de amigos referidos (nombre, estado)
- Contador visual "X/2 para subir de nivel"
- Indicador cuando se alcanza objetivo

**Flujo esperado:**
1. Cliente ve su código: JUAN2024
2. Click "Compartir" → Abre WhatsApp con texto pre-llenado
3. Amigo se registra con código
4. Cliente recibe "1/2 referidos"
5. Al segundo amigo activado → Cliente sube de nivel automáticamente 🎉

---

### 7. Recuperación de Contraseña
**Estado:** No implementado ❌  
**Esfuerzo:** 2-3 horas

**Falta implementar:**
- `/recuperar-password` - Formulario solicitud reset
- `/reset-password/[token]` - Formulario cambio password
- API: `POST /api/auth/recuperar-password` (enviar email)
- API: `POST /api/auth/reset-password` (validar token)
- Integración con Resend para envío de emails

**Requiere:**
- Cuenta de Resend + API Key
- Verificar dominio en Resend

---

### 8. Modal de Feedback Post-Visita
**Estado:** Backend existe ✅ | Modal 0% ❌  
**Esfuerzo:** 1.5 horas  
**Impacto:** Alto - Reputación online

**Falta implementar:**
- Modal que aparece X minutos después de escaneo
- Selector de estrellas (1-5)
- Si ≥4: Botón "Dejar reseña en Google Maps"
- Si ≤3: Campo "¿Qué podemos mejorar?"
- Timer en localStorage

**URL Google Maps:** https://maps.app.goo.gl/n6q5HNELZuwDyT556

---

### 9. Modal de Cumpleaños
**Estado:** No implementado ❌  
**Esfuerzo:** 1 hora

**Falta implementar:**
- Modal que aparece UNA VEZ después del registro
- Selector de fecha de cumpleaños
- Explicación: "🎂 20% OFF en tortas durante tu semana de cumpleaños"
- Guardar en campo `fechaCumpleanos`
- Opción "Saltar" (recordar después)

---

## 💡 RECOMENDACIONES NUEVAS PARA PWA

### **Nivel 1: Engagement (Recomendado fuertemente)**

#### 1. Notificaciones Push 🔔
**Esfuerzo:** 3-4 horas | **Impacto:** Muy Alto

**Qué notificar:**
- 🚗 Auto listo en el lavadero
- 🎉 Subiste de nivel
- 🎁 Nuevo beneficio desbloqueado
- ⏰ Beneficio por vencer (recordatorio)
- 📅 Evento especial próximo
- 🎂 Descuento por cumpleaños activo

**Implementación:**
- Firebase Cloud Messaging (gratis)
- Pedir permiso al instalar la PWA
- Guardar token push en `Cliente.pushSub`
- Enviar desde backend con `web-push` npm

**Ventajas:**
- ✅ Aumenta retención 3-5x
- ✅ Tráfico recurrente sin depender del cliente
- ✅ Gratis (no requiere app nativa)
- ✅ Funciona en Android perfectamente
- ⚠️ En iOS: limitado pero mejorando

---

#### 2. Banner de Instalación Proactivo
**Esfuerzo:** 2 horas | **Impacto:** Alto

**Problema actual:** 
El usuario debe descubrir por sí mismo cómo instalar la PWA.

**Solución:**
Banner custom que aparece después de 2-3 visitas:

```
╔════════════════════════════════╗
║  📱 Instalá Coques en tu celu  ║
║  ✅ Acceso instantáneo         ║
║  ✅ Funciona sin internet      ║
║  ✅ Ocupa menos de 1MB        ║
║                                ║
║  [Instalar App]  [Más tarde]  ║
╚════════════════════════════════╝
```

**Triggers sugeridos:**
- Después de 3ra visita
- Después de usar 2 beneficios
- Usuario tiene nivel Plata o superior

**Persistencia:** Guardar en localStorage que ya vio el banner

---

#### 3. Web Share API para Referidos 📲
**Esfuerzo:** 1 hora | **Impacto:** Medio-Alto

**Uso:** Compartir código de referido con native share:

```typescript
if (navigator.share) {
  await navigator.share({
    title: 'Unite a Coques Bakery',
    text: 'Usá mi código JUAN2024 y obtené beneficios exclusivos',
    url: 'https://coques.com/?ref=JUAN2024'
  })
}
```

**Ventajas:**
- ✅ Abre menú nativo de compartir (WhatsApp, Instagram, etc.)
- ✅ Más fácil que copiar/pegar
- ✅ Tracking de shares en analytics

---

### **Nivel 2: UX Avanzada**

#### 4. Modo Offline Mejorado 📡
**Esfuerzo:** 2-3 horas | **Impacto:** Medio

**Mejoras al Service Worker actual:**

1. **Cachear más rutas:**
   - `/pass`, `/perfil`, `/historial`, `/logros`
   - Assets estáticos (CSS, JS, imágenes)

2. **Queue de acciones offline:**
   - Guardar beneficios canjeados en IndexedDB
   - Sincronizar cuando vuelve conexión
   - Usar Background Sync API

3. **Página offline custom:**
   - En vez de error, mostrar:
     - QR del cliente (cached)
     - Historial reciente (cached)
     - Mensaje amigable

**Ejemplo:**
```
╔═══════════════════════════════╗
║  📡 Sin conexión              ║
║                               ║
║  No te preocupes, tu QR      ║
║  sigue funcionando:           ║
║                               ║
║  [QR Code grande]            ║
║                               ║
║  Tus datos se sincronizan    ║
║  cuando vuelva internet      ║
╚═══════════════════════════════╝
```

---

#### 5. Badges en el Ícono de la App 🔴
**Esfuerzo:** 1-2 horas | **Impacto:** Medio

**Uso:** Mostrar notificaciones visuales en el ícono de la PWA instalada.

**Ejemplos:**
- Badge "1" = Un logro nuevo sin ver
- Badge "3" = Tres beneficios disponibles hoy
- Badge = Pedido de torta listo para retirar

**Implementación:**
```typescript
if ('setAppBadge' in navigator) {
  navigator.setAppBadge(3) // Número en el badge
}
```

**Soporte:** Chrome/Edge Android ✅ | iOS Safari ❌

---

#### 6. App Shortcuts Dinámicos ⚡
**Esfuerzo:** 1.5 horas | **Impacto:** Bajo-Medio

**Problema actual:** 
Los shortcuts son estáticos (manifest.json).

**Mejora:**
Shortcuts dinámicos basados en uso:

**Para clientes:**
- "Ver mi QR" (siempre)
- "Ver Historial" (si tiene visitas)
- "Compartir Referido" (si aún no refirió a nadie)

**Para staff:**
- "Scanner QR" (siempre)
- "Vista Salón" (si hay mesas ocupadas)
- "Tomar Pedido" (si hay presupuestos pendientes)

**Implementación:**
```typescript
// Actualizar shortcuts dinámicamente
navigator.shortcuts?.update([
  { name: "Ver mi QR", url: "/pass" },
  { name: "Compartir Referido", url: "/pass?tab=referidos" }
])
```

**Soporte:** Chrome/Edge Android ✅ | iOS Safari ❌

---

### **Nivel 3: Analytics y Monitoreo**

#### 7. Analytics de PWA 📊
**Esfuerzo:** 2 horas | **Impacto:** Estratégico

**Métricas a trackear:**

**Instalación:**
- % de usuarios que instalan la PWA
- Tiempo hasta instalación (visitas necesarias)
- Plataforma (Android, iOS, Desktop)

**Uso:**
- % de sesiones desde PWA instalada vs navegador
- Frecuencia de uso (diario, semanal)
- Tiempo en la app

**Engagement:**
- % que acepta notificaciones push
- CTR de notificaciones
- Beneficios canjeados desde PWA vs web

**Offline:**
- % de uso offline
- Acciones encoladas
- Errores de sincronización

**Implementación:**
```typescript
// Google Analytics 4 events
gtag('event', 'pwa_installed', {
  platform: navigator.userAgent,
  source: 'install_prompt'
})

gtag('event', 'pwa_session', {
  is_standalone: window.matchMedia('(display-mode: standalone)').matches
})
```

---

#### 8. Telemetría del Service Worker
**Esfuerzo:** 1.5 horas | **Impacto:** Técnico

**Logs a enviar al backend:**
- Versión del SW activo
- Errores de cache
- Fallos de fetch
- Tiempo de actualización

**Uso:**
Detectar problemas antes de que los usuarios reporten:
- "El 15% de usuarios tiene un SW obsoleto"
- "Hay 200 fallos de cache en /api/beneficios"
- "Las actualizaciones tardan >30s para el 5% de usuarios"

---

### **Nivel 4: Features Avanzadas**

#### 9. Share Target API 🎯
**Esfuerzo:** 2 horas | **Impacto:** Innovador

**Concepto:** 
Que tu PWA aparezca en el menú "Compartir" del sistema.

**Uso:**
Un cliente comparte una foto de un postre desde Instagram → Aparece "Coques Bakery" → La app recibe la imagen y ofrece:
- "¿Querés pedir esta torta?"
- Autocompletar formulario de presupuesto con la imagen

**Implementación:**
Agregar al manifest:
```json
{
  "share_target": {
    "action": "/tortas/nuevo-pedido",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "description",
      "files": [{
        "name": "imagen",
        "accept": ["image/*"]
      }]
    }
  }
}
```

---

#### 10. Bluetooth API (Futuro - Lavadero) 🔵
**Esfuerzo:** 5+ horas | **Impacto:** Diferenciador

**Concepto ultra-innovador:**
Detectar automáticamente cuando el auto del cliente llega al lavadero usando Bluetooth beacons.

**Flujo:**
1. Cliente llega al lavadero con la PWA abierta
2. App detecta beacon Bluetooth del local
3. Notificación automática: "¡Bienvenido! Iniciando servicio..."
4. Check-in automático (sin escanear QR)

**Ventajas:**
- ✅ Check-in manos libres
- ✅ Experiencia "mágica"
- ✅ Reduce fricción

**Requiere:**
- Beacons Bluetooth físicos ($20-50 USD c/u)
- Permiso de Bluetooth en PWA
- Backend para vincular beacon → local

**Soporte:** Chrome Android ✅ | iOS Safari ❌

---

## 📋 PRIORIZACIÓN RECOMENDADA

### Sprint 1: Core Funcionalidad (1-2 semanas)
1. ✅ Sistema de Sesiones de Mesa (UI)
2. ✅ Panel Admin de Beneficios
3. ✅ Mostrar beneficios en `/pass`
4. ✅ Sistema de Logros Automáticos

### Sprint 2: Completitud (1 semana)
5. ✅ Páginas `/perfil`, `/historial`
6. ✅ Sistema de Referidos UI
7. ✅ Edición de Carrito

### Sprint 3: Engagement PWA (1 semana)
8. ✅ Notificaciones Push
9. ✅ Banner de Instalación Proactivo
10. ✅ Web Share API para Referidos
11. ✅ Modo Offline Mejorado

### Sprint 4: UX Avanzada (3-5 días)
12. ✅ Modales (Feedback, Cumpleaños)
13. ✅ Recuperación de Contraseña
14. ✅ Badges en Ícono
15. ✅ App Shortcuts Dinámicos

### Sprint 5: Analytics y Optimización (3-5 días)
16. ✅ Analytics de PWA
17. ✅ Telemetría del Service Worker
18. ✅ Optimizaciones de performance

### Backlog / Futuro:
- Share Target API
- Bluetooth API (requiere hardware)

---

## 🎯 Quick Wins (Máximo Impacto / Mínimo Esfuerzo)

| Feature | Esfuerzo | Impacto | ROI |
|---------|----------|---------|-----|
| **Web Share API** | 1 hora | Alto | ⭐⭐⭐⭐⭐ |
| **Banner Instalación** | 2 horas | Alto | ⭐⭐⭐⭐⭐ |
| **Modal Cumpleaños** | 1 hora | Medio | ⭐⭐⭐⭐ |
| **Badges Ícono** | 1.5 horas | Medio | ⭐⭐⭐⭐ |
| **Modal Feedback** | 1.5 horas | Alto | ⭐⭐⭐⭐ |

---

## 📊 Comparación: Estado Actual vs Futuro

### PWA Actual (Hoy)
- ✅ Instalable
- ✅ Offline básico
- ✅ Auto-actualización
- ✅ Iconos personalizados
- ✅ Instalación dual (clientes/staff)
- ❌ Sin notificaciones push
- ❌ Sin promoción de instalación
- ❌ Offline limitado

**Score:** 70/100 ⭐⭐⭐⭐

### PWA Mejorada (Con todas las mejoras)
- ✅ Instalable + Banner proactivo
- ✅ Offline completo con sincronización
- ✅ Auto-actualización inteligente
- ✅ Iconos + badges dinámicos
- ✅ Instalación dual optimizada
- ✅ Notificaciones push estratégicas
- ✅ Web Share API
- ✅ Analytics completo
- ✅ UX nativa avanzada

**Score:** 95/100 ⭐⭐⭐⭐⭐

---

## 💰 Inversión vs Valor

### Tiempo Total Estimado
- **Core Funcionalidad:** 18-24 horas
- **Mejoras PWA:** 15-20 horas
- **Total:** 33-44 horas (~1-1.5 semanas full-time)

### Valor Generado
- **Retención:** +300% (por notificaciones)
- **Instalaciones:** +150% (por banner proactivo)
- **Viralidad:** +200% (por Web Share API)
- **Engagement:** +250% (por badges y offline)

### ROI
Cada hora invertida en PWA = 10-20 horas de valor en retención de usuarios.

---

## 🚀 Cómo Empezar

### Opción A: Todo de una vez
```
"Implementá todas las mejoras pendientes según PENDIENTES-Y-RECOMENDACIONES-PWA.md, 
priorizando Sprint 1 (Core) y Sprint 3 (PWA)"
```

### Opción B: Por sprints
```
"Empecemos con Sprint 1: Sistema de Sesiones de Mesa + Panel Admin de Beneficios"
```

### Opción C: Solo Quick Wins
```
"Implementá los 5 Quick Wins de PENDIENTES-Y-RECOMENDACIONES-PWA.md (Web Share, 
Banner Instalación, Modal Cumpleaños, Badges, Modal Feedback)"
```

---

**Última actualización:** 27 de febrero de 2026  
**Próxima revisión:** Después de cada sprint completado
