# Testing Manual - Sistema de Autenticación

## Servidor de Desarrollo Activo

El servidor está corriendo en `http://localhost:3000`

---

## 📋 Checklist de Pruebas

### 1. Prueba de Registro (`/activar`)

#### Acceder a la página
```
URL: http://localhost:3000/activar
```

#### Caso 1: Registro Exitoso
**Datos de prueba:**
- Nombre: `Juan Test`
- Email: `juan.test@example.com`
- Contraseña: `test1234`
- Teléfono: `2615551234`
- ✅ Aceptar términos

**Resultado esperado:**
- ✅ Se crea la cuenta
- ✅ Se genera y guarda JWT en localStorage
- ✅ Redirección automática a `/pass`
- ✅ No se muestra password en consola/network

#### Caso 2: Email Duplicado
**Datos de prueba:**
- Usar el mismo email del Caso 1

**Resultado esperado:**
- ❌ Error: "El email ya está registrado"

#### Caso 3: Validaciones
**Probar:**
- Email inválido (sin @): `juantest.com`
- Contraseña corta: `12345`
- Campos vacíos

**Resultado esperado:**
- ❌ Mensajes de error claros

---

### 2. Prueba de Login (`/login`)

#### Acceder a la página
```
URL: http://localhost:3000/login
```

#### Caso 1: Login Exitoso
**Datos de prueba:**
- Email: `juan.test@example.com`
- Contraseña: `test1234`

**Resultado esperado:**
- ✅ Login exitoso
- ✅ Se genera y guarda JWT en localStorage
- ✅ Redirección automática a `/pass`

#### Caso 2: Credenciales Incorrectas
**Probar:**
- Email correcto + contraseña incorrecta
- Email inexistente

**Resultado esperado:**
- ❌ Error: "Email o contraseña incorrectos"
- ⏱️ Tiempo de respuesta similar en ambos casos

#### Caso 3: Funcionalidad Extra
**Probar:**
- Botón mostrar/ocultar contraseña
- Presionar Enter para submit

**Resultado esperado:**
- ✅ Funciona correctamente

---

### 3. Verificar JWT en localStorage

#### Abrir DevTools
1. Presionar `F12`
2. Ir a pestaña `Application` o `Storage`
3. Expandir `Local Storage` → `http://localhost:3000`

#### Verificar
- ✅ Existe clave `fidelizacion_token`
- ✅ Valor es un JWT (formato: `xxx.yyy.zzz`)

#### Decodificar JWT
```
Copiar el token y pegarlo en: https://jwt.io
```

**Payload esperado:**
```json
{
  "clienteId": "uuid-del-cliente",
  "phone": "+5492615551234",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

### 4. Verificar Base de Datos

#### Opción 1: Prisma Studio
```bash
cd fidelizacion-zona
npm run db:studio
```

#### Verificar en tabla Cliente:
- ✅ Existe el registro con el email usado
- ✅ Campo `password` está hasheado (empieza con `$2b$`)
- ✅ Campo `estado` es `ACTIVO`
- ✅ Campo `email` está en lowercase
- ❌ NO debe verse la contraseña en texto plano

---

### 5. Verificar Network Tab

#### En DevTools → Network
1. Hacer un registro o login
2. Buscar la request a `/api/auth/register` o `/api/auth/login`

#### Response debe contener:
```json
{
  "success": true,
  "data": {
    "cliente": {
      "id": "...",
      "email": "...",
      "nombre": "...",
      "phone": "...",
      // NO debe incluir "password"
    },
    "token": "eyJ..."
  }
}
```

#### Verificar Headers:
- ✅ `Content-Type: application/json`
- ✅ Status Code: `200 OK` (exitoso)
- ✅ Status Code: `400 Bad Request` (error de validación)
- ✅ Status Code: `401 Unauthorized` (credenciales incorrectas)

---

### 6. Pruebas de Seguridad

#### Timing Attack Prevention
1. Intentar login con email existente + password incorrecta
2. Intentar login con email inexistente + cualquier password
3. Medir tiempo de respuesta en Network tab

**Resultado esperado:**
- ⏱️ Tiempos similares (~100-500ms con bcrypt)

#### Password Hashing
1. Registrar usuario
2. Ver en BD el campo `password`

**Resultado esperado:**
- ✅ Empieza con `$2b$10$` (bcrypt con 10 rounds)
- ✅ Tiene 60 caracteres

---

## 🐛 Problemas Comunes

### Error: "Cannot read property 'password' of null"
**Causa:** Cliente no tiene password configurado (usuario antiguo)
**Solución:** Usar solo usuarios nuevos registrados con el nuevo sistema

### Error: "Module not found: bcrypt"
**Causa:** Dependencia no instalada
**Solución:** 
```bash
cd fidelizacion-zona
npm install bcrypt @types/bcrypt
```

### Error de compilación en bcrypt
**Causa:** bcrypt necesita compilación nativa en Windows
**Solución:** Reinstalar con:
```bash
npm uninstall bcrypt
npm install bcrypt --force
```

### Página en blanco
**Causa:** Error de sintaxis o compilación
**Solución:** Ver terminal donde corre `npm run dev`

---

## ✅ Resumen de Funcionalidades

- [x] Registro con email/password
- [x] Login con email/password
- [x] Hash seguro con bcrypt (10 rounds)
- [x] Validaciones frontend (email, password min 6)
- [x] Validaciones backend con Zod
- [x] Timing attack prevention
- [x] JWT con duración 30 días
- [x] Almacenamiento en localStorage
- [x] Mostrar/ocultar contraseña
- [x] Mensajes de error claros
- [x] Links entre registro y login
- [x] Enter key support en login
- [x] Redirección automática a /pass

---

## 📞 Próximos Pasos

Después de las pruebas manuales:

1. **Deploy a producción**:
   ```bash
   git add .
   git commit -m "feat: sistema de autenticación email/password"
   git push
   ```

2. **Verificar en Vercel**:
   - Build exitoso
   - Variables de entorno configuradas
   - BD migrada correctamente

3. **Pruebas en producción**:
   - Registro de usuario real
   - Login de usuario real
   - Verificar JWT persistence

4. **Opcional - Migracion de usuarios antiguos**:
   - Implementar flujo "Establecer contraseña"
   - Notificar a usuarios existentes
