# 🔧 Ejemplo de Refactorización - Cómo Usar brand.config.ts

Este documento muestra cómo convertir componentes hardcoded a usar la configuración centralizada.

---

## 📝 Antes vs Después

### Ejemplo 1: Nombre de la Empresa

**❌ ANTES (hardcoded):**
```tsx
// src/app/page.tsx
export default function Home() {
  return (
    <div>
      <h1>Bienvenido a Coques Pass</h1>
      <p>Tu pastelería de confianza</p>
    </div>
  )
}
```

**✅ DESPUÉS (configurable):**
```tsx
// src/app/page.tsx
import { BRAND_CONFIG } from '@/config/brand.config'

export default function Home() {
  return (
    <div>
      <h1>Bienvenido a {BRAND_CONFIG.branding.appName}</h1>
      <p>{BRAND_CONFIG.company.tagline}</p>
    </div>
  )
}
```

---

### Ejemplo 2: Logo

**❌ ANTES (hardcoded):**
```tsx
// src/components/Header.tsx
export function Header() {
  return (
    <header>
      <img src="/logo-coques.svg" alt="Coques" />
    </header>
  )
}
```

**✅ DESPUÉS (configurable):**
```tsx
// src/components/Header.tsx
import { BRAND_CONFIG } from '@/config/brand.config'

export function Header() {
  return (
    <header>
      <img 
        src={BRAND_CONFIG.branding.logo} 
        alt={BRAND_CONFIG.company.name} 
      />
    </header>
  )
}
```

---

### Ejemplo 3: Colores

**❌ ANTES (hardcoded):**
```tsx
// src/app/login/page.tsx
export default function Login() {
  return (
    <button className="bg-blue-600 hover:bg-blue-700 text-white">
      Iniciar Sesión
    </button>
  )
}
```

**✅ DESPUÉS (configurable):**
```tsx
// src/app/login/page.tsx
import { BRAND_CONFIG } from '@/config/brand.config'

export default function Login() {
  const primaryColor = BRAND_CONFIG.branding.colors.primary
  
  return (
    <button 
      className={`bg-${primaryColor}-600 hover:bg-${primaryColor}-700 text-white`}
    >
      Iniciar Sesión
    </button>
  )
}
```

**💡 Nota sobre Tailwind:** Para colores dinámicos, también podés usar CSS variables o el enfoque de safelist en `tailwind.config.js`.

---

### Ejemplo 4: Emails

**❌ ANTES (hardcoded):**
```tsx
// src/lib/email.ts
export async function sendWelcomeEmail(clienteEmail: string, nombre: string) {
  const subject = '¡Bienvenido a Coques Points! 🎉'
  const fromEmail = 'noreply@mail.coques.com.ar'
  const fromName = 'Coques'
  
  // ...
}
```

**✅ DESPUÉS (configurable):**
```tsx
// src/lib/email.ts
import { BRAND_CONFIG } from '@/config/brand.config'

export async function sendWelcomeEmail(clienteEmail: string, nombre: string) {
  const subject = BRAND_CONFIG.emails.templates.welcome.subject
    .replace('[NOMBRE PROGRAMA]', BRAND_CONFIG.fidelizacion.programName)
  
  const fromEmail = BRAND_CONFIG.emails.fromEmail
  const fromName = BRAND_CONFIG.emails.fromName
  
  // ...
}
```

---

### Ejemplo 5: Features Condicionales

**❌ ANTES (siempre visible):**
```tsx
// src/app/page.tsx
export default function Home() {
  return (
    <div>
      <SistemaDeNiveles />
      <WooCommerceStore />
      <DeltaWashStatus />
    </div>
  )
}
```

**✅ DESPUÉS (condicional según config):**
```tsx
// src/app/page.tsx
import { FEATURES_CONFIG } from '@/config/features.config'

export default function Home() {
  return (
    <div>
      {FEATURES_CONFIG.niveles && <SistemaDeNiveles />}
      {FEATURES_CONFIG.woocommerce && <WooCommerceStore />}
      {FEATURES_CONFIG.deltawash && <DeltaWashStatus />}
    </div>
  )
}
```

---

### Ejemplo 6: Links de Redes Sociales

**❌ ANTES (hardcoded):**
```tsx
// src/components/Footer.tsx
export function Footer() {
  return (
    <footer>
      <a href="https://instagram.com/coques">Instagram</a>
      <a href="https://facebook.com/coques">Facebook</a>
      <a href="https://wa.me/5491112345678">WhatsApp</a>
    </footer>
  )
}
```

**✅ DESPUÉS (configurable):**
```tsx
// src/components/Footer.tsx
import { BRAND_CONFIG } from '@/config/brand.config'

export function Footer() {
  return (
    <footer>
      {BRAND_CONFIG.social.instagram && (
        <a href={BRAND_CONFIG.social.instagram}>Instagram</a>
      )}
      {BRAND_CONFIG.social.facebook && (
        <a href={BRAND_CONFIG.social.facebook}>Facebook</a>
      )}
      {BRAND_CONFIG.social.whatsapp && (
        <a href={`https://wa.me/${BRAND_CONFIG.social.whatsapp.replace(/[^0-9]/g, '')}`}>
          WhatsApp
        </a>
      )}
    </footer>
  )
}
```

---

## 🎯 Patrón Recomendado

### 1. Importar al inicio del archivo

```tsx
import { BRAND_CONFIG } from '@/config/brand.config'
import { FEATURES_CONFIG } from '@/config/features.config'
```

### 2. Usar directamente en JSX

```tsx
<h1>{BRAND_CONFIG.company.name}</h1>
```

### 3. O extraer a variables si se usa mucho

```tsx
function MiComponente() {
  const { appName, colors } = BRAND_CONFIG.branding
  const { programName } = BRAND_CONFIG.fidelizacion
  
  return (
    <div className={`bg-${colors.primary}-500`}>
      <h1>{appName}</h1>
      <p>{programName}</p>
    </div>
  )
}
```

---

## 🔍 Qué Buscar para Refactorizar

### Strings hardcoded que deberían ser configurables:

```tsx
// ❌ Buscar y reemplazar:
"Coques"
"Coques Pass"
"Coques Staff"
"Coques Points"
"app.coques.com.ar"
"noreply@mail.coques.com.ar"
"Tu pastelería de confianza"
// etc...

// ✅ Reemplazar con:
BRAND_CONFIG.company.name
BRAND_CONFIG.branding.appName
BRAND_CONFIG.branding.staffAppName
BRAND_CONFIG.fidelizacion.programName
BRAND_CONFIG.company.domain
BRAND_CONFIG.emails.fromEmail
BRAND_CONFIG.company.tagline
```

---

## 🛠️ Herramientas de Búsqueda

### VS Code - Buscar en todo el proyecto

1. Presioná `Ctrl + Shift + F` (Windows) o `Cmd + Shift + F` (Mac)
2. Buscá: `"Coques"` (con comillas para buscar string exacto)
3. Reemplazá con: `{BRAND_CONFIG.company.name}`

### Regex para encontrar strings hardcoded

```regex
["']Coques[^"']*["']
["']app\.coques\.com\.ar["']
["']noreply@mail\.coques\.com\.ar["']
```

---

## 📋 Checklist de Refactorización

Para cada componente/página:

- [ ] Buscar strings hardcoded de la empresa
- [ ] Reemplazar con `BRAND_CONFIG.*`
- [ ] Buscar features que deberían ser opcionales
- [ ] Agregar condicionales con `FEATURES_CONFIG.*`
- [ ] Verificar que funcione igual que antes
- [ ] Probar cambiando valores en brand.config.ts

---

## 🎨 Componentes Prioritarios para Refactorizar

### Alta prioridad (visibles al usuario):
1. ✅ `src/app/page.tsx` (home)
2. ✅ `src/app/login/page.tsx` 
3. ✅ `src/app/pass/page.tsx`
4. ✅ `src/components/Header.tsx`
5. ✅ `src/components/Footer.tsx`
6. ✅ `src/app/layout.tsx` (metadata)

### Media prioridad:
7. ⏳ `src/app/perfil/page.tsx`
8. ⏳ `src/app/historial/page.tsx`
9. ⏳ `src/app/logros/page.tsx`
10. ⏳ `src/app/admin/page.tsx`
11. ⏳ `src/app/local/page.tsx`

### Baja prioridad (backend/internos):
12. ⏳ `src/lib/email.ts`
13. ⏳ Archivos en `src/app/api/`

---

## 🚀 Ejemplo Completo de Refactorización

**Archivo: `src/components/WelcomeCard.tsx`**

**❌ ANTES:**
```tsx
export function WelcomeCard({ userName }: { userName: string }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6">
      <img src="/logo-coques.svg" alt="Coques" className="h-12 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">
        ¡Hola {userName}!
      </h2>
      <p className="text-blue-100">
        Bienvenido a Coques Pass
      </p>
      <p className="text-sm text-blue-200 mt-2">
        Acumulá visitas y disfrutá de beneficios exclusivos
      </p>
      <button className="mt-4 bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50">
        Ver mis beneficios
      </button>
    </div>
  )
}
```

**✅ DESPUÉS:**
```tsx
import { BRAND_CONFIG } from '@/config/brand.config'

export function WelcomeCard({ userName }: { userName: string }) {
  const { logo, appName, colors } = BRAND_CONFIG.branding
  const { welcomeSubtitle } = BRAND_CONFIG.fidelizacion.texts
  const { name } = BRAND_CONFIG.company
  
  return (
    <div className={`bg-gradient-to-r from-${colors.primary}-600 to-${colors.accent}-600 rounded-2xl p-6`}>
      <img src={logo} alt={name} className="h-12 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">
        ¡Hola {userName}!
      </h2>
      <p className={`text-${colors.primary}-100`}>
        Bienvenido a {appName}
      </p>
      <p className={`text-sm text-${colors.primary}-200 mt-2`}>
        {welcomeSubtitle}
      </p>
      <button className={`mt-4 bg-white text-${colors.primary}-600 px-6 py-2 rounded-lg font-semibold hover:bg-${colors.primary}-50`}>
        Ver mis beneficios
      </button>
    </div>
  )
}
```

---

## 💡 Tips y Mejores Prácticas

### 1. No sobreoptimizar
Si algo se usa una sola vez y es muy específico, está bien dejarlo hardcoded.

### 2. Documentar campos nuevos
Si agregás campos al config, documentalos con comentarios:
```tsx
export const BRAND_CONFIG = {
  // ...
  
  // 🎯 Programa de fidelización
  fidelizacion: {
    // Nombre visible del programa (ej: "Coques Points", "Mi Empresa Rewards")
    programName: 'Coques Points',
  }
}
```

### 3. Validar configuración
Podés agregar validaciones:
```tsx
if (!BRAND_CONFIG.company.name) {
  throw new Error('BRAND_CONFIG.company.name es requerido')
}
```

### 4. TypeScript es tu amigo
El tipo `BrandConfig` ya está definido, usalo:
```tsx
function useBrand(): BrandConfig {
  return BRAND_CONFIG
}
```

---

## ✅ Testing

Después de refactorizar, probá:

1. ✅ La app sigue funcionando igual
2. ✅ Cambiar un valor en `brand.config.ts` afecta toda la app
3. ✅ No hay errores de TypeScript
4. ✅ No hay warnings de React
5. ✅ El build de producción funciona (`npm run build`)

---

## 🎉 ¡Listo!

Una vez refactorizados los componentes principales, tu template estará listo para compartir con cualquier empresa. Solo necesitarán copiar `brand.config.example.ts` y personalizarlo.
