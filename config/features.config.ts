/**
 * ⚙️ CONFIGURACIÓN DE FUNCIONALIDADES - COQUES
 * 
 * Activá o desactivá módulos según las necesidades de tu negocio.
 */

export const FEATURES_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // 🎯 FUNCIONALIDADES CORE
    // ═══════════════════════════════════════════════════════════════

    // Sistema de niveles (Bronce, Plata, Oro)
    niveles: true,

    // Sistema de beneficios por nivel
    beneficios: true,

    // Sistema de logros/achievements
    logros: true,

    // Programa de referidos
    referidos: true,

    // QR de fidelización
    qrFidelizacion: true,

    // ═══════════════════════════════════════════════════════════════
    // 🏪 MÓDULOS DE LOCAL
    // ═══════════════════════════════════════════════════════════════

    // Gestión de mesas (para restaurantes/cafeterías)
    mesas: true,

    // Sistema de presupuestos
    presupuestos: true,

    // Eventos especiales (promociones, días especiales)
    eventosEspeciales: true,

    // Panel de staff (/local)
    panelStaff: true,

    // ═══════════════════════════════════════════════════════════════
    // 🛒 INTEGRACIONES EXTERNAS
    // ═══════════════════════════════════════════════════════════════

    // WooCommerce (tienda online de productos)
    woocommerce: true,

    // DeltaWash (integración lavadero)
    // NOTA: Específico para Coques, probablemente false para otros clientes
    deltawash: false,

    // ═══════════════════════════════════════════════════════════════
    // 💬 COMUNICACIÓN
    // ═══════════════════════════════════════════════════════════════

    // Sistema de feedback/encuestas
    feedback: true,

    // Notificaciones push (PWA)
    pushNotifications: true,

    // Envío de emails transaccionales
    emails: true,

    // ═══════════════════════════════════════════════════════════════
    // 🔐 AUTENTICACIÓN
    // ═══════════════════════════════════════════════════════════════

    // Google OAuth
    googleOAuth: true,

    // Autenticación biométrica (Passkeys/Face ID/Touch ID)
    passkeys: true,

    // Login con email/contraseña tradicional
    emailPassword: true,

    // ═══════════════════════════════════════════════════════════════
    // 📊 ADMIN
    // ═══════════════════════════════════════════════════════════════

    // Panel de administración completo
    panelAdmin: true,

    // Exportación de datos a Excel
    exportarExcel: true,

    // Conciliación con sistemas externos (ej: AyresIT)
    conciliacion: true,

    // ═══════════════════════════════════════════════════════════════
    // 📱 PWA
    // ═══════════════════════════════════════════════════════════════

    // Instalación como PWA (Progressive Web App)
    pwa: true,

    // Modo offline
    offline: true,

    // Actualización automática
    autoUpdate: true,
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS - Funciones auxiliares para verificar features
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si una feature está habilitada
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES_CONFIG): boolean {
    return FEATURES_CONFIG[feature] === true
}

/**
 * Obtiene todas las features habilitadas
 */
export function getEnabledFeatures(): string[] {
    return Object.entries(FEATURES_CONFIG)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature)
}

/**
 * Obtiene todas las features deshabilitadas
 */
export function getDisabledFeatures(): string[] {
    return Object.entries(FEATURES_CONFIG)
        .filter(([_, enabled]) => !enabled)
        .map(([feature]) => feature)
}

// ═══════════════════════════════════════════════════════════════
// 🔧 EXPORTACIÓN DE TIPOS
// ═══════════════════════════════════════════════════════════════
export type FeaturesConfig = typeof FEATURES_CONFIG
export type FeatureKey = keyof typeof FEATURES_CONFIG
