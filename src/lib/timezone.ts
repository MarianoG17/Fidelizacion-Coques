// src/lib/timezone.ts
// Utilidades de zona horaria — siempre Argentina (UTC-3)
// Lección aprendida: el servidor Vercel corre en UTC. Usar estas funciones
// en lugar de new Date() directamente.

export const TIMEZONE = 'America/Argentina/Buenos_Aires'

/**
 * Fecha actual en Argentina como string YYYY-MM-DD
 */
export function getFechaArgentina(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  // en-CA usa formato YYYY-MM-DD, el más seguro para parsing
}

/**
 * DateTime actual en Argentina como objeto Date
 * Útil para comparar con startOf/endOf día
 */
export function getDatetimeArgentina(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }))
}

/**
 * Inicio del día actual en Argentina (00:00:00)
 */
export function getInicioHoyArgentina(): Date {
  const hoy = getDatetimeArgentina()
  hoy.setHours(0, 0, 0, 0)
  return hoy
}

/**
 * Inicio del día siguiente en Argentina (00:00:00 de mañana)
 */
export function getInicioMananaArgentina(): Date {
  const manana = getInicioHoyArgentina()
  manana.setDate(manana.getDate() + 1)
  return manana
}

/**
 * Hace N días desde hoy (inicio del día) en TZ Argentina
 */
export function getHaceNDias(n: number): Date {
  const fecha = getInicioHoyArgentina()
  fecha.setDate(fecha.getDate() - n)
  return fecha
}
