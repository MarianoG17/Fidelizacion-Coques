# Mejora del Prompt de Instalación PWA

## 🎯 Problema Resuelto

En la app del lavadero aparecía un mensaje prominente para instalar la PWA, pero en Coques Bakery no había un prompt visible que incentivara a los usuarios a instalar la app.

## ✅ Solución Implementada

### Nuevo Componente: `InstallPrompt`

Creado [`src/components/InstallPrompt.tsx`](./src/components/InstallPrompt.tsx) que:

#### 1. **Detecta el Dispositivo Automáticamente**
- **Android/Chrome/Edge**: Captura el evento `beforeinstallprompt` y muestra un banner con botón de instalación directo
- **iOS/Safari**: Detecta iOS y muestra instrucciones paso a paso ya que iOS no soporta instalación programática

#### 2. **Banner Inteligente**
- Aparece después de 3 segundos de carga (no molesta inmediatamente)
- Se puede cerrar y no vuelve a aparecer por 24 horas
- Diseño responsive (se adapta a móvil y desktop)
- Animación suave desde abajo
- No aparece si la app ya está instalada

#### 3. **Instrucciones Específicas para iOS**

```
📱 ¡Instalá Coques Bakery en tu iPhone!

Seguí estos pasos:
1. Tocá el botón "Compartir □↑" en la barra inferior
2. Deslizá hacia abajo y tocá "Agregar a pantalla de inicio"
3. Confirmá tocando "Agregar" arriba a la derecha

💡 La app aparecerá en tu pantalla de inicio como cualquier otra app
```

#### 4. **Botón de Instalación para Android**

```
📱 ¡Instalá Coques Bakery en tu celular!
Acceso rápido, funciona offline y recibí notificaciones

[Instalar App] [X]
```

## 🎨 Características Visuales

### Banner Android/Chrome
- Fondo degradado: Violeta (#9333ea) a Azul (#3b82f6)
- Botón blanco con texto violeta
- Ícono de celular 📱
- Botón de cerrar [X] discreto
- Responsive: se adapta a pantallas chicas

### Banner iOS
- Fondo degradado: Azul a Violeta
- Instrucciones numeradas claras
- Destacados en amarillo (#fbbf24)
- Fondo semi-transparente para las instrucciones
- Completamente responsive

## 📋 Integración

El componente se agregó al layout principal:

```tsx
// src/app/layout.tsx
import InstallPrompt from '@/components/InstallPrompt'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <UpdateNotification />
        <InstallPrompt />  {/* 👈 Nuevo componente */}
      </body>
    </html>
  )
}
```

## 🔧 Lógica Técnica

### Detección de Instalación
```typescript
const isInStandaloneMode = 
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone ||
  document.referrer.includes('android-app://')
```

### Persistencia
- Usa `localStorage` para recordar si el usuario cerró el banner
- Clave: `installBannerDismissed`
- Valor: timestamp del cierre
- Duración: 24 horas antes de volver a mostrar

### Detección de iOS
```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
const isIOSSafari = isIOS && /(Safari)/.test(navigator.userAgent) && !(window as any).chrome
```

## 🎯 Comportamiento por Plataforma

| Plataforma | Comportamiento |
|------------|----------------|
| **Android Chrome** | Banner con botón "Instalar App" que activa el prompt nativo |
| **Android Edge/Samsung** | Banner con botón "Instalar App" que activa el prompt nativo |
| **iOS Safari** | Banner con instrucciones paso a paso |
| **iOS Chrome** | No se muestra (Chrome en iOS no soporta instalación de PWA) |
| **Desktop Chrome/Edge** | Banner con botón de instalación |
| **App ya instalada** | No se muestra nada |

## 🚀 Ventajas

1. ✅ **Aumenta tasa de instalación**: Prompt visible y claro
2. ✅ **No es intrusivo**: Se puede cerrar fácilmente
3. ✅ **Instrucciones claras**: Especialmente en iOS donde es más complejo
4. ✅ **UX mejorada**: Solo aparece cuando realmente se puede instalar
5. ✅ **Persistente pero respetuoso**: Recuerda si ya se cerró (24hs)

## 📱 Testing

### Cómo Probar en Android
1. Abrir la app en Chrome desde el celular
2. Esperar 3 segundos
3. Debería aparecer el banner desde abajo
4. Click en "Instalar App"
5. Confirmar instalación

### Cómo Probar en iOS
1. Abrir la app en Safari desde el iPhone
2. Esperar 3 segundos
3. Debería aparecer el banner con instrucciones
4. Seguir los 3 pasos indicados

### Cómo Probar el Cierre Temporal
1. Cerrar el banner (X)
2. Recargar la página → No debería aparecer
3. Esperar 24 horas o borrar localStorage
4. Volver a cargar → Debería aparecer de nuevo

### Verificar que no aparece si ya está instalada
1. Instalar la PWA
2. Abrir la app desde el ícono instalado
3. El banner NO debería aparecer

## 🎨 CSS Agregado

Se agregó una nueva animación en [`src/app/globals.css`](./src/app/globals.css):

```css
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}
```

## 🔄 Comparación con App Lavadero

| Aspecto | App Lavadero | Coques Bakery (Ahora) |
|---------|--------------|------------------------|
| Prompt visible | ❌ Solo manual desde botón | ✅ Banner automático |
| iOS instrucciones | ❌ No | ✅ Instrucciones detalladas |
| Android instalación | ✅ Botón en página local | ✅ Banner global + botón |
| Detección automática | ❌ No | ✅ Detecta plataforma |
| Persistencia | ❌ No recuerda | ✅ 24hs sin molestar |

## 📊 Mejoras Futuras (Opcional)

1. **A/B Testing**: Probar diferentes textos y tiempos de aparición
2. **Analytics**: Trackear cuántos usuarios instalan vs cierran
3. **Personalización**: Mostrar diferentes mensajes según la sección
4. **Frecuencia dinámica**: Ajustar según comportamiento del usuario
5. **Animaciones avanzadas**: Hacer el banner más llamativo

## 🎓 Referencias

- [beforeinstallprompt Event](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent)
- [iOS PWA Install](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [PWA Install Patterns](https://web.dev/promote-install/)
