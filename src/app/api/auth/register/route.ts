// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signClienteJWT } from '@/lib/auth'
import { generarSecretoOTP } from '@/lib/otp'
import { evaluarNivel } from '@/lib/beneficios'
import { evaluarLogros } from '@/lib/logros'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().regex(/^\d{10}$/, 'Teléfono inválido (formato: 1112345678)'),
  codigoReferido: z.string().optional(), // Código de referido opcional
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = registerSchema.parse(body)

    // Verificar si ya existe un cliente con ese email
    const existingEmail = await prisma.cliente.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un cliente con ese teléfono
    const existingPhone = await prisma.cliente.findUnique({
      where: { phone: validatedData.phone },
    })

    if (existingPhone) {
      return NextResponse.json(
        { error: 'El teléfono ya está registrado' },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS)

    // Generar otpSecret para el cliente (necesario para el QR del Pass)
    const otpSecret = generarSecretoOTP()

    // Obtener el nivel Bronce (orden 1) para asignarlo por defecto
    const nivelBronce = await prisma.nivel.findFirst({
      where: { orden: 1 },
    })

    // Buscar el cliente que refirió si hay código
    let referidoPorId: string | undefined
    if (validatedData.codigoReferido) {
      const referidor = await prisma.cliente.findUnique({
        where: { codigoReferido: validatedData.codigoReferido },
      })
      if (referidor) {
        referidoPorId = referidor.id
        console.log(`[Registro] Cliente referido por: ${referidor.nombre} (${referidor.id})`)
      } else {
        console.warn(`[Registro] Código de referido inválido: ${validatedData.codigoReferido}`)
      }
    }

    // Generar código de referido único para el nuevo cliente
    const codigoReferidoCliente = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Crear el cliente con estado ACTIVO y nivel inicial Bronce
    const cliente = await prisma.cliente.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        nombre: validatedData.nombre,
        phone: validatedData.phone,
        estado: 'ACTIVO',
        fuenteOrigen: 'AUTOREGISTRO',
        consentimientoAt: new Date(),
        otpSecret,
        nivelId: nivelBronce?.id, // Asignar nivel Bronce desde el registro
        codigoReferido: codigoReferidoCliente, // Código único para compartir
        referidoPorId, // ID del cliente que lo refirió (si existe)
      },
    })

    // Si fue referido, incrementar contador del referidor y darle beneficio
    if (referidoPorId) {
      await prisma.cliente.update({
        where: { id: referidoPorId },
        data: {
          referidosActivados: { increment: 1 },
        },
      })
      
      // Registrar visita bonus para el referidor
      const localPrincipal = await prisma.local.findFirst({
          where: {
              tipo: 'cafeteria',
              activo: true
          }
      })
      if (localPrincipal) {
        await prisma.eventoScan.create({
          data: {
            clienteId: referidoPorId,
            localId: localPrincipal.id,
            tipoEvento: 'VISITA',
            metodoValidacion: 'OTP_MANUAL',
            contabilizada: true,
            notas: `Visita bonus por referir a ${validatedData.nombre}`,
          },
        })
        
        // Evaluar nivel y logros del referidor después de la visita bonus - evaluar nivel primero
        evaluarNivel(referidoPorId)
          .then(() => evaluarLogros(referidoPorId))
          .catch(console.error)
        
        console.log(`[Registro] Referidor recibió visita bonus`)
      }
    }

    // Enviar email de bienvenida con Brevo
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coques.vercel.app'

      await sendEmail({
        to: validatedData.email,
        subject: '¡Bienvenido a Coques Bakery! 🎉',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #9333ea; margin: 0;">¡Bienvenido a Coques Bakery!</h1>
              </div>
              
              <p style="font-size: 16px;">Hola <strong>${validatedData.nombre}</strong>,</p>
              
              <p>¡Gracias por registrarte en nuestro programa de fidelización! 🎉</p>
              
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #9333ea; margin-top: 0;">¿Qué podés hacer ahora?</h3>
                <ul style="line-height: 1.8;">
                  <li>✨ Acumulá visitas y subí de nivel (Bronce → Plata → Oro)</li>
                  <li>🎁 Desbloqueá beneficios exclusivos</li>
                  <li>🏆 Completá logros y ganás recompensas</li>
                  <li>👥 Referí amigos y ganás visitas bonus</li>
                  <li>📱 Mostrá tu QR en el local para sumar puntos</li>
                </ul>
              </div>

              ${validatedData.codigoReferido ? `
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46;">
                  <strong>🎊 ¡Bonus de bienvenida!</strong><br/>
                  Fuiste referido por alguien especial, así que tu amigo recibió una visita bonus. ¡Gracias por confiar en nosotros!
                </p>
              </div>
              ` : ''}

              <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e;">
                  <strong>💡 Tu código de referido:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">${codigoReferidoCliente}</code>
                </p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #78350f;">
                  Compartilo con tus amigos y ganás visitas bonus cuando se registren.
                </p>
              </div>

              <div style="text-align: center; margin: 35px 0;">
                <a href="${appUrl}/pass"
                   style="display: inline-block;
                          padding: 14px 28px;
                          background-color: #9333ea;
                          color: white;
                          text-decoration: none;
                          border-radius: 8px;
                          font-weight: bold;
                          font-size: 16px;">
                  Ver mi Pase de Fidelización
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px;">
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                  <strong>Datos de tu cuenta:</strong>
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                  📧 Email: ${validatedData.email}<br/>
                  📱 Teléfono: ${validatedData.phone}<br/>
                  🥉 Nivel inicial: Bronce
                </p>
              </div>

              <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 6px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0;">
                  Si olvidás tu contraseña, podés recuperarla desde <a href="${appUrl}/recuperar-password" style="color: #9333ea;">este enlace</a>.
                </p>
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                Coques Bakery - Programa de Fidelización<br/>
                <a href="${appUrl}" style="color: #9333ea; text-decoration: none;">Visitá nuestra app</a>
              </p>
            </div>
          `,
      })

      console.log(`[Registro] Email de bienvenida procesado para: ${validatedData.email}`)
    } catch (emailError) {
      console.error('[Registro] Error al enviar email de bienvenida:', emailError)
      // No fallar el registro por error de email
    }

    // Generar JWT
    const token = await signClienteJWT({
      clienteId: cliente.id,
      phone: cliente.phone,
    })

    // No retornar el password en la respuesta
    const { password: _, ...clienteSinPassword } = cliente

    return NextResponse.json({
      success: true,
      data: {
        cliente: clienteSinPassword,
        token,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error en registro:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
