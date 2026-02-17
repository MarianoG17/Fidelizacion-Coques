// src/hooks/useCarrito.ts
'use client'

import { useState, useEffect } from 'react'

export interface ItemCarrito {
  productoId: number
  varianteId?: number
  nombre: string
  nombreVariante?: string
  precio: number
  cantidad: number
  imagen: string | null
  rendimiento?: string | null
  addOns?: {[nombre: string]: string[]}
  precioAddOns?: number
}

const CARRITO_KEY = 'fidelizacion_carrito'

export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [cargado, setCargado] = useState(false)

  // Cargar del localStorage al montar
  useEffect(() => {
    const carritoGuardado = localStorage.getItem(CARRITO_KEY)
    if (carritoGuardado) {
      try {
        setItems(JSON.parse(carritoGuardado))
      } catch (error) {
        console.error('Error cargando carrito:', error)
      }
    }
    setCargado(true)
  }, [])

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    if (cargado) {
      localStorage.setItem(CARRITO_KEY, JSON.stringify(items))
    }
  }, [items, cargado])

  const agregarItem = (item: Omit<ItemCarrito, 'cantidad'>) => {
    setItems(prevItems => {
      // Buscar si ya existe (mismo producto y misma variante)
      const existe = prevItems.find(i =>
        i.productoId === item.productoId &&
        i.varianteId === item.varianteId
      )

      if (existe) {
        // Incrementar cantidad
        return prevItems.map(i =>
          i.productoId === item.productoId && i.varianteId === item.varianteId
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      } else {
        // Agregar nuevo item
        return [...prevItems, { ...item, cantidad: 1 }]
      }
    })
  }

  const actualizarCantidad = (productoId: number, varianteId: number | undefined, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarItem(productoId, varianteId)
      return
    }

    setItems(prevItems =>
      prevItems.map(i =>
        i.productoId === productoId && i.varianteId === varianteId
          ? { ...i, cantidad }
          : i
      )
    )
  }

  const eliminarItem = (productoId: number, varianteId?: number) => {
    setItems(prevItems =>
      prevItems.filter(i =>
        !(i.productoId === productoId && i.varianteId === varianteId)
      )
    )
  }

  const vaciarCarrito = () => {
    setItems([])
  }

  const cantidadTotal = items.reduce((total, item) => total + item.cantidad, 0)
  const precioTotal = items.reduce((total, item) => {
    const precioBase = item.precio * item.cantidad
    const precioAddOns = (item.precioAddOns || 0) * item.cantidad
    return total + precioBase + precioAddOns
  }, 0)

  return {
    items,
    agregarItem,
    actualizarCantidad,
    eliminarItem,
    vaciarCarrito,
    cantidadTotal,
    precioTotal,
    cargado,
  }
}
