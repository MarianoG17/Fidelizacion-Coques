// src/lib/cache.ts
// Sistema de cache frontend con TTL (Time To Live)

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // en minutos
}

export class FrontendCache {
  private static readonly PREFIX = 'fz_cache_'

  /**
   * Guarda datos en cache con TTL
   * @param key Clave única del cache
   * @param data Datos a guardar
   * @param ttlMinutes Tiempo de vida en minutos (default: 120 = 2 horas)
   */
  static set<T>(key: string, data: T, ttlMinutes: number = 120): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes
      }
      localStorage.setItem(
        this.PREFIX + key,
        JSON.stringify(entry)
      )
    } catch (error) {
      console.warn('[FrontendCache] Error guardando en cache:', error)
      // Si localStorage está lleno, limpiar cache antiguo
      this.clearExpired()
    }
  }

  /**
   * Obtiene datos del cache si no han expirado
   * @param key Clave del cache
   * @returns Datos o null si no existen o expiraron
   */
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key)
      if (!item) return null

      const entry: CacheEntry<T> = JSON.parse(item)
      const now = Date.now()
      const age = (now - entry.timestamp) / 1000 / 60 // minutos

      // Verificar si expiró
      if (age > entry.ttl) {
        this.remove(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.warn('[FrontendCache] Error leyendo cache:', error)
      return null
    }
  }

  /**
   * Elimina una entrada específica del cache
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key)
    } catch (error) {
      console.warn('[FrontendCache] Error eliminando del cache:', error)
    }
  }

  /**
   * Limpia todas las entradas de cache expiradas
   */
  static clearExpired(): void {
    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()

      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          const item = localStorage.getItem(key)
          if (item) {
            try {
              const entry: CacheEntry<any> = JSON.parse(item)
              const age = (now - entry.timestamp) / 1000 / 60
              if (age > entry.ttl) {
                localStorage.removeItem(key)
              }
            } catch {
              // Si no se puede parsear, eliminar
              localStorage.removeItem(key)
            }
          }
        }
      })
    } catch (error) {
      console.warn('[FrontendCache] Error limpiando cache expirado:', error)
    }
  }

  /**
   * Limpia TODO el cache de la aplicación
   */
  static clearAll(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('[FrontendCache] Error limpiando todo el cache:', error)
    }
  }

  /**
   * Obtiene la edad del cache en minutos
   */
  static getAge(key: string): number | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key)
      if (!item) return null

      const entry: CacheEntry<any> = JSON.parse(item)
      const now = Date.now()
      return (now - entry.timestamp) / 1000 / 60
    } catch {
      return null
    }
  }

  /**
   * Verifica si existe cache válido
   */
  static has(key: string): boolean {
    return this.get(key) !== null
  }
}
