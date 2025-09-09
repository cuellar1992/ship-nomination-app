/**
 * Table Manager for Sampling Roster System
 */

import DateUtils from "../utils/DateUtils.js";

export class TableManager {
  constructor() {
    this.officeSamplingClickHandler = null;
    this.lineSamplingClickHandler = null;
  }

  /**
   * Poblar tabla Office Sampling
   */
  populateOfficeSamplingTable(samplerName, startTime, finishTime, hours = 6) {
    const tableBody = document.getElementById("officeSamplingTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr data-row-id="office-sampler-row">
        <td class="fw-medium">${samplerName}</td>
        <td>${startTime}</td>
        <td>${finishTime}</td>
        <td class="text-center">${hours}</td>
        <td class="text-center">
          <button class="btn btn-secondary-premium btn-edit-item" 
                  data-action="edit" 
                  data-row-id="office-sampler-row"
                  title="Edit Sampler"
                  style="padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Poblar tabla Line Sampling
   */
  populateLineSamplingTable(turns) {
    const tableBody = document.getElementById("lineSamplingTableBody");
    if (!tableBody) return;

    // Limpiar tabla existente
    tableBody.innerHTML = "";

    // Crear filas para cada turno
    turns.forEach((turn, index) => {
      const row = document.createElement("tr");
      row.setAttribute("data-row-id", `line-sampler-row-${index}`);

      row.innerHTML = `
        <td class="fw-medium">${turn.samplerName}</td>
        <td>${turn.startTime}</td>
        <td>${turn.finishTime}</td>
        <td class="text-center">${turn.hours}</td>
        <td class="text-center">
          <button class="btn btn-secondary-premium btn-edit-item" 
                  data-action="edit" 
                  data-row-id="line-sampler-row-${index}"
                  title="Edit Sampler"
                  style="padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    });
  }

  /**
   * Limpiar tabla Office Sampling
   */
  clearOfficeSamplingTable() {
    const tableBody = document.getElementById("officeSamplingTableBody");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-clipboard-list"></i>
            Office sampling schedule will appear here after selecting a ship nomination
          </td>
        </tr>
      `;
    }
  }

  /**
   * Limpiar tabla Line Sampling
   */
  clearLineSamplingTable() {
    const tableBody = document.getElementById("lineSamplingTableBody");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-flask"></i>
            Line sampling schedule will appear here after clicking Auto Generate
          </td>
        </tr>
      `;
    }
  }

  /**
   * Obtener datos de Office Sampling de la tabla
   * 🔧 CORREGIDO: Priorizar valores de DateTimePickers activos sobre texto de celdas
   */
  getOfficeSamplingData() {
    try {
      const officeRow = document.querySelector(
        'tr[data-row-id="office-sampler-row"]'
      );
      if (!officeRow) return null;

      const cells = officeRow.querySelectorAll("td");
      if (cells.length < 4) return null;

      // 🔧 CORREGIDO: Intentar obtener valores de DateTimePickers activos primero
      let startTime = null;
      let finishTime = null;
      let hours = parseFloat(cells[3].textContent.trim()) || 6;

      // ✅ PRIORIDAD 1: Buscar DateTimePickers activos para Office Sampling
      if (window.officeTimeInstances && Object.keys(window.officeTimeInstances).length > 0) {
        // 🔧 CORREGIDO: Buscar DateTimePickers activos por patrón de ID
        const activeStartPickers = Object.keys(window.officeTimeInstances).filter(id => 
          id.startsWith('officeStartDateTime_')
        );
        const activeFinishPickers = Object.keys(window.officeTimeInstances).filter(id => 
          id.startsWith('officeFinishDateTime_')
        );
        
        console.log('🔧 Office Sampling DateTimePicker search:', {
          totalInstances: Object.keys(window.officeTimeInstances).length,
          activeStartPickers: activeStartPickers,
          activeFinishPickers: activeFinishPickers
        });
        
        // Intentar obtener startTime del DateTimePicker activo
        if (activeStartPickers.length > 0) {
          const startPicker = window.officeTimeInstances[activeStartPickers[0]];
          if (startPicker && typeof startPicker.getDateTime === 'function') {
            const startDateTime = startPicker.getDateTime();
            if (startDateTime) {
              startTime = this.formatDateTime(startDateTime);
              console.log('✅ Office Sampling startTime from active DateTimePicker:', startTime);
            } else {
              console.log('⚠️ Start DateTimePicker found but getDateTime() returned null');
            }
          } else {
            console.log('⚠️ Start DateTimePicker found but getDateTime method not available');
          }
        }

        // Intentar obtener finishTime del DateTimePicker activo
        if (activeFinishPickers.length > 0) {
          const finishPicker = window.officeTimeInstances[activeFinishPickers[0]];
          if (finishPicker && typeof finishPicker.getDateTime === 'function') {
            const finishDateTime = finishPicker.getDateTime();
            if (finishDateTime) {
              finishTime = this.formatDateTime(finishDateTime);
              console.log('✅ Office Sampling finishTime from active DateTimePicker:', finishTime);
            } else {
              console.log('⚠️ Finish DateTimePicker found but getDateTime() returned null');
            }
          } else {
            console.log('⚠️ Finish DateTimePicker found but getDateTime method not available');
          }
        }

        // ✅ Si ambos DateTimePickers están activos, recalcular horas
        if (startTime && finishTime) {
          const startDate = this.parseDateTime(startTime);
          const finishDate = this.parseDateTime(finishTime);
          if (startDate && finishDate) {
            hours = this.calculateHoursFromDates(startDate, finishDate);
            console.log('✅ Office Sampling hours recalculated from active DateTimePickers:', hours);
          }
        }
      } else {
        console.log('🔧 No active DateTimePicker instances found for Office Sampling');
      }

      // ✅ PRIORIDAD 2: Fallback - usar valores de celdas si no hay DateTimePickers activos
      if (!startTime) {
        startTime = cells[1].textContent.trim();
        console.log('🔧 Office Sampling startTime fallback to cell text:', startTime);
      }
      if (!finishTime) {
        finishTime = cells[2].textContent.trim();
        console.log('🔧 Office Sampling finishTime fallback to cell text:', finishTime);
      }

      // ✅ VALIDACIÓN: Asegurar que tenemos valores válidos
      if (!startTime || !finishTime) {
        console.warn('⚠️ Office Sampling data incomplete:', { startTime, finishTime, hours });
        return null;
      }

      const result = {
        samplerName: cells[0].textContent.trim(),
        startTime: startTime,
        finishTime: finishTime,
        hours: hours,
        source: startTime && finishTime ? 'datetime_pickers' : 'cell_text'
      };

      console.log('✅ Office Sampling data collected successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Error in getOfficeSamplingData:', error);
      return null;
    }
  }

  /**
   * Obtener turnos actuales de Line Sampling
   */
  getCurrentLineTurns() {
    const turns = [];
    const lineRows = document.querySelectorAll(
      'tr[data-row-id^="line-sampler-row-"]'
    );

    lineRows.forEach((row, index) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 4) {
        // 🔧 FIX 1: Leer SOLO texto visible, no HTML interno
        let samplerName = "";
        const samplerCell = cells[0];

        // Si está en modo edición (contiene dropdown), no usar
        const isEditing = samplerCell.querySelector(
          'div[id^="lineSamplerDropdown_"]'
        );
        if (isEditing) {
          // En modo edición, obtener el valor original guardado
          samplerName =
            samplerCell.getAttribute("data-original-value") ||
            "No Sampler Assigned";
        } else {
          // Modo normal: obtener solo el texto visible de span
          const span = samplerCell.querySelector("span.fw-medium");
          if (span) {
            samplerName = span.textContent.trim();
          } else {
            // Fallback: texto directo de la celda
            samplerName = samplerCell.textContent.trim();
          }
        }

        turns.push({
          samplerName: samplerName,
          startTime: cells[1].textContent.trim(),
          finishTime: cells[2].textContent.trim(),
          hours: parseFloat(cells[3].textContent.trim()) || 0,
          rowIndex: index,
        });
      }
    });

    return turns;
  }

  getLineTurnByIndex(index) {
    const row = document.querySelector(
      `tr[data-row-id="line-sampler-row-${index}"]`
    );
    if (!row) return null;

    const cells = row.querySelectorAll("td");
    if (cells.length < 4) return null;

    // Obtener samplerName sin corrupción
    let samplerName = "";
    const samplerCell = cells[0];

    const isEditing = samplerCell.querySelector(
      'div[id^="lineSamplerDropdown_"]'
    );
    if (isEditing) {
      samplerName =
        samplerCell.getAttribute("data-original-value") ||
        "No Sampler Assigned";
    } else {
      const span = samplerCell.querySelector("span.fw-medium");
      samplerName = span
        ? span.textContent.trim()
        : samplerCell.textContent.trim();
    }

    return {
      samplerName: samplerName,
      startTime: cells[1].textContent.trim(),
      finishTime: cells[2].textContent.trim(),
      hours: parseFloat(cells[3].textContent.trim()) || 0,
      rowIndex: index,
    };
  }

  /**
   * Setup event listeners para Office Sampling
   */
  setupOfficeSamplingEventListeners(clickHandler) {
    const tableBody = document.getElementById("officeSamplingTableBody");
    if (!tableBody) return;

    // Remover listeners existentes
    if (this.officeSamplingClickHandler) {
      tableBody.removeEventListener("click", this.officeSamplingClickHandler);
    }

    // Nuevo handler
    this.officeSamplingClickHandler = clickHandler;
    tableBody.addEventListener("click", this.officeSamplingClickHandler);
  }

  /**
   * Setup event listeners para Line Sampling
   */
  setupLineSamplingEventListeners(clickHandler) {
    const tableBody = document.getElementById("lineSamplingTableBody");
    if (!tableBody) return;

    // Remover listeners existentes
    if (this.lineSamplingClickHandler) {
      tableBody.removeEventListener("click", this.lineSamplingClickHandler);
    }

    // Nuevo handler
    this.lineSamplingClickHandler = clickHandler;
    tableBody.addEventListener("click", this.lineSamplingClickHandler);
  }

  /**
   * Auto-poblar Office Sampling desde ship nomination
   */
  autoPopulateOfficeSampling(nomination) {
    const samplerName = nomination.sampler?.name || "No Sampler Assigned";
    const startOffice = DateUtils.formatDateTime(nomination.pilotOnBoard);

    // Calcular finish = POB + 6 horas
    let finishSampling = "";
    if (nomination.pilotOnBoard) {
      const pobDate = new Date(nomination.pilotOnBoard);
      const finishDate = new Date(pobDate);
      finishDate.setHours(finishDate.getHours() + 6);
      finishSampling = DateUtils.formatDateTime(finishDate);
    }

    this.populateOfficeSamplingTable(
      samplerName,
      startOffice,
      finishSampling,
      6
    );
  }

  /**
   * Cargar Office Sampling desde roster existente
   */
  loadOfficeSamplingFromRoster(officeSamplingData) {
    const samplerName =
      officeSamplingData.sampler?.name || "No Sampler Assigned";
    const startTime = DateUtils.formatDateTime(officeSamplingData.startTime);
    const finishTime = DateUtils.formatDateTime(officeSamplingData.finishTime);
    const hours = officeSamplingData.hours || 6;

    this.populateOfficeSamplingTable(samplerName, startTime, finishTime, hours);
  }

  /**
   * Cargar Line Sampling desde roster existente
   */
  loadLineSamplingFromRoster(lineSamplingData) {
    const turns = lineSamplingData.map((turn) => ({
      samplerName: turn.sampler?.name || "No Sampler Assigned",
      startTime: DateUtils.formatDateTime(turn.startTime),
      finishTime: DateUtils.formatDateTime(turn.finishTime),
      hours: turn.hours || 0,
    }));

    this.populateLineSamplingTable(turns);
  }

  /**
   * 🆕 NUEVOS MÉTODOS PARA DATETIMEPICKERS EN OFFICE SAMPLING
   * Agregar estos métodos al final de TableManager.js
   */

  /**
   * 🆕 Activar DateTimePickers en Office Sampling (modo edición)
   */
  enableOfficeSamplingDateTimeEdit(rowId) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return false;

    const startCell = row.querySelector("td:nth-child(2)"); // START OFFICE
    const finishCell = row.querySelector("td:nth-child(3)"); // FINISH SAMPLING

    if (!startCell || !finishCell) return false;

    try {
      // 🆕 SOLO guardar valores originales si no existen ya (evitar sobrescribir)
      if (!startCell.hasAttribute("data-original-value")) {
        const originalStartTime = startCell.textContent.trim();
        startCell.setAttribute("data-original-value", originalStartTime);
      }
      if (!finishCell.hasAttribute("data-original-value")) {
        const originalFinishTime = finishCell.textContent.trim();
        finishCell.setAttribute("data-original-value", originalFinishTime);
      }

      // Crear IDs únicos para los DateTimePickers
      const startPickerId = `officeStartDateTime_${Date.now()}`;
      const finishPickerId = `officeFinishDateTime_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 5)}`;

      // Crear contenedores DateTimePicker
      const startContainer = this.createDateTimePickerContainer(startPickerId);
      const finishContainer =
        this.createDateTimePickerContainer(finishPickerId);

      // Reemplazar contenido de las celdas
      startCell.innerHTML = "";
      finishCell.innerHTML = "";
      startCell.appendChild(startContainer);
      finishCell.appendChild(finishContainer);

      // Obtener valores originales para inicializar los DateTimePickers
      const originalStartTime = startCell.getAttribute("data-original-value");
      const originalFinishTime = finishCell.getAttribute("data-original-value");

      // Inicializar DateTimePickers usando el componente existente
      setTimeout(() => {
        this.initializeOfficeDateTimePicker(
          startPickerId,
          originalStartTime,
          rowId,
          "start"
        );
        this.initializeOfficeDateTimePicker(
          finishPickerId,
          originalFinishTime,
          rowId,
          "finish"
        );
      }, 100);

      return true;
    } catch (error) {
      console.error("Error enabling Office Sampling DateTimePickers:", error);
      return false;
    }
  }

  /**
   * 🆕 Desactivar DateTimePickers en Office Sampling (guardar cambios)
   */
  disableOfficeSamplingDateTimeEdit(rowId) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return { success: false };

    const startCell = row.querySelector("td:nth-child(2)");
    const finishCell = row.querySelector("td:nth-child(3)");

    if (!startCell || !finishCell) return { success: false };

    try {
      // Obtener DateTimePicker instances
      const startContainer = startCell.querySelector(
        'div[id^="officeStartDateTime_"]'
      );
      const finishContainer = finishCell.querySelector(
        'div[id^="officeFinishDateTime_"]'
      );

      let newStartTime = startCell.getAttribute("data-original-value");
      let newFinishTime = finishCell.getAttribute("data-original-value");
      let newStartDate = null;
      let newFinishDate = null;

      // Obtener nuevos valores de los DateTimePickers
      if (startContainer && window.officeTimeInstances) {
        const startInstance = window.officeTimeInstances[startContainer.id];
        if (startInstance) {
          newStartDate = startInstance.getDateTime();
          if (newStartDate) {
            newStartTime = this.formatDateTime(newStartDate);
          }
          startInstance.destroy();
          delete window.officeTimeInstances[startContainer.id];
        }
      }

      if (finishContainer && window.officeTimeInstances) {
        const finishInstance = window.officeTimeInstances[finishContainer.id];
        if (finishInstance) {
          newFinishDate = finishInstance.getDateTime();
          if (newFinishDate) {
            newFinishTime = this.formatDateTime(newFinishDate);
          }
          finishInstance.destroy();
          delete window.officeTimeInstances[finishContainer.id];
        }
      }

      // Validar secuencia de fechas
      const validation = this.validateOfficeSamplingTimes(
        newStartDate,
        newFinishDate
      );
      if (!validation.isValid) {
        // Restaurar valores originales si hay error
        const originalStart = startCell.getAttribute("data-original-value");
        const originalFinish = finishCell.getAttribute("data-original-value");

        startCell.innerHTML = originalStart;
        finishCell.innerHTML = originalFinish;

        return {
          success: false,
          message: validation.message,
        };
      }

      // Calcular nuevas horas
      const newHours = this.calculateHoursFromDates(
        newStartDate,
        newFinishDate
      );

      // Restaurar contenido de las celdas con nuevos valores
      startCell.innerHTML = newStartTime;
      finishCell.innerHTML = newFinishTime;

      // Actualizar columna de horas
      const hoursCell = row.querySelector("td:nth-child(4)");
      if (hoursCell) {
        hoursCell.textContent = newHours;
        hoursCell.style.fontWeight = "bold";
        hoursCell.style.color = newHours >= 4 ? "#28a745" : "#dc3545";
      }

      // Limpiar atributos temporales
      startCell.removeAttribute("data-original-value");
      finishCell.removeAttribute("data-original-value");

      return {
        success: true,
        data: {
          startTime: newStartTime,
          finishTime: newFinishTime,
          hours: newHours,
          startDate: newStartDate,
          finishDate: newFinishDate,
        },
      };
    } catch (error) {
      console.error("Error disabling Office Sampling DateTimePickers:", error);
      return { success: false, message: "Error saving changes" };
    }
  }

  /**
   * 🆕 Cancelar edición de DateTimePickers (ESC key) - CON BACKUP RESTORE
   */
  cancelOfficeSamplingDateTimeEdit(rowId) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return false;

    const startCell = row.querySelector("td:nth-child(2)");
    const finishCell = row.querySelector("td:nth-child(3)");
    const hoursCell = row.querySelector("td:nth-child(4)");

    if (!startCell || !finishCell) return false;

    try {
      console.log(
        `🔄 Cancelling Office Sampling edit, restoring original values for ${rowId}`
      );

      // Obtener valores originales
      let originalStart = startCell.getAttribute("data-original-value");
      let originalFinish = finishCell.getAttribute("data-original-value");

      // 🆕 FALLBACK: Si no hay valores originales, usar valores actuales o valores por defecto
      if (!originalStart) {
        // Buscar en el contenedor del DateTimePicker si existe
        const startContainer = startCell.querySelector('div[id^="officeStartDateTime_"]');
        if (startContainer) {
          // Intentar obtener el valor del DateTimePicker antes de destruirlo
          if (window.officeTimeInstances && window.officeTimeInstances[startContainer.id]) {
            const startInstance = window.officeTimeInstances[startContainer.id];
            if (startInstance && startInstance.getDateTime) {
              const currentDate = startInstance.getDateTime();
              if (currentDate) {
                originalStart = this.formatDateTime(currentDate);
              }
            }
          }
        }
        // Si aún no hay valor, usar valor por defecto
        if (!originalStart) {
          originalStart = "No Start Time";
        }
      }

      if (!originalFinish) {
        // Buscar en el contenedor del DateTimePicker si existe
        const finishContainer = finishCell.querySelector('div[id^="officeFinishDateTime_"]');
        if (finishContainer) {
          // Intentar obtener el valor del DateTimePicker antes de destruirlo
          if (window.officeTimeInstances && window.officeTimeInstances[finishContainer.id]) {
            const finishInstance = window.officeTimeInstances[finishContainer.id];
            if (finishInstance && finishInstance.getDateTime) {
              const currentDate = finishInstance.getDateTime();
              if (currentDate) {
                originalFinish = this.formatDateTime(currentDate);
              }
            }
          }
        }
        // Si aún no hay valor, usar valor por defecto
        if (!originalFinish) {
          originalFinish = "No Finish Time";
        }
      }

      // Limpiar DateTimePicker instances
      const startContainer = startCell.querySelector(
        'div[id^="officeStartDateTime_"]'
      );
      const finishContainer = finishCell.querySelector(
        'div[id^="officeFinishDateTime_"]'
      );

      if (startContainer && window.officeTimeInstances) {
        const startInstance = window.officeTimeInstances[startContainer.id];
        if (startInstance) {
          startInstance.destroy();
          delete window.officeTimeInstances[startContainer.id];
        }
      }

      if (finishContainer && window.officeTimeInstances) {
        const finishInstance = window.officeTimeInstances[finishContainer.id];
        if (finishInstance) {
          finishInstance.destroy();
          delete window.officeTimeInstances[finishContainer.id];
        }
      }

      // Restaurar contenido original de las celdas
      startCell.innerHTML = originalStart || "";
      finishCell.innerHTML = originalFinish || "";

      // 🆕 RESTAURAR HORAS ORIGINALES
      if (hoursCell && originalStart && originalFinish) {
        // Calcular horas originales
        const originalStartDate = this.parseDateTime(originalStart);
        const originalFinishDate = this.parseDateTime(originalFinish);

        if (originalStartDate && originalFinishDate) {
          const originalHours = this.calculateHoursFromDates(
            originalStartDate,
            originalFinishDate
          );
          hoursCell.textContent = originalHours;
        } else {
          // Fallback: usar backup si existe
          const backupHours = hoursCell.getAttribute("data-backup-value");
          if (backupHours) {
            hoursCell.textContent = backupHours;
          } else {
            // Fallback final: usar 6 horas por defecto para Office Sampling
            hoursCell.textContent = "6";
          }
        }

        // Restaurar estilos normales
        hoursCell.style.fontWeight = "normal";
        hoursCell.style.color = "var(--text-primary)";
        hoursCell.style.backgroundColor = "transparent";

        // Limpiar backup
        hoursCell.removeAttribute("data-backup-value");
      }

      // 🆕 IMPORTANTE: NO limpiar data-original-value del sampler aquí
      // Solo limpiar los de fechas y horas, el sampler se restaura en el controlador
      startCell.removeAttribute("data-original-value");
      finishCell.removeAttribute("data-original-value");

      this.resetOfficeSamplingRowStyles(row);

      console.log(
        `✅ Office Sampling edit cancelled and original values restored:`,
        {
          originalStart,
          originalFinish,
        }
      );
      
      return true; // 🆕 Retornar true si la cancelación fue exitosa
    } catch (error) {
      console.error("Error cancelling Office Sampling DateTimePickers:", error);
      return false; // 🆕 Retornar false si hubo un error
    }
  }

  /**
   * 🆕 Recalcular horas automáticamente al cambiar fechas
   */
  updateOfficeSamplingHours(rowId) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    try {
      const startContainer = row.querySelector(
        'div[id^="officeStartDateTime_"]'
      );
      const finishContainer = row.querySelector(
        'div[id^="officeFinishDateTime_"]'
      );
      const hoursCell = row.querySelector("td:nth-child(4)");

      if (!startContainer || !finishContainer || !hoursCell) return;

      // 🆕 HACER BACKUP DE VALOR ORIGINAL DE HORAS (solo la primera vez)
      if (!hoursCell.getAttribute("data-backup-value")) {
        hoursCell.setAttribute("data-backup-value", hoursCell.textContent);
        console.log(`💾 Backup of original hours: ${hoursCell.textContent}`);
      }

      // Obtener DateTimePicker instances
      let startDateTime = null;
      let finishDateTime = null;

      if (window.officeTimeInstances) {
        const startInstance = window.officeTimeInstances[startContainer.id];
        const finishInstance = window.officeTimeInstances[finishContainer.id];

        if (startInstance) {
          startDateTime = startInstance.getDateTime();
        }
        if (finishInstance) {
          finishDateTime = finishInstance.getDateTime();
        }
      }

      // Calcular horas si ambas fechas están disponibles
      if (startDateTime && finishDateTime) {
        const hours = this.calculateHoursFromDates(
          startDateTime,
          finishDateTime
        );
        hoursCell.textContent = hours;
        hoursCell.style.fontWeight = "bold";
        hoursCell.style.color = hours >= 4 ? "#28a745" : "#dc3545"; // Verde si >= 4h, rojo si < 4h

        // Agregar efecto visual sutil para indicar cambio
        hoursCell.style.backgroundColor = "rgba(31, 181, 212, 0.1)";
        hoursCell.style.transition = "all 0.3s ease";

        // Quitar highlighting después de 1 segundo
        setTimeout(() => {
          hoursCell.style.backgroundColor = "transparent";
        }, 1000);

        console.log(`✅ Office Sampling hours updated: ${hours}h`);
      }
    } catch (error) {
      console.error("Error updating Office Sampling hours:", error);
    }
  }

  /**
   * 🆕 Crear contenedor para DateTimePicker
   */
  createDateTimePickerContainer(pickerId) {
    const container = document.createElement("div");
    container.id = pickerId;
    container.className = "datetime-picker-container";
    container.style.cssText = `
    min-width: 180px;
    max-width: 200px;
    margin: 0;
  `;

    return container;
  }

  /**
   * 🆕 Inicializar DateTimePicker usando el componente existente
   */
  initializeOfficeDateTimePicker(pickerId, initialValue, rowId, type) {
    try {
      // Asegurar que window.officeTimeInstances existe
      if (!window.officeTimeInstances) {
        window.officeTimeInstances = {};
      }

      // Crear instancia DateTimePicker con el componente existente
      const dateTimePicker = new DateTimePicker(pickerId, {
        placeholder:
          type === "start" ? "Select start time..." : "Select finish time...",
        label: "", // Sin label para ahorrar espacio
        modalTitle:
          type === "start"
            ? "Select Start Office Time"
            : "Select Finish Sampling Time",
        onDateTimeChange: (dateTime) => {
          // 🔧 NUEVO: Recalcular horas automáticamente al cambiar fecha/hora
          this.updateOfficeSamplingHours(rowId);
          
          // 🔧 NUEVO: AUTO-SAVE INMEDIATO para Office Sampling
          this.triggerOfficeSamplingAutoSave(rowId, dateTime);
        },
        onDateTimeSelect: (dateTime) => {
          // Opcional: Log cuando se selecciona fecha/hora
          console.log(`${type} time selected:`, dateTime);
        },
      });

      // Establecer valor inicial si existe y es válido
      if (initialValue && initialValue !== "") {
        const parsedDate = this.parseDateTime(initialValue);
        if (parsedDate) {
          setTimeout(() => {
            dateTimePicker.setDateTime(parsedDate);
          }, 200);
        }
      }

      // Guardar referencia global
      window.officeTimeInstances[pickerId] = dateTimePicker;

      return dateTimePicker;
    } catch (error) {
      console.error("Error initializing Office DateTimePicker:", error);
      return null;
    }
  }

  /**
   * 🆕 Validar secuencia de fechas en Office Sampling usando Date objects
   */
  validateOfficeSamplingTimes(startDate, finishDate) {
    try {
      if (!startDate || !finishDate) {
        return {
          isValid: false,
          message: "Both start and finish times are required",
        };
      }

      // Start debe ser antes que Finish
      if (startDate >= finishDate) {
        return {
          isValid: false,
          message: "Start time must be before finish time",
        };
      }

      // Mínimo 4 horas de diferencia
      const hoursDiff = (finishDate - startDate) / (1000 * 60 * 60);
      if (hoursDiff < 4) {
        return {
          isValid: false,
          message: "Minimum 4 hours required between start and finish",
        };
      }

      return {
        isValid: true,
        message: "Valid time sequence",
      };
    } catch (error) {
      return {
        isValid: false,
        message: "Validation error",
      };
    }
  }

  /**
   * 🆕 Calcular horas entre dos objetos Date
   */
  calculateHoursFromDates(startDate, finishDate) {
    try {
      if (!startDate || !finishDate) return 0;

      const diffMs = finishDate - startDate;
      
      // 🔧 NUEVO: Calcular horas con precisión decimal (soporta medias horas)
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Redondear a 2 decimales para mantener precisión (ej: 5.5, 6.25, etc.)
      const roundedHours = Math.round(diffHours * 100) / 100;
      
      // Opcional: Log para debug
      console.log('🔧 calculateHoursFromDates - Precision calculation', {
        diffHours: diffHours,
        roundedHours: roundedHours
      });

      return Math.max(0, roundedHours);
    } catch (error) {
      console.error('Error in calculateHoursFromDates:', error);
      return 0;
    }
  }

  /**
   * 🆕 Formatear Date object a string DD/MM/YYYY HH:mm (formato esperado por el sistema)
   */
  formatDateTime(date) {
    if (!date || !(date instanceof Date)) return "";

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * 🆕 Parsear string de fecha a Date object (maneja formato DD/MM/YYYY HH:mm)
   */
  parseDateTime(dateTimeString) {
    if (!dateTimeString) return null;

    try {
      // Formato esperado: DD/MM/YYYY HH:mm
      const match = dateTimeString.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/
      );
      if (match) {
        const [, day, month, year, hours, minutes] = match;

        // 🔧 FIX: Crear fecha correctamente con TODAS las partes
        const parsedDate = new Date(
          parseInt(year), // year
          parseInt(month) - 1, // month (0-indexed)
          parseInt(day), // day
          parseInt(hours), // 🆕 HOURS - esto estaba faltando
          parseInt(minutes), // 🆕 MINUTES - esto estaba faltando
          0, // seconds
          0 // milliseconds
        );

        return parsedDate;
      }

      // Fallback para otros formatos
      const fallbackDate = new Date(dateTimeString);
      return !isNaN(fallbackDate.getTime()) ? fallbackDate : null;
    } catch (error) {
      console.error("Error parsing datetime:", error);
      return null;
    }
  }

  /**
   * 🆕 MÉTODOS PARA DATETIMEPICKERS EN LINE SAMPLING - PRIMERA LÍNEA SOLAMENTE
   * Agregar estos métodos al final de TableManager.js
   */

  /**
   * 🆕 Activar DateTimePickers en primera línea de Line Sampling
   */
  enableLineSamplingDateTimeEdit(rowId) {
    // Solo permitir edición en la primera línea (line-sampler-row-0)
    if (rowId !== "line-sampler-row-0") {
      console.warn(
        "DateTimePickers only available for first line of Line Sampling"
      );
      return false;
    }

    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return false;

    const startCell = row.querySelector("td:nth-child(2)"); // START LINE SAMPLING
    const finishCell = row.querySelector("td:nth-child(3)"); // FINISH LINE SAMPLING

    if (!startCell || !finishCell) return false;

    try {
      // Guardar valores originales
      const originalStartTime = startCell.textContent.trim();
      const originalFinishTime = finishCell.textContent.trim();

      startCell.setAttribute("data-original-value", originalStartTime);
      finishCell.setAttribute("data-original-value", originalFinishTime);

      const hoursCell = row.querySelector("td:nth-child(4)");
      if (hoursCell) {
        const originalHours = hoursCell.textContent.trim();
        hoursCell.setAttribute("data-backup-value", originalHours);
        console.log(`💾 Backup of original Office hours: ${originalHours}`);
      }

      // Crear IDs únicos para los DateTimePickers
      const startPickerId = `lineStartDateTime_${Date.now()}`;
      const finishPickerId = `lineFinishDateTime_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 5)}`;

      // Crear contenedores DateTimePicker
      const startContainer = this.createDateTimePickerContainer(startPickerId);
      const finishContainer =
        this.createDateTimePickerContainer(finishPickerId);

      // Reemplazar contenido de las celdas
      startCell.innerHTML = "";
      finishCell.innerHTML = "";
      startCell.appendChild(startContainer);
      finishCell.appendChild(finishContainer);

      // Inicializar DateTimePickers
      setTimeout(() => {
        this.initializeLineDateTimePicker(
          startPickerId,
          originalStartTime,
          rowId,
          "start"
        );
        this.initializeLineDateTimePicker(
          finishPickerId,
          originalFinishTime,
          rowId,
          "finish"
        );
      }, 100);

      return true;
    } catch (error) {
      console.error("Error enabling Line Sampling DateTimePickers:", error);
      return false;
    }
  }

  /**
   * 🆕 Desactivar DateTimePickers en primera línea de Line Sampling
   */
  disableLineSamplingDateTimeEdit(rowId) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return { success: false };

    const startCell = row.querySelector("td:nth-child(2)");
    const finishCell = row.querySelector("td:nth-child(3)");

    if (!startCell || !finishCell) return { success: false };

    try {
      // Obtener DateTimePicker instances
      const startContainer = startCell.querySelector(
        'div[id^="lineStartDateTime_"]'
      );
      const finishContainer = finishCell.querySelector(
        'div[id^="lineFinishDateTime_"]'
      );

      let newStartTime = startCell.getAttribute("data-original-value");
      let newFinishTime = finishCell.getAttribute("data-original-value");
      let newStartDate = null;
      let newFinishDate = null;

      // Obtener nuevos valores de los DateTimePickers
      if (startContainer && window.lineTimeInstances) {
        const startInstance = window.lineTimeInstances[startContainer.id];
        if (startInstance) {
          newStartDate = startInstance.getDateTime();
          if (newStartDate) {
            newStartTime = this.formatDateTime(newStartDate);
          }
          startInstance.destroy();
          delete window.lineTimeInstances[startContainer.id];
        }
      }

      if (finishContainer && window.lineTimeInstances) {
        const finishInstance = window.lineTimeInstances[finishContainer.id];
        if (finishInstance) {
          newFinishDate = finishInstance.getDateTime();
          if (newFinishDate) {
            newFinishTime = this.formatDateTime(newFinishDate);
          }
          finishInstance.destroy();
          delete window.lineTimeInstances[finishContainer.id];
        }
      }

      // Validar secuencia de fechas básica
      const validation = this.validateLineSamplingFirstLineTimes(
        newStartDate,
        newFinishDate
      );
      if (!validation.isValid) {
        // Restaurar valores originales si hay error
        const originalStart = startCell.getAttribute("data-original-value");
        const originalFinish = finishCell.getAttribute("data-original-value");

        startCell.innerHTML = originalStart;
        finishCell.innerHTML = originalFinish;

        return {
          success: false,
          message: validation.message,
        };
      }

      // Calcular nuevas horas para primera línea
      const newHours = this.calculateHoursFromDates(
        newStartDate,
        newFinishDate
      );

      // Restaurar contenido de las celdas con nuevos valores
      startCell.innerHTML = newStartTime;
      finishCell.innerHTML = newFinishTime;

      // Actualizar columna de horas de primera línea
      const hoursCell = row.querySelector("td:nth-child(4)");
      if (hoursCell) {
        hoursCell.textContent = newHours;
        hoursCell.style.fontWeight = "bold";
        hoursCell.style.color = "#1fb5d4"; // Color accent del sistema
      }

      // Limpiar atributos temporales
      startCell.removeAttribute("data-original-value");
      finishCell.removeAttribute("data-original-value");

      if (hoursCell) {
        hoursCell.removeAttribute("data-backup-value");
        console.log(`🗑️ Backup cleared after successful save`);
      }

      return {
        success: true,
        data: {
          startTime: newStartTime,
          finishTime: newFinishTime,
          hours: newHours,
          startDate: newStartDate,
          finishDate: newFinishDate,
        },
      };
    } catch (error) {
      console.error("Error disabling Line Sampling DateTimePickers:", error);
      return { success: false, message: "Error saving changes" };
    }
  }

  /**
   * 🆕 Cancelar edición de DateTimePickers en primera línea
   */
  cancelLineSamplingDateTimeEdit(rowId) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const startCell = row.querySelector("td:nth-child(2)");
    const finishCell = row.querySelector("td:nth-child(3)");

    if (!startCell || !finishCell) return;

    try {
      // 🛡️ OBTENER VALORES ORIGINALES DESDE EL TR (no desde las celdas modificadas)
      const originalStart = row.getAttribute("data-original-start");
      const originalFinish = row.getAttribute("data-original-finish");
      const originalHours = row.getAttribute("data-original-hours");

      console.log(
        `🔄 Cancelling Line Sampling edit, restoring original values from TR:`,
        {
          originalStart,
          originalFinish,
          originalHours,
        }
      );

      // 🔍 DEBUG: Log complete cell state before restoration
      console.log("🔍 DEBUG: Complete cell state before restoration:", {
        startCell: {
          innerHTML: startCell.innerHTML,
          hasAttribute: startCell.hasAttribute("data-original-value"),
          attributeValue: startCell.getAttribute("data-original-value"),
          hasDateTimePicker: !!startCell.querySelector('div[id^="lineStartDateTime_"]')
        },
        finishCell: {
          innerHTML: finishCell.innerHTML,
          hasAttribute: finishCell.hasAttribute("data-original-value"),
          attributeValue: finishCell.getAttribute("data-original-value"),
          hasDateTimePicker: !!finishCell.querySelector('div[id^="lineFinishDateTime_"]')
        }
      });

      // Limpiar DateTimePicker instances
      const startContainer = startCell.querySelector(
        'div[id^="lineStartDateTime_"]'
      );
      const finishContainer = finishCell.querySelector(
        'div[id^="lineFinishDateTime_"]'
      );

      if (startContainer && window.lineTimeInstances) {
        const startInstance = window.lineTimeInstances[startContainer.id];
        if (startInstance) {
          startInstance.destroy();
          delete window.lineTimeInstances[startContainer.id];
        }
      }

      if (finishContainer && window.lineTimeInstances) {
        const finishInstance = window.lineTimeInstances[finishContainer.id];
        if (finishInstance) {
          finishInstance.destroy();
          delete window.lineTimeInstances[finishContainer.id];
        }
      }

      // 🆕 RESTAURAR HORAS ORIGINAL DE PRIMERA LÍNEA  
      const hoursCell = row.querySelector("td:nth-child(4)");

      // Verificar si tenemos valores originales válidos
      if (originalStart && originalFinish) {
        // Restaurar contenido original de la primera línea
        startCell.innerHTML = originalStart;
        finishCell.innerHTML = originalFinish;

        // Restaurar horas originales si están disponibles
        if (hoursCell && originalHours) {
          hoursCell.textContent = originalHours;
        } else if (hoursCell) {
          // Calcular horas si no están guardadas
          const originalStartDate = this.parseDateTime(originalStart);
          const originalFinishDate = this.parseDateTime(originalFinish);

          if (originalStartDate && originalFinishDate) {
            const calculatedHours = this.calculateHoursFromDates(
              originalStartDate,
              originalFinishDate
            );
            hoursCell.textContent = calculatedHours;
          }
        }
      } else {
        // Si no hay valores originales, mostrar estado por defecto
        console.warn("⚠️ No original values found for line sampling cancellation");
        startCell.innerHTML = '<span class="text-muted">Select start time...</span>';
        finishCell.innerHTML = '<span class="text-muted">Select finish time...</span>';
        if (hoursCell) {
          hoursCell.textContent = "6";
        }
      }

      // 🆕 RESTAURAR ESTADO ORIGINAL DE TODAS LAS LÍNEAS
      this.restoreOriginalLineState();

      // 🧹 LIMPIAR ATRIBUTOS DEL TR DESPUÉS DE LA RESTAURACIÓN
      row.removeAttribute("data-original-start");
      row.removeAttribute("data-original-start-text");
      row.removeAttribute("data-original-finish");
      row.removeAttribute("data-original-finish-text");
      row.removeAttribute("data-original-hours");

      console.log(
        `✅ Line Sampling edit cancelled and original state restored`
      );
      this.clearAllLineSamplingHighlighting();
    } catch (error) {
      console.error("Error cancelling Line Sampling DateTimePickers:", error);
    }
  }

  /**
   * 🆕 Inicializar DateTimePicker para Line Sampling
   */
  initializeLineDateTimePicker(pickerId, initialValue, rowId, type) {
    try {
      // Asegurar que window.lineTimeInstances existe
      if (!window.lineTimeInstances) {
        window.lineTimeInstances = {};
      }

      // Crear instancia DateTimePicker
      const dateTimePicker = new DateTimePicker(pickerId, {
        placeholder:
          type === "start" ? "Select start time..." : "Select finish time...",
        label: "", // Sin label para ahorrar espacio
        modalTitle:
          type === "start"
            ? "Select Line Start Time"
            : "Select Line Finish Time",
        onDateTimeChange: (dateTime) => {
          // 🔧 NUEVO: Trigger recálculo de toda la línea de sampling cuando cambie la primera línea
          this.triggerLineSamplingRecalculation(rowId);
          
          // 🔧 NUEVO: AUTO-SAVE INMEDIATO para Line Sampling (primera línea)
          this.triggerLineSamplingAutoSave(rowId, dateTime);
        },
        onDateTimeSelect: (dateTime) => {
          // Log cuando se selecciona fecha/hora
          console.log(`Line sampling ${type} time selected:`, dateTime);
        },
      });

      // Establecer valor inicial si existe y es válido
      if (initialValue && initialValue !== "") {
        const parsedDate = this.parseDateTime(initialValue);
        if (parsedDate) {
          setTimeout(() => {
            dateTimePicker.setDateTime(parsedDate);
          }, 200);
        }
      }

      // Guardar referencia global
      window.lineTimeInstances[pickerId] = dateTimePicker;

      return dateTimePicker;
    } catch (error) {
      console.error("Error initializing Line DateTimePicker:", error);
      return null;
    }
  }

  /**
   * 🆕 Validar fechas de primera línea de Line Sampling
   */
  validateLineSamplingFirstLineTimes(startDate, finishDate) {
    try {
      if (!startDate || !finishDate) {
        return {
          isValid: false,
          message: "Both start and finish times are required for first line",
        };
      }

      // Start debe ser antes que Finish
      if (startDate >= finishDate) {
        return {
          isValid: false,
          message: "Start time must be before finish time",
        };
      }

      // Mínimo 2 horas para primera línea (puede ser más flexible que Office Sampling)
      const hoursDiff = (finishDate - startDate) / (1000 * 60 * 60);
      if (hoursDiff < 2) {
        return {
          isValid: false,
          message: "Minimum 2 hours required for first line sampling turn",
        };
      }

      // Máximo 18 horas para primera línea (evitar turnos excesivamente largos)
      if (hoursDiff > 18) {
        return {
          isValid: false,
          message: "Maximum 18 hours allowed for first line sampling turn",
        };
      }

      return {
        isValid: true,
        message: "Valid time sequence for first line",
        hours: hoursDiff,
        suggestETCAdjustment: false // Por defecto no sugerir ajuste
      };
    } catch (error) {
      return {
        isValid: false,
        message: "Validation error",
      };
    }
  }

  /**
   * 🆕 Detectar si es una operación especial (desde TableManager)
   */
  isSpecialOperation() {
    // Acceder al controller para obtener la nomination actual
    if (window.samplingRosterController && window.samplingRosterController.selectedShipNomination) {
      const nomination = window.samplingRosterController.selectedShipNomination;
      return window.samplingRosterController.isAmpolKurnell(nomination) || 
             window.samplingRosterController.isBaseOils(nomination);
    }
    return false;
  }

  /**
   * 🆕 Trigger para recálculo de Line Sampling (placeholder por ahora)
   */
  /**
   * 🆕 Trigger para recálculo completo de Line Sampling en tiempo real
   */
  triggerLineSamplingRecalculation(rowId) {
    // Solo proceder si es primera línea
    if (rowId !== "line-sampler-row-0") {
      return;
    }

    console.log(`🔄 Full Line Sampling recalculation triggered for ${rowId}`);

    try {
      // Obtener DateTimePicker instances de primera línea
      const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (!row) return;

      const startContainer = row.querySelector('div[id^="lineStartDateTime_"]');
      const finishContainer = row.querySelector(
        'div[id^="lineFinishDateTime_"]'
      );

      if (!startContainer || !finishContainer) return;

      // Obtener fechas actuales de los DateTimePickers
      let startDateTime = null;
      let finishDateTime = null;

      if (window.lineTimeInstances) {
        const startInstance = window.lineTimeInstances[startContainer.id];
        const finishInstance = window.lineTimeInstances[finishContainer.id];

        if (startInstance) {
          startDateTime = startInstance.getDateTime();
        }
        if (finishInstance) {
          finishDateTime = finishInstance.getDateTime();
        }
      }

      // Recalcular TODO el roster si ambas fechas están disponibles
      if (startDateTime && finishDateTime) {
        this.recalculateAllLinesPreview(startDateTime, finishDateTime);
      }
    } catch (error) {
      console.error("Error in real-time full roster recalculation:", error);
    }
  }

  // ==================================================================================
  // 🆕 MÉTODO NUEVO: recalculateAllLinesPreview() - AGREGAR AL FINAL DE TABLEMANAGER.JS
  // ==================================================================================

  /**
   * 🆕 Recalcular todas las líneas en tiempo real (preview antes de guardar)
   */
  recalculateAllLinesPreview(newStartTime, newFinishTime) {
    try {
      console.log(`📊 Recalculating all lines preview...`);

      // Obtener todas las líneas actuales
      const allRows = document.querySelectorAll(
        'tr[data-row-id^="line-sampler-row-"]'
      );
      if (allRows.length === 0) return;

      // Obtener ETC del ship nomination (necesitamos acceso al controlador para esto)
      // Por ahora simularemos - en el siguiente paso conectaremos con el controlador
      const currentTurns = this.getCurrentLineTurns();
      if (!currentTurns || currentTurns.length === 0) return;

      // Crear array de turnos recalculados
      const recalculatedTurns = [];
      let currentEndTime = new Date(newFinishTime); // Empezar desde el fin de primera línea modificada

      // Primera línea (ya modificada)
      const firstLineHours = Math.round(
        (newFinishTime - newStartTime) / (1000 * 60 * 60)
      );
      recalculatedTurns.push({
        samplerName: currentTurns[0].samplerName,
        startTime: this.formatDateTime(newStartTime),
        finishTime: this.formatDateTime(newFinishTime),
        hours: firstLineHours,
        isModified: true, // Indicador de que esta línea fue modificada
      });

      // Simular ETC - en producción esto vendrá del controlador
      // Por ahora usar la hora final de la última línea actual + buffer
      const lastCurrentTurn = currentTurns[currentTurns.length - 1];
      const simulatedETC = this.parseDateTime(lastCurrentTurn.finishTime);
      if (!simulatedETC) return;

      // Recalcular resto de líneas
      for (let i = 1; i < currentTurns.length; i++) {
        const isLastTurn = i === currentTurns.length - 1;
        let turnStartTime = new Date(currentEndTime);
        let turnEndTime;
        let turnHours;

        if (isLastTurn) {
          // Último turno: termina en ETC simulado
          turnEndTime = new Date(simulatedETC);
          turnHours = Math.round(
            (turnEndTime - turnStartTime) / (1000 * 60 * 60)
          );

          // Validar que último turno tenga al menos 1 hora
          if (turnHours < 1) {
            console.warn("⚠️ Last turn would be too short, adjusting...");
            turnStartTime = new Date(turnEndTime);
            turnStartTime.setHours(turnStartTime.getHours() - 1);
            turnHours = 1;
          }
        } else {
          // Turnos intermedios: 12 horas estándar
          turnEndTime = new Date(turnStartTime);
          turnEndTime.setHours(turnEndTime.getHours() + 12);
          turnHours = 12;
        }

        recalculatedTurns.push({
          samplerName: currentTurns[i].samplerName,
          startTime: this.formatDateTime(turnStartTime),
          finishTime: this.formatDateTime(turnEndTime),
          hours: turnHours,
          isModified: true, // Indicador de que esta línea fue recalculada
        });

        currentEndTime = turnEndTime;
      }

      // Actualizar TODAS las líneas visualmente
      this.updateAllLinesVisually(recalculatedTurns);

      console.log(
        `✅ Preview recalculation completed for ${recalculatedTurns.length} lines`
      );
    } catch (error) {
      console.error("Error in preview recalculation:", error);
    }
  }

  // ==================================================================================
  // 🆕 MÉTODO AUXILIAR: updateAllLinesVisually() - AGREGAR AL FINAL DE TABLEMANAGER.JS
  // ==================================================================================

  /**
   * 🆕 Actualizar todas las líneas visualmente con highlighting
   */
  updateAllLinesVisually(recalculatedTurns) {
    try {
      recalculatedTurns.forEach((turn, index) => {
        const row = document.querySelector(
          `tr[data-row-id="line-sampler-row-${index}"]`
        );
        if (!row) return;

        // Actualizar celdas de tiempo y horas
        const startCell = row.querySelector("td:nth-child(2)");
        const finishCell = row.querySelector("td:nth-child(3)");
        const hoursCell = row.querySelector("td:nth-child(4)");

        if (startCell && finishCell && hoursCell) {
          // Solo actualizar si la celda NO está siendo editada (no tiene DateTimePickers)
          const hasDateTimePickers = startCell.querySelector(
            'div[id^="lineStartDateTime_"]'
          );

          if (!hasDateTimePickers) {
            // Actualizar contenido
            startCell.textContent = turn.startTime;
            finishCell.textContent = turn.finishTime;
          }

          // Siempre actualizar horas
          hoursCell.textContent = turn.hours;

          // Aplicar highlighting visual para indicar cambios
          if (turn.isModified) {
            const cellsToHighlight = hasDateTimePickers
              ? [hoursCell]
              : [startCell, finishCell, hoursCell];

            cellsToHighlight.forEach((cell) => {
              cell.style.backgroundColor = "rgba(31, 181, 212, 0.15)";
              cell.style.fontWeight = "bold";
              cell.style.color = "#1fb5d4";
              cell.style.transition = "all 0.3s ease";
              cell.style.border = "1px solid rgba(31, 181, 212, 0.3)";
            });

            // Agregar indicador de "preview"
            if (!hoursCell.querySelector(".preview-indicator")) {
              const indicator = document.createElement("span");
              indicator.className = "preview-indicator";
              indicator.style.cssText = `
              font-size: 0.65rem;
              color: #1fb5d4;
              font-weight: 600;
              margin-left: 0.3rem;
              opacity: 0.8;
            `;
              indicator.textContent = "(preview)";
              hoursCell.appendChild(indicator);
            }
          }
        }
      });

      console.log(
        `✅ Visual update completed for ${recalculatedTurns.length} lines`
      );
    } catch (error) {
      console.error("Error updating lines visually:", error);
    }
  }

  // ==================================================================================
  // 🆕 MÉTODO AUXILIAR: clearPreviewHighlighting() - AGREGAR AL FINAL DE TABLEMANAGER.JS
  // ==================================================================================

  /**
   * 🆕 Limpiar highlighting de preview al guardar o cancelar
   */
  clearPreviewHighlighting() {
    try {
      const allRows = document.querySelectorAll(
        'tr[data-row-id^="line-sampler-row-"]'
      );

      allRows.forEach((row) => {
        const cells = row.querySelectorAll(
          "td:nth-child(2), td:nth-child(3), td:nth-child(4)"
        );

        cells.forEach((cell) => {
          cell.style.backgroundColor = "transparent";
          cell.style.fontWeight = "normal";
          cell.style.color = "var(--text-primary)";
          cell.style.border = "none";

          // Remover indicadores de preview
          const previewIndicator = cell.querySelector(".preview-indicator");
          if (previewIndicator) {
            previewIndicator.remove();
          }
        });
      });

      console.log(`✅ Preview highlighting cleared`);
    } catch (error) {
      console.error("Error clearing preview highlighting:", error);
    }
  }

  /**
   * 🆕 Restaurar estado original de todas las líneas al cancelar
   */
  restoreOriginalLineState() {
    try {
      console.log(
        `🔄 Restoring original state of ALL lines (including styling)...`
      );

      // Obtener todas las filas de Line Sampling
      const allRows = document.querySelectorAll(
        'tr[data-row-id^="line-sampler-row-"]'
      );

      allRows.forEach((row, index) => {
        const rowId = row.getAttribute("data-row-id");
        const startCell = row.querySelector("td:nth-child(2)");
        const finishCell = row.querySelector("td:nth-child(3)");
        const hoursCell = row.querySelector("td:nth-child(4)");

        if (startCell && finishCell && hoursCell) {
          // 🆕 LIMPIAR ESTILOS DE TODAS LAS LÍNEAS (sin excepción)
          this.resetLineSamplingRowStyles(row);

          // Para líneas que NO son la primera, restaurar contenido desde backup
          if (rowId !== "line-sampler-row-0") {
            // Verificar si hay backups para restaurar contenido
            const backupStart = startCell.getAttribute("data-backup-value");
            const backupFinish = finishCell.getAttribute("data-backup-value");
            const backupHours = hoursCell.getAttribute("data-backup-value");

            if (backupStart && backupFinish && backupHours) {
              startCell.textContent = backupStart;
              finishCell.textContent = backupFinish;
              hoursCell.textContent = backupHours;

              console.log(`📦 Restored backup for line ${index}:`, {
                start: backupStart,
                finish: backupFinish,
                hours: backupHours,
              });
            }

            // Limpiar backups después de usar
            startCell.removeAttribute("data-backup-value");
            finishCell.removeAttribute("data-backup-value");
            hoursCell.removeAttribute("data-backup-value");
          }
          // Para primera línea (line-sampler-row-0), los valores ya se restauraron
          // en cancelLineSamplingDateTimeEdit(), solo limpiamos estilos
        }
      });

      console.log(
        `✅ Original state and styles restored for ALL ${allRows.length} lines`
      );
    } catch (error) {
      console.error("Error restoring original line state:", error);
    }
  }

  // ==================================================================================
  // 🔧 MÉTODO ACTUALIZADO: updateAllLinesVisually() - ACTUALIZAR EN TABLEMANAGER.JS
  // REEMPLAZAR el método existente updateAllLinesVisually() con esta versión mejorada
  // ==================================================================================

  /**
   * 🆕 Actualizar todas las líneas visualmente con highlighting - CON BACKUP
   */
  updateAllLinesVisually(recalculatedTurns) {
    try {
      recalculatedTurns.forEach((turn, index) => {
        const row = document.querySelector(
          `tr[data-row-id="line-sampler-row-${index}"]`
        );
        if (!row) return;

        // Actualizar celdas de tiempo y horas
        const startCell = row.querySelector("td:nth-child(2)");
        const finishCell = row.querySelector("td:nth-child(3)");
        const hoursCell = row.querySelector("td:nth-child(4)");

        if (startCell && finishCell && hoursCell) {
          // Solo actualizar si la celda NO está siendo editada (no tiene DateTimePickers)
          const hasDateTimePickers = startCell.querySelector(
            'div[id^="lineStartDateTime_"]'
          );

          if (!hasDateTimePickers) {
            // 🆕 GUARDAR VALORES ORIGINALES ANTES DE MODIFICAR (BACKUP)
            if (!startCell.getAttribute("data-backup-value")) {
              startCell.setAttribute(
                "data-backup-value",
                startCell.textContent
              );
              finishCell.setAttribute(
                "data-backup-value",
                finishCell.textContent
              );
              hoursCell.setAttribute(
                "data-backup-value",
                hoursCell.textContent
              );
            }

            // Actualizar contenido con valores recalculados
            startCell.textContent = turn.startTime;
            finishCell.textContent = turn.finishTime;
          } else {
            // Para primera línea siendo editada, solo backup de horas
            if (!hoursCell.getAttribute("data-backup-value")) {
              hoursCell.setAttribute(
                "data-backup-value",
                hoursCell.textContent
              );
            }
          }

          // Siempre actualizar horas
          hoursCell.textContent = turn.hours;

          // Aplicar highlighting visual para indicar cambios
          if (turn.isModified) {
            const cellsToHighlight = hasDateTimePickers
              ? [hoursCell]
              : [startCell, finishCell, hoursCell];

            cellsToHighlight.forEach((cell) => {
              cell.style.backgroundColor = "rgba(31, 181, 212, 0.15)";
              cell.style.fontWeight = "bold";
              cell.style.color = "#1fb5d4";
              cell.style.transition = "all 0.3s ease";
              cell.style.border = "1px solid rgba(31, 181, 212, 0.3)";
            });

            // Agregar indicador de "preview"
            if (!hoursCell.querySelector(".preview-indicator")) {
              const indicator = document.createElement("span");
              indicator.className = "preview-indicator";
              indicator.style.cssText = `
              font-size: 0.65rem;
              color: #1fb5d4;
              font-weight: 600;
              margin-left: 0.3rem;
              opacity: 0.8;
            `;
              indicator.textContent = "(preview)";
              hoursCell.appendChild(indicator);
            }
          }
        }
      });

      console.log(
        `✅ Visual update with backup completed for ${recalculatedTurns.length} lines`
      );
    } catch (error) {
      console.error("Error updating lines visually:", error);
    }
  }

  /**
   * 🆕 Resetear completamente los estilos de una fila de Office Sampling
   */
  resetOfficeSamplingRowStyles(row) {
    try {
      if (!row) return;

      // Obtener todas las celdas de la fila
      const allCells = row.querySelectorAll("td");

      allCells.forEach((cell) => {
        // Limpiar estilos inline completamente
        cell.style.backgroundColor = "";
        cell.style.fontWeight = "";
        cell.style.color = "";
        cell.style.border = "";
        cell.style.borderColor = "";
        cell.style.boxShadow = "";
        cell.style.transition = "";
        cell.style.transform = "";
        cell.style.opacity = "";

        // Remover clases que puedan estar aplicadas
        cell.classList.remove("preview-mode", "editing-mode", "highlight");

        // Limpiar atributos de backup residuales
        cell.removeAttribute("data-backup-value");
        cell.removeAttribute("data-original-value");

        // Remover indicadores de preview si existen
        const previewIndicators = cell.querySelectorAll(".preview-indicator");
        previewIndicators.forEach((indicator) => indicator.remove());
      });

      // Resetear la fila completa
      row.style.backgroundColor = "";
      row.style.border = "";
      row.style.boxShadow = "";
      row.style.transform = "";
      row.style.transition = "";

      // Asegurar que las celdas de texto tengan el color correcto
      const textCells = row.querySelectorAll(
        "td:nth-child(2), td:nth-child(3), td:nth-child(4)"
      );
      textCells.forEach((cell) => {
        cell.style.color = "var(--text-primary)";
        cell.style.fontWeight = "normal";
      });

      console.log(`🎨 Office Sampling row styles completely reset`);
    } catch (error) {
      console.error("Error resetting Office Sampling row styles:", error);
    }
  }
  /**
   * 🆕 Resetear estilos de Line Sampling
   */
  resetLineSamplingRowStyles(row) {
    try {
      if (!row) return;

      // Obtener todas las celdas de la fila
      const allCells = row.querySelectorAll("td");

      allCells.forEach((cell) => {
        // 🆕 LIMPIAR ESTILOS INLINE COMPLETAMENTE (MÁS EXHAUSTIVO)
        cell.style.backgroundColor = "";
        cell.style.background = "";
        cell.style.fontWeight = "";
        cell.style.color = "";
        cell.style.border = "";
        cell.style.borderColor = "";
        cell.style.borderTop = "";
        cell.style.borderBottom = "";
        cell.style.borderLeft = "";
        cell.style.borderRight = "";
        cell.style.boxShadow = "";
        cell.style.transition = "";
        cell.style.transform = "";
        cell.style.opacity = "";
        cell.style.filter = "";

        // 🆕 FORZAR RESET DE COLORES A VALORES POR DEFECTO
        cell.style.color = "var(--text-primary)";
        cell.style.backgroundColor = "transparent";
        cell.style.fontWeight = "normal";

        // Remover clases que puedan estar aplicadas
        cell.classList.remove(
          "preview-mode",
          "editing-mode",
          "highlight",
          "modified"
        );

        // 🆕 REMOVER INDICADORES DE PREVIEW DE FORMA MÁS AGRESIVA
        const previewIndicators = cell.querySelectorAll(".preview-indicator");
        previewIndicators.forEach((indicator) => {
          indicator.remove();
          console.log(`🗑️ Removed preview indicator from cell`);
        });

        // También buscar por texto "(preview)" en caso de que no tenga clase
        if (cell.textContent.includes("(preview)")) {
          cell.textContent = cell.textContent.replace(/\s*\(preview\)\s*/g, "");
          console.log(`🗑️ Removed preview text from cell content`);
        }
      });

      // 🆕 RESETEAR LA FILA COMPLETA TAMBIÉN
      row.style.backgroundColor = "";
      row.style.background = "";
      row.style.border = "";
      row.style.boxShadow = "";
      row.style.transform = "";
      row.style.transition = "";
      row.style.opacity = "";
      row.style.filter = "";

      // 🆕 FORZAR REDIBUJO DEL NAVEGADOR
      row.offsetHeight; // Trigger reflow

      console.log(`🎨 Line Sampling row styles completely reset (exhaustive)`);
    } catch (error) {
      console.error("Error resetting Line Sampling row styles:", error);
    }
  }

  // ==================================================================================
  // 🆕 MÉTODO ADICIONAL: clearAllLineSamplingHighlighting() - AGREGAR AL FINAL
  // ==================================================================================

  /**
   * 🆕 Limpiar highlighting de TODAS las líneas de Line Sampling (método auxiliar)
   */
  clearAllLineSamplingHighlighting() {
    try {
      console.log(`🧹 Clearing ALL Line Sampling highlighting...`);

      const allRows = document.querySelectorAll(
        'tr[data-row-id^="line-sampler-row-"]'
      );

      allRows.forEach((row, index) => {
        this.resetLineSamplingRowStyles(row);
        console.log(`✨ Cleared highlighting for line ${index}`);
      });

      console.log(
        `✅ All Line Sampling highlighting cleared (${allRows.length} rows)`
      );
    } catch (error) {
      console.error("Error clearing all Line Sampling highlighting:", error);
    }
  }

  /**
   * 🆕 FUNCIÓN DE RESPALDO: Restaurar completamente el estado original de Office Sampling
   * Se usa cuando algo falla en el proceso de cancelación
   */
  emergencyRestoreOfficeSampling(rowId, originalData) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row || !originalData) return false;

    try {
      console.log("🚨 Emergency restore Office Sampling for:", rowId, originalData);

      const samplerCell = row.querySelector("td:first-child");
      const startCell = row.querySelector("td:nth-child(2)");
      const finishCell = row.querySelector("td:nth-child(3)");
      const hoursCell = row.querySelector("td:nth-child(4)");

      // Restaurar sampler
      if (samplerCell) {
        const samplerName = originalData.samplerName || "No Sampler Assigned";
        samplerCell.innerHTML = `<span class="fw-medium">${samplerName}</span>`;
        samplerCell.removeAttribute("data-original-value");
      }

      // Restaurar fechas
      if (startCell) {
        const startTime = originalData.startTime || "No Start Time";
        startCell.innerHTML = startTime;
        startCell.removeAttribute("data-original-value");
      }

      if (finishCell) {
        const finishTime = originalData.finishTime || "No Finish Time";
        finishCell.innerHTML = finishTime;
        finishCell.removeAttribute("data-original-value");
      }

      // Restaurar horas
      if (hoursCell) {
        const hours = originalData.hours || "6";
        hoursCell.textContent = hours;
        hoursCell.removeAttribute("data-backup-value");
        hoursCell.removeAttribute("data-original-value");
        
        // Restaurar estilos
        hoursCell.style.fontWeight = "normal";
        hoursCell.style.color = "var(--text-primary)";
        hoursCell.style.backgroundColor = "transparent";
      }

      // Limpiar cualquier DateTimePicker que pueda haber quedado
      const startContainer = startCell?.querySelector('div[id^="officeStartDateTime_"]');
      const finishContainer = finishCell?.querySelector('div[id^="officeFinishDateTime_"]');

      if (startContainer && window.officeTimeInstances) {
        const startInstance = window.officeTimeInstances[startContainer.id];
        if (startInstance) {
          startInstance.destroy();
          delete window.officeTimeInstances[startContainer.id];
        }
      }

      if (finishContainer && window.officeTimeInstances) {
        const finishInstance = window.officeTimeInstances[finishContainer.id];
        if (finishInstance) {
          finishInstance.destroy();
          delete window.officeTimeInstances[finishContainer.id];
        }
      }

      // Restaurar estilos de la fila
      this.resetOfficeSamplingRowStyles(row);

      console.log("✅ Emergency restore completed successfully");
      return true;
    } catch (error) {
      console.error("❌ Error in emergency restore:", error);
      return false;
    }
  }

  /**
   * 🆕 Obtener datos originales de Office Sampling para respaldo
   */
  getOfficeSamplingOriginalData(rowId) {
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return null;

    try {
      const samplerCell = row.querySelector("td:first-child");
      const startCell = row.querySelector("td:nth-child(2)");
      const finishCell = row.querySelector("td:nth-child(3)");
      const hoursCell = row.querySelector("td:nth-child(4)");

      // Intentar obtener valores originales primero
      let samplerName = samplerCell?.getAttribute("data-original-value");
      let startTime = startCell?.getAttribute("data-original-value");
      let finishTime = finishCell?.getAttribute("data-original-value");
      let hours = hoursCell?.getAttribute("data-original-value");

      // Si no hay valores originales, usar valores actuales
      if (!samplerName) {
        samplerName = samplerCell?.textContent.trim() || "No Sampler Assigned";
      }
      if (!startTime) {
        startTime = startCell?.textContent.trim() || "No Start Time";
      }
      if (!finishTime) {
        finishTime = finishCell?.textContent.trim() || "No Finish Time";
      }
      if (!hours) {
        hours = hoursCell?.textContent.trim() || "6";
      }

      return {
        samplerName,
        startTime,
        finishTime,
        hours: parseFloat(hours) || 6
      };
    } catch (error) {
      console.error("Error getting original data:", error);
      return null;
    }
  }

  /**
   * 🔧 NUEVO: Trigger auto-save inmediato para Office Sampling
   * Se ejecuta automáticamente cuando cambian las fechas/horas
   */
  triggerOfficeSamplingAutoSave(rowId, dateTime) {
    try {
      console.log('🔧 Office Sampling auto-save triggered', {
        rowId: rowId,
        dateTime: dateTime,
        timestamp: new Date().toISOString()
      });

      if (window.samplingRosterController && 
          window.samplingRosterController.autoSaveService) {
        const controller = window.samplingRosterController;
        const officeData = this.getOfficeSamplingData();
        if (!officeData) return;

        controller.autoSaveService.trigger('officeSamplingUpdate', {
          officeSampling: {
            sampler: { id: controller.selectedShipNomination?.sampler?.id || null, name: officeData.samplerName },
            startTime: this.parseDateTime(officeData.startTime) || dateTime,
            finishTime: this.parseDateTime(officeData.finishTime) || dateTime,
            hours: officeData.hours || 6
          }
        }, { immediate: true });
        
        console.log('✅ Office Sampling auto-save sent to controller');
      } else {
        console.warn('⚠️ SamplingRosterController not available for auto-save');
      }

    } catch (error) {
      console.error('❌ Error triggering Office Sampling auto-save:', error);
    }
  }

  /**
   * 🔧 NUEVO: Trigger auto-save inmediato para Line Sampling
   * Se ejecuta automáticamente cuando cambian las fechas/horas de la primera línea
   */
  async triggerLineSamplingAutoSave(rowId, dateTime) {
    try {
      console.log('🔧 Line Sampling auto-save triggered', {
        rowId: rowId,
        dateTime: dateTime,
        timestamp: new Date().toISOString()
      });

      // Si es la primera línea, no persistir en onDateTimeChange (solo preview). Guardar en el botón Save.
      if (rowId === 'line-sampler-row-0') {
        console.log('ℹ️ Skipping autosave for first line on change (preview only)');
        return;
      }

      // Verificar si el controlador principal está disponible
      if (window.samplingRosterController && 
          window.samplingRosterController.autoSaveService) {
        const controller = window.samplingRosterController;
        const turnIndex = parseInt(rowId.replace('line-sampler-row-', ''));
        const currentTurn = this.getLineTurnByIndex(turnIndex);
        if (!currentTurn) return;

        // Otras líneas: actualizar solo la línea editada
        controller.autoSaveService.trigger('lineTurnUpdate', {
          rowId: rowId,
          turn: {
            sampler: { id: null, name: currentTurn.samplerName },
            startTime: controller.parseToDate(currentTurn.startTime) || dateTime,
            finishTime: controller.parseToDate(currentTurn.finishTime) || dateTime,
            hours: currentTurn.hours || 0,
            blockType: 'day',
            turnOrder: turnIndex
          }
        }, { immediate: true });
        
        console.log('✅ Line Sampling auto-save sent to controller');
      } else {
        console.warn('⚠️ SamplingRosterController not available for auto-save');
      }

    } catch (error) {
      console.error('❌ Error triggering Line Sampling auto-save:', error);
    }
  }
}

export default TableManager;
