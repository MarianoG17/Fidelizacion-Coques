# Problema: Challenge No Encontrado en Passkeys

## 🐛 Error:
"Challenge no encontrado o expirado. Intenta nuevamente."

## 🔍 Causa:
**Vercel usa funciones serverless** - cada llamada API puede ejecutarse en una instancia diferente:

1. `/register-options` → Instancia A → Guarda challenge en `global`
2. `/register` → Instancia B → No encuentra el challenge (está en instancia A)

## ✅ Solución Temporal: Usar el Challenge del Navegador

El challenge viene en la respuesta del navegador, no necesitamos guardarlo en el servidor.

### Cambio Necesario:

En lugar de guardar el challenge en memoria, lo extraemos directamente de la `credential` que envía el navegador.

Ya está implementado en el código - el challenge se obtiene de:
```typescript
const expectedChallenge = credential.response.clientDataJSON 
  ? JSON.parse(Buffer.from(credential.response.clientDataJSON, 'base64').toString('utf-8')).challenge
  : null
```

Pero el código actual TAMBIÉN verifica que esté en `global.passkeyChallenges`, lo cual falla en serverless.

## 🔧 Fix Requerido:

Cambiar la verificación para NO depender de `global.passkeyChallenges` en producción.

**Opciones:**

### Opción 1: Remover verificación de challenge guardado (más simple)
Solo validar que el challenge venga en la credencial y que sea reciente.

### Opción 2: Guardar en Base de Datos (más robusto)
Crear tabla `PendingChallenges` con TTL.

### Opción 3: Usar Vercel KV (Redis)
Requiere configuración adicional en Vercel.

---

**Recomendación:** Opción 1 (remover verificación) porque:
- El challenge se valida de todas formas por `@simplewebauthn/server`
- Es más simple y funciona en serverless
- El tiempo de expiración está en el propio challenge

¿Quieres que implemente el fix ahora?
