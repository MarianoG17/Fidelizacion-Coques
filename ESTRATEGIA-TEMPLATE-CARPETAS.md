# 📁 Estrategia: Estructura de Carpetas para Template

## 🤔 Opción 1: Refactorizar el Proyecto Actual (Recomendado)

**No crear carpeta nueva, sino modificar `fidelizacion-zona/`**

### Estructura:
```
fidelizacion-zona/                    ← Proyecto actual
├── config/                           ← NUEVO: Configuración
│   ├── brand.config.ts              ← Info de Coques
│   └── brand.config.example.ts      ← Template para otros
├── docs/                             ← NUEVO: Docs del template
│   ├── SETUP-NUEVO-CLIENTE.md
│   └── PERSONALIZACION.md
├── src/                              ← Sin cambios (pero usar config)
├── public/
│   ├── brand/                        ← NUEVO: Assets organizados
│   │   ├── logo-coques.svg          ← Logo actual
│   │   └── logo-example.svg         ← Logo de ejemplo
└── ...
```

### ✅ Ventajas:
- ✅ Un solo código para mantener
- ✅ Coques sigue funcionando igual (mismo proyecto)
- ✅ Bugs encontrados en Coques se arreglan automáticamente en el template
- ✅ Actualizaciones de features benefician a todos
- ✅ Más limpio y profesional

### ⚠️ Desventajas:
- ⚠️ Hay que refactorizar el código actual
- ⚠️ Coques queda "dentro" del template

### Cómo funciona para un nuevo cliente:

**Cliente nuevo:**
```bash
# 1. Clonar el repo
git clone https://github.com/tu-usuario/fidelizacion-template.git mi-empresa

# 2. Copiar el config de ejemplo
cd mi-empresa
cp config/brand.config.example.ts config/brand.config.ts

# 3. Editar brand.config.ts con info de la empresa
nano config/brand.config.ts

# 4. Reemplazar logo
cp mi-logo.svg public/brand/logo.svg

# 5. Deploy
vercel deploy
```

**Para Coques:**
- Seguís usando la misma carpeta `fidelizacion-zona/`
- Tu `brand.config.ts` tiene la info de Coques
- Todo funciona igual que ahora

---

## 🤔 Opción 2: Crear Proyecto Template Separado

**Crear nueva carpeta: `fidelizacion-template/`**

### Estructura:
```
GitHub/Fidelizacion Coques-Lavadero/
├── fidelizacion-zona/               ← Proyecto Coques (actual)
│   ├── src/
│   └── ...
│
└── fidelizacion-template/           ← NUEVO: Template genérico
    ├── config/
    │   └── brand.config.example.ts
    ├── src/                         ← Copiado y limpio
    ├── docs/
    │   └── SETUP-NUEVO-CLIENTE.md
    └── ...
```

### ✅ Ventajas:
- ✅ Coques y template completamente separados
- ✅ Más claro qué es qué
- ✅ Puedes borrar código específico de Coques del template

### ⚠️ Desventajas:
- ⚠️ Mantener 2 proyectos separados
- ⚠️ Bug fixes hay que aplicarlos en ambos
- ⚠️ Features nuevas hay que duplicarlas
- ⚠️ Más trabajo de sincronización

---

## 🎯 Recomendación: Opción 1

**Razones:**

1. **Mantenibilidad**
   - Un solo código = menos bugs
   - Actualizaciones en un solo lugar

2. **Profesional**
   - Muchos frameworks funcionan así (Next.js, Laravel, etc.)
   - La configuración está separada del código

3. **Escalable**
   - Si encontrás un bug en Coques, se arregla para todos
   - Nuevas features se agregan una vez

4. **Ejemplo Real**
   - Coques es el "ejemplo funcionando" del template
   - Otros clientes pueden ver cómo está configurado

---

## 📋 Plan de Implementación (Opción 1)

### Fase 1: Preparar estructura (sin romper nada)

```bash
cd fidelizacion-zona

# Crear carpetas nuevas
mkdir -p config
mkdir -p docs/template
mkdir -p public/brand
```

### Fase 2: Crear archivos de configuración

1. **Crear `config/brand.config.ts`** (con datos de Coques)
2. **Crear `config/brand.config.example.ts`** (template para otros)
3. **Crear `docs/template/SETUP-NUEVO-CLIENTE.md`**

### Fase 3: Refactorizar gradualmente

**No todo a la vez, sino componente por componente:**

1. ✅ Empezar con el header (nombre "Coques" → `BRAND.company.name`)
2. ✅ Luego home/landing
3. ✅ Login
4. ✅ Pass/perfil
5. ✅ Admin
6. etc...

**Beneficio:** Coques sigue funcionando mientras refactorizás

### Fase 4: Documentar

1. ✅ Guía de personalización
2. ✅ README del template
3. ✅ Video tutorial (opcional)

---

## 💡 Ejemplo Práctico

### Antes (hardcoded):
```tsx
// src/app/page.tsx
<h1>Bienvenido a Coques Pass</h1>
```

### Después (configurable):
```tsx
// src/app/page.tsx
import { BRAND } from '@/config/brand.config'

<h1>Bienvenido a {BRAND.branding.appName}</h1>
```

### Para Coques:
```ts
// config/brand.config.ts
export const BRAND = {
  branding: {
    appName: 'Coques Pass'
  }
}
```

### Para otro cliente:
```ts
// config/brand.config.ts
export const BRAND = {
  branding: {
    appName: 'Mi Empresa Rewards'
  }
}
```

---

## 🚀 Siguiente Paso

**Si elegimos Opción 1 (Recomendado):**

Empiezo por:
1. ✅ Crear carpeta `config/`
2. ✅ Crear `brand.config.ts` con datos actuales de Coques
3. ✅ Crear `brand.config.example.ts` como template
4. ✅ Refactorizar 1 componente simple como prueba (ej: Header)
5. ✅ Verificar que Coques sigue funcionando igual

**Si elegimos Opción 2:**

Creo carpeta nueva `fidelizacion-template/` y copio todo ahí para limpiar.

---

## ❓ ¿Qué preferís?

**Opción 1 (Un solo proyecto configurable):**
- Más profesional y mantenible
- Coques es parte del template
- Un solo codebase

**Opción 2 (Proyectos separados):**
- Más separación
- Más trabajo de mantenimiento
- Dos codebases distintos

**Mi recomendación:** Opción 1 ✅
