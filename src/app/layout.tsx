import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import InstallPrompt from '@/components/InstallPrompt'
import UpdateNotification from '@/components/UpdateNotification'
import FeedbackModal from '@/components/FeedbackModal'
import PushPermissionPrompt from '@/components/PushPermissionPrompt'

export const metadata: Metadata = {
  title: 'Coques Fidelización',
  description: 'Programa de fidelización de Coques Bakery & Lavadero',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coques Fidelización',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          {children}
          <InstallPrompt />
          <UpdateNotification />
          <FeedbackModal />
          <PushPermissionPrompt />
        </SessionProvider>
      </body>
    </html>
  )
}
