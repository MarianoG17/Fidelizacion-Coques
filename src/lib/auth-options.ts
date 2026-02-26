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
            console.log('[AUTH] signIn callback started', { provider: account?.provider, email: user?.email })
            
            // Solo procesar para Google OAuth
            if (account?.provider === "google" && user.email) {
                try {
                    console.log('[AUTH] Processing Google OAuth login for:', user.email)
                    
                    // Buscar cliente por email
                    let cliente = await prisma.cliente.findUnique({
                        where: { email: user.email }
                    })

                    console.log('[AUTH] Cliente found:', cliente ? 'YES' : 'NO')

                    if (!cliente) {
                        // Cliente nuevo - requiere teléfono para completar registro
                        const googleId = account.providerAccountId
                        console.log('[AUTH] New user, checking googleId:', googleId)

                        // Verificar si ya existe con este googleId
                        const existingByGoogleId = await prisma.cliente.findUnique({
                            where: { googleId } as any
                        })

                        if (existingByGoogleId) {
                            console.log('[AUTH] User already exists with googleId, allowing login')
                            return true
                        }

                        console.log('[AUTH] Creating new PRE_REGISTRADO user')
                        // Crear nuevo cliente con estado PRE_REGISTRADO
                        cliente = await prisma.cliente.create({
                            data: {
                                email: user.email,
                                nombre: user.name || 'Usuario Google',
                                googleId: googleId,
                                authProvider: 'google',
                                profileImage: user.image,
                                estado: 'PRE_REGISTRADO',
                                phone: `+549TEMP${Date.now()}`,
                                fuenteOrigen: 'AUTOREGISTRO',
                                codigoReferido: Math.random().toString(36).substring(2, 10).toUpperCase(),
                            } as any
                        })
                        console.log('[AUTH] New user created:', cliente.id, 'phone:', cliente.phone)
                    } else {
                        console.log('[AUTH] Existing user, estado:', (cliente as any).estado, 'phone:', cliente.phone)
                        // Cliente existente - actualizar con datos de Google si no los tiene
                        if (!(cliente as any).googleId) {
                            console.log('[AUTH] Updating existing user with Google data')
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

                    console.log('[AUTH] signIn callback returning true')
                    return true
                } catch (error) {
                    console.error('[AUTH] Error en signIn callback:', error)
                    return false
                }
            }

            console.log('[AUTH] signIn callback - not Google provider, returning true')
            return true
        },

        async jwt({ token, user, account }) {
            try {
                console.log('[AUTH] jwt callback', { hasUser: !!user, hasAccount: !!account, provider: account?.provider })
                
                // Agregar datos adicionales al token JWT en el primer login
                if (user) {
                    token.userId = user.id
                    token.phone = (user as any).phone
                    console.log('[AUTH] jwt - user data added to token')
                }

                // SIEMPRE verificar el estado actual en la BD para obtener datos actualizados
                // Esto es necesario para detectar cambios como completar el teléfono
                if (token.email) {
                    console.log('[AUTH] jwt - querying DB for:', token.email)
                    const cliente: any = await prisma.cliente.findUnique({
                        where: { email: token.email }
                    })

                    if (cliente) {
                        console.log('[AUTH] jwt - cliente found, phone:', cliente.phone, 'needsPhone:', cliente.phone?.includes('TEMP'))
                        token.userId = cliente.id
                        token.phone = cliente.phone
                        token.name = cliente.nombre
                        token.picture = cliente.profileImage
                        // Solo necesita completar teléfono si es temporal (contiene TEMP)
                        token.needsPhone = cliente.phone?.includes('TEMP') || false
                    } else {
                        console.log('[AUTH] jwt - cliente NOT found')
                    }
                }

                console.log('[AUTH] jwt - final token.needsPhone:', token.needsPhone)
                return token
            } catch (error) {
                console.error('[AUTH] Error in jwt callback:', error)
                // Retornar token sin modificar en caso de error
                return token
            }
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
