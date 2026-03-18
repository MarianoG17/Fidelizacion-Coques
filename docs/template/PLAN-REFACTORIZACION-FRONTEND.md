# 🔧 Plan de Refactorización del Frontend

## 🎯 Objetivo

Hacer que el frontend lea de `brand.config.ts` en lugar de tener valores hardcoded.

---

## ✅ Estado Actual

- ✅ `config/brand.config.ts` creado
- ✅ `config/features.config.ts` creado
- ❌ Frontend todavía tiene "Coques" hardcoded
- ❌ Componentes NO usan los archivos de config

---

## 📋 Archivos a Refactorizar (Prioridad)

### 🔥 CRÍTICOS (se ven inmediatamente)

1. **src/app/layout.tsx** - Metadata, título, descripción
2. **src/app/page.tsx** - Landing page
3. **src/app/login/page.tsx** - Página de login
4. **src/app/pass/page.tsx** - Pase de fidelización
5. **public/manifest.json** - PWA manifest (nombre de la app)

### ⚠️ IMPORTANTES (funcionalidad principal)

6. **src/app/perfil/page.tsx** - Perfil de usuario
7. **src/app/admin/page.tsx** - Panel admin
8. **src/app/local/page.tsx** - Panel staff
9. **src/lib/email.ts** - Envío de emails

### 📦 MEDIOS (menos visibles)

10. src/app/historial/page.tsx
11. src/app/logros/page.tsx
12. src/app/tortas/page.tsx
13. src/components/\*\*/\*.tsx

---

## 🚀 Proceso de Refactorización

### Paso 1: Buscar strings hardcoded

```bash
# En VS Code, presioná Ctrl+Shift+F y buscá:
"Coques"
"Coques Pass"
"Coques Staff"
"Coques Points"
"app.coques.com.ar"
```

### Paso 2: Reemplazar con imports

**Antes:**
```tsx
<h1>Bienvenido a Coques Pass</h1>
```

**Después:**
```tsx
import { BRAND_CONFIG } from '@/config/brand.config'

<h1>Bienvenido a {BRAND_CONFIG.branding.appName}</h1>
```

### Paso 3: Testear

```bash
npm run dev
# Verificar que funciona igual
```

---

## 📝 Componentes para Empezar

Te voy a mostrar cómo refactorizar los 3 más importantes:

### 1. layout.tsx (metadata)
### 2. page.tsx (home)
### 3. login/page.tsx

Una vez que veas el patrón, podés aplicarlo al resto.

---

## ⏱️ Tiempo Estimado

| Grupo | Archivos | Tiempo |
|-------|----------|--------|
| Críticos | 5 archivos | 1-2 horas |
| Importantes | 4 archivos | 1 hora |
| Medios | ~15 archivos | 2-3 horas |
| **TOTAL** | ~24 archivos | **4-6 horas** |

---

## 💡 Estrategia Recomendada

### Opción A: Refactorizar todo ahora
- Toma 4-6 horas
- Una vez hecho, todos los futuros clientes lo usan

### Opción B: Refactorizar lo mínimo
- Solo los 5 críticos (1-2 horas)
- Resto se hace gradualmente

### Opción C: Usar Find & Replace
- Más rápido pero menos robusto
- Buscar/reemplazar strings en todo el proyecto

---

## 🎯 ¿Quieres que empiece?

Puedo refactorizar:

1. **Los 5 críticos** (layout, home, login, pass, manifest)
2. **Todo completo** (todos los archivos)
3. **Solo mostrarte un ejemplo** y vos hacés el resto

¿Cuál preferís?
