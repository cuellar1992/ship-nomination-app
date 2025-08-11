/**
 * Sampling Roster Controller - Modular Version
 * Coordinador principal que usa todos los servicios
 */

import { SAMPLING_ROSTER_CONSTANTS } from "../utils/Constants.js";
import DateUtils from "../utils/DateUtils.js";
import ApiService from "../services/ApiService.js";
import ValidationService from "../services/ValidationService.js";
import AutoSaveService from "../services/AutoSaveService.js";
import ScheduleCalculator from "../services/ScheduleCalculator.js";
import UIManager from "../ui/UIManager.js";
import TableManager from "../ui/TableManager.js";

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
    this.baseURL = this.getBaseURL();

    Logger.info("SamplingRosterController initialized (modular version)", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false,
    });
  }

  /**
   * Detectar automáticamente la URL base según el entorno
   */
  getBaseURL() {
    const { hostname, protocol } = window.location;

    // Si estamos en desarrollo local
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }

    // Si estamos en producción
    return "";
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
        notificationMessage:
          "Failed to initialize Sampling Roster. Please refresh the page.",
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
      this.uiManager.updateSaveStatus(
        SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED
      );

      // Limpiar campos y tablas directamente (SIN clearAll)
      this.uiManager.clearVesselInfoFields();
      this.tableManager.clearOfficeSamplingTable();
      this.tableManager.clearLineSamplingTable();

      return; // ✅ SALIR sin llamar clearAll()
    }

    const selectedItem = selectorItems.find(
      (item) => item.displayText === selectedDisplayText
    );
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

    // 1️⃣ CARGAR START DISCHARGE
    if (rosterData.startDischarge) {
      dateTimeInstances.startDischarge.setDateTime(
        new Date(rosterData.startDischarge)
      );
    }

    // 2️⃣ LÓGICA MEJORADA PARA ETC - PRIORIZAR ETC PERSONALIZADO
    if (rosterData.etcTime) {
      // Usar ETC personalizado del roster (prioritario)
      dateTimeInstances.etcTime.setDateTime(new Date(rosterData.etcTime));

      // 🆕 LOG DETALLADO SOBRE ETC
      if (rosterData.hasCustomETC) {
        Logger.success("Loaded custom ETC from saved roster", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            customETC: rosterData.etcTime,
            originalETC:
              rosterData.originalShipNominationETC ||
              this.selectedShipNomination?.etc,
            modifiedAt: rosterData.etcModificationTimestamp,
            differenceFromOriginal: this.calculateETCDifference(
              rosterData.etcTime,
              rosterData.originalShipNominationETC ||
                this.selectedShipNomination?.etc
            ),
          },
          showNotification: true,
          notificationMessage: "Loaded roster with custom ETC timing",
        });
      } else {
        Logger.info("Loaded standard ETC from roster", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { etcTime: rosterData.etcTime },
          showNotification: false,
        });
      }
    } else if (this.selectedShipNomination?.etc) {
      // Fallback: usar ETC del ship nomination si no hay ETC guardado en roster
      dateTimeInstances.etcTime.setDateTime(
        new Date(this.selectedShipNomination.etc)
      );

      Logger.info("Using fallback ETC from ship nomination", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          fallbackETC: this.selectedShipNomination.etc,
          reason: "No ETC found in saved roster",
        },
        showNotification: false,
      });
    } else {
      // 🚨 Caso edge: ni roster ni ship nomination tienen ETC
      Logger.warn("No ETC found in roster or ship nomination", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage:
          "Warning: No ETC time available. Please set ETC manually.",
      });
    }

    // 3️⃣ CARGAR DISCHARGE TIME HOURS
    if (rosterData.dischargeTimeHours) {
      this.uiManager.setFieldValue(
        "dischargeTimeHours",
        rosterData.dischargeTimeHours.toString()
      );
    }

    // 4️⃣ CARGAR TABLAS
    if (rosterData.officeSampling) {
      this.tableManager.loadOfficeSamplingFromRoster(rosterData.officeSampling);
    }
    if (rosterData.lineSampling && rosterData.lineSampling.length > 0) {
      this.tableManager.loadLineSamplingFromRoster(rosterData.lineSampling);
    }

    // 5️⃣ SETUP EVENT LISTENERS PARA LAS TABLAS
    this.setupTableEventListeners();

    // 6️⃣ LOG RESUMEN DE CARGA
    Logger.success("Existing roster loaded successfully", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: {
        rosterId: this.autoSaveService.getCurrentRosterId(),
        vesselName: rosterData.vesselName,
        hasOfficeSampling: !!rosterData.officeSampling,
        lineSamplingTurns: rosterData.lineSampling?.length || 0,
        hasCustomETC: rosterData.hasCustomETC || false,
        dischargeHours: rosterData.dischargeTimeHours || 0,
      },
      showNotification: false,
    });
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
    this.uiManager.setFieldValue(
      "berthName",
      nomination.berth?.name || nomination.berth || ""
    );
    this.uiManager.setFieldValue(
      "pilotOnBoard",
      DateUtils.formatDateTime(nomination.pilotOnBoard)
    );
    this.uiManager.setFieldValue(
      "etbTime",
      DateUtils.formatDateTime(nomination.etb)
    );
    this.uiManager.setFieldValue(
      "cargoProducts",
      this.uiManager.formatProductTypes(nomination.productTypes)
    );
    this.uiManager.setFieldValue(
      "surveyorName",
      nomination.surveyor?.name || nomination.surveyor || ""
    );
    this.uiManager.setFieldValue(
      "preDischargeChemist",
      nomination.chemist?.name || nomination.chemist || ""
    );
    this.uiManager.setFieldValue(
      "postDischargeChemist",
      nomination.chemist?.name || nomination.chemist || ""
    );

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
      startDischargeTime.setHours(
        startDischargeTime.getHours() +
          SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET
      );
      dateTimeInstances.startDischarge.setDateTime(startDischargeTime);
    }

    // 🆕 LÓGICA MEJORADA: Solo establecer ETC si NO hay roster existente
    const currentRosterId = this.autoSaveService.getCurrentRosterId();

    if (!currentRosterId && nomination.etc) {
      // Solo para rosteres nuevos: usar ETC del ship nomination
      dateTimeInstances.etcTime.setDateTime(new Date(nomination.etc));

      Logger.info("Set initial ETC from ship nomination", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: { initialETC: nomination.etc },
        showNotification: false,
      });
    }
    // Si hay roster existente, loadExistingRoster() se encargará del ETC
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
    this.uiManager.updateSaveStatus(
      SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED
    );

    // ✅ DESACTIVAR FLAG DE LIMPIEZA
    this.isClearing = false;
  }

  /**
   * Setup event listeners principales
   */
  setupEventListeners() {
    // 1️⃣ BOTÓN CLEAR
    const clearBtn = document.getElementById("clearRosterBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearAll());
    }

    // 2️⃣ BOTÓN AUTO GENERATE
    const autoGenerateBtn = document.getElementById("autoGenerateBtn");
    if (autoGenerateBtn) {
      autoGenerateBtn.addEventListener("click", () =>
        this.handleAutoGenerate()
      );
    }

    // 3️⃣ CAMPO DISCHARGE TIME HOURS (EXISTENTE)
    const dischargeTimeField = document.getElementById("dischargeTimeHours");
    if (dischargeTimeField) {
      dischargeTimeField.addEventListener("input", () => {
        this.calculateAndUpdateETC();
        this.autoSaveService.triggerAutoSave("dischargeTimeChange", () =>
          this.collectCurrentRosterData()
        );
      });
    }

    // 4️⃣ 🆕 SETUP DATETIMEPICKERS CON AUTO-SAVE ETC
    this.setupDateTimePickersWithAutoSave();

    // 5️⃣ 🆕 BOTÓN EXPORT (si existe)
    const exportBtn = document.getElementById("exportRosterBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.handleExportRoster());
    }

    // 6️⃣ 🆕 BOTÓN SAVE MANUAL (si existe)
    const saveBtn = document.getElementById("saveRosterBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => this.handleManualSave());
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

      if (action === "edit") {
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

    const validation = this.validationService.validateDateTimeSequence(
      startDischarge,
      etcTime
    );

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

    const etcTime = this.scheduleCalculator.calculateETC(
      startDischarge,
      dischargeHours
    );

    if (etcTime) {
      dateTimeInstances.etcTime.setDateTime(etcTime);
      this.validateDateTimeSequence();
      this.autoSaveService.triggerAutoSave("timeCalculation", () =>
        this.collectCurrentRosterData()
      );
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
    const shipValidation =
      this.validationService.validateShipNominationSelected(
        this.selectedShipNomination
      );
    if (!shipValidation.isValid) {
      Logger.warn(shipValidation.message, {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: shipValidation.message,
      });
      return;
    }

    const officeValidation =
      this.validationService.validateOfficeSamplingExists();
    if (!officeValidation.isValid) {
      Logger.warn(officeValidation.message, {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: officeValidation.message,
      });
      return;
    }

    const dischargeHours = this.getDischargeTimeHours();
    const hoursValidation =
      this.validationService.validateDischargeTimeHours(dischargeHours);
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
      this.autoSaveService.triggerAutoSaveImmediate("autoGenerate", () =>
        this.collectCurrentRosterData()
      );

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
      samplersResult.data,
      this.autoSaveService.getCurrentRosterId() // Agregar currentRosterId
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

    // 🆕 DETECTAR SI ETC HA SIDO PERSONALIZADO
    const originalETC = this.selectedShipNomination?.etc
      ? new Date(this.selectedShipNomination.etc)
      : null;
    const hasCustomETC =
      etcTime &&
      originalETC &&
      Math.abs(etcTime.getTime() - originalETC.getTime()) > 60000; // Diferencia > 1 minuto

    // 🆕 LOG DE DEBUG PARA TRACKING
    if (hasCustomETC) {
      Logger.info("Custom ETC detected in roster data", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          originalETC: originalETC?.toISOString(),
          customETC: etcTime?.toISOString(),
          differenceHours: Math.round(
            (etcTime.getTime() - originalETC.getTime()) / (1000 * 60 * 60)
          ),
        },
        showNotification: false,
      });
    }

    return {
      shipNomination: String(this.selectedShipNomination._id),
      vesselName: this.selectedShipNomination.vesselName,
      amspecRef: this.selectedShipNomination.amspecRef,
      startDischarge: startDischarge,
      etcTime: etcTime, // 🆕 ETC personalizado del formulario
      dischargeTimeHours: dischargeHours || 0,
      totalTurns: lineData.length,
      totalSamplers: new Set(lineData.map((t) => t.samplerName)).size,

      // 🆕 NUEVAS PROPIEDADES PARA TRACKING DE ETC
      hasCustomETC: hasCustomETC,
      originalShipNominationETC: this.selectedShipNomination?.etc || null,
      etcModificationTimestamp: hasCustomETC ? new Date().toISOString() : null,

      officeSampling: officeData
        ? {
            sampler: {
              id:
                this.selectedShipNomination.sampler?.id ||
                this.selectedShipNomination.sampler,
              name: officeData.samplerName,
            },
            startTime: DateUtils.parseDateTime(officeData.startTime),
            finishTime: DateUtils.parseDateTime(officeData.finishTime),
            hours: parseInt(officeData.hours) || 6,
          }
        : null,

      lineSampling: lineData.map((turn, index) => ({
        sampler: {
          id:
            this.selectedShipNomination.sampler?.id ||
            this.selectedShipNomination.sampler,
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
   * 🆕 Modo edición para Office Sampler - ACTUALIZADO CON DATETIMEPICKERS
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
    const startCell = row.querySelector("td:nth-child(2)");
    const finishCell = row.querySelector("td:nth-child(3)");
    const hoursCell = row.querySelector("td:nth-child(4)");
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

      // 🆕 STEP 1: GUARDAR TODOS LOS VALORES ORIGINALES ANTES DE EDITAR
      const currentSampler = samplerCell.textContent.trim();
      const currentStartTime = startCell ? startCell.textContent.trim() : "";
      const currentFinishTime = finishCell ? finishCell.textContent.trim() : "";
      const currentHours = hoursCell ? hoursCell.textContent.trim() : "6";

      // Guardar valores originales en las celdas correspondientes
      samplerCell.setAttribute("data-original-value", currentSampler);
      if (startCell) startCell.setAttribute("data-original-value", currentStartTime);
      if (finishCell) finishCell.setAttribute("data-original-value", currentFinishTime);
      if (hoursCell) {
        hoursCell.setAttribute("data-backup-value", currentHours);
        hoursCell.setAttribute("data-original-value", currentHours);
      }

      // STEP 2: CREAR DROPDOWN DEL SAMPLER
      const dropdown = this.createSamplerDropdown(samplersData, currentSampler);

      // Reemplazar contenido de la celda del sampler con el contenedor
      samplerCell.innerHTML = "";
      samplerCell.appendChild(dropdown);

      // INICIALIZAR SingleSelect (después de que esté en DOM)
      await this.initializeSamplerSelector(
        dropdown,
        samplersData,
        currentSampler
      );

      // 🆕 STEP 3: ACTIVAR DATETIMEPICKERS EN LAS CELDAS DE FECHA/HORA
      const dateTimeEnabled =
        this.tableManager.enableOfficeSamplingDateTimeEdit(rowId);
      if (!dateTimeEnabled) {
        Logger.warn("Failed to enable DateTimePickers", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage: "Unable to enable date/time editing",
        });
      }

      // STEP 4: TRANSFORMAR BOTÓN EDIT → SAVE
      editButton.innerHTML = '<i class="fas fa-check"></i>';
      editButton.setAttribute("data-action", "save");
      editButton.setAttribute("title", "Save Changes");
      editButton.className = "btn btn-primary-premium btn-edit-item";
      editButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      Logger.success("Edit mode activated with DateTimePickers", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          rowId: rowId,
          currentSampler: currentSampler,
          currentStartTime: currentStartTime,
          currentFinishTime: currentFinishTime,
          currentHours: currentHours,
          availableSamplers: samplersData.length,
          dateTimePickersEnabled: dateTimeEnabled,
        },
        showNotification: false,
      });

      document.addEventListener("keydown", this.handleEditKeydown);
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
    const dropdownContainer = samplerCell.querySelector(
      'div[id^="samplerDropdown_"]'
    );

    if (!samplerCell || !saveButton || !dropdownContainer) return;

    try {
      // 🆕 STEP 1: GUARDAR Y VALIDAR DATETIMEPICKERS
      const dateTimeResult =
        this.tableManager.disableOfficeSamplingDateTimeEdit(rowId);
      if (!dateTimeResult.success) {
        Logger.warn("DateTimePicker validation failed", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage:
            dateTimeResult.message || "Invalid date/time sequence",
        });
        return; // No continuar si las fechas son inválidas
      }

      // STEP 2: GUARDAR SAMPLER SELECTION
      const samplerSelector = dropdownContainer.samplerSelector;
      if (!samplerSelector) {
        throw new Error("SingleSelect instance not found");
      }

      const newSamplerName =
        samplerSelector.getSelectedItem() || "No Sampler Assigned";
      const originalValue = samplerCell.getAttribute("data-original-value");

      // Limpiar la instancia SingleSelect
      samplerSelector.destroy();

      // Restaurar contenido de la celda del sampler
      samplerCell.innerHTML = `<span class="fw-medium">${newSamplerName}</span>`;
      samplerCell.removeAttribute("data-original-value");

      // Restaurar botón SAVE → EDIT
      saveButton.innerHTML = '<i class="fas fa-edit"></i>';
      saveButton.setAttribute("data-action", "edit");
      saveButton.setAttribute("title", "Edit Sampler");
      saveButton.className = "btn btn-secondary-premium btn-edit-item";
      saveButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      // 🆕 STEP 3: LOG CAMBIOS COMPLETOS (sampler + fechas + horas)
      const hasChanges =
        newSamplerName !== originalValue ||
        dateTimeResult.data.startTime !==
          samplerCell.getAttribute("data-original-start") ||
        dateTimeResult.data.finishTime !==
          samplerCell.getAttribute("data-original-finish");

      if (hasChanges) {
        Logger.success("Office Sampling updated successfully", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            sampler: {
              from: originalValue,
              to: newSamplerName,
            },
            startTime: dateTimeResult.data.startTime,
            finishTime: dateTimeResult.data.finishTime,
            hours: dateTimeResult.data.hours,
          },
          showNotification: true,
          notificationMessage: `Office Sampling updated: ${newSamplerName} (${dateTimeResult.data.hours}h)`,
        });

        // Auto-save con datos completos
        this.autoSaveService.triggerAutoSaveImmediate(
          "officeSamplingEdit",
          () => this.collectCurrentRosterData()
        );
      } else {
        Logger.info("No changes made to Office Sampling", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { rowId: rowId, sampler: newSamplerName },
          showNotification: false,
        });
      }
    } catch (error) {
      Logger.error("Error saving Office Sampling edit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Unable to save changes. Please try again.",
      });
    }

    document.removeEventListener("keydown", this.handleEditKeydown);
  }

  /**
   * 🆕 Modo edición para Line Sampler - CON DATETIMEPICKERS PARA PRIMERA LÍNEA
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

      // Guardar valor actual del sampler
      const currentSampler = samplerCell.textContent.trim();
      samplerCell.setAttribute("data-original-value", currentSampler);

      // Crear contenedor y agregarlo al DOM PRIMERO
      const dropdown = this.createLineSamplerDropdown(
        samplersData,
        currentSampler
      );

      // Reemplazar contenido de la celda con el contenedor
      samplerCell.innerHTML = "";
      samplerCell.appendChild(dropdown);

      // INICIALIZAR SingleSelect (después de que esté en DOM)
      await this.initializeLineSamplerSelector(
        dropdown,
        samplersData,
        currentSampler
      );

      // 🆕 ACTIVAR DATETIMEPICKERS SOLO EN PRIMERA LÍNEA (line-sampler-row-0)
      let dateTimeEnabled = false;
      if (rowId === "line-sampler-row-0") {
        dateTimeEnabled =
          this.tableManager.enableLineSamplingDateTimeEdit(rowId);
        if (!dateTimeEnabled) {
          Logger.warn("Failed to enable DateTimePickers for first line", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            showNotification: true,
            notificationMessage:
              "Unable to enable date/time editing for first line",
          });
        }
      }

      // Transformar botón EDIT → SAVE
      editButton.innerHTML = '<i class="fas fa-check"></i>';
      editButton.setAttribute("data-action", "save");
      editButton.setAttribute("title", "Save Changes");
      editButton.className = "btn btn-primary-premium btn-edit-item";
      editButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      Logger.success("Line sampler edit mode activated", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          rowId: rowId,
          currentSampler: currentSampler,
          availableSamplers: samplersData.length,
          isFirstLine: rowId === "line-sampler-row-0",
          dateTimePickersEnabled: dateTimeEnabled,
        },
        showNotification: false,
      });

      document.addEventListener("keydown", this.handleEditKeydown);
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
   *  Guardar edición de Line Sampler - ACTUALIZADO CON DATETIMEPICKERS Y RECÁLCULO
   */
  async saveLineSamplerEdit(rowId) {
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
    const dropdownContainer = samplerCell.querySelector(
      'div[id^="lineSamplerDropdown_"]'
    );

    if (!samplerCell || !saveButton || !dropdownContainer) return;

    try {
      let dateTimeResult = { success: true, data: null };

      // 🆕 STEP 1: GUARDAR Y VALIDAR DATETIMEPICKERS (SOLO PRIMERA LÍNEA)
      if (rowId === "line-sampler-row-0") {
        dateTimeResult =
          this.tableManager.disableLineSamplingDateTimeEdit(rowId);
        if (!dateTimeResult.success) {
          Logger.warn("DateTimePicker validation failed for first line", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            showNotification: true,
            notificationMessage:
              dateTimeResult.message ||
              "Invalid date/time sequence for first line",
          });
          return; // No continuar si las fechas son inválidas
        }
      }

      // STEP 2: GUARDAR SAMPLER SELECTION (IGUAL QUE ANTES)
      const samplerSelector = dropdownContainer.samplerSelector;
      if (!samplerSelector) {
        throw new Error("SingleSelect instance not found");
      }

      const newSamplerName =
        samplerSelector.getSelectedItem() || "No Sampler Assigned";
      const originalValue = samplerCell.getAttribute("data-original-value");

      // 🆕 STEP 3: VALIDAR SAMPLER PARA EDICIÓN (SOLO SI CAMBIÓ)
      if (newSamplerName !== originalValue) {
        const validationResult = await this.validateSamplerForEdit(
          newSamplerName,
          rowId
        );

        if (!validationResult.isValid) {
          let errorMessage = validationResult.message;

          if (validationResult.details?.type !== "USER_CANCELLED") {
            Logger.warn("Sampler validation failed for line sampler edit", {
              module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
              data: {
                sampler: newSamplerName,
                rowId: rowId,
                reason: errorMessage,
                validationType: validationResult.details?.type || "UNKNOWN",
              },
              showNotification: true,
              notificationMessage: errorMessage,
            });
          }
          return; // No guardar si falla validación
        }
      }

      // 🆕 STEP 4: RECALCULAR LINE SAMPLING (SOLO SI ES PRIMERA LÍNEA Y CAMBIÓ HORARIO)
      if (rowId === "line-sampler-row-0" && dateTimeResult.data) {
        const recalculationResult =
          await this.recalculateLineSamplingFromFirstRow(dateTimeResult.data);
        if (!recalculationResult.success) {
          Logger.warn("Line sampling recalculation failed", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            showNotification: true,
            notificationMessage:
              recalculationResult.message ||
              "Unable to recalculate line sampling schedule",
          });
          return;
        }
      }

      // STEP 5: LIMPIAR Y RESTAURAR UI
      samplerSelector.destroy();

      // Restaurar contenido de la celda del sampler
      samplerCell.innerHTML = `<span class="fw-medium">${newSamplerName}</span>`;
      samplerCell.removeAttribute("data-original-value");

      // Restaurar botón SAVE → EDIT
      saveButton.innerHTML = '<i class="fas fa-edit"></i>';
      saveButton.setAttribute("data-action", "edit");
      saveButton.setAttribute("title", "Edit Sampler");
      saveButton.className = "btn btn-secondary-premium btn-edit-item";
      saveButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      // 🆕 STEP 6: LOG CAMBIOS COMPLETOS
      const hasChanges =
        newSamplerName !== originalValue || dateTimeResult.data !== null;

      if (hasChanges) {
        const logData = {
          rowId: rowId,
          sampler: {
            from: originalValue,
            to: newSamplerName,
          },
        };

        // Agregar datos de fechas si es primera línea
        if (rowId === "line-sampler-row-0" && dateTimeResult.data) {
          logData.timeChanges = {
            startTime: dateTimeResult.data.startTime,
            finishTime: dateTimeResult.data.finishTime,
            hours: dateTimeResult.data.hours,
          };
        }

        Logger.success("Line Sampler updated successfully", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: logData,
          showNotification: true,
          notificationMessage:
            rowId === "line-sampler-row-0"
              ? `First line updated: ${newSamplerName} (${
                  dateTimeResult.data?.hours || "same"
                }h) + schedule recalculated`
              : `Line sampler updated: ${newSamplerName}`,
        });

        // Auto-save con datos completos
        this.autoSaveService.triggerAutoSaveImmediate("lineSamplerEdit", () =>
          this.collectCurrentRosterData()
        );
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

    document.removeEventListener("keydown", this.handleEditKeydown);
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

      const response = await fetch(`${this.baseURL}/api/samplers`);
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
   * 🆕 Validar sampler para edición manual (VALIDACIÓN FLEXIBLE)
   * - ESTRICTA: Descanso de 10h (sin excepciones)
   * - FLEXIBLE: Límite semanal 24h (advertencia + confirmación)
   */
  async validateSamplerForEdit(samplerName, excludeRowId = null) {
    try {
      Logger.debug("Validating sampler for manual edit (flexible mode)", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          excludeRowId: excludeRowId,
        },
        showNotification: false,
      });

      // Obtener datos actuales del roster
      const officeData = this.tableManager.getOfficeSamplingData();
      const lineData = this.tableManager.getCurrentLineTurns();
      const currentRosterId = this.autoSaveService.getCurrentRosterId();

      // Encontrar el turno que se está editando
      const editingTurn = this.findTurnBeingEdited(excludeRowId, lineData);
      if (!editingTurn) {
        return {
          isValid: false,
          message: "Cannot find turn being edited",
        };
      }

      this.debugDateParsing(editingTurn);

      const startTime = this.parseLocalDateTime(editingTurn.startTime);
      const finishTime = this.parseLocalDateTime(editingTurn.finishTime);

      // 🐛 DEBUG: Ver qué datos se están pasando
      console.log("🔍 DEBUG validateSamplerForEdit:", {
        samplerName: samplerName,
        startTime: startTime.toISOString(),
        finishTime: finishTime.toISOString(),
        currentRosterId: currentRosterId,
        officeData: officeData,
        filteredLineData: this.getFilteredLineData(lineData, excludeRowId),
        editingTurn: this.findTurnBeingEdited(excludeRowId, lineData),
      });

      // ✅ VALIDACIÓN 1: DESCANSO MÍNIMO (ESTRICTA - sin excepciones)
      const restValidation =
        await ValidationService.validateMinimumRestWithMemory(
          samplerName,
          startTime,
          finishTime,
          this.getFilteredLineData(lineData, excludeRowId),
          officeData,
          currentRosterId
        );

      if (!restValidation.isValid) {
        return {
          isValid: false,
          message: `❌ ${restValidation.message}`,
          details: {
            rest: restValidation,
            type: "STRICT_VIOLATION",
          },
        };
      }

      // ✅ VALIDACIÓN 2: DISPONIBILIDAD CRUZADA (ESTRICTA)
      const crossRosterValidation =
        await ValidationService.validateSamplerAvailability(
          samplerName,
          startTime,
          finishTime,
          currentRosterId
        );

      if (!crossRosterValidation.isAvailable) {
        return {
          isValid: false,
          message: "❌ Sampler not available - conflict with another vessel",
          details: {
            crossRoster: crossRosterValidation,
            type: "STRICT_VIOLATION",
          },
        };
      }

      // ✅ VALIDACIÓN 3: LÍMITE SEMANAL (FLEXIBLE - advertencia + confirmación)
      const turnHours = DateUtils.getHoursBetween(startTime, finishTime);
      const weeklyValidation =
        await ValidationService.validateSamplerWeeklyLimit(
          samplerName,
          turnHours,
          startTime,
          {
            officeData,
            turnsInMemory: this.getFilteredLineData(lineData, excludeRowId),
          },
          currentRosterId
        );

      // Si NO tiene límite semanal, todo OK
      if (!weeklyValidation.hasWeeklyLimit) {
        return {
          isValid: true,
          message: "✅ All validations passed",
          details: {
            weekly: weeklyValidation,
            rest: restValidation,
            crossRoster: crossRosterValidation,
            type: "NO_WEEKLY_LIMIT",
          },
        };
      }

      // Si TIENE límite semanal pero NO lo excede, todo OK
      if (weeklyValidation.isValid) {
        return {
          isValid: true,
          message: "✅ All validations passed",
          details: {
            weekly: weeklyValidation,
            rest: restValidation,
            crossRoster: crossRosterValidation,
            type: "WITHIN_WEEKLY_LIMIT",
          },
        };
      }

      // ⚠️ EXCEDE LÍMITE SEMANAL: Mostrar advertencia y solicitar confirmación
      const exceedsBy =
        weeklyValidation.totalHours - weeklyValidation.weeklyLimit;

      const userConfirmed = await this.showWeeklyLimitWarningModal(
        samplerName,
        {
          currentWeeklyHours: weeklyValidation.currentWeeklyHours,
          proposedHours: turnHours,
          totalHours: weeklyValidation.totalHours,
          weeklyLimit: weeklyValidation.weeklyLimit,
          exceedsBy: exceedsBy,
        }
      );

      if (userConfirmed) {
        Logger.warn("User confirmed weekly limit override", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            samplerName: samplerName,
            currentWeeklyHours: weeklyValidation.currentWeeklyHours,
            proposedHours: turnHours,
            totalAfter: weeklyValidation.totalHours,
            weeklyLimit: weeklyValidation.weeklyLimit,
            exceedsBy: exceedsBy, // ← CAMBIAR ESTA LÍNEA
          },
          showNotification: true,
          notificationMessage: `${samplerName} weekly limit overridden by user`,
        });

        return {
          isValid: true,
          message: "✅ Validated with user confirmation",
          details: {
            weekly: weeklyValidation,
            rest: restValidation,
            crossRoster: crossRosterValidation,
            type: "USER_OVERRIDE",
            userConfirmed: true,
          },
        };
      } else {
        Logger.info("User cancelled weekly limit override", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { samplerName: samplerName },
          showNotification: false,
        });

        return {
          isValid: false,
          message: "❌ User cancelled due to weekly limit",
          details: {
            weekly: weeklyValidation,
            type: "USER_CANCELLED",
          },
        };
      }
    } catch (error) {
      Logger.error("Error validating sampler for edit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return {
        isValid: false,
        message: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * 🆕 Encontrar turno que se está editando
   */
  findTurnBeingEdited(excludeRowId, lineData) {
    if (!excludeRowId) return null;

    // Extraer índice del rowId (ej: "line-sampler-row-2" -> índice 2)
    const match = excludeRowId.match(/line-sampler-row-(\d+)/);
    if (!match) return null;

    const index = parseInt(match[1]);

    // 🔧 FIX: Usar método específico del TableManager para evitar corrupción
    const turn = this.tableManager.getLineTurnByIndex(index);

    // 🐛 DEBUG: Verificar datos obtenidos
    console.log("🔧 findTurnBeingEdited FIXED:", {
      excludeRowId: excludeRowId,
      index: index,
      turn: turn,
    });

    return turn;
  }

  /**
   * 🆕 Obtener line data filtrada (sin turno editado)
   */
  getFilteredLineData(lineData, excludeRowId) {
    if (!excludeRowId || !lineData) return lineData;

    // Extraer índice del rowId
    const match = excludeRowId.match(/line-sampler-row-(\d+)/);
    if (!match) return lineData;

    const excludeIndex = parseInt(match[1]);
    return lineData.filter((turn, index) => index !== excludeIndex);
  }

  /**
   * 🆕 Método auxiliar para debug de fechas
   */
  debugDateParsing(turn) {
    if (!turn) return;

    console.log("🗓️ DEBUG Date Parsing:", {
      originalStartTime: turn.startTime,
      originalFinishTime: turn.finishTime,
      parsedStartTime: DateUtils.parseDateTime(turn.startTime),
      parsedFinishTime: DateUtils.parseDateTime(turn.finishTime),
      parsedStartISO: DateUtils.parseDateTime(turn.startTime)?.toISOString(),
      parsedFinishISO: DateUtils.parseDateTime(turn.finishTime)?.toISOString(),
    });
  }

  /**
   * 🆕 Parsear fecha manteniendo timezone local (FIX TIMEZONE)
   */
  parseLocalDateTime(dateTimeStr) {
    if (!dateTimeStr) return null;

    // Formato esperado: "06/08/2025 07:00" -> DD/MM/YYYY HH:mm
    const parts = dateTimeStr.match(
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/
    );
    if (!parts) return null;

    const [, day, month, year, hours, minutes] = parts;

    // Crear fecha en timezone local (no UTC)
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      0, // seconds
      0 // milliseconds
    );

    return localDate;
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

  // ==================================================================================
  // 🆕 MÉTODO AUXILIAR OPCIONAL: validateOfficeSamplingForSave()
  // AGREGAR este método nuevo para validación completa antes de guardar
  // ==================================================================================

  /**
   * 🆕 Validar Office Sampling antes de guardar (sampler + fechas + horas)
   */
  validateOfficeSamplingForSave(rowId) {
    try {
      const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (!row) return { isValid: false, message: "Row not found" };

      // Validar sampler selection
      const samplerCell = row.querySelector("td:first-child");
      const dropdownContainer = samplerCell?.querySelector(
        'div[id^="samplerDropdown_"]'
      );

      if (dropdownContainer) {
        const samplerSelector = dropdownContainer.samplerSelector;
        const selectedSampler = samplerSelector?.getSelectedItem();

        if (!selectedSampler || selectedSampler.trim() === "") {
          return { isValid: false, message: "Please select a sampler" };
        }
      }

      // Validar DateTimePickers (si están activos)
      const startContainer = row.querySelector(
        'div[id^="officeStartDateTime_"]'
      );
      const finishContainer = row.querySelector(
        'div[id^="officeFinishDateTime_"]'
      );

      if (startContainer && finishContainer && window.officeTimeInstances) {
        const startInstance = window.officeTimeInstances[startContainer.id];
        const finishInstance = window.officeTimeInstances[finishContainer.id];

        const startDateTime = startInstance?.getDateTime();
        const finishDateTime = finishInstance?.getDateTime();

        if (!startDateTime || !finishDateTime) {
          return {
            isValid: false,
            message: "Please select both start and finish times",
          };
        }

        // Validar secuencia temporal
        if (startDateTime >= finishDateTime) {
          return {
            isValid: false,
            message: "Start time must be before finish time",
          };
        }

        // Validar mínimo 4 horas
        const hoursDiff = (finishDateTime - startDateTime) / (1000 * 60 * 60);
        if (hoursDiff < 4) {
          return {
            isValid: false,
            message: "Minimum 4 hours required between start and finish",
          };
        }
      }

      return { isValid: true, message: "Validation successful" };
    } catch (error) {
      return {
        isValid: false,
        message: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * 🆕 Cancelar edición de sampler (Escape key)
   */
  cancelSamplerEdit(rowId) {
    Logger.info("Cancel sampler edit requested", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { rowId: rowId },
      showNotification: false,
    });

    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const samplerCell = row.querySelector("td:first-child");
    const actionCell = row.querySelector("td:last-child");
    const saveButton = actionCell.querySelector('button[data-action="save"]');
    const dropdownContainer = samplerCell.querySelector(
      'div[id^="samplerDropdown_"], div[id^="lineSamplerDropdown_"]'
    );

    if (!samplerCell || !saveButton) return;

    try {
      // 🆕 STEP 1: OBTENER DATOS ORIGINALES PARA RESPALDO
      let originalData = null;
      if (rowId === "office-sampler-row") {
        originalData = this.tableManager.getOfficeSamplingOriginalData(rowId);
        
        // 🆕 DEBUG: Verificar estado de atributos antes de la cancelación
        Logger.info("Debug: Original data before cancellation", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            samplerOriginalValue: samplerCell.getAttribute("data-original-value"),
            startOriginalValue: row.querySelector("td:nth-child(2)")?.getAttribute("data-original-value"),
            finishOriginalValue: row.querySelector("td:nth-child(3)")?.getAttribute("data-original-value"),
            hoursOriginalValue: row.querySelector("td:nth-child(4)")?.getAttribute("data-original-value"),
            originalData: originalData
          },
          showNotification: false,
        });
      }

      // 🆕 STEP 2: RESTAURAR SAMPLER PRIMERO (ANTES de cancelar DateTimePickers)
      if (dropdownContainer) {
        // Obtener valor original del sampler
        const originalValue =
          samplerCell.getAttribute("data-original-value") ||
          "No Sampler Assigned";

        Logger.info("Debug: Restoring sampler", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            originalValue: originalValue,
            hasOriginalValue: samplerCell.hasAttribute("data-original-value")
          },
          showNotification: false,
        });

        // Obtener y limpiar SingleSelect instance
        const samplerSelector = dropdownContainer.samplerSelector;
        if (samplerSelector) {
          samplerSelector.destroy();
        }

        // Restaurar contenido original de la celda del sampler
        samplerCell.innerHTML = `<span class="fw-medium">${originalValue}</span>`;
        samplerCell.removeAttribute("data-original-value");
      }

      // 🆕 STEP 3: CANCELAR DATETIMEPICKERS (solo para Office Sampling)
      if (rowId === "office-sampler-row") {
        // Cancelar DateTimePickers
        const dateTimeCancelled = this.tableManager.cancelOfficeSamplingDateTimeEdit(rowId);
        
        Logger.info("Debug: DateTimePickers cancellation result", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            dateTimeCancelled: dateTimeCancelled
          },
          showNotification: false,
        });
        
        // 🆕 Si falla la cancelación de DateTimePickers, usar respaldo de emergencia
        if (!dateTimeCancelled && originalData) {
          Logger.warn("DateTimePickers cancellation failed, using emergency restore", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: { rowId: rowId },
            showNotification: false,
          });
          this.tableManager.emergencyRestoreOfficeSampling(rowId, originalData);
        }
      }

      if (rowId === "line-sampler-row-0") {
        this.tableManager.cancelLineSamplingDateTimeEdit(rowId);
      }

      // STEP 4: RESTAURAR BOTÓN SAVE → EDIT
      saveButton.innerHTML = '<i class="fas fa-edit"></i>';
      saveButton.setAttribute("data-action", "edit");
      saveButton.setAttribute("title", "Edit Sampler");
      saveButton.className = "btn btn-secondary-premium btn-edit-item";
      saveButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      // Remover event listener de teclado
      document.removeEventListener("keydown", this.handleEditKeydown);

      Logger.success("Edit cancelled successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: { rowId: rowId },
        showNotification: true,
        notificationMessage: "Edit cancelled",
      });
    } catch (error) {
      Logger.error("Error cancelling edit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Error cancelling edit. Please refresh the page.",
      });
      
      // 🆕 EN CASO DE ERROR, INTENTAR RESTAURACIÓN DE EMERGENCIA
      if (rowId === "office-sampler-row" && originalData) {
        Logger.info("Attempting emergency restore due to error", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { rowId: rowId },
          showNotification: false,
        });
        this.tableManager.emergencyRestoreOfficeSampling(rowId, originalData);
      }
    }
  }

  /**
   * 🆕 Manejar teclas durante edición
   */
  handleEditKeydown = (event) => {
    // Verificar si hay alguna edición activa
    const editingRow = document.querySelector('tr button[data-action="save"]');
    if (!editingRow) return;

    const rowId = editingRow.getAttribute("data-row-id");
    if (!rowId) return;

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        this.cancelSamplerEdit(rowId);
        break;

      case "Enter":
        event.preventDefault();
        // 🆕 DETECTAR TIPO DE FILA: Office Sampling vs Line Sampling
        if (rowId === "office-sampler-row") {
          this.saveSamplerEdit(rowId); // Office Sampling (con DateTimePickers)
        } else if (rowId.startsWith("line-sampler-row-")) {
          this.saveLineSamplerEdit(rowId); // Line Sampling (solo sampler)
        }
        break;
    }
  };

  /**
   * 🎨 Modal de advertencia de límite semanal - Estilo del sistema
   */
  showWeeklyLimitWarningModal(samplerName, validationData) {
    return new Promise((resolve) => {
      const { currentWeeklyHours, totalHours, weeklyLimit, proposedHours } =
        validationData;
      const exceedsBy = totalHours - weeklyLimit;

      // Crear modal HTML usando el estilo del sistema
      const modalHtml = `
        <div class="modal fade" id="weeklyLimitWarningModal" tabindex="-1" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-light border-warning">
              <div class="modal-header border-warning">
                <h5 class="modal-title">
                  <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                  Weekly Limit Warning
                </h5>
              </div>
              <div class="modal-body">
                <div class="text-center mb-3">
                  <i class="fas fa-clock text-warning" style="font-size: 3rem;"></i>
                </div>
                <p class="text-center mb-3">
                  <strong>${samplerName}</strong> will exceed the weekly working limit
                </p>
                
                <!-- Detalles de horas -->
                <div class="alert alert-warning">
                  <div class="row text-center">
                    <div class="col-6">
                      <strong>Current Week:</strong><br>
                      <span class="fs-5">${currentWeeklyHours}h</span>
                    </div>
                    <div class="col-6">
                      <strong>Proposed Turn:</strong><br>
                      <span class="fs-5">+${proposedHours}h</span>
                    </div>
                  </div>
                  <hr class="my-2">
                  <div class="row text-center">
                    <div class="col-6">
                      <strong>Total After:</strong><br>
                      <span class="fs-4 text-warning">${totalHours}h</span>
                    </div>
                    <div class="col-6">
                      <strong>Weekly Limit:</strong><br>
                      <span class="fs-4">${weeklyLimit}h</span>
                    </div>
                  </div>
                  <div class="text-center mt-2">
                    <small class="text-warning">
                      <i class="fas fa-arrow-up me-1"></i>
                      Exceeds by ${exceedsBy}h
                    </small>
                  </div>
                </div>
                
                <p class="text-warning small text-center">
                  <i class="fas fa-info-circle me-1"></i>
                  This assignment exceeds the recommended 24-hour weekly limit.
                </p>
              </div>
              <div class="modal-footer border-warning">
                <button type="button" class="btn btn-secondary" id="cancelWeeklyLimitBtn">
                  <i class="fas fa-times me-1"></i>Cancel
                </button>
                <button type="button" class="btn btn-warning" id="confirmWeeklyLimitBtn">
                  <i class="fas fa-check me-1"></i>Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Remover modal anterior si existe
      const existingModal = document.getElementById("weeklyLimitWarningModal");
      if (existingModal) {
        existingModal.remove();
      }

      // Agregar modal al DOM
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Obtener elementos
      const modal = document.getElementById("weeklyLimitWarningModal");
      const cancelBtn = document.getElementById("cancelWeeklyLimitBtn");
      const confirmBtn = document.getElementById("confirmWeeklyLimitBtn");

      // Event listeners
      cancelBtn.addEventListener("click", () => {
        closeModal(false);
      });

      confirmBtn.addEventListener("click", () => {
        closeModal(true);
      });

      // Función para cerrar modal
      function closeModal(confirmed) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
        }

        // Remover modal del DOM después de cerrar
        setTimeout(() => {
          modal.remove();
          resolve(confirmed);
        }, 300);
      }

      // Mostrar modal
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();

      // Cerrar con Escape
      modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeModal(false);
        }
      });
    });
  }

  /**
   * 🔧 MÉTODO COMPLETO CORREGIDO - SamplingRosterController.js
   * REEMPLAZAR completamente el método recalculateLineSamplingFromFirstRow()
   */

  async recalculateLineSamplingFromFirstRow(firstLineData) {
    try {
      Logger.info("Recalculating Line Sampling from first row", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: firstLineData,
        showNotification: false,
      });

      // 1️⃣ OBTENER TODAS LAS LÍNEAS ACTUALES
      const currentTurns = this.tableManager.getCurrentLineTurns();
      if (!currentTurns || currentTurns.length === 0) {
        return {
          success: false,
          message: "No line turns found to recalculate",
        };
      }

      // 2️⃣ OBTENER ETC DESDE DATETIMEPICKER DEL FORMULARIO
      const dateTimeInstances = this.uiManager.getDateTimeInstances();
      const etcFromForm = dateTimeInstances.etcTime?.getDateTime();

      if (!etcFromForm) {
        return {
          success: false,
          message:
            "ETC not found in form. Please set ETC time in the vessel information.",
        };
      }

      // 3️⃣ CREAR ETCDATE ANTES DE CUALQUIER LOG
      const etcDate = new Date(etcFromForm);

      // 4️⃣ DEBUG LOGS (AHORA etcDate YA EXISTE)
      console.log(`🔍 ETC Debug:`, {
        etcFromShipNomination: this.selectedShipNomination?.etc,
        etcFromFormPicker: etcFromForm?.toISOString(),
        etcDateUsed: etcDate.toISOString(),
        firstLineFinish: firstLineData.finishDate?.toISOString(),
      });

      console.log(`📅 Using ETC from form DateTimePicker:`, {
        etcFromForm: etcFromForm.toISOString(),
        etcDate: etcDate.toISOString(),
      });

      // 5️⃣ INICIALIZAR RECÁLCULO
      let currentEndTime = firstLineData.finishDate; // Hora final de primera línea modificada

      // Recalcular cada turno siguiente manteniendo samplers
      const recalculatedTurns = [
        // Primera línea ya está actualizada, mantener sampler
        {
          samplerName: currentTurns[0].samplerName,
          startTime: this.tableManager.formatDateTime(firstLineData.startDate),
          finishTime: this.tableManager.formatDateTime(
            firstLineData.finishDate
          ),
          hours: firstLineData.hours,
        },
      ];

      // 6️⃣ RECALCULAR RESTO DE TURNOS
      for (let i = 1; i < currentTurns.length; i++) {
        const isLastTurn = i === currentTurns.length - 1;
        let turnStartTime = new Date(currentEndTime);
        let turnEndTime;
        let turnHours;

        console.log(`🔍 DEBUG: Processing turn ${i}:`, {
          isLastTurn: isLastTurn,
          currentEndTime: currentEndTime.toISOString(),
          samplerName: currentTurns[i].samplerName,
        });

        if (isLastTurn) {
          // Último turno: termina en ETC
          turnEndTime = new Date(etcDate);
          turnHours = Math.round(
            (turnEndTime - turnStartTime) / (1000 * 60 * 60)
          );

          console.log(`🔍 DEBUG: Last turn ${i} calculated:`, {
            turnStartTime: turnStartTime.toISOString(),
            turnEndTime: turnEndTime.toISOString(),
            turnHours: turnHours,
            etcDate: etcDate.toISOString(),
          });

          // Validar que último turno tenga al menos 1 hora
          if (turnHours < 1) {
            return {
              success: false,
              message: `Recalculation would result in last turn being too short (${turnHours} hours, minimum 1 hour required)`,
            };
          }
        } else {
          // Turnos intermedios: 12 horas estándar
          turnEndTime = new Date(turnStartTime);
          turnEndTime.setHours(turnEndTime.getHours() + 12);
          turnHours = 12;

          console.log(`🔍 DEBUG: Intermediate turn ${i} calculated:`, {
            turnStartTime: turnStartTime.toISOString(),
            turnEndTime: turnEndTime.toISOString(),
            turnHours: turnHours,
            etcDate: etcDate.toISOString(),
            wouldExceedETC: turnEndTime > etcDate,
            timeDifferenceHours:
              (turnEndTime.getTime() - etcDate.getTime()) / (1000 * 60 * 60),
          });

          // Validar que no exceda ETC
          if (turnEndTime > etcDate) {
            const exceedsBy = Math.round(
              (turnEndTime.getTime() - etcDate.getTime()) / (1000 * 60 * 60)
            );
            return {
              success: false,
              message: `Recalculation would exceed ETC time by ${exceedsBy} hours. Turn ${i} would end at ${turnEndTime.toLocaleString()} but ETC is ${etcDate.toLocaleString()}`,
            };
          }
        }

        recalculatedTurns.push({
          samplerName: currentTurns[i].samplerName, // Mantener sampler existente
          startTime: this.tableManager.formatDateTime(turnStartTime),
          finishTime: this.tableManager.formatDateTime(turnEndTime),
          hours: turnHours,
        });

        currentEndTime = turnEndTime;
      }

      console.log(`🔍 DEBUG: Recalculation completed successfully:`, {
        totalTurns: recalculatedTurns.length,
        allTurns: recalculatedTurns.map((turn, idx) => ({
          index: idx,
          sampler: turn.samplerName,
          start: turn.startTime,
          finish: turn.finishTime,
          hours: turn.hours,
        })),
      });

      // 7️⃣ ACTUALIZAR LA TABLA CON LOS NUEVOS HORARIOS
      this.tableManager.populateLineSamplingTable(recalculatedTurns);
      this.setupTableEventListeners(); // Re-setup event listeners

      Logger.success("Line Sampling recalculated successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          totalTurns: recalculatedTurns.length,
          firstLineTurn: recalculatedTurns[0],
          lastLineTurn: recalculatedTurns[recalculatedTurns.length - 1],
        },
        showNotification: true,
        notificationMessage: `Line Sampling schedule recalculated (${recalculatedTurns.length} turns)`,
      });

      return { success: true, data: recalculatedTurns };
    } catch (error) {
      console.error(`🔍 DEBUG: Detailed error in recalculation:`, {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        firstLineData: firstLineData,
        selectedShipNomination: this.selectedShipNomination,
      });

      Logger.error("Error recalculating Line Sampling", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return {
        success: false,
        message: `Recalculation error: ${error.message}`,
      };
    }
  }

  /**
   * 🆕 Calcular diferencia entre ETC personalizado y original
   */
  calculateETCDifference(customETC, originalETC) {
    try {
      if (!customETC || !originalETC) return null;

      const customDate = new Date(customETC);
      const originalDate = new Date(originalETC);

      const diffMs = customDate.getTime() - originalDate.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));

      return {
        milliseconds: diffMs,
        hours: diffHours,
        description:
          diffHours > 0
            ? `${diffHours} hours later than original`
            : `${Math.abs(diffHours)} hours earlier than original`,
      };
    } catch (error) {
      return null;
    }
  }

  // ==================================================================================
// 🆕 MÉTODO AUXILIAR: setupDateTimePickersWithAutoSave() - AGREGAR A LA CLASE
// ==================================================================================

/**
 * 🆕 Setup DateTimePickers con auto-save especializado para ETC
 */
setupDateTimePickersWithAutoSave() {
  try {
    // 🎯 CALLBACK MEJORADO PARA DATETIMEPICKERS
    this.uiManager.createDateTimePickers((dateTime, pickerId) => {
      // ✅ PROTECCIÓN EXISTENTE: No ejecutar durante limpieza
      if (this.isClearing || !this.selectedShipNomination) {
        return;
      }

      try {
        // 🔄 VALIDACIONES EXISTENTES
        this.validateDateTimeSequence();
        this.calculateAndUpdateETC();

        // 🆕 DETECTAR SI EL CAMBIO ES EN ETC
        const isETCChange = pickerId && pickerId.includes('etcTime');
        
        if (isETCChange) {
          // 🆕 AUTO-SAVE INMEDIATO PARA CAMBIOS DE ETC
          Logger.info("ETC changed manually, triggering immediate save", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: {
              newETC: dateTime?.toISOString(),
              pickerId: pickerId,
              originalETC: this.selectedShipNomination?.etc
            },
            showNotification: false,
          });

          this.autoSaveService.triggerAutoSaveImmediate("etcManualChange", () =>
            this.collectCurrentRosterData()
          );
        } else {
          // 🔄 AUTO-SAVE NORMAL PARA OTROS CAMBIOS
          this.autoSaveService.triggerAutoSave("dateTimeChange", () =>
            this.collectCurrentRosterData()
          );
        }
        
      } catch (error) {
        Logger.error("Error in DateTimePicker callback", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          error: error,
          showNotification: false,
        });
      }
    });

    Logger.info("DateTimePickers setup with ETC auto-save", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false,
    });

  } catch (error) {
    Logger.error("Error setting up DateTimePickers with auto-save", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      error: error,
      showNotification: false,
    });
  }
}

// ==================================================================================
// 🆕 MÉTODOS AUXILIARES OPCIONALES - AGREGAR SI LOS BOTONES EXISTEN
// ==================================================================================

/**
 * 🆕 Manejar exportación manual de roster
 */
handleExportRoster() {
  try {
    Logger.info("Manual export requested", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false,
    });

    // TODO: Implementar lógica de exportación
    // Por ahora solo log
    this.showNotification("Export functionality coming soon", "info");

  } catch (error) {
    Logger.error("Error in manual export", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      error: error,
      showNotification: true,
      notificationMessage: "Error exporting roster",
    });
  }
}

/**
 * 🆕 Manejar guardado manual de roster
 */
handleManualSave() {
  try {
    Logger.info("Manual save requested", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false,
    });

    // Forzar guardado inmediato
    this.autoSaveService.triggerAutoSaveImmediate("manualSave", () =>
      this.collectCurrentRosterData()
    );

    this.showNotification("Roster saved successfully", "success");

  } catch (error) {
    Logger.error("Error in manual save", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      error: error,
      showNotification: true,
      notificationMessage: "Error saving roster",
    });
  }
}

/**
 * 🆕 Helper para mostrar notificaciones
 */
showNotification(message, type = "info") {
  // Usar el sistema de notificaciones existente
  Logger[type](message, {
    module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
    showNotification: true,
    notificationMessage: message,
  });
}

/**
 * 🆕 Función de debug para diagnosticar problemas con Office Sampling
 */
debugOfficeSamplingState(rowId) {
  const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
  if (!row) {
    console.log("❌ Debug: Row not found for", rowId);
    return;
  }

  const samplerCell = row.querySelector("td:first-child");
  const startCell = row.querySelector("td:nth-child(2)");
  const finishCell = row.querySelector("td:nth-child(3)");
  const hoursCell = row.querySelector("td:nth-child(4)");
  const actionCell = row.querySelector("td:last-child");

  console.log("🔍 Debug Office Sampling State for", rowId, {
    row: row,
    samplerCell: {
      element: samplerCell,
      content: samplerCell?.innerHTML,
      originalValue: samplerCell?.getAttribute("data-original-value"),
      hasDropdown: !!samplerCell?.querySelector('div[id^="samplerDropdown_"]')
    },
    startCell: {
      element: startCell,
      content: startCell?.innerHTML,
      originalValue: startCell?.getAttribute("data-original-value"),
      hasDateTimePicker: !!startCell?.querySelector('div[id^="officeStartDateTime_"]')
    },
    finishCell: {
      element: finishCell,
      content: finishCell?.innerHTML,
      originalValue: finishCell?.getAttribute("data-original-value"),
      hasDateTimePicker: !!finishCell?.querySelector('div[id^="officeFinishDateTime_"]')
    },
    hoursCell: {
      element: hoursCell,
      content: hoursCell?.textContent,
      originalValue: hoursCell?.getAttribute("data-original-value"),
      backupValue: hoursCell?.getAttribute("data-backup-value")
    },
    actionCell: {
      element: actionCell,
      button: actionCell?.querySelector("button"),
      action: actionCell?.querySelector("button")?.getAttribute("data-action")
    },
    officeTimeInstances: window.officeTimeInstances ? Object.keys(window.officeTimeInstances) : []
  });
}

  /**
   * 🆕 Limpieza de emergencia - Último recurso para resolver problemas
   */
  emergencyCleanup() {
    Logger.warn("Emergency cleanup initiated", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: true,
      notificationMessage: "Emergency cleanup in progress...",
    });

    try {
      console.log("🚨 INICIANDO LIMPIEZA DE EMERGENCIA...");

      // 🆕 STEP 1: DEBUG COMPLETO DEL ESTADO ACTUAL
      console.log("🔍 Estado actual antes de la limpieza:");
      this.debugOfficeSamplingRowState();

      // STEP 2: DESTRUIR TODOS LOS DATETIMEPICKERS ACTIVOS
      if (window.officeTimeInstances) {
        console.log("🗑️ Destruyendo DateTimePicker instances...");
        Object.keys(window.officeTimeInstances).forEach(instanceId => {
          try {
            const instance = window.officeTimeInstances[instanceId];
            if (instance && typeof instance.destroy === 'function') {
              instance.destroy();
              console.log(`✅ DateTimePicker ${instanceId} destruido`);
            }
          } catch (error) {
            console.error(`❌ Error destruyendo DateTimePicker ${instanceId}:`, error);
          }
        });
        window.officeTimeInstances = {};
        console.log("✅ Todos los DateTimePickers destruidos");
      }

      // STEP 3: RESTAURAR FILA OFFICE SAMPLING
      const row = document.querySelector('tr[data-row-id="office-sampler-row"]');
      if (row) {
        console.log("🔄 Restaurando fila Office Sampling...");
        const originalData = this.tableManager.getOfficeSamplingOriginalData("office-sampler-row");
        if (originalData) {
          const restored = this.tableManager.emergencyRestoreOfficeSampling("office-sampler-row", originalData);
          console.log("✅ Restauración de emergencia:", restored ? "exitosa" : "fallida");
        } else {
          console.log("⚠️ No se pudieron obtener datos originales para restauración");
        }
      }

      // STEP 4: REMOVER EVENT LISTENER GLOBAL
      try {
        document.removeEventListener("keydown", this.handleEditKeydown);
        console.log("✅ Event listener de teclado removido");
      } catch (error) {
        console.error("❌ Error removiendo event listener:", error);
      }

      // STEP 5: RESTAURAR TODOS LOS BOTONES SAVE → EDIT
      const saveButtons = document.querySelectorAll('button[data-action="save"]');
      saveButtons.forEach(button => {
        try {
          button.innerHTML = '<i class="fas fa-edit"></i>';
          button.setAttribute("data-action", "edit");
          button.setAttribute("title", "Edit Sampler");
          button.className = "btn btn-secondary-premium btn-edit-item";
          button.style.cssText = "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";
          console.log(`✅ Botón restaurado: ${button.closest('tr')?.getAttribute('data-row-id') || 'unknown'}`);
        } catch (error) {
          console.error("❌ Error restaurando botón:", error);
        }
      });

      // 🆕 STEP 6: DEBUG FINAL DEL ESTADO
      console.log("🔍 Estado final después de la limpieza:");
      this.debugOfficeSamplingRowState();

      Logger.success("Emergency cleanup completed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Emergency cleanup completed successfully",
      });

      console.log("✅ LIMPIEZA DE EMERGENCIA COMPLETADA");
      return true;
    } catch (error) {
      Logger.error("Error during emergency cleanup", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: true,
        notificationMessage: "Emergency cleanup failed. Please refresh the page.",
      });

      console.error("❌ ERROR DURANTE LIMPIEZA DE EMERGENCIA:", error);
      return false;
    }
  }

  /**
   * 🆕 Verificar salud del sistema de edición - Diagnóstico completo
   */
  checkEditSystemHealth() {
    Logger.info("Checking edit system health", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false,
    });

    try {
      console.log("🏥 VERIFICANDO SALUD DEL SISTEMA DE EDICIÓN...");

      const healthReport = {
        timestamp: new Date().toISOString(),
        officeSampling: {},
        lineSampling: {},
        globalState: {},
        issues: [],
        recommendations: []
      };

      // 🆕 STEP 1: VERIFICAR ESTADO DE OFFICE SAMPLING
      console.log("🔍 Verificando Office Sampling...");
      const officeState = this.debugOfficeSamplingRowState();
      if (officeState) {
        healthReport.officeSampling = {
          rowExists: true,
          hasDateTimePickers: officeState.hasDateTimePickers,
          hasDropdown: officeState.hasDropdown,
          isInEditMode: officeState.isInEditMode,
          samplerCell: {
            hasOriginalValue: officeState.samplerCell?.hasAttribute("data-original-value"),
            originalValue: officeState.samplerCell?.getAttribute("data-original-value"),
            currentText: officeState.samplerCell?.textContent.trim()
          },
          startCell: {
            hasOriginalValue: officeState.startCell?.hasAttribute("data-original-value"),
            originalValue: officeState.startCell?.getAttribute("data-original-value"),
            hasDateTimePicker: !!officeState.startCell?.querySelector('div[id^="officeStartDateTime_"]')
          },
          finishCell: {
            hasOriginalValue: officeState.finishCell?.hasAttribute("data-original-value"),
            originalValue: officeState.finishCell?.getAttribute("data-original-value"),
            hasDateTimePicker: !!officeState.finishCell?.querySelector('div[id^="officeFinishDateTime_"]')
          },
          hoursCell: {
            hasOriginalValue: officeState.hoursCell?.hasAttribute("data-original-value"),
            hasBackupValue: officeState.hoursCell?.hasAttribute("data-backup-value"),
            currentValue: officeState.hoursCell?.textContent.trim()
          }
        };

        // Identificar problemas específicos
        if (officeState.isInEditMode && !officeState.hasDropdown) {
          healthReport.issues.push("Office Sampling está en modo edición pero no tiene dropdown");
        }
        if (officeState.hasDateTimePickers && !officeState.isInEditMode) {
          healthReport.issues.push("Office Sampling tiene DateTimePickers pero no está en modo edición");
        }
        if (officeState.samplerCell?.textContent.trim() === "No Sampler Assigned" && officeState.isInEditMode) {
          healthReport.issues.push("Office Sampling muestra 'No Sampler Assigned' en modo edición");
        }
      } else {
        healthReport.officeSampling = { rowExists: false };
        healthReport.issues.push("No se encontró la fila Office Sampling");
      }

      // STEP 2: VERIFICAR ESTADO DE LINE SAMPLING
      console.log("🔍 Verificando Line Sampling...");
      const lineRows = document.querySelectorAll('tr[data-row-id^="line-sampler-row-"]');
      healthReport.lineSampling = {
        totalRows: lineRows.length,
        rowsInEditMode: 0,
        rowsWithDateTimePickers: 0
      };

      lineRows.forEach((row, index) => {
        const rowId = row.getAttribute("data-row-id");
        const saveButton = row.querySelector('button[data-action="save"]');
        const hasDateTimePickers = !!(row.querySelector('div[id^="lineStartDateTime_"]') || row.querySelector('div[id^="lineFinishDateTime_"]'));
        
        if (saveButton) healthReport.lineSampling.rowsInEditMode++;
        if (hasDateTimePickers) healthReport.lineSampling.rowsWithDateTimePickers++;
      });

      // STEP 3: VERIFICAR ESTADO GLOBAL
      console.log("🔍 Verificando estado global...");
      healthReport.globalState = {
        hasKeyboardListener: !!this.handleEditKeydown,
        officeTimeInstances: window.officeTimeInstances ? Object.keys(window.officeTimeInstances).length : 0,
        totalSaveButtons: document.querySelectorAll('button[data-action="save"]').length,
        totalEditButtons: document.querySelectorAll('button[data-action="edit"]').length
      };

      // STEP 4: GENERAR RECOMENDACIONES
      if (healthReport.officeSampling.isInEditMode && healthReport.officeSampling.hasDateTimePickers) {
        healthReport.recommendations.push("Office Sampling está en modo edición - presiona ESC para cancelar o Enter para guardar");
      }
      if (healthReport.globalState.officeTimeInstances > 0) {
        healthReport.recommendations.push(`Hay ${healthReport.globalState.officeTimeInstances} DateTimePickers activos`);
      }
      if (healthReport.globalState.totalSaveButtons > 0) {
        healthReport.recommendations.push(`Hay ${healthReport.globalState.totalSaveButtons} filas en modo edición`);
      }
      if (healthReport.issues.length === 0) {
        healthReport.recommendations.push("El sistema parece estar funcionando correctamente");
      }

      // STEP 5: MOSTRAR REPORTE COMPLETO
      console.log("📊 REPORTE DE SALUD DEL SISTEMA:");
      console.log("⏰ Timestamp:", healthReport.timestamp);
      console.log("🏢 Office Sampling:", healthReport.officeSampling);
      console.log("📋 Line Sampling:", healthReport.lineSampling);
      console.log("🌐 Estado Global:", healthReport.globalState);
      
      if (healthReport.issues.length > 0) {
        console.log("⚠️ PROBLEMAS IDENTIFICADOS:");
        healthReport.issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue}`);
        });
      }
      
      if (healthReport.recommendations.length > 0) {
        console.log("💡 RECOMENDACIONES:");
        healthReport.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      }

      // STEP 6: LOGGING
      Logger.info("Edit system health check completed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          issues: healthReport.issues.length,
          recommendations: healthReport.recommendations.length,
          officeSamplingInEditMode: healthReport.officeSampling.isInEditMode,
          activeDateTimePickers: healthReport.globalState.officeTimeInstances
        },
        showNotification: false,
      });

      return healthReport;
    } catch (error) {
      Logger.error("Error checking edit system health", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      console.error("❌ ERROR VERIFICANDO SALUD DEL SISTEMA:", error);
      return {
        error: true,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🆕 Debug: Verificar estado completo de Office Sampling row
   */
  debugOfficeSamplingRowState() {
    const row = document.querySelector('tr[data-row-id="office-sampler-row"]');
    if (!row) {
      console.log("❌ No se encontró la fila Office Sampling");
      return;
    }

    const samplerCell = row.querySelector("td:first-child");
    const startCell = row.querySelector("td:nth-child(2)");
    const finishCell = row.querySelector("td:nth-child(3)");
    const hoursCell = row.querySelector("td:nth-child(4)");
    const actionCell = row.querySelector("td:last-child");

    console.log("🔍 Estado completo de Office Sampling Row:");
    console.log("📍 Fila encontrada:", row);
    console.log("📊 Celdas:", { samplerCell, startCell, finishCell, hoursCell, actionCell });

    if (samplerCell) {
      console.log("👤 Sampler Cell:");
      console.log("  - Texto actual:", samplerCell.textContent.trim());
      console.log("  - HTML:", samplerCell.innerHTML);
      console.log("  - data-original-value:", samplerCell.getAttribute("data-original-value"));
      console.log("  - Dropdown presente:", !!samplerCell.querySelector('div[id^="samplerDropdown_"]'));
    }

    if (startCell) {
      console.log("⏰ Start Time Cell:");
      console.log("  - Texto actual:", startCell.textContent.trim());
      console.log("  - HTML:", startCell.innerHTML);
      console.log("  - data-original-value:", startCell.getAttribute("data-original-value"));
      console.log("  - DateTimePicker presente:", !!startCell.querySelector('div[id^="officeStartDateTime_"]'));
    }

    if (finishCell) {
      console.log("⏰ Finish Time Cell:");
      console.log("  - Texto actual:", finishCell.textContent.trim());
      console.log("  - HTML:", finishCell.innerHTML);
      console.log("  - data-original-value:", finishCell.getAttribute("data-original-value"));
      console.log("  - DateTimePicker presente:", !!finishCell.querySelector('div[id^="officeFinishDateTime_"]'));
    }

    if (hoursCell) {
      console.log("⏱️ Hours Cell:");
      console.log("  - Texto actual:", hoursCell.textContent.trim());
      console.log("  - data-original-value:", hoursCell.getAttribute("data-original-value"));
      console.log("  - data-backup-value:", hoursCell.getAttribute("data-backup-value"));
    }

    if (actionCell) {
      const button = actionCell.querySelector('button');
      if (button) {
        console.log("🔘 Action Button:");
        console.log("  - data-action:", button.getAttribute("data-action"));
        console.log("  - Texto:", button.textContent.trim());
        console.log("  - Clases:", button.className);
      }
    }

    // Verificar DateTimePicker instances globales
    console.log("🌐 Global DateTimePicker Instances:");
    console.log("  - window.officeTimeInstances:", window.officeTimeInstances);
    if (window.officeTimeInstances) {
      Object.keys(window.officeTimeInstances).forEach(key => {
        console.log(`    - ${key}:`, window.officeTimeInstances[key]);
      });
    }

    // Verificar event listeners
    console.log("⌨️ Keyboard Event Listeners:");
    console.log("  - handleEditKeydown presente:", !!this.handleEditKeydown);
    
    return {
      row,
      samplerCell,
      startCell,
      finishCell,
      hoursCell,
      actionCell,
      hasDateTimePickers: !!(startCell?.querySelector('div[id^="officeStartDateTime_"]') || finishCell?.querySelector('div[id^="officeFinishDateTime_"]')),
      hasDropdown: !!samplerCell?.querySelector('div[id^="samplerDropdown_"]'),
      isInEditMode: actionCell?.querySelector('button[data-action="save"]') !== null
    };
  }

  /**
   * 🆕 Debug: Verificar estado de Office Sampling (versión anterior)
   */
}

export default SamplingRosterController;
