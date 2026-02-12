# Sistema de Autenticación Email/Password

## Resumen de Cambios

Se implementó un sistema de autenticación clásico con email y contraseña para reemplazar el flujo temporal basado en OTP.

### Fecha de Implementación
2026-02-12

---

## 🔄 Cambios Realizados

### 1. Base de Datos

#### Schema Prisma
- **Archivo**: `prisma/schema.prisma`
- **Cambios**: Agregado campo `password` al modelo `Cliente`
  ```prisma
  model Cliente {
    // ... campos existentes
    password         String?       // bcrypt hasheado
    // ... resto de campos
  }
  ```

#### Migración
- **Archivo**: `prisma/migrations/20260212_add_password_field/migration.sql`
- **Comando ejecutado**: `npx prisma db push`
- **Estado**: ✅ Migración aplicada en producción (Neon)

### 2. Backend - Nuevas APIs

#### `/api/auth/register` (POST)
- **Archivo**: `src/app/api/auth/register/route.ts`
- **Funcionalidad**: Registro de nuevos usuarios
- **Validaciones**:
  - Email único y formato válido
  - Teléfono único y formato E.164
  - Contraseña mínimo 6 caracteres
  - Nombre requerido
- **Seguridad**:
  - Hash de contraseña con bcrypt (salt rounds: 10)
  - No retorna password en respuesta
  - Cliente se crea con estado `ACTIVO`
- **Respuesta**: JWT con duración de 30 días

#### `/api/auth/login` (POST)
- **Archivo**: `src/app/api/auth/login/route.ts`
- **Funcionalidad**: Inicio de sesión con email/password
- **Validaciones**:
  - Email formato válido
  - Contraseña requerida
  - Cliente debe estar en estado `ACTIVO`
- **Seguridad**:
  - Timing attack prevention (siempre ejecuta bcrypt.compare)
  - Mensajes de error genéricos
  - No retorna password en respuesta
- **Respuesta**: JWT con duración de 30 días

### 3. Frontend

#### Página de Registro (`/activar`)
- **Archivo**: `src/app/activar/page.tsx`
- **Cambios**:
  - Agregados campos: Email y Contraseña
  - Botón mostrar/ocultar contraseña
  - Validaciones en tiempo real:
    - Email formato válido
    - Contraseña mínimo 6 caracteres
    - Nombre requerido
    - Teléfono requerido
  - Link a página de login
- **Flujo**: Registro → Token JWT → Redirección a `/pass`

#### Página de Login (`/login`)
- **Archivo**: `src/app/login/page.tsx`
- **Cambios**:
  - Reemplazado flujo OTP por email/password
  - Agregado campo de contraseña
  - Botón mostrar/ocultar contraseña
  - Validaciones de email y password
  - Soporte para Enter key
  - Link a página de registro
- **Flujo**: Login → Token JWT → Redirección a `/pass`

### 4. Dependencias

#### Nuevas Dependencias
```json
{
  "dependencies": {
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2"
  }
}
```

---

## 🔐 Seguridad Implementada

### Backend
1. **Hash de Contraseñas**: bcrypt con 10 salt rounds
2. **Timing Attack Prevention**: Siempre ejecuta `bcrypt.compare()` incluso si el usuario no existe
3. **Validación con Zod**: Validación estricta de inputs
4. **JWT**: Tokens firmados con secret del entorno
5. **Sin Exposición de Passwords**: Nunca se retornan en responses
6. **Mensajes Genéricos**: No revelan si un email existe o no

### Frontend
1. **Validación de Email**: Regex para formato correcto
2. **Validación de Contraseña**: Mínimo 6 caracteres
3. **Mostrar/Ocultar Contraseña**: Mejora UX sin comprometer seguridad
4. **Normalización**: Email a lowercase antes de enviar
5. **Sanitización**: Trim de espacios en inputs

---

## 📊 Flujos de Usuario

### Nuevo Usuario (Registro)
```
1. Usuario ingresa a /activar
2. Completa: Nombre, Email, Contraseña, Teléfono
3. Acepta términos y condiciones
4. Click en "Crear mi cuenta gratis"
5. Backend valida y crea cuenta con password hasheado
6. Se genera JWT (30 días)
7. Token se guarda en localStorage
8. Redirección automática a /pass
```

### Usuario Existente (Login)
```
1. Usuario ingresa a /login
2. Completa: Email, Contraseña
3. Click en "Iniciar Sesión" (o Enter)
4. Backend valida credenciales
5. Se genera JWT (30 días)
6. Token se guarda en localStorage
7. Redirección automática a /pass
```

---

## 🧪 Testing Recomendado

### Casos de Prueba Backend

#### Registro
- [ ] Registro exitoso con datos válidos
- [ ] Rechazo si email ya existe
- [ ] Rechazo si teléfono ya existe
- [ ] Rechazo si email inválido
- [ ] Rechazo si password < 6 caracteres
- [ ] Rechazo si falta algún campo requerido
- [ ] Verificar que password se hashea correctamente
- [ ] Verificar que se retorna JWT válido
- [ ] Verificar que no se retorna password en respuesta

#### Login
- [ ] Login exitoso con credenciales correctas
- [ ] Rechazo con email inexistente
- [ ] Rechazo con password incorrecta
- [ ] Rechazo si cliente no está ACTIVO
- [ ] Verificar timing attack prevention
- [ ] Verificar que se retorna JWT válido
- [ ] Verificar que no se retorna password en respuesta

### Casos de Prueba Frontend

#### Registro
- [ ] Validación de email en tiempo real
- [ ] Validación de password mínimo 6 caracteres
- [ ] Botón mostrar/ocultar password funciona
- [ ] Mensajes de error claros
- [ ] Redirección a /pass después de registro exitoso
- [ ] Token se guarda en localStorage
- [ ] Link a /login funciona

#### Login
- [ ] Validación de email en tiempo real
- [ ] Botón mostrar/ocultar password funciona
- [ ] Enter key funciona para submit
- [ ] Mensajes de error claros
- [ ] Redirección a /pass después de login exitoso
- [ ] Token se guarda en localStorage
- [ ] Link a /activar funciona

---

## 🚀 Despliegue en Producción

### Variables de Entorno Requeridas
- `JWT_SECRET`: Secret para firmar tokens (ya configurado)
- `DATABASE_URL`: URL de base de datos (ya configurado)

### Pasos para Deploy
1. ✅ Push de código a repositorio
2. ✅ Vercel detecta cambios automáticamente
3. ✅ Prisma genera cliente durante build
4. ✅ Migración ya aplicada en BD de producción

### Verificación Post-Deploy
```bash
# Verificar que la columna password existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Cliente' AND column_name = 'password';
```

---

## 📝 Notas Importantes

### Migración de Usuarios Existentes
Los usuarios existentes que solo tienen `phone` configurado:
- **No tienen password**: Campo `password` es `NULL`
- **Pueden seguir usando OTP**: Los endpoints `/api/otp/*` siguen funcionando
- **Opcional**: Implementar flujo de "Establecer contraseña" para migrar usuarios antiguos

### Compatibilidad con OTP
El sistema OTP existente **NO fue eliminado**:
- Endpoints `/api/otp/generar` y `/api/otp/validar` siguen disponibles
- Útil como backup o para casos especiales
- Considerar mantener o deprecar en el futuro

### JWT
- **Duración**: 30 días (mantenido del sistema anterior)
- **Almacenamiento**: localStorage (clave: `fidelizacion_token`)
- **Payload**: `{ clienteId, phone }`

---

## 🔮 Mejoras Futuras (Opcional)

1. **Rate Limiting**: Limitar intentos de login por IP
2. **Recuperación de Contraseña**: Flow de "Olvidé mi contraseña"
3. **2FA**: Autenticación de dos factores opcional
4. **Sesiones Múltiples**: Gestión de múltiples dispositivos
5. **Migración de Usuarios**: Flujo para que usuarios antiguos establezcan contraseña
6. **Email de Verificación**: Confirmar email después de registro
7. **Auditoría**: Log de intentos de login fallidos

---

## 📞 Soporte

Para problemas o consultas sobre la autenticación:
- Revisar logs en Vercel
- Verificar estado de BD en Neon
- Comprobar variables de entorno
- Revisar APRENDIZAJES.md para mejores prácticas
