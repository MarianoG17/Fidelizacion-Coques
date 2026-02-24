# Plan: Autenticación Biométrica con Passkeys (Huella y Face ID)

## 🎯 Objetivo

Permitir que los clientes se logueen usando:
- 🔐 **Huella dactilar** (Touch ID / lectores de huella Android)
- 👤 **Reconocimiento facial** (Face ID)  
- 🔑 **PIN del dispositivo** (como respaldo)

Sin necesidad de recordar contraseñas.

---

## ✨ ¿Qué son los Passkeys?

Los **Passkeys** son credenciales digitales que se guardan en tu dispositivo y usan autenticación biométrica del sistema operativo.

**Tecnología**: WebAuthn API (estándar web apoyado por Apple, Google, Microsoft)

### Ventajas vs Contraseñas Tradicionales

| Feature | Contraseñas | Passkeys |
|---------|-------------|----------|
| Facilidad de uso | Media | Muy alta (1 toque) |
| Seguridad | Media-Baja | Muy alta |
| Velocidad de login | ~5-10 seg | ~1 seg |
| Olvidar credenciales | ❌ Sí | ✅ No |
| Phishing | ❌ Vulnerable | ✅ Inmune |
| Sincronización entre dispositivos | ❌ No | ✅ Sí (iCloud, Google) |

---

## 🔍 Cómo Funciona

### Primera vez (Registro del Passkey):
1. Cliente se loguea con Google/Email
2. Sistema pregunta: "¿Guardar passkey para login rápido?"
3. Cliente confirma con huella/Face ID
4. **Passkey guardado** en el dispositivo

### Logins posteriores:
1. Cliente abre app.coques.com.ar
2. Click en "Login con huella/Face ID"
3. **Usa huella/Face ID** para confirmar
4. ✅ Logueado en 1 segundo

---

## 📱 Compatibilidad

### ✅ Totalmente Soportado:
- **iPhone/iPad**: iOS 16+ (Touch ID, Face ID)
- **Android**: Android 9+ (Huella, Face Unlock)
- **Chrome/Edge**: Windows 10+ (Windows Hello)
- **Safari**: macOS (Touch ID)

### ⚠️ Soporte Parcial:
- Navegadores viejos: Firefox <119, Safari <16
- Dispositivos sin biometría: Usa PIN del dispositivo

### 📊 Estadísticas:
- ~85% de usuarios tienen dispositivos compatibles
- ~95% de smartphones modernos (2020+) lo soportan

---

## 🛠️ Implementación Técnica

### Opción 1: SimpleWebAuthn (Recomendada) ⭐

**Librería**: `@simplewebauthn/server` + `@simplewebauthn/browser`

**Ventajas**:
- ✅ Más simple de implementar
- ✅ Wrapper sobre WebAuthn API
- ✅ Maneja complejidad por vos
- ✅ Muy bien documentada
- ✅ TypeScript nativo

**Tiempo**: 3-4 horas de implementación

### Opción 2: WebAuthn API Nativa

**Ventajas**:
- ✅ Sin dependencias adicionales
- ✅ Más control

**Desventajas**:
- ⚠️ Más complejo
- ⚠️ Más código para escribir

**Tiempo**: 6-8 horas

---

## 📋 Plan de Implementación con SimpleWebAuthn

### Fase 1: Backend - Endpoints (1 hora)

**Crear endpoints**:
```
POST /api/auth/passkey/register-options
POST /api/auth/passkey/register-verify
POST /api/auth/passkey/login-options
POST /api/auth/passkey/login-verify
```

**Agregar a schema.prisma**:
```prisma
model Cliente {
  // ... campos existentes ...
  
  // Nuevos campos para Passkeys
  passkeys Passkey[]
}

model Passkey {
  id            String   @id @default(uuid())
  clienteId     String
  cliente       Cliente  @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  
  credentialID  String   @unique
  publicKey     String
  counter       Int      @default(0)
  
  deviceName    String?  // "iPhone de Mariano"
  createdAt     DateTime @default(now())
  lastUsedAt    DateTime @updatedAt
  
  @@index([clienteId])
}
```

### Fase 2: Frontend - UI (1 hora)

**Agregar botones en /login**:
```tsx
// Botón principal de passkey
<button onClick={handlePasskeyLogin}>
  🔐 Login con huella/Face ID
</button>

// Después del login con Google/Email
<button onClick={handlePasskeyRegister}>
  ¿Guardar passkey para login más rápido?
</button>
```

**Modal de configuración**:
```
┌─────────────────────────────────┐
│  Configurar Login Biométrico    │
│                                 │
│  [Icono de huella/Face ID]     │
│                                 │
│  Tu dispositivo te pedirá       │
│  confirmar con huella o Face ID │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Activar Login Rápido   │ │
│  └───────────────────────────┘ │
│                                 │
│          [ Cancelar ]           │
└─────────────────────────────────┘
```

### Fase 3: Lógica de Passkeys (1 hora)

**Registro**:
```typescript
// 1. Cliente loguea con Google/Email
// 2. Ofrecer guardar passkey
// 3. Cliente confirma con biometría
// 4. Guardar credencial en BD
```

**Login**:
```typescript
// 1. Cliente click "Login con huella"
// 2. Sistema busca passkeys guardados
// 3. Cliente confirma con biometría
// 4. Verificar y loguear
```

### Fase 4: Testing (30 min)

- Probar en iPhone (Touch ID / Face ID)
- Probar en Android (Huella)
- Probar fallback (sin biometría disponible)

### Fase 5: UX Flows (30 min)

**Flow completo**:
```
Cliente nuevo:
1. Se registra con Google ✅
2. Sistema pregunta: "¿Guardar passkey?" 
3. Acepta y usa huella ✅
4. Passkey guardado ✅

Próximos logins:
1. Abre app
2. Ve botón "Login con huella" ✅
3. Usa huella ✅
4. Logueado en 1 segundo ✅

Si cambia de dispositivo:
1. Login con Google desde nuevo dispositivo ✅
2. Sistema pregunta: "¿Guardar passkey aquí?" ✅
3. Ahora tiene passkey en ambos dispositivos ✅
```

---

## 🎨 Diseño UX Recomendado

### Página de Login
```
┌──────────────────────────────────────┐
│                                      │
│         [Logo Coques]                │
│                                      │
│      Iniciar Sesión Rápido           │
│                                      │
│   ┌──────────────────────────────┐  │
│   │ 🔐 Login con huella/Face ID  │  │ <- NUEVO
│   └──────────────────────────────┘  │
│                                      │
│   ─────── O continuar con ───────   │
│                                      │
│   ┌──────────────────────────────┐  │
│   │ [G] Continuar con Google     │  │
│   └──────────────────────────────┘  │
│                                      │
│   ┌──────────────────────────────┐  │
│   │ Email                        │  │
│   └──────────────────────────────┘  │
│   ...                                │
└──────────────────────────────────────┘
```

### Modal después del primer login
```
┌──────────────────────────────────────┐
│  ¡Genial! Iniciaste sesión con       │
│  Google 🎉                           │
│                                      │
│  ¿Querés activar login rápido con    │
│  huella o Face ID para la próxima?   │
│                                      │
│   [Icono de huella/Face ID]         │
│                                      │
│   ✅ Login en 1 segundo               │
│   ✅ Más seguro                       │
│   ✅ Sin contraseñas                  │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   ✓ Sí, activar ahora       │   │
│  └──────────────────────────────┘   │
│                                      │
│       [ Tal vez después ]            │
└──────────────────────────────────────┘
```

---

## 📊 Comparación de Opciones de Login

| Método | Velocidad | Seguridad | UX | Compatibilidad |
|--------|-----------|-----------|-----|----------------|
| **Passkey (Huella/Face)** | ⚡ 1 seg | 🔒🔒🔒 | 😍 | 85% |
| **Google OAuth** | ⚡ 2-3 seg | 🔒🔒 | 😊 | 95% |
| **Email/Password** | 🐌 5-10 seg | 🔒 | 😐 | 100% |

---

## 💰 Costos

**$0** - WebAuthn es un estándar abierto, sin costos adicionales

---

## 🚀 Plan de Implementación Completo

### Fase 1: Google OAuth (Esta sesión)
- ⏱️ 2-3 horas
- ✅ Login con Google funcionando

### Fase 2: Passkeys (Próxima sesión)
- ⏱️ 3-4 horas
- ✅ Login con huella/Face ID funcionando

### Resultado Final:
```
Cliente tiene 3 opciones para loguear:
1. 🔐 Huella/Face ID (más rápido)
2. [G] Google (rápido y familiar)
3. 📧 Email/Password (tradicional)
```

---

## 📚 Librerías Recomendadas

### Backend:
```bash
npm install @simplewebauthn/server
```

### Frontend:
```bash
npm install @simplewebauthn/browser
```

**Total**: 2 librerías pequeñas (~50kb combined)

---

## 🔍 Consideraciones de Seguridad

### ✅ Ventajas de Seguridad:
- **Anti-phishing**: Passkey solo funciona en tu dominio
- **Sin contraseñas en servidor**: No hay nada que hackear
- **Biometría local**: Nunca sale del dispositivo
- **Certificado criptográfico**: Matemáticamente seguro

### ⚠️ Consideraciones:
- **Pérdida de dispositivo**: Cliente puede usar Google OAuth como backup
- **Cambio de teléfono**: Passkeys se sincronizan vía iCloud/Google
- **Navegador viejo**: Fallback a Google/Email

---

## 📱 Flujo Multi-Dispositivo

### Escenario: Cliente usa 2 dispositivos

**iPhone Personal**:
- Login con passkey (Face ID)

**Tablet en Casa**:
- Primera vez: Login con Google
- Sistema ofrece: "¿Guardar passkey aquí también?"
- Acepta: Ahora tiene passkey en ambos

**Nueva PC**:
- Login con Google (sin passkey, es PC pública)
- Sistema NO ofrece guardar passkey (es opcional)

---

## ✅ Checklist de Implementación

Cuando llegue el momento de implementar, necesitaremos:

### Preparación:
- [ ] Migración de BD (agregar tabla Passkey)
- [ ] Instalar librerías SimpleWebAuthn
- [ ] Configurar variables de entorno

### Backend:
- [ ] Endpoint: register-options
- [ ] Endpoint: register-verify
- [ ] Endpoint: login-options  
- [ ] Endpoint: login-verify
- [ ] Lógica de asociar passkey a cliente

### Frontend:
- [ ] Botón "Login con huella/Face ID"
- [ ] Modal de registro de passkey
- [ ] Flujo de registro post-login
- [ ] Manejo de errores (dispositivo sin biometría)

### Testing:
- [ ] Probar en iPhone
- [ ] Probar en Android
- [ ] Probar en desktop
- [ ] Probar fallbacks

---

## 🎯 Orden de Implementación Sugerido

### Esta semana:
1. ✅ Fix URL emails → Listo
2. 🔄 Login con Google → En progreso

### Próxima semana:
3. 🔐 Passkeys/Biometría

**Razón**: Implementar Google primero facilita la implementación de Passkeys después (se complementan).

---

## ❓ Preguntas Frecuentes

### ¿Los passkeys se sincronizan entre dispositivos?
**Sí**, vía iCloud (iPhone/iPad/Mac) y Google Password Manager (Android/Chrome).

### ¿Qué pasa si el cliente no tiene biometría?
Puede usar PIN del dispositivo, o seguir usando Google/Email.

### ¿Funciona offline?
**No** - Necesita conexión para verificar con el servidor. Pero la autenticación biométrica es local.

### ¿Es compatible con PWA?
**Sí** - Funciona perfecto en PWAs instaladas.

---

## 📖 Recursos para Aprender Más

- **WebAuthn Guide**: https://webauthn.guide
- **SimpleWebAuthn Docs**: https://simplewebauthn.dev
- **Demo**: https://webauthn.io (probar passkeys)
- **Apple Passkeys**: https://developer.apple.com/passkeys

---

## 🎉 Resumen

**Passkeys = El futuro del login**

- ⚡ Login en 1 segundo
- 🔒 Más seguro que contraseñas
- 😍 Mejor experiencia del usuario
- 📱 Funciona en 85% de dispositivos modernos
- 💰 $0 de costo adicional

**Plan**: Implementar Google OAuth primero, después agregar Passkeys.

Juntos, Google + Passkeys dan una experiencia de login increíble para tus clientes.
