# 🎨 Plan: Template White-Label del Sistema de Fidelización

## 🎯 Objetivo

Crear un esqueleto reutilizable del sistema de fidelización que pueda ser personalizado fácilmente para otras empresas.

---

## 📋 Análisis: Qué es Específico vs Genérico

### ✅ GENÉRICO (Reutilizable para cualquier empresa)

**Funcionalidades Core:**
- ✅ Sistema de registro y login (email/contraseña + Google OAuth)
- ✅ Sistema de niveles (Bronce/Plata/Oro configurable)
- ✅ Sistema de beneficios por nivel
- ✅ QR de fidelización
- ✅ Escaneo de QR para sumar visitas
- ✅ Historial de visitas
- ✅ Sistema de logros
- ✅ Panel de staff para el local
- ✅ Panel de admin
- ✅ Gestión de mesas
- ✅ Sistema de eventos especiales
- ✅ Feedback de clientes
- ✅ Exportación de datos a Excel
- ✅ Notificaciones push (PWA)
- ✅ Sistema de presupuestos
- ✅ Autenticación biométrica (Passkeys)
- ✅ Multi-local

**Arquitectura:**
- ✅ Next.js 14 + TypeScript
- ✅ Prisma ORM
- ✅ PostgreSQL
- ✅ NextAuth
- ✅ PWA
- ✅ Diseño responsive

---

### 🎨 ESPECÍFICO DE COQUES (Necesita personalización)

**Branding:**
- ❌ Nombre: "Coques" → Variable
- ❌ Logo
- ❌ Colores corporativos
- ❌ Nombre de la app: "Coques Pass" → Variable

**Integración Externa:**
- ❌ WooCommerce (tortas) → Opcional/Configurable
- ❌ DeltaWash (lavadero) → Opcional/Configurable

**Contenido:**
- ❌ Nombres de beneficios específicos
- ❌ Criterios de niveles
- ❌ Textos de bienvenida
- ❌ Emails transaccionales (textos)

**Dominio:**
- ❌ `app.coques.com.ar` → Variable

---

## 🏗️ Estrategia de Conversión a Template

### Opción 1: Sistema de Configuración (Recomendado)

Crear un archivo de configuración centralizado que contenga toda la info personalizable.

**Archivo:** `config/brand.config.ts`

```typescript
export const BRAND_CONFIG = {
  // Información de la Empresa
  company: {
    name: 'Coques',
    fullName: 'Coques Pastelería',
    tagline: 'Tu pastelería de confianza',
    domain: 'app.coques.com.ar',
  },

  // Branding
  branding: {
    primaryColor: '#0066CC',
    secondaryColor: '#FF6B35',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
    appName: 'Coques Pass',
    staffAppName: 'Coques Staff',
  },

  // Niveles (configurables)
  niveles: {
    enabled: true,
    names: ['Bronce', 'Plata', 'Oro'],
  },

  // Funcionalidades opcionales
  features: {
    woocommerce: true, // Integración tienda online
    lavadero: false,   // Integración lavadero
    mesas: true,       // Sistema de mesas
    presupuestos: true,
    eventosEspeciales: true,
    referidos: true,
  },

  // Locales
  locales: [
    { id: 1, nombre: 'Coques Centro', tipo: 'CAFETERIA' },
  ],

  // Emails
  emails: {
    from: 'noreply@mail.coques.com.ar',
    fromName: 'Coques',
  },

  // Textos personalizables
  texts: {
    welcome: '¡Bienvenido a Coques Points!',
    appDescription: 'Acumulá visitas y disfrutá de beneficios exclusivos',
    loginSubtitle: 'Ingresá para ver tus beneficios',
  },
}
```

**Ventajas:**
- ✅ Un solo archivo para cambiar
- ✅ Fácil de mantener
- ✅ No hay que buscar strings en todo el código
- ✅ Se puede hacer import desde cualquier componente

---

### Opción 2: Variables de Entorno + Base de Datos

Más flexible, pero más complejo.

```env
# .env
NEXT_PUBLIC_COMPANY_NAME="Coques"
NEXT_PUBLIC_APP_NAME="Coques Pass"
NEXT_PUBLIC_PRIMARY_COLOR="#0066CC"
NEXT_PUBLIC_FEATURE_WOOCOMMERCE="true"
NEXT_PUBLIC_FEATURE_LAVADERO="false"
```

**Ventajas:**
- ✅ No requiere recompilación para cambiar
- ✅ Diferentes configs en dev/prod

**Desventajas:**
- ❌ Muchas variables
- ❌ Más difícil de gestionar

---

### Opción 3: Multi-Tenant (Más avanzado)

Un solo despliegue sirve a múltiples empresas.

```
app.coques.com.ar → Config Coques
app.cliente1.com.ar → Config Cliente 1
app.cliente2.com.ar → Config Cliente 2
```

**Base de datos:**
- Agregar tabla `Empresa` con branding
- Relación: Cliente → Empresa
- Detectar empresa por dominio

**Ventajas:**
- ✅ Un solo código/deploy
- ✅ Gestión centralizada
- ✅ Actualizaciones para todos a la vez

**Desventajas:**
- ❌ Más complejo
- ❌ Requiere más infraestructura
- ❌ Problemas de un cliente pueden afectar a otros

---

## 📦 Propuesta: Template Starter Kit

### Estructura Propuesta:

```
fidelizacion-template/
├── config/
│   ├── brand.config.ts         ← PERSONALIZAR AQUÍ
│   ├── features.config.ts      ← Activar/desactivar features
│   └── locales.config.ts       ← Configurar locales
├── docs/
│   ├── SETUP-NUEVO-CLIENTE.md  ← Guía paso a paso
│   ├── PERSONALIZACION.md      ← Qué cambiar y dónde
│   └── DESPLIEGUE.md           ← Cómo deployar
├── src/
│   ├── app/                    ← Sin cambios (genérico)
│   ├── components/             ← Sin cambios (genérico)
│   └── lib/                    ← Sin cambios (genérico)
├── public/
│   ├── logo.svg                ← REEMPLAZAR
│   ├── favicon.ico             ← REEMPLAZAR
│   └── ...
├── scripts/
│   ├── seed-inicial.sql        ← Datos base personalizables
│   └── setup-nuevo-cliente.sh  ← Script automatizado
├── .env.example                ← Template de variables
└── README-TEMPLATE.md          ← Guía principal
```

---

## 🎯 Pasos para Crear el Template

### Fase 1: Refactorización del Código Actual

**1. Centralizar Branding**
- Crear `config/brand.config.ts`
- Reemplazar todos los hardcoded "Coques" por imports
- Ejemplo: `{BRAND_CONFIG.company.name}` en lugar de "Coques"

**2. Separar Features Opcionales**
- Envolver WooCommerce en `if (FEATURES.woocommerce)`
- Envolver DeltaWash en `if (FEATURES.lavadero)`
- Hacer componentes condicionales

**3. Tematización de Colores**
- CSS Variables desde `brand.config.ts`
- Tailwind con colores dinámicos

**4. Logos y Assets**
- Centralizar en `/public/brand/`
- Usar paths relativos desde config

---

### Fase 2: Documentación

**Crear guías:**

1. **SETUP-NUEVO-CLIENTE.md**
   - Clonar el repo
   - Qué archivos editar
   - Checklist completo

2. **PERSONALIZACION.md**
   - Cambiar logo
   - Cambiar colores
   - Cambiar textos
   - Activar/desactivar features

3. **DESPLIEGUE.md**
   - Configurar Vercel
   - Configurar base de datos
   - Configurar dominio
   - Variables de entorno

---

### Fase 3: Scripts de Automatización

**Script: `setup-nuevo-cliente.sh`**

```bash
#!/bin/bash
echo "🎨 Setup de Nuevo Cliente - Sistema de Fidelización"
echo ""
echo "Ingresá el nombre de la empresa:"
read COMPANY_NAME

echo "Ingresá el dominio (ej: app.empresa.com):"
read DOMAIN

echo "¿Tiene tienda online? (s/n):"
read HAS_ECOMMERCE

# Actualizar brand.config.ts automáticamente
# Crear .env con valores por defecto
# Etc...

echo "✅ Configuración básica completada!"
```

---

## 📋 Checklist de Personalización (Para el Nuevo Cliente)

### Paso 1: Información Básica
- [ ] Nombre de la empresa
- [ ] Dominio
- [ ] Logo (SVG o PNG)
- [ ] Colores corporativos (primario, secundario)
- [ ] Nombre de la app

### Paso 2: Funcionalidades
- [ ] ¿Integración con tienda online? (WooCommerce, Shopify, etc.)
- [ ] ¿Sistema de mesas?
- [ ] ¿Presupuestos?
- [ ] ¿Eventos especiales?
- [ ] ¿Programa de referidos?

### Paso 3: Configuración de Niveles
- [ ] Nombres de niveles (ej: Básico/Premium/VIP)
- [ ] Criterios (visitas necesarias)
- [ ] Beneficios por nivel

### Paso 4: Locales
- [ ] Cantidad de locales
- [ ] Nombres y direcciones
- [ ] API Keys para cada local

### Paso 5: Emails
- [ ] Dominio de envío
- [ ] Plantillas de emails
- [ ] Configurar Brevo/Resend

### Paso 6: Deploy
- [ ] Crear proyecto en Vercel
- [ ] Configurar base de datos (Neon)
- [ ] Variables de entorno
- [ ] Dominio personalizado
- [ ] SSL

---

## 💰 Modelos de Distribución

### Opción A: Open Source Template
- GitHub público
- Licencia MIT
- Gratis
- Cada cliente instala su propia instancia

### Opción B: Template Comercial
- Repositorio privado
- Venta de licencias
- Soporte incluido
- Personalización asistida

### Opción C: SaaS Multi-Tenant
- Hosting centralizado
- Suscripción mensual
- Gestión completa
- Sin instalación

---

## 🚀 Implementación Recomendada

**Para empezar (más simple):**

1. ✅ Crear `config/brand.config.ts`
2. ✅ Refactorizar componentes principales para usar el config
3. ✅ Crear documentación SETUP-NUEVO-CLIENTE.md
4. ✅ Probar con un "cliente ficticio" para validar

**Más adelante (avanzado):**
- Script de automatización
- Panel de configuración web
- Multi-tenant
- Marketplace de templates

---

## 📊 Estimación de Esfuerzo

### Opción Básica (Archivo de Config)
- **Tiempo:** 2-3 días
- **Complejidad:** Media
- **Resultado:** Template funcional y documentado

### Opción Avanzada (Multi-Tenant)
- **Tiempo:** 2-3 semanas
- **Complejidad:** Alta
- **Resultado:** Plataforma SaaS completa

---

## ❓ Preguntas Clave

Antes de empezar, necesito saber:

1. **¿Querés compartir el código como template descargable?**
   - Cada empresa instala su propia versión
   - O preferís un sistema multi-tenant

2. **¿Nivel de personalización?**
   - Solo branding (logo, colores, textos)
   - O también features (activar/desactivar módulos)

3. **¿Soporte?**
   - Auto-instalable con documentación
   - O vas a dar soporte de implementación

4. **¿Monetización?**
   - Open source gratis
   - Template pago
   - SaaS con suscripción

---

## 💡 Recomendación

Para empezar, sugiero:

1. **Crear sistema de configuración** (`brand.config.ts`)
2. **Refactorizar los 5 componentes más visibles** (header, home, login, pass, admin)
3. **Documentación básica** para nuevo cliente
4. **Probarlo internamente** simulando una empresa nueva

Una vez validado, podés escalar a opciones más avanzadas.

---

¿Querés que empiece a implementar la Opción 1 (Sistema de Configuración)?
