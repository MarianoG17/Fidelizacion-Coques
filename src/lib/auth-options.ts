// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    useSecureCookies: true,
    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true
            }
        },
        callbackUrl: {
            name: `__Secure-next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: true
            }
        },
        csrfToken: {
            name: `__Host-next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true
            }
        }
    },

    providers: [
        // Google OAuth Provider
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),

        // Email/Password Provider (mantener compatibilidad con sistema actual)
        CredentialsProvider({
            id: 'credentials',
            name: 'Email and Password',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email y contraseña son requeridos')
                }

                const cliente = await prisma.cliente.findUnique({
                    where: { email: credentials.email.toLowerCase().trim() },
                    include: { nivel: true }
                })

                if (!cliente) {
                    throw new Error('Email o contraseña incorrectos')
                }

                if (!cliente.password) {
                    throw new Error('Esta cuenta usa Google para iniciar sesión')
                }

                const isValidPassword = await bcrypt.compare(credentials.password, cliente.password)

                if (!isValidPassword) {
                    throw new Error('Email o contraseña incorrectos')
                }

                return {
                    id: cliente.id,
                    email: cliente.email!,
                    name: cliente.nombre,
                    image: (cliente as any).profileImage,
                    phone: cliente.phone,
                }
            }
        })
    ],

    callbacks: {
        async signIn({ user, account, profile }) {
            // Solo procesar para Google OAuth
            if (account?.provider === "google" && user.email) {
                try {
                    // Buscar cliente por email
                    let cliente = await prisma.cliente.findUnique({
                        where: { email: user.email }
                    })

                    if (!cliente) {
                        // Cliente nuevo - requiere teléfono para completar registro
                        // Por ahora creamos un pre-registro que se completará después
                        const googleId = account.providerAccountId

                        // Verificar si ya existe con este googleId
                        const existingByGoogleId = await prisma.cliente.findUnique({
                            where: { googleId } as any
                        })

                        if (existingByGoogleId) {
                            return true // Ya existe, permitir login
                        }

                        // Crear nuevo cliente con estado PRE_REGISTRADO
                        // El teléfono se pedirá en un paso posterior
                        cliente = await prisma.cliente.create({
                            data: {
                                email: user.email,
                                nombre: user.name || 'Usuario Google',
                                googleId: googleId,
                                authProvider: 'google',
                                profileImage: user.image,
                                estado: 'PRE_REGISTRADO',
                                phone: `+549TEMP${Date.now()}`, // Temporal, se actualizará después
                                fuenteOrigen: 'AUTOREGISTRO',
                                codigoReferido: Math.random().toString(36).substring(2, 10).toUpperCase(),
                            } as any
                        })
                    } else {
                        // Cliente existente - actualizar con datos de Google si no los tiene
                        if (!(cliente as any).googleId) {
                            await prisma.cliente.update({
                                where: { id: cliente.id },
                                data: {
                                    googleId: account.providerAccountId,
                                    authProvider: 'google',
                                    profileImage: user.image || (cliente as any).profileImage,
                                    nombre: cliente.nombre || user.name,
                                } as any
                            })
                        }
                    }

                    return true
                } catch (error) {
                    console.error('Error en signIn callback:', error)
                    return false
                }
            }

            return true
        },

        async jwt({ token, user, account }) {
            // Agregar datos adicionales al token JWT en el primer login
            if (user) {
                token.userId = user.id
                token.phone = (user as any).phone
            }

            // SIEMPRE verificar el estado actual del cliente en la BD
            // Esto asegura que el token se actualice después de completar el teléfono
            if (token.email) {
                const cliente: any = await prisma.cliente.findUnique({
                    where: { email: token.email }
                })

                if (cliente) {
                    token.userId = cliente.id
                    token.phone = cliente.phone
                    token.name = cliente.nombre
                    token.picture = cliente.profileImage
                    // Solo necesita completar teléfono si es temporal (contiene TEMP)
                    token.needsPhone = cliente.phone?.includes('TEMP') || false
                }
            }

            return token
        },

        async session({ session, token }) {
            // Pasar datos del token a la sesión
            if (session.user) {
                (session.user as any).id = token.userId as string
                (session.user as any).phone = token.phone as string
                (session.user as any).needsPhone = token.needsPhone || false
            }

            return session
        }
    },

    pages: {
        signIn: '/login',
        error: '/login',
    },

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 días
    },

    secret: process.env.NEXTAUTH_SECRET,
}
