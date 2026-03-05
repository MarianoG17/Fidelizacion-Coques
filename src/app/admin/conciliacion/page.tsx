'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface AyresRecord {
  fecha: string
  hora: string
  dia: string
  numeroVenta: string
  sector: string
  vendedor: string
  cajero: string
  codigo: string
  descuento: string
  tipo: string
  monto: number
}

interface AppRecord {
  id: string
  fecha: string
  hora: string
  clienteNombre: string
  clienteTelefono: string
  beneficioNombre: string
  codigoAyresIT: string
  local: string
  tipoLocal: string
}

interface ConciliacionResult {
  ayresRecord: AyresRecord
  appRecord: AppRecord | null
  estado: 'COINCIDE' | 'NO_ENCONTRADO' | 'POSIBLE_MATCH'
  diferenciaTiempo?: number
}

export default function ConciliacionPage() {
  const router = useRouter()
  const [adminKey, setAdminKey] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ConciliacionResult[] | null>(null)
  const [estadisticas, setEstadisticas] = useState<any>(null)

  // Intentar cargar la admin key del localStorage al montar
  useEffect(() => {
    const storedKey = localStorage.getItem('admin_key')
    if (storedKey) {
      setAdminKey(storedKey)
      setAutenticado(true)
    }
  }, [])

  async function login() {
    if (adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY || adminKey.length > 10) {
      localStorage.setItem('admin_key', adminKey)
      setAutenticado(true)
    } else {
      alert('Clave incorrecta')
    }
  }

  function logout() {
    localStorage.removeItem('admin_key')
    setAutenticado(false)
    setAdminKey('')
    setResultado(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setArchivo(file)
      setResultado(null)
    }
  }

  async function procesarConciliacion() {
    if (!archivo) {
      alert('Selecciona un archivo primero')
      return
    }

    setCargando(true)
    try {
      // Detectar tipo de archivo y parsear
      let ayresRecords: AyresRecord[] = []
      
      if (archivo.name.endsWith('.xlsx') || archivo.name.endsWith('.xls')) {
        ayresRecords = await parsearExcelAyres(archivo)
      } else {
        // CSV
        const text = await archivo.text()
        ayresRecords = parsearCSVAyres(text)
      }

      // Filtrar descuentos que no son parte del programa de fidelización
      const descuentosExcluidos = [
        'Descuento Generico Integracion Woo',
        'Promo mini tortas 4x3',
        'Descuento 20%',
        'Promo macarons 7x6'
      ]
      
      ayresRecords = ayresRecords.filter(record =>
        !descuentosExcluidos.some(excluido =>
          record.descuento.toLowerCase().includes(excluido.toLowerCase())
        )
      )

      if (ayresRecords.length === 0) {
        alert('No se encontraron registros válidos en el archivo (todos fueron filtrados)')
        setCargando(false)
        return
      }

      // Obtener datos de la app
      const fechaMin = ayresRecords[0].fecha
      const fechaMax = ayresRecords[ayresRecords.length - 1].fecha
      
      console.log('Obteniendo datos de la app:', { fechaMin, fechaMax })
      
      const res = await fetch(
        `/api/admin/reportes/descuentos?fechaDesde=${fechaMin}&fechaHasta=${fechaMax}&formato=json`,
        {
          headers: { 'x-admin-key': adminKey },
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Error de API:', res.status, errorText)
        throw new Error(`Error al obtener datos de la app (${res.status}): ${errorText}`)
      }

      const appData = await res.json()
      console.log('Datos recibidos:', appData)
      const appRecords: AppRecord[] = appData.data || []

      // Realizar conciliación
      const resultados = conciliar(ayresRecords, appRecords)
      setResultado(resultados)

      // Calcular estadísticas
      const stats = {
        totalAyres: ayresRecords.length,
        coincidencias: resultados.filter((r) => r.estado === 'COINCIDE').length,
        noEncontrados: resultados.filter((r) => r.estado === 'NO_ENCONTRADO').length,
        posiblesMatches: resultados.filter((r) => r.estado === 'POSIBLE_MATCH').length,
        totalApp: appRecords.length,
        montoTotalAyres: ayresRecords.reduce((sum, r) => sum + r.monto, 0),
      }
      setEstadisticas(stats)
    } catch (error) {
      console.error('Error al procesar conciliación:', error)
      alert('Error al procesar el archivo: ' + (error as Error).message)
    } finally {
      setCargando(false)
    }
  }

  async function parsearExcelAyres(file: File): Promise<AyresRecord[]> {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

    const records: AyresRecord[] = []

    // Saltar encabezado (fila 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 11) continue

      try {
        // Formato esperado: FECHA, DÍA, VENTA, N° FAC, SECTOR, VENDEDOR, CAJERO, CÓDIGO, DESCUENTO, TIPO, A, MONTO
        const fechaHoraRaw = row[0] ? String(row[0]) : ''
        let fecha = ''
        let hora = '00:00'

        // Si la celda de Excel es una fecha numérica, convertirla
        if (typeof row[0] === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(row[0])
          fecha = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
          hora = `${String(excelDate.H || 0).padStart(2, '0')}:${String(excelDate.M || 0).padStart(2, '0')}`
        } else {
          // Es texto, parsearlo
          const fechaHora = fechaHoraRaw.split(' ')
          fecha = convertirFecha(fechaHora[0])
          hora = fechaHora[1] || '00:00'
        }

        const montoRaw = String(row[11] || '0')
        const monto = parseFloat(
          montoRaw
            .replace('$', '')
            .replace(/\./g, '') // Quitar separadores de miles
            .replace(',', '.') // Convertir decimal
        ) || 0

        records.push({
          fecha,
          hora,
          dia: String(row[1] || ''),
          numeroVenta: String(row[2] || ''),
          sector: String(row[4] || ''),
          vendedor: String(row[5] || ''),
          cajero: String(row[6] || ''),
          codigo: String(row[7] || ''),
          descuento: String(row[8] || ''),
          tipo: String(row[9] || ''),
          monto,
        })
      } catch (e) {
        console.warn('Error parseando fila Excel:', row, e)
      }
    }

    return records
  }

  function parsearCSVAyres(text: string): AyresRecord[] {
    const lines = text.split('\n').filter((line) => line.trim())
    const records: AyresRecord[] = []

    // Saltar encabezado
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const cols = line.split(',').map((col) => col.trim().replace(/"/g, ''))

      if (cols.length < 11) continue

      // Formato esperado basado en la imagen:
      // FECHA, DÍA, VENTA, N° FAC, SECTOR, VENDEDOR, CAJERO, CÓDIGO, DESCUENTO, TIPO, A, MONTO
      try {
        const fechaHora = cols[0].split(' ')
        const fecha = fechaHora[0]
        const hora = fechaHora[1] || '00:00'

        records.push({
          fecha: convertirFecha(fecha),
          hora,
          dia: cols[1],
          numeroVenta: cols[2],
          sector: cols[4],
          vendedor: cols[5],
          cajero: cols[6],
          codigo: cols[7],
          descuento: cols[8],
          tipo: cols[9],
          monto: parseFloat(cols[11].replace('$', '').replace('.', '').replace(',', '.')) || 0,
        })
      } catch (e) {
        console.warn('Error parseando línea:', line, e)
      }
    }

    return records
  }

  function convertirFecha(fecha: string): string {
    // Convierte "03/03/26" a "2026-03-03"
    const parts = fecha.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      let year = parts[2]

      // Si el año es de 2 dígitos, agregar "20"
      if (year.length === 2) {
        year = '20' + year
      }

      return `${year}-${month}-${day}`
    }
    return fecha
  }

  function conciliar(ayresRecords: AyresRecord[], appRecords: AppRecord[]): ConciliacionResult[] {
    return ayresRecords.map((ayresRec) => {
      // Buscar coincidencias exactas por código y fecha
      const matches = appRecords.filter((appRec) => {
        const mismaFecha = appRec.fecha === ayresRec.fecha
        const codigoCoincide = appRec.codigoAyresIT === ayresRec.codigo

        return mismaFecha && codigoCoincide
      })

      if (matches.length > 0) {
        // Si hay múltiples matches, elegir el más cercano en tiempo
        const match = matches.reduce((closest, current) => {
          const diffCurrent = Math.abs(
            parseTime(current.hora) - parseTime(ayresRec.hora)
          )
          const diffClosest = Math.abs(
            parseTime(closest.hora) - parseTime(ayresRec.hora)
          )
          return diffCurrent < diffClosest ? current : closest
        })

        return {
          ayresRecord: ayresRec,
          appRecord: match,
          estado: 'COINCIDE',
          diferenciaTiempo: Math.abs(parseTime(match.hora) - parseTime(ayresRec.hora)),
        }
      }

      // Buscar posibles matches por fecha y hora cercana (sin código)
      const posiblesMatches = appRecords.filter((appRec) => {
        const mismaFecha = appRec.fecha === ayresRec.fecha
        const diferenciaMinutos = Math.abs(
          parseTime(appRec.hora) - parseTime(ayresRec.hora)
        )
        return mismaFecha && diferenciaMinutos < 300 // 5 minutos de tolerancia
      })

      if (posiblesMatches.length > 0) {
        const match = posiblesMatches[0]
        return {
          ayresRecord: ayresRec,
          appRecord: match,
          estado: 'POSIBLE_MATCH',
          diferenciaTiempo: Math.abs(parseTime(match.hora) - parseTime(ayresRec.hora)),
        }
      }

      return {
        ayresRecord: ayresRec,
        appRecord: null,
        estado: 'NO_ENCONTRADO',
      }
    })
  }

  function parseTime(timeStr: string): number {
    // Convierte "14:40:00" a minutos desde medianoche
    const parts = timeStr.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }

  function descargarResultados() {
    if (!resultado) return

    const csv = [
      'Estado,Fecha Ayres,Hora Ayres,Código,Descuento,Monto,Sector,Vendedor,Cliente App,Teléfono,Beneficio App,Diferencia Tiempo (min)',
      ...resultado.map((r) => {
        const diff = r.diferenciaTiempo ? Math.round(r.diferenciaTiempo).toString() : ''
        return [
          r.estado,
          r.ayresRecord.fecha,
          r.ayresRecord.hora,
          r.ayresRecord.codigo,
          r.ayresRecord.descuento,
          r.ayresRecord.monto,
          r.ayresRecord.sector,
          r.ayresRecord.vendedor,
          r.appRecord?.clienteNombre || '',
          r.appRecord?.clienteTelefono || '',
          r.appRecord?.beneficioNombre || '',
          diff,
        ]
          .map((v) => `"${v}"`)
          .join(',')
      }),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conciliacion_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6">Admin - Conciliación AyresIT</h1>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="Clave de administrador"
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            Acceder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Conciliación AyresIT</h1>
            <p className="text-slate-400">Cruza descuentos de AyresIT con registros de la app</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              ← Volver
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Subir archivo */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">1. Subir archivo de AyresIT (CSV o Excel)</h2>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {archivo && (
                <p className="text-slate-400 text-sm mt-2">
                  Archivo seleccionado: {archivo.name} ({(archivo.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <p className="text-slate-500 text-xs mt-2">
                Formatos aceptados: CSV (.csv), Excel (.xlsx, .xls)
              </p>
            </div>
            <button
              onClick={procesarConciliacion}
              disabled={!archivo || cargando}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {cargando ? 'Procesando...' : '2. Procesar Conciliación'}
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Total AyresIT</p>
              <p className="text-2xl font-bold text-white">{estadisticas.totalAyres}</p>
            </div>
            <div className="bg-green-900/30 rounded-xl p-4">
              <p className="text-green-400 text-sm">Coincidencias</p>
              <p className="text-2xl font-bold text-green-300">{estadisticas.coincidencias}</p>
            </div>
            <div className="bg-yellow-900/30 rounded-xl p-4">
              <p className="text-yellow-400 text-sm">Posibles Match</p>
              <p className="text-2xl font-bold text-yellow-300">{estadisticas.posiblesMatches}</p>
            </div>
            <div className="bg-red-900/30 rounded-xl p-4">
              <p className="text-red-400 text-sm">No Encontrados</p>
              <p className="text-2xl font-bold text-red-300">{estadisticas.noEncontrados}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Monto Total</p>
              <p className="text-xl font-bold text-white">${estadisticas.montoTotalAyres.toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultado && (
          <div className="bg-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Resultados de Conciliación</h2>
              <button
                onClick={descargarResultados}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
              >
                📥 Descargar CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="text-left p-3 text-slate-300 font-semibold">Estado</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Fecha/Hora Ayres</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Código</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Descuento</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Monto</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Sector</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Cliente App</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Beneficio App</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Dif. Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-t border-slate-700 ${r.estado === 'COINCIDE'
                        ? 'bg-green-900/20'
                        : r.estado === 'POSIBLE_MATCH'
                          ? 'bg-yellow-900/20'
                          : 'bg-red-900/20'
                        }`}
                    >
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${r.estado === 'COINCIDE'
                            ? 'bg-green-900 text-green-200'
                            : r.estado === 'POSIBLE_MATCH'
                              ? 'bg-yellow-900 text-yellow-200'
                              : 'bg-red-900 text-red-200'
                            }`}
                        >
                          {r.estado === 'COINCIDE'
                            ? '✓ OK'
                            : r.estado === 'POSIBLE_MATCH'
                              ? '? Posible'
                              : '✗ No encontrado'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 text-sm">
                        {r.ayresRecord.fecha} {r.ayresRecord.hora}
                      </td>
                      <td className="p-3 text-slate-300 font-mono text-sm">{r.ayresRecord.codigo}</td>
                      <td className="p-3 text-slate-300 text-sm">{r.ayresRecord.descuento}</td>
                      <td className="p-3 text-slate-300 font-semibold text-sm">
                        ${r.ayresRecord.monto.toFixed(0)}
                      </td>
                      <td className="p-3 text-slate-300 text-sm">{r.ayresRecord.sector}</td>
                      <td className="p-3 text-slate-300 text-sm">
                        {r.appRecord ? (
                          <div>
                            <p className="font-semibold">{r.appRecord.clienteNombre}</p>
                            <p className="text-xs text-slate-400">{r.appRecord.clienteTelefono}</p>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 text-sm">
                        {r.appRecord?.beneficioNombre || <span className="text-slate-600">-</span>}
                      </td>
                      <td className="p-3 text-slate-400 text-sm">
                        {r.diferenciaTiempo !== undefined
                          ? `${Math.round(r.diferenciaTiempo)} min`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
