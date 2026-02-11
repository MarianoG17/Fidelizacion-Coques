// src/lib/otp.ts
import { authenticator } from 'otplib'

// Configuración global del autenticador
authenticator.options = {
  step: Number(process.env.OTP_STEP) || 30,      // segundos por ventana
  window: Number(process.env.OTP_WINDOW) || 1,   // ventanas de tolerancia (+/-)
  digits: 6,
}

/**
 * Genera un secreto TOTP para un nuevo cliente.
 * Se almacena encriptado en la DB. Solo se llama al activar el cliente.
 */
export function generarSecretoOTP(): string {
  return authenticator.generateSecret()
}

/**
 * Genera el token OTP actual para un cliente.
 * El Pass del cliente llama a esta función cada ~30 segundos.
 */
export function generarToken(secret: string): string {
  return authenticator.generate(secret)
}

/**
 * Valida un token OTP enviado desde el local.
 * Usa ventana de tolerancia para cubrir latencia de red.
 */
export function validarToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret })
}

/**
 * Devuelve el tiempo restante hasta que venza el OTP actual (en segundos).
 * Útil para mostrar countdown en el Pass del cliente.
 */
export function tiempoRestante(): number {
  const step = authenticator.options.step as number || 30
  return step - (Math.floor(Date.now() / 1000) % step)
}

/**
 * Genera la URL otpauth para generar el QR.
 * El QR no se usa como app de autenticación tradicional —
 * lo genera el servidor en cada request para que sea dinámico.
 */
export function generarOtpauthUrl(secret: string, clienteNombre: string): string {
  return authenticator.keyuri(
    clienteNombre,
    process.env.NEXT_PUBLIC_APP_NAME || 'FidelizacionZona',
    secret
  )
}
