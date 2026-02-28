import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coques Staff - Atención al Cliente',
  description: 'App de atención al cliente para empleados de Coques Bakery',
  manifest: '/manifest-staff.json',
  themeColor: '#7c3aed',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Coques Staff',
  },
  icons: {
    icon: [
      { url: '/icon-192x192-v2.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512-v2.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192x192-v2.png',
  },
}

export default function LocalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Forzar manifest staff en head */}
      <link rel="manifest" href="/manifest-staff.json" />
      {children}
    </>
  )
}
