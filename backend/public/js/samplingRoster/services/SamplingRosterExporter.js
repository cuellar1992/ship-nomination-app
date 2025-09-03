// SamplingRosterExporter - Versión que ataca los problemas específicos identificados
export class SamplingRosterExporter {
  constructor(getFilters) {
    this.getFilters = typeof getFilters === 'function' ? getFilters : () => ({})
    this.isExporting = false
  }

  async export() {
    if (this.isExporting) return
    if (typeof ExcelJS === 'undefined') {
      window.Logger?.error?.('ExcelJS not available', { module: 'SamplingRosterExporter', showNotification: true, notificationMessage: 'Excel export not available' })
      return
    }

    try {
      this.isExporting = true
      this._setLoading(true)
      
      const rows = await this._fetchData()
      if (!rows || rows.length === 0) {
        window.Logger?.warn?.('No data to export', { module: 'SamplingRosterExporter', showNotification: true, notificationMessage: 'No data available to export' })
        return
      }

      // Crear workbook con configuración mínima
      const workbook = new ExcelJS.Workbook()
      const ws = workbook.addWorksheet('Sampling Roster')

      // PROBLEMA 1: Evitar merge de celdas que causa conflictos
      // En lugar de merge, usar header en primera celda con alineación
      const today = new Date().toLocaleDateString('en-GB')
      const headerText = `MOLEKULIS LOADING REPORT - ${today} | Records: ${rows.length}`
      
      // Fila 1: Header sin merge
      const headerRow = ws.addRow([headerText])
      const headerCell = headerRow.getCell(1)
      headerCell.font = { size: 14, bold: true }
      
      // Fila 2: Vacía
      ws.addRow([])
      
      // Fila 3: Headers de datos
      const headers = ['Date', 'Terminal', 'Surveyor', 'Shift Start', 'Shift End', 'Hours', 'Loads', 'Status']
      const dataHeaderRow = ws.addRow(headers)
      
      // Aplicar formato a headers de datos de forma segura
      headers.forEach((header, index) => {
        const cell = dataHeaderRow.getCell(index + 1)
        cell.font = { bold: true }
        cell.value = String(header) // FORZAR A STRING
      })

      // PROBLEMA 2 & 3: Procesar datos con máxima seguridad
      rows.forEach((doc, rowIndex) => {
        const row = [
          this.bulletproofString(this.formatDate(doc.operationDate)),
          this.bulletproofString(doc.terminal),
          this.bulletproofString(doc.samplerName),
          this.bulletproofString(this.formatTime(doc?.shift?.startTime)),
          this.bulletproofString(this.formatTime(doc?.shift?.endTime)),
          this.bulletproofString(doc?.shift?.hours),
          this.bulletproofString(this.formatLoads(doc.loads)),
          this.bulletproofString(doc.status)
        ]

        const excelRow = ws.addRow([])
        
        // PROBLEMA 4: Asignar valores celda por celda para evitar objetos complejos
        row.forEach((value, colIndex) => {
          const cell = excelRow.getCell(colIndex + 1)
          // FORZAR TODO A STRING PLANO - nunca objetos
          const plainValue = this.forceToPlainString(value)
          cell.value = plainValue
        })
      })

      // Configurar anchos SIN autofit problemático
      const fixedWidths = [12, 20, 15, 15, 15, 8, 40, 12]
      ws.columns = fixedWidths.map(width => ({ width }))

      // Buffer y descarga
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = this._fileName()
      this.downloadBlob(blob, fileName)

      window.Logger?.success?.('Excel generated', { module: 'SamplingRosterExporter', showNotification: true, notificationMessage: `Excel file generated: ${fileName}` })

    } catch (e) {
      console.error('Export error:', e)
      window.Logger?.error?.('Export failed', { module: 'SamplingRosterExporter', showNotification: true, notificationMessage: 'Failed to export: ' + e.message })
    } finally {
      this._setLoading(false)
      this.isExporting = false
    }
  }

  async _fetchData() {
    const { from, to, surveyor } = this.getFilters() || {}
    const params = new URLSearchParams()
    if (from) params.set('from', new Date(from).toISOString())
    if (to) {
      const dt = new Date(to)
      dt.setHours(23,59,59,999)
      params.set('to', dt.toISOString())
    }
    if (surveyor) params.set('surveyor', surveyor)
    // NOTE: This endpoint likely differs for Sampling Roster; adjust if needed
    const url = params.toString() ? `/api/samplingroster?${params.toString()}` : '/api/samplingroster'
    const resp = await fetch(url)
    const json = await resp.json()
    if (!resp.ok || !json.success) throw new Error(json.error || 'Fetch failed')
    return Array.isArray(json.data) ? json.data : []
  }

  // SOLUCIÓN PROBLEMA 1: Función ultra segura para strings
  bulletproofString(value) {
    // Manejar todos los casos edge
    if (value === null || value === undefined) return ''
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return isNaN(value) ? '' : String(value)
    
    let str = String(value)
    
    // Eliminar caracteres XML inválidos de forma más agresiva
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    
    // Eliminar caracteres Unicode problemáticos
    str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    
    // Normalizar espacios y saltos de línea
    str = str.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim()
    
    // Escapar caracteres XML especiales
    str = str
      .replace(/&/g, 'and')
      .replace(/</g, '')
      .replace(/>/g, '')
      .replace(/"/g, "'")
      .replace(/'/g, "'")
    
    // Limitar longitud para evitar problemas de memoria
    if (str.length > 200) {
      str = str.substring(0, 197) + '...'
    }
    
    return str
  }

  // SOLUCIÓN PROBLEMA 2: Forzar a string plano (no objetos)
  forceToPlainString(value) {
    const cleaned = this.bulletproofString(value)
    
    // Verificar que no sea un objeto
    if (typeof cleaned === 'object') {
      console.warn('Object detected, converting to string:', cleaned)
      if (cleaned && cleaned.text) return String(cleaned.text)
      return String(cleaned)
    }
    
    return cleaned
  }

  formatDate(value) {
    if (!value) return ''
    
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return ''
      
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      
      return `${day}/${month}/${year}`
    } catch (e) {
      console.warn('Date format error:', e)
      return ''
    }
  }

  formatTime(value) {
    if (!value) return ''
    
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return ''
      
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      
      return `${hours}:${minutes}`
    } catch (e) {
      console.warn('Time format error:', e)
      return ''
    }
  }

  // SOLUCIÓN PROBLEMA 1: Formatear loads de forma ultra segura
  formatLoads(loads) {
    if (!loads) return ''
    
    try {
      if (!Array.isArray(loads)) return ''
      
      const processed = loads
        .filter(load => {
          // Verificar que load sea un objeto válido
          return load && typeof load === 'object' && !Array.isArray(load)
        })
        .slice(0, 2) // Máximo 2 loads para evitar strings largas
        .map(load => {
          const parts = []
          
          // Procesar cada campo de forma segura
          if (load.loadNo && load.loadNo !== null && load.loadNo !== undefined) {
            parts.push(`L${String(load.loadNo)}`)
          }
          
          if (load.startTime) {
            const time = this.formatTime(load.startTime)
            if (time) parts.push(time)
          }
          
          if (load.product && load.product !== null && load.product !== undefined) {
            const product = String(load.product).trim()
            if (product && product.length > 0) {
              parts.push(product.substring(0, 15))
            }
          }
          
          return parts.join(' ').trim()
        })
        .filter(item => item && item.length > 0)
        .join(' | ')
      
      return processed.substring(0, 100) // Limitar longitud total
      
    } catch (e) {
      console.warn('Error formatting loads:', e)
      return ''
    }
  }

  downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  _fileName() {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `molekulis_loading_${day}-${month}-${year}.xlsx`
  }

  _setLoading(show) {
    const btn = document.getElementById('samplingExportBtn')
    if (!btn) return
    if (show) {
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...'
    } else {
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-file-export"></i>Export Excel'
    }
  }
}

if (typeof window !== 'undefined') {
  window.SamplingRosterExporter = SamplingRosterExporter
}