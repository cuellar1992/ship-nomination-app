/**
 * Sampling Roster Exporter - ExcelJS Implementation
 * Exporta datos de Sampling Roster con formato "Line Sampling Roster"
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';
import DateUtils from '../utils/DateUtils.js';

export class SamplingRosterExporter {
  constructor(controller) {
    this.controller = controller;
    this.isExporting = false;
    
    // Verificar que ExcelJS esté disponible
    if (typeof ExcelJS === 'undefined') {
      Logger.error("ExcelJS library not available", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Excel export functionality not available. Please contact support."
      });
      return;
    }
    
    this.initializeExportButton();
    
    Logger.info("SamplingRosterExporter initialized", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false
    });
  }

  /**
   * 🔧 Inicializar botón de export
   */
  initializeExportButton() {
    const exportBtn = document.getElementById('exportRosterBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportClick());
      
      // Validar visibilidad inicial
      this.updateButtonVisibility();
      
      Logger.debug("Export button initialized", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: false
      });
    } else {
      Logger.warn("Export button not found", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: false
      });
    }

    // 🆕 Inicializar botón de export por rango de fechas
    this.initializeRangeExportButton();
  }

  /**
   * 🆕 Inicializar botón de export por rango de fechas
   */
  initializeRangeExportButton() {
    const rangeExportBtn = document.getElementById('exportRangeBtn');
    if (rangeExportBtn) {
      rangeExportBtn.addEventListener('click', () => this.handleRangeExportClick());
      
      Logger.debug("Range export button initialized", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: false
      });
    }
  }

  /**
   * 👁️ Actualizar visibilidad del botón basado en datos disponibles
   */
  updateButtonVisibility() {
    const exportBtn = document.getElementById('exportRosterBtn');
    if (!exportBtn) return;

    const hasValidData = this.hasValidRosterData();
    
    if (hasValidData) {
      exportBtn.style.display = 'inline-flex';
      exportBtn.disabled = false;
    } else {
      exportBtn.style.display = 'none';
    }

    Logger.debug("Export button visibility updated", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { hasValidData, visible: hasValidData },
      showNotification: false
    });
  }

  /**
   * 🔍 Verificar si hay datos válidos para exportar
   */
  hasValidRosterData() {
    // Verificar que hay ship nomination seleccionado
    const selectedNomination = this.controller.getSelectedShipNomination();
    if (!selectedNomination) return false;

    // Verificar que hay datos de Office Sampling o Line Sampling
    const officeData = this.controller.tableManager.getOfficeSamplingData();
    const lineData = this.controller.tableManager.getCurrentLineTurns();
    
    return officeData || (lineData && lineData.length > 0);
  }

  /**
   * 🖱️ Manejar click del botón export
   */
  async handleExportClick() {
    if (this.isExporting) {
      Logger.warn("Export already in progress", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Export is already in progress. Please wait."
      });
      return;
    }

    try {
      this.isExporting = true;
      this.showExportLoading(true);

      // Validar datos antes de exportar
      const validationResult = this.validateDataForExport();
      if (!validationResult.isValid) {
        Logger.warn(validationResult.message, {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage: validationResult.message
        });
        return;
      }

      // Recopilar datos actuales
      const rosterData = this.controller.collectCurrentRosterData();
      
      Logger.info("Starting Excel export", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          vessel: rosterData.vesselName,
          hasOffice: !!rosterData.officeSampling,
          lineCount: rosterData.lineSampling?.length || 0
        },
        showNotification: true,
        notificationMessage: "Preparing Line Sampling Roster export..."
      });

      // Generar archivo Excel CON DETECCIÓN DE DESCARGA
      await this.generateLineSamplingRosterExcelWithDetection(rosterData);

    } catch (error) {
      Logger.error("Error during export", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Failed to export Line Sampling Roster. Please try again."
      });
    } finally {
      this.isExporting = false;
      this.showExportLoading(false);
    }
  }

  /**
   * ✅ Validar datos antes de exportar
   */
  validateDataForExport() {
    const selectedNomination = this.controller.getSelectedShipNomination();
    if (!selectedNomination) {
      return {
        isValid: false,
        message: "Please select a ship nomination first"
      };
    }

    const officeData = this.controller.tableManager.getOfficeSamplingData();
    const lineData = this.controller.tableManager.getCurrentLineTurns();
    
    if (!officeData && (!lineData || lineData.length === 0)) {
      return {
        isValid: false,
        message: "No sampling data available to export"
      };
    }

    return { isValid: true };
  }

  /**
   * 📊 Generar archivo Excel con formato Line Sampling Roster CON DETECCIÓN DE DESCARGA
   */
  async generateLineSamplingRosterExcelWithDetection(rosterData) {
    try {
      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Line Sampling Roster System';
      workbook.lastModifiedBy = 'Export System';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Crear worksheet
      const worksheet = workbook.addWorksheet('Line Sampling Roster', {
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
      });

      // Construir el Excel paso a paso
      await this.buildLineSamplingRosterLayout(worksheet, rosterData);

      // Generar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const fileName = this.generateFileName(rosterData.vesselName);

      // ✅ MENSAJE ÚNICO Y VERAZ - El Excel se generó correctamente
      Logger.success("Excel file generated successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          vessel: rosterData.vesselName,
          fileName: fileName
        },
        showNotification: true,
        notificationMessage: `Excel file generated: ${fileName}`
      });

      // Ejecutar descarga
      this.downloadBlob(blob, fileName);

    } catch (error) {
      Logger.error("Error generating Excel file", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false
      });
      throw error;
    }
  }

  /**
   * 🏗️ Construir layout completo del Line Sampling Roster
   */
  async buildLineSamplingRosterLayout(worksheet, rosterData) {
    let currentRow = 1;

    // 1. TÍTULO PRINCIPAL
    currentRow = this.addMainTitle(worksheet, currentRow);
    currentRow++; // Espacio

    // 2. INFORMACIÓN DEL BARCO
    currentRow = this.addShipInformation(worksheet, currentRow, rosterData);
    currentRow++; // Espacio

    // 3. OFFICE SAMPLING SECTION
    if (rosterData.officeSampling) {
      currentRow = this.addOfficeSamplingSection(worksheet, currentRow, rosterData.officeSampling);
      currentRow++; // Espacio
    }

    // 4. LINE SAMPLING SECTION
    if (rosterData.lineSampling && rosterData.lineSampling.length > 0) {
      currentRow = this.addLineSamplingSection(worksheet, currentRow, rosterData.lineSampling);
      currentRow += 2; // Más espacio antes de contactos
    }

    // 5. CONTACTOS HARDCODEADOS EN LAYOUT DE 2 COLUMNAS
    
    // === HEADERS: OPERATION CONTACT (izq) + TERMINAL CONTACT (der) ===
    const headersRow = worksheet.getRow(currentRow);
    
    // Operation Contact Header (columnas A:B)
    headersRow.getCell(1).value = 'Operation Contact';
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const opHeaderCell = headersRow.getCell(1);
    opHeaderCell.font = {
      name: 'Calibri',
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    opHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B365D' }
    };
    opHeaderCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    opHeaderCell.border = {
      top: { style: 'medium', color: { argb: 'FF1B365D' } },
      left: { style: 'medium', color: { argb: 'FF1B365D' } },
      bottom: { style: 'medium', color: { argb: 'FF1B365D' } },
      right: { style: 'medium', color: { argb: 'FF1B365D' } }
    };

    // Terminal Contact Header (columnas C:D)
    headersRow.getCell(3).value = 'Terminal Contact';
    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
    const terminalHeaderCell = headersRow.getCell(3);
    terminalHeaderCell.font = {
      name: 'Calibri',
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    terminalHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B365D' } // ✅ AZUL MARINO IGUAL QUE EL RESTO
    };
    terminalHeaderCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    terminalHeaderCell.border = {
      top: { style: 'medium', color: { argb: 'FF1B365D' } },
      left: { style: 'medium', color: { argb: 'FF1B365D' } },
      bottom: { style: 'medium', color: { argb: 'FF1B365D' } },
      right: { style: 'medium', color: { argb: 'FF1B365D' } }
    };

    headersRow.height = 30;
    currentRow++;

    // === DATOS: OPERATION CONTACT (izq) + TERMINAL INFO (der) ===
    const operationContacts = [
      ['Baskaran', '0408 516 912'],
      ['Asyrani Lin (Ash)', '0483 183 035'],
      ['Jay-Cen', '0467 889 559']
    ];

    const terminalInfo = [
      'Vopak Control Room : 02 83361952',
      'BLB-1 UHF CH: 11',
      'BLB-2 UHF CH: 12',
      'Vopak Control Room UHF CH: 2'
    ];

    // Procesar filas de Operation Contact + Terminal (máximo 4 filas)
    const maxRows = Math.max(operationContacts.length, terminalInfo.length);
    
    for (let i = 0; i < maxRows; i++) {
      const dataRow = worksheet.getRow(currentRow);
      const isEvenRow = i % 2 === 0;
      const backgroundColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF';

      // === OPERATION CONTACT (columnas A:B) ===
      if (i < operationContacts.length) {
        const [name, phone] = operationContacts[i];
        
        // Nombre (columna A)
        const nameCell = dataRow.getCell(1);
        nameCell.value = name;
        nameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2F5597' } };
        nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
        nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
        nameCell.border = {
          top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
        };

        // Teléfono (columna B)
        const phoneCell = dataRow.getCell(2);
        phoneCell.value = phone;
        phoneCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF2F5597' } };
        phoneCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
        phoneCell.alignment = { horizontal: 'left', vertical: 'middle' };
        phoneCell.border = {
          top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
        };
      }

      // === TERMINAL CONTACT (columnas C:D mergeadas) ===
      if (i < terminalInfo.length) {
        const info = terminalInfo[i];
        const terminalCell = dataRow.getCell(3);
        terminalCell.value = info;
        
        // ✅ FORMATO UNIFICADO: Todas las filas con mismo estilo
        terminalCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF2F5597' } };
        terminalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
        terminalCell.alignment = { horizontal: 'center', vertical: 'middle' };
        terminalCell.border = {
          top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
        };

        worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
      }

      dataRow.height = 25;
      currentRow++;
    }

    currentRow++; // Espacio

    // === LAB CONTACT HEADER (solo izquierda A:B) ===
    const labHeaderRow = worksheet.getRow(currentRow);
    labHeaderRow.getCell(1).value = 'Lab Contact';
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    
    const labHeaderCell = labHeaderRow.getCell(1);
    labHeaderCell.font = {
      name: 'Calibri',
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    labHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B365D' }
    };
    labHeaderCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    labHeaderCell.border = {
      top: { style: 'medium', color: { argb: 'FF1B365D' } },
      left: { style: 'medium', color: { argb: 'FF1B365D' } },
      bottom: { style: 'medium', color: { argb: 'FF1B365D' } },
      right: { style: 'medium', color: { argb: 'FF1B365D' } }
    };
    labHeaderRow.height = 30;
    currentRow++;

    // === DATOS LAB CONTACT (solo columnas A:B) ===
    const labContacts = [
      ['Tomas', '0475 941 910'],
      ['Aram', '0461 463 421'],
      ['Farshid', '0420 626 864'],
      ['Anh', '0437 581 288']
    ];

    labContacts.forEach(([name, phone], index) => {
      const dataRow = worksheet.getRow(currentRow);
      const isEvenRow = index % 2 === 0;
      const backgroundColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF';

      // Nombre (columna A)
      const nameCell = dataRow.getCell(1);
      nameCell.value = name;
      nameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2F5597' } };
      nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      nameCell.border = {
        top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
      };

      // Teléfono (columna B)
      const phoneCell = dataRow.getCell(2);
      phoneCell.value = phone;
      phoneCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF2F5597' } };
      phoneCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
      phoneCell.alignment = { horizontal: 'left', vertical: 'middle' };
      phoneCell.border = {
        top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
      };

      dataRow.height = 25;
      currentRow++;
    });

    // 6. CONFIGURAR ANCHOS DE COLUMNA
    this.configureColumnWidths(worksheet);

    Logger.debug("Line Sampling Roster layout completed", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { totalRows: currentRow },
      showNotification: false
    });
  }

  /**
   * 📋 Agregar título principal "Line Sampling Roster"
   */
  addMainTitle(worksheet, startRow) {
    const titleRow = worksheet.getRow(startRow);
    titleRow.getCell(1).value = "Line Sampling Roster";
    
    // Mergear desde A hasta D
    worksheet.mergeCells(`A${startRow}:D${startRow}`);
    
    // Estilo del título
    const titleCell = titleRow.getCell(1);
    titleCell.font = {
      name: 'Calibri',
      size: 16,
      bold: true,
      color: { argb: 'FFFFFFFF' } // Texto blanco
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B365D' } // Fondo azul marino
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF1B365D' } },
      left: { style: 'medium', color: { argb: 'FF1B365D' } },
      bottom: { style: 'medium', color: { argb: 'FF1B365D' } },
      right: { style: 'medium', color: { argb: 'FF1B365D' } }
    };
    
    titleRow.height = 35;
    
    return startRow;
  }

  /**
   * 🚢 Agregar información del barco
   */
  addShipInformation(worksheet, startRow, rosterData) {
    // 🔧 COPIA EXACTA: Usar la misma lógica que exportación individual
    // Para exportación individual: usa this.controller.selectedShipNomination
    // Para exportación por rango: usa rosterData.shipNomination
    const shipNomination = this.controller.selectedShipNomination || rosterData.shipNomination;
    
    const shipInfo = [
      ['Vessel:', rosterData.vesselName || ''],
      ['Berth:', shipNomination?.berth?.name || 'N/A'],
      ['Amspec Ref:', rosterData.amspecRef || ''],
      ['POB:', this.formatDateTime(shipNomination?.pilotOnBoard)],
      ['ETB:', this.formatDateTime(shipNomination?.etb)],
      ['Start Discharge:', this.formatDateTime(rosterData.startDischarge)],
      ['ETC:', this.formatDateTime(rosterData.etcTime)],
      ['Discharge Time (Hrs):', rosterData.dischargeTimeHours || ''],
      ['Cargo:', this.formatProductTypes(shipNomination?.productTypes)],
      ['Surveyor:', shipNomination?.surveyor?.name || 'N/A'],
      ['Pre Discharge Testing:', shipNomination?.chemist?.name || 'N/A'],
      ['Post Discharge Testing:', shipNomination?.chemist?.name || 'N/A']
    ];

    let currentRow = startRow;
    
    shipInfo.forEach(([label, value]) => {
      const row = worksheet.getRow(currentRow);
      
      // Celda del label (columna A)
      const labelCell = row.getCell(1);
      labelCell.value = label;
      labelCell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A5568' } // Gris azulado
      };
      labelCell.alignment = {
        horizontal: 'left',
        vertical: 'middle'
      };
      labelCell.border = {
        top: { style: 'thin', color: { argb: 'FF1B365D' } },
        left: { style: 'thin', color: { argb: 'FF1B365D' } },
        bottom: { style: 'thin', color: { argb: 'FF1B365D' } },
        right: { style: 'thin', color: { argb: 'FF1B365D' } }
      };

      // Celda del valor (columna B)
      const valueCell = row.getCell(2);
      valueCell.value = value;
      valueCell.font = {
        name: 'Calibri',
        size: 11,
        color: { argb: 'FF2F5597' }
      };
      valueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFAF8B8' } // Amarillo muy claro
      };
      valueCell.alignment = {
        horizontal: 'left',
        vertical: 'middle'
      };
      valueCell.border = {
        top: { style: 'thin', color: { argb: 'FF1B365D' } },
        left: { style: 'thin', color: { argb: 'FF1B365D' } },
        bottom: { style: 'thin', color: { argb: 'FF1B365D' } },
        right: { style: 'thin', color: { argb: 'FF1B365D' } }
      };

      row.height = 25;
      currentRow++;
    });

    return currentRow - 1;
  }

  /**
   * 🏢 Agregar sección Office Sampling
   */
  addOfficeSamplingSection(worksheet, startRow, officeSampling) {
    let currentRow = startRow;

    // Headers
    const headerRow = worksheet.getRow(currentRow);
    const headers = ['Who', 'Start Office', 'Finish Sampling', 'Hours'];
    
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1B365D' }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1B365D' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      };
    });
    
    headerRow.height = 30;
    currentRow++;

    // Datos
    const dataRow = worksheet.getRow(currentRow);
    const officeData = [
      officeSampling.sampler?.name || '',
      this.formatDateTime(officeSampling.startTime),
      this.formatDateTime(officeSampling.finishTime),
      officeSampling.hours || ''
    ];

    officeData.forEach((data, index) => {
      const cell = dataRow.getCell(index + 1);
      cell.value = data;
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF2F5597' }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
        right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
      };
    });
    
    dataRow.height = 25;
    
    return currentRow;
  }

  /**
   * 📈 Agregar sección Line Sampling
   */
  addLineSamplingSection(worksheet, startRow, lineSampling) {
    let currentRow = startRow;

    // Headers
    const headerRow = worksheet.getRow(currentRow);
    const headers = ['Who', 'Start Line Sampling', 'Finish Line Sampling', 'Hours'];
    
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1B365D' }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1B365D' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      };
    });
    
    headerRow.height = 30;
    currentRow++;

    // Datos con filas alternadas (patrón unificado)
    lineSampling.forEach((turn, index) => {
      const dataRow = worksheet.getRow(currentRow);
      const lineData = [
        turn.sampler?.name || '',
        this.formatDateTime(turn.startTime),
        this.formatDateTime(turn.finishTime),
        turn.hours || ''
      ];

      // ✅ PATRÓN UNIFICADO: Filas alternadas gris claro/blanco
      const isEvenRow = index % 2 === 0;
      const backgroundColor = isEvenRow ? 'FFF8F9FA' : 'FFFFFFFF'; // Gris claro / Blanco

      lineData.forEach((data, cellIndex) => {
        const cell = dataRow.getCell(cellIndex + 1);
        cell.value = data;
        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF2F5597' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor }
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          left: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          bottom: { style: 'thin', color: { argb: 'FFE1E5E9' } },
          right: { style: 'thin', color: { argb: 'FFE1E5E9' } }
        };
      });
      
      dataRow.height = 25;
      currentRow++;
    });

    return currentRow - 1;
  }

  /**
   * 📏 Configurar anchos de columna
   */
  configureColumnWidths(worksheet) {
    const columnWidths = [
      { width: 20 }, // Who / Name
      { width: 25 }, // Start / Phone  
      { width: 25 }, // Finish
      { width: 12 }  // Hours
    ];

    worksheet.columns = columnWidths;
  }

  /**
   * 🕒 Formatear fecha y hora para display
   */
  formatDateTime(dateValue) {
    if (!dateValue) return '';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      
      return DateUtils.formatDateTime(date);
    } catch (error) {
      Logger.warn("Error formatting datetime", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: { dateValue },
        showNotification: false
      });
      return '';
    }
  }

  /**
   * 🏭 Formatear tipos de productos
   */
  formatProductTypes(productTypes) {
    if (!productTypes || !Array.isArray(productTypes)) return '';
    
    return productTypes
      .map(product => product?.name || product || '')
      .filter(name => name)
      .join(', ');
  }

  /**
   * 📂 Generar nombre de archivo
   */
  generateFileName(vesselName) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;
    
    const cleanVesselName = (vesselName || 'vessel')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    
    return `line_sampling_roster_${cleanVesselName}_${dateStr}.xlsx`;
  }

  /**
   * 💾 Descargar blob como archivo
   */
  downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * ⏳ Mostrar/ocultar loading en botón
   */
  showExportLoading(show) {
    const exportBtn = document.getElementById('exportRosterBtn');
    if (!exportBtn) return;

    if (show) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        EXPORTING...
      `;
    } else {
      exportBtn.disabled = false;
      exportBtn.innerHTML = `
        <i class="fas fa-file-excel"></i>
        EXPORT
      `;
    }
  }

  /**
   * 📊 Método público para actualizar visibilidad (llamado desde controller)
   */
  updateVisibility() {
    this.updateButtonVisibility();
  }

  // ========================================
  // 🆕 NUEVOS MÉTODOS PARA EXPORTACIÓN POR RANGO DE FECHAS
  // ========================================

  /**
   * 🖱️ Manejar click del botón export por rango
   */
  async handleRangeExportClick() {
    try {
      Logger.info("Range export initiated", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Setting up date range selection..."
      });

      // Mostrar modal de selección de fechas
      await this.showDateRangeModal();

    } catch (error) {
      Logger.error("Error initiating range export", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Failed to start range export. Please try again."
      });
    }
  }

  /**
   * 📅 Mostrar modal de selección de rango de fechas
   */
  async showDateRangeModal() {
    return new Promise((resolve) => {
      // Crear modal dinámicamente si no existe
      let modal = document.getElementById('dateRangeModal');
      if (!modal) {
        modal = this.createDateRangeModal();
        document.body.appendChild(modal);
      }

      // Inicializar DatePickers
      this.initializeDatePickers(modal);

      // Configurar fechas por defecto (mes anterior)
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      this.fromDatePicker.setDate(lastMonth);
      this.toDatePicker.setDate(lastMonthEnd);

      // Configurar botones rápidos
      this.setupQuickDateButtons(modal);

      // Configurar botones
      const exportBtn = modal.querySelector('#confirmRangeExport');
      const cancelBtn = modal.querySelector('#cancelRangeExport');

      const handleExport = async () => {
        const fromDate = this.fromDatePicker.getDate();
        const toDate = this.toDatePicker.getDate();

        if (!fromDate || !toDate) {
          Logger.warn("Please select both from and to dates", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            showNotification: true,
            notificationMessage: "Please select both from and to dates"
          });
          return;
        }

        if (fromDate > toDate) {
          Logger.warn("From date must be before to date", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            showNotification: true,
            notificationMessage: "From date must be before to date"
          });
          return;
        }

        // Cerrar modal
        const modalElement = modal.querySelector('.modal');
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
        
        // Ejecutar exportación
        await this.executeRangeExport(this.formatDateForInput(fromDate), this.formatDateForInput(toDate));
        resolve();
      };

      const handleCancel = () => {
        const modalElement = modal.querySelector('.modal');
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
        resolve();
      };

      // Limpiar listeners anteriores
      exportBtn.replaceWith(exportBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));

      // Agregar nuevos listeners
      modal.querySelector('#confirmRangeExport').addEventListener('click', handleExport);
      modal.querySelector('#cancelRangeExport').addEventListener('click', handleCancel);

      // Mostrar modal con efecto fade
      const modalElement = modal.querySelector('.modal');
      modalElement.style.display = 'block';
      modalElement.classList.add('show');
      
      // Aplicar backdrop
      modalElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    });
  }

  /**
   * 🏗️ Crear modal de selección de fechas con diseño de settings
   */
  createDateRangeModal() {
    const modal = document.createElement('div');
    modal.id = 'dateRangeModal';
    modal.innerHTML = `
      <!-- Date Range Export Modal -->
      <div class="modal fade" tabindex="-1" aria-labelledby="dateRangeModalLabel" aria-hidden="true" style="display: none;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content settings-modal">
            <div class="modal-header settings-header">
              <h5 class="modal-title settings-title" id="dateRangeModalLabel">
                <i class="fas fa-calendar-alt me-3"></i>Export Rosters by Date Range
              </h5>
              <button type="button" class="btn-close settings-close" aria-label="Close" onclick="this.closest('.modal').style.display='none'"></button>
            </div>
            <div class="modal-body settings-body">
              <div class="settings-section">
                <h6 class="settings-section-title">
                  <i class="fas fa-calendar me-2"></i>Select Date Range
                </h6>
                
                <!-- Quick Date Range Buttons - Using ship nomination preset design -->
                <div class="mb-3">
                  <label class="form-label fw-semibold mb-2" style="
                    color: var(--text-primary);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                  ">
                    <i class="fas fa-bolt me-2" style="color: var(--accent-primary);"></i>Quick Selection
                  </label>
                  <div class="d-flex gap-2 flex-wrap">
                    <button type="button" class="btn btn-preset" id="quickLastMonth" style="
                      min-width: 90px;
                      padding: 0.5rem 0.75rem;
                      font-size: 0.8rem;
                    ">
                      <i class="fas fa-calendar-minus me-1"></i>Last Month
                    </button>
                    <button type="button" class="btn btn-preset" id="quickThisMonth" style="
                      min-width: 90px;
                      padding: 0.5rem 0.75rem;
                      font-size: 0.8rem;
                    ">
                      <i class="fas fa-calendar me-1"></i>This Month
                    </button>
                    <button type="button" class="btn btn-preset" id="quickThisWeek" style="
                      min-width: 90px;
                      padding: 0.5rem 0.75rem;
                      font-size: 0.8rem;
                    ">
                      <i class="fas fa-calendar-week me-1"></i>This Week
                    </button>
                  </div>
                </div>

                <!-- Date Range using shared DatePickers -->
                <div class="row g-3">
                  <div class="col-md-6">
                    <label style="
                      display: block;
                      color: var(--text-secondary);
                      font-size: 0.7rem;
                      margin-bottom: 0.25rem;
                      text-transform: uppercase;
                      font-weight: 500;
                    ">From Date</label>
                    <div id="fromDatePicker"></div>
                  </div>
                  <div class="col-md-6">
                    <label style="
                      display: block;
                      color: var(--text-secondary);
                      font-size: 0.7rem;
                      margin-bottom: 0.25rem;
                      text-transform: uppercase;
                      font-weight: 500;
                    ">To Date</label>
                    <div id="toDatePicker"></div>
                  </div>
                </div>

                <div class="alert alert-info mt-3" style="
                  background: rgba(31, 181, 212, 0.1);
                  border: 1px solid rgba(31, 181, 212, 0.2);
                  border-radius: 12px;
                  padding: 1rem;
                ">
                  <div class="d-flex align-items-start">
                    <i class="fas fa-info-circle me-3 mt-1" style="color: var(--accent-primary);"></i>
                    <div>
                      <p class="mb-2 fw-semibold" style="color: var(--text-primary);">
                        Export by POB (Port Operations)
                      </p>
                      <p class="mb-1 small" style="color: var(--text-secondary);">
                        • All rosters with operational dates within the selected range will be exported
                      </p>
                      <p class="mb-0 small" style="color: var(--text-secondary);">
                        • Use quick buttons above or select custom date range
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer settings-footer">
              <button type="button" id="cancelRangeExport" class="btn btn-outline-danger">
                <i class="fas fa-times me-2"></i>Cancel
              </button>
              <button type="button" id="confirmRangeExport" class="btn btn-secondary-premium">
                <i class="fas fa-file-excel me-2"></i>Export Range
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    return modal;
  }

  /**
   * 📊 Ejecutar exportación por rango de fechas
   */
  async executeRangeExport(fromDate, toDate) {
    if (this.isExporting) {
      Logger.warn("Export already in progress", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Export is already in progress. Please wait."
      });
      return;
    }

    try {
      this.isExporting = true;
      this.showRangeExportLoading(true);

      Logger.info("Starting range export", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: { fromDate, toDate },
        showNotification: true,
        notificationMessage: `Fetching rosters from ${fromDate} to ${toDate}...`
      });

      // Obtener rosters del backend
      const rosters = await this.fetchRostersByDateRange(fromDate, toDate);

      if (!rosters || rosters.length === 0) {
        Logger.warn("No rosters found in date range", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage: `No rosters found between ${fromDate} and ${toDate}`
        });
        return;
      }

      Logger.info("Generating multi-sheet Excel", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: { rosterCount: rosters.length },
        showNotification: true,
        notificationMessage: `Generating Excel with ${rosters.length} rosters...`
      });

      // Generar Excel multi-sheet
      await this.generateMultiSheetExcel(rosters, fromDate, toDate);

    } catch (error) {
      Logger.error("Error during range export", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Failed to export rosters by date range. Please try again."
      });
    } finally {
      this.isExporting = false;
      this.showRangeExportLoading(false);
    }
  }

  /**
   * 🌐 Obtener rosters por rango de fechas desde el backend
   */
  async fetchRostersByDateRange(fromDate, toDate) {
    try {
      const baseURL = this.getBaseURL();
      const url = `${baseURL}/api/sampling-rosters?from=${fromDate}&to=${toDate}&limit=100`;

      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch rosters');
      }

      Logger.info("Rosters fetched successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          count: result.data.length,
          total: result.pagination?.total
        },
        showNotification: false
      });

      return result.data;

    } catch (error) {
      Logger.error("Error fetching rosters by date range", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false
      });
      throw error;
    }
  }

  /**
   * 📊 Generar Excel multi-sheet con múltiples rosters
   */
  async generateMultiSheetExcel(rosters, fromDate, toDate) {
    try {
      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Line Sampling Roster System - Range Export';
      workbook.lastModifiedBy = 'Export System';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Crear hoja resumen
      await this.createSummarySheet(workbook, rosters, fromDate, toDate);

      // Crear hoja para cada roster
      for (let i = 0; i < rosters.length; i++) {
        const roster = rosters[i];
        const rosterData = this.transformRosterData(roster);
        
        // 🔧 DEBUG: Log para verificar datos transformados
        Logger.debug(`Processing roster ${i + 1}`, {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            vesselName: rosterData.vesselName,
            shipNomination: {
              berth: rosterData.shipNomination?.berth?.name,
              pob: rosterData.shipNomination?.pilotOnBoard,
              surveyor: rosterData.shipNomination?.surveyor?.name,
              chemist: rosterData.shipNomination?.chemist?.name,
              productTypes: rosterData.shipNomination?.productTypes?.length
            }
          },
          showNotification: false
        });
        
        // Nombre de hoja seguro (máximo 31 caracteres, sin caracteres especiales)
        const sheetName = this.generateSafeSheetName(rosterData.vesselName, i + 1);
        
        const worksheet = workbook.addWorksheet(sheetName, {
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
        });

        // Construir layout usando el método existente
        await this.buildLineSamplingRosterLayout(worksheet, rosterData);

        Logger.debug(`Sheet created for vessel: ${rosterData.vesselName}`, {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: false
        });
      }

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // 🇦🇺 Formato de fecha australiano para el nombre del archivo
      const fromDateAU = this.formatDateAustralian(new Date(fromDate));
      const toDateAU = this.formatDateAustralian(new Date(toDate));
      const fileName = `Line_Sampling_Roster_${fromDateAU}_to_${toDateAU}.xlsx`;

      Logger.success("Multi-sheet Excel generated successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          fileName: fileName,
          rosterCount: rosters.length,
          sheetsCount: rosters.length + 1 // +1 for summary
        },
        showNotification: true,
        notificationMessage: `Excel generated: ${fileName} (${rosters.length} rosters)`
      });

      // Descargar archivo
      this.downloadBlob(blob, fileName);

    } catch (error) {
      Logger.error("Error generating multi-sheet Excel", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false
      });
      throw error;
    }
  }

  /**
   * 📋 Crear hoja resumen con lista de todos los rosters
   */
  async createSummarySheet(workbook, rosters, fromDate, toDate) {
    const worksheet = workbook.addWorksheet('Summary', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape'
      }
    });

    // Título con formato australiano
    const fromDateAU = this.formatDateAustralian(new Date(fromDate));
    const toDateAU = this.formatDateAustralian(new Date(toDate));
    
    worksheet.mergeCells('A1:H2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Line Sampling Rosters Summary\n${fromDateAU} to ${toDateAU}`;
    titleCell.style = {
      font: { size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      }
    };

    // Headers
    const headers = ['#', 'Vessel Name', 'AMSPEC Ref', 'Status', 'Start Discharge', 'ETC Time', 'Office Sampler', 'Line Turns'];
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        }
      };
    });

    // Datos
    rosters.forEach((roster, index) => {
      const row = worksheet.addRow([
        index + 1,
        roster.vesselName || 'N/A',
        roster.shipNomination?.amspecRef || 'N/A',
        roster.status || 'draft',
        roster.startDischarge ? DateUtils.formatDateTime(roster.startDischarge) : 'N/A',
        roster.etcTime ? DateUtils.formatDateTime(roster.etcTime) : 'N/A',
        roster.officeSampling?.sampler?.name || 'N/A',
        roster.lineSampling?.length || 0
      ]);

      // Aplicar estilos alternados
      row.eachCell((cell) => {
        cell.style = {
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: index % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF' }
          }
        };
      });

      // Color por status
      const statusCell = row.getCell(4);
      const statusColors = {
        'completed': 'FF90EE90',
        'in_progress': 'FFFFFFE0',
        'draft': 'FFFFA500'
      };
      if (statusColors[roster.status]) {
        statusCell.style.fill.fgColor = { argb: statusColors[roster.status] };
      }
    });

    // Ajustar anchos de columna
    worksheet.columns = [
      { width: 5 },   // #
      { width: 25 },  // Vessel Name
      { width: 15 },  // AMSPEC Ref
      { width: 12 },  // Status
      { width: 18 },  // Start Discharge
      { width: 18 },  // ETC Time
      { width: 15 },  // Office Sampler
      { width: 12 }   // Line Turns
    ];
  }

  /**
   * 🔄 Usar roster data directamente como lo hace la exportación individual
   */
  transformRosterData(roster) {
    // 🔧 SIMPLIFICADO: Pasar todos los datos del roster incluyendo shipNomination completo
    return {
      vesselName: roster.vesselName || roster.shipNomination?.vesselName || 'Unknown Vessel',
      amspecRef: roster.shipNomination?.amspecRef || 'N/A',
      status: roster.status || 'draft',
      startDischarge: roster.startDischarge,
      etcTime: roster.etcTime,
      dischargeTimeHours: roster.dischargeTimeHours || 0,
      
      // 🆕 Pasar shipNomination completo para que addShipInformation tenga acceso
      shipNomination: roster.shipNomination,
      
      // Office Sampling - usar datos directos
      officeSampling: roster.officeSampling,
      
      // Line Sampling - usar datos directos  
      lineSampling: roster.lineSampling || []
    };
  }

  /**
   * 🏷️ Generar nombre seguro para hoja de Excel
   */
  generateSafeSheetName(vesselName, index) {
    // Remover caracteres no permitidos y limitar longitud
    let safeName = vesselName
      .replace(/[\\\/\*\?\[\]]/g, '') // Remover caracteres especiales
      .substring(0, 25); // Máximo 25 caracteres para dejar espacio al índice
    
    return `${index}. ${safeName}`;
  }

  /**
   * 📅 Formatear fecha para input HTML
   */
  formatDateForInput(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * 🇦🇺 Formatear fecha en formato australiano (dd-mm-yyyy)
   */
  formatDateAustralian(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * 🌐 Obtener URL base
   */
  getBaseURL() {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3000`;
    }
    return '';
  }

  /**
   * ⏳ Mostrar/ocultar loading en botón de rango
   */
  showRangeExportLoading(show) {
    const rangeBtn = document.getElementById('exportRangeBtn');
    if (!rangeBtn) return;

    if (show) {
      rangeBtn.disabled = true;
      rangeBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        EXPORTING RANGE...
      `;
    } else {
      rangeBtn.disabled = false;
      rangeBtn.innerHTML = `
        <i class="fas fa-calendar-alt"></i>
        EXPORT RANGE
      `;
    }
  }

  /**
   * ⚡ Configurar botones rápidos de selección de fechas
   */
  setupQuickDateButtons(modal) {
    const today = new Date();
    
    // Last Month
    const lastMonthBtn = modal.querySelector('#quickLastMonth');
    if (lastMonthBtn) {
      lastMonthBtn.addEventListener('click', () => {
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        
        this.fromDatePicker.setDate(lastMonthStart);
        this.toDatePicker.setDate(lastMonthEnd);
        
        // Highlight button temporarily
        this.highlightQuickButton(lastMonthBtn);
      });
    }

    // This Month
    const thisMonthBtn = modal.querySelector('#quickThisMonth');
    if (thisMonthBtn) {
      thisMonthBtn.addEventListener('click', () => {
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        this.fromDatePicker.setDate(thisMonthStart);
        this.toDatePicker.setDate(thisMonthEnd);
        
        // Highlight button temporarily
        this.highlightQuickButton(thisMonthBtn);
      });
    }

    // This Week
    const thisWeekBtn = modal.querySelector('#quickThisWeek');
    if (thisWeekBtn) {
      thisWeekBtn.addEventListener('click', () => {
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week
        startOfWeek.setDate(today.getDate() + diff);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday as end of week
        
        this.fromDatePicker.setDate(startOfWeek);
        this.toDatePicker.setDate(endOfWeek);
        
        // Highlight button temporarily
        this.highlightQuickButton(thisWeekBtn);
      });
    }
  }

  /**
   * ✨ Destacar botón rápido temporalmente usando clase active
   */
  highlightQuickButton(button) {
    // Remover highlight de otros botones
    const allQuickBtns = button.parentElement.querySelectorAll('.btn-preset');
    allQuickBtns.forEach(btn => {
      btn.classList.remove('active');
    });

    // Agregar highlight al botón actual
    button.classList.add('active');

    // Remover highlight después de 1.5 segundos
    setTimeout(() => {
      button.classList.remove('active');
    }, 1500);
  }

  /**
   * 🎯 Inicializar DatePickers del modal
   */
  initializeDatePickers(modal) {
    // Verificar que DatePicker esté disponible
    if (typeof DatePicker === 'undefined') {
      Logger.error("DatePicker not available", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "DatePicker component not loaded"
      });
      return;
    }

    // Inicializar From DatePicker
    this.fromDatePicker = new DatePicker('fromDatePicker', {
      placeholder: 'Select from date...',
      label: 'From Date',
      icon: 'fas fa-calendar-plus',
      modalTitle: 'Select From Date',
      clearable: true,
      theme: 'dark'
    });

    // Inicializar To DatePicker
    this.toDatePicker = new DatePicker('toDatePicker', {
      placeholder: 'Select to date...',
      label: 'To Date',
      icon: 'fas fa-calendar-minus',
      modalTitle: 'Select To Date',
      clearable: true,
      theme: 'dark'
    });

    Logger.debug("DatePickers initialized for range export modal", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false
    });
  }
}