# 📋 Resumen Ejecutivo: Solución Completa Google OAuth + Teléfono

## 🎯 Diagnóstico Final

Después del análisis, identificamos **DOS problemas separados**:

### 1. ⚠️ **Problema Crítico (Raíz): Error OAuth `invalid_grant`**

**Síntoma:**
```
[error] [next-auth][error][OAUTH_CALLBACK_ERROR] 
invalid_grant (Bad Request)
```

**Impacto:** El cliente **NO puede completar el login con Google**. El error ocurre ANTES de llegar a la pantalla del teléfono.

**Causa:** Mismatch entre las URLs configuradas en Google Cloud Console y las variables de entorno en Vercel.

📄 **Guía completa:** [`SOLUCION-ERROR-GOOGLE-OAUTH-INVALID-GRANT.md`](./SOLUCION-ERROR-GOOGLE-OAUTH-INVALID-GRANT.md)

### 2. ✅ **Problema Secundario: Validación de Teléfono**

**Síntoma:** Si el cliente lograra pasar el OAuth, podría ingresar números incompletos (11, 5411, 54911) que luego fallan.

**Impacto:** Cliente queda en loop sin completar registro.

**Solución:** Ya implementada con validaciones estrictas en frontend y backend.

📄 **Guía completa:** [`SOLUCION-REGISTRO-GOOGLE-TELEFONO.md`](./SOLUCION-REGISTRO-GOOGLE-TELEFONO.md)

---

## 🔴 Problema 1: OAuth `invalid_grant` (CRÍTICO)

### Causa Más Probable

La URL configurada en `NEXTAUTH_URL` o en Google Cloud Console no coincide **exactamente** con el dominio real.

### Verificación Urgente

#### En Vercel:
```bash
# Ver variables de entorno
Settings > Environment Variables > NEXTAUTH_URL

# Debe ser (ejemplo):
https://app.coques.com.ar
```

#### En Google Cloud Console:
```
https://console.cloud.google.com/apis/credentials

# Authorized redirect URIs debe incluir:
https://app.coques.com.ar/api/auth/callback/google
```

### Checklist de Verificación

- [ ] `NEXTAUTH_URL` en Vercel NO tiene `www.`
- [ ] `NEXTAUTH_URL` NO tiene barra al final `/`
- [ ] `NEXTAUTH_URL` usa `https://` (no `http://`)
- [ ] Redirect URI en Google Console termina en `/api/auth/callback/google`
- [ ] Redirect URI coincide EXACTAMENTE con `NEXTAUTH_URL + /api/auth/callback/google`
- [ ] Esperaste 5-10 minutos después de cambios en Google Console
- [ ] Hiciste **Redeploy** en Vercel después de cambiar variables

### Solución Rápida

**Si tu dominio es `https://app.coques.com.ar`:**

1. **Google Cloud Console:**
   - Ir a: https://console.cloud.google.com/apis/credentials
   - Editar OAuth Client ID
   - Authorized redirect URIs:
     ```
     https://app.coques.com.ar/api/auth/callback/google
     ```
   - Guardar y esperar 5 minutos

2. **Vercel:**
   - Settings > Environment Variables
   - `NEXTAUTH_URL` = `https://app.coques.com.ar`
   - Guardar y hacer **Redeploy**

3. **Testing:**
   - Limpiar cookies del navegador
   - Intentar login con Google nuevamente

---

## 🟢 Problema 2: Validación de Teléfono (YA SOLUCIONADO)

### Cambios Implementados

#### 1. Validación Estricta en Frontend
**Archivo:** [`src/components/CompletePhoneModal.tsx`](./src/components/CompletePhoneModal.tsx)

✅ Valida formato antes de enviar al backend  
✅ Rechaza números incompletos (11, 5411, 54911)  
✅ Acepta formatos: 1112345678, 1512345678, +5491112345678  
✅ Mensajes de error claros  

#### 2. Logging Mejorado en Backend
**Archivo:** [`src/app/api/auth/complete-phone/route.ts`](./src/app/api/auth/complete-phone/route.ts)

✅ Logs detallados para debugging  
✅ Mensajes de error descriptivos  
✅ Verificación de estado del cliente  

#### 3. Actualización Automática de Sesión JWT
**Archivo:** [`src/lib/auth-options.ts`](./src/lib/auth-options.ts)

✅ Detecta teléfonos temporales automáticamente  
✅ Consulta DB y actualiza token sin intervención manual  
✅ Hard redirect fuerza regeneración de sesión  

### Flujo Corregido

```
1. Usuario completa teléfono válido (1112345678) ✅
2. Frontend valida formato ✅
3. Backend normaliza y guarda en DB (estado: ACTIVO) ✅
4. Hard redirect a /pass ✅
5. NextAuth detecta teléfono temporal → consulta DB ✅
6. Token se actualiza con needsPhone: false ✅
7. Usuario ve su Pass normalmente ✅
```

---

## 🚀 Plan de Acción

### Paso 1: Solucionar OAuth (URGENTE)

1. **Verificar dominio exacto en producción**
   - ¿Es `app.coques.com.ar`?
   - ¿Es `fidelizacion-zona.vercel.app`?
   - ¿Otro?

2. **Corregir URLs en Google Console**
   - Redirect URI debe coincidir con dominio
   - Sin `www`, sin barra al final

3. **Corregir NEXTAUTH_URL en Vercel**
   - Debe coincidir con dominio exacto
   - Redeploy después del cambio

4. **Testing**
   - Limpiar cookies
   - Intentar login con Google
   - Revisar logs en Vercel

### Paso 2: Verificar Validación de Teléfono

Una vez que el OAuth funcione:

1. **Login con Google exitoso** ✅
2. **Modal de teléfono aparece** ✅
3. **Probar números inválidos:**
   - `11` → debe rechazar
   - `5411` → debe rechazar
   - `54911` → debe rechazar
4. **Ingresar número válido:**
   - `1112345678` → debe aceptar
5. **Verificar estado en admin:**
   - Estado: ACTIVO
   - Teléfono: 1112345678 (sin TEMP)

---

## 📊 Archivos Modificados

### Código Fuente

1. **[`src/components/CompletePhoneModal.tsx`](./src/components/CompletePhoneModal.tsx)**
   - ✅ Validación de formato de teléfono
   - ✅ Hard redirect con `window.location.href`
   - ✅ Mensajes de error mejorados

2. **[`src/app/api/auth/complete-phone/route.ts`](./src/app/api/auth/complete-phone/route.ts)**
   - ✅ Logging detallado
   - ✅ Validación y normalización
   - ✅ Manejo de errores descriptivo

3. **[`src/lib/auth-options.ts`](./src/lib/auth-options.ts)**
   - ✅ Callback JWT actualizado
   - ✅ Detección automática de teléfonos temporales
   - ✅ Consulta DB cuando es necesario

### Documentación

4. **[`SOLUCION-ERROR-GOOGLE-OAUTH-INVALID-GRANT.md`](./SOLUCION-ERROR-GOOGLE-OAUTH-INVALID-GRANT.md)**
   - 🆕 Guía completa de troubleshooting OAuth
   - 🆕 Checklist de verificación
   - 🆕 Soluciones paso a paso

5. **[`SOLUCION-REGISTRO-GOOGLE-TELEFONO.md`](./SOLUCION-REGISTRO-GOOGLE-TELEFONO.md)**
   - 🆕 Documentación de solución de teléfono
   - 🆕 Casos de prueba
   - 🆕 Instrucciones de debugging

6. **[`RESUMEN-SOLUCION-GOOGLE-OAUTH-COMPLETA.md`](./RESUMEN-SOLUCION-GOOGLE-OAUTH-COMPLETA.md)**
   - 🆕 Este documento (resumen ejecutivo)

---

## 🔍 Debugging

### Ver Logs en Tiempo Real

```bash
# Desde terminal local
vercel logs --follow

# Buscar estos patrones:
# - "OAUTH_CALLBACK_ERROR"
# - "invalid_grant"
# - "COMPLETE-PHONE"
# - "AUTH-JWT"
```

### Verificar Variables de Entorno

```bash
# Descargar variables de producción
vercel env pull .env.production

# Ver contenido
cat .env.production | grep -E "NEXTAUTH|GOOGLE"
```

### Test Manual de OAuth URL

Construir URL de prueba:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=TU-CLIENT-ID.apps.googleusercontent.com
  &redirect_uri=https://TU-DOMINIO/api/auth/callback/google
  &response_type=code
  &scope=openid%20email%20profile
```

Si Google muestra error inmediatamente → Error en Google Console  
Si Google muestra pantalla de login → Error en NextAuth/cookies

---

## ✅ Resultado Esperado

Una vez solucionado el OAuth:

1. ✅ **Cliente puede hacer login con Google**
2. ✅ **Modal de teléfono solo acepta números válidos**
3. ✅ **Sesión se actualiza automáticamente**
4. ✅ **Cliente completa registro exitosamente**
5. ✅ **Sin loops ni errores**

---

## 📞 Próximos Pasos

### Información Necesaria para Ayudarte

Por favor compartir:

1. **Dominio exacto de producción:** `https://___________`
2. **Valor de NEXTAUTH_URL en Vercel:** (copiar de Environment Variables)
3. **Redirect URI en Google Console:** (copiar de Credentials)
4. **Screenshot** del error en navegador (si es visible para el usuario)
5. **Últimos logs de Vercel** con el error `invalid_grant`

Con esta información puedo identificar exactamente dónde está el problema de configuración.

---

**Última actualización:** 2026-03-05  
**Prioridad:** 🔴 CRÍTICA (Bloquea todo el login con Google)  
**Estado:** ⏳ Esperando configuración de URLs
