/**
 * Construye los headers de autenticación para WooCommerce API.
 * Incluye el header secreto para el WAF de Cloudflare (x-app-secret).
 * Configurar WOO_APP_SECRET en Vercel y la regla WAF en Cloudflare para
 * bloquear requests a /wp-json/wc/v3/* que no tengan este header.
 */
export function buildWooHeaders(wooKey: string, wooSecret: string): Record<string, string> {
  const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64')
  const headers: Record<string, string> = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'User-Agent': 'FidelizacionApp/1.0',
  }
  if (process.env.WOO_APP_SECRET) {
    headers['x-app-secret'] = process.env.WOO_APP_SECRET
  }
  return headers
}
