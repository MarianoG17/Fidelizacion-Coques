# Plan: Autenticación Biométrica (Passkeys) - Implementación Opcional

## ✅ Respuesta Directa

**SÍ, totalmente posible.** Un usuario puede:
1. Loguearse con Google (primera vez)
2. Activar biometría desde su perfil
3. Próximas veces: elegir entre Google o biometría
4. Ambos métodos funcionan simultáneamente

## 🎯 Enfoque: Autenticación OPCIONAL y Compatible

### Métodos de Login (Todos Coexisten)
```
┌─────────────────────────────────────┐
│     Pantalla de Login               │
├─────────────────────────────────────┤
│                                     │
│  [Continuar con Google] 🔵          │  ← Ya funciona
│                                     │
│  [Email y Contraseña] ✉️            │  ← Ya funciona
│                                     │
│  [Huella / Face ID] 👆             │  ← NUEVO (solo si está activado)
│                                     │
└─────────────────────────────────────┘
```

**Clave:** La biometría NO reemplaza nada, solo se AGREGA como opción adicional.

## 🔄 Flujo Completo

### Caso 1: Usuario Nuevo con Google
```
1. Usuario → "Continuar con Google"
2. OAuth de Google → Login exitoso
3. Completa teléfono si es necesario
4. Llega a su perfil/pass
5. Ve banner: "🔐 ¿Querés activar acceso rápido con huella?"
   [Activar Ahora] [Más Tarde]
6. Si activa:
   - Registra credencial biométrica
   - Próximas veces: puede usar huella O Google
```

### Caso 2: Usuario Existente (Email/Password)
```
1. Usuario → Login con email/password
2. Ve banner: "🔐 ¿Querés activar acceso con huella?"
3. Si activa:
   - Registra credencial biométrica
   - Próximas veces: puede usar huella O email/password
```

### Caso 3: Login con Biometría (Después de Activar)
```
1. Usuario abre app
2. Ve botón: "Ingresar con 👆 Huella / 🤳 Face ID"
3. Click → Sensor biométrico del dispositivo
4. Autenticado en 1-2 segundos
5. Alternativas:
   - ¿Problemas? → "Usar Google"
   - ¿Problemas? → "Usar Email/Password"
```

## 🛠️ Implementación Paso a Paso

### Fase 1: Base de Datos (15 min)

```sql
-- Agregar tabla para credenciales biométricas
CREATE TABLE passkeys (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL, -- ID de la credencial
  public_key TEXT NOT NULL, -- Clave pública
  counter BIGINT DEFAULT 0, -- Contador de usos (seguridad)
  transports TEXT[], -- ['internal', 'usb', 'nfc', 'ble']
  dispositivo_nombre TEXT, -- "iPhone de Juan" (opcional)
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  UNIQUE(cliente_id, credential_id)
);

CREATE INDEX idx_passkeys_cliente ON passkeys(cliente_id);
CREATE INDEX idx_passkeys_credential ON passkeys(credential_id);
```

**Migración:**
```bash
# Crear archivo
touch prisma/migrations/add_passkeys.sql
# Pegar el SQL arriba
# Aplicar
npm run prisma db push
```

### Fase 2: Instalar Librerías (5 min)

```bash
cd fidelizacion-zona
npm install @simplewebauthn/server @simplewebauthn/browser
```

### Fase 3: Backend - API Endpoints (1.5 horas)

#### 3.1 Generar Challenge para Registro
```typescript
// src/app/api/auth/passkey/register-options/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cliente = await prisma.cliente.findUnique({
      where: { email: session.user.email }
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Generar opciones de registro
    const options = await generateRegistrationOptions({
      rpName: 'Fidelización Zona',
      rpID: process.env.NEXT_PUBLIC_RP_ID || 'zona.com.ar',
      userID: cliente.id.toString(),
      userName: cliente.email!,
      userDisplayName: cliente.nombre || cliente.email!,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Solo dispositivo (no USB keys)
        userVerification: 'required', // Requiere biometría
        residentKey: 'preferred', // Permite passkeys sin username
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 y RS256
    })

    // Guardar challenge temporalmente (para verificación posterior)
    // Opción 1: En memoria (simple pero se pierde al reiniciar)
    global.pendingChallenges = global.pendingChallenges || new Map()
    global.pendingChallenges.set(cliente.id.toString(), options.challenge)

    // Opción 2: En DB (más robusto)
    // await prisma.cliente.update({
    //   where: { id: cliente.id },
    //   data: { pendingChallenge: options.challenge }
    // })

    return NextResponse.json(options)
  } catch (error) {
    console.error('[PASSKEY] Error generando opciones de registro:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

#### 3.2 Verificar y Guardar Credencial
```typescript
// src/app/api/auth/passkey/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { credential, deviceName } = await req.json()

    const cliente = await prisma.cliente.findUnique({
      where: { email: session.user.email }
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener challenge guardado
    const expectedChallenge = global.pendingChallenges?.get(cliente.id.toString())
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expirado' }, { status: 400 })
    }

    // Verificar credencial
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_APP_URL!,
      expectedRPID: process.env.NEXT_PUBLIC_RP_ID || 'zona.com.ar',
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

    // Guardar en DB
    await prisma.passkey.create({
      data: {
        clienteId: cliente.id,
        credentialId: Buffer.from(credentialID).toString('base64'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter: Number(counter),
        dispositivoNombre: deviceName || 'Mi dispositivo',
      }
    })

    // Limpiar challenge
    global.pendingChallenges?.delete(cliente.id.toString())

    return NextResponse.json({ 
      success: true,
      message: 'Biometría activada exitosamente' 
    })
  } catch (error) {
    console.error('[PASSKEY] Error verificando registro:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

#### 3.3 Generar Challenge para Login
```typescript
// src/app/api/auth/passkey/login-options/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

export async function POST(req: NextRequest) {
  try {
    // Para passkeys, no necesitamos email previo
    // El dispositivo ya conoce la credencial
    
    const options = await generateAuthenticationOptions({
      rpID: process.env.NEXT_PUBLIC_RP_ID || 'zona.com.ar',
      userVerification: 'required',
    })

    // Guardar challenge globalmente
    global.loginChallenges = global.loginChallenges || new Map()
    global.loginChallenges.set(options.challenge, Date.now())

    return NextResponse.json(options)
  } catch (error) {
    console.error('[PASSKEY] Error generando opciones de login:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

#### 3.4 Verificar Login con Biometría
```typescript
// src/app/api/auth/passkey/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json()

    // Buscar credencial en DB
    const credentialId = Buffer.from(credential.id, 'base64url').toString('base64')
    
    const passkey = await prisma.passkey.findUnique({
      where: { credentialId },
      include: { cliente: { include: { nivel: true } } }
    })

    if (!passkey) {
      return NextResponse.json({ error: 'Credencial no encontrada' }, { status: 404 })
    }

    // Obtener challenge
    const expectedChallenge = credential.response.clientDataJSON // extraer challenge

    // Verificar autenticación
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_APP_URL!,
      expectedRPID: process.env.NEXT_PUBLIC_RP_ID || 'zona.com.ar',
      authenticator: {
        credentialID: Buffer.from(passkey.credentialId, 'base64'),
        credentialPublicKey: Buffer.from(passkey.publicKey, 'base64'),
        counter: passkey.counter,
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verificación fallida' }, { status: 401 })
    }

    // Actualizar contador
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { 
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date()
      }
    })

    // Generar JWT (igual que login normal)
    const token = jwt.sign(
      {
        clienteId: passkey.cliente.id,
        email: passkey.cliente.email,
        nombre: passkey.cliente.nombre,
        phone: passkey.cliente.phone,
        nivel: passkey.cliente.nivel?.nombre || 'Bronce',
      },
      process.env.JWT_SECRET || 'secret-key-coques-2024',
      { expiresIn: '30d' }
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: passkey.cliente.id,
        email: passkey.cliente.email,
        nombre: passkey.cliente.nombre,
      }
    })
  } catch (error) {
    console.error('[PASSKEY] Error en login:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```

### Fase 4: Frontend - UI Components (1.5 horas)

#### 4.1 Hook para Passkeys
```typescript
// src/hooks/usePasskey.ts
import { useState } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'

export function usePasskey() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registrar = async (deviceName?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Verificar soporte
      if (!window.PublicKeyCredential) {
        throw new Error('Tu dispositivo no soporta biometría')
      }

      // Obtener opciones de registro
      const optionsRes = await fetch('/api/auth/passkey/register-options', {
        method: 'POST'
      })
      
      if (!optionsRes.ok) {
        throw new Error('Error al iniciar registro')
      }

      const options = await optionsRes.json()

      // Solicitar credencial biométrica
      const credential = await startRegistration(options)

      // Enviar al servidor
      const verifyRes = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, deviceName })
      })

      if (!verifyRes.ok) {
        throw new Error('Error al verificar credencial')
      }

      return await verifyRes.json()
    } catch (err: any) {
      console.error('[PASSKEY] Error en registro:', err)
      setError(err.message || 'Error al registrar biometría')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener opciones de login
      const optionsRes = await fetch('/api/auth/passkey/login-options', {
        method: 'POST'
      })

      if (!optionsRes.ok) {
        throw new Error('Error al iniciar login')
      }

      const options = await optionsRes.json()

      // Solicitar autenticación
      const credential = await startAuthentication(options)

      // Verificar con servidor
      const verifyRes = await fetch('/api/auth/passkey/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      })

      if (!verifyRes.ok) {
        throw new Error('Error al verificar credencial')
      }

      const data = await verifyRes.json()

      // Guardar token
      if (data.token) {
        localStorage.setItem('fidelizacion_token', data.token)
      }

      return data
    } catch (err: any) {
      console.error('[PASSKEY] Error en login:', err)
      setError(err.message || 'Error al autenticar con biometría')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { registrar, login, loading, error }
}
```

#### 4.2 Banner de Activación en Perfil
```typescript
// src/components/PasskeyPrompt.tsx
'use client'

import { useState } from 'react'
import { usePasskey } from '@/hooks/usePasskey'

export default function PasskeyPrompt() {
  const [dismissed, setDismissed] = useState(
    localStorage.getItem('passkey_prompt_dismissed') === 'true'
  )
  const { registrar, loading, error } = usePasskey()

  if (dismissed) return null

  async function handleActivate() {
    try {
      await registrar()
      alert('✅ Biometría activada exitosamente')
      setDismissed(true)
      localStorage.setItem('passkey_prompt_dismissed', 'true')
    } catch (err) {
      // Error ya manejado en el hook
    }
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('passkey_prompt_dismissed', 'true')
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-3xl">🔐</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-blue-900">
            Acceso rápido con huella o Face ID
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            Activá el acceso biométrico y entrá en segundos la próxima vez
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleActivate}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Activando...' : 'Activar Ahora'}
            </button>
            <button
              onClick={handleDismiss}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Más Tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 4.3 Botón en Login
```typescript
// src/app/login/page.tsx - Agregar al componente existente
import { usePasskey } from '@/hooks/usePasskey'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { login: passkeyLogin, loading: passkeyLoading } = usePasskey()
  const [hasPasskey, setHasPasskey] = useState(false)

  // Detectar si el navegador soporta passkeys
  useEffect(() => {
    async function checkPasskeySupport() {
      if (window.PublicKeyCredential) {
        // Verificar si hay credenciales disponibles (opcional)
        const available = await PublicKeyCredential.isConditionalMediationAvailable?.()
        setHasPasskey(!!available)
      }
    }
    checkPasskeySupport()
  }, [])

  async function handlePasskeyLogin() {
    try {
      await passkeyLogin()
      router.push('/pass')
    } catch (err) {
      // Error ya manejado
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-3xl font-bold text-center">Ingresar</h1>

        {/* Botón de Passkey (solo si está soportado) */}
        {hasPasskey && (
          <button
            onClick={handlePasskeyLogin}
            disabled={passkeyLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            <span className="text-2xl">👆</span>
            {passkeyLoading ? 'Autenticando...' : 'Huella / Face ID'}
          </button>
        )}

        {hasPasskey && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">O continuar con</span>
            </div>
          </div>
        )}

        {/* Botón de Google (existente) */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/pass' })}
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        {/* Email/Password (existente) */}
        <form onSubmit={handleEmailLogin}>
          {/* ... formulario existente ... */}
        </form>
      </div>
    </div>
  )
}
```

### Fase 5: Schema de Prisma (10 min)

```prisma
// prisma/schema.prisma - Agregar modelo
model Passkey {
  id                Int       @id @default(autoincrement())
  clienteId         Int       @map("cliente_id")
  credentialId      String    @unique @map("credential_id")
  publicKey         String    @map("public_key")
  counter           BigInt    @default(0)
  dispositivoNombre String?   @map("dispositivo_nombre")
  createdAt         DateTime  @default(now()) @map("created_at")
  lastUsedAt        DateTime? @map("last_used_at")

  cliente Cliente @relation(fields: [clienteId], references: [id], onDelete: Cascade)

  @@index([clienteId])
  @@map("passkeys")
}

// Agregar relación en modelo Cliente
model Cliente {
  // ... campos existentes ...
  passkeys Passkey[]
}
```

### Fase 6: Variables de Entorno

```env
# .env.local - Agregar
NEXT_PUBLIC_RP_ID=zona.com.ar
NEXT_PUBLIC_APP_URL=https://zona.com.ar
```

## 🧪 Testing

### Casos de Prueba
1. ✅ Registro de passkey después de login con Google
2. ✅ Registro de passkey después de login con email/password
3. ✅ Login con passkey
4. ✅ Fallback a Google si passkey falla
5. ✅ Múltiples dispositivos (cada uno su passkey)
6. ✅ Desactivar passkey desde perfil

## 📊 Ventajas de Esta Implementación

✅ **No rompe nada:** Los métodos actuales siguen funcionando
✅ **Opcional:** El usuario decide si lo activa
✅ **Universal:** Funciona con Google, email/password, cualquier método
✅ **Multi-dispositivo:** Cada dispositivo puede tener su passkey
✅ **Seguro:** La clave privada nunca sale del dispositivo

## 🎯 Resultado Final

```
Usuario que se loguea con Google:
1. Primera vez: Login con Google → Activa passkey (opcional)
2. Segunda vez en adelante: 
   - Opción A: Passkey (1 segundo)
   - Opción B: Google (15 segundos)
   - Ambas funcionan ✅

Usuario que se loguea con Email/Password:
1. Primera vez: Login con email → Activa passkey (opcional)
2. Segunda vez en adelante:
   - Opción A: Passkey (1 segundo)
   - Opción B: Email/Password (10 segundos)
   - Ambas funcionan ✅
```

## ⏱️ Tiempo Total de Implementación

- Base de datos: 15 min
- Librerías: 5 min
- Backend (4 endpoints): 1.5 horas
- Frontend (hook + components): 1.5 horas
- Testing: 30 min

**Total: ~4 horas**

## ¿Implementamos ahora?

Todo está listo para comenzar. ¿Quieres que empiece con la base de datos y los endpoints backend?
