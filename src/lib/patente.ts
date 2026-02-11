// src/lib/patente.ts
// Funciones de normalización y validación de patentes argentinas

/**
 * Normaliza una patente argentina a formato estándar
 * ABC123 o AB123CD → ABC123 / AB123CD (mayúsculas, sin espacios/guiones)
 */
export function normalizarPatente(patente: string): string {
  if (!patente) return ''
  
  // Remover espacios, guiones, puntos
  let normalizada = patente
    .toUpperCase()
    .replace(/[\s\-\.]/g, '')
  
  return normalizada
}

/**
 * Valida formato de patente argentina
 * Soporta:
 * - Formato viejo: ABC123 (3 letras + 3 números)
 * - Formato nuevo (Mercosur): AB123CD (2 letras + 3 números + 2 letras)
 */
export function validarPatente(patente: string): boolean {
  const normalizada = normalizarPatente(patente)
  
  // Formato viejo: 3 letras + 3 números
  const formatoViejo = /^[A-Z]{3}\d{3}$/
  
  // Formato nuevo Mercosur: 2 letras + 3 números + 2 letras
  const formatoNuevo = /^[A-Z]{2}\d{3}[A-Z]{2}$/
  
  return formatoViejo.test(normalizada) || formatoNuevo.test(normalizada)
}

/**
 * Formatea una patente para display visual
 * ABC123 → ABC 123
 * AB123CD → AB 123 CD
 */
export function formatearPatenteDisplay(patente: string): string {
  const normalizada = normalizarPatente(patente)
  
  if (/^[A-Z]{3}\d{3}$/.test(normalizada)) {
    // Formato viejo: ABC 123
    return `${normalizada.slice(0, 3)} ${normalizada.slice(3)}`
  }
  
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(normalizada)) {
    // Formato nuevo: AB 123 CD
    return `${normalizada.slice(0, 2)} ${normalizada.slice(2, 5)} ${normalizada.slice(5)}`
  }
  
  return normalizada
}
