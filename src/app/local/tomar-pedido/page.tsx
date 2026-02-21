'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TomarPedidoStaffPage() {
    const router = useRouter()
    const [clienteData, setClienteData] = useState({
        nombre: '',
        telefono: ''
    })
    const [error, setError] = useState('')

    useEffect(() => {
        // Verificar autenticación de staff
        const token = localStorage.getItem('coques_local_token')
        if (!token) {
            router.push('/local/login')
        }
    }, [router])

    function validarTelefono(tel: string): boolean {
        // Eliminar espacios y guiones
        const telLimpio = tel.replace(/[\s-]/g, '')
        // Debe tener al menos 8 dígitos
        return /^\d{8,}$/.test(telLimpio)
    }

    function continuarAProductos() {
        setError('')

        // Validar nombre
        if (!clienteData.nombre.trim()) {
            setError('⚠️ El nombre del cliente es obligatorio')
            return
        }

        if (clienteData.nombre.trim().length < 3) {
            setError('⚠️ El nombre debe tener al menos 3 caracteres')
            return
        }

        // Validar teléfono
        if (!clienteData.telefono.trim()) {
            setError('⚠️ El teléfono del cliente es obligatorio')
            return
        }

        if (!validarTelefono(clienteData.telefono)) {
            setError('⚠️ El teléfono debe tener al menos 8 dígitos')
            return
        }

        // Limpiar carrito anterior antes de iniciar un nuevo pedido
        localStorage.removeItem('fidelizacion_carrito')
        
        // Guardar en sessionStorage para usar en el siguiente paso
        sessionStorage.setItem('pedido_staff_cliente', JSON.stringify(clienteData))
        sessionStorage.setItem('pedido_staff_modo', 'staff')

        // Redirigir a catálogo en modo staff
        router.push('/tortas?modo=staff')
    }

    function volver() {
        router.push('/local')
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                <button
                    onClick={volver}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-3"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="font-medium">Volver</span>
                </button>
                <h1 className="text-white text-2xl font-bold">📝 Tomar Pedido</h1>
                <p className="text-slate-400 text-sm mt-1">Datos del cliente</p>
            </div>

            {/* Contenido */}
            <div className="flex-1 p-6 flex items-center justify-center">
                <div className="w-full max-w-md">
                    {/* Info */}
                    <div className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-4 mb-6">
                        <p className="text-purple-300 text-sm">
                            💡 <strong>Importante:</strong> Ingresá los datos del cliente para poder contactarlo cuando el pedido esté listo.
                        </p>
                    </div>

                    {/* Formulario */}
                    <div className="bg-slate-800 rounded-xl p-6 shadow-xl space-y-5">
                        {/* Nombre */}
                        <div>
                            <label className="block text-white font-bold mb-2">
                                Nombre del cliente *
                            </label>
                            <input
                                type="text"
                                value={clienteData.nombre}
                                onChange={(e) => setClienteData({ ...clienteData, nombre: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && continuarAProductos()}
                                placeholder="Ej: María González"
                                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-500 border-2 border-transparent focus:border-purple-500 outline-none transition-colors"
                                autoFocus
                            />
                            <p className="text-slate-400 text-xs mt-1">
                                Nombre completo o cómo debe figurar en el pedido
                            </p>
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-white font-bold mb-2">
                                Teléfono *
                            </label>
                            <input
                                type="tel"
                                value={clienteData.telefono}
                                onChange={(e) => setClienteData({ ...clienteData, telefono: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && continuarAProductos()}
                                placeholder="Ej: 11 1234 5678"
                                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-500 border-2 border-transparent focus:border-purple-500 outline-none transition-colors"
                            />
                            <p className="text-slate-400 text-xs mt-1">
                                Para contactarlo cuando el pedido esté listo
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Botón continuar */}
                        <button
                            onClick={continuarAProductos}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                        >
                            Continuar al Catálogo
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Info adicional */}
                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">
                            Los campos marcados con * son obligatorios
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
