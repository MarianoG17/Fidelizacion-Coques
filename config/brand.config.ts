/**
 * 🎨 CONFIGURACIÓN DE MARCA - COQUES
 * 
 * Este archivo contiene toda la información de branding de Coques.
 * Para personalizar para otra empresa, editá estos valores.
 */

export const BRAND_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // 🏢 INFORMACIÓN DE LA EMPRESA
    // ═══════════════════════════════════════════════════════════════
    company: {
        name: 'Coques',
        fullName: 'Coques Pastelería',
        tagline: 'Tu pastelería de confianza',
        description: 'Pastelería artesanal con más de X años de trayectoria',
        domain: 'app.coques.com.ar',
        website: 'https://coques.com.ar',
    },

    // ═══════════════════════════════════════════════════════════════
    // 🎨 BRANDING VISUAL
    // ═══════════════════════════════════════════════════════════════
    branding: {
        // Nombre de las apps
        appName: 'Coques Pass',
        staffAppName: 'Coques Staff',
        adminAppName: 'Coques Admin',

        // Colores (formato Tailwind CSS)
        colors: {
            primary: 'blue',      // Color principal (ej: blue, purple, green, etc.)
            secondary: 'orange',  // Color secundario
            accent: 'purple',     // Color de acento
        },

        // Assets
        logo: '/brand/logo.svg',
        logoSmall: '/brand/logo-small.svg',
        favicon: '/favicon.ico',
        ogImage: '/og-image.jpg',  // Imagen para compartir en redes sociales
    },

    // ═══════════════════════════════════════════════════════════════
    // 🎯 PROGRAMA DE FIDELIZACIÓN
    // ═══════════════════════════════════════════════════════════════
    fidelizacion: {
        // Nombre del programa
        programName: 'Coques Points',

        // Nombres de niveles (deben coincidir con lo que está en la DB)
        niveles: {
            nivel1: 'Bronce',
            nivel2: 'Plata',
            nivel3: 'Oro',
        },

        // Textos del programa
        texts: {
            welcome: '¡Bienvenido a Coques Points!',
            welcomeSubtitle: 'Acumulá visitas y disfrutá de beneficios exclusivos',
            howItWorks: 'Cada visita suma puntos. Alcanzá niveles superiores para más beneficios.',
            scanQR: 'Mostrá este QR en el mostrador para sumar tu visita',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // 📧 EMAILS
    // ═══════════════════════════════════════════════════════════════
    emails: {
        fromEmail: 'noreply@mail.coques.com.ar',
        fromName: 'Coques',
        replyTo: 'info@coques.com.ar',

        // Textos de emails
        templates: {
            welcome: {
                subject: '¡Bienvenido a Coques Points! 🎉',
                greeting: 'Hola {{nombre}}',
            },
            passwordReset: {
                subject: 'Recuperá tu contraseña - Coques',
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
        instagram: 'https://instagram.com/coques',
        facebook: 'https://facebook.com/coques',
        whatsapp: '+5491112345678',
    },

    // ═══════════════════════════════════════════════════════════════
    // 📍 CONTACTO
    // ═══════════════════════════════════════════════════════════════
    contact: {
        phone: '+54 11 1234-5678',
        email: 'info@coques.com.ar',
        address: 'Dirección del local principal',
    },
}

// ═══════════════════════════════════════════════════════════════
// 🔧 EXPORTACIÓN DE TIPOS (para TypeScript)
// ═══════════════════════════════════════════════════════════════
export type BrandConfig = typeof BRAND_CONFIG
