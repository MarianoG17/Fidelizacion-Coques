// src/lib/fetch-with-retry.ts

interface FetchWithRetryOptions extends RequestInit {
    maxRetries?: number
    retryDelay?: number
    timeout?: number
    onRetry?: (attempt: number, error: Error) => void
}

/**
 * Fetch con retry automático y timeout
 * 
 * @example
 * ```typescript
 * const data = await fetchWithRetry('/api/pass', {
 *   maxRetries: 3,
 *   timeout: 15000,
 *   headers: { Authorization: `Bearer ${token}` },
 *   onRetry: (attempt) => console.log(`Intento ${attempt}`)
 * })
 * ```
 */
export async function fetchWithRetry(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<Response> {
    const {
        maxRetries = 3,
        retryDelay = 1000,
        timeout = 15000,
        onRetry,
        ...fetchOptions
    } = options

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Crear AbortController para timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), timeout)

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            // Si es exitoso, retornar
            if (response.ok) {
                return response
            }

            // Si es 401, no reintentar (token inválido)
            if (response.status === 401) {
                throw new Error('NO_AUTH')
            }

            // Si es 404 o 400, no reintentar (error de cliente)
            if (response.status === 404 || response.status === 400) {
                throw new Error(`CLIENT_ERROR_${response.status}`)
            }

            // Para otros errores (500, 502, 503), reintentar
            lastError = new Error(`HTTP_${response.status}`)

        } catch (error: any) {
            lastError = error

            // Si es AbortError (timeout), reintentar
            if (error.name === 'AbortError') {
                console.warn(`[FetchRetry] Intento ${attempt}/${maxRetries} - Timeout`)
                lastError = new Error('TIMEOUT')
            }
            // Si es network error, reintentar
            else if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                console.warn(`[FetchRetry] Intento ${attempt}/${maxRetries} - Network error`)
                lastError = new Error('NETWORK_ERROR')
            }
            // Si es NO_AUTH, no reintentar
            else if (error.message === 'NO_AUTH') {
                throw error
            }
        }

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxRetries) {
            onRetry?.(attempt, lastError!)
            // Delay exponencial: 1s, 2s, 3s
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw lastError || new Error('ALL_RETRIES_FAILED')
}

/**
 * Wrapper JSON que usa fetchWithRetry
 * 
 * @example
 * ```typescript
 * const data = await fetchJSON<PassData>('/api/pass', {
 *   headers: { Authorization: `Bearer ${token}` }
 * })
 * ```
 */
export async function fetchJSON<T = any>(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<T> {
    const response = await fetchWithRetry(url, options)
    return response.json()
}
