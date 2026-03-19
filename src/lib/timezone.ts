// src/lib/timezone.ts
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { format, parseISO, addDays } from 'date-fns'

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'

/**
 * Obtiene la fecha/hora actual en timezone de Argentina
 * Útil para eventos que deben guardarse con timestamp local, no UTC
 */
export function getDatetimeArgentina(): Date {
  return toZonedTime(new Date(), ARGENTINA_TZ)
}

/**
 * Convierte una fecha a timezone de Argentina
 */
export function toArgentinaTime(date: Date): Date {
  return toZonedTime(date, ARGENTINA_TZ)
}

/**
 * Formatea una fecha en formato argentino: DD/MM/YYYY
 */
export function formatDateArgentina(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(dateObj, ARGENTINA_TZ, 'dd/MM/yyyy')
}

/**
 * Formatea una fecha con hora en Argentina: DD/MM/YYYY HH:mm
 */
export function formatDateTimeArgentina(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(dateObj, ARGENTINA_TZ, 'dd/MM/yyyy HH:mm')
}

/**
 * Obtiene la fecha de inicio del día actual en Argentina (00:00:00)
 */
export function getStartOfDayArgentina(): Date {
  const now = toZonedTime(new Date(), ARGENTINA_TZ)
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Obtiene la fecha de fin del día actual en Argentina (23:59:59)
 */
export function getEndOfDayArgentina(): Date {
  const now = toZonedTime(new Date(), ARGENTINA_TZ)
  now.setHours(23, 59, 59, 999)
  return now
}

/**
 * Verifica si una fecha está en el día actual de Argentina
 */
export function isTodayArg(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const today = getStartOfDayArgentina()
  const tomorrow = addDays(today, 1)
  
  return dateObj >= today && dateObj < tomorrow
}
