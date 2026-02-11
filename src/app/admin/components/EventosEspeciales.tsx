'use client'
import { useState, useEffect } from 'react'

interface EventoEspecial {
  id: string
  titulo: string
  descripcion: string
  fechaEvento: string
  nivelMinimo: { nombre: string }
  cupoMaximo: number
  inscriptosCount: number
  estado: string
  inscripciones: {
    cliente: { nombre: string; phone: string }
    estado: string
  }[]
}

export function EventosEspeciales({ adminKey }: { adminKey: string }) {
  const [eventos, setEventos] = useState<EventoEspecial[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalCrear, setModalCrear] = useState(false)
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoEspecial | null>(null)

  useEffect(() => {
    fetchEventos()
  }, [])

  async function fetchEventos() {
    try {
      const res = await fetch('/api/admin/eventos', {
        headers: { 'x-admin-key': adminKey },
      })
      if (res.ok) {
        const json = await res.json()
        setEventos(json.data || [])
      }
    } catch (e) {
      console.error('Error al cargar eventos:', e)
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Eventos Especiales</h2>
        <button
          onClick={() => setModalCrear(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          + Crear Evento
        </button>
      </div>

      {eventos.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400">No hay eventos creados todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {eventos.map((evento) => (
            <EventoCard
              key={evento.id}
              evento={evento}
              onVer={() => setEventoSeleccionado(evento)}
              onRefresh={fetchEventos}
              adminKey={adminKey}
            />
          ))}
        </div>
      )}

      {/* Modal Crear Evento */}
      {modalCrear && (
        <ModalCrearEvento
          adminKey={adminKey}
          onClose={() => setModalCrear(false)}
          onCreado={() => {
            setModalCrear(false)
            fetchEventos()
          }}
        />
      )}

      {/* Modal Ver Evento */}
      {eventoSeleccionado && (
        <ModalVerEvento
          evento={eventoSeleccionado}
          onClose={() => setEventoSeleccionado(null)}
        />
      )}
    </div>
  )
}

function EventoCard({
  evento,
  onVer,
  onRefresh,
  adminKey,
}: {
  evento: EventoEspecial
  onVer: () => void
  onRefresh: () => void
  adminKey: string
}) {
  const fecha = new Date(evento.fechaEvento)
  const cupoLleno = evento.inscriptosCount >= evento.cupoMaximo

  async function cambiarEstado(nuevoEstado: string) {
    try {
      await fetch(`/api/admin/eventos/${evento.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      onRefresh()
    } catch (e) {
      console.error('Error al cambiar estado:', e)
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{evento.titulo}</h3>
          <p className="text-sm text-slate-400">
            {fecha.toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            evento.estado === 'PUBLICADO'
              ? 'bg-green-900 text-green-200'
              : evento.estado === 'CANCELADO'
              ? 'bg-red-900 text-red-200'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {evento.estado}
        </span>
      </div>

      <p className="text-slate-300 text-sm mb-4 line-clamp-2">
        {evento.descripcion}
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Nivel mínimo:</span>
          <span className="text-white text-sm font-semibold">
            {evento.nivelMinimo.nombre}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Cupo:</span>
          <span
            className={`text-sm font-semibold ${
              cupoLleno ? 'text-red-400' : 'text-white'
            }`}
          >
            {evento.inscriptosCount}/{evento.cupoMaximo}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onVer}
          className="flex-1 bg-slate-700 text-white py-2 rounded-lg text-sm font-semibold hover:bg-slate-600 transition"
        >
          Ver inscriptos
        </button>
        {evento.estado === 'PUBLICADO' && (
          <button
            onClick={() => cambiarEstado('CANCELADO')}
            className="bg-red-900 text-red-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-800 transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

function ModalCrearEvento({
  adminKey,
  onClose,
  onCreado,
}: {
  adminKey: string
  onClose: () => void
  onCreado: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaEvento, setFechaEvento] = useState('')
  const [nivelMinimo, setNivelMinimo] = useState('Bronce')
  const [cupoMaximo, setCupoMaximo] = useState(20)
  const [guardando, setGuardando] = useState(false)

  async function crear() {
    if (!titulo || !fechaEvento) return
    setGuardando(true)

    try {
      const res = await fetch('/api/eventos-especiales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          titulo,
          descripcion,
          fechaEvento: new Date(fechaEvento).toISOString(),
          nivelMinimo,
          cupoMaximo,
        }),
      })

      if (res.ok) {
        onCreado()
      }
    } catch (e) {
      console.error('Error al crear evento:', e)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">Crear Evento Especial</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título del evento
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fecha del evento
            </label>
            <input
              type="datetime-local"
              value={fechaEvento}
              onChange={(e) => setFechaEvento(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nivel mínimo
            </label>
            <select
              value={nivelMinimo}
              onChange={(e) => setNivelMinimo(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Bronce</option>
              <option>Plata</option>
              <option>Oro</option>
              <option>Platino</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cupo máximo
            </label>
            <input
              type="number"
              value={cupoMaximo}
              onChange={(e) => setCupoMaximo(Number(e.target.value))}
              min={1}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-semibold hover:bg-slate-600 transition"
          >
            Cancelar
          </button>
          <button
            onClick={crear}
            disabled={guardando || !titulo || !fechaEvento}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {guardando ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalVerEvento({
  evento,
  onClose,
}: {
  evento: EventoEspecial
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">{evento.titulo}</h3>

        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-400 mb-2">
            Inscriptos ({evento.inscriptosCount}/{evento.cupoMaximo})
          </h4>
          {evento.inscripciones.length === 0 ? (
            <p className="text-slate-500 text-sm">Todavía no hay inscriptos</p>
          ) : (
            <div className="space-y-2">
              {evento.inscripciones.map((inscripcion, idx) => (
                <div
                  key={idx}
                  className="bg-slate-700 rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-semibold">
                      {inscripcion.cliente.nombre}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {inscripcion.cliente.phone}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      inscripcion.estado === 'CONFIRMADA'
                        ? 'bg-green-900 text-green-200'
                        : inscripcion.estado === 'ASISTIO'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {inscripcion.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-700 text-white py-3 rounded-xl font-semibold hover:bg-slate-600 transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
