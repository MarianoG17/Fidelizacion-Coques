# 📱 Visualización: Install Prompt en iOS Safari

## 🎬 Flujo Completo para Usuarios de iPhone

### **Paso 1: Usuario entra a coques.com desde Safari**

```
┌────────────────────────────────────────┐
│ ← →   coques.com           [Compartir]│ ← Safari toolbar
├────────────────────────────────────────┤
│                                        │
│    🥤 COQUES BAKERY                    │
│                                        │
│    Tu Pass Virtual                     │
│    [OTP: 123456]                       │
│                                        │
│    🎁 Beneficios de Hoy                │
│    [Sus beneficios reales de la DB]    │ ← Los beneficios reales
│                                        │  vienen de la base de datos
│                                        │  según su nivel
└────────────────────────────────────────┘
```

> **Nota:** Los beneficios que ve cada usuario son dinámicos y vienen de `/api/pass/beneficios-disponibles` según su nivel (Bronce/Plata/Oro/Diamante). Este diagrama solo muestra la estructura visual de la página.

### **Paso 2: Después de 3 segundos aparece el banner**

```
┌────────────────────────────────────────┐
│ ← →   coques.com           [Compartir]│
├────────────────────────────────────────┤
│                                        │
│    🥤 COQUES BAKERY                    │
│                                        │
│    Tu Pass Virtual                     │
│    [OTP: 123456]                       │
│                                        │
│                                        │
├────────────────────────────────────────┤ ← Desliza hacia arriba
│╔══════════════════════════════════════╗│   desde aquí con
││                                   [✕]││   animación suave
││ 📱  ¡Instalá Coques Bakery          ││
││      en tu iPhone!                   ││
││                                      ││
││  Acceso rápido desde tu pantalla     ││
││  de inicio                           ││
││                                      ││
││ ┌────────────────────────────────┐  ││
││ │  Seguí estos pasos:            │  ││
││ │                                │  ││
││ │  1. Tocá el botón [Compartir  ]│  ││
││ │     [□↑] en la barra inferior  │  ││
││ │                                │  ││
││ │  2. Deslizá hacia abajo y tocá │  ││
││ │     "Agregar a pantalla de     │  ││
││ │     inicio"                    │  ││
││ │                                │  ││
││ │  3. Confirmá tocando "Agregar" │  ││
││ │     arriba a la derecha        │  ││
││ │                                │  ││
││ │  💡 La app aparecerá en tu     │  ││
││ │  pantalla de inicio como       │  ││
││ │  cualquier otra app            │  ││
││ └────────────────────────────────┘  ││
│╚══════════════════════════════════════╝│
└────────────────────────────────────────┘
    [Home] [Atrás] [Tabs] [Compartir] ← iOS navigation bar
```

## 🎨 Detalles Visuales del Banner

### Colores:
- **Fondo:** Gradient azul → violeta (matching Coques branding)
  - `rgb(59, 130, 246)` (azul) → `rgb(147, 51, 234)` (violeta)
- **Texto:** Blanco con alta legibilidad
- **Números:** Amarillo dorado (`text-yellow-300`) para destacar
- **Caja de pasos:** Fondo blanco semi-transparente con blur effect

### Tamaño:
- **Alto total:** ~280-320px (depende del tamaño de texto del iPhone)
- **Ancho:** Full width con padding de 16px a los lados
- **Posición:** `position: fixed` en bottom (siempre visible al hacer scroll)

### Animación de entrada:
```
Tiempo 0s:     transform: translateY(100%)  ← Está debajo de la pantalla
               opacity: 0

Tiempo 0.3s:   transform: translateY(0)     ← Desliza suavemente hacia arriba
               opacity: 1
```

## 📝 Texto Exacto que Verán

### Título:
```
📱 ¡Instalá Coques Bakery en tu iPhone!
```

### Subtítulo:
```
Acceso rápido desde tu pantalla de inicio
```

### Instrucciones:
```
Seguí estos pasos:

1. Tocá el botón [Compartir □↑] en la barra inferior

2. Deslizá hacia abajo y tocá "Agregar a pantalla de inicio"

3. Confirmá tocando "Agregar" arriba a la derecha

💡 La app aparecerá en tu pantalla de inicio como cualquier otra app
```

## 🎭 Comportamiento Interactivo

### Botón [✕] (cerrar):
- **Posición:** Arriba a la derecha
- **Efecto hover:** Fondo blanco semi-transparente al tocar
- **Al tocar:** Banner desaparece + guarda en localStorage
- **No vuelve a aparecer por:** 24 horas

### Persistencia:
```javascript
// Se guarda en el dispositivo:
localStorage.setItem('installPromptDismissed', Date.now())

// El usuario puede volver a verlo después de:
// - 24 horas (86400000 milisegundos)
// - Si limpia el caché del navegador
// - Si usa modo incógnito (no se guarda)
```

## 📱 Comparación iOS vs Android

### iOS (lo que acabamos de ver):
```
┌──────────────────────────────────────┐
│                                      │
│  📱 ¡Instalá Coques Bakery          │
│     en tu iPhone!                    │
│                                      │
│  Seguí estos pasos:                  │
│  1. Tocá [Compartir □↑]             │
│  2. "Agregar a pantalla de inicio"   │
│  3. Confirmá "Agregar"               │
│                                      │
│  💡 Manual - requiere 3 pasos        │
└──────────────────────────────────────┘
```

### Android (más simple):
```
┌──────────────────────────────────────┐
│                                      │
│  📱 Instalá la app en tu dispositivo │
│     Acceso rápido, notificaciones    │
│                                      │
│     [Instalar]           [✕]        │ ← Un solo botón
│                                      │
│  💡 Automático - 1 click             │
└──────────────────────────────────────┘
```

## ⚙️ Detección Automática

El componente detecta automáticamente si es iOS mediante:

```typescript
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

if (isIOS && !isInStandaloneMode) {
  // Mostrar instrucciones manuales de iOS
} else if (deferredPrompt && !isIOS) {
  // Mostrar botón automático de Android
}
```

## 🔍 Casos Especiales

### Si el usuario YA instaló la app:
**NO se muestra el banner** → Detecta modo standalone

### Si el usuario está en modo incógnito:
Se muestra el banner normalmente, pero no se guarda el "dismissed" en localStorage

### Si el usuario cierra Safari y vuelve entrar:
- **Antes de 24h:** NO se muestra (está en localStorage)
- **Después de 24h:** Se vuelve a mostrar

### Si el usuario usa Chrome iOS (no Safari):
También muestra las instrucciones de iOS porque Chrome iOS usa el motor de Safari

## 📊 Métricas Sugeridas

Podés trackear estas acciones para medir efectividad:

```typescript
// Cuando aparece el banner
gtag('event', 'install_prompt_shown', { platform: 'ios' })

// Cuando lo cierran
gtag('event', 'install_prompt_dismissed', { platform: 'ios' })

// No podés trackear instalación directa en iOS 
// (a diferencia de Android)
```

---

## 🎯 Resumen Visual Simple

**Usuario de iPhone ve esto después de 3 segundos:**

1. Banner azul-violeta gradient en bottom
2. Emoji 📱 + texto "¡Instalá Coques Bakery en tu iPhone!"
3. Instrucciones claras paso a paso con números en amarillo
4. Botón [✕] para cerrar
5. No vuelve a aparecer por 24 horas si lo cierra

**Es completamente funcional y profesional** - explica claramente el proceso manual que Apple requiere para todas las PWAs.
