// frontend/js/modules/excel-exporter.js - VERSIÓN CORREGIDA

class ExcelExporter {
  constructor(tableFilters, apiManager, tableManager) {
    this.tableFilters = tableFilters;
    this.apiManager = apiManager;
    this.tableManager = tableManager;
    this.floatingButton = null;
    this.currentFilteredData = [];
    this.filtersWereApplied = false; // ⭐ AGREGAR ESTA LÍNEA

    // Inicializar después de un delay para asegurar que todo esté cargado
    setTimeout(() => {
      this.initializeExportButton();
      this.setupFilterObserver();
    }, 500);
  }

  /**
   * 🔧 Inicializar sistema de exportación
   */
  initializeExportButton() {
    this.createFloatingExportButton();
    this.updateButtonVisibility();
  }

  /**
   * 🎨 Crear botón flotante con estilo premium
   */
  createFloatingExportButton() {
    // Crear contenedor flotante
    const floatingContainer = document.createElement("div");
    floatingContainer.id = "exportFloatingContainer";
    floatingContainer.className = "export-floating-container";
    floatingContainer.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 1000;
            display: none;
            animation: fadeInUp 0.3s ease-out;
        `;

    // Crear botón con estilos consistentes
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.id = "exportToExcelBtn";
    exportButton.className = "btn btn-success btn-floating";
    exportButton.style.cssText = `
            min-width: 180px;
            height: 50px;
            border-radius: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-weight: 600;
            font-size: 14px;
            padding: 12px 20px;
            transition: all 0.3s ease;
            border: none;
            background: linear-gradient(45deg, #28a745, #20c997);
        `;

    exportButton.innerHTML = `
            <i class="fas fa-file-excel" style="margin-right: 8px;"></i>
            <span>Export to Excel</span>
            <div class="export-loader" style="display: none; margin-left: 10px;">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
        `;

    // Efectos hover
    exportButton.addEventListener("mouseenter", () => {
      exportButton.style.transform = "translateY(-2px)";
      exportButton.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
    });

    exportButton.addEventListener("mouseleave", () => {
      exportButton.style.transform = "translateY(0)";
      exportButton.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
    });

    // Event listener para exportación
    exportButton.addEventListener("click", () => this.handleExportClick());

    floatingContainer.appendChild(exportButton);
    document.body.appendChild(floatingContainer);
    this.floatingButton = floatingContainer;

    // Agregar CSS animations
    this.addFloatingButtonStyles();
  }

  /**
   * 🎨 Agregar estilos CSS para animaciones
   */
  addFloatingButtonStyles() {
    if (document.getElementById("exportButtonStyles")) return;

    const style = document.createElement("style");
    style.id = "exportButtonStyles";
    style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeOutDown {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(30px);
                }
            }
            
            .export-floating-container.hiding {
                animation: fadeOutDown 0.3s ease-out forwards;
            }
        `;
    document.head.appendChild(style);
  }

  /**
   * 👁️ Configurar observador de filtros para mostrar/ocultar botón
   */
  setupFilterObserver() {
    // Observar cambios en la tabla
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      const observer = new MutationObserver(() => {
        this.updateButtonVisibility();
      });

      observer.observe(tableContainer, {
        childList: true,
        subtree: true,
      });
    }

    // Observar cambios en filtros activos
    if (this.tableFilters) {
      const originalUpdateFilters = this.tableFilters.updateActiveFilters;
      this.tableFilters.updateActiveFilters = (...args) => {
        const result = originalUpdateFilters.apply(this.tableFilters, args);
        setTimeout(() => this.updateButtonVisibility(), 100);
        return result;
      };

      // ⭐ AGREGAR AQUÍ EL NUEVO CÓDIGO:
      const originalApplyFilters = this.tableFilters.applyAdvancedFilters;
      this.tableFilters.applyAdvancedFilters = (...args) => {
        // Ejecutar filtros originales
        const result = originalApplyFilters.apply(this.tableFilters, args);

        // ⭐ MARCAR QUE LOS FILTROS FUERON APLICADOS
        this.filtersWereApplied = true;

        // Actualizar visibilidad del botón después de aplicar
        setTimeout(() => this.updateButtonVisibility(), 200);

        return result;
      };

      // ⭐ INTERCEPTAR CLEAR FILTERS
      const originalClearFilters = this.tableFilters.clearAllFilters;
      this.tableFilters.clearAllFilters = (...args) => {
        const result = originalClearFilters.apply(this.tableFilters, args);

        // ⭐ MARCAR QUE NO HAY FILTROS APLICADOS
        this.filtersWereApplied = false;

        setTimeout(() => this.updateButtonVisibility(), 200);

        return result;
      };
    }
  }

  /**
   * 🔄 Actualizar visibilidad del botón basado en datos filtrados
   */
  updateButtonVisibility() {
    if (!this.floatingButton) return;

    // ⭐ CAMBIO: Usar hasAppliedFilters en lugar de hasActiveFilters
    const hasAppliedFilters = this.hasAppliedFilters();

    // Verificar si hay datos en la tabla
    const hasData = this.hasTableData();

    const shouldShow = hasAppliedFilters && hasData;

    if (shouldShow && this.floatingButton.style.display === "none") {
      this.showFloatingButton();
    } else if (!shouldShow && this.floatingButton.style.display !== "none") {
      this.hideFloatingButton();
    }

    // Actualizar contador en el botón
    this.updateExportCounter();
  }

  /**
   * 🔍 Verificar si hay filtros activos
   */
  hasAppliedFilters() {
    if (!this.tableFilters) return false;

    // ⭐ NUEVO: Verificar que los filtros estén realmente aplicados en la tabla
    const tableBody = document.getElementById("vesselsTableBody");
    if (!tableBody) return false;

    // Verificar si la tabla muestra datos filtrados
    const hasFilteredResults = this.hasTableDataWithFilters();

    Logger.debug("Applied filters check", {
      module: "ExcelExporter",
      data: { hasFilteredResults: hasFilteredResults },
      showNotification: false,
    });
    return hasFilteredResults;
  }

  // ⭐ NUEVO MÉTODO AUXILIAR SIMPLIFICADO
  hasTableDataWithFilters() {
    // ⭐ NUEVA LÓGICA SIMPLE
    return this.filtersWereApplied && this.hasTableData();
  }

  /**
   * 📊 Verificar si hay datos en la tabla
   */
  hasTableData() {
    const tableBody = document.getElementById("vesselsTableBody");
    if (!tableBody) return false;

    const rows = tableBody.querySelectorAll("tr:not(.no-data)");
    return rows.length > 0;
  }

  /**
   * 👀 Mostrar botón flotante
   */
  showFloatingButton() {
    if (this.floatingButton) {
      this.floatingButton.className = "export-floating-container";
      this.floatingButton.style.display = "block";
    }
  }

  /**
   * 🙈 Ocultar botón flotante
   */
  hideFloatingButton() {
    if (this.floatingButton) {
      this.floatingButton.className = "export-floating-container hiding";
      setTimeout(() => {
        if (this.floatingButton) {
          this.floatingButton.style.display = "none";
        }
      }, 300);
    }
  }

  /**
   * 🔢 Actualizar contador de registros en el botón - CORREGIDO
   */
  updateExportCounter() {
    const button = document.getElementById("exportToExcelBtn");
    if (!button) return;

    const filteredData = this.getCurrentFilteredData();
    const count = filteredData ? filteredData.length : 0;

    const buttonText = button.querySelector("span");
    if (buttonText && count > 0) {
      buttonText.textContent = `Export`; // ⭐ SIMPLIFICADO
    } else if (buttonText) {
      buttonText.textContent = "Export to Excel";
    }
  }

  /**
   * 🖱️ Manejar click del botón de exportación
   */
  async handleExportClick() {
    try {
      this.showExportLoading(true);

      // Obtener datos filtrados actuales
      const filteredData = this.getCurrentFilteredData();

      if (!filteredData || filteredData.length === 0) {
        Logger.warn("No data to export", {
          module: "ExcelExporter",
          showNotification: true,
          notificationMessage: "No data available to export",
        });
        return;
      }

      // Mostrar mensaje de preparación
      Logger.info("Preparing Excel export", {
        module: "ExcelExporter",
        showNotification: true,
        notificationMessage: "Preparing Excel file...",
      });

      // Generar filename
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const filename = `ship_nominations_${dateStr}.xlsx`;

      // Generar y descargar con notificación simple
      await this.generateAndDownloadExcelJS(filteredData);

      // Mostrar mensaje de éxito
      Logger.success(`Excel file generated successfully`, {
        module: "ExcelExporter",
        showNotification: true,
        notificationMessage: `Excel file generated: ${filename}`,
        data: {
          recordCount: filteredData.length,
          filename: filename,
        },
      });
    } catch (error) {
      Logger.error("Error exporting data to Excel", {
        module: "ExcelExporter",
        error: error,
        showNotification: true,
        notificationMessage: "Error exporting data to Excel. Please try again.",
      });
    } finally {
      this.showExportLoading(false);
    }
  }

  /**
   * 📊 Obtener datos filtrados actuales
   */
  getCurrentFilteredData() {
    Logger.debug("Obteniendo datos filtrados para exportación", {
      module: "ExcelExporter",
      showNotification: false,
    });

    const tableManager = this.tableManager;
    let allData = [];

    if (tableManager && typeof tableManager.getAllNominations === "function") {
      allData = tableManager.getAllNominations();
    } else {
      Logger.warn("TableManager not available", {
        module: "ExcelExporter",
        showNotification: false,
      });
      return [];
    }

    if (!Array.isArray(allData) || allData.length === 0) {
      return [];
    }

    Logger.debug("Total nominations disponibles", {
      module: "ExcelExporter",
      data: { totalNominations: allData.length },
      showNotification: false,
    });

    // Verificar estructura de datos
    if (allData.length > 0) {
      const sample = allData[0];
      Logger.debug("Estructura de datos de muestra", {
        module: "ExcelExporter",
        data: {
          vesselName: sample.vesselName,
          pilotOnBoard: sample.pilotOnBoard,
          etb: sample.etb,
          etc: sample.etc,
          keys: Object.keys(sample),
        },
        showNotification: false,
      });
    }

    // Aplicar filtros si existen
    if (
      this.tableFilters &&
      typeof this.tableFilters.matchesFilters === "function"
    ) {
      const filteredData = allData.filter((nomination) =>
        this.tableFilters.matchesFilters(nomination)
      );
      Logger.success("Datos después de filtros", {
        module: "ExcelExporter",
        data: { filteredCount: filteredData.length },
        showNotification: false,
      });
      return filteredData;
    }

    return allData;
  }

  /**
   * 📈 Generar y descargar archivo Excel
   */
  async generateAndDownloadExcel(data) {
    // Preparar datos para Excel
    const excelData = this.prepareExcelData(data);

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // Crear worksheet con datos
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Aplicar estilos profesionales
    this.applyExcelStyling(worksheet, excelData);

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ship Nominations");

    // Generar archivo y descargar
    const fileName = this.generateFileName();
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * 📈 NUEVO: Generar y descargar archivo Excel con ExcelJS (BÁSICO)
   */
  async generateAndDownloadExcelJS(data) {
    Logger.info("Iniciando exportación con ExcelJS", {
      module: "ExcelExporter",
      showNotification: false,
    });

    try {
      // Crear workbook con ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Configurar metadatos del workbook
      workbook.creator = "Ship Nominations System";
      workbook.lastModifiedBy = "Export System";
      workbook.created = new Date();
      workbook.modified = new Date();

      // Crear worksheet
      const worksheet = workbook.addWorksheet("Ship Nominations", {
        pageSetup: {
          paperSize: 9, // A4
          orientation: "landscape",
        },
        views: [
          {
            showGridLines: false, // ⭐ OCULTAR LÍNEAS DE CUADRÍCULA
          },
        ],
      });

      // Preparar datos básicos (igual que SheetJS por ahora)
      const excelData = this.prepareExcelDataForExcelJS(data);

      // Agregar datos a la worksheet
      worksheet.addRows(excelData);

      // Aplicar formato básico
      this.applyBasicExcelJSFormatting(worksheet);

      // Generar buffer y descargar
      const buffer = await workbook.xlsx.writeBuffer();

      // Crear blob y descargar
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileName = this.generateFileName();
      this.downloadBlob(blob, fileName);
    } catch (error) {
      Logger.error("Error en ExcelJS export", {
        module: "ExcelExporter",
        error: error,
        showNotification: true,
        notificationMessage: "Failed to export Excel file. Please try again.",
      });
      throw error;
    }
  }

  /**
   * 🗂️ Preparar datos para ExcelJS (básico - igual que SheetJS)
   */
  prepareExcelDataForExcelJS(data) {
    Logger.debug("Preparando datos para ExcelJS", {
      module: "ExcelExporter",
      data: { totalRecords: data.length },
      showNotification: false,
    });

    const excelData = [];

    // ⭐ HEADERS (15 columnas)
    const headers = [
      "Ship Name",
      "AmSpec Ref",
      "Client Ref",
      "Client",
      "Agent",
      "Pilot on Board",
      "ETB",
      "ETC",
      "Terminal",
      "Berth",
      "Product Types",
      "Surveyor",
      "Sampler",
      "Chemist",
      "Comments",
    ];

    excelData.push(headers);

    // ⭐ DATOS (mismo procesamiento que SheetJS)
    data.forEach((nomination, index) => {
      const row = [
        nomination.vesselName || nomination.shipName || "",
        nomination.amspecRef || "",
        nomination.clientRef || "",
        nomination.clientName || nomination.client?.name || "",
        nomination.agent?.name || nomination.agent || "",
        nomination.pilotOnBoard
          ? this.createLocalDateTime(nomination.pilotOnBoard)
          : "",
        nomination.etb ? this.createLocalDateTime(nomination.etb) : "",
        nomination.etc ? this.createLocalDateTime(nomination.etc) : "",
        nomination.terminal?.name || nomination.terminal || "",
        nomination.berth?.name || nomination.berth || "",
        this.formatProductTypes(nomination.productTypes),
        nomination.surveyor?.name || nomination.surveyor || "",
        nomination.sampler?.name || nomination.sampler || "",
        nomination.chemist?.name || nomination.chemist || "",
        nomination.comments || "",
      ];

      excelData.push(row);
    });

    Logger.success("Datos ExcelJS preparados", {
      module: "ExcelExporter",
      data: { rowsProcessed: excelData.length - 1 },
      showNotification: false,
    });
    return excelData;
  }

  /**
   * 🎨 Aplicar formato profesional ExcelJS - HEADERS AZULES
   */
  applyBasicExcelJSFormatting(worksheet) {
    Logger.debug("Aplicando formato profesional ExcelJS", {
      module: "ExcelExporter",
      showNotification: false,
    });

    // ⭐ CONFIGURAR ANCHOS DE COLUMNA
    const columnWidths = [
      15, 12, 12, 15, 18, 18, 18, 18, 20, 12, 15, 15, 15, 15, 20,
    ];

    worksheet.columns = columnWidths.map((width, index) => ({
      width: width,
    }));

    // ⭐ AGREGAR HEADER CORPORATIVO MEJORADO (FILA 1)
    const today = new Date().toLocaleDateString("en-GB");
    const dataRowCount = worksheet.actualRowCount - 1; // -1 para excluir headers
    const headerText = `SHIP NOMINATIONS REPORT - ${today} | Records: ${dataRowCount} | AmSpec Australia`;

    worksheet.insertRow(1, [headerText]);

    // Mergear celdas del header corporativo (A1:O1 = 15 columnas)
    worksheet.mergeCells("A1:O1");

    // ⭐ ESTILO DEL HEADER CORPORATIVO
    const headerCell = worksheet.getCell("A1");
    headerCell.font = {
      name: "Calibri",
      size: 14,
      bold: true,
      color: { argb: "FF2F5597" }, // Azul oscuro
    };
    headerCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    headerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8F9FA" }, // Gris muy claro
    };
    headerCell.border = {
      bottom: { style: "medium", color: { argb: "FF1B365D" } }, // ✅ DARK BLUE CONSISTENTE
    };

    // ⭐ ESTILO DE HEADERS DE DATOS (FILA 2 - AZUL PROFESIONAL)
    const headerRow = worksheet.getRow(2);
    headerRow.height = 30; // Altura mayor para headers

    // Aplicar estilo azul profesional a cada celda de header
    for (let col = 1; col <= 15; col++) {
      const cell = headerRow.getCell(col);

      // ⭐ ESTILO AZUL PROFESIONAL
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" }, // Texto blanco
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B365D" }, // ✅ DARK BLUE PROFESIONAL
      };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
    }

    // ⭐ AUTO-FILTER EN HEADERS DE DATOS (FILA 2)
    worksheet.autoFilter = {
      from: "A2",
      to: "O2", // 15 columnas = O, fila 2
    };

    // ⭐ FORMATEAR COLUMNAS DATETIME
    this.formatDateTimeColumns(worksheet);

    // ⭐ APLICAR FILAS ALTERNADAS
    this.applyAlternatingRows(worksheet);

    Logger.success(
      "Formato profesional ExcelJS aplicado - Headers azules con texto blanco",
      {
        module: "ExcelExporter",
        showNotification: false,
      }
    );
  }

  /**
   * 🕒 Formatear columnas DateTime específicas
   */
  formatDateTimeColumns(worksheet) {
    // Obtener todas las filas con datos (desde fila 3 en adelante)
    const rowCount = worksheet.actualRowCount;

    for (let rowNum = 3; rowNum <= rowCount; rowNum++) {
      // Pilot on Board (columna F = 6)
      const pilotCell = worksheet.getCell(rowNum, 6);
      if (pilotCell.value instanceof Date) {
        pilotCell.numFmt = "dd/mm/yyyy   HH:MM";
      }

      // ETB (columna G = 7)
      const etbCell = worksheet.getCell(rowNum, 7);
      if (etbCell.value instanceof Date) {
        etbCell.numFmt = "dd/mm/yyyy   HH:MM";
      }

      // ETC (columna H = 8)
      const etcCell = worksheet.getCell(rowNum, 8);
      if (etcCell.value instanceof Date) {
        etcCell.numFmt = "dd/mm/yyyy   HH:MM";
      }
    }

    Logger.success("Formato DateTime aplicado a columnas 6, 7, 8", {
      module: "ExcelExporter",
      data: { columns: [6, 7, 8] },
      showNotification: false,
    });
  }

  /**
   * 🎨 Aplicar filas alternadas blanco/gris claro
   */
  applyAlternatingRows(worksheet) {
    Logger.debug("Aplicando filas alternadas", {
      module: "ExcelExporter",
      showNotification: false,
    });

    const rowCount = worksheet.actualRowCount;

    // Empezar desde fila 3 (datos), después del header corporativo (fila 1) y headers (fila 2)
    for (let rowNum = 3; rowNum <= rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const isEvenDataRow = (rowNum - 2) % 2 === 0; // Fila 3 = impar, fila 4 = par, etc.

      // Configurar altura de fila
      row.height = 22;

      // Aplicar color de fondo alternado
      for (let col = 1; col <= 15; col++) {
        const cell = row.getCell(col);

        if (isEvenDataRow) {
          // ⭐ FILAS PARES: Gris claro
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" }, // Gris muy claro
          };
        } else {
          // ⭐ FILAS IMPARES: Blanco (sin fill = blanco por defecto)
          // No asignar fill para mantener blanco
        }

        // ⭐ ESTILO UNIFORME PARA TODAS LAS CELDAS DE DATOS
        cell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: "FF2F5597" }, // Texto azul oscuro
        };

        // ⭐ ALINEACIÓN ESPECÍFICA POR TIPO DE COLUMNA
        let horizontalAlign = "left"; // Default

        // Columnas que van centradas
        if ([2, 3, 6, 7, 8, 12, 13, 14].includes(col)) {
          // 2=AmSpec, 3=ClientRef, 6=Pilot, 7=ETB, 8=ETC, 12=Surveyor, 13=Sampler, 14=Chemist
          horizontalAlign = "center";
        }

        cell.alignment = {
          horizontal: horizontalAlign,
          vertical: "middle",
          wrapText: false,
        };

        // ⭐ BORDES SUTILES
        cell.border = {
          top: { style: "thin", color: { argb: "FFE1E5E9" } },
          left: { style: "thin", color: { argb: "FFE1E5E9" } },
          bottom: { style: "thin", color: { argb: "FFE1E5E9" } },
          right: { style: "thin", color: { argb: "FFE1E5E9" } },
        };
      }

      // ⭐ ALINEACIÓN ESPECIAL PARA COLUMNAS ESPECÍFICAS
      // Centrar columnas de fechas y códigos
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" }; // AmSpec Ref
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" }; // Client Ref
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" }; // Pilot on Board
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" }; // ETB
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" }; // ETC
    }

    Logger.success(
      `Filas alternadas aplicadas a ${rowCount - 2} filas de datos`,
      {
        module: "ExcelExporter",
        data: { dataRows: rowCount - 2 },
        showNotification: false,
      }
    );
  }

  /**
   * 💾 Descargar blob como archivo
   */
  downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * 🗂️ Preparar datos para formato Excel - COMPLETAMENTE CORREGIDO
   */
  prepareExcelData(data) {
    Logger.debug("Preparando datos para Excel", {
      module: "ExcelExporter",
      data: { totalRecords: data.length },
      showNotification: false,
    });

    const excelData = [];

    // Agregar metadatos de filtros
    const filterInfo = this.getFilterMetadata();
    if (filterInfo.length > 0) {
      excelData.push(["FILTER INFORMATION"]);
      filterInfo.forEach((info) => excelData.push(info));
      excelData.push([]); // Línea en blanco
    }

    // ⭐ HEADERS CORREGIDOS (15 columnas con DateTime)
    const headers = [
      "Ship Name",
      "AmSpec Ref",
      "Client Ref",
      "Client",
      "Agent",
      "Pilot on Board", // ⭐ NUEVA COLUMNA
      "ETB", // ⭐ DateTime consolidado
      "ETC", // ⭐ CORREGIDO (era ETD)
      "Terminal",
      "Berth",
      "Product Types",
      "Surveyor",
      "Sampler",
      "Chemist",
      "Comments",
    ];

    excelData.push(headers);

    // ⭐ DATOS CORREGIDOS con DateTime nativo
    data.forEach((nomination, index) => {
      Logger.debug(`Procesando nomination ${index + 1}`, {
        module: "ExcelExporter",
        data: {
          nominationIndex: index + 1,
          vesselName: nomination.vesselName,
          pilotOnBoard: nomination.pilotOnBoard,
          etb: nomination.etb,
          etc: nomination.etc,
        },
        showNotification: false,
      });

      const row = [
        nomination.vesselName || nomination.shipName || "",
        nomination.amspecRef || "",
        nomination.clientRef || "",
        nomination.clientName || nomination.client?.name || "",
        nomination.agent?.name || nomination.agent || "",

        // ⭐ PILOT ON BOARD: DateTime nativo Excel
        nomination.pilotOnBoard
          ? this.formatExcelDateTime(nomination.pilotOnBoard)
          : "",

        // ⭐ ETB: DateTime nativo Excel (consolidado)
        nomination.etb ? this.formatExcelDateTime(nomination.etb) : "",

        // ⭐ ETC: DateTime nativo Excel (consolidado)
        nomination.etc ? this.formatExcelDateTime(nomination.etc) : "",

        nomination.terminal?.name || nomination.terminal || "",
        nomination.berth?.name || nomination.berth || "",
        this.formatProductTypes(nomination.productTypes),
        nomination.surveyor?.name || nomination.surveyor || "",
        nomination.sampler?.name || nomination.sampler || "",
        nomination.chemist?.name || nomination.chemist || "",
        nomination.comments || "",
      ];

      excelData.push(row);
    });

    Logger.success("Datos preparados para Excel", {
      module: "ExcelExporter",
      data: {
        rowsProcessed: excelData.length - 1,
        dateTimeFormat: "nativo",
      },
      showNotification: false,
    });
    return excelData;
  }

  /**
   * 🕒 NUEVO MÉTODO: formatExcelDateTime (DateTime nativo para Excel)
   */
  formatExcelDateTime(dateString) {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";

      // ⭐ RETORNAR OBJETO DATE NATIVO - Excel lo reconoce automáticamente
      // SheetJS convierte automáticamente Date objects a Excel DateTime
      return date;
    } catch (error) {
      console.warn("⚠️ Error formatting Excel DateTime:", error);
      return "";
    }
  }

  /**
   * 📋 Obtener metadatos de filtros activos - ACTUALIZADO
   */
  getFilterMetadata() {
    const metadata = [];
    const now = new Date();

    metadata.push(["Export Date:", this.formatDateTime(now)]);

    const filteredData = this.getCurrentFilteredData();
    metadata.push(["Total Records:", filteredData.length]);
    metadata.push(["Columns:", "15 (DateTime format for dates)"]); // ⭐ ACTUALIZADO

    if (this.tableFilters) {
      const activeFilters = this.tableFilters.getActiveFilters();

      if (Object.keys(activeFilters).length > 0) {
        metadata.push(["Active Filters:"]);

        Object.entries(activeFilters).forEach(([key, value]) => {
          let displayValue = value;
          if (Array.isArray(value)) {
            displayValue = value.join(", ");
          } else if (typeof value === "object" && value.name) {
            displayValue = value.name;
          }

          metadata.push(["", `${key}: ${displayValue}`]);
        });
      }
    }

    const searchValue = document.getElementById("basicSearch")?.value?.trim();
    if (searchValue) {
      metadata.push(["Search Term:", searchValue]);
    }

    return metadata;
  }

  /**
   * 🎨 Aplicar estilos profesionales al Excel - CORREGIDO PARA 15 COLUMNAS
   */
  applyExcelStyling(worksheet, data) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    // ⭐ ANCHOS OPTIMIZADOS PARA 15 COLUMNAS + FORMATO DATETIME
    const colWidths = [
      { wch: 15 }, // Ship Name
      { wch: 12 }, // AmSpec Ref
      { wch: 12 }, // Client Ref
      { wch: 15 }, // Client
      { wch: 18 }, // Agent
      { wch: 18 }, // Pilot on Board (DateTime) ⭐
      { wch: 18 }, // ETB (DateTime) ⭐
      { wch: 18 }, // ETC (DateTime) ⭐
      { wch: 20 }, // Terminal
      { wch: 12 }, // Berth
      { wch: 15 }, // Product Types
      { wch: 15 }, // Surveyor
      { wch: 15 }, // Sampler
      { wch: 15 }, // Chemist
      { wch: 20 }, // Comments
    ];

    worksheet["!cols"] = colWidths;

    // ⭐ FORMATEO ESPECIAL PARA COLUMNAS DATETIME
    for (let row = 1; row <= range.e.r; row++) {
      // Empezar en fila 1 (saltar headers)
      // Pilot on Board (columna F - índice 5)
      const pilotCell = XLSX.utils.encode_cell({ r: row, c: 5 });
      if (worksheet[pilotCell] && worksheet[pilotCell].t === "n") {
        worksheet[pilotCell].z = "dd/mm/yyyy hh:mm";
      }

      // ETB (columna G - índice 6)
      const etbCell = XLSX.utils.encode_cell({ r: row, c: 6 });
      if (worksheet[etbCell] && worksheet[etbCell].t === "n") {
        worksheet[etbCell].z = "dd/mm/yyyy hh:mm";
      }

      // ETC (columna H - índice 7)
      const etcCell = XLSX.utils.encode_cell({ r: row, c: 7 });
      if (worksheet[etcCell] && worksheet[etcCell].t === "n") {
        worksheet[etcCell].z = "dd/mm/yyyy hh:mm";
      }
    }

    // Auto-filter en headers
    const filterInfo = this.getFilterMetadata();
    const headerRowIndex = filterInfo.length > 0 ? filterInfo.length + 1 : 0;

    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { c: 0, r: headerRowIndex },
        e: { c: range.e.c, r: range.e.r },
      }),
    };

    Logger.success(
      "Excel styling aplicado - 15 columnas con formato DateTime nativo",
      {
        module: "ExcelExporter",
        data: { columnsFormatted: 15, dateTimeFormat: "nativo" },
        showNotification: false,
      }
    );
  }

  /**
   * 📅 Formatear fecha para Excel (mantener para metadatos)
   */
  formatDate(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * ⏰ Formatear fecha y hora para Excel (mantener para metadatos)
   */
  formatDateTime(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  /**
   * 🏭 Formatear tipos de productos
   */
  formatProductTypes(productTypes) {
    if (!productTypes || productTypes.length === 0) return "";

    return productTypes
      .map((product) => {
        return product?.name || product || "";
      })
      .filter((name) => name)
      .join(", ");
  }

  /**
   * 🕐 Crear Date object en hora local (corrige problema UTC)
   */
  createLocalDateTime(utcString) {
    if (!utcString) return "";

    try {
      const utcDate = new Date(utcString);

      if (isNaN(utcDate.getTime())) {
        Logger.warn("Invalid date string received", {
          module: "ExcelExporter",
          showNotification: false,
          data: { invalidString: utcString },
        });
        return "";
      }

      // Convertir a hora local Sydney
      const localTime = new Date(utcDate.getTime() + 10 * 60 * 60 * 1000);

      // Formatear como string
      const day = String(localTime.getUTCDate()).padStart(2, "0");
      const month = String(localTime.getUTCMonth() + 1).padStart(2, "0");
      const year = localTime.getUTCFullYear();
      const hours = String(localTime.getUTCHours()).padStart(2, "0");
      const minutes = String(localTime.getUTCMinutes()).padStart(2, "0");

      const formattedString = `${day}/${month}/${year} ${hours}:${minutes}`;

      Logger.debug("DateTime conversion", {
        module: "ExcelExporter",
        data: {
          original: utcString,
          formatted: formattedString,
        },
        showNotification: false,
      });

      return formattedString;
    } catch (error) {
      Logger.error("Error creating local DateTime", {
        module: "ExcelExporter",
        error: error,
        showNotification: false,
        data: { originalString: utcString },
      });
      return "";
    }
  }

  /**
   * 📂 Generar nombre de archivo con timestamp
   */
  generateFileName() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;
    return `ship_nominations_${dateStr}.xlsx`;
  }

  /**
   * ⏳ Mostrar/ocultar loading en botón de exportación
   */
  showExportLoading(show) {
    const button = document.getElementById("exportToExcelBtn");
    const loader = button?.querySelector(".export-loader");
    const buttonText = button?.querySelector("span");

    if (show) {
      if (loader) loader.style.display = "inline-block";
      if (buttonText) buttonText.textContent = "Exporting...";
      if (button) button.disabled = true;
    } else {
      if (loader) loader.style.display = "none";
      this.updateExportCounter(); // Restaurar texto original
      if (button) button.disabled = false;
    }
  }

  /**
   * 📢 Mostrar notificación de resultado
   */
  showNotification(message, type = "info") {
    // Crear notificación temporal
    const notification = document.createElement("div");
    notification.className = `alert alert-${
      type === "error" ? "danger" : type
    }`;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1001;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remover después de 3 segundos
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);

    // Agregar estilos de animación si no existen
    this.addNotificationStyles();
  }

  /**
   * 🎨 Agregar estilos para notificaciones
   */
  addNotificationStyles() {
    if (document.getElementById("notificationStyles")) return;

    const style = document.createElement("style");
    style.id = "notificationStyles";
    style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
    document.head.appendChild(style);
  }
}

// Exportar para uso en otros módulos
export { ExcelExporter };
