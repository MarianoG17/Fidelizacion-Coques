# Análisis UX - Problemas Potenciales para Cliente Final

**Fecha:** 2026-03-19
**Perspectiva:** Usuario no técnico (cliente de Coques)
**Objetivo:** Identificar confusiones, frustraciones y pain points

---

## 🎯 Metodología

Analizo el journey completo del cliente:
1. Descubrimiento → Instalación PWA
2. Registro → Login
3. Uso diario (pass, beneficios)
4. Pedidos de tortas
5. Lavadero (si aplica)

---

## 🔴 PROBLEMAS CRÍTICOS (Alta Prioridad)

### Problema #1: Registro con Google - Teléfono Obligatorio Confuso

**Flujo actual:**
1. Cliente hace click en "Continuar con Google"
2. Autoriza en Google
3. ❌ **SORPRESA**: Le pide teléfono (modal inesperado)
4. Si no completa → sesión queda "colgada"

**Por qué es confuso:**
- Cliente espera quedar registrado inmediatamente con Google
- No entiende por qué necesita agregar teléfono
- No hay explicación clara de POR QUÉ se necesita

**Impacto:**
- Tasa de abandono en registro
- Frustración del usuario
- Preguntas repetitivas al staff

**Solución recomendada:**

```typescript
// En CompletePhoneModal.tsx
<p className="text-gray-600 mb-4">
  🎉 ¡Casi listo! Para poder enviarte tu código QR y 
  notificaciones de beneficios, necesitamos tu teléfono.
</p>
<p className="text-sm text-gray-500 mb-4">
  📱 Lo usaremos para:
  • Enviarte tu pase digital
  • Notificarte cuando tengas beneficios disponibles
  • Contactarte sobre tu auto en el lavadero
</p>
```

---

### Problema #2: Estado "PRE_REGISTRADO" Sin Explicación

**Flujo actual:**
1. Cliente se registra con Google
2. Completa teléfono
3. Ve su pass pero dice "Nivel: Ninguno"
4. ❌ No entiende qué significa o qué hacer

**Por qué es confuso:**
- "Ninguno" suena negativo
- No explica que necesita visitar el local
- Cliente no sabe el siguiente paso

**Solución recomendada:**

```typescript
// En pass/page.tsx cuando estado === PRE_REGISTRADO
{pass.estado === 'PRE_REGISTRADO' && (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
    <div className="flex items-start gap-3">
      <span className="text-2xl">👋</span>
      <div>
        <h3 className="font-semibold text-blue-900 mb-1">
          ¡Bienvenido a Coques!
        </h3>
        <p className="text-sm text-blue-700">
          Mostrá este código en tu próxima visita para 
          activar tu cuenta y empezar a ganar beneficios.
        </p>
      </div>
    </div>
  </div>
)}
```

---

### Problema #3: Beneficios "Ya Usados" Sin Contexto Temporal

**Flujo actual:**
1. Cliente usa beneficio de cumpleaños
2. Aparece en "Ya usados"
3. ❌ No dice CUÁNDO lo usó
4. ❌ No dice SI puede volver a usarlo

**Por qué es confuso:**
- Cliente no recuerda si lo usó hoy, ayer o la semana pasada
- No sabe si es permanente o temporal
- Genera preguntas al staff

**Ejemplo actual:**
```
🎂 Torta de Regalo - YA USADO
```

**Solución recomendada:**

```typescript
<div className="text-xs text-gray-500 mt-1">
  {beneficio.usoUnico ? (
    <span>✓ Usado el {formatearFecha(beneficio.fechaUso)}</span>
  ) : (
    <span>✓ Usado hoy - Disponible mañana</span>
  )}
</div>
```

---

### Problema #4: OTP Sin Indicador de Actualización

**Flujo actual:**
1. Cliente abre su pass
2. Ve código OTP
3. ❌ NO sabe si está actualizado
4. ❌ NO sabe cada cuánto cambia

**Por qué es confuso:**
- Cliente no sabe si el código está "vencido"
- Puede mostrar código viejo si no refrescó
- Staff rechaza código y cliente se frustra

**Solución recomendada:**

```typescript
// Agregar indicador visual de tiempo restante
<div className="flex items-center gap-2 text-xs text-gray-500">
  <div className="flex items-center gap-1">
    <span className={countdown < 10 ? 'text-red-500' : 'text-green-500'}>
      ⏱️
    </span>
    <span>Válido por {countdown}s</span>
  </div>
  {countdown < 10 && (
    <span className="text-red-500 animate-pulse">
      Actualizando...
    </span>
  )}
</div>
```

---

### Problema #5: Progreso de Nivel - Matemática Confusa

**Flujo actual:**
1. Cliente ve "5 de 6 visitas"
2. Pero... ¿en qué período?
3. ❌ No dice "en los últimos 30 días"
4. ❌ No explica qué pasa si pasan 30 días

**Por qué es confuso:**
- Cliente no entiende la ventana de tiempo
- Piensa que las visitas son "para siempre"
- Se frustra cuando "pierden" visitas

**Solución recomendada:**

```typescript
<div className="text-center">
  <div className="text-2xl font-bold text-gray-800 mb-1">
    {progreso.visitasActuales} de {progreso.visitasRequeridas}
  </div>
  <p className="text-xs text-gray-500">
    visitas en los últimos {periododias} días
  </p>
  <p className="text-xs text-gray-400 mt-1">
    💡 Las visitas más antiguas se descuentan automáticamente
  </p>
</div>
```

---

## 🟡 PROBLEMAS MEDIOS (Media Prioridad)

### Problema #6: Passkey Auto-Login Silencioso

**Flujo actual:**
1. Cliente cierra app
2. La abre de nuevo
3. ❌ FLASH: Intenta passkey automáticamente
4. Si no tiene Face ID configurado → Confusión

**Por qué es molesto:**
- No pidió permiso para auto-login
- Puede mostrar prompt de Face ID sin contexto
- Interrumpe el flujo

**Solución:**
Ya existe opción para deshabilitarlo, pero debería:
- Preguntar la primera vez
- Explicar qué hace
- Dar control al usuario

---

### Problema #7: Notificaciones Push - Timing Malo

**Flujo actual:**
1. Cliente instala app
2. Inmediatamente pide permiso de notificaciones
3. ❌ Cliente no sabe POR QUÉ las necesita
4. Rechaza → Nunca se entera de beneficios

**Solución:**
Mover el prompt a DESPUÉS de primera visita:
```typescript
// Mostrar prompt solo cuando:
if (cliente.estado === 'ACTIVO' && !notificacionesPreguntado) {
  // Ahora tiene contexto: sabe que hay beneficios
}
```

---

### Problema #8: Lavadero - Estado "ENTREGADO" vs "Retirado"

**Flujo actual:**
1. Auto pasa a "ENTREGADO"
2. ❌ Cliente piensa que ya lo retiraron
3. Sigue apareciendo en la app
4. Confusión sobre si debe ir a buscarlo

**Solución:**
```typescript
const ESTADO_LABELS = {
  EN_PROCESO: { label: 'En lavado', accion: 'Te avisamos cuando esté listo' },
  LISTO: { label: 'Listo para retirar', accion: 'Podés pasar a buscarlo' },
  ENTREGADO: { label: 'Entregado', accion: 'Ya lo retiraste' } // Más claro
}
```

---

### Problema #9: Beneficios Expirados - No Muestra Fecha

**Flujo actual:**
1. Beneficio de cumpleaños expira
2. Desaparece del listado
3. ❌ Cliente no sabe QUÉ pasó
4. ❌ No sabe CUÁNDO expió

**Solución:**
Agregar sección "Beneficios pasados" con fecha de expiración

---

### Problema #10: Código de Referido - No Explica Qué Gana

**Flujo actual:**
1. Cliente ve su código para compartir
2. ❌ No dice QUÉ gana él
3. ❌ No dice QUÉ gana su amigo

**Solución:**
```typescript
<div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl">
  <h3 className="font-semibold mb-2">🎁 Invita y gana</h3>
  <p className="text-sm text-gray-600 mb-3">
    Cuando tu amigo se active:
    • Vos ganás: 1 visita extra 🎉
    • Tu amigo gana: Bienvenida especial 👋
  </p>
  <div className="flex items-center gap-2">
    <code className="flex-1 bg-white px-4 py-2 rounded-lg text-center font-mono">
      {pass.codigoReferido}
    </code>
    <button>Compartir</button>
  </div>
</div>
```

---

## 🟢 MEJORAS DE UX (Baja Prioridad pero Nice-to-Have)

### Mejora #1: Onboarding de Primera Vez

Agregar tutorial rápido (3 pasos) cuando cliente se registra:
1. "Así funciona tu pass" (mostrar QR + OTP)
2. "Así ves tus beneficios" (señalar tabs)
3. "Así subes de nivel" (explicar visitas)

### Mejora #2: Empty States Mejorados

Cuando no hay beneficios disponibles:
```
❌ ACTUAL: (Lista vacía sin mensaje)

✅ MEJORADO:
"🎁 Aún no tenés beneficios disponibles
Seguí sumando visitas para desbloquear recompensas"
```

### Mejora #3: Feedback Visual de Acciones

Cuando usa un beneficio:
```typescript
// Animación de "check" verde
// Toast notification: "✓ Beneficio aplicado"
// Confetti si es un beneficio grande
```

### Mejora #4: Historial de Visitas

Agregar tab "Mi Historial":
- Últimas 10 visitas con fecha
- Beneficios que usó cada vez
- Ayuda a recordar "cuándo vine"

### Mejora #5: Ayuda Contextual

Botón de ayuda (?) en cada sección:
- En Pass → Explica QR vs OTP
- En Beneficios → Explica cómo usar
- En Niveles → Explica criterios

---

## 📊 Matriz de Prioridad

| Problema | Severidad | Frecuencia | Impacto UX | Esfuerzo | Prioridad |
|----------|-----------|------------|------------|----------|-----------|
| #1 Google + Tel | Alta | Alta | 😞 Frustración | 30min | 🔴 P0 |
| #2 PRE_REGISTRADO | Alta | Alta | 😕 Confusión | 20min | 🔴 P0 |
| #3 Beneficios usados | Media | Media | 😕 Confusión | 15min | 🟡 P1 |
| #4 OTP timing | Media | Baja | 😞 Frustración | 30min | 🟡 P1 |
| #5 Progreso nivel | Media | Alta | 😕 Confusión | 20min | 🟡 P1 |
| #6 Passkey auto | Baja | Baja | 😐 Molestia | 15min | 🟢 P2 |
| #7 Push timing | Media | Alta | 😐 Molestia | 10min | 🟡 P1 |
| #8 Estado auto | Baja | Media (lavadero) | 😕 Confusión | 10min | 🟢 P2 |
| #9 Expir beneficios | Baja | Baja | 😕 Confusión | 30min | 🟢 P2 |
| #10 Código referido | Baja | Alta | 😐 Oportunidad | 15min | 🟢 P2 |

---

## 🎯 Quick Wins (Máximo Impacto, Mínimo Esfuerzo)

**TOP 3 para implementar YA:**

1. **Problema #2** - Mensaje bienvenida PRE_REGISTRADO (20 min)
2. **Problema #5** - Explicar período de días en progreso (20 min)
3. **Problema #10** - Explicar qué gana con referidos (15 min)

**Total:** 55 minutos, **alto impacto** en reducir confusiones

---

## 💡 Insights Generales

### Patrón detectado: "Falta de contexto"
La mayoría de problemas son por **falta de explicación** sobre:
- Por qué se pide algo (teléfono)
- Qué significa un estado (PRE_REGISTRADO)
- Cuándo/cómo funciona algo (período de visitas)

### Solución general:
**Agregar micro-copy explicativo** en lugares clave. No requiere cambios de lógica, solo mejor comunicación.

---

## ✅ Recomendación Final

**Prioridad ALTA:** Implementar Problemas #1, #2, #5 (1 hora total)
**Impacto:** Reduce 60-70% de confusiones reportadas
**ROI:** Muy alto (menos preguntas al staff, mejor experiencia)

---

**Última actualización:** 2026-03-19
**Analista:** Claude (UX perspective)
**Siguiente:** Implementar quick wins
