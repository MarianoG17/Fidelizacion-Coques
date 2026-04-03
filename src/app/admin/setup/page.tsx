'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ConfigMarca {
    // Empresa
    nombreEmpresa: string
    nombreCompleto: string
    slogan: string
    descripcion: string
    dominio: string
    sitioWeb: string
    // Branding
    appNombreClientes: string
    appNombreStaff: string
    appNombreAdmin: string
    programaNombre: string
    colorPrimario: string
    colorSecundario: string
    colorAcento: string
    logoUrl: string
    faviconUrl: string
    // Contacto
    telefono: string
    emailContacto: string
    direccion: string
    // Redes
    instagram: string
    facebook: string
    whatsapp: string
    googleMapsReviews: string
    // Emails
    emailFrom: string
    emailFromNombre: string
    emailReplyTo: string
    // Módulos
    moduloNiveles: boolean
    moduloBeneficios: boolean
    moduloLogros: boolean
    moduloReferidos: boolean
    moduloMesas: boolean
    moduloPresupuestos: boolean
    moduloEventos: boolean
    moduloFeedback: boolean
    moduloPushNotif: boolean
    moduloGoogleOAuth: boolean
    moduloPasskeys: boolean
    moduloWoocommerce: boolean
    moduloDeltawash: boolean
    moduloExportExcel: boolean
    // Textos
    textoBienvenida: string
    textoQR: string
    setupCompleto: boolean
}

const DEFAULTS: ConfigMarca = {
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

const COLORES_TAILWIND = [
    { value: 'blue', label: 'Azul', bg: '#3b82f6' },
    { value: 'indigo', label: 'Índigo', bg: '#6366f1' },
    { value: 'violet', label: 'Violeta', bg: '#8b5cf6' },
    { value: 'purple', label: 'Púrpura', bg: '#a855f7' },
    { value: 'pink', label: 'Rosa', bg: '#ec4899' },
    { value: 'red', label: 'Rojo', bg: '#ef4444' },
    { value: 'orange', label: 'Naranja', bg: '#f97316' },
    { value: 'amber', label: 'Ámbar', bg: '#f59e0b' },
    { value: 'yellow', label: 'Amarillo', bg: '#eab308' },
    { value: 'lime', label: 'Lima', bg: '#84cc16' },
    { value: 'green', label: 'Verde', bg: '#22c55e' },
    { value: 'teal', label: 'Verde azulado', bg: '#14b8a6' },
    { value: 'cyan', label: 'Cian', bg: '#06b6d4' },
    { value: 'sky', label: 'Celeste', bg: '#0ea5e9' },
    { value: 'slate', label: 'Pizarra', bg: '#64748b' },
    { value: 'gray', label: 'Gris', bg: '#6b7280' },
    { value: 'zinc', label: 'Zinc', bg: '#71717a' },
    { value: 'stone', label: 'Piedra', bg: '#78716c' },
]

const TABS = [
    { id: 'empresa', label: '🏢 Empresa' },
    { id: 'branding', label: '🎨 Branding' },
    { id: 'contacto', label: '📞 Contacto' },
    { id: 'modulos', label: '🧩 Módulos' },
    { id: 'emails', label: '📧 Emails' },
    { id: 'textos', label: '✏️ Textos' },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SetupMarcaPage() {
    const router = useRouter()
    const [config, setConfig] = useState<ConfigMarca>(DEFAULTS)
    const [tabActual, setTabActual] = useState('empresa')
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const adminKey = localStorage.getItem('admin_key')
        if (!adminKey) { router.push('/admin'); return }
        cargar()
    }, [router])

    async function cargar() {
        try {
            const adminKey = localStorage.getItem('admin_key')
            const res = await fetch('/api/admin/configuracion-marca', {
                headers: { 'x-admin-key': adminKey || '' }
            })
            if (res.ok) {
                const data = await res.json()
                // Merge con defaults para que no haya undefined en inputs controlados
                setConfig({ ...DEFAULTS, ...data.config })
            }
        } catch (e) {
            console.error(e)
        } finally {
            setCargando(false)
        }
    }

    function set(field: keyof ConfigMarca, value: string | boolean) {
        setConfig(prev => ({ ...prev, [field]: value }))
    }

    async function guardar(marcarCompleto = false) {
        setGuardando(true)
        setMensaje('')
        try {
            const adminKey = localStorage.getItem('admin_key')
            const payload = marcarCompleto ? { ...config, setupCompleto: true } : config
            const res = await fetch('/api/admin/configuracion-marca', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error()
            if (marcarCompleto) setConfig(prev => ({ ...prev, setupCompleto: true }))
            setMensaje('✅ Guardado correctamente')
            setTimeout(() => setMensaje(''), 3000)
        } catch {
            setMensaje('❌ Error al guardar')
        } finally {
            setGuardando(false)
        }
    }

    if (cargando) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Cargando configuración...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => router.push('/admin')} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">🎨 Setup de la App</h1>
                        <p className="text-sm text-gray-500">Configurá el branding y módulos de tu empresa</p>
                    </div>
                </div>

                {/* Badge estado */}
                <div className="mb-6">
                    {config.setupCompleto ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            ✅ Setup completo
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                            ⚠️ Setup pendiente
                        </span>
                    )}
                </div>

                {/* Mensaje */}
                {mensaje && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${mensaje.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {mensaje}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-6 flex-wrap">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTabActual(tab.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                tabActual === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Empresa ─────────────────────────────────────────── */}
                {tabActual === 'empresa' && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">🏢 Información de la Empresa</h2>

                        <Field label="Nombre corto *" hint="Ej: Coques, La Paloma, El Gato">
                            <input type="text" value={config.nombreEmpresa} onChange={e => set('nombreEmpresa', e.target.value)} placeholder="Mi Empresa" className={inputCls} />
                        </Field>

                        <Field label="Nombre completo" hint="Ej: Coques Pastelería S.A.">
                            <input type="text" value={config.nombreCompleto} onChange={e => set('nombreCompleto', e.target.value)} placeholder="Mi Empresa S.A." className={inputCls} />
                        </Field>

                        <Field label="Slogan" hint="Frase corta que resume el negocio">
                            <input type="text" value={config.slogan} onChange={e => set('slogan', e.target.value)} placeholder="Tu negocio de confianza" className={inputCls} />
                        </Field>

                        <Field label="Descripción" hint="Un párrafo describiendo la empresa">
                            <textarea value={config.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} placeholder="Somos una empresa dedicada a..." className={inputCls} />
                        </Field>

                        <Field label="Dominio de la app" hint="Ej: app.miempresa.com (sin https://)">
                            <input type="text" value={config.dominio} onChange={e => set('dominio', e.target.value)} placeholder="app.miempresa.com" className={inputCls} />
                        </Field>

                        <Field label="Sitio web" hint="URL del sitio principal">
                            <input type="url" value={config.sitioWeb} onChange={e => set('sitioWeb', e.target.value)} placeholder="https://miempresa.com" className={inputCls} />
                        </Field>
                    </div>
                )}

                {/* ── Tab: Branding ─────────────────────────────────────────── */}
                {tabActual === 'branding' && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900">🎨 Branding Visual</h2>

                        {/* Nombres */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Nombres de las Apps</h3>

                            <Field label="App de clientes" hint='Lo que ve el cliente al instalar la PWA. Ej: "Coques Pass"'>
                                <input type="text" value={config.appNombreClientes} onChange={e => set('appNombreClientes', e.target.value)} placeholder="Mi App" className={inputCls} />
                            </Field>

                            <Field label="App de staff" hint='Para el panel del mostrador. Ej: "Coques Staff"'>
                                <input type="text" value={config.appNombreStaff} onChange={e => set('appNombreStaff', e.target.value)} placeholder="Mi App Staff" className={inputCls} />
                            </Field>

                            <Field label="App de admin" hint='Para el panel de administración'>
                                <input type="text" value={config.appNombreAdmin} onChange={e => set('appNombreAdmin', e.target.value)} placeholder="Mi App Admin" className={inputCls} />
                            </Field>

                            <Field label="Nombre del programa de fidelización" hint='Ej: "Coques Points", "La Paloma Rewards"'>
                                <input type="text" value={config.programaNombre} onChange={e => set('programaNombre', e.target.value)} placeholder="Mi Programa" className={inputCls} />
                            </Field>
                        </div>

                        {/* Colores */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Colores</h3>

                            <Field label="Color principal" hint="Botones, encabezados, acentos principales">
                                <ColorPicker value={config.colorPrimario} onChange={v => set('colorPrimario', v)} />
                            </Field>

                            <Field label="Color secundario" hint="Elementos de soporte, badges, iconos">
                                <ColorPicker value={config.colorSecundario} onChange={v => set('colorSecundario', v)} />
                            </Field>

                            <Field label="Color de acento" hint="Destacados, niveles premium, logros">
                                <ColorPicker value={config.colorAcento} onChange={v => set('colorAcento', v)} />
                            </Field>
                        </div>

                        {/* Assets */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Logo y Favicon</h3>

                            <Field label="URL del Logo" hint="Subí tu logo a cualquier hosting (Imgur, Cloudinary, etc.) y pegá la URL">
                                <input type="url" value={config.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://..." className={inputCls} />
                                {config.logoUrl && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded-lg inline-block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={config.logoUrl} alt="Logo preview" className="h-12 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                                    </div>
                                )}
                            </Field>

                            <Field label="URL del Favicon" hint="Icono pequeño que aparece en la pestaña del navegador (preferentemente .ico o .png 32x32)">
                                <input type="url" value={config.faviconUrl} onChange={e => set('faviconUrl', e.target.value)} placeholder="https://..." className={inputCls} />
                            </Field>
                        </div>
                    </div>
                )}

                {/* ── Tab: Contacto ─────────────────────────────────────────── */}
                {tabActual === 'contacto' && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">📞 Contacto y Redes Sociales</h2>

                        <Field label="Teléfono" hint="Ej: +54 11 1234-5678">
                            <input type="tel" value={config.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+54 11 1234-5678" className={inputCls} />
                        </Field>

                        <Field label="Email de contacto" hint="Email público del negocio">
                            <input type="email" value={config.emailContacto} onChange={e => set('emailContacto', e.target.value)} placeholder="info@miempresa.com" className={inputCls} />
                        </Field>

                        <Field label="Dirección" hint="Dirección del local principal">
                            <input type="text" value={config.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. Corrientes 1234, CABA" className={inputCls} />
                        </Field>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Redes Sociales</h3>

                            <div className="space-y-4">
                                <Field label="Instagram" hint="URL del perfil de Instagram">
                                    <input type="url" value={config.instagram} onChange={e => set('instagram', e.target.value)} placeholder="https://instagram.com/miempresa" className={inputCls} />
                                </Field>

                                <Field label="Facebook" hint="URL de la página de Facebook">
                                    <input type="url" value={config.facebook} onChange={e => set('facebook', e.target.value)} placeholder="https://facebook.com/miempresa" className={inputCls} />
                                </Field>

                                <Field label="WhatsApp" hint="Número en formato internacional, sin espacios ni guiones">
                                    <input type="tel" value={config.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+5491112345678" className={inputCls} />
                                </Field>

                                <Field label="Link de reseñas en Google Maps" hint="URL para que los clientes dejen reseñas en Google">
                                    <input type="url" value={config.googleMapsReviews} onChange={e => set('googleMapsReviews', e.target.value)} placeholder="https://maps.app.goo.gl/..." className={inputCls} />
                                </Field>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab: Módulos ─────────────────────────────────────────── */}
                {tabActual === 'modulos' && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900">🧩 Módulos y Funcionalidades</h2>
                        <p className="text-sm text-gray-500">Activá solo lo que necesita tu negocio. Podés cambiar esto en cualquier momento.</p>

                        <ModuloSection titulo="Core — Fidelización">
                            <Toggle label="Sistema de niveles" hint="Bronce, Plata, Oro (personalizables)" checked={config.moduloNiveles} onChange={v => set('moduloNiveles', v)} />
                            <Toggle label="Beneficios por nivel" hint="Recompensas automáticas según el nivel del cliente" checked={config.moduloBeneficios} onChange={v => set('moduloBeneficios', v)} />
                            <Toggle label="Sistema de logros" hint="Badges y achievements para gamificación" checked={config.moduloLogros} onChange={v => set('moduloLogros', v)} />
                            <Toggle label="Programa de referidos" hint="Los clientes ganan beneficios por traer amigos" checked={config.moduloReferidos} onChange={v => set('moduloReferidos', v)} />
                        </ModuloSection>

                        <ModuloSection titulo="Presencial / Local">
                            <Toggle label="Gestión de mesas" hint="Mapa visual del salón, sesiones por mesa" checked={config.moduloMesas} onChange={v => set('moduloMesas', v)} />
                            <Toggle label="Sistema de presupuestos" hint="Generar y gestionar cotizaciones" checked={config.moduloPresupuestos} onChange={v => set('moduloPresupuestos', v)} />
                            <Toggle label="Eventos especiales" hint="Eventos con cupo limitado e inscripciones" checked={config.moduloEventos} onChange={v => set('moduloEventos', v)} />
                        </ModuloSection>

                        <ModuloSection titulo="Comunicación">
                            <Toggle label="Feedback de clientes" hint="Encuesta de satisfacción post-visita con estrellas" checked={config.moduloFeedback} onChange={v => set('moduloFeedback', v)} />
                            <Toggle label="Notificaciones push" hint="Notificaciones a los celulares de los clientes" checked={config.moduloPushNotif} onChange={v => set('moduloPushNotif', v)} />
                        </ModuloSection>

                        <ModuloSection titulo="Autenticación">
                            <Toggle label="Login con Google" hint="Los clientes pueden entrar con su cuenta de Google" checked={config.moduloGoogleOAuth} onChange={v => set('moduloGoogleOAuth', v)} />
                            <Toggle label="Huella / Face ID (Passkeys)" hint="Autenticación biométrica en dispositivos compatibles" checked={config.moduloPasskeys} onChange={v => set('moduloPasskeys', v)} />
                        </ModuloSection>

                        <ModuloSection titulo="Integraciones Externas">
                            <Toggle label="WooCommerce" hint="Sincronización con tienda online de WordPress" checked={config.moduloWoocommerce} onChange={v => set('moduloWoocommerce', v)} />
                            <Toggle label="DeltaWash" hint="Integración con sistema de lavadero DeltaWash" checked={config.moduloDeltawash} onChange={v => set('moduloDeltawash', v)} />
                        </ModuloSection>

                        <ModuloSection titulo="Admin">
                            <Toggle label="Exportar a Excel" hint="Descarga de reportes en formato .xlsx" checked={config.moduloExportExcel} onChange={v => set('moduloExportExcel', v)} />
                        </ModuloSection>
                    </div>
                )}

                {/* ── Tab: Emails ─────────────────────────────────────────── */}
                {tabActual === 'emails' && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">📧 Configuración de Emails</h2>
                        <p className="text-sm text-gray-500">
                            Los emails transaccionales (bienvenida, recupero de contraseña, beneficios) se envían desde estas direcciones.
                            Necesitás configurar Brevo o Resend por separado.
                        </p>

                        <Field label="Email remitente" hint='Ej: noreply@mail.miempresa.com — debe estar verificado en Brevo/Resend'>
                            <input type="email" value={config.emailFrom} onChange={e => set('emailFrom', e.target.value)} placeholder="noreply@mail.miempresa.com" className={inputCls} />
                        </Field>

                        <Field label="Nombre del remitente" hint='El nombre que ve el cliente en su bandeja. Ej: "Mi Empresa"'>
                            <input type="text" value={config.emailFromNombre} onChange={e => set('emailFromNombre', e.target.value)} placeholder="Mi Empresa" className={inputCls} />
                        </Field>

                        <Field label="Email de reply-to" hint='Adónde van las respuestas de los clientes. Ej: info@miempresa.com'>
                            <input type="email" value={config.emailReplyTo} onChange={e => set('emailReplyTo', e.target.value)} placeholder="info@miempresa.com" className={inputCls} />
                        </Field>

                        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                            <p className="font-semibold mb-1">💡 Para configurar el envío de emails:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Crear cuenta en <strong>Brevo</strong> (brevo.com) o <strong>Resend</strong> (resend.com) — ambos tienen plan gratuito</li>
                                <li>Verificar el dominio de envío</li>
                                <li>Obtener la API key</li>
                                <li>Agregarla como variable de entorno <code className="bg-blue-100 px-1 rounded">BREVO_API_KEY</code> o <code className="bg-blue-100 px-1 rounded">RESEND_API_KEY</code> en Vercel</li>
                            </ol>
                        </div>
                    </div>
                )}

                {/* ── Tab: Textos ─────────────────────────────────────────── */}
                {tabActual === 'textos' && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">✏️ Textos Personalizables</h2>

                        <Field label="Mensaje de bienvenida" hint="Aparece en la pantalla de inicio para nuevos clientes">
                            <textarea
                                value={config.textoBienvenida}
                                onChange={e => set('textoBienvenida', e.target.value)}
                                rows={3}
                                placeholder={`¡Bienvenido a ${config.nombreEmpresa || 'Mi Empresa'}! Acumulá visitas y disfrutá beneficios exclusivos.`}
                                className={inputCls}
                            />
                        </Field>

                        <Field label="Instrucción del QR" hint="Texto debajo del código QR del cliente">
                            <textarea
                                value={config.textoQR}
                                onChange={e => set('textoQR', e.target.value)}
                                rows={2}
                                placeholder="Mostrá este código en el mostrador para sumar tu visita"
                                className={inputCls}
                            />
                        </Field>

                        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                            <p className="font-semibold mb-1">📌 Nota</p>
                            <p>Estos textos están disponibles para que los componentes de tu app los usen a través de <code className="bg-gray-200 px-1 rounded">runtime-brand-config</code>. Los textos específicos de emails (asunto, cuerpo) se configuran directamente en los templates de email.</p>
                        </div>
                    </div>
                )}

                {/* ── Botones de acción ─────────────────────────────────────── */}
                <div className="mt-6 flex gap-3 flex-wrap">
                    <button
                        onClick={() => guardar(false)}
                        disabled={guardando}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {guardando ? '⏳ Guardando...' : '💾 Guardar'}
                    </button>

                    {!config.setupCompleto && (
                        <button
                            onClick={() => guardar(true)}
                            disabled={guardando || !config.nombreEmpresa}
                            className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            title={!config.nombreEmpresa ? 'Completá al menos el nombre de la empresa' : ''}
                        >
                            {guardando ? '⏳ Guardando...' : '✅ Guardar y marcar como completo'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
            {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
    )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {COLORES_TAILWIND.map(c => (
                <button
                    key={c.value}
                    type="button"
                    onClick={() => onChange(c.value)}
                    title={c.label}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${value === c.value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.bg }}
                />
            ))}
            <span className="self-center text-sm text-gray-500 ml-1">
                {COLORES_TAILWIND.find(c => c.value === value)?.label ?? value}
            </span>
        </div>
    )
}

function ModuloSection({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{titulo}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    )
}

function Toggle({
    label, hint, checked, onChange
}: {
    label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
                {hint && <p className="text-xs text-gray-400">{hint}</p>}
            </div>
        </label>
    )
}
