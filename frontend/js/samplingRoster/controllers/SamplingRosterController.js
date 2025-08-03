/**
 * Sampling Roster Controller - Modular Version
 * Coordinador principal que usa todos los servicios
 */

import { SAMPLING_ROSTER_CONSTANTS } from '/frontend/js/samplingRoster/utils/Constants.js';
import DateUtils from '/frontend/js/samplingRoster/utils/DateUtils.js';
import ApiService from '/frontend/js/samplingRoster/services/ApiService.js';
import ValidationService from '/frontend/js/samplingRoster/services/ValidationService.js';
import AutoSaveService from '/frontend/js/samplingRoster/services/AutoSaveService.js';
import ScheduleCalculator from '/frontend/js/samplingRoster/services/ScheduleCalculator.js';
import UIManager from '/frontend/js/samplingRoster/ui/UIManager.js';
import TableManager from '/frontend/js/samplingRoster/ui/TableManager.js';

export class SamplingRosterController {
  constructor() {
    // Servicios
    this.apiService = ApiService;
    this.validationService = ValidationService;
    this.autoSaveService = new AutoSaveService();
    this.scheduleCalculator = ScheduleCalculator;
    
    // UI Managers
    this.uiManager = new UIManager();
    this.tableManager = new TableManager();
    
    // Estado
    this.shipNominationsData = [];
    this.selectedShipNomination = null;
    this.isInitialized = false;

    Logger.info("SamplingRosterController initialized (modular version)", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false,
    });
  }

  /**
   * Inicializar el sistema
   */
  async init() {
    try {
      Logger.info("Initializing Sampling Roster System", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: false,
      });

      // Cargar datos desde la API
      await this.loadShipNominations();

      // Crear componentes UI
      this.createUIComponents();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;

      Logger.success("Sampling Roster System initialized successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Failed to initialize Sampling Roster System", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Failed to initialize Sampling Roster. Please refresh the page.",
      });
    }
  }

  /**
   * Cargar ship nominations
   */
  async loadShipNominations() {
    const result = await this.apiService.loadShipNominations();
    
    if (result.success) {
      this.shipNominationsData = result.data;
      Logger.success("Ship nominations loaded", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: { count: this.shipNominationsData.length },
        showNotification: false,
      });
    } else {
      Logger.error("Error loading ship nominations", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: result.error,
        showNotification: true,
        notificationMessage: "Unable to load ship nominations.",
      });
      this.shipNominationsData = [];
    }
  }

  /**
   * Crear componentes de UI
   */
  createUIComponents() {
  // Flag para evitar callbacks durante limpieza
  this.isClearing = false;

  // Crear DateTimePickers CON PROTECCIÓN AVANZADA
  this.uiManager.createDateTimePickers((dateTime) => {
    // ✅ DOBLE PROTECCIÓN: No ejecutar durante limpieza Y validar ship nomination
    if (!this.isClearing && this.selectedShipNomination) {
      try {
        this.validateDateTimeSequence();
        this.calculateAndUpdateETC();
      } catch (error) {
        Logger.error("Error in DateTimePicker callback", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          error: error,
          showNotification: false,
        });
      }
    }
  });

  // Resto del método...
  this.uiManager.createShipNominationSelector(
    this.shipNominationsData,
    (selectedDisplayText, selectorItems) => {
      this.handleShipNominationSelection(selectedDisplayText, selectorItems);
    }
  );

  Logger.success("UI components created", {
    module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
    showNotification: false,
  });
}

  /**
   * Manejar selección de ship nomination
   */
  async handleShipNominationSelection(selectedDisplayText, selectorItems) {
  // ✅ FIX: Si no hay selección, solo limpiar los campos SIN llamar clearAll()
  if (!selectedDisplayText) {
    // Limpiar estado sin crear bucle infinito
    this.selectedShipNomination = null;
    this.autoSaveService.clearState();
    this.uiManager.updateSaveStatus(SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED);
    
    // Limpiar campos y tablas directamente (SIN clearAll)
    this.uiManager.clearVesselInfoFields();
    this.tableManager.clearOfficeSamplingTable();
    this.tableManager.clearLineSamplingTable();
    
    return; // ✅ SALIR sin llamar clearAll()
  }

  const selectedItem = selectorItems.find(item => item.displayText === selectedDisplayText);
  if (selectedItem) {
    this.selectedShipNomination = selectedItem.originalData;

    // Verificar si existe roster
    await this.loadOrCreateRoster(this.selectedShipNomination._id);

    // Poblar campos
    this.populateVesselInfo();

    Logger.success("Vessel information populated", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: true,
      notificationMessage: `Loaded vessel: ${this.selectedShipNomination.vesselName}`,
    });
  }
}

  /**
   * Cargar roster existente o preparar nuevo
   */
  async loadOrCreateRoster(nominationId) {
    const result = await this.apiService.checkExistingRoster(nominationId);
    
    if (result.success && result.exists) {
      // Cargar roster existente
      this.autoSaveService.setCurrentRosterId(result.data._id);
      await this.loadExistingRoster(result.data);
      
      Logger.success("Existing roster loaded", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Loaded existing sampling roster",
      });
    } else {
      // Preparar para nuevo roster
      this.autoSaveService.clearState();
      this.tableManager.clearLineSamplingTable();
      
      Logger.info("Ready for new roster", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Ready to create new sampling roster",
      });
    }
  }

  /**
   * Cargar datos de roster existente
   */
  async loadExistingRoster(rosterData) {
    // Cargar tiempos en DateTimePickers
    const dateTimeInstances = this.uiManager.getDateTimeInstances();
    
    if (rosterData.startDischarge) {
      dateTimeInstances.startDischarge.setDateTime(new Date(rosterData.startDischarge));
    }
    if (rosterData.etcTime) {
      dateTimeInstances.etcTime.setDateTime(new Date(rosterData.etcTime));
    }

    // Cargar discharge time hours
    if (rosterData.dischargeTimeHours) {
      this.uiManager.setFieldValue("dischargeTimeHours", rosterData.dischargeTimeHours.toString());
    }

    // Cargar tablas
    if (rosterData.officeSampling) {
      this.tableManager.loadOfficeSamplingFromRoster(rosterData.officeSampling);
    }
    if (rosterData.lineSampling && rosterData.lineSampling.length > 0) {
      this.tableManager.loadLineSamplingFromRoster(rosterData.lineSampling);
    }

    // Setup event listeners para las tablas
    this.setupTableEventListeners();
  }

  /**
   * Poblar información del vessel
   */
  populateVesselInfo() {
    if (!this.selectedShipNomination) return;

    const nomination = this.selectedShipNomination;

    // Campos básicos
    this.uiManager.setFieldValue("vesselName", nomination.vesselName);
    this.uiManager.setFieldValue("amspecRef", nomination.amspecRef);
    this.uiManager.setFieldValue("berthName", nomination.berth?.name || nomination.berth || "");
    this.uiManager.setFieldValue("pilotOnBoard", DateUtils.formatDateTime(nomination.pilotOnBoard));
    this.uiManager.setFieldValue("etbTime", DateUtils.formatDateTime(nomination.etb));
    this.uiManager.setFieldValue("cargoProducts", this.uiManager.formatProductTypes(nomination.productTypes));
    this.uiManager.setFieldValue("surveyorName", nomination.surveyor?.name || nomination.surveyor || "");
    this.uiManager.setFieldValue("preDischargeChemist", nomination.chemist?.name || nomination.chemist || "");
    this.uiManager.setFieldValue("postDischargeChemist", nomination.chemist?.name || nomination.chemist || "");

    // Configurar DateTimePickers
    this.setupInitialDateTimes(nomination);

    // Auto-poblar Office Sampling
    this.tableManager.autoPopulateOfficeSampling(nomination);
    this.setupTableEventListeners();
  }

  /**
   * Configurar fechas iniciales en DateTimePickers
   */
  setupInitialDateTimes(nomination) {
    const dateTimeInstances = this.uiManager.getDateTimeInstances();

    if (nomination.etb) {
      // Start Discharge = ETB + 3 horas
      const startDischargeTime = new Date(nomination.etb);
      startDischargeTime.setHours(startDischargeTime.getHours() + SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET);
      dateTimeInstances.startDischarge.setDateTime(startDischargeTime);
    }

    if (nomination.etc) {
      // ETC usar la fecha del ship nomination
      dateTimeInstances.etcTime.setDateTime(new Date(nomination.etc));
    }
  }

  /**
   * Limpiar todo
   */
  clearAll() {
  // ✅ ACTIVAR FLAG DE LIMPIEZA
  this.isClearing = true;

  const shipSelector = this.uiManager.getShipNominationSelector();
  if (shipSelector) {
    shipSelector.clearSelection();
  }

  this.uiManager.clearVesselInfoFields();
  this.tableManager.clearOfficeSamplingTable();
  this.tableManager.clearLineSamplingTable();
  
  this.selectedShipNomination = null;
  this.autoSaveService.clearState();
  this.uiManager.updateSaveStatus(SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED);

  // ✅ DESACTIVAR FLAG DE LIMPIEZA
  this.isClearing = false;
}

  /**
   * Setup event listeners principales
   */
  setupEventListeners() {
    // Botón Clear
    const clearBtn = document.getElementById("clearRosterBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearAll());
    }

    // Botón Auto Generate
    const autoGenerateBtn = document.getElementById("autoGenerateBtn");
    if (autoGenerateBtn) {
      autoGenerateBtn.addEventListener("click", () => this.handleAutoGenerate());
    }

    // Campo Discharge Time Hours
    const dischargeTimeField = document.getElementById("dischargeTimeHours");
    if (dischargeTimeField) {
      dischargeTimeField.addEventListener("input", () => {
        this.calculateAndUpdateETC();
        this.autoSaveService.triggerAutoSave("dischargeTimeChange", () => this.collectCurrentRosterData());
      });
    }
  }

  /**
   * Setup event listeners para tablas
   */
  setupTableEventListeners() {
    // Office Sampling
    this.tableManager.setupOfficeSamplingEventListeners((event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const rowId = button.dataset.rowId;

      if (action === "edit") {
        this.editOfficeSampler(rowId);
      } else if (action === "save") {
        this.saveSamplerEdit(rowId);
      }
    });

    // Line Sampling
    this.tableManager.setupLineSamplingEventListeners((event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const rowId = button.dataset.rowId;

      if (action === "edit" && rowId !== "line-sampler-row-0") {
        this.editLineSampler(rowId);
      } else if (action === "save") {
        this.saveLineSamplerEdit(rowId);
      }
    });
  }

  /**
   * Validar secuencia de fechas
   */
  validateDateTimeSequence() {
    const dateTimeInstances = this.uiManager.getDateTimeInstances();
    const startDischarge = dateTimeInstances.startDischarge?.getDateTime();
    const etcTime = dateTimeInstances.etcTime?.getDateTime();

    const validation = this.validationService.validateDateTimeSequence(startDischarge, etcTime);
    
    if (!validation.isValid) {
      Logger.warn(validation.message, {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: validation.message,
      });
    }

    return validation.isValid;
  }

  /**
   * Calcular y actualizar ETC automáticamente
   */
  calculateAndUpdateETC() {
    const dateTimeInstances = this.uiManager.getDateTimeInstances();
    const startDischarge = dateTimeInstances.startDischarge?.getDateTime();
    const dischargeHours = this.getDischargeTimeHours();

    const etcTime = this.scheduleCalculator.calculateETC(startDischarge, dischargeHours);
    
    if (etcTime) {
      dateTimeInstances.etcTime.setDateTime(etcTime);
      this.validateDateTimeSequence();
      this.autoSaveService.triggerAutoSave("timeCalculation", () => this.collectCurrentRosterData());
    }
  }

  /**
   * Obtener discharge time hours del formulario
   */
  getDischargeTimeHours() {
    const value = this.uiManager.getFieldValue("dischargeTimeHours");
    if (!value) return null;

    const hours = parseInt(value, 10);
    return isNaN(hours) || hours <= 0 ? null : hours;
  }

  /**
   * Manejar Auto Generate
   */
  async handleAutoGenerate() {
    // Validaciones
    const shipValidation = this.validationService.validateShipNominationSelected(this.selectedShipNomination);
    if (!shipValidation.isValid) {
      Logger.warn(shipValidation.message, {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: shipValidation.message,
      });
      return;
    }

    const officeValidation = this.validationService.validateOfficeSamplingExists();
    if (!officeValidation.isValid) {
      Logger.warn(officeValidation.message, {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: officeValidation.message,
      });
      return;
    }

    const dischargeHours = this.getDischargeTimeHours();
    const hoursValidation = this.validationService.validateDischargeTimeHours(dischargeHours);
    if (!hoursValidation.isValid) {
      Logger.warn(hoursValidation.message, {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: hoursValidation.message,
      });
      return;
    }

    try {
      await this.generateLineSamplingSchedule(dischargeHours);
      this.autoSaveService.triggerAutoSaveImmediate("autoGenerate", () => this.collectCurrentRosterData());

      Logger.success("Line Sampling Schedule generated successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: `Line Sampling Schedule generated for ${dischargeHours} hours`,
      });
    } catch (error) {
      Logger.error("Error generating Line Sampling Schedule", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Unable to generate schedule. Please try again.",
      });
    }
  }

  /**
   * Generar Line Sampling Schedule
   */
  async generateLineSamplingSchedule(totalDischargeHours) {
    const officeData = this.tableManager.getOfficeSamplingData();
    if (!officeData) {
      throw new Error("Office Sampling data not found");
    }

    const samplersResult = await this.apiService.loadSamplers();
    if (!samplersResult.success || samplersResult.data.length === 0) {
      throw new Error("No samplers available");
    }

    const lineTurns = await this.scheduleCalculator.calculateLineSamplingTurns(
  officeData,
  totalDischargeHours,
  samplersResult.data
);

    this.tableManager.populateLineSamplingTable(lineTurns);
    this.setupTableEventListeners();
  }

  /**
   * Recopilar datos actuales del roster
   */
  collectCurrentRosterData() {
    const officeData = this.tableManager.getOfficeSamplingData();
    const lineData = this.tableManager.getCurrentLineTurns();
    const dischargeHours = this.getDischargeTimeHours();
    const dateTimeInstances = this.uiManager.getDateTimeInstances();
    const startDischarge = dateTimeInstances.startDischarge?.getDateTime();
    const etcTime = dateTimeInstances.etcTime?.getDateTime();

    return {
      shipNomination: String(this.selectedShipNomination._id),
      vesselName: this.selectedShipNomination.vesselName,
      amspecRef: this.selectedShipNomination.amspecRef,
      startDischarge: startDischarge,
      etcTime: etcTime,
      dischargeTimeHours: dischargeHours || 0,
      totalTurns: lineData.length,
      totalSamplers: new Set(lineData.map(t => t.samplerName)).size,

      officeSampling: officeData ? {
        sampler: {
          id: this.selectedShipNomination.sampler?.id || this.selectedShipNomination.sampler,
          name: officeData.samplerName,
        },
        startTime: DateUtils.parseDateTime(officeData.startTime),
        finishTime: DateUtils.parseDateTime(officeData.finishTime),
        hours: parseInt(officeData.hours) || 6,
      } : null,

      lineSampling: lineData.map((turn, index) => ({
        sampler: {
          id: this.selectedShipNomination.sampler?.id || this.selectedShipNomination.sampler,
          name: turn.samplerName,
        },
        startTime: DateUtils.parseDateTime(turn.startTime),
        finishTime: DateUtils.parseDateTime(turn.finishTime),
        hours: turn.hours,
        blockType: this.scheduleCalculator.determineBlockType(turn.startTime),
        turnOrder: index,
      })),
    };
  }

  // ==================================================================================
  // 🔥 FUNCIONALIDAD DE EDICIÓN RESTAURADA DESDE BACKUP
  // ==================================================================================

  /**
   * 🆕 Modo edición para Office Sampler - RESTAURADO
   */
  async editOfficeSampler(rowId) {
    Logger.info("Edit office sampler requested", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { rowId: rowId },
      showNotification: false,
    });

    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const samplerCell = row.querySelector("td:first-child");
    const actionCell = row.querySelector("td:last-child");
    const editButton = actionCell.querySelector('button[data-action="edit"]');

    if (!samplerCell || !editButton) return;

    try {
      // Obtener lista de samplers
      const samplersData = await this.getSamplersData();

      if (!samplersData || samplersData.length === 0) {
        Logger.warn("No samplers available", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage: "No samplers available for selection",
        });
        return;
      }

      // Guardar valor actual
      const currentSampler = samplerCell.textContent.trim();
      samplerCell.setAttribute("data-original-value", currentSampler);

      // Crear contenedor y agregarlo al DOM PRIMERO
      const dropdown = this.createSamplerDropdown(samplersData, currentSampler);

      // Reemplazar contenido de la celda con el contenedor
      samplerCell.innerHTML = "";
      samplerCell.appendChild(dropdown);

      // AHORA inicializar SingleSelect (después de que esté en DOM)
      await this.initializeSamplerSelector(dropdown, samplersData, currentSampler);

      // Transformar botón EDIT → SAVE
      editButton.innerHTML = '<i class="fas fa-check"></i>';
      editButton.setAttribute("data-action", "save");
      editButton.setAttribute("title", "Save Changes");
      editButton.className = "btn btn-primary-premium btn-edit-item";
      editButton.style.cssText = "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      Logger.success("Edit mode activated", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          rowId: rowId,
          currentSampler: currentSampler,
          availableSamplers: samplersData.length,
        },
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error activating edit mode", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Unable to edit sampler. Please try again.",
      });
    }
  }

  /**
   * 🆕 Guardar edición de Office Sampler - RESTAURADO
   */
  saveSamplerEdit(rowId) {
    Logger.info("Save sampler edit requested", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { rowId: rowId },
      showNotification: false,
    });

    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const samplerCell = row.querySelector("td:first-child");
    const actionCell = row.querySelector("td:last-child");
    const saveButton = actionCell.querySelector('button[data-action="save"]');
    const dropdownContainer = samplerCell.querySelector('div[id^="samplerDropdown_"]');

    if (!samplerCell || !saveButton || !dropdownContainer) return;

    try {
      // Obtener SingleSelect instance
      const samplerSelector = dropdownContainer.samplerSelector;
      if (!samplerSelector) {
        throw new Error("SingleSelect instance not found");
      }

      // Obtener nuevo valor seleccionado
      const newSamplerName = samplerSelector.getSelectedItem() || "No Sampler Assigned";
      const originalValue = samplerCell.getAttribute("data-original-value");

      // Limpiar la instancia SingleSelect
      samplerSelector.destroy();

      // Restaurar contenido de la celda
      samplerCell.innerHTML = `<span class="fw-medium">${newSamplerName}</span>`;
      samplerCell.removeAttribute("data-original-value");

      // Restaurar botón SAVE → EDIT
      saveButton.innerHTML = '<i class="fas fa-edit"></i>';
      saveButton.setAttribute("data-action", "edit");
      saveButton.setAttribute("title", "Edit Sampler");
      saveButton.className = "btn btn-secondary-premium btn-edit-item";
      saveButton.style.cssText = "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      // Log del cambio
      if (newSamplerName !== originalValue) {
        Logger.success("Sampler updated successfully", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            from: originalValue,
            to: newSamplerName,
          },
          showNotification: true,
          notificationMessage: `Sampler updated to: ${newSamplerName}`,
        });

        this.autoSaveService.triggerAutoSaveImmediate("samplerEdit", () => this.collectCurrentRosterData());

        // ✅ Sincronizar también primera fila de Line Sampling (row 0)
        const firstLineRow = document.querySelector('tr[data-row-id="line-sampler-row-0"]');
        if (firstLineRow) {
          const samplerCell = firstLineRow.querySelector("td:first-child");

          // Solo actualizar si el valor actual es igual al anterior de Office Sampling
          if (samplerCell && samplerCell.textContent.trim() === originalValue) {
            samplerCell.innerHTML = `<span class="fw-medium">${newSamplerName}</span>`;

            Logger.info("Line Sampling row 0 updated to match Office Sampling", {
              module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
              data: {
                from: originalValue,
                to: newSamplerName,
              },
              showNotification: false,
            });
          }
        }
      } else {
        Logger.info("No changes made to sampler", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { rowId: rowId, sampler: newSamplerName },
          showNotification: false,
        });
      }
    } catch (error) {
      Logger.error("Error saving sampler edit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Unable to save changes. Please try again.",
      });
    }
  }

  /**
   * 🆕 Modo edición para Line Sampler - RESTAURADO
   */
  async editLineSampler(rowId) {
    Logger.info("Edit line sampler requested", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { rowId: rowId },
      showNotification: false,
    });

    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const samplerCell = row.querySelector("td:first-child");
    const actionCell = row.querySelector("td:last-child");
    const editButton = actionCell.querySelector('button[data-action="edit"]');

    if (!samplerCell || !editButton) return;

    try {
      // Obtener lista de samplers
      const samplersData = await this.getSamplersData();

      if (!samplersData || samplersData.length === 0) {
        Logger.warn("No samplers available", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage: "No samplers available for selection",
        });
        return;
      }

      // Guardar valor actual
      const currentSampler = samplerCell.textContent.trim();
      samplerCell.setAttribute("data-original-value", currentSampler);

      // Crear contenedor y agregarlo al DOM PRIMERO
      const dropdown = this.createLineSamplerDropdown(samplersData, currentSampler);

      // Reemplazar contenido de la celda con el contenedor
      samplerCell.innerHTML = "";
      samplerCell.appendChild(dropdown);

      // AHORA inicializar SingleSelect (después de que esté en DOM)
      await this.initializeLineSamplerSelector(dropdown, samplersData, currentSampler);

      // Transformar botón EDIT → SAVE
      editButton.innerHTML = '<i class="fas fa-check"></i>';
      editButton.setAttribute("data-action", "save");
      editButton.setAttribute("title", "Save Changes");
      editButton.className = "btn btn-primary-premium btn-edit-item";
      editButton.style.cssText = "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      Logger.success("Line sampler edit mode activated", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          rowId: rowId,
          currentSampler: currentSampler,
          availableSamplers: samplersData.length,
        },
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error activating line sampler edit mode", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Unable to edit sampler. Please try again.",
      });
    }
  }

  /**
   * 🆕 Guardar edición de Line Sampler con validación de 12h máximo - RESTAURADO
   */
  saveLineSamplerEdit(rowId) {
    Logger.info("Save line sampler edit requested", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { rowId: rowId },
      showNotification: false,
    });

    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const samplerCell = row.querySelector("td:first-child");
    const actionCell = row.querySelector("td:last-child");
    const saveButton = actionCell.querySelector('button[data-action="save"]');
    const dropdownContainer = samplerCell.querySelector('div[id^="lineSamplerDropdown_"]');

    if (!samplerCell || !saveButton || !dropdownContainer) return;

    try {
      // Obtener SingleSelect instance
      const samplerSelector = dropdownContainer.samplerSelector;
      if (!samplerSelector) {
        throw new Error("SingleSelect instance not found");
      }

      // Obtener nuevo valor seleccionado
      const newSamplerName = samplerSelector.getSelectedItem() || "No Sampler Assigned";
      const originalValue = samplerCell.getAttribute("data-original-value");

      // Validar que el sampler no exceda 12 horas totales
      const validationResult = this.validateSamplerHours(newSamplerName, rowId);
      if (!validationResult.isValid) {
        Logger.warn("Sampler hours validation failed", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            sampler: newSamplerName,
            totalHours: validationResult.totalHours,
            maxHours: 12,
          },
          showNotification: true,
          notificationMessage: `${newSamplerName} would exceed 12 hours limit (${validationResult.totalHours}h total)`,
        });
        return; // No guardar si excede límite
      }

      // Limpiar la instancia SingleSelect
      samplerSelector.destroy();

      // Restaurar contenido de la celda
      samplerCell.innerHTML = `<span class="fw-medium">${newSamplerName}</span>`;
      samplerCell.removeAttribute("data-original-value");

      // Restaurar botón SAVE → EDIT
      saveButton.innerHTML = '<i class="fas fa-edit"></i>';
      saveButton.setAttribute("data-action", "edit");
      saveButton.setAttribute("title", "Edit Sampler");
      saveButton.className = "btn btn-secondary-premium btn-edit-item";
      saveButton.style.cssText = "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      // Log del cambio
      if (newSamplerName !== originalValue) {
        Logger.success("Line sampler updated successfully", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            from: originalValue,
            to: newSamplerName,
            totalHours: validationResult.totalHours,
          },
          showNotification: true,
          notificationMessage: `Line sampler updated to: ${newSamplerName}`,
        });
        this.autoSaveService.triggerAutoSaveImmediate("samplerEdit", () => this.collectCurrentRosterData());
      } else {
        Logger.info("No changes made to line sampler", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { rowId: rowId, sampler: newSamplerName },
          showNotification: false,
        });
      }
    } catch (error) {
      Logger.error("Error saving line sampler edit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Unable to save changes. Please try again.",
      });
    }
  }

  // ==================================================================================
  // 🔧 MÉTODOS AUXILIARES PARA EDICIÓN - RESTAURADOS DESDE BACKUP
  // ==================================================================================

  /**
   * 🆕 Obtener datos de samplers desde API - RESTAURADO
   */
  async getSamplersData() {
    try {
      Logger.debug("Loading samplers data", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: false,
      });

      const response = await fetch("/api/samplers");
      const result = await response.json();

      if (result.success && result.data) {
        Logger.debug("Samplers data loaded", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { count: result.data.length },
          showNotification: false,
        });

        return result.data;
      } else {
        throw new Error(result.message || "Failed to load samplers");
      }
    } catch (error) {
      Logger.error("Error loading samplers", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return [];
    }
  }

  /**
   * 🆕 Crear dropdown simple para selección de sampler - RESTAURADO
   */
  createSamplerDropdown(samplersData, currentSampler) {
    // Crear contenedor temporal único para el SingleSelect
    const containerId = `samplerDropdown_${Date.now()}`;
    const container = document.createElement("div");
    container.id = containerId;
    container.style.minWidth = "200px";

    Logger.debug("Sampler dropdown container created", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: {
        containerId: containerId,
        optionsCount: samplersData.length,
        currentSampler: currentSampler,
      },
      showNotification: false,
    });

    return container;
  }

  /**
   * 🆕 Inicializar SingleSelect después de que el contenedor esté en DOM - RESTAURADO
   */
  async initializeSamplerSelector(container, samplersData, currentSampler) {
    // Esperar un tick para asegurar que el DOM esté actualizado
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Preparar items para SingleSelect
    const dropdownItems = samplersData.map((sampler) => sampler.name);

    // Crear instancia SingleSelect elegante
    const samplerSelector = new SingleSelect(container.id, {
      items: dropdownItems,
      icon: "fas fa-user",
      label: "", // Sin label
      placeholder: "Select sampler...",
      searchPlaceholder: "Search samplers...",
      modalTitle: "Select Sampler",
      showItemsLabel: false, // ✅ Ocultar header "Items" completamente
      showManageOption: false, // ✅ CRÍTICO: Sin gestión - elimina botón ITEMS
      showSearch: false, // ✅ Sin búsqueda como solicitado
      onSelectionChange: null, // Sin callback automático
    });

    // Establecer valor inicial
    if (currentSampler && currentSampler !== "No Sampler Assigned") {
      // Esperar otro tick antes de setear el valor
      setTimeout(() => {
        samplerSelector.setSelectedItem(currentSampler);
      }, 50);
    }

    // ✅ OCULTAR LABEL "Items" completamente
    setTimeout(() => {
      const label = container.querySelector(".singleselect-label");
      if (label) {
        label.style.display = "none";

        // También ocultar el ícono que contiene el texto "Items" en ::before
        const icon = label.querySelector("i.fas.fa-user");
        if (icon) {
          icon.style.display = "none";
        }

        Logger.debug("SingleSelect label and icon hidden", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: false,
        });
      }
    }, 100);

    // Guardar referencia para acceso posterior
    container.samplerSelector = samplerSelector;

    Logger.debug("SingleSelect sampler selector initialized", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: {
        containerId: container.id,
        optionsCount: dropdownItems.length,
        currentSampler: currentSampler,
      },
      showNotification: false,
    });

    return samplerSelector;
  }

  /**
   * 🆕 Crear contenedor para dropdown elegante Line Sampler - RESTAURADO
   */
  createLineSamplerDropdown(samplersData, currentSampler) {
    // Crear contenedor temporal único para el SingleSelect
    const containerId = `lineSamplerDropdown_${Date.now()}`;
    const container = document.createElement("div");
    container.id = containerId;
    container.style.minWidth = "200px";

    Logger.debug("Line sampler dropdown container created", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: {
        containerId: containerId,
        optionsCount: samplersData.length,
        currentSampler: currentSampler,
      },
      showNotification: false,
    });

    return container;
  }

  /**
   * 🆕 Inicializar SingleSelect para Line Sampler después de que el contenedor esté en DOM - RESTAURADO
   */
  async initializeLineSamplerSelector(container, samplersData, currentSampler) {
    // Esperar un tick para asegurar que el DOM esté actualizado
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Preparar items para SingleSelect
    const dropdownItems = samplersData.map((sampler) => sampler.name);

    // Crear instancia SingleSelect elegante
    const samplerSelector = new SingleSelect(container.id, {
      items: dropdownItems,
      icon: "fas fa-user",
      label: "", // Sin label
      placeholder: "Select sampler...",
      searchPlaceholder: "Search samplers...",
      modalTitle: "Select Line Sampler",
      showManageOption: false, // ✅ CRÍTICO: Sin gestión
      showSearch: false, // ✅ Sin búsqueda como solicitado
      onSelectionChange: null, // Sin callback automático
    });

    // Establecer valor inicial
    if (currentSampler && currentSampler !== "No Sampler Assigned") {
      // Esperar otro tick antes de setear el valor
      setTimeout(() => {
        samplerSelector.setSelectedItem(currentSampler);
      }, 50);
    }

    // ✅ OCULTAR LABEL "Items" completamente
    setTimeout(() => {
      const label = container.querySelector(".singleselect-label");
      if (label) {
        label.style.display = "none";

        // También ocultar el ícono que contiene el texto "Items" en ::before
        const icon = label.querySelector("i.fas.fa-user");
        if (icon) {
          icon.style.display = "none";
        }

        Logger.debug("Line sampler SingleSelect label and icon hidden", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: false,
        });
      }
    }, 100);

    // Guardar referencia para acceso posterior
    container.samplerSelector = samplerSelector;

    Logger.debug("SingleSelect line sampler selector initialized", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: {
        containerId: container.id,
        optionsCount: dropdownItems.length,
        currentSampler: currentSampler,
      },
      showNotification: false,
    });

    return samplerSelector;
  }

  /**
   * 🆕 Validar que un sampler no exceda 12 horas totales - RESTAURADO
   */
  validateSamplerHours(samplerName, excludeRowId = null) {
    let totalHours = 0;

    // Verificar horas en Office Sampling
    const officeRow = document.querySelector('tr[data-row-id="office-sampler-row"]');
    if (officeRow) {
      const officeSamplerCell = officeRow.querySelector("td:first-child");
      const officeHoursCell = officeRow.querySelector("td:nth-child(4)");

      if (officeSamplerCell && officeHoursCell) {
        const officeSampler = officeSamplerCell.textContent.trim();
        const officeHours = parseInt(officeHoursCell.textContent.trim()) || 0;

        if (officeSampler === samplerName) {
          totalHours += officeHours;
        }
      }
    }

    // Verificar horas en Line Sampling (excluyendo la fila que se está editando)
    const lineRows = document.querySelectorAll('tr[data-row-id^="line-sampler-row-"]');
    lineRows.forEach((row) => {
      const currentRowId = row.getAttribute("data-row-id");

      // Excluir la fila que se está editando
      if (currentRowId === excludeRowId) return;

      const lineSamplerCell = row.querySelector("td:first-child");
      const lineHoursCell = row.querySelector("td:nth-child(4)");

      if (lineSamplerCell && lineHoursCell) {
        const lineSampler = lineSamplerCell.textContent.trim();
        const lineHours = parseInt(lineHoursCell.textContent.trim()) || 0;

        if (lineSampler === samplerName) {
          totalHours += lineHours;
        }
      }
    });

    Logger.debug("Sampler hours validation", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: {
        samplerName: samplerName,
        totalHours: totalHours,
        isValid: totalHours <= 12,
        excludeRowId: excludeRowId,
      },
      showNotification: false,
    });

    return {
      isValid: totalHours <= 12,
      totalHours: totalHours,
    };
  }

  // ==================================================================================
  // 📋 MÉTODOS PÚBLICOS ORIGINALES - SIN CAMBIOS
  // ==================================================================================

  /**
   * Métodos públicos
   */
  getSelectedShipNomination() {
    return this.selectedShipNomination;
  }

  isReady() {
    return this.isInitialized && !!this.uiManager.getShipNominationSelector();
  }

  async refreshShipNominations() {
    await this.loadShipNominations();
    this.createUIComponents();
  }

  destroy() {
    const shipSelector = this.uiManager.getShipNominationSelector();
    if (shipSelector) {
      shipSelector.destroy();
    }
    
    this.autoSaveService.clearState();
    this.shipNominationsData = [];
    this.selectedShipNomination = null;
    this.isInitialized = false;
  }
}

export default SamplingRosterController;