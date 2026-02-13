# Plan de Implementación: Encuesta + Admin Niveles

## Resumen
Implementar dos funcionalidades:
1. **Admin de Niveles**: Interfaz para ver y editar criterios de niveles (visitas, usos cruzados)
2. **Encuesta + Cuestionario**: Sistema de feedback al cerrar sesión + cuestionario opcional en perfil cliente

---

## PARTE 1: Admin de Niveles

### 1.1 API Backend
**Archivo**: `src/app/api/admin/niveles/route.ts`
- GET: Listar todos los niveles con sus criterios
- PATCH: Actualizar criterios de un nivel específico

### 1.2 Frontend Admin
**Archivo**: `src/app/admin/niveles/page.tsx`
- Tabla mostrando: Nivel | Orden | Visitas Requeridas | Usos Cruzados | Acciones
- Modal/formulario para editar criterios
- Validaciones: visitas >= 0, usos cruzados >= 0

---

## PARTE 2: Encuesta al Cerrar Sesión

### 2.1 Modificación de BD
**Agregar campos a tabla Cliente**:
- `fuenteConocimiento`: String? (Amigos, Instagram, Google Maps, Vi luz y entré)

**Migración**: `prisma/migrations/[timestamp]_add_fuente_conocimiento/migration.sql`

### 2.2 Encuesta en MesaModal
**Archivo**: `src/app/local/components/MesaModal.tsx`
- Al hacer clic en "Cerrar Sesión", mostrar modal de encuesta
- Calificación: 1-5 estrellas
- Si 4-5: Botón "Dejar reseña en Google Maps" → Abre https://maps.app.goo.gl/n6q5HNELZuwDyT556
- Si 1-3: Campo de texto "¿Qué podemos mejorar?" → Guardar como feedback interno
- Guardar calificación en tabla `Feedback` (ya existe)

### 2.3 API Feedback (ya existe)
**Archivo**: `src/app/api/feedback/route.ts`
- Verificar que acepta: clienteId, calificacion (1-5), comentario
- Si no, modificar para agregar campo `calificacion`

---

## PARTE 3: Cuestionario Opcional en Perfil Cliente

### 3.1 Componente Cuestionario
**Archivo**: `src/app/pass/page.tsx` (o nuevo componente)
- Mostrar SOLO si falta: fechaCumpleanos O fuenteConocimiento
- Ubicación: Debajo del QR del Pass
- Campos:
  1. Fecha de cumpleaños (date input)
  2. ¿Cómo nos conociste? (select: Amigos, Instagram, Google Maps, Vi luz y entré)
- Botón: "Completar" → Enviar + mostrar mensaje de éxito + desaparecer
- Mensaje: "¡Completá tu perfil y sumá 1 visita extra!"

### 3.2 API Cuestionario
**Archivo**: `src/app/api/perfil/cuestionario/route.ts`
- POST: Guardar fechaCumpleanos + fuenteConocimiento
- **Bonus**: Registrar evento VISITA con contabilizada=true (visita extra)
- Validaciones: fecha válida, fuente en opciones permitidas

---

## Orden de Implementación

1. ✅ Migración BD (agregar fuenteConocimiento)
2. ✅ Admin Niveles API + Frontend
3. ✅ API Cuestionario + modificar perfil
4. ✅ Cuestionario en Pass (frontend)
5. ✅ Encuesta en MesaModal
6. ✅ Testing
7. ✅ Deploy

---

## Datos de Configuración

- **Google Maps URL**: https://maps.app.goo.gl/n6q5HNELZuwDyT556
- **Fuentes de Conocimiento**: ["Amigos", "Instagram", "Google Maps", "Vi luz y entré"]
- **Beneficio Cuestionario**: +1 visita contabilizada hacia nivel
