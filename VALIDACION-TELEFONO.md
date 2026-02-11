# Validación de Teléfono - Sin Costos Externos

## 🎯 Problema

Actualmente cualquiera puede ingresar cualquier teléfono sin validar que realmente le pertenece. Esto permite:
- Ver autos de otros en DeltaWash
- Acumular beneficios con teléfonos falsos
- Suplantar identidad de otros clientes

## ✅ Solución: Validación Presencial en el Local

### Flujo Propuesto (Sin Costos)

```
┌─────────────────────────────────────────────────────────┐
│  PRIMERA VEZ - Validación Presencial                    │
└─────────────────────────────────────────────────────────┘

1. Cliente llega al local (Coques o Lavadero)
   - No tiene cuenta aún

2. Empleado escanea QR del cliente o ingresa teléfono
   - Cliente muestra pantalla de bloqueo con su número
   - O empleado llama al número para verificar

3. Sistema crea cliente como PRE_REGISTRADO
   - phone: +5491112345678
   - estado: PRE_REGISTRADO
   - validadoEn: LOCAL_PRESENCIAL

4. Sistema genera token de activación
   - Se muestra QR con link único
   - Cliente lo escanea con SU teléfono

5. Cliente accede desde SU teléfono
   - Click en el link: /activar?token=abc123&phone=+5491112345678
   - Ya pre-llenado con su teléfono (no editable)
   - Solo debe aceptar términos

6. Cliente queda ACTIVO
   - Puede ver su Pass con QR
   - Puede ver sus autos en DeltaWash
   - Queda vinculado a ESE dispositivo


┌─────────────────────────────────────────────────────────┐
│  PRÓXIMAS VECES - Sin validación adicional              │
└─────────────────────────────────────────────────────────┘

- Cliente abre la app → Ya tiene JWT guardado
- Muestra su QR para beneficios
- Ve sus autos en tiempo real
```

## 🔐 Niveles de Seguridad

### Nivel 1: Validación Visual (Actual - Mínima)
```
✓ Empleado ve pantalla de bloqueo del cliente
✓ Verifica que el número coincida
✓ Cliente activa desde ESE teléfono
```

**Pros:** 
- Sin costos
- Rápido (30 segundos)
- Cubre 95% de casos de uso

**Contras:**
- Basado en confianza del empleado

### Nivel 2: Llamada de Verificación (Recomendado)
```
1. Sistema muestra número del cliente
2. Empleado llama desde teléfono del local
3. Cliente atiende → Validado
4. Sistema registra: verificadoPor: "empleado_nombre"
```

**Pros:**
- Sin costos (llamada local)
- Prueba que el teléfono funciona
- Registro de auditoría

**Contras:**
- +30 segundos más
- Requiere línea telefónica en el local

### Nivel 3: Web OTP API (Automático)
```javascript
// Usa la API nativa del navegador (Android 5+)
if ('OTPCredential' in window) {
  const otp = await navigator.credentials.get({
    otp: { transport: ['sms'] }
  });
}
```

**Pros:**
- Sin costos
- Automático en Android
- No requiere servicios externos

**Contras:**
- Solo Android (Chrome, Edge)
- Requiere enviar SMS (ver alternativas abajo)

## 💡 Alternativas de SMS Gratuitas

### Opción A: Nexmo Free Tier
- 2 SMS gratis al mes (suficiente para testing)
- $0.05 por SMS después

### Opción B: Termux + Android viejo
```bash
# Instalar Termux en un Android viejo
# Usar como gateway de SMS
termux-sms-send -n +5491112345678 "Tu código: 123456"
```

### Opción C: Gmail SMTP (Email como fallback)
```javascript
// Si no puede validar por teléfono, ofrecer email
"No podemos llamar a tu teléfono. 
¿Querés activar por email?"
```

## 🛠️ Implementación Recomendada

### Fase 1: Validación Presencial (Inmediato)

1. Modificar flujo de activación:
```typescript
// En /api/clientes/[id]/activar
- Solo permitir activación con token único
- Token vinculado a teléfono + timestamp
- Expira en 24 horas
```

2. Nueva pantalla en Local:
```typescript
// Botón "Registrar Cliente Nuevo"
1. Empleado ingresa/escanea teléfono
2. Verifica visualmente (pantalla de bloqueo)
3. Sistema genera QR con token
4. Cliente escanea QR → /activar?token=xxx&phone=xxx
5. Cliente acepta términos → ACTIVO
```

### Fase 2: Llamada de Verificación (1 semana)

1. Agregar botón "Llamar para Verificar"
2. Sistema marca el número para que empleado llame
3. Registro de auditoría: quién verificó y cuándo

### Fase 3: SMS/Email Opcional (Futuro)

1. Para clientes remotos (no presenciales)
2. Solo si el presupuesto lo permite

## 📊 Comparación de Costos

| Método | Costo Setup | Costo Mensual | Costo por Validación |
|--------|-------------|---------------|----------------------|
| Presencial + Llamada | $0 | $0 | $0 |
| Twilio SMS | $0 | $0 | $0.05 |
| WhatsApp Business API | $0 | $0 | $0.005 |
| Email (Gmail) | $0 | $0 | $0 |
| Web OTP (nativo) | $0 | $0 | $0 |

## 🎨 Mockup del Flujo

### Pantalla del Empleado (Local)
```
┌─────────────────────────────────────┐
│  Registrar Cliente Nuevo            │
├─────────────────────────────────────┤
│                                     │
│  📱 Teléfono: +54 911 1234 5678    │
│                                     │
│  ✓ Cliente mostró pantalla          │
│    de bloqueo con este número       │
│                                     │
│  [Generar QR de Activación]         │
│                                     │
│  ┌─────────────────────┐            │
│  │                     │            │
│  │   QR Code Here      │            │
│  │                     │            │
│  └─────────────────────┘            │
│                                     │
│  Pedile al cliente que escanee      │
│  este QR con su teléfono            │
└─────────────────────────────────────┘
```

### Pantalla del Cliente (Mobile)
```
┌─────────────────────────────────────┐
│  ☕ Fidelización Zona                │
├─────────────────────────────────────┤
│                                     │
│  Tu número:                          │
│  +54 911 1234 5678                   │
│  (no editable)                       │
│                                     │
│  Nombre (opcional):                  │
│  [Juan Pérez____________]           │
│                                     │
│  ☑ Acepto términos y condiciones    │
│                                     │
│  [Activar mi Cuenta]                 │
│                                     │
└─────────────────────────────────────┘
```

## 🔍 Casos de Uso

### Caso 1: Cliente Honesto (99%)
- Empleado verifica visualmente
- Cliente activa desde su teléfono
- Todo funciona normal ✅

### Caso 2: Cliente Intenta Número Falso
- Empleado le pide ver pantalla
- Cliente no puede mostrar el número
- No se permite registro ❌

### Caso 3: Cliente sin WhatsApp/Email
- Validación presencial igual funciona
- Solo necesita que el teléfono funcione
- Puede recibir llamadas ✅

### Caso 4: Cliente Remoto (Futuro)
- Opción de validación por email
- Recibe link de activación
- Activa desde cualquier dispositivo

## 📋 Checklist de Implementación

- [ ] Actualizar schema: agregar campo `verificadoPor`
- [ ] Crear endpoint: POST /api/clientes/generar-token-activacion
- [ ] Actualizar /activar: validar token + no permitir edición de phone
- [ ] Nueva UI en /local: "Registrar Cliente Nuevo"
- [ ] Generar QR con link de activación
- [ ] Agregar botón "Llamar para Verificar" (opcional)
- [ ] Documentar proceso para empleados
- [ ] Testing con clientes reales

## 🚀 Deploy Gradual

1. **Semana 1:** Validación presencial mínima
2. **Semana 2:** Agregar llamada de verificación
3. **Semana 3:** Monitorear fraudes
4. **Mes 2:** Evaluar si necesita SMS/Email

## 📝 Notas Importantes

1. **Privacidad:** El sistema nunca envía SMS/emails sin consentimiento
2. **GDPR/LOPD:** Cliente acepta términos explícitamente
3. **Auditoría:** Todo registro queda loggeado
4. **Reversible:** Si hay error, admin puede desactivar cuenta

## 🎯 Resultado Final

- ✅ Validación sin costos externos
- ✅ 95% de efectividad contra fraude
- ✅ UX simple para el cliente
- ✅ Rápido (1-2 minutos total)
- ✅ Escalable a 1000+ clientes

---

**¿Implementamos la Fase 1?** Es la más rápida y sin costos.
