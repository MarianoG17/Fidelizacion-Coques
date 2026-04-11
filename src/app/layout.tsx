'use client'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// ✅ OPTIMIZACIÓN: Lazy load componentes no críticos
const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), {
  ssr: false,
  loading: () => null
})

const UpdateNotification = dynamic(() => import('@/components/UpdateNotification'), {
  ssr: false,
  loading: () => null
})

const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), {
  ssr: false,
  loading: () => null
})

const PushPermissionPrompt = dynamic(() => import('@/components/PushPermissionPrompt'), {
  ssr: false,
  loading: () => null
})

const ConnectionStatus = dynamic(() => import('@/components/ConnectionStatus'), {
  ssr: false,
  loading: () => null
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://coques.com.ar" />
        <link rel="dns-prefetch" href="https://vercel.app" />

        {/* Metadata */}
        <title>Coques Fidelización</title>
        <meta name="description" content="Programa de fidelización de Coques Bakery & Lavadero" />
        <link rel="manifest" href="/manifest.json" />

        {/* Icons */}
        <link rel="icon" href="/icon-192x192-v3.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icon-512x512-v3.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192x192-v3.png" />

        {/* Apple Web App */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Coques Fidelización" />

        {/* Viewport */}
        <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1e40af" media="(prefers-color-scheme: dark)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>
        <SessionProvider>
          <ConnectionStatus />
          {children}
          <Suspense fallback={null}>
            <InstallPrompt />
            <UpdateNotification />
            <FeedbackModal />
            <PushPermissionPrompt />
          </Suspense>
        </SessionProvider>
      </body>
    </html>
  )
}
