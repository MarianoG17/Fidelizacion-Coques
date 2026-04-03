// src/app/api/admin/configuracion-marca/route.ts
// API para la configuración de marca (white-label).
// El app de Coques NO usa este endpoint — sigue con brand.config.ts como siempre.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/middleware/admin-auth'

// GET /api/admin/configuracion-marca
export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        let config = await (prisma as any).configuracionMarca.findFirst()

        // Si no existe, devolver defaults
        if (!config) {
            config = {
                id: null,
                nombreEmpresa: '',
                nombreCompleto: '',
                slogan: '',
                descripcion: '',
                dominio: '',
                sitioWeb: '',
                appNombreClientes: '',
                appNombreStaff: '',
                appNombreAdmin: '',
                programaNombre: '',
                colorPrimario: 'blue',
                colorSecundario: 'orange',
                colorAcento: 'purple',
                logoUrl: '',
                faviconUrl: '',
                telefono: '',
                emailContacto: '',
                direccion: '',
                instagram: '',
                facebook: '',
                whatsapp: '',
                googleMapsReviews: '',
                emailFrom: '',
                emailFromNombre: '',
                emailReplyTo: '',
                moduloNiveles: true,
                moduloBeneficios: true,
                moduloLogros: true,
                moduloReferidos: false,
                moduloMesas: false,
                moduloPresupuestos: false,
                moduloEventos: false,
                moduloFeedback: true,
                moduloPushNotif: true,
                moduloGoogleOAuth: false,
                moduloPasskeys: false,
                moduloWoocommerce: false,
                moduloDeltawash: false,
                moduloExportExcel: true,
                textoBienvenida: '',
                textoQR: '',
                setupCompleto: false,
            }
        }

        return NextResponse.json({ success: true, config })
    } catch (error) {
        console.error('Error al obtener configuración de marca:', error)
        return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
    }
}

// PUT /api/admin/configuracion-marca
export async function PUT(req: NextRequest) {
    const authError = requireAdminAuth(req)
    if (authError) return authError

    try {
        const body = await req.json()

        const existente = await (prisma as any).configuracionMarca.findFirst()

        const data = {
            nombreEmpresa: body.nombreEmpresa ?? 'Mi Empresa',
            nombreCompleto: body.nombreCompleto ?? null,
            slogan: body.slogan ?? null,
            descripcion: body.descripcion ?? null,
            dominio: body.dominio ?? null,
            sitioWeb: body.sitioWeb ?? null,
            appNombreClientes: body.appNombreClientes ?? 'Mi App',
            appNombreStaff: body.appNombreStaff ?? 'Mi App Staff',
            appNombreAdmin: body.appNombreAdmin ?? 'Mi App Admin',
            programaNombre: body.programaNombre ?? 'Mi Programa',
            colorPrimario: body.colorPrimario ?? 'blue',
            colorSecundario: body.colorSecundario ?? 'orange',
            colorAcento: body.colorAcento ?? 'purple',
            logoUrl: body.logoUrl ?? null,
            faviconUrl: body.faviconUrl ?? null,
            telefono: body.telefono ?? null,
            emailContacto: body.emailContacto ?? null,
            direccion: body.direccion ?? null,
            instagram: body.instagram ?? null,
            facebook: body.facebook ?? null,
            whatsapp: body.whatsapp ?? null,
            googleMapsReviews: body.googleMapsReviews ?? null,
            emailFrom: body.emailFrom ?? null,
            emailFromNombre: body.emailFromNombre ?? null,
            emailReplyTo: body.emailReplyTo ?? null,
            moduloNiveles: body.moduloNiveles ?? true,
            moduloBeneficios: body.moduloBeneficios ?? true,
            moduloLogros: body.moduloLogros ?? true,
            moduloReferidos: body.moduloReferidos ?? false,
            moduloMesas: body.moduloMesas ?? false,
            moduloPresupuestos: body.moduloPresupuestos ?? false,
            moduloEventos: body.moduloEventos ?? false,
            moduloFeedback: body.moduloFeedback ?? true,
            moduloPushNotif: body.moduloPushNotif ?? true,
            moduloGoogleOAuth: body.moduloGoogleOAuth ?? false,
            moduloPasskeys: body.moduloPasskeys ?? false,
            moduloWoocommerce: body.moduloWoocommerce ?? false,
            moduloDeltawash: body.moduloDeltawash ?? false,
            moduloExportExcel: body.moduloExportExcel ?? true,
            textoBienvenida: body.textoBienvenida ?? null,
            textoQR: body.textoQR ?? null,
            setupCompleto: body.setupCompleto ?? false,
        }

        let config
        if (existente) {
            config = await (prisma as any).configuracionMarca.update({
                where: { id: existente.id },
                data,
            })
        } else {
            config = await (prisma as any).configuracionMarca.create({ data })
        }

        return NextResponse.json({ success: true, config })
    } catch (error) {
        console.error('Error al guardar configuración de marca:', error)
        return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
    }
}