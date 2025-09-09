// OtherJobsExporter - ExcelJS exporter for Other Jobs
// Using exact same structure as TruckWorkDaysExporter to avoid Excel repair errors

class OtherJobsExporter {
  constructor(getFilters) {
    this.getFilters = typeof getFilters === 'function' ? getFilters : () => ({})
    this.isExporting = false
  }

  async export() {
    if (this.isExporting) return
    if (typeof ExcelJS === 'undefined') {
      window.Logger?.error?.('ExcelJS not available', { module: 'OtherJobsExporter', showNotification: true, notificationMessage: 'Excel export not available' })
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
      window.Logger?.success?.('Excel generated', { module: 'OtherJobsExporter', showNotification: true, notificationMessage: `Excel file generated: ${fileName}` })
    } catch (e) {
      console.error('OtherJobs export error', e)
      window.Logger?.error?.('Export failed', { module: 'OtherJobsExporter', showNotification: true, notificationMessage: 'Failed to export Other Jobs' })
    } finally {
      this._setLoading(false)
      this.isExporting = false
    }
  }

  async _fetchData() {
    const { from, to, sampler, search } = this.getFilters() || {}
    const params = new URLSearchParams()
    if (from) params.set('from', new Date(from).toISOString())
    if (to) {
      const dt = new Date(to)
      dt.setHours(23,59,59,999)
      params.set('to', dt.toISOString())
    }
    if (sampler) params.set('surveyor', sampler)
    if (search) params.set('search', search)
    const url = params.toString() ? `/api/otherjobs?${params.toString()}` : '/api/otherjobs'
    const resp = await fetch(url)
    const json = await resp.json()
    if (!resp.ok || !json.success) throw new Error(json.error || 'Fetch failed')
    return Array.isArray(json.data) ? json.data : []
  }

  async _buildWorkbook(rows) {
    // Create workbook - exact same structure as TruckWorkDaysExporter
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Other Jobs System'
    workbook.lastModifiedBy = 'Export System'
    workbook.created = new Date()
    workbook.modified = new Date()

    // Create worksheet - exact same structure as TruckWorkDaysExporter
    const worksheet = workbook.addWorksheet('Other Jobs', {
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

    // 1. TÍTULO PRINCIPAL - exact same structure as TruckWorkDaysExporter
    currentRow = this.addMainTitle(worksheet, currentRow)
    currentRow += 2 // Espacio

    // 2. HEADERS - exact same structure as TruckWorkDaysExporter
    currentRow = this.addHeaders(worksheet, currentRow)
    currentRow++

    // 3. DATA ROWS - exact same structure as TruckWorkDaysExporter
    rows.forEach((doc, index) => {
      currentRow = this.addDataRow(worksheet, currentRow, doc, index)
      currentRow++
    })

    // 4. CONFIGURAR ANCHOS DE COLUMNA
    this.configureColumnWidths(worksheet)

    return workbook
  }

  /**
   * 📋 Agregar título principal "Other Jobs" - copied from TruckWorkDaysExporter
   */
  addMainTitle(worksheet, startRow) {
    const titleRow = worksheet.getRow(startRow)
    titleRow.getCell(1).value = "Other Jobs"
    
    // Mergear desde A hasta G
    worksheet.mergeCells(`A${startRow}:G${startRow}`)
    
    // Estilo del título - exact same as TruckWorkDaysExporter
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
   * 📋 Agregar headers - copied from TruckWorkDaysExporter structure
   */
  addHeaders(worksheet, startRow) {
    const headers = ['Date', 'Description', 'Assigned To', 'Shift Start', 'Shift End', 'Hours', 'Status']
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
   * 📋 Agregar fila de datos - copied from TruckWorkDaysExporter structure
   */
  addDataRow(worksheet, rowNumber, doc, index) {
    const dataRow = worksheet.getRow(rowNumber)
    
    const values = [
      this.formatDate(doc.operationDate),
      this.formatDescription(doc.jobDescription),
      doc.samplerName || '',
      this.formatTime(doc.shift?.startTime),
      this.formatTime(doc.shift?.endTime),
      doc.shift?.hours || '',
      doc.status || ''
    ]

    // ✅ PATRÓN UNIFICADO: Filas alternadas gris claro/blanco - same as TruckWorkDaysExporter
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
        horizontal: cellIndex === 1 ? 'left' : 'center', // Description column left-aligned
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
   * 📏 Configurar anchos de columna - copied from TruckWorkDaysExporter
   */
  configureColumnWidths(worksheet) {
    const columnWidths = [
      { width: 14 }, // Date
      { width: 50 }, // Description - wide for long descriptions
      { width: 20 }, // Assigned To
      { width: 14 }, // Shift Start
      { width: 14 }, // Shift End
      { width: 10 }, // Hours
      { width: 12 }  // Status
    ]

    worksheet.columns = columnWidths
  }

  /**
   * 🕒 Formatear fecha para display - copied from TruckWorkDaysExporter
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
   * 🕒 Formatear hora para display - copied from TruckWorkDaysExporter
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
   * 📝 Formatear descripción de forma segura
   */
  formatDescription(description) {
    if (!description) return ''
    
    try {
      // Limpiar y truncar descripción
      const cleaned = String(description).trim()
      return cleaned.length > 80 ? cleaned.substring(0, 80) + '...' : cleaned
    } catch (e) {
      console.warn('Description format error:', e)
      return ''
    }
  }

  _fileName() {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `other_jobs_${day}-${month}-${year}.xlsx`
  }

  /**
   * 💾 Descargar blob como archivo - copied from TruckWorkDaysExporter
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
    const btn = document.getElementById('otherJobExportBtn')
    if (!btn) return
    if (show) {
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...'
    } else {
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-file-export"></i> Export Excel'
    }
  }
}

window.OtherJobsExporter = OtherJobsExporter
