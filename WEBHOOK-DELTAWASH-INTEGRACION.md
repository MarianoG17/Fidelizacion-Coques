# 🔗 Webhook DeltaWash → Fidelización Coques

## 📋 Propósito

Sincronización **inmediata y automática** cuando DeltaWash registra o actualiza el estado de un auto.

**Ventajas vs Cron:**
- ✅ **Gratis** (no requiere plan Pro de Vercel)
- ✅ **Inmediato** (beneficio se activa al instante)
- ✅ **Eficiente** (solo se ejecuta cuando hay cambios reales)
- ✅ **Simple** (una llamada HTTP desde DeltaWash)

---

## 🏗️ Arquitectura

```
DeltaWash (Backend)
  ↓ Empleado registra auto
  ↓ Estado: "en proceso"
  ↓
  ↓ fetch() → POST /api/webhook/deltawash
  ↓
Fidelización Coques (Vercel)
  ↓ Recibe webhook
  ↓ Valida autenticación
  ↓ Crea/actualiza EstadoAuto
  ↓ Dispara beneficios si aplica
  ↓ Retorna confirmación
  ↓
Cliente ve beneficio inmediatamente en app
```

---

## 🔐 Configuración

### 1. Variable de Entorno (OBLIGATORIO)

**Generar secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Agregar en Vercel:**
1. Dashboard → Settings → Environment Variables
2. Name: `DELTAWASH_WEBHOOK_SECRET`
3. Value: (el secret generado)
4. Apply to: Production, Preview, Development

**Agregar también en DeltaWash** (como variable de entorno del sistema)

---

## 💻 Integración en DeltaWash

### Código a Agregar en DeltaWash

**Ubicación:** Donde se registra/actualiza el estado de un auto

```javascript
// Ejemplo: Después de guardar el auto en la BD de DeltaWash
async function notificarFidelizacion(cliente, auto, estado) {
  try {
    const response = await fetch('https://tu-app.vercel.app/api/webhook/deltawash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DELTAWASH_WEBHOOK_SECRET}`
      },
      body: JSON.stringify({
        phone: cliente.phone,      // Formato: +5491112345678
        patente: auto.patente,      // Ejemplo: "ABC123" o "AB123CD"
        estado: estado,             // "en proceso", "listo" o "entregado"
        marca: auto.marca,          // Opcional
        modelo: auto.modelo,        // Opcional
        notas: auto.notas           // Opcional
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Fidelización notificada:', result.mensaje);
      if (result.beneficiosActivados?.length > 0) {
        console.log('🎁 Beneficios activados:', result.beneficiosActivados);
      }
    } else {
      console.warn('⚠️ Cliente no registrado en Fidelización:', result.message);
    }
  } catch (error) {
    console.error('❌ Error notificando Fidelización:', error);
    // No fallar el proceso principal si el webhook falla
  }
}

// Ejemplo de uso:
// Cuando se registra un auto:
await guardarAutoEnBD(cliente, auto, 'en proceso');
await notificarFidelizacion(cliente, auto, 'en proceso');

// Cuando se actualiza el estado:
await actualizarEstadoEnBD(auto.id, 'listo');
await notificarFidelizacion(cliente, auto, 'listo');

// Cuando se entrega:
await actualizarEstadoEnBD(auto.id, 'entregado');
await notificarFidelizacion(cliente, auto, 'entregado');
```

---

## 🧪 Testing

### 1. Verificar que el Webhook Está Activo

```bash
curl https://tu-app.vercel.app/api/webhook/deltawash
```

**Respuesta esperada:**
```json
{
  "status": "active",
  "endpoint": "/api/webhook/deltawash",
  "method": "POST",
  ...
}
```

### 2. Probar el Webhook Manualmente

```bash
curl -X POST https://tu-app.vercel.app/api/webhook/deltawash \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_WEBHOOK_SECRET" \
  -d '{
    "phone": "+5491112345678",
    "patente": "ABC123",
    "estado": "en proceso",
    "marca": "Toyota",
    "modelo": "Corolla"
  }'
```

**Respuesta esperada (cliente registrado):**
```json
{
  "success": true,
  "mensaje": "Estado sincronizado correctamente",
  "cliente": {
    "nombre": "Juan Pérez",
    "phone": "+5491112345678",
    "nivel": "Plata"
  },
  "auto": {
    "patente": "ABC123",
    "estado": "EN_PROCESO"
  },
  "beneficiosActivados": [
    {
      "id": "beneficio-20porciento-lavadero",
      "nombre": "20% descuento — Auto en lavadero",
      "descripcion": "DESCUENTO 20% LAVADERO..."
    }
  ]
}
```

**Respuesta esperada (cliente NO registrado):**
```json
{
  "success": false,
  "message": "Cliente no registrado en sistema de fidelización",
  "accion": "Invitar al cliente a descargar la app de Coques"
}
```

### 3. Verificar en Base de Datos

```sql
-- Ver el auto sincronizado
SELECT 
  c.nombre,
  c.phone,
  a.patente,
  ea.estado,
  ea."updatedAt"
FROM "EstadoAuto" ea
JOIN "Auto" a ON a.id = ea."autoId"
JOIN "Cliente" c ON c.id = a."clienteId"
WHERE a.patente = 'ABC123';
```

---

## 📊 Payload del Webhook

### Campos Requeridos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `phone` | string | Teléfono E.164 | `"+5491112345678"` |
| `patente` | string | Patente del auto | `"ABC123"` o `"AB123CD"` |
| `estado` | string | Estado actual | `"en proceso"`, `"listo"`, `"entregado"` |

### Campos Opcionales

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `marca` | string | Marca del auto | `"Toyota"` |
| `modelo` | string | Modelo del auto | `"Corolla"` |
| `notas` | string | Observaciones | `"Lavado completo + encerado"` |

---

## 🔄 Flujo Completo

### 1. Cliente Deja Auto en Lavadero

```javascript
// En DeltaWash Backend
const cliente = await buscarClientePorPhone(phone);
const auto = await registrarAuto({ patente, marca, modelo });
await cambiarEstado(auto.id, 'en proceso');

// 🔔 Notificar a Fidelización
await notificarFidelizacion(cliente, auto, 'en proceso');
```

### 2. Fidelización Recibe Webhook

```
POST /api/webhook/deltawash
  ↓
Valida Authorization header
  ↓
Busca cliente por phone en BD Fidelización
  ↓
Cliente existe? 
  → SÍ: Crea/actualiza EstadoAuto
  → NO: Retorna mensaje "no registrado"
  ↓
Estado = EN_PROCESO?
  → SÍ: Activa beneficio 20% descuento
  → NO: Solo actualiza estado
  ↓
Retorna confirmación
```

### 3. Cliente Ve Beneficio

```
App de Coques
  ↓
/pass: Muestra auto con estado "En proceso"
  ↓
Beneficio: "20% descuento — Auto en lavadero"
  ↓
Cliente va a cafetería y canjea
```

---

## 🛡️ Seguridad

### Autenticación

El webhook requiere header `Authorization`:
```
Authorization: Bearer <DELTAWASH_WEBHOOK_SECRET>
```

Sin este header → `401 Unauthorized`

### Validaciones

1. ✅ Secret correcto (DELTAWASH_WEBHOOK_SECRET)
2. ✅ Campos requeridos presentes
3. ✅ Formato de teléfono válido
4. ✅ Patente válida
5. ✅ Estado válido ("en proceso", "listo", "entregado")

### Rate Limiting

Vercel aplica rate limiting automáticamente:
- Free tier: ~100 requests/10 segundos
- Suficiente para operación normal del lavadero

---

## 🐛 Troubleshooting

### Webhook Falla con 401

**Causa:** `DELTAWASH_WEBHOOK_SECRET` incorrecta o no coincide

**Solución:**
1. Verificar que el secret sea el mismo en ambos sistemas
2. Verificar que no haya espacios extras
3. Regenerar secret si es necesario

### Cliente No Registrado

**Causa:** El cliente no tiene cuenta en app de Coques

**Solución:**
```javascript
// En DeltaWash, después del webhook:
if (result.success === false && result.message.includes('no registrado')) {
  // Mostrar mensaje al empleado:
  console.log(`
    💡 Tip: Este cliente no está registrado en Coques.
    Invitalo a descargar la app para obtener 20% de descuento!
  `);
}
```

### Webhook No Se Ejecuta

**Verificar:**
1. ¿La URL es correcta? `https://tu-app.vercel.app/api/webhook/deltawash`
2. ¿El método es POST?
3. ¿El header Authorization está presente?
4. ¿El Content-Type es application/json?

**Debug:**
```javascript
// Agregar logs en DeltaWash
console.log('Enviando webhook:', {
  url: webhookURL,
  payload: { phone, patente, estado }
});

const response = await fetch(webhookURL, options);
console.log('Respuesta webhook:', response.status, await response.text());
```

---

## 📈 Ventajas de Este Enfoque

| Característica | Cron (cada 5 min) | Webhook |
|---|---|---|
| **Costo** | $20/mes (Vercel Pro) | ✅ Gratis |
| **Velocidad** | Delay de 0-5 min | ✅ Inmediato |
| **Eficiencia** | Ejecuta siempre | ✅ Solo cuando hay cambios |
| **Complejidad** | Baja | Media (requiere integración) |
| **Confiabilidad** | Alta (Vercel) | Alta (HTTP request) |

---

## 🎯 Checklist de Implementación

### En Fidelización Coques (Vercel)

- [ ] Código del webhook commiteado
- [ ] `DELTAWASH_WEBHOOK_SECRET` configurada en Vercel
- [ ] Deploy exitoso
- [ ] Webhook probado con curl

### En DeltaWash Legacy

- [ ] `DELTAWASH_WEBHOOK_SECRET` agregada como variable de entorno
- [ ] Función `notificarFidelizacion()` implementada
- [ ] Llamada al webhook agregada en:
  - [ ] Registro de auto (estado "en proceso")
  - [ ] Actualización a "listo"
  - [ ] Actualización a "entregado"
- [ ] Probado con auto real
- [ ] Logs verificando que el webhook se ejecuta

---

## 💡 Tips de Implementación

### 1. No Fallar el Proceso Principal

```javascript
// ✅ CORRECTO: Webhook no bloquea el proceso
try {
  await notificarFidelizacion(cliente, auto, estado);
} catch (error) {
  // Solo loguear, no lanzar error
  console.error('Error webhook:', error);
}
```

### 2. Retry en Caso de Fallo

```javascript
async function notificarFidelizacionConRetry(cliente, auto, estado, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      await notificarFidelizacion(cliente, auto, estado);
      return; // Éxito
    } catch (error) {
      if (i === intentos - 1) {
        console.error('Webhook falló después de', intentos, 'intentos');
      } else {
        await sleep(1000 * (i + 1)); // Esperar 1s, 2s, 3s
      }
    }
  }
}
```

### 3. Queue para Alta Concurrencia (Opcional)

Si tenés muchos autos simultáneos, considera usar una queue:
```javascript
// Bull, BeeQueue, etc.
queue.add('notificar-fidelizacion', { cliente, auto, estado });
```

---

**Implementado:** 2026-02-24  
**Autor:** Sistema de Fidelización Coques  
**Estado:** ✅ Listo para integración
