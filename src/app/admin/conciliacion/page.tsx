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
  const [ayresData, setAyresData] = useState<AyresRecord[] | null>(null)
  const [vistaActual, setVistaActual] = useState<'conciliacion' | 'excel' | 'historial'>('conciliacion')
  const [notasConfirmacion, setNotasConfirmacion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [validaciones, setValidaciones] = useState<Record<number, 'valido' | 'invalido'>>({})

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

  async function confirmarConciliacion() {
    if (!resultado || !estadisticas || !ayresData) return
    setConfirmando(true)
    try {
      const fechaMin = ayresData[0].fecha
      const fechaMax = ayresData[ayresData.length - 1].fecha
      const res = await fetch('/api/admin/conciliacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          fechaDesde: fechaMin,
          fechaHasta: fechaMax,
          estadisticas,
          resultados: resultado.map((r, i) => ({ ...r, validacionManual: validaciones[i] || null })),
          notas: notasConfirmacion,
        }),
      })
      if (res.ok) {
        setConfirmado(true)
        setNotasConfirmacion('')
      } else {
        alert('Error al confirmar la conciliación')
      }
    } catch {
      alert('Error al confirmar la conciliación')
    } finally {
      setConfirmando(false)
    }
  }

  async function cargarHistorial() {
    setCargandoHistorial(true)
    try {
      const res = await fetch('/api/admin/conciliacion', {
        headers: { 'x-admin-key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setHistorial(data.data || [])
      }
    } catch {
      // silencioso
    } finally {
      setCargandoHistorial(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setArchivo(file)
      setResultado(null)
      setConfirmado(false)
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

      // Guardar registros del Excel para vista previa
      setAyresData(ayresRecords)
      setVistaActual('conciliacion')
      setValidaciones({})
      setConfirmado(false)

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

  // Función para normalizar texto (quitar tildes y pasar a lowercase)
  function normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes
  }

  // Función para normalizar fechas a formato YYYY-MM-DD
  function normalizarFecha(fecha: string): string {
    // Si ya está en formato YYYY-MM-DD, devolverla tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha
    }

    // Si está en formato DD/MM/YYYY, convertir
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
      const [day, month, year] = fecha.split('/')
      return `${year}-${month}-${day}`
    }

    return fecha
  }

  function conciliar(ayresRecords: AyresRecord[], appRecords: AppRecord[]): ConciliacionResult[] {
    console.log('[CONCILIACION] Total Ayres:', ayresRecords.length, 'Total App:', appRecords.length)
    console.log('[CONCILIACION] Registros App:', appRecords)

    // Rastrear qué registros de la app ya han sido matcheados (COINCIDE o POSIBLE)
    const appRecordsUsados = new Set<string>()
    const appRecordsPosibleUsados = new Set<string>()

    return ayresRecords.map((ayresRec) => {
      // Normalizar nombre del descuento de Ayres (lowercase + sin tildes)
      const descuentoAyresNorm = normalizar(ayresRec.descuento)

      console.log('[PROCESANDO]', {
        fecha: ayresRec.fecha,
        hora: ayresRec.hora,
        descuento: ayresRec.descuento,
        codigo: ayresRec.codigo
      })

      // Buscar coincidencias por NOMBRE del beneficio y fecha
      // IMPORTANTE: Excluir registros de la app que ya fueron matcheados
      const matches = appRecords.filter((appRec) => {
        // Si este registro ya fue usado, no considerarlo
        const appRecKey = `${appRec.fecha}_${appRec.hora}_${appRec.beneficioNombre}`
        if (appRecordsUsados.has(appRecKey)) {
          return false
        }
        // Normalizar fechas para comparación
        const fechaAyresNorm = normalizarFecha(ayresRec.fecha)
        const fechaAppNorm = normalizarFecha(appRec.fecha)
        const mismaFecha = fechaAyresNorm === fechaAppNorm

        // Match por código si existe
        if (appRec.codigoAyresIT && appRec.codigoAyresIT === ayresRec.codigo) {
          return true
        }

        // Match por NOMBRE del beneficio (lowercase + sin tildes)
        const beneficioNorm = normalizar(appRec.beneficioNombre)

        // Extraer porcentaje del descuento de Ayres (ej: "5%" de "Descuento App 5% Cafetería")
        const porcentajeMatchAyres = descuentoAyresNorm.match(/(\d+)%/)
        const porcentajeMatchApp = beneficioNorm.match(/(\d+)%/)

        console.log('[COMPARANDO]', {
          ayresDesc: ayresRec.descuento,
          appBenef: appRec.beneficioNombre,
          descNorm: descuentoAyresNorm,
          benefNorm: beneficioNorm,
          porcAyres: porcentajeMatchAyres?.[1],
          porcApp: porcentajeMatchApp?.[1],
          fechaAyres: ayresRec.fecha,
          fechaApp: appRec.fecha,
          mismaFecha
        })

        if (porcentajeMatchAyres && porcentajeMatchApp) {
          const porcentajeAyres = porcentajeMatchAyres[1]
          const porcentajeApp = porcentajeMatchApp[1]

          console.log('[PORCENTAJES]', { ayres: porcentajeAyres, app: porcentajeApp, son_iguales: porcentajeAyres === porcentajeApp })

          // Mismo porcentaje
          if (porcentajeAyres === porcentajeApp && mismaFecha) {
            // Verificar tipo (cafetería, lavadero, etc.)
            // IMPORTANTE: Usar sin tildes porque ya está normalizado
            const esCafeteriaAyres = descuentoAyresNorm.includes('cafeteria') || descuentoAyresNorm.includes('cafe')
            const esCafeteriaApp = beneficioNorm.includes('cafeteria') || beneficioNorm.includes('cafe')

            const esLavaderoAyres = descuentoAyresNorm.includes('lavadero')
            const esLavaderoApp = beneficioNorm.includes('lavadero')

            console.log('[TIPO CHECK]', {
              esCafeteriaAyres,
              esCafeteriaApp,
              esLavaderoAyres,
              esLavaderoApp,
              descNorm: descuentoAyresNorm,
              benefNorm: beneficioNorm
            })

            const tienetipoAyres = esCafeteriaAyres || esLavaderoAyres
            const tienetipoApp = esCafeteriaApp || esLavaderoApp

            const mismoTipo =
              (esCafeteriaAyres && esCafeteriaApp) ||
              (esLavaderoAyres && esLavaderoApp) ||
              (!tienetipoAyres && !tienetipoApp) // Ej: "Bienvenida" no tiene tipo específico

            if (mismoTipo) {
              // Verificar ventana de tiempo (2 horas = 120 minutos)
              const diferenciaMinutos = Math.abs(
                parseTime(appRec.hora) - parseTime(ayresRec.hora)
              )

              console.log('[MATCH]', {
                ayres: ayresRec.descuento,
                app: appRec.beneficioNombre,
                porcentaje: porcentajeAyres,
                diferencia: diferenciaMinutos + ' min'
              })

              return diferenciaMinutos <= 120
            }
          }
        }

        return false
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

        // Marcar este registro de la app como usado
        const matchKey = `${match.fecha}_${match.hora}_${match.beneficioNombre}`
        appRecordsUsados.add(matchKey)

        console.log('[MATCH REGISTRADO]', {
          ayres: ayresRec.descuento,
          app: match.beneficioNombre,
          usadosTotal: appRecordsUsados.size
        })

        return {
          ayresRecord: ayresRec,
          appRecord: match,
          estado: 'COINCIDE',
          diferenciaTiempo: Math.abs(parseTime(match.hora) - parseTime(ayresRec.hora)),
        }
      }

      // Buscar posibles matches por fecha y hora cercana (ventana de 2 horas)
      // Excluir registros ya usados en COINCIDE o en POSIBLE previo
      const posiblesMatches = appRecords.filter((appRec) => {
        const appRecKey = `${appRec.fecha}_${appRec.hora}_${appRec.beneficioNombre}`
        if (appRecordsUsados.has(appRecKey) || appRecordsPosibleUsados.has(appRecKey)) return false
        const mismaFecha = normalizarFecha(appRec.fecha) === normalizarFecha(ayresRec.fecha)
        const diferenciaMinutos = Math.abs(
          parseTime(appRec.hora) - parseTime(ayresRec.hora)
        )
        return mismaFecha && diferenciaMinutos <= 120
      })

      if (posiblesMatches.length > 0) {
        const match = posiblesMatches[0]
        const matchKey = `${match.fecha}_${match.hora}_${match.beneficioNombre}`
        appRecordsPosibleUsados.add(matchKey)
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
    // Maneja formatos: "14:40:00", "14:40", "04:50 p. m.", "07:50:13 p. m."
    const original = timeStr.trim().toLowerCase()

    // Detectar AM/PM usando regex más robusto
    const isPM = /p\.\s?m\./i.test(original) || /pm/i.test(original)
    const isAM = /a\.\s?m\./i.test(original) || /am/i.test(original)

    // Quitar AM/PM del string
    let cleanTime = original
      .replace(/p\.\s?m\./gi, '')
      .replace(/a\.\s?m\./gi, '')
      .replace(/pm/gi, '')
      .replace(/am/gi, '')
      .trim()

    const parts = cleanTime.split(':')
    let horas = parseInt(parts[0]) || 0
    const minutos = parseInt(parts[1]) || 0

    // Convertir de 12h a 24h
    if (isPM && horas !== 12) {
      horas += 12
    } else if (isAM && horas === 12) {
      horas = 0
    }

    // CORRECCIÓN TIMEZONE: Si tiene AM/PM (viene de la app), restar 3h para convertir UTC a Argentina
    if (isPM || isAM) {
      horas -= 3
      // Manejar día anterior si es necesario (ej: 01:00 - 3h = -2 → 22:00 del día anterior)
      if (horas < 0) {
        horas += 24
      }
    }

    const total = horas * 60 + minutos

    console.log('[PARSE TIME]', {
      original: timeStr,
      cleanTime,
      isPM,
      isAM,
      horasOriginal: parseInt(parts[0]),
      horasAjustadas: horas,
      minutos,
      total,
      timezone: (isPM || isAM) ? 'UTC→ART (-3h)' : '24h (sin ajuste)'
    })

    return total
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

        {/* Tabs de vista */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {resultado && (<>
            <button
              onClick={() => setVistaActual('conciliacion')}
              className={`px-5 py-2 rounded-xl font-semibold transition-colors ${vistaActual === 'conciliacion' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Conciliación
            </button>
            <button
              onClick={() => setVistaActual('excel')}
              className={`px-5 py-2 rounded-xl font-semibold transition-colors ${vistaActual === 'excel' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Datos Excel ({ayresData?.length ?? 0} registros)
            </button>
          </>)}
          <button
            onClick={() => { setVistaActual('historial'); cargarHistorial() }}
            className={`px-5 py-2 rounded-xl font-semibold transition-colors ${vistaActual === 'historial' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Historial auditado
          </button>
        </div>

        {/* Panel de confirmación */}
        {resultado && vistaActual === 'conciliacion' && (
          <div className={`rounded-2xl p-5 mb-4 ${confirmado ? 'bg-green-900/40 border border-green-700' : 'bg-slate-800'}`}>
            {confirmado ? (
              <p className="text-green-300 font-semibold">✓ Conciliación confirmada y guardada en el historial</p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="text"
                  value={notasConfirmacion}
                  onChange={e => setNotasConfirmacion(e.target.value)}
                  placeholder="Notas opcionales (ej: todo ok, 3 clientes sin app)"
                  className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={confirmarConciliacion}
                  disabled={confirmando}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
                >
                  {confirmando ? 'Guardando...' : '✓ Confirmar conciliación'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Historial de conciliaciones */}
        {vistaActual === 'historial' && (
          <div className="bg-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Historial de conciliaciones auditadas</h2>
            {cargandoHistorial ? (
              <p className="text-slate-400">Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-slate-400">No hay conciliaciones confirmadas aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700">
                      <th className="text-left p-3 text-slate-300 font-semibold">Fecha auditada</th>
                      <th className="text-left p-3 text-slate-300 font-semibold">Confirmada el</th>
                      <th className="text-center p-3 text-slate-300 font-semibold">Total Ayres</th>
                      <th className="text-center p-3 text-green-400 font-semibold">✓ OK</th>
                      <th className="text-center p-3 text-yellow-400 font-semibold">? Posible</th>
                      <th className="text-center p-3 text-red-400 font-semibold">✗ No encontrado</th>
                      <th className="text-right p-3 text-slate-300 font-semibold">Monto</th>
                      <th className="text-left p-3 text-slate-300 font-semibold">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => {
                      const confirmadoEn = new Date(h.confirmadoEn)
                      const pad = (n: number) => String(n).padStart(2, '0')
                      const fechaConfirm = `${pad(confirmadoEn.getUTCDate())}/${pad(confirmadoEn.getUTCMonth()+1)}/${confirmadoEn.getUTCFullYear()} ${pad(confirmadoEn.getUTCHours())}:${pad(confirmadoEn.getUTCMinutes())}`
                      const fechaRango = h.fechaDesde === h.fechaHasta ? h.fechaDesde : `${h.fechaDesde} → ${h.fechaHasta}`
                      return (
                        <tr key={h.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                          <td className="p-3 text-slate-300 font-mono">{fechaRango}</td>
                          <td className="p-3 text-slate-400">{fechaConfirm}</td>
                          <td className="p-3 text-slate-300 text-center">{h.totalAyres}</td>
                          <td className="p-3 text-green-300 text-center font-semibold">{h.coincidencias}</td>
                          <td className="p-3 text-yellow-300 text-center">{h.posibles}</td>
                          <td className="p-3 text-red-300 text-center">{h.noEncontrados}</td>
                          <td className="p-3 text-slate-300 text-right">${Math.abs(h.montoTotal).toFixed(0)}</td>
                          <td className="p-3 text-slate-400 text-xs">{h.notas || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tabla datos del Excel */}
        {ayresData && vistaActual === 'excel' && (
          <div className="bg-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Datos importados del Excel</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="text-left p-3 text-slate-300 font-semibold">Fecha/Hora</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Día</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Venta</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Sector</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Vendedor</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Cajero</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Código</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Descuento</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Tipo</th>
                    <th className="text-right p-3 text-slate-300 font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {ayresData.map((r, i) => (
                    <tr key={i} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="p-3 text-slate-300">{r.fecha} {r.hora}</td>
                      <td className="p-3 text-slate-400">{r.dia}</td>
                      <td className="p-3 text-slate-300 font-mono">{r.numeroVenta}</td>
                      <td className="p-3 text-slate-300">{r.sector}</td>
                      <td className="p-3 text-slate-300">{r.vendedor}</td>
                      <td className="p-3 text-slate-400">{r.cajero}</td>
                      <td className="p-3 text-slate-300 font-mono">{r.codigo}</td>
                      <td className="p-3 text-slate-300">{r.descuento}</td>
                      <td className="p-3 text-slate-400">{r.tipo}</td>
                      <td className="p-3 text-slate-300 font-semibold text-right">${r.monto.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600 bg-slate-700/50">
                    <td colSpan={9} className="p-3 text-slate-300 font-semibold text-right">Total</td>
                    <td className="p-3 text-white font-bold text-right">
                      ${ayresData.reduce((s, r) => s + r.monto, 0).toFixed(0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultado && vistaActual === 'conciliacion' && (
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
                    <th className="text-left p-3 text-slate-300 font-semibold">Fecha Ayres</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Hora Ayres</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Código</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Descuento</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Monto</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Sector</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Cliente App</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Beneficio App</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Hora App</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Dif. Tiempo</th>
                    <th className="text-center p-3 text-slate-300 font-semibold">Validar</th>
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
                      <td className="p-3 text-slate-300 text-sm">{r.ayresRecord.fecha}</td>
                      <td className="p-3 text-slate-300 text-sm font-mono">{r.ayresRecord.hora}</td>
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
                      <td className="p-3 text-slate-400 text-sm font-mono">
                        {r.appRecord?.hora
                          ? r.appRecord.hora.substring(0, 5)
                          : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="p-3 text-slate-400 text-sm">
                        {r.diferenciaTiempo !== undefined ? (() => {
                          const mins = Math.round(r.diferenciaTiempo)
                          if (mins < 60) return `${mins} min`
                          const h = Math.floor(mins / 60)
                          const m = mins % 60
                          return m > 0 ? `${h}h ${m}min` : `${h}h`
                        })() : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => setValidaciones(v => ({ ...v, [i]: v[i] === 'valido' ? undefined as any : 'valido' }))}
                            title="Marcar como válido"
                            className={`w-7 h-7 rounded-full text-sm font-bold transition-colors ${validaciones[i] === 'valido' ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-green-800 hover:text-green-300'}`}
                          >✓</button>
                          <button
                            onClick={() => setValidaciones(v => ({ ...v, [i]: v[i] === 'invalido' ? undefined as any : 'invalido' }))}
                            title="Marcar como no corresponde"
                            className={`w-7 h-7 rounded-full text-sm font-bold transition-colors ${validaciones[i] === 'invalido' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-red-800 hover:text-red-300'}`}
                          >✗</button>
                        </div>
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
