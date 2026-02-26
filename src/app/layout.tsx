// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import UpdateNotification from '@/components/UpdateNotification'
import InstallPrompt from '@/components/InstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coques Bakery',
  description: 'Tu programa de beneficios en Coques Bakery',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coques Bakery',
  },
  icons: {
    apple: '/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        {/* iOS PWA Support */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FidZona" />

        {/* Android PWA Support */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="FidZona" />

        {/* Additional PWA Meta Tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="full-screen" content="yes" />
        <meta name="browsermode" content="application" />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('✅ SW registered:', reg.scope))
                    .catch(err => console.error('❌ SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <UpdateNotification />
        <InstallPrompt />
      </body>
    </html>
  )
}
