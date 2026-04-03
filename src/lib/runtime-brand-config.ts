/**
 * runtime-brand-config.ts
 *
 * Utilidad para leer la configuración de marca desde la base de datos.
 * Para usar en nuevos deployments (white-label).
 *
 * IMPORTANTE: El app de Coques NO usa esto — sigue leyendo de brand.config.ts
 * y features.config.ts como siempre. Esta utilidad es para nuevos clientes.
 *
 * Uso en un Server Component:
 *   import { getRuntimeBrandConfig } from '@/lib/runtime-brand-config'
 *   const config = await getRuntimeBrandConfig()
 *
 * Uso en una API route:
 *   const config = await getRuntimeBrandConfig()
 *   if (config.moduloMesas) { ... }
 */

import { prisma } from '@/lib/prisma'

export interface RuntimeBrandConfig {
    // Empresa
    nombreEmpresa: string
    nombreCompleto: string | null
    slogan: string | null
    descripcion: string | null
    dominio: string | null
    sitioWeb: string | null

    // Branding
    appNombreClientes: string
    appNombreStaff: string
    appNombreAdmin: string
    programaNombre: string
    colorPrimario: string
    colorSecundario: string
    colorAcento: string
    logoUrl: string | null
    faviconUrl: string | null

    // Contacto
    telefono: string | null
    emailContacto: string | null
    direccion: string | null

    // Redes
    instagram: string | null
    facebook: string | null
    whatsapp: string | null
    googleMapsReviews: string | null

    // Emails
    emailFrom: string | null
    emailFromNombre: string | null
    emailReplyTo: string | null

    // Módulos
    moduloNiveles: boolean
    moduloBeneficios: boolean
    moduloLogros: boolean
    moduloReferidos: boolean
    moduloMesas: boolean
    moduloPresupuestos: boolean
    moduloEventos: boolean
    moduloFeedback: boolean
    moduloPushNotif: boolean
    moduloGoogleOAuth: boolean
    moduloPasskeys: boolean
    moduloWoocommerce: boolean
    moduloDeltawash: boolean
    moduloExportExcel: boolean

    // Textos
    textoBienvenida: string | null
    textoQR: string | null

    // Estado
    setupCompleto: boolean
}

// Valores por defecto para cuando la tabla está vacía
const DEFAULTS: RuntimeBrandConfig = {
    nombreEmpresa: 'Mi Empresa',
    nombreCompleto: null,
    slogan: null,
    descripcion: null,
    dominio: null,
    sitioWeb: null,
    appNombreClientes: 'Mi App',
    appNombreStaff: 'Mi App Staff',
    appNombreAdmin: 'Mi App Admin',
    programaNombre: 'Mi Programa',
    colorPrimario: 'blue',
    colorSecundario: 'orange',
    colorAcento: 'purple',
    logoUrl: null,
    faviconUrl: null,
    telefono: null,
    emailContacto: null,
    direccion: null,
    instagram: null,
    facebook: null,
    whatsapp: null,
    googleMapsReviews: null,
    emailFrom: null,
    emailFromNombre: null,
    emailReplyTo: null,
    moduloNiveles: true,
    moduloBeneficios: true,
    moduloLogros: true,
    moduloReferidos: false,
    moduloMesas: false,
    moduloPresupuestos: false,
    moduloEventos: false,
    moduloFeedback: true,
    moduloPushNotif: true,
    moduloGoogleOAuth: false,
    moduloPasskeys: false,
    moduloWoocommerce: false,
    moduloDeltawash: false,
    moduloExportExcel: true,
    textoBienvenida: null,
    textoQR: null,
    setupCompleto: false,
}

// Cache en memoria para evitar queries repetidas en el mismo request cycle
let cache: { config: RuntimeBrandConfig; ts: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

/**
 * Lee la configuración de marca desde la DB con cache de 5 minutos.
 * Si no hay configuración en la DB, devuelve los valores por defecto.
 */
export async function getRuntimeBrandConfig(): Promise<RuntimeBrandConfig> {
    // Usar cache si es reciente
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
        return cache.config
    }

    try {
        const row = await (prisma as any).configuracionMarca.findFirst()
        const config: RuntimeBrandConfig = row ? { ...DEFAULTS, ...row } : { ...DEFAULTS }
        cache = { config, ts: Date.now() }
        return config
    } catch (error) {
        // Si la tabla no existe aún (antes de migrar), devolver defaults
        console.warn('[runtime-brand-config] No se pudo leer ConfiguracionMarca:', error)
        return { ...DEFAULTS }
    }
}

/**
 * Invalida el cache manualmente.
 * Llamar esto desde el API de PUT para que los cambios se reflejen de inmediato.
 */
export function invalidarCacheBrandConfig() {
    cache = null
}
