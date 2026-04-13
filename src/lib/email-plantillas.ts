// src/lib/email-plantillas.ts
// Helper para leer plantillas de email de la DB con fallback a defaults
import { prisma } from './prisma'

type PlantillaId = 'bienvenida' | 'reactivacion' | 'cumpleanos_7dias' | 'feedback_email'

interface Plantilla {
    asunto: string
    cuerpo: string
    activa: boolean
}

const DEFAULTS: Record<PlantillaId, Plantilla> = {
    bienvenida: {
        activa: true,
        asunto: '¡Bienvenido a Coques Bakery! 🎉',
        cuerpo: `Hola {{nombre}},

¡Gracias por registrarte en nuestro programa de fidelización! 🎉

Acumulá visitas y subí de nivel (Bronce → Plata → Oro), desbloqueá beneficios exclusivos y mostrá tu QR en el local para sumar puntos con cada visita.

🎁 Como regalo de bienvenida, en tu primer pedido de tortas por la web tenés un 10% de descuento automático.

📲 Para instalar la app en tu celular:
Android: Abrí en Chrome → menú ⋮ → "Agregar a pantalla de inicio"
iPhone: Abrí en Safari → botón compartir → "Agregar a pantalla de inicio"

¡Esperamos verte pronto!`,
    },
    reactivacion: {
        activa: true,
        asunto: '¡{{nombre}}, te extrañamos en Coques Bakery! ☕',
        cuerpo: `Hola {{nombre}},

Hace un tiempo que no te vemos por acá y lo extrañamos 🥐☕

Pasate cuando quieras — tus puntos te están esperando y seguís sumando beneficios con cada visita.

¡Acordate de mostrar tu QR al llegar para sumar la visita! 📱

¡Esperamos verte pronto!`,
    },
    cumpleanos_7dias: {
        activa: true,
        asunto: '{{nombre}}, ¡tu semana de cumple arranca en 7 días! 🎂',
        cuerpo: `Hola {{nombre}},

Dentro de una semana es tu cumpleaños y en Coques lo queremos celebrar con vos. 🎂

🎁 TU BENEFICIO DE CUMPLEAÑOS
Durante los días anteriores y posteriores a tu cumpleaños tenés activo un beneficio especial exclusivo para vos.

No hace falta que hagas nada: cuando venís al local en esos días, el equipo lo aplica automáticamente. Solo avisá que es tu semana de cumple.

¿No podés venir? Recordá que cada compra por nuestra web suma como 3 visitas al programa.

¡Que sea una semana increíble!`,
    },
    feedback_email: {
        activa: true,
        asunto: '{{nombre}}, ¿cómo estuvo tu visita? ☕',
        cuerpo: `Hola {{nombre}},

Gracias por visitarnos 😊

¿Cómo estuvo tu experiencia en Coques? Hacé click en las estrellas para calificarnos:

{{estrellas}}

¡Tu opinión nos ayuda a seguir mejorando!`,
    },
}

export async function getPlantilla(id: PlantillaId): Promise<Plantilla> {
    try {
        const row = await prisma.plantillaEmail.findUnique({ where: { id } })
        if (row) return { asunto: row.asunto, cuerpo: row.cuerpo, activa: row.activa }
    } catch {
        // Si la tabla aún no existe o hay error, usar default
    }
    return DEFAULTS[id]
}

/** Reemplaza {{nombre}} y otras variables simples en asunto y cuerpo */
export function aplicarVars(texto: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
        (t, [k, v]) => t.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
        texto
    )
}

/** Envuelve el cuerpo en el HTML estándar de Coques */
export function buildHtmlPlantilla(cuerpo: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f8f8;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">Coques Bakery</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Programa de Fidelización</p>
    </div>
    <div style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">
      ${cuerpo.replace(/\n/g, '<br>')}
    </div>
    <div style="background:#f1f5f9;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Recibís este email porque sos parte del programa de puntos de Coques Bakery.<br>
        <a href="https://coques.com.ar" style="color:#6366f1;">coques.com.ar</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
