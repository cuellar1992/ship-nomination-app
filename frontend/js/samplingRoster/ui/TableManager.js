/**
 * Table Manager for Sampling Roster System
 */

import DateUtils from '../utils/DateUtils.js';

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
   */
  getOfficeSamplingData() {
    const officeRow = document.querySelector('tr[data-row-id="office-sampler-row"]');
    if (!officeRow) return null;

    const cells = officeRow.querySelectorAll("td");
    if (cells.length < 4) return null;

    return {
      samplerName: cells[0].textContent.trim(),
      startTime: cells[1].textContent.trim(),
      finishTime: cells[2].textContent.trim(),
      hours: parseInt(cells[3].textContent.trim()) || 6,
    };
  }

  /**
   * Obtener turnos actuales de Line Sampling
   */
  getCurrentLineTurns() {
    const turns = [];
    const lineRows = document.querySelectorAll('tr[data-row-id^="line-sampler-row-"]');

    lineRows.forEach((row, index) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 4) {
        turns.push({
          samplerName: cells[0].textContent.trim(),
          startTime: cells[1].textContent.trim(),
          finishTime: cells[2].textContent.trim(),
          hours: parseInt(cells[3].textContent.trim()) || 0,
          rowIndex: index,
        });
      }
    });

    return turns;
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

    this.populateOfficeSamplingTable(samplerName, startOffice, finishSampling, 6);
  }

  /**
   * Cargar Office Sampling desde roster existente
   */
  loadOfficeSamplingFromRoster(officeSamplingData) {
    const samplerName = officeSamplingData.sampler?.name || "No Sampler Assigned";
    const startTime = DateUtils.formatDateTime(officeSamplingData.startTime);
    const finishTime = DateUtils.formatDateTime(officeSamplingData.finishTime);
    const hours = officeSamplingData.hours || 6;

    this.populateOfficeSamplingTable(samplerName, startTime, finishTime, hours);
  }

  /**
   * Cargar Line Sampling desde roster existente
   */
  loadLineSamplingFromRoster(lineSamplingData) {
    const turns = lineSamplingData.map(turn => ({
      samplerName: turn.sampler?.name || "No Sampler Assigned",
      startTime: DateUtils.formatDateTime(turn.startTime),
      finishTime: DateUtils.formatDateTime(turn.finishTime),
      hours: turn.hours || 0
    }));

    this.populateLineSamplingTable(turns);
  }
}

export default TableManager;