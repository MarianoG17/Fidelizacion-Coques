# 🔐 Autenticación Local Mejorada

## 📋 Resumen de Cambios

Se implementó un sistema de autenticación robusto con JWT para la app del local (`/local`) que incluye:

1. ✅ **Login con usuario y contraseña** (`usuario: "coques"`)
2. ✅ **Tokens JWT seguros** con expiración de 12 horas
3. ✅ **Validación de tokens** en cada carga de página
4. ✅ **Botón de logout** visible en la interfaz
5. ✅ **Redirección automática** si el token es inválido o expiró

---

## 🔧 Configuración Requerida

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env` (local y Vercel):

```env
# Contraseña para el usuario "coques" en /local/login
COQUES_LOCAL_PASSWORD="tu_contraseña_segura_aqui"

# JWT Secret para firmar tokens (opcional pero recomendado)
JWT_SECRET_LOCAL="tu_jwt_secret_64_caracteres"
```

### 2. Generar JWT Secret (Opcional pero recomendado)

En producción, es recomendable usar un secret único:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y úsalo como `JWT_SECRET_LOCAL`.

---

## 🚀 Cómo Funciona

### Flujo de Autenticación

```
1. Usuario accede a /local
   ↓
2. Redirige a /local/login (si no hay token o es inválido)
   ↓
3. Ingresa: usuario "coques" + contraseña
   ↓
4. POST /api/auth/local/login
   ↓
5. Servidor valida credenciales y genera JWT
   ↓
6. Token se guarda en localStorage
   ↓
7. Redirige a /local (app del local)
   ↓
8. Token se verifica en cada carga (POST /api/auth/local/verify)
   ↓
9. Si token es válido → Acceso permitido
   Si token es inválido/expirado → Redirige al login
```

### Cerrar Sesión

El botón "🚪 Salir" (arriba a la derecha):
- Elimina el token de localStorage
- Redirige al login
- El usuario debe volver a ingresar credenciales

---

## 📁 Archivos Modificados/Creados

### Nuevos
- [`/src/app/api/auth/local/verify/route.ts`](src/app/api/auth/local/verify/route.ts) - Endpoint para validar tokens JWT

### Modificados
- [`/src/app/api/auth/local/login/route.ts`](src/app/api/auth/local/login/route.ts) - Ahora usa JWT en lugar de hash simple
- [`/src/app/local/page.tsx`](src/app/local/page.tsx) - Valida token al cargar + botón logout
- [`/src/app/local/login/page.tsx`](src/app/local/login/page.tsx) - Ya existía, sin cambios
- [`.env.example`](.env.example) - Agregada variable `JWT_SECRET_LOCAL`
- [`VARIABLES-ENTORNO-EXPLICADAS.md`](VARIABLES-ENTORNO-EXPLICADAS.md) - Documentación actualizada

---

## 🧪 Testing

### 1. Probar Login

```bash
# Desde la terminal (reemplaza la URL y contraseña)
curl -X POST http://localhost:3000/api/auth/local/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"coques","password":"tu_contraseña"}'

# Respuesta esperada (OK):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": "coques"
}

# Respuesta esperada (Error):
{
  "error": "Usuario o contraseña incorrectos"
}
```

### 2. Probar Validación de Token

```bash
# Reemplaza <TOKEN> con el token del paso anterior
curl -X POST http://localhost:3000/api/auth/local/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN>"}'

# Respuesta esperada (OK):
{
  "valid": true,
  "usuario": "coques"
}

# Respuesta esperada (Error):
{
  "valid": false,
  "error": "Token expirado o inválido"
}
```

### 3. Probar UI

1. **Acceder sin login:**
   - Ve a `http://localhost:3000/local`
   - Debería redirigir a `/local/login`

2. **Login exitoso:**
   - Ingresa usuario: `coques`
   - Ingresa la contraseña configurada en `.env`
   - Debería redirigir a `/local` y mostrar la app

3. **Logout:**
   - Click en botón "🚪 Salir" (arriba derecha)
   - Debería redirigir al login

4. **Token expirado:**
   - Espera 12 horas (o modifica el código a `expiresIn: '10s'` para testing)
   - Recarga `/local`
   - Debería redirigir al login automáticamente

---

## 🔒 Seguridad

### ✅ Implementado
- ✅ Tokens JWT firmados con secret
- ✅ Expiración de tokens (12 horas)
- ✅ Validación de tokens en cada carga
- ✅ Redirección automática si token inválido
- ✅ Contraseña almacenada como variable de entorno
- ✅ Logout que elimina token del navegador

### 🔐 Recomendaciones Adicionales

1. **Diferentes contraseñas para dev/prod:**
   ```env
   # .env.local (desarrollo)
   COQUES_LOCAL_PASSWORD="dev_password_123"
   
   # Vercel (producción)
   COQUES_LOCAL_PASSWORD="prod_secure_password_xyz"
   ```

2. **JWT Secret único en producción:**
   - No uses el valor por defecto
   - Genera uno con `crypto.randomBytes(32).toString('hex')`

3. **HTTPS en producción:**
   - Vercel lo maneja automáticamente
   - Los tokens solo se transmiten por HTTPS

4. **Rotación de credenciales:**
   - Cambia `COQUES_LOCAL_PASSWORD` periódicamente
   - Actualiza en Vercel: Settings > Environment Variables

---

## 🐛 Troubleshooting

### "Token expirado o inválido" al recargar

**Causa:** El token JWT expiró (después de 12 horas)  
**Solución:** Vuelve a iniciar sesión con usuario y contraseña

### "Configuración de autenticación incompleta"

**Causa:** Falta la variable `COQUES_LOCAL_PASSWORD` en `.env`  
**Solución:** 
```bash
# En .env
COQUES_LOCAL_PASSWORD="tu_contraseña_aqui"
```

### Redirige al login incluso con credenciales correctas

**Causa:** Posible error de red o localStorage deshabilitado  
**Solución:** 
1. Abre DevTools > Console
2. Busca errores de red
3. Verifica que localStorage funcione: `localStorage.setItem('test', '1')`

### Token no se valida correctamente

**Causa:** JWT Secret diferente entre login y verify  
**Solución:** Asegurate que `JWT_SECRET_LOCAL` sea la misma en ambos archivos

---

## 📊 Comparación: Antes vs Ahora

| Característica | Antes | Ahora |
|---|---|---|
| **Autenticación** | Solo verificaba existencia de token | Valida token JWT con servidor |
| **Seguridad del token** | Hash simple | JWT firmado con secret |
| **Expiración** | Nunca expiraba | 12 horas |
| **Logout** | ❌ No existía | ✅ Botón visible |
| **Validación** | Solo en cliente | Cliente + Servidor |
| **Credenciales** | Hardcodeadas | Variable de entorno |

---

## 🎯 Próximos Pasos (Opcionales)

1. **Multi-usuario:** Crear tabla de empleados en DB con diferentes roles
2. **Refresh tokens:** Tokens de larga duración + refresh automático
3. **Log de accesos:** Registrar quién y cuándo accede a `/local`
4. **2FA:** Autenticación de dos factores con código SMS
5. **Permisos granulares:** Diferentes permisos por empleado (solo lectura, edición, etc.)

---

## ✅ Checklist de Configuración

- [ ] `COQUES_LOCAL_PASSWORD` configurada en `.env` local
- [ ] `JWT_SECRET_LOCAL` generada y configurada (opcional)
- [ ] Variables configuradas en Vercel (producción)
- [ ] Probado login exitoso
- [ ] Probado login con credenciales incorrectas
- [ ] Probado logout
- [ ] Probado acceso a `/local` sin token (redirige a login)
- [ ] Documentación revisada por el equipo

---

**Documentación creada:** 2026-02-23  
**Última actualización:** 2026-02-23
