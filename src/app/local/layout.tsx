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
}

export default function LocalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
