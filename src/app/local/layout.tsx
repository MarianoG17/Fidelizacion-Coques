import AuthGuard from '@/components/local/AuthGuard'

export default function LocalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard>{children}</AuthGuard>
}
