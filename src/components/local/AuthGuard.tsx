'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [autenticado, setAutenticado] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    // No proteger la página de login
    if (pathname === '/local/login') {
      setAutenticado(true)
      setVerificando(false)
      return
    }

    // Verificar si hay token en localStorage
    const token = localStorage.getItem('coques_local_token')
    
    if (!token) {
      // No hay token, redirigir a login
      router.push('/local/login')
    } else {
      // Hay token, permitir acceso
      setAutenticado(true)
    }
    
    setVerificando(false)
  }, [router, pathname])

  if (verificando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (!autenticado) {
    return null
  }

  return <>{children}</>
}
