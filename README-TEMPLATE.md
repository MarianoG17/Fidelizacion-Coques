# 🎨 Sistema de Fidelización - Template White-Label

## 📖 Acerca de este Proyecto

Este es un **sistema completo de fidelización de clientes** diseñado para ser fácilmente personalizable y reutilizable para diferentes empresas.

### ✨ Características Principales

- 📱 **PWA (Progressive Web App)** - Instalable como app nativa
- 🎯 **Sistema de Niveles** - Bronce, Plata, Oro (personalizables)
- 🎁 **Beneficios por Nivel** - Recompensas automáticas
- 🔐 **QR de Fidelización** - Cada cliente tiene su QR único
- 👥 **Panel de Staff** - Para empleados del local
- 📊 **Panel de Admin** - Estadísticas y gestión completa
- 🪑 **Gestión de Mesas** - Para restaurantes/cafeterías
- 📧 **Emails Automáticos** - Bienvenida, recuperación, notificaciones
- 🔔 **Push Notifications** - Notificaciones en la app
- 🏆 **Sistema de Logros** - Gamificación
- 🎉 **Eventos Especiales** - Promociones y bonificaciones
- 🛒 **Integración WooCommerce** - Pedidos online (opcional)
- 📱 **Autenticación Biométrica** - Face ID / Touch ID
- 🌐 **Google OAuth** - Login con Google

---

## 🚀 Para Empresas que Quieren Usar este Sistema

### 📋 Lo que necesitás saber:

Este sistema está **100% funcional y listo para personalizar**. No necesitás ser programador, solo seguir las guías.

### 📚 Documentación para Nuevo Cliente:

1. **[README-PARA-NUEVO-CLIENTE.md](docs/template/README-PARA-NUEVO-CLIENTE.md)** 
   - Guía paso a paso completa
   - Instalación desde cero
   - Configuración de servicios
   - Deploy en producción

2. **[CHECKLIST-PERSONALIZACION.md](docs/template/CHECKLIST-PERSONALIZACION.md)**
   - Lista de TODO lo que hay que personalizar
   - Qué archivos editar
   - Qué assets reemplazar

### ⏱️ Tiempo estimado de setup: 2-3 horas

---

## 🎨 Cómo Funciona la Personalización

### Sistema de Configuración Centralizada

Todo lo personalizable está en **archivos de configuración**. No hay que buscar código por todos lados.

```
config/
├── brand.config.ts        ← Branding, textos, colores (COQUES actual)
├── brand.config.example.ts ← Template para copiar
└── features.config.ts      ← Activar/desactivar módulos
```

### Ejemplo de Personalización:

**Antes (hardcoded):**
```tsx
<h1>Bienvenido a Coques Pass</h1>
```

**Ahora (configurable):**
```tsx
import { BRAND_CONFIG } from '@/config/brand.config'

<h1>Bienvenido a {BRAND_CONFIG.branding.appName}</h1>
```

Para otra empresa solo hay que cambiar `brand.config.ts`:
```typescript
branding: {
  appName: 'Mi Empresa Rewards'  // ← Cambiás esto y listo
}
```

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Autenticación:** NextAuth.js
- **Estilos:** Tailwind CSS
- **Hosting:** Vercel
- **Emails:** Brevo / Resend

### Estructura del Proyecto

```
fidelizacion-zona/
├── config/                    ← ⭐ CONFIGURACIÓN (personalizar aquí)
│   ├── brand.config.ts
│   ├── brand.config.example.ts
│   └── features.config.ts
│
├── docs/template/             ← ⭐ DOCUMENTACIÓN para nuevos clientes
│   ├── README-PARA-NUEVO-CLIENTE.md
│   └── CHECKLIST-PERSONALIZACION.md
│
├── src/
│   ├── app/                   ← Páginas y rutas
│   ├── components/            ← Componentes reutilizables
│   ├── lib/                   ← Utilidades y helpers
│   └── types/                 ← Definiciones TypeScript
│
├── public/
│   ├── brand/                 ← ⭐ ASSETS (reemplazar logos aquí)
│   ├── icons/                 ← Íconos PWA
│   └── ...
│
├── prisma/
│   ├── schema.prisma          ← Esquema de base de datos
│   └── migrations/            ← Migraciones
│
└── scripts/                   ← Scripts SQL útiles
```

---

## 📦 Módulos y Funcionalidades

### Core (Siempre activos)

- ✅ Registro/Login de usuarios
- ✅ Perfil de usuario
- ✅ QR de fidelización
- ✅ Sistema de visitas
- ✅ Historial de actividad

### Opcionales (Configurable en `features.config.ts`)

- 🎯 Sistema de niveles
- 🎁 Beneficios automáticos
- 🏆 Sistema de logros
- 🪑 Gestión de mesas
- 📊 Presupuestos
- 🎉 Eventos especiales
- 💬 Feedback de clientes
- 🔔 Push notifications
- 🛒 WooCommerce
- 🚗 DeltaWash (lavadero)

---

## 💼 Casos de Uso

Este sistema funciona para:

### 🍰 Pastelerías / Cafeterías
- ✅ Visitas frecuentes
- ✅ Beneficios como "café gratis"
- ✅ Pedidos de tortas online (WooCommerce)
- ✅ Gestión de mesas

### 🍕 Restaurantes
- ✅ Programa de puntos por visitas
- ✅ Descuentos por nivel
- ✅ Gestión de mesas y sesiones
- ✅ Presupuestos para eventos

### 🚗 Lavaderos
- ✅ Tracking de lavados
- ✅ Paquetes de servicios
- ✅ Integración con sistemas externos

### 🏪 Retail / Tiendas
- ✅ Acumulación de puntos
- ✅ Beneficios por nivel
- ✅ Integración con tienda online

### 💇 Servicios (Peluquerías, Spas, etc.)
- ✅ Turnos/visitas
- ✅ Programa de fidelización
- ✅ Beneficios especiales

---

## 🎯 Para Desarrolladores

### Clonar y Configurar

```bash
# Clonar
git clone [URL] mi-proyecto
cd mi-proyecto/fidelizacion-zona

# Instalar dependencias
npm install

# Configurar
cp config/brand.config.example.ts config/brand.config.ts
cp .env.example .env

# Editar .env con tu database URL y otras variables

# Generar cliente Prisma
npx prisma generate

# Migrar base de datos
npx prisma migrate deploy

# Correr en desarrollo
npm run dev
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Producción
npm start

# Linting
npm run lint

# Formatear código
npm run format

# Prisma Studio (explorar DB)
npx prisma studio

# Generar nueva migración
npx prisma migrate dev --name nombre_migracion
```

---

## 🔧 Personalización Avanzada

### Añadir Nuevo Campo de Configuración

1. Editá `config/brand.config.ts`:
```typescript
export const BRAND_CONFIG = {
  // ... existing config
  
  // Nuevo campo
  miNuevoCampo: {
    valor: 'algo'
  }
}
```

2. Usalo en cualquier componente:
```tsx
import { BRAND_CONFIG } from '@/config/brand.config'

function MiComponente() {
  return <div>{BRAND_CONFIG.miNuevoCampo.valor}</div>
}
```

### Crear Nueva Feature

1. Agregá flag en `config/features.config.ts`:
```typescript
export const FEATURES_CONFIG = {
  // ...
  miNuevaFeature: true
}
```

2. Usala condicionalmente:
```tsx
import { FEATURES_CONFIG } from '@/config/features.config'

{FEATURES_CONFIG.miNuevaFeature && (
  <MiNuevoComponente />
)}
```

---

## 🎨 Tematización y Estilos

### Colores

Los colores están configurados en `brand.config.ts` usando clases de Tailwind:

```typescript
colors: {
  primary: 'blue',    // bg-blue-500, text-blue-600, etc.
  secondary: 'orange',
  accent: 'purple',
}
```

Para aplicar:
```tsx
<button className={`bg-${BRAND_CONFIG.branding.colors.primary}-600`}>
  Botón
</button>
```

---

## 📱 PWA (Progressive Web App)

El sistema se puede instalar como app nativa en celulares y computadoras.

### Manifests

- `public/manifest.json` - Para app de clientes
- `public/manifest-staff.json` - Para app de staff

Ambos se personalizan automáticamente según `brand.config.ts`

---

## 🔐 Seguridad

### Variables Sensibles

Nunca subir a Git:
- ❌ `.env` (configuración local)
- ❌ `config/brand.config.ts` (puede contener info sensible)

Siempre commitear:
- ✅ `.env.example` (template)
- ✅ `config/brand.config.example.ts` (template)

### Autenticación

- JWT para sesiones de clientes
- Admin Key para panel admin
- API Keys para locales
- Google OAuth (opcional)
- Passkeys/biométrica (opcional)

---

## 📊 Base de Datos

### Modelos Principales

- `Cliente` - Usuarios del programa
- `Nivel` - Niveles del programa (Bronce, Plata, Oro)
- `Beneficio` - Beneficios disponibles
- `EventoScan` - Registro de visitas/escaneos
- `Local` - Locales/sucursales
- `Mesa` - Mesas del local
- `Presupuesto` - Presupuestos generados
- `EventoEspecial` - Promociones especiales
- `Logro` - Achievements

Ver `prisma/schema.prisma` para el esquema completo.

---

## 🚀 Deploy

### Vercel (Recomendado)

1. Pusheá código a GitHub
2. Importá proyecto en Vercel
3. Configurá Environment Variables
4. Deploy automático

### Otras opciones

- AWS
- Google Cloud
- Digital Ocean
- Railway
- Render

---

## 📧 Soporte

### Para nuevos clientes:

Revisá la documentación en `docs/template/`:
- `README-PARA-NUEVO-CLIENTE.md` - Guía completa
- `CHECKLIST-PERSONALIZACION.md` - Qué personalizar

### Para desarrolladores:

Revisá el código y los comentarios. La mayoría de archivos tienen documentación inline.

---

## 📝 Licencia

[DEFINIR LICENCIA - MIT / Comercial / Otro]

---

## 🎉 Credits

Sistema desarrollado originalmente para Coques Pastelería.
Template white-label preparado para reutilización.

---

## 🔄 Versiones

### v1.0.0 - Template Inicial
- Sistema completo de fidelización
- Configuración centralizada
- Documentación para nuevos clientes
- Listo para personalizar

---

## 🗺️ Roadmap

**Próximas mejoras:**
- [ ] Panel de configuración web (sin editar archivos)
- [ ] Script de setup automatizado
- [ ] Multi-tenant (un deploy para múltiples empresas)
- [ ] Más integraciones (Shopify, Mercado Pago, etc.)
- [ ] Temas visuales predefinidos
- [ ] Marketplace de plugins

---

## 💡 FAQ

### ¿Puedo usar esto comercialmente?
[DEFINIR según licencia]

### ¿Necesito ser programador?
No. Con seguir la guía [`README-PARA-NUEVO-CLIENTE.md`](docs/template/README-PARA-NUEVO-CLIENTE.md) es suficiente.

### ¿Puedo modificar el código?
Sí, es totalmente personalizable.

### ¿Cuánto cuesta mantenerlo?
Los servicios free tier suelen ser suficientes:
- Vercel: Gratis
- Neon DB: Gratis hasta 3GB
- Brevo: Gratis hasta 300 emails/día

### ¿Funciona para mi tipo de negocio?
Si tenés clientes frecuentes que querés fidelizar, probablemente sí.

---

## 🌟 Showcase

**Implementaciones exitosas:**
- Coques Pastelería (Argentina)
- [Tu empresa puede ser la próxima]

---

## 🤝 Contribuciones

[DEFINIR política de contribuciones]

---

¿Listo para empezar? 👉 [`docs/template/README-PARA-NUEVO-CLIENTE.md`](docs/template/README-PARA-NUEVO-CLIENTE.md)
