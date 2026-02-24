# Plan: Implementación de Login con Google (OAuth)

## 🎯 Objetivo

Permitir que los clientes se registren y logueen usando su cuenta de Google en lugar de crear email/contraseña manualmente.

---

## ✅ Ventajas del Login con Google

### Para los Clientes:
- ✅ **No necesitan recordar otra contraseña**
- ✅ **Proceso más rápido** (1 click vs llenar formulario)
- ✅ **Más seguro** (Google maneja la autenticación)
- ✅ **Experiencia familiar** (todos conocen "Sign in with Google")
- ✅ **Email ya verificado** (Google lo verifica automáticamente)

### Para Coques:
- ✅ **Menos fricción** en el registro (más conversiones)
- ✅ **Menos emails de recuperación** de contraseña
- ✅ **Más datos del cliente** (nombre, foto de perfil)
- ✅ **Menos problemas** de seguridad (Google maneja todo)

---

## 🛠️ Opciones de Implementación

### Opción 1: NextAuth.js (Recomendada) ⭐

**Biblioteca**: `next-auth` (ahora llamado Auth.js)

**Ventajas**:
- ✅ Librería oficial para Next.js
- ✅ Soporta Google, Facebook, Email, etc.
- ✅ Maneja sesiones automáticamente
- ✅ Fácil de integrar con tu DB actual
- ✅ Muy bien documentada
- ✅ 30k+ estrellas en GitHub

**Desventajas**:
- ⚠️ Requiere configurar Google Cloud Console
- ⚠️ Aprox 2-3 horas de implementación

**Complejidad**: Media (pero con buena documentación)

---

### Opción 2: @react-oauth/google (Google específico)

**Ventajas**:
- ✅ Más simple si solo querés Google
- ✅ Componente React listo para usar
- ✅ Menos código que NextAuth

**Desventajas**:
- ⚠️ Solo Google (si después querés Facebook, hay que agregar otra librería)
- ⚠️ Más código manual para manejar sesiones

**Complejidad**: Media-Baja

---

### Opción 3: Clerk (Servicio Todo-en-Uno)

**Ventajas**:
- ✅ UI ya hecha (no escribís código de login)
- ✅ Maneja todo (Google, Email, SMS, 2FA, etc.)
- ✅ Dashboard para administrar usuarios
- ✅ Implementación rápida (1 hora)

**Desventajas**:
- ⚠️ Plan gratis: 5000 usuarios activos/mes (después paga)
- ⚠️ Dependes de un servicio externo
- ⚠️ Menos control sobre el flujo

**Complejidad**: Muy Baja

---

## 📋 Plan de Implementación con NextAuth.js

### Fase 1: Configuración de Google OAuth (30 min)

1. **Ir a Google Cloud Console**
   - https://console.cloud.google.com
   - Crear nuevo proyecto: "Coques Fidelizacion"

2. **Configurar OAuth Consent Screen**
   - User Type: External
   - App name: "Coques Fidelización"
   - Support email: tu@coques.com.ar
   - Logo: Logo de Coques
   - Authorized domains: coques.com.ar

3. **Crear OAuth 2.0 Credentials**
   - Tipo: Web application
   - Authorized redirect URIs:
     ```
     https://coques.vercel.app/api/auth/callback/google
     http://localhost:3000/api/auth/callback/google (para desarrollo)
     ```
   - Obtener: **Client ID** y **Client Secret**

### Fase 2: Instalación de NextAuth (10 min)

```bash
cd fidelizacion-zona
npm install next-auth
```

### Fase 3: Configurar NextAuth (30 min)

**Crear archivo**: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

export const authOptions = {
  providers: [
    // Login con Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    
    // Login con Email/Password (mantener existente)
    CredentialsProvider({
      // ... tu código actual de login con email/password
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Crear o encontrar cliente en tu DB
      if (account?.provider === "google") {
        const cliente = await prisma.cliente.findUnique({
          where: { email: user.email! }
        })
        
        if (!cliente) {
          // Crear nuevo cliente con datos de Google
          await prisma.cliente.create({
            data: {
              email: user.email!,
              nombre: user.name!,
              // ... otros campos
            }
          })
        }
      }
      return true
    },
    
    async session({ session, token }) {
      // Agregar datos del cliente a la sesión
      return session
    }
  },
  
  pages: {
    signIn: '/login', // Tu página de login actual
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### Fase 4: Agregar Botón de Google en Login (20 min)

**Modificar**: `src/app/login/page.tsx`

```typescript
'use client'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  // ... código actual ...
  
  return (
    <div>
      {/* Botón de Google - Agregar antes del formulario */}
      <button
        onClick={() => signIn('google', { callbackUrl: '/pass' })}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          {/* Logo de Google SVG */}
        </svg>
        Continuar con Google
      </button>
      
      {/* Separador */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">O continuar con email</span>
        </div>
      </div>
      
      {/* Tu formulario actual de email/password */}
      {/* ... código actual ... */}
    </div>
  )
}
```

### Fase 5: Variables de Entorno (5 min)

**Agregar en Vercel** > Settings > Environment Variables:

```bash
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret

# NextAuth requiere un secret random
NEXTAUTH_SECRET=generar-string-random-64-caracteres
NEXTAUTH_URL=https://coques.vercel.app
```

Generar NEXTAUTH_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Fase 6: Proteger Rutas (30 min)

**Modificar páginas protegidas** para usar sesión de NextAuth:

```typescript
'use client'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function PassPage() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return <LoadingScreen />
  }
  
  if (status === 'unauthenticated') {
    redirect('/login')
  }
  
  // ... resto del código ...
}
```

### Fase 7: Migración de Schema (opcional)

**Si querés guardar el provider en la DB**:

```prisma
model Cliente {
  // ... campos existentes ...
  
  // Nuevos campos para OAuth
  googleId      String?  @unique
  authProvider  String?  @default("email") // 'email' o 'google'
}
```

---

## ⏱️ Tiempo Total Estimado

- **Configuración Google Console**: 30 min
- **Instalación NextAuth**: 10 min
- **Configuración NextAuth**: 30 min
- **UI Botón Google**: 20 min
- **Variables de entorno**: 5 min
- **Proteger rutas**: 30 min
- **Testing**: 30 min

**Total**: ~2.5 horas

---

## 🎨 Diseño UX Recomendado

```
┌──────────────────────────────────────┐
│                                      │
│         [Logo Coques]                │
│                                      │
│         Iniciar Sesión               │
│                                      │
│   ┌──────────────────────────────┐  │
│   │ [G] Continuar con Google     │  │
│   └──────────────────────────────┘  │
│                                      │
│   ─────── O continuar con ───────   │
│                                      │
│   ┌──────────────────────────────┐  │
│   │ Email                        │  │
│   └──────────────────────────────┘  │
│                                      │
│   ┌──────────────────────────────┐  │
│   │ Contraseña                   │  │
│   └──────────────────────────────┘  │
│                                      │
│   [        Iniciar Sesión        ]  │
│                                      │
│   ¿Olvidaste tu contraseña?          │
│   ¿No tenés cuenta? Registrate       │
│                                      │
└──────────────────────────────────────┘
```

---

## 🔐 Consideraciones de Seguridad

### ✅ Ventajas de OAuth:
- Google maneja la autenticación
- No guardás passwords en tu DB
- Soporte para 2FA de Google
- Tokens de acceso con expiración

### ⚠️ Cosas a considerar:
- **Email duplicado**: ¿Qué pasa si alguien se registró con email/password y después usa Google con el mismo email?
  - **Solución**: Vincular automáticamente las cuentas si el email coincide
  
- **Phone requerido**: Google no da el teléfono
  - **Solución**: Pedir el teléfono después del login con Google (pantalla adicional)

- **Migración de usuarios existentes**: Los usuarios que ya tienen cuenta con email/password
  - **Solución**: Permitir ambos métodos (pueden loguear con cualquiera)

---

## 🚀 Alternativa Rápida: Solo Agregar Google

Si querés implementar **solo** Google sin cambiar mucho:

1. **Instalar**: `npm install @react-oauth/google`
2. **Agregar botón** en `/login`
3. **Crear endpoint**: `/api/auth/google/callback`
4. **Manejar token** de Google y crear sesión

Tiempo: ~1 hora (pero sin NextAuth pierdes muchas features)

---

## 📊 Comparación Final

| Feature | Email/Password | + Google OAuth | + NextAuth.js |
|---------|----------------|----------------|---------------|
| Fricción para usuario | Alta | Baja | Baja |
| Seguridad | Media | Alta | Alta |
| Mantenimiento | Alto | Medio | Bajo |
| Experiencia del usuario | OK | Excelente | Excelente |
| Tiempo de implementación | - | +1h | +2.5h |
| Flexibilidad futura | Baja | Media | Alta |

---

## 🎯 Recomendación

**Implementar NextAuth.js con Google OAuth**

**Por qué**:
- Mejor experiencia para el usuario
- Preparado para agregar más providers (Facebook, Apple, etc.)
- Reducción de fricciones en el registro
- Menos problemas de "olvidé mi contraseña"
- Estándar de la industria

**¿Cuándo?**:
- Ahora que el resto del sistema está estable
- Después de resolver el tema de Brevo
- Te llevaría ~3 horas incluyendo testing

---

## ❓ Siguiente Paso

¿Querés que implementemos login con Google? 

**Opciones**:
1. **Sí, con NextAuth.js** - Implementación completa y robusta
2. **Sí, solo Google** - Implementación más simple y rápida
3. **No, más adelante** - Mantener solo email/password por ahora

Si elegís la opción 1 o 2, puedo empezar por crear el proyecto en Google Cloud Console y después seguimos con el código.
