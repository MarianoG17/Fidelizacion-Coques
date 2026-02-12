# Pasos Post-Deploy: Solución Error 401 en /pass

## 🔍 Problema
El error 401 Unauthorized en `/api/pass` ocurre porque tu cuenta actual no tiene el campo `otpSecret` generado. Este campo es necesario para crear el QR del Pass.

## ✅ Solución Implementada
Se modificó `/api/auth/register/route.ts` para generar automáticamente el `otpSecret` durante el registro.

---

## 📝 Pasos a Seguir (EN ORDEN)

### 1️⃣ Verificar Deploy de Vercel
- Andá a: https://vercel.com/mariano17s-projects/fidelizacion-coques/deployments
- Verificá que el último deploy (commit: "Fix: Generar otpSecret durante registro...") esté en estado **Ready**
- Si está en "Building", esperá 2-3 minutos

### 2️⃣ Limpiar Cuenta Actual en Neon
- Abrí Neon Console: https://console.neon.tech
- Andá al **SQL Editor**
- Ejecutá el script completo de `scripts/limpiar-cuentas-test.sql`:

```sql
-- Borrar eventos asociados
DELETE FROM "EventoScan" WHERE "clienteId" IN (
  SELECT id FROM "Cliente" WHERE email = 'mariano17bsas@gmail.com'
);

-- Borrar autos asociados
DELETE FROM "Auto" WHERE "clienteId" IN (
  SELECT id FROM "Cliente" WHERE email = 'mariano17bsas@gmail.com'
);

-- Borrar inscripciones asociadas
DELETE FROM "Inscripcion" WHERE "clienteId" IN (
  SELECT id FROM "Cliente" WHERE email = 'mariano17bsas@gmail.com'
);

-- Borrar noticias asociadas
DELETE FROM "Noticia" WHERE "clienteId" IN (
  SELECT id FROM "Cliente" WHERE email = 'mariano17bsas@gmail.com'
);

-- Finalmente borrar el cliente
DELETE FROM "Cliente" WHERE email = 'mariano17bsas@gmail.com';

-- Verificar que se borró
SELECT * FROM "Cliente" WHERE email = 'mariano17bsas@gmail.com';
```

✅ **Resultado esperado**: La última query debe retornar 0 filas

### 3️⃣ Limpiar LocalStorage del Navegador
En la página de tu app (https://fidelizacion-coques-813u.vercel.app):

**Opción A - Usando DevTools:**
1. Abrí DevTools (F12)
2. Andá a pestaña **Application** → **Local Storage**
3. Buscá `fidelizacion_token` y borrala

**Opción B - Usando Consola:**
1. Abrí DevTools (F12)
2. Andá a pestaña **Console**
3. Ejecutá: `localStorage.clear()`

### 4️⃣ Registrarte Nuevamente
1. Andá a: https://fidelizacion-coques-813u.vercel.app/activar
2. Completá el formulario:
   - **Nombre**: Mariano (o el que prefieras)
   - **Email**: mariano17bsas@gmail.com
   - **Contraseña**: (tu contraseña)
   - **Teléfono**: 1166004684 (o el que uses)
   - ✅ Aceptá los términos
3. Click en **"Registrarse"**

### 5️⃣ Verificar que Funcione
- Deberías ser redirigido automáticamente a `/pass`
- Deberías ver tu Pass con:
  - ✅ Tu nombre
  - ✅ Nivel (probablemente "Bronce")
  - ✅ QR code funcionando
  - ✅ Sin errores 401

---

## 🔧 Si el Error Persiste

### Verificar en Neon que el otpSecret se creó:
```sql
SELECT 
  email, 
  nombre,
  CASE 
    WHEN "otpSecret" IS NOT NULL THEN 'OTP SECRET CREADO ✓'
    ELSE 'FALTA OTP SECRET ✗'
  END as estado_otp
FROM "Cliente" 
WHERE email = 'mariano17bsas@gmail.com';
```

### Verificar en DevTools que el token se guardó:
1. Abrí DevTools (F12)
2. Application → Local Storage
3. Buscá la key `fidelizacion_token`
4. Debe existir y tener un valor largo (JWT token)

### Logs del servidor:
- Revisá los logs de Vercel para ver si hay errores en el registro
- Andá a: https://vercel.com/mariano17s-projects/fidelizacion-coques/logs

---

## 🎯 Por Qué Es Necesario

1. **Tu cuenta actual** fue creada con código viejo que **no generaba** `otpSecret`
2. La ruta `/api/pass` **valida** que exista `otpSecret`:
   ```typescript
   if (!cliente?.otpSecret) return unauthorized('Cliente no activo')
   ```
3. **Sin** `otpSecret` → **No se puede generar el QR** → Error 401
4. El **nuevo código** genera `otpSecret` automáticamente en el registro
5. Por eso necesitás **borrar** la cuenta vieja y **crear** una nueva

---

## 📊 Cambios en el Código

### Archivo: `src/app/api/auth/register/route.ts`

**Antes:**
```typescript
const cliente = await prisma.cliente.create({
  data: {
    email: validatedData.email,
    password: hashedPassword,
    nombre: validatedData.nombre,
    phone: validatedData.phone,
    estado: 'ACTIVO',
    fuenteOrigen: 'AUTOREGISTRO',
    consentimientoAt: new Date(),
    // ❌ No se generaba otpSecret
  },
})
```

**Ahora:**
```typescript
const otpSecret = generarSecretoOTP() // ✅ Se genera el secret

const cliente = await prisma.cliente.create({
  data: {
    email: validatedData.email,
    password: hashedPassword,
    nombre: validatedData.nombre,
    phone: validatedData.phone,
    estado: 'ACTIVO',
    fuenteOrigen: 'AUTOREGISTRO',
    consentimientoAt: new Date(),
    otpSecret, // ✅ Se guarda en la DB
  },
})
```

---

## 📞 Necesitás Ayuda?

Si después de seguir todos estos pasos seguís teniendo problemas:

1. Compartí una captura de pantalla de:
   - El resultado de la query de verificación en Neon
   - Los errores en la consola del navegador
   - Los logs de Vercel

2. Verificá que el deploy realmente haya terminado (a veces tarda unos minutos)
