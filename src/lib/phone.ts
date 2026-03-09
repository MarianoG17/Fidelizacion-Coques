// src/lib/phone.ts
/**
 * Normalización de teléfonos - VERSIÓN FLEXIBLE
 *
 * Acepta teléfonos de:
 * - CABA (Argentina): 11 1234-5678 (10 dígitos, empieza con 11)
 * - Interior (Argentina): 3456 123456 (códigos de área como 341, 351, 381, etc.)
 * - Internacionales: +1 234 567 8900, +52 1 345 678 9012, etc.
 *
 * La función normaliza el número a un formato consistente para guardarlo en la DB.
 */

/**
 * Normaliza un número de teléfono a formato estándar
 *
 * FLEXIBILIDAD: Ahora acepta números del interior de Argentina y de otros países
 *
 * @param phone - Teléfono en cualquier formato
 * @returns Teléfono normalizado o null si es inválido
 *
 * @example
 * // CABA (Argentina)
 * normalizarTelefono("1112345678")     // "1112345678"
 * normalizarTelefono("1512345678")     // "1112345678" (convierte 15 → 11)
 * normalizarTelefono("+5491112345678") // "1112345678"
 *
 * // Interior (Argentina)
 * normalizarTelefono("3456268265")     // "3456268265" (código de área 3456)
 * normalizarTelefono("+543456268265")  // "3456268265"
 * normalizarTelefono("341 1234567")    // "3411234567" (Rosario)
 *
 * // Internacionales
 * normalizarTelefono("+1234567890")    // "+1234567890"
 * normalizarTelefono("+52 1 333 4567890") // "+521333567890"
 */
export function normalizarTelefono(phone: string): string | null {
    if (!phone) return null

    // Guardar si empezaba con + para detectar formato internacional
    const hasPlus = phone.trim().startsWith('+')

    // Quitar todos los caracteres que no sean dígitos o +
    let cleaned = phone.replace(/[^\d+]/g, '')

    // Validación mínima: al menos 8 dígitos (números cortos internacionales)
    const digitsOnly = cleaned.replace(/\D/g, '')
    if (digitsOnly.length < 8) {
        console.warn(`[normalizarTelefono] Muy corto: ${cleaned} (${digitsOnly.length} dígitos)`)
        return null
    }

    // CASO 1: Número con + al inicio → INTERNACIONAL (no argentino)
    if (hasPlus && cleaned.startsWith('+')) {
        // Verificar si es argentino (+54...)
        const digitsAfterPlus = cleaned.substring(1)

        if (digitsAfterPlus.startsWith('54')) {
            // Es argentino, procesarlo como tal
            cleaned = digitsAfterPlus
        } else {
            // Es internacional (no argentino), dejarlo con el +
            return cleaned // +1234567890, +52133345678, etc.
        }
    }

    // CASO 2: Número argentino - normalizar
    // Quitar código de país si existe (54)
    if (cleaned.startsWith('549')) {
        // +549 11 XXXX-XXXX (celular CABA con 9)
        cleaned = cleaned.substring(3)
    } else if (cleaned.startsWith('54')) {
        // +54 11 XXXX-XXXX o +54 341 XXXX-XXX (sin el 9)
        cleaned = cleaned.substring(2)
    }

    // Ahora cleaned debería tener solo dígitos argentinos
    // Pueden ser:
    // - 10 dígitos empezando con 11 o 15 (CABA)
    // - 10 dígitos con otro código de área (Interior)
    // - Más dígitos si es formato extraño

    // Si empieza con 15, convertir a 11 (legacy CABA)
    if (cleaned.startsWith('15') && cleaned.length === 10) {
        cleaned = '11' + cleaned.substring(2)
    }

    // Validar longitud razonable (8 a 15 dígitos)
    if (cleaned.length < 8 || cleaned.length > 15) {
        console.warn(`[normalizarTelefono] Longitud fuera de rango: ${cleaned} (${cleaned.length} dígitos)`)
        return null
    }

    return cleaned
}

/**
 * Convierte un teléfono normalizado a formato E.164 para uso en APIs
 * 
 * @param phone - Teléfono normalizado (11XXXXXXXX)
 * @returns Teléfono en formato E.164 (+5491112345678)
 * 
 * @example
 * toE164("1112345678") // "+5491112345678"
 */
export function toE164(phone: string): string {
    const normalized = normalizarTelefono(phone)
    if (!normalized) {
        throw new Error(`Teléfono inválido: ${phone}`)
    }
    return `+549${normalized}`
}

/**
 * Formatea un teléfono para mostrar al usuario
 * 
 * @param phone - Teléfono en cualquier formato
 * @returns Teléfono formateado (11 1234-5678)
 * 
 * @example
 * formatearTelefono("1112345678")     // "11 1234-5678"
 * formatearTelefono("1512345678")     // "11 1234-5678"
 * formatearTelefono("+5491112345678") // "11 1234-5678"
 */
export function formatearTelefono(phone: string): string {
    const normalized = normalizarTelefono(phone)
    if (!normalized) return phone

    // 11 1234-5678
    const area = normalized.substring(0, 2)
    const prefix = normalized.substring(2, 6)
    const suffix = normalized.substring(6, 10)

    return `${area} ${prefix}-${suffix}`
}
