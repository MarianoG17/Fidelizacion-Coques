// src/hooks/usePasskey.ts
'use client'

import { useState } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types'

/**
 * Hook para gestionar passkeys (autenticación biométrica)
 */
export function usePasskey() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Registrar una nueva credencial biométrica
     */
    const registrar = async (deviceName?: string) => {
        try {
            setLoading(true)
            setError(null)

            // Verificar soporte de WebAuthn
            if (!window?.PublicKeyCredential) {
                throw new Error('Tu dispositivo no soporta autenticación biométrica')
            }

            // Paso 1: Obtener opciones de registro del servidor
            console.log('[PASSKEY] Solicitando opciones de registro...')
            const optionsRes = await fetch('/api/auth/passkey/register-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!optionsRes.ok) {
                const data = await optionsRes.json()
                throw new Error(data.error || 'Error al iniciar registro')
            }

            const options: PublicKeyCredentialCreationOptionsJSON = await optionsRes.json()
            console.log('[PASSKEY] Opciones recibidas, solicitando biometría...')

            // Paso 2: Solicitar credencial biométrica al usuario
            const credential = await startRegistration(options)
            console.log('[PASSKEY] Credencial obtenida, verificando...')

            // Paso 3: Enviar credencial al servidor para verificación
            const verifyRes = await fetch('/api/auth/passkey/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credential,
                    deviceName: deviceName || 'Mi dispositivo'
                })
            })

            if (!verifyRes.ok) {
                const data = await verifyRes.json()
                throw new Error(data.error || 'Error al verificar credencial')
            }

            const result = await verifyRes.json()
            console.log('[PASSKEY] Registro exitoso:', result)

            return result
        } catch (err: any) {
            console.error('[PASSKEY] Error en registro:', err)

            // Mensajes de error amigables
            let errorMessage = 'Error al registrar biometría'

            if (err.name === 'NotAllowedError') {
                errorMessage = 'Operación cancelada. Intenta nuevamente.'
            } else if (err.name === 'InvalidStateError') {
                errorMessage = 'Esta credencial ya está registrada'
            } else if (err.name === 'NotSupportedError') {
                errorMessage = 'Tu dispositivo no soporta esta función'
            } else if (err.message) {
                errorMessage = err.message
            }

            setError(errorMessage)
            throw new Error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Login con credencial biométrica
     */
    const login = async () => {
        try {
            setLoading(true)
            setError(null)

            // Verificar soporte de WebAuthn
            if (!window?.PublicKeyCredential) {
                throw new Error('Tu dispositivo no soporta autenticación biométrica')
            }

            // Paso 1: Obtener opciones de autenticación del servidor
            console.log('[PASSKEY] Solicitando opciones de login...')
            const optionsRes = await fetch('/api/auth/passkey/login-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!optionsRes.ok) {
                const data = await optionsRes.json()
                throw new Error(data.error || 'Error al iniciar login')
            }

            const options: PublicKeyCredentialRequestOptionsJSON = await optionsRes.json()
            console.log('[PASSKEY] Opciones recibidas, solicitando biometría...')

            // Paso 2: Solicitar autenticación
            const credential = await startAuthentication(options)
            console.log('[PASSKEY] Autenticación obtenida, verificando...')

            // Paso 3: Verificar con servidor
            const verifyRes = await fetch('/api/auth/passkey/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential })
            })

            if (!verifyRes.ok) {
                const data = await verifyRes.json()
                throw new Error(data.error || 'Error al verificar credencial')
            }

            const data = await verifyRes.json()
            console.log('[PASSKEY] Login exitoso:', data.user)

            // Guardar token en localStorage
            if (data.token) {
                localStorage.setItem('fidelizacion_token', data.token)
                console.log('[PASSKEY] Token guardado en localStorage')
            }

            // IMPORTANTE: Crear sesión de NextAuth para que funcione con useSession()
            // Esto es necesario porque algunos componentes usan NextAuth
            console.log('[PASSKEY] Creando sesión de NextAuth...')
            const { signIn } = await import('next-auth/react')
            await signIn('credentials', {
                phone: data.user.phone,
                token: data.token,
                redirect: false
            })
            console.log('[PASSKEY] Sesión de NextAuth creada')

            return data
        } catch (err: any) {
            console.error('[PASSKEY] Error en login:', err)

            // Mensajes de error amigables
            let errorMessage = 'Error al autenticar con biometría'

            if (err.name === 'NotAllowedError') {
                errorMessage = 'Operación cancelada. Intenta nuevamente.'
            } else if (err.name === 'InvalidStateError') {
                errorMessage = 'No se encontraron credenciales registradas'
            } else if (err.name === 'NotSupportedError') {
                errorMessage = 'Tu dispositivo no soporta esta función'
            } else if (err.message) {
                errorMessage = err.message
            }

            setError(errorMessage)
            throw new Error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Verificar si el dispositivo soporta passkeys
     */
    const verificarSoporte = async (): Promise<boolean> => {
        try {
            if (!window?.PublicKeyCredential) {
                return false
            }

            // Verificar si soporta "conditional mediation" (autofill de passkeys)
            if (PublicKeyCredential.isConditionalMediationAvailable) {
                const available = await PublicKeyCredential.isConditionalMediationAvailable()
                return available
            }

            // Al menos soporta WebAuthn básico
            return true
        } catch (err) {
            console.error('[PASSKEY] Error verificando soporte:', err)
            return false
        }
    }

    return {
        registrar,
        login,
        verificarSoporte,
        loading,
        error,
    }
}
