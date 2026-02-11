# 🧪 Guía de Testing - Fidelización Zona

## 🌐 URL de Producción
https://fidelizacion-coques-813u.vercel.app

---

## 📋 Credenciales y Datos de Prueba

### 🔐 API Keys (del seed)
- **Coques (Local)**: `coques-api-key-dev-change-in-prod`
- **Lavadero**: `lavadero-api-key-dev-change-in-prod`
- **Admin Key**: (la que configuraste en Vercel environment variables)

### 👤 Cliente de Prueba (creado en seed)
- **Nombre**: Juan Pérez
- **Teléfono**: `+5491112345678`
- **Estado**: ACTIVO
- **Nivel**: Bronce (inicial)
- **OTP Secret**: Se genera al activar

---

## 🧪 Escenarios de Prueba

### 1️⃣ Flujo de Activación de Cliente Nuevo

**Objetivo**: Registrar y activar un nuevo cliente

1. Ir a `/activar`
2. Ingresar nombre (ej: "María López")
3. Ingresar celular (ej: "1187654321" - sin 0 ni 15)
4. Marcar checkbox de consentimiento
5. Click en "Activar mi cuenta gratis"
6. ✅ **Resultado esperado**: Redirección automática al Pass

### 2️⃣ Ver el Pass del Cliente

**Objetivo**: Visualizar la tarjeta de fidelización

1. Ir a `/pass`
2. Si no estás logueado, primero activá una cuenta
3. ✅ **Deberías ver**:
   - Nombre y nivel actual
   - QR code dinámico (TOTP de 30 seg)
   - Lista de beneficios activos
   - Estado del auto (si hay uno en el lavadero)

### 3️⃣ App del Local (Coques) - Validar Visitas

**Objetivo**: Empleado del café valida una visita de cliente

**Opción A: Usando el OTP del cliente**
1. Ir a `/local`
2. Ingresar API Key: `coques-api-key-dev-change-in-prod`
3. En la sección "Validar OTP", ingresar el código de 6 dígitos que muestra el Pass del cliente
4. Click en "Validar OTP"
5. ✅ **Deberías ver** los datos del cliente, su nivel y beneficios

**Opción B: Escaneando QR (simular)**
- En producción, el empleado escanearía el QR del Pass
- Eso envía el OTP automáticamente a esta API

**Registrar el evento:**
6. Seleccionar tipo de evento (VISITA o BENEFICIO_APLICADO)
7. Si es visita, seleccionar una mesa
8. Si es beneficio, elegir cuál se está aplicando
9. Click en "Registrar Evento"
10. ✅ **El sistema debe**:
    - Incrementar el contador de visitas del cliente
    - Verificar si sube de nivel
    - Mostrar confirmación

### 4️⃣ Panel del Lavadero - Gestión de Estados

**Objetivo**: Empleado del lavadero actualiza el estado del auto

1. Ir a `/lavadero`
2. Ingresar API Key: `lavadero-api-key-dev-change-in-prod`
3. En "Actualizar Estado", ingresar:
   - Teléfono del cliente: `+5491112345678`
   - Patente (opcional): "ABC123"
   - Seleccionar estado: RECIBIDO
4. Click en "Actualizar Estado"
5. ✅ **El cliente recibirá una notificación** (visible en su Pass si refresca)

**Estados disponibles:**
- `RECIBIDO` → El auto llegó al lavadero
- `EN_LAVADO` → Trigger de beneficio: café gratis mientras espera
- `EN_SECADO` → Auto en proceso
- `LISTO` → Auto terminado y listo para retirar
- `ENTREGADO` → Auto entregado al cliente

6. Cambiar el estado a `EN_LAVADO`
7. ✅ **Sistema debe**:
   - Crear automáticamente un beneficio de "Café gratis"
   - Enviar notificación al cliente
   - Mostrar el auto en la lista de "Autos Activos"

### 5️⃣ Panel Admin - Vista General

**Objetivo**: Administrador revisa métricas y gestiona el sistema

**⚠️ IMPORTANTE**: Para acceder necesitás usar una extensión de navegador o herramienta como Postman para agregar headers personalizados.

**Con ModHeader (extensión de Chrome/Edge):**
1. Instalar [ModHeader](https://chrome.google.com/webstore/detail/modheader)
2. Agregar header:
   - Name: `x-admin-key`
   - Value: `[tu ADMIN_KEY de Vercel]`
3. Ir a `/admin`

**Pestañas disponibles:**

**📊 Métricas**
- Total de clientes registrados
- Clientes activos
- Total de visitas acumuladas
- Eventos registrados
- Distribución por niveles (gráfico)

**🎉 Eventos Especiales**
- Ver lista de eventos futuros
- Crear nuevo evento especial
- Ver inscripciones por evento
- Cambiar estado (ABIERTO → CERRADO → CANCELADO)
- ⚠️ Al cancelar: sistema notifica a todos los inscritos

**👥 Clientes**
- Lista completa de clientes
- Filtrar por nombre, teléfono o nivel
- Ver cuántos eventos especiales asistió cada uno

### 6️⃣ Crear y Gestionar Evento Especial

**Flujo completo del ciclo de vida de un evento:**

1. Admin crea evento en `/admin` → pestaña "Eventos Especiales"
   - Título: "Cata de Café Especial"
   - Descripción, fecha, lugar
   - Nivel mínimo requerido (ej: Plata)
   - Cupo máximo (ej: 20 personas)

2. ✅ Evento creado con estado `ABIERTO`

3. Cliente se inscribe:
   - Ve el evento en su `/pass` (si su nivel lo permite)
   - Click en "Inscribirme"
   - ✅ Inscripción con estado `CONFIRMADA`

4. Admin cierra inscripciones (cambiar a `CERRADO`)
   - Ya no se aceptan más inscripciones
   - Los inscritos siguen confirmados

5. Día del evento:
   - Empleado del local valida asistencia (registra evento tipo VISITA con beneficioId del evento)
   - ✅ Inscripción cambia a `ASISTIO`

6. Si el admin cancela el evento:
   - Cambiar estado a `CANCELADO`
   - ✅ Sistema envía noticia a todos los inscritos
   - ✅ Los inscritos reciben penalidad: pierden 2 visitas

---

## 🔄 Testing de Subida de Nivel

**Escenario**: Hacer que Juan Pérez suba de Bronce a Plata

**Regla**: Plata = 10 visitas en los últimos 90 días

1. Usar App Local para registrar visitas de Juan
2. Registrar 10 visitas (tipo VISITA)
3. ✅ En la visita #10, el sistema:
   - Detecta que alcanzó 10 visitas
   - Sube automáticamente a Plata
   - Crea una noticia felicitando al cliente
   - Desbloquea beneficios del nivel Plata

4. Ver en `/pass` que el nivel cambió a Plata
5. Ver en `/admin` → Métricas la distribución actualizada

---

## 🧪 Testing de Descenso de Nivel (90 días de inactividad)

**Regla**: Si no hay visitas en 90 días, el cliente baja de nivel

**Testing manual:**
1. En la BD, modificar la fecha de la última visita a hace 91 días
2. Ejecutar el job de inactividad: `POST /api/jobs/inactividad`
   - Header: `Authorization: Bearer [JOB_SECRET]`
3. ✅ El cliente debe bajar un nivel
4. ✅ Recibe una noticia explicando la inactividad

**Testing automático:**
- El cron de Vercel ejecuta esto diariamente a las 3 AM

---

## 📱 Testing de Notificaciones

**Tipos de noticias que se generan:**

1. **LOGRO**: Al subir de nivel
2. **BENEFICIO**: Al recibir un beneficio nuevo (ej: café gratis por lavado de auto)
3. **ESTADO_AUTO**: Cuando cambia el estado del auto
4. **EVENTO**: Confirmación de inscripción a evento
5. **ADVERTENCIA**: Cancelación de evento o descenso de nivel

**Ver noticias:**
- Ir a `/pass`
- Las noticias aparecen en una sección (si se implementó el componente)
- O hacer `GET /api/noticias` con el token del cliente

---

## 🐛 Casos Edge a Probar

### Límite de una visita por día
1. Registrar una visita de Juan
2. Intentar registrar otra visita del mismo cliente el mismo día
3. ✅ Sistema debe rechazar o no contar la segunda

### Beneficio por estado EN_LAVADO
1. Poner auto de Juan en estado `EN_LAVADO`
2. ✅ Debe crear beneficio automáticamente
3. Cambiar a `LISTO`
4. ✅ Beneficio debe seguir activo (hasta que lo use en Coques)

### Uso de beneficios
1. Juan tiene un beneficio activo (ej: "Café gratis")
2. Empleado del local valida OTP
3. Registrar evento tipo `BENEFICIO_APLICADO` con el beneficioId
4. ✅ El beneficio debe marcarse como usado

---

## ✅ Checklist Completo de Testing

- [ ] Activar nuevo cliente desde /activar
- [ ] Ver Pass con QR dinámico
- [ ] Validar OTP desde App Local
- [ ] Registrar visita y ver confirmación
- [ ] Actualizar estado de auto desde Lavadero
- [ ] Ver auto en lista de "Autos Activos" en Lavadero
- [ ] Cambiar estado a EN_LAVADO y verificar beneficio
- [ ] Acceder al Panel Admin con header x-admin-key
- [ ] Ver métricas actualizadas en Admin
- [ ] Crear evento especial desde Admin
- [ ] Inscribirse a evento desde cliente
- [ ] Cancelar evento y verificar notificaciones
- [ ] Registrar 10 visitas para que un cliente suba de nivel
- [ ] Ver noticia de felicitación por nivel nuevo
- [ ] Filtrar clientes por nivel en Admin
- [ ] Ver distribución por niveles en gráfico

---

## 🔧 Troubleshooting

### Error 401 en Panel Admin
→ Verificar que el header `x-admin-key` coincida exactamente con el valor en Vercel

### OTP no válido
→ El OTP cambia cada 30 segundos. Asegurarse de ingresar el código actual del Pass

### Cliente no sube de nivel
→ Verificar en Admin que tiene las visitas necesarias en los últimos 90 días

### Estado del auto no se actualiza
→ Verificar que el teléfono esté en formato E.164: `+5491112345678`

---

## 📞 Soporte

Si algo no funciona como esperado:
1. Revisar la consola del navegador (F12)
2. Verificar que las API keys sean correctas
3. Confirmar que las variables de entorno estén configuradas en Vercel
4. Revisar los logs de Vercel para errores del servidor
