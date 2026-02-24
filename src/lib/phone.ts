// src/lib/phone.ts
/**
 * Normalización de teléfonos argentinos
 * 
 * En Argentina hay dos formatos comunes:
 * - Moderno: 11 1234-5678 (10 dígitos, empieza con 11)
 * - Legacy: 15 1234-5678 (10 dígitos, empieza con 15)
 * 
 * Ambos representan el MISMO número (el 15 es redundante/legacy)
 * 
 * Esta función normaliza ambos formatos a 11XXXXXXXX
 */

/**
 * Normaliza un número de teléfono argentino a formato estándar
 * 
 * @param phone - Teléfono en cualquier formato
 * @returns Teléfono normalizado (11XXXXXXXX) o null si es inválido
 * 
 * @example
 * normalizarTelefono("1112345678")     // "1112345678"
 * normalizarTelefono("1512345678")     // "1112345678" (convierte 15 → 11)
 * normalizarTelefono("11 1234-5678")   // "1112345678"
 * normalizarTelefono("15 1234-5678")   // "1112345678"
 * normalizarTelefono("+5491112345678") // "1112345678"
 * normalizarTelefono("+5491512345678") // "1112345678"
 */
export function normalizarTelefono(phone: string): string | null {
    if (!phone) return null

    // Quitar todos los caracteres que no sean dígitos
    let cleaned = phone.replace(/\D/g, '')

    // Si empieza con 549 (código de país), quitarlo
    if (cleaned.startsWith('549')) {
        cleaned = cleaned.substring(3)
    }

    // Si empieza con 54 (código de país sin el 9), quitarlo
    if (cleaned.startsWith('54')) {
        cleaned = cleaned.substring(2)
    }

    // Ahora deberíamos tener 10 dígitos empezando con 11 o 15
    if (cleaned.length !== 10) {
        console.warn(`[normalizarTelefono] Longitud inválida: ${cleaned} (${cleaned.length} dígitos)`)
        return null
    }

    // Si empieza con 15, convertir a 11
    if (cleaned.startsWith('15')) {
        cleaned = '11' + cleaned.substring(2)
    }

    // Verificar que ahora empiece con 11
    if (!cleaned.startsWith('11')) {
        console.warn(`[normalizarTelefono] No empieza con 11 o 15: ${cleaned}`)
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
