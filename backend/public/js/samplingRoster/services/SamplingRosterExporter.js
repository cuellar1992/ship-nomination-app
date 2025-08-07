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
    const shipInfo = [
      ['Vessel:', rosterData.vesselName || ''],
      ['Berth:', this.controller.selectedShipNomination.berth?.name || ''],
      ['Amspec Ref:', rosterData.amspecRef || ''],
      ['POB:', this.formatDateTime(this.controller.selectedShipNomination.pilotOnBoard)],
      ['ETB:', this.formatDateTime(this.controller.selectedShipNomination.etb)],
      ['Start Discharge:', this.formatDateTime(rosterData.startDischarge)],
      ['ETC:', this.formatDateTime(rosterData.etcTime)],
      ['Discharge Time (Hrs):', rosterData.dischargeTimeHours || ''],
      ['Cargo:', this.formatProductTypes(this.controller.selectedShipNomination.productTypes)],
      ['Surveyor:', this.controller.selectedShipNomination.surveyor?.name || ''],
      ['Pre Discharge Testing:', this.controller.selectedShipNomination.chemist?.name || ''],
      ['Post Discharge Testing:', this.controller.selectedShipNomination.chemist?.name || '']
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
}