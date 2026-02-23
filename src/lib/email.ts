// src/lib/email.ts
interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: {
    name: string
    email: string
  }
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  message?: string
}

/**
 * Servicio de envío de emails usando Brevo (Sendinblue)
 *
 * Variables de entorno requeridas:
 * - BREVO_API_KEY: API Key de Brevo
 * - BREVO_FROM_EMAIL: Email remitente (opcional, tiene default)
 */
export async function sendEmail({
  to,
  subject,
  html,
  from
}: SendEmailParams): Promise<SendEmailResult> {
  // Verificar si está configurada la API Key
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Email] BREVO_API_KEY no configurada - Email no enviado')
    console.log('[Email] Detalles:', {
      to,
      subject,
      note: 'Configurar BREVO_API_KEY en las variables de entorno'
    })
    return {
      success: false,
      message: 'API key no configurada'
    }
  }

  try {
    // Importación dinámica de Brevo para evitar problemas de tipos
    const SibApiV3Sdk = require('@getbrevo/brevo')
    
    // Configurar la API de Brevo
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
    
    // Configurar API Key
    apiInstance.authentications.apiKey.apiKey = process.env.BREVO_API_KEY

    // Configurar email remitente por defecto
    const defaultFrom = {
      name: 'Coques Bakery',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@mail.coques.com.ar',
    }

    // Preparar el email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
    sendSmtpEmail.sender = from || defaultFrom
    sendSmtpEmail.to = [{ email: to }]
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html

    // Enviar el email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
    
    console.log('[Email] ✅ Email enviado exitosamente')
    console.log('[Email] Destinatario:', to)
    console.log('[Email] Asunto:', subject)
    console.log('[Email] Message ID:', result.messageId)
    
    return {
      success: true,
      messageId: result.messageId
    }
  } catch (error: any) {
    console.error('[Email] ❌ Error al enviar email')
    console.error('[Email] Destinatario:', to)
    console.error('[Email] Error:', error.message || error)
    
    // Log adicional si hay más detalles
    if (error.response) {
      console.error('[Email] Response error:', error.response.body)
    }
    
    return {
      success: false,
      error: error.message || 'Error desconocido al enviar email'
    }
  }
}
