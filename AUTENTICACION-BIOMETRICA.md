# Autenticación Biométrica (Huella Digital / Reconocimiento Facial)

## ¿Es Posible?

**SÍ, es totalmente posible** implementar autenticación biométrica (huella digital, reconocimiento facial, FaceID, TouchID, etc.) en una PWA usando la **Web Authentication API (WebAuthn)**.

## ¿Cómo Funciona?

### Tecnología: WebAuthn
- Es un estándar web moderno soportado por la mayoría de navegadores
- Funciona en Android, iOS, y desktop
- Usa la biometría del dispositivo (huella, Face ID, Windows Hello, etc.)
- Es más seguro que las contraseñas tradicionales

### Compatibilidad Actual (2026)
✅ **Android Chrome**: Huella digital nativa del dispositivo  
✅ **iOS Safari**: Face ID / Touch ID  
✅ **Windows**: Windows Hello (facial/huella)  
✅ **Desktop**: Authenticators USB (opcional)

## Flujo de Uso

### Registro (Primera vez)
1. Usuario ingresa email/password como ahora
2. Sistema pregunta: "¿Querés usar tu huella/cara para futuros accesos?"
3. Si acepta, se registra la credencial biométrica en el dispositivo
4. Próximas veces: solo biometría, sin password

### Login Posterior
1. Usuario abre la app
2. Ve botón "Ingresar con huella/Face ID"
3. Usa su biometría → ingresa automáticamente
4. Opcional: mantener login con password como backup

## Implementación Técnica

### Archivos a Crear/Modificar

#### 1. `/src/lib/webauthn.ts` - Lógica de WebAuthn
```typescript
export async function registrarCredencialBiometrica(userId: string, email: string) {
  // Verificar soporte
  if (!window.PublicKeyCredential) {
    throw new Error('Biometría no soportada en este dispositivo')
  }

  // Generar challenge desde el servidor
  const challenge = await fetch('/api/auth/webauthn/register-challenge', {
    method: 'POST',
    body: JSON.stringify({ userId, email })
  }).then(r => r.json())

  // Solicitar credencial biométrica
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: new Uint8Array(challenge.challenge),
      rp: { name: "Fidelización Zona" },
      user: {
        id: new Uint8Array(Buffer.from(userId)),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Usa sensor del dispositivo
        userVerification: "required" // Requiere biometría
      },
      timeout: 60000,
    }
  })

  // Guardar credencial en servidor
  return fetch('/api/auth/webauthn/register', {
    method: 'POST',
    body: JSON.stringify({ userId, credential })
  })
}

export async function loginConBiometria(email: string) {
  // Obtener challenge
  const challenge = await fetch('/api/auth/webauthn/login-challenge', {
    method: 'POST',
    body: JSON.stringify({ email })
  }).then(r => r.json())

  // Solicitar autenticación
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array(challenge.challenge),
      timeout: 60000,
      userVerification: "required"
    }
  })

  // Verificar con servidor
  return fetch('/api/auth/webauthn/login', {
    method: 'POST',
    body: JSON.stringify({ email, assertion })
  })
}
```

#### 2. `/src/app/api/auth/webauthn/` - Endpoints API
- `register-challenge/route.ts` - Genera challenge para registro
- `register/route.ts` - Guarda credencial pública en DB
- `login-challenge/route.ts` - Genera challenge para login
- `login/route.ts` - Verifica credencial y genera token JWT

#### 3. Base de Datos - Nueva Tabla
```sql
CREATE TABLE credenciales_biometricas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  dispositivo TEXT, -- Nombre/descripción opcional
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP
);
```

#### 4. UI - Botón en Login
```tsx
// En /src/app/login/page.tsx
{soportaBiometria && (
  <button onClick={loginConHuella}>
    🔐 Ingresar con Huella / Face ID
  </button>
)}
```

## Ventajas

✅ **Más Seguro**: La clave privada nunca sale del dispositivo  
✅ **Más Rápido**: Login en 1-2 segundos  
✅ **Mejor UX**: No recordar passwords  
✅ **Sin Phishing**: No hay password que robar  
✅ **Multi-Dispositivo**: Cada dispositivo tiene su biometría

## Consideraciones

⚠️ **Backup necesario**: Mantener login con password por si:
   - El usuario cambia de dispositivo
   - Problemas con sensor biométrico
   - Dispositivos sin biometría

⚠️ **HTTPS Obligatorio**: WebAuthn solo funciona en HTTPS (ya lo tenemos)

⚠️ **Primer login**: Siempre requiere password la primera vez

## Costo de Implementación

### Tiempo Estimado: 4-6 horas de desarrollo
1. **Backend** (2-3 horas):
   - API endpoints para WebAuthn
   - Migración de base de datos
   - Validación de credenciales

2. **Frontend** (1-2 horas):
   - Helper functions WebAuthn
   - UI en login/perfil
   - Manejo de errores

3. **Testing** (1 hora):
   - Probar en diferentes dispositivos
   - Flujos alternativos

### Librerías Recomendadas
- `@simplewebauthn/server` - Para el backend (simplifica mucho)
- `@simplewebauthn/browser` - Para el frontend

## Prioridad

**Recomendación**: Implementar después de que el sistema actual esté 100% estable.

Es una feature muy buena para mejorar la experiencia del usuario, pero primero es importante asegurar que:
1. ✅ Login actual funciona perfecto
2. ✅ Sistema de pedidos funciona bien
3. ✅ PWA se instala correctamente
4. ✅ No hay bugs críticos

Luego sí, **la autenticación biométrica sería el siguiente paso lógico** para mejorar la seguridad y experiencia.

## Implementación Paso a Paso

### Fase 1: Preparación
1. Agregar tabla en DB
2. Instalar librerías SimpleWebAuthn
3. Crear endpoints básicos

### Fase 2: Registro
1. Agregar opción en /perfil
2. "¿Activar acceso con huella?"
3. Registrar credencial

### Fase 3: Login
1. Detectar si usuario tiene biometría
2. Mostrar botón correspondiente
3. Login directo

### Fase 4: Testing
1. Probar en Android (huella)
2. Probar en iOS (Face ID)
3. Probar casos de error

## ¿Querés que lo implemente?

Si querés que lo agregue, podemos hacerlo en una próxima sesión cuando el resto esté funcionando al 100%.

Por ahora, con las mejoras de PWA que acabo de hacer, tu Android debería poder instalar la app correctamente.
