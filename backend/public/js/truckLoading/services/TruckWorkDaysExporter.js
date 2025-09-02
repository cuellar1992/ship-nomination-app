// TruckWorkDaysExporter - ExcelJS exporter for Molekulis Loading (Truck Work Days)
// Using exact same structure as SamplingRosterExporter to avoid Excel repair errors

class TruckWorkDaysExporter {
  constructor(getFilters) {
    this.getFilters = typeof getFilters === 'function' ? getFilters : () => ({})
    this.isExporting = false
  }

  async export() {
    if (this.isExporting) return
    if (typeof ExcelJS === 'undefined') {
      window.Logger?.error?.('ExcelJS not available', { module: 'TruckWorkDaysExporter', showNotification: true, notificationMessage: 'Excel export not available' })
      return
    }
    try {
      this.isExporting = true
      this._setLoading(true)
      const rows = await this._fetchData()
      const workbook = await this._buildWorkbook(rows)
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = this._fileName()
      this._downloadBlob(blob, fileName)
      window.Logger?.success?.('Excel generated', { module: 'TruckWorkDaysExporter', showNotification: true, notificationMessage: `Excel file generated: ${fileName}` })
    } catch (e) {
      console.error('TruckWorkDays export error', e)
      window.Logger?.error?.('Export failed', { module: 'TruckWorkDaysExporter', showNotification: true, notificationMessage: 'Failed to export Truck Work Days' })
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
    const url = params.toString() ? `/api/truckworkdays?${params.toString()}` : '/api/truckworkdays'
    const resp = await fetch(url)
    const json = await resp.json()
    if (!resp.ok || !json.success) throw new Error(json.error || 'Fetch failed')
    return Array.isArray(json.data) ? json.data : []
  }

  async _buildWorkbook(rows) {
    // Create workbook - exact same structure as SamplingRosterExporter
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Molekulis Loading System'
    workbook.lastModifiedBy = 'Export System'
    workbook.created = new Date()
    workbook.modified = new Date()

    // Create worksheet - exact same structure as SamplingRosterExporter
    const worksheet = workbook.addWorksheet('Molekulis Loading', {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'portrait',
        margins: {
          left: 0.7, right: 0.7,
          top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      },
      views: [{
        showGridLines: false
      }]
    })

    let currentRow = 1

    // 1. TÍTULO PRINCIPAL - exact same structure as SamplingRosterExporter
    currentRow = this.addMainTitle(worksheet, currentRow)
    currentRow += 2 // Espacio

    // 2. HEADERS - exact same structure as SamplingRosterExporter
    currentRow = this.addHeaders(worksheet, currentRow)
    currentRow++

    // 3. DATA ROWS - exact same structure as SamplingRosterExporter
    rows.forEach((doc, index) => {
      currentRow = this.addDataRow(worksheet, currentRow, doc, index)
      currentRow++
    })

    // 4. CONFIGURAR ANCHOS DE COLUMNA
    this.configureColumnWidths(worksheet)

    return workbook
  }

  /**
   * 📋 Agregar título principal "Molekulis Loading" - copied from SamplingRosterExporter
   */
  addMainTitle(worksheet, startRow) {
    const titleRow = worksheet.getRow(startRow)
    titleRow.getCell(1).value = "Molekulis Loading"
    
    // Mergear desde A hasta H
    worksheet.mergeCells(`A${startRow}:H${startRow}`)
    
    // Estilo del título - exact same as SamplingRosterExporter
    const titleCell = titleRow.getCell(1)
    titleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
      color: { argb: 'FFFFFFFF' } // Texto blanco
    }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B365D' } // Fondo azul marino
    }
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    }
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF1B365D' } },
      left: { style: 'medium', color: { argb: 'FF1B365D' } },
      bottom: { style: 'medium', color: { argb: 'FF1B365D' } },
      right: { style: 'medium', color: { argb: 'FF1B365D' } }
    }
    
    titleRow.height = 35
    
    return startRow
  }

  /**
   * 📋 Agregar headers - copied from SamplingRosterExporter structure
   */
  addHeaders(worksheet, startRow) {
    const headers = ['Date', 'Terminal', 'Surveyor', 'Shift Start', 'Shift End', 'Hours', 'Loads', 'Status']
    const headerRow = worksheet.getRow(startRow)
    
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1)
      cell.value = header
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1B365D' }
      }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1B365D' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      }
    })
    
    headerRow.height = 30
    
    return startRow
  }

  /**
   * 📋 Agregar fila de datos - copied from SamplingRosterExporter structure
   */
  addDataRow(worksheet, rowNumber, doc, index) {
    const dataRow = worksheet.getRow(rowNumber)
    
    const values = [
      this.formatDate(doc.operationDate),
      doc.terminal || '',
      doc.samplerName || '',
      this.formatTime(doc.shift?.startTime),
      this.formatTime(doc.shift?.endTime),
      doc.shift?.hours || '',
      this.formatLoads(doc.loads),
      doc.status || ''
    ]

    // ✅ PATRÓN UNIFICADO: Filas alternadas gris claro/blanco - same as SamplingRosterExporter
    const isEvenRow = index % 2 === 0
    const backgroundColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF' // Gris claro / Blanco

    values.forEach((data, cellIndex) => {
      const cell = dataRow.getCell(cellIndex + 1)
      cell.value = data
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF2F5597' }
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: backgroundColor }
      }
      cell.alignment = {
        horizontal: cellIndex === 6 ? 'left' : 'center', // Loads column left-aligned
        vertical: 'middle'
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
      }
    })
    
    dataRow.height = 25
    
    return rowNumber
  }

  /**
   * 📏 Configurar anchos de columna - copied from SamplingRosterExporter
   */
  configureColumnWidths(worksheet) {
    const columnWidths = [
      { width: 14 }, // Date
      { width: 16 }, // Terminal  
      { width: 20 }, // Surveyor
      { width: 14 }, // Shift Start
      { width: 14 }, // Shift End
      { width: 10 }, // Hours
      { width: 50 }, // Loads - wide for multiple loads
      { width: 12 }  // Status
    ]

    worksheet.columns = columnWidths
  }

  /**
   * 🕒 Formatear fecha para display - copied from SamplingRosterExporter
   */
  formatDate(dateValue) {
    if (!dateValue) return ''
    
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return ''
      
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      
      return `${day}/${month}/${year}`
    } catch (error) {
      console.warn('Date format error:', error)
      return ''
    }
  }

  /**
   * 🕒 Formatear hora para display - copied from SamplingRosterExporter
   */
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

  /**
   * 🚛 Formatear loads de forma ultra segura - copied and adapted from SamplingRosterExporter
   */
  formatLoads(loads) {
    if (!loads) return ''
    
    try {
      if (!Array.isArray(loads)) return ''
      
      const processed = loads
        .filter(load => {
          // Verificar que load sea un objeto válido
          return load && typeof load === 'object' && !Array.isArray(load)
        })
        .slice(0, 3) // Máximo 3 loads para evitar strings largas
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
      
      return processed.substring(0, 80) // Limitar longitud total
      
    } catch (e) {
      console.warn('Error formatting loads:', e)
      return ''
    }
  }

  _fileName() {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `molekulis_loading_${day}-${month}-${year}.xlsx`
  }

  /**
   * 💾 Descargar blob como archivo - copied from SamplingRosterExporter
   */
  _downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  _setLoading(show) {
    const btn = document.getElementById('truckExportBtn')
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

window.TruckWorkDaysExporter = TruckWorkDaysExporter