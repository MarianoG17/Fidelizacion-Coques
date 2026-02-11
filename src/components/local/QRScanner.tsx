'use client'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
    onScan: (decodedText: string) => void
    onError?: (error: string) => void
    isActive: boolean
}

export default function QRScanner({ onScan, onError, isActive }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Si no está activo, detener y limpiar
        if (!isActive) {
            if (scannerRef.current && isScanning) {
                console.log('[QRScanner] Deteniendo scanner...')
                scannerRef.current
                    .stop()
                    .then(() => {
                        console.log('[QRScanner] Scanner detenido')
                        scannerRef.current = null
                        setIsScanning(false)
                    })
                    .catch((err) => console.error('Error stopping scanner:', err))
            }
            return
        }

        // Si ya hay un scanner activo, no crear otro
        if (scannerRef.current || isScanning) {
            console.log('[QRScanner] Scanner ya está activo, evitando duplicado')
            return
        }

        // Inicializar el scanner
        console.log('[QRScanner] Iniciando scanner...')
        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner
    
        // Configuración mejorada para mejor detección
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        }
    
        scanner
          .start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // QR escaneado exitosamente
              console.log('[QRScanner] QR detectado:', decodedText)
              onScan(decodedText)
            },
            (errorMessage) => {
              // Errores durante el escaneo (normales, se producen continuamente)
              // No hacemos nada aquí para evitar spam en la consola
            }
          )
          .then(() => {
            console.log('[QRScanner] Scanner iniciado correctamente')
            setIsScanning(true)
            setError(null)
          })
          .catch((err) => {
            console.error('[QRScanner] Error starting scanner:', err)
            setError('No se pudo acceder a la cámara. Asegurate de dar permisos.')
            onError?.(err.toString())
            scannerRef.current = null
          })

        // Cleanup al desmontar o cuando isActive cambia
        return () => {
            if (scannerRef.current) {
                console.log('[QRScanner] Limpiando scanner...')
                scannerRef.current
                    .stop()
                    .then(() => {
                        console.log('[QRScanner] Scanner limpiado')
                        scannerRef.current = null
                        setIsScanning(false)
                    })
                    .catch((err) => console.error('Error cleaning up scanner:', err))
            }
        }
    }, [isActive])

    if (error) {
        return (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
                <p className="text-red-300 text-sm">{error}</p>
                <p className="text-red-400 text-xs mt-2">
                    Asegurate de dar permisos de cámara en el navegador
                </p>
            </div>
        )
    }

    return (
        <div className="relative">
            <div id="qr-reader" className="rounded-xl overflow-hidden" />
            {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Overlay de esquinas para guía visual */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                </div>
            )}
        </div>
    )
}
