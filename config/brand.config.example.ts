/**
 * 🎨 TEMPLATE DE CONFIGURACIÓN DE MARCA
 * 
 * ═══════════════════════════════════════════════════════════════
 * 📋 INSTRUCCIONES PARA NUEVO CLIENTE:
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Copiá este archivo y renombralo a: brand.config.ts
 * 2. Reemplazá TODOS los valores con la información de tu empresa
 * 3. NO borres ningún campo (dejalo vacío si no aplica)
 * 4. Guardá y commitea el nuevo brand.config.ts
 * 
 * ═══════════════════════════════════════════════════════════════
 */

export const BRAND_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // 🏢 INFORMACIÓN DE LA EMPRESA
    // ═══════════════════════════════════════════════════════════════
    company: {
        name: 'MI_EMPRESA',                          // ← Nombre corto (ej: "Coques", "La Esquina", etc.)
        fullName: 'MI_EMPRESA_NOMBRE_COMPLETO',      // ← Nombre legal completo
        tagline: 'TU_TAGLINE_AQUI',                  // ← Eslogan/descripción corta
        description: 'DESCRIPCION_DE_TU_EMPRESA',    // ← Descripción más larga
        domain: 'app.miempresa.com',                 // ← Dominio de la app (sin https://)
        website: 'https://miempresa.com',            // ← Sitio web principal
    },

    // ═══════════════════════════════════════════════════════════════
    // 🎨 BRANDING VISUAL
    // ═══════════════════════════════════════════════════════════════
    branding: {
        // Nombre de las apps
        appName: 'MI_EMPRESA_APP',                   // ← Nombre de la app para clientes (ej: "Coques Pass")
        staffAppName: 'MI_EMPRESA_STAFF',            // ← Nombre de la app para staff (ej: "Coques Staff")
        adminAppName: 'MI_EMPRESA_ADMIN',            // ← Nombre del panel admin (ej: "Coques Admin")

        // Colores (formato Tailwind CSS)
        // Opciones: blue, purple, green, red, orange, yellow, pink, indigo, teal, cyan
        colors: {
            primary: 'blue',                           // ← Color principal (botones, enlaces, etc.)
            secondary: 'orange',                       // ← Color secundario (acentos, highlights)
            accent: 'purple',                          // ← Color de acento (badges, notificaciones)
        },

        // Assets (rutas relativas desde /public)
        logo: '/brand/logo.svg',                     // ← Logo principal (reemplazar archivo)
        logoSmall: '/brand/logo-small.svg',          // ← Logo pequeño/ícono
        favicon: '/favicon.ico',                     // ← Favicon del sitio
        ogImage: '/og-image.jpg',                    // ← Imagen para compartir en redes sociales (1200x630px)
    },

    // ═══════════════════════════════════════════════════════════════
    // 🎯 PROGRAMA DE FIDELIZACIÓN
    // ═══════════════════════════════════════════════════════════════
    fidelizacion: {
        // Nombre del programa
        programName: 'MI_PROGRAMA_PUNTOS',           // ← Nombre del programa (ej: "Coques Points", "Rewards Club")

        // Nombres de niveles
        // IMPORTANTE: Estos deben coincidir con los nombres en la base de datos
        niveles: {
            nivel1: 'Bronce',                          // ← Nombre del nivel básico
            nivel2: 'Plata',                           // ← Nombre del nivel medio
            nivel3: 'Oro',                             // ← Nombre del nivel premium
        },

        // Textos del programa
        texts: {
            welcome: '¡Bienvenido a [NOMBRE PROGRAMA]!',
            welcomeSubtitle: 'Acumulá visitas y disfrutá de beneficios exclusivos',
            howItWorks: 'Cada visita suma puntos. Alcanzá niveles superiores para más beneficios.',
            scanQR: 'Mostrá este QR en el mostrador para sumar tu visita',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // 📧 EMAILS
    // ═══════════════════════════════════════════════════════════════
    emails: {
        fromEmail: 'noreply@mail.miempresa.com',     // ← Email remitente (configurar en Brevo/Resend)
        fromName: 'MI_EMPRESA',                      // ← Nombre que aparece como remitente
        replyTo: 'info@miempresa.com',               // ← Email para respuestas

        // Textos de emails
        templates: {
            welcome: {
                subject: '¡Bienvenido a [NOMBRE PROGRAMA]! 🎉',
                greeting: 'Hola {{nombre}}',
            },
            passwordReset: {
                subject: 'Recuperá tu contraseña - [EMPRESA]',
            },
            beneficio: {
                subject: '🎁 ¡Nuevo beneficio desbloqueado!',
            },
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // 📱 REDES SOCIALES
    // ═══════════════════════════════════════════════════════════════
    social: {
        instagram: 'https://instagram.com/miempresa',
        facebook: 'https://facebook.com/miempresa',
        whatsapp: '+5491112345678',                  // ← Número de WhatsApp con código de país
    },

    // ═══════════════════════════════════════════════════════════════
    // 📍 CONTACTO
    // ═══════════════════════════════════════════════════════════════
    contact: {
        phone: '+54 11 1234-5678',                   // ← Teléfono de contacto
        email: 'info@miempresa.com',                 // ← Email de contacto
        address: 'Dirección del local principal',    // ← Dirección física
    },
}

// ═══════════════════════════════════════════════════════════════
// 🔧 EXPORTACIÓN DE TIPOS (NO MODIFICAR)
// ═══════════════════════════════════════════════════════════════
export type BrandConfig = typeof BRAND_CONFIG
