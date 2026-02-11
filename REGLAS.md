# REGLAS DE NEGOCIO — Coques Points
# Este archivo es la fuente de verdad del programa.
# RooCode debe leerlo antes de implementar cualquier lógica de negocio.

---

## 1. IDENTIDAD DEL PROGRAMA

- **Nombre:** Coques Points
- **Negocios:** Coques (cafetería) + Lavadero (mismo dueño)
- **Filosofía:** premiar frecuencia y hábito, no gasto
- **Principio clave:** Aires = verdad económica. Coques Points = verdad relacional.
  El sistema NUNCA toca importes, ventas ni medios de pago.

---

## 2. IDENTIDAD DEL CLIENTE

- **Identificador técnico:** `client_id` (UUID) — nunca cambia, es la PK real
- **Identificador lógico:** número de celular en formato E.164 (+5491112345678)
  - Es la llave de cruce entre sistemas (Aires, Lavadero, Coques Points)
  - NO es la PK técnica
- **Activación:** siempre con consentimiento explícito. Un cliente pre-registrado
  NO acumula visitas hasta activarse.
- **Arranque:** solo clientes nuevos. No se importa base de Aires en esta fase.

---

## 3. VISITAS

### 3.1 Qué es una visita
- Se registra cuando el empleado valida el QR o OTP del cliente en Coques.
- Genera un `EventoScan` con `tipoEvento: VISITA` o `BENEFICIO_APLICADO`.
- El timestamp es **siempre server-side** en zona horaria `America/Argentina/Buenos_Aires`.

### 3.2 Límite diario
- **Máximo 1 visita por día por cliente por local.**
- Si el cliente escanea más de una vez el mismo día en el mismo local,
  el sistema registra el evento pero NO suma visita al contador de niveles.
- "Mismo día" = mismo día calendario en TZ Argentina (no ventana de 24hs).

### 3.3 Ventana de acumulación
- Las visitas se cuentan en una **ventana móvil de 30 días**.
- Una visita de hace 31 días ya no cuenta para el nivel actual.
- La ventana se recalcula en cada evaluación de nivel.

---

## 4. NIVELES

### 4.1 Tabla de niveles

| Nivel   | Orden | Visitas en 30 días | Frecuencia equivalente     |
|---------|-------|--------------------|----------------------------|
| Bronce  | 1     | 0 (entrada)        | Cualquier cliente activado |
| Plata   | 2     | 2+                 | ~1 vez cada 2 semanas      |
| Oro     | 3     | 4+                 | ~1 vez por semana          |
| Platino | 4     | 6+                 | ~2 veces por semana        |

### 4.2 Ascenso
- Se evalúa **después de cada visita registrada**.
- Si el cliente cumple los criterios de un nivel superior al actual, sube.
- El ascenso es inmediato — no hay período de espera.

### 4.3 Descenso — regla clave
- **Los niveles NO bajan automáticamente.**
- Una vez en Plata, el cliente se queda en Plata aunque no venga un mes.
- **Excepción:** inactividad de 90 días corridos sin ningún EventoScan
  → el cliente baja UN nivel (no cae al fondo de golpe).
- Esta evaluación corre en un job diario (cron).

### 4.4 Uso cruzado (Lavadero → Coques)
- Los clientes del lavadero que también usan Coques acceden a beneficios extra.
- El uso cruzado NO afecta el contador de visitas ni el nivel.
- Es una capa adicional de beneficios, no un criterio de nivel en esta fase.

---

## 5. BENEFICIOS

### 5.1 Estructura
- Los beneficios se **habilitan** desde Coques Points.
- Se **ejecutan** en Aires como ítem manual por el empleado.
- El sistema NUNCA descuenta automáticamente en caja.

### 5.2 Beneficios por nivel (estructura — valores exactos a definir por el admin)

| Nivel   | Beneficio en Coques          | Beneficio cruzado (requiere Lavadero) |
|---------|------------------------------|---------------------------------------|
| Bronce  | —                            | —                                     |
| Plata   | Descuento X% en el pedido    | Café gratis mientras lavan el auto    |
| Oro     | Descuento X% mayor + eventos | Café gratis + descuento en lavado     |
| Platino | Descuento máximo + eventos   | Café + descuento + lavado gratis c/X  |

### 5.3 Beneficio por estado del auto
- Cuando el lavadero actualiza el estado a `EN_LAVADO`, se habilita
  automáticamente el beneficio "Café gratis" en Coques para ese cliente.
- El beneficio dura mientras el estado sea `EN_LAVADO` o `EN_SECADO`.
- Al pasar a `LISTO` o `ENTREGADO`, el beneficio se desactiva.
- **Condición:** el cliente debe estar en nivel Plata o superior.

### 5.4 Límites de uso de beneficios
- Descuento en Coques: 1 vez por visita (no acumulable con otros descuentos).
- Café gratis por lavadero: 1 por visita al lavadero (no 1 por día).
- Lavado gratis: cada X visitas al lavadero (X a definir por admin).

---

## 6. EVENTOS ESPECIALES

### 6.1 Qué es un evento especial
- Actividad organizada por Coques (ej: cata de vinos, taller, degustación).
- Solo accesible para clientes de cierto nivel mínimo.
- Tiene cupo máximo de personas.
- Se crea desde el panel admin exclusivamente.

### 6.2 Inscripción
- El cliente ve el evento en la sección **Noticias** de su Pass.
- Solo puede inscribirse si su nivel actual >= nivel mínimo del evento.
- Si el cupo está completo, no puede inscribirse (lista de espera: futuro).
- La inscripción es individual, no transferible.

### 6.3 Cancelación y penalidad

**Sin penalidad:** si cancela con más de 48 horas de anticipación.
  - El cupo se libera inmediatamente.

**Con penalidad:** si cancela con menos de 48 horas de anticipación.
  - Se restan **2 visitas** del contador de los últimos 30 días.
  - El cupo se libera igualmente.
  - Si al restar visitas el cliente queda por debajo del umbral de su nivel
    actual, el nivel NO baja (los niveles no bajan por penalidad).

### 6.4 Asistencia el día del evento
- El empleado escanea el QR del cliente al ingresar al evento.
- Esto registra un `EventoScan` con `tipoEvento: ASISTENCIA_EVENTO`.
- La asistencia registrada cuenta como visita del día (aplica límite diario).
- El admin puede ver en tiempo real quién confirmó y quién efectivamente asistió.

### 6.5 Edge cases de eventos
- **Cliente baja de nivel después de inscribirse:** mantiene la inscripción,
  no se cancela automáticamente. El admin puede decidir caso a caso.
- **Cupo lleno al cancelar alguien:** el cupo se libera pero NO se notifica
  automáticamente a otros clientes en esta fase (futuro: lista de espera).
- **Evento cancelado por el local:** todos los inscriptos reciben notificación
  en su sección Noticias. No hay penalidad para nadie.

---

## 7. NOTICIAS (sistema de notificaciones)

### 7.1 Canal principal
- Sección **Noticias** dentro del Pass del cliente.
- No hay push notifications en esta fase (sin VAPID, sin permisos de browser).
- El cliente ve las novedades al abrir su Pass.

### 7.2 Qué genera una noticia
| Trigger                          | Mensaje                                              |
|----------------------------------|------------------------------------------------------|
| Ascenso de nivel                 | "¡Subiste a [Nivel]! Estos son tus nuevos beneficios"|
| Nuevo evento especial disponible | "Hay una [Cata de vinos] para tu nivel. ¡Anotate!"   |
| Beneficio de lavadero activado   | "Tu auto está en el lavadero. Café gratis en Coques" |
| Auto listo para retirar          | "Tu auto está listo para retirar"                    |
| Inscripción confirmada a evento  | "Estás anotado a [Evento]. Fecha: [fecha]"           |
| Cancelación con penalidad        | "Cancelaste [Evento]. Se descontaron 2 visitas"      |
| Evento cancelado por el local    | "[Evento] fue cancelado. Disculpá las molestias"     |

### 7.3 Estructura de una noticia
- `titulo`: string corto
- `cuerpo`: descripción opcional
- `tipo`: INFO | BENEFICIO | NIVEL | EVENTO | ADVERTENCIA
- `leida`: boolean (el cliente puede marcarla como leída)
- `accion_url`: link opcional (ej: `/eventos/[id]`)
- `created_at`: timestamp server-side

---

## 8. PANEL ADMIN

### 8.1 Quién tiene acceso
- Solo el dueño (Mariano). Una sola cuenta admin.
- Acceso desde celular también (diseño mobile-first).

### 8.2 Funciones del panel admin
- Crear / editar / cancelar eventos especiales
- Ver inscriptos a cada evento
- Ver lista de asistentes confirmados (día del evento)
- Ver clientes: nivel, visitas recientes, historial
- Configurar beneficios y sus condiciones (valores de descuento, límites)
- Ver métricas básicas: visitas por día, distribución de niveles

### 8.3 Lo que el admin NO puede hacer
- Modificar el historial de visitas (inmutable, es la verdad del sistema)
- Cambiar el nivel de un cliente manualmente (lo define el algoritmo)
- Acceder a datos de ventas o importes (eso vive en Aires)

---

## 9. APP DEL LOCAL (empleados)

### 9.1 Acceso
- URL del local en el celular del local (sin login — el dispositivo es del local).
- La autenticación es por API Key del local embebida en la URL o en el env.

### 9.2 Flujo de validación
1. Empleado abre la app
2. Cliente muestra su QR o código de 6 dígitos
3. Empleado escanea QR o ingresa el código manualmente
4. Sistema valida (server-side, ventana de 30-60 segundos)
5. Si válido: muestra nombre, nivel, beneficios activos, estado del auto
6. Empleado selecciona la mesa en el mapa visual
7. Confirma la visita → se registra el EventoScan
8. Si hay beneficio: empleado carga el ítem en Aires según lo indicado

### 9.3 Lo que el empleado ve
- Nombre del cliente y nivel (con badge de color)
- Estado del auto (si está en el lavadero)
- Beneficios activos con instrucción exacta para Aires
- Mapa visual de mesas para seleccionar

### 9.4 Lo que el empleado NO puede hacer
- Editar datos del cliente
- Cambiar niveles
- Ver historial del cliente
- Acceder a información financiera

---

## 10. LAVADERO

### 10.1 Integración
- El lavadero actualiza estados vía API con su propia API Key.
- No necesita sistema externo — tiene su propio panel en `/lavadero`.
- El panel del lavadero es la interfaz para registrar y actualizar autos.

### 10.2 Estados del auto
```
RECIBIDO → EN_LAVADO → EN_SECADO → LISTO → ENTREGADO
```
- Solo puede avanzar (no retroceder estados, salvo ENTREGADO → RECIBIDO para nuevo turno).
- Cada cambio de estado genera un EventoScan con `tipoEvento: ESTADO_EXTERNO`.

### 10.3 Trigger de beneficios
- `EN_LAVADO` → habilita "Café gratis en Coques" para clientes Plata o superior
- `LISTO` → genera noticia "Tu auto está listo"
- `ENTREGADO` → desactiva todos los beneficios por estado del auto

---

## 11. SEGURIDAD

### 11.1 OTP dinámico
- Estándar TOTP (RFC 6238), mismo que Google Authenticator
- Ventana de 30 segundos, tolerancia de +/- 1 ventana
- Validación 100% server-side
- El QR y el código de 6 dígitos son dos puertas al mismo sistema

### 11.2 Objetivo de seguridad (realista)
- No se busca blindaje extremo
- El objetivo es que el abuso no sea cómodo ni escalable
- Un código que vence en 30 segundos, validado desde el local, cumple ese objetivo

### 11.3 Inmutabilidad de eventos
- Los EventoScan nunca se borran ni modifican
- Son la fuente de verdad del sistema
- Permiten auditoría completa en caso de reclamo

---

## 12. REGLAS TÉCNICAS PARA ROOCODE

- Zona horaria: siempre `America/Argentina/Buenos_Aires` en el servidor
- Timestamps: siempre server-side, nunca confiar en el cliente
- El `client_id` (UUID) es la PK técnica — el celular es solo el campo de búsqueda
- Los niveles se evalúan después de cada EventoScan (no en batch)
- El job de descenso por inactividad corre 1 vez por día (cron)
- Los beneficios se habilitan en Coques Points, se ejecutan manualmente en Aires
- Un EventoScan de tipo VISITA que excede el límite diario se registra igual
  pero con un flag `contabilizada: false` — para tener el registro sin que cuente
- Las noticias son append-only (nunca se borran, solo se marcan como leídas)
- El cupo de un evento se maneja con un campo `inscriptos_count` + `cupo_maximo`
  con control de concurrencia (no dejar inscribir si inscriptos_count >= cupo_maximo)
