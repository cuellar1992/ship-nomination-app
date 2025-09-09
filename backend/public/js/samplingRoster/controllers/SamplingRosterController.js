/**
 * Sampling Roster Controller - Modular Version
 * Coordinador principal que usa todos los servicios
 */

import { SAMPLING_ROSTER_CONSTANTS } from "../utils/Constants.js";
import DateUtils from "../utils/DateUtils.js";
import ApiService from "../services/ApiService.js";
import ValidationService from "../services/ValidationService.js";
import IncrementalSaveService from "../services/IncrementalSaveService.js";
import ScheduleCalculator from "../services/ScheduleCalculator.js";
import ValidationCacheService from "../services/ValidationCacheService.js";
import UIManager from "../ui/UIManager.js";
import TableManager from "../ui/TableManager.js";

export class SamplingRosterController {
  constructor() {
    // Servicios
    this.apiService = ApiService;
    this.validationService = ValidationService;
    this.autoSaveService = new IncrementalSaveService();
    this.scheduleCalculator = ScheduleCalculator;
    
    // 🚀 Cache service para optimizar validaciones
    this.validationCacheService = new ValidationCacheService();

    // UI Managers
    this.uiManager = new UIManager();
    this.tableManager = new TableManager();

    // Estado
    this.shipNominationsData = [];
    this.selectedShipNomination = null;
    this.isInitialized = false;
    this.baseURL = this.getBaseURL();
    this.samplersCache = [];

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

    // 🆕 CONFIGURAR DATETIMEPICKERS CON AUTO-SAVE UNA SOLA VEZ
    // (Este método crea los DateTimePickers Y configura el callback)
    this.setupDateTimePickersWithAutoSave();

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
              this.autoSaveService.setRosterId(result.data._id);
      await this.loadExistingRoster(result.data);

      Logger.success("Existing roster loaded", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: "Loaded existing sampling roster",
      });
    } else {
      // Preparar para nuevo roster: crear DRAFT inmediatamente
      this.autoSaveService.clearState();
      this.tableManager.clearLineSamplingTable();

      // Construir payload mínimo
      const dateTimeInstances = this.uiManager.getDateTimeInstances();
      const baseForStart = this.selectedShipNomination?.etb || new Date();
      const startDischarge = new Date(baseForStart);
      startDischarge.setHours(startDischarge.getHours() + SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET);
      const defaultHours = 12; // seguro para draft
      const dischargeTimeHours = this.getDischargeTimeHours() || defaultHours;
      const etcTime = new Date(startDischarge.getTime() + dischargeTimeHours * 3600 * 1000);

      const draftPayload = {
        shipNomination: this.selectedShipNomination._id,
        vesselName: this.selectedShipNomination.vesselName,
        amspecRef: this.selectedShipNomination.amspecRef,
        startDischarge: startDischarge,
        etcTime: etcTime,
        dischargeTimeHours: dischargeTimeHours,
        officeSampling: {
          sampler: {
            id: this.selectedShipNomination?.sampler?.id,
            name: this.selectedShipNomination?.sampler?.name || 'No Sampler Assigned'
          },
          startTime: this.selectedShipNomination?.pilotOnBoard || startDischarge,
          finishTime: this.selectedShipNomination?.pilotOnBoard 
            ? new Date(new Date(this.selectedShipNomination.pilotOnBoard).getTime() + 6 * 3600 * 1000)
            : new Date(startDischarge.getTime() + 6 * 3600 * 1000),
          hours: 6
        },
        lineSampling: [],
        status: 'draft',
        hasCustomStartDischarge: false,
        hasCustomETC: false,
        totalSamplers: 1,
        totalTurns: 0
      };

      const createResult = await this.apiService.createDraftRoster(draftPayload);
      if (createResult.success) {
        this.autoSaveService.setRosterId(createResult.data._id);
        await this.loadExistingRoster(createResult.data);
        Logger.success('Draft roster created', {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage: 'Draft roster created successfully'
        });
      } else {
        Logger.error('Failed to create draft roster', {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          error: createResult.error,
          showNotification: true,
          notificationMessage: 'Unable to create draft roster'
        });
      }
    }
  }

  /**
   * Cargar datos de roster existente
   */
  async loadExistingRoster(rosterData) {
    try {
      // Cargar tiempos en DateTimePickers
      const dateTimeInstances = this.uiManager.getDateTimeInstances();

      // 🔧 MEJORADO: Log de datos recibidos para debugging
      Logger.info("Loading existing roster data", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          hasStartDischarge: !!rosterData.startDischarge,
          hasETC: !!rosterData.etcTime,
          hasOfficeSampling: !!rosterData.officeSampling,
          hasLineSampling: rosterData.lineSampling?.length > 0,
          startDischargeValue: rosterData.startDischarge,
          etcValue: rosterData.etcTime,
          hasCustomETC: rosterData.hasCustomETC,
          hasCustomStartDischarge: rosterData.hasCustomStartDischarge
        },
        showNotification: false,
      });

      // 1️⃣ CARGAR START DISCHARGE - CORREGIDO PARA PERSISTENCIA
      if (rosterData.startDischarge) {
        // ✅ PRIORIDAD 1: Usar startDischarge guardado en roster (personalizado)
        const savedStartDischarge = new Date(rosterData.startDischarge);
        dateTimeInstances.startDischarge.setDateTime(savedStartDischarge);
        
        Logger.success("Start Discharge loaded from saved roster", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            startDischarge: rosterData.startDischarge,
            hasCustomStartDischarge: rosterData.hasCustomStartDischarge,
            originalStartDischarge: rosterData.originalShipNominationStartDischarge,
            source: "saved_roster"
          },
          showNotification: false,
        });
      } else if (rosterData.hasCustomStartDischarge && rosterData.originalShipNominationStartDischarge) {
        // ✅ PRIORIDAD 2: Si hay indicador de personalización, usar valor original personalizado
        const customStartDischarge = new Date(rosterData.originalShipNominationStartDischarge);
        dateTimeInstances.startDischarge.setDateTime(customStartDischarge);
        
        Logger.info("Start Discharge loaded from custom value indicator", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            customStartDischarge: rosterData.originalShipNominationStartDischarge,
            hasCustomStartDischarge: rosterData.hasCustomStartDischarge,
            source: "custom_indicator"
          },
          showNotification: false,
        });
      } else {
        // ✅ PRIORIDAD 3: Fallback - calcular desde ETB solo si no hay datos personalizados
        if (this.selectedShipNomination?.etb) {
          const calculatedStartDischarge = new Date(this.selectedShipNomination.etb);
          calculatedStartDischarge.setHours(
            calculatedStartDischarge.getHours() +
              SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET
          );
          
          dateTimeInstances.startDischarge.setDateTime(calculatedStartDischarge);
          
          Logger.info("Start Discharge calculated from ETB (fallback)", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: {
              etb: this.selectedShipNomination.etb,
              calculatedStartDischarge: calculatedStartDischarge.toISOString(),
              offset: SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET,
              source: "etb_calculation"
            },
            showNotification: false,
          });
        }
      }

      // 2️⃣ LÓGICA MEJORADA PARA ETC - PRIORIZAR ETC PERSONALIZADO - CORREGIDA
      if (rosterData.etcTime) {
        // ✅ PRIORIDAD 1: Usar ETC guardado en roster (personalizado)
        const savedETC = new Date(rosterData.etcTime);
        dateTimeInstances.etcTime.setDateTime(savedETC);

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
              source: "saved_roster_custom"
            },
            showNotification: true,
            notificationMessage: "Loaded roster with custom ETC timing",
          });
        } else {
          Logger.info("Loaded standard ETC from roster", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: { 
              etcTime: rosterData.etcTime,
              source: "saved_roster_standard"
            },
            showNotification: false,
          });
        }
      } else if (rosterData.hasCustomETC && rosterData.originalShipNominationETC) {
        // ✅ PRIORIDAD 2: Si hay indicador de personalización, usar valor original personalizado
        const customETC = new Date(rosterData.originalShipNominationETC);
        dateTimeInstances.etcTime.setDateTime(customETC);
        
        Logger.info("ETC loaded from custom value indicator", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            customETC: rosterData.originalShipNominationETC,
            hasCustomETC: rosterData.hasCustomETC,
            source: "custom_indicator"
          },
          showNotification: false,
        });
      } else if (this.selectedShipNomination?.etc) {
        // ✅ PRIORIDAD 3: Fallback - usar ETC del ship nomination solo si no hay datos personalizados
        const fallbackETC = new Date(this.selectedShipNomination.etc);
        dateTimeInstances.etcTime.setDateTime(fallbackETC);

        Logger.info("Using fallback ETC from ship nomination", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            fallbackETC: this.selectedShipNomination.etc,
            reason: "No ETC found in saved roster or custom indicators",
            source: "ship_nomination_fallback"
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

      // 6️⃣ 🔧 MEJORADO: VERIFICAR ESTADO FINAL DE LOS DATETIMEPICKERS
      const finalStartDischarge = dateTimeInstances.startDischarge?.getDateTime();
      const finalETC = dateTimeInstances.etcTime?.getDateTime();
      
      Logger.info("Final DateTimePicker state after loading roster", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          startDischarge: finalStartDischarge?.toISOString(),
          etcTime: finalETC?.toISOString(),
          startDischargeValid: !!finalStartDischarge,
          etcTimeValid: !!finalETC
        },
        showNotification: false,
      });

      // 6️⃣ LOG RESUMEN DE CARGA
      Logger.success("Existing roster loaded successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          rosterId: this.autoSaveService.getRosterId(),
          vesselName: rosterData.vesselName,
          hasOfficeSampling: !!rosterData.officeSampling,
          lineSamplingTurns: rosterData.lineSampling?.length || 0,
          hasCustomETC: rosterData.hasCustomETC || false,
          hasCustomStartDischarge: rosterData.hasCustomStartDischarge || false,
          dischargeHours: rosterData.dischargeTimeHours || 0,
        },
        showNotification: false,
      });

    } catch (error) {
      Logger.error("Error loading existing roster", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
    }
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

    // 🔧 NUEVO: Verificar estado de DateTimePickers después de la configuración
    setTimeout(() => {
      const status = this.checkDateTimePickerStatus();
      
      Logger.info("Vessel info populated and DateTimePickers configured", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          vesselName: nomination.vesselName,
          dateTimePickerStatus: status
        },
        showNotification: false,
      });
    }, 100);

    // Auto-poblar Office Sampling SOLO si no hay roster existente (nuevo)
    if (!this.autoSaveService.getRosterId()) {
      this.tableManager.autoPopulateOfficeSampling(nomination);
    }
    this.setupTableEventListeners();
  }

  /**
   * Configurar fechas iniciales en DateTimePickers
   * 🔧 CORREGIDO: No sobrescribir valores personalizados existentes
   */
  setupInitialDateTimes(nomination) {
    try {
      const dateTimeInstances = this.uiManager.getDateTimeInstances();
      const currentRosterId = this.autoSaveService.getRosterId();

      // ✅ SOLO CONFIGURAR SI NO HAY ROSTER EXISTENTE (evitar sobrescribir valores personalizados)
      if (currentRosterId) {
        Logger.info("Skipping initial date setup - roster exists", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { 
            currentRosterId: currentRosterId,
            reason: "loadExistingRoster() will handle date configuration"
          },
          showNotification: false,
        });
        return;
      }

      // ✅ CONFIGURACIÓN SOLO PARA ROSTERES NUEVOS
      const baseForStart = nomination.etb;
      if (baseForStart) {
        // Start Discharge = ETB + 3 horas (solo para rosteres nuevos)
        const startDischargeTime = new Date(baseForStart);
        startDischargeTime.setHours(
          startDischargeTime.getHours() +
            SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET
        );
        
        // 🔧 CORREGIDO: Establecer fecha y marcar como válida
        dateTimeInstances.startDischarge.setDateTime(startDischargeTime);
        
        Logger.info("Start Discharge time set from ETB (new roster)", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { 
            etb: nomination.etb,
            startDischarge: startDischargeTime.toISOString(),
            offset: SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET,
            context: "new_roster_initial_setup"
          },
          showNotification: false,
        });
      }

      // ✅ ETC solo para rosteres nuevos
      if (nomination.etc) {
        dateTimeInstances.etcTime.setDateTime(new Date(nomination.etc));

        Logger.info("Set initial ETC from ship nomination (new roster)", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { 
            initialETC: nomination.etc,
            context: "new_roster_initial_setup"
          },
          showNotification: false,
        });
      }

      // 🔧 MEJORADO: Verificar estado final de los DateTimePickers
      const finalStartDischarge = dateTimeInstances.startDischarge?.getDateTime();
      const finalETC = dateTimeInstances.etcTime?.getDateTime();
      
      Logger.success("Initial DateTimePicker configuration completed (new roster)", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          startDischarge: finalStartDischarge?.toISOString(),
          etcTime: finalETC?.toISOString(),
          startDischargeValid: !!finalStartDischarge,
          etcTimeValid: !!finalETC,
          hasRosterId: !!currentRosterId,
          context: "new_roster_initial_setup"
        },
        showNotification: false,
      });

    } catch (error) {
      Logger.error("Error setting up initial date times", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
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

    // 3️⃣ CAMPO DISCHARGE TIME HOURS - TRIGGER CON DEBOUNCE CUANDO VALIDE (>=7)
    const dischargeTimeField = document.getElementById("dischargeTimeHours");
    if (dischargeTimeField) {
      dischargeTimeField.addEventListener("input", () => {
        this.calculateAndUpdateETC();
        const hoursVal = parseFloat(dischargeTimeField.value);
        if (!isNaN(hoursVal) && hoursVal >= 7) {
          // Guardado incremental con debounce
          this.autoSaveService.trigger('timeUpdate', {
            startDischarge: this.uiManager.getDateTimeInstances().startDischarge?.getDateTime(),
            etcTime: this.uiManager.getDateTimeInstances().etcTime?.getDateTime(),
            dischargeTimeHours: hoursVal,
            hasCustomStartDischarge: false,
            hasCustomETC: false
          }); // sin immediate => debounce
        }
      });

      // Guardado al perder foco si el valor es válido
      dischargeTimeField.addEventListener("blur", () => {
        const hoursVal = parseFloat(dischargeTimeField.value);
        if (!isNaN(hoursVal) && hoursVal >= 7) {
          this.autoSaveService.trigger('timeUpdate', {
            startDischarge: this.uiManager.getDateTimeInstances().startDischarge?.getDateTime(),
            etcTime: this.uiManager.getDateTimeInstances().etcTime?.getDateTime(),
            dischargeTimeHours: hoursVal,
            hasCustomStartDischarge: false,
            hasCustomETC: false
          }, { immediate: true });
        }
      });
    }

    // 4️⃣ 🆕 SETUP DATETIMEPICKERS CON AUTO-SAVE ETC - MOVIDO A createUIComponents()

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

  // Detectar terminal Ampol Kurnell de forma segura (case-insensitive)
  isAmpolKurnell(nomination) {
    try {
      // If berth is one of K-1, K-2, K-3, treat as Ampol Kurnell
      const berthRaw = (nomination?.berth?.name || nomination?.berthName || nomination?.berth || '').toString().toLowerCase();
      const normalized = berthRaw.replace(/\s+/g, '');
      const isKurnellBerth = ['k-1','k-2','k-3','k1','k2','k3'].some(code => normalized === code);
      if (isKurnellBerth) return true;

      // Fallback tolerant check if full terminal text is ever present
      const hasAmpol = berthRaw.includes('ampol') || berthRaw.includes('ampo');
      const hasKurnell = berthRaw.includes('kurnell') || berthRaw.includes('kurnel') || berthRaw.includes('kurn');
      return hasAmpol && hasKurnell;
    } catch {
      return false;
    }
  }

  // 🆕 Detectar si el producto es Base Oils
  isBaseOils(nomination) {
    try {
      // Verificar si productTypes contiene "Base Oils"
      const productTypes = nomination?.productTypes || [];
      
      // Buscar en el array de productos
      const hasBaseOils = productTypes.some(product => {
        const productName = (product?.name || product || '').toString().toLowerCase();
        return productName.includes('base oil') || productName.includes('baseoil') || productName.includes('base-oil');
      });

      Logger.debug('Base Oils detection', {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          hasBaseOils: hasBaseOils,
          productTypes: productTypes.map(p => p?.name || p).join(', ')
        },
        showNotification: false,
      });

      return hasBaseOils;
    } catch (error) {
      Logger.warn('Error detecting Base Oils', {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
      return false;
    }
  }

  // 🆕 Helper para generar una sola línea de Line Sampling (usado por Ampol Kurnell y Base Oils)
  generateSingleLineSamplingRow(caseType) {
    const nomination = this.selectedShipNomination;
    const samplerName = nomination?.sampler?.name || 'No Sampler Assigned';

    const etcFromPicker = this.uiManager.getDateTimeInstances()?.etcTime?.getDateTime?.();
    const etcFromNomination = nomination?.etc ? new Date(nomination.etc) : null;
    const startDate = etcFromPicker || etcFromNomination;

    if (!startDate || isNaN(startDate.getTime())) {
      Logger.warn('ETC not available. Please set ETC first.', {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: true,
        notificationMessage: 'Please set ETC time before Auto Generate'
      });
      return false;
    }

    const finishDate = new Date(startDate);
    finishDate.setHours(finishDate.getHours() + 4);

    const startTime = this.tableManager.formatDateTime(startDate);
    const finishTime = this.tableManager.formatDateTime(finishDate);

    this.tableManager.clearLineSamplingTable();
    this.tableManager.populateLineSamplingTable([
      { samplerName, startTime, finishTime, hours: 4 }
    ]);
    this.setupTableEventListeners();

    this.autoSaveService.trigger('autoGenerate', {
      lineSampling: [
        {
          sampler: { id: nomination?.sampler?.id || null, name: samplerName },
          startTime: startDate,
          finishTime: finishDate,
          hours: 4,
          blockType: 'day',
          turnOrder: 0
        }
      ],
      dischargeTimeHours: parseInt(document.getElementById('dischargeTimeHours')?.value) || 0
    }, { immediate: true });

    const message = caseType === 'Ampol Kurnell' 
      ? 'Line Sampling initialized: ETC → ETC + 4h'
      : 'Line Sampling initialized: ETC → ETC + 4h (Base Oils)';

    Logger.success(`Generated single Line Sampling row for ${caseType}`, {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: true,
      notificationMessage: message
    });

    return true;
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

    // 🔧 CORREGIDO: Validación más robusta
    if (!startDischarge || !etcTime) {
      Logger.debug("DateTime sequence validation skipped - missing data", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          hasStartDischarge: !!startDischarge,
          hasETC: !!etcTime
        },
        showNotification: false,
      });
      return true; // No fallar si faltan datos
    }

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
    } else {
      Logger.debug("DateTime sequence validation passed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          startDischarge: startDischarge.toISOString(),
          etcTime: etcTime.toISOString(),
          timeDiff: etcTime.getTime() - startDischarge.getTime()
        },
        showNotification: false,
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
      // No enviar PUT mientras el usuario teclea un primer dígito (p. ej. queda en 6)
      if (typeof dischargeHours === 'number' && dischargeHours >= 7) {
        this.autoSaveService.trigger('timeUpdate', {
          startDischarge: startDischarge,
          etcTime: etcTime,
          dischargeTimeHours: dischargeHours,
          hasCustomStartDischarge: false,
          hasCustomETC: false
        }); // sin immediate => debounce
      }
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
    try {
      // 🔧 MEJORADO: Log del inicio del proceso
      Logger.info("Auto Generate process started", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          vesselName: this.selectedShipNomination?.vesselName,
          hasRosterId: !!this.autoSaveService.getRosterId()
        },
        showNotification: false,
      });

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

      // For standard flow we validate discharge hours; Ampol Kurnell branch handled later
      const dischargeHours = this.getDischargeTimeHours();
      if (!this.isAmpolKurnell(this.selectedShipNomination)) {
        const hoursValidation = this.validationService.validateDischargeTimeHours(dischargeHours);
        if (!hoursValidation.isValid) {
          Logger.warn(hoursValidation.message, {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            showNotification: true,
            notificationMessage: hoursValidation.message,
          });
          return;
        }
      }

      // 🔧 MEJORADO: Verificar estado actual de los DateTimePickers antes de generar
      const dateTimeInstances = this.uiManager.getDateTimeInstances();
      const currentStartDischarge = dateTimeInstances.startDischarge?.getDateTime();
      const currentETC = dateTimeInstances.etcTime?.getDateTime();
      
      Logger.info("Current DateTimePicker state before auto-generate", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          startDischarge: currentStartDischarge?.toISOString(),
          etcTime: currentETC?.toISOString(),
          dischargeHours: dischargeHours,
          hasValidData: !!(currentStartDischarge && currentETC)
        },
        showNotification: false,
      });

      // 🔧 Special cases: Ampol Kurnell o Base Oils → solo crear primera línea (start=ETC, finish=ETC+4h)
      if (this.selectedShipNomination) {
        const isKurnell = this.isAmpolKurnell(this.selectedShipNomination);
        const isBaseOil = this.isBaseOils(this.selectedShipNomination);
        
        if (isKurnell || isBaseOil) {
          const caseType = isKurnell ? 'Ampol Kurnell' : 'Base Oils';
          const success = this.generateSingleLineSamplingRow(caseType);
          
          if (success) {
            return; // Salir aquí para evitar la lógica normal
          }
          // Si falló (ej: no hay ETC), continuar con el flujo normal será bloqueado por validaciones
        }
      }

      // 🔧 MEJORADO: Guardar cambios pendientes antes de generar el roster
      if (this.autoSaveService.hasUnsaved()) {
        Logger.info("Saving pending changes before auto-generate", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: false,
        });
        
        // Forzar guardado inmediato de cambios pendientes
        await new Promise((resolve) => {
          this.autoSaveService.trigger('generalUpdate', {
            startDischarge: this.uiManager.getDateTimeInstances().startDischarge?.getDateTime(),
            etcTime: this.uiManager.getDateTimeInstances().etcTime?.getDateTime(),
            dischargeTimeHours: parseInt(document.getElementById("dischargeTimeHours")?.value) || 0
          }, { immediate: true });
          resolve();
        });
      }

      // 🚀 OPTIMIZACIÓN: Precargar cache de validaciones antes de generar
      Logger.info("Preloading validation cache for auto-generate", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        showNotification: false,
      });

      // Generar el schedule
      await this.generateLineSamplingSchedule(dischargeHours);
      
      // 🔧 MEJORADO: Guardar el roster completo después de generar
      const mappedLineTurns = await this.buildLineSamplingPayloadFromTable();
      this.autoSaveService.trigger('autoGenerate', {
        lineSampling: mappedLineTurns,
        dischargeTimeHours: parseInt(document.getElementById("dischargeTimeHours")?.value) || 0
      }, { immediate: true });

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
      this.autoSaveService.getRosterId() // Agregar currentRosterId
    );

    this.tableManager.populateLineSamplingTable(lineTurns);
    this.setupTableEventListeners();
  }

  /**
   * 🆕 Obtener datos del roster actual para triggers incrementales
   */
  getCurrentRosterData() {
    try {
      const officeData = this.tableManager.getOfficeSamplingData();
      const lineData = this.tableManager.getCurrentLineTurns();
      const dateTimeInstances = this.uiManager.getDateTimeInstances();
      
      return {
        officeSampling: officeData,
        lineSampling: lineData,
        startDischarge: dateTimeInstances.startDischarge?.getDateTime(),
        etcTime: dateTimeInstances.etcTime?.getDateTime(),
        dischargeTimeHours: this.getDischargeTimeHours()
      };
    } catch (error) {
      Logger.error("Error getting current roster data", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
      return null;
    }
  }

  /**
   * Recopilar datos actuales del roster (DEPRECATED - usar getCurrentRosterData)
   */
  collectCurrentRosterData() {
    try {
      const officeData = this.tableManager.getOfficeSamplingData();
      
      // 🔧 NUEVO: Log detallado de officeData para debugging
      Logger.debug("Office Sampling data retrieved", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          officeData: officeData,
          hasOfficeData: !!officeData,
          startTime: officeData?.startTime,
          finishTime: officeData?.finishTime,
          hours: officeData?.hours,
          samplerName: officeData?.samplerName
        },
        showNotification: false,
      });
      
      const lineData = this.tableManager.getCurrentLineTurns();
      const dischargeHours = this.getDischargeTimeHours();
      const dateTimeInstances = this.uiManager.getDateTimeInstances();
      const startDischarge = dateTimeInstances.startDischarge?.getDateTime();
      const etcTime = dateTimeInstances.etcTime?.getDateTime();

      // 🔧 MEJORADO: Validación de datos críticos
      if (!startDischarge || !etcTime) {
        Logger.warn("Missing critical DateTimePicker data", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            hasStartDischarge: !!startDischarge,
            hasETC: !!etcTime,
            startDischargeValue: startDischarge?.toISOString(),
            etcValue: etcTime?.toISOString()
          },
          showNotification: false,
        });
      }

      // 🆕 DETECTAR SI ETC HA SIDO PERSONALIZADO
      const originalETC = this.selectedShipNomination?.etc
        ? new Date(this.selectedShipNomination.etc)
        : null;
      const hasCustomETC =
        etcTime &&
        originalETC &&
        Math.abs(etcTime.getTime() - originalETC.getTime()) > 60000; // Diferencia > 1 minuto

      // 🔧 MEJORADO: DETECTAR SI START DISCHARGE HA SIDO PERSONALIZADO - CORREGIDO
      let hasCustomStartDischarge = false;
      let originalStartDischarge = null;
      
      if (this.selectedShipNomination?.etb && startDischarge) {
        const calculatedStartDischarge = new Date(this.selectedShipNomination.etb);
        calculatedStartDischarge.setHours(
          calculatedStartDischarge.getHours() +
            SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET
        );
        
        // ✅ DETECCIÓN MÁS PRECISA: Diferencia > 1 minuto para considerar personalizado
        const timeDifference = Math.abs(startDischarge.getTime() - calculatedStartDischarge.getTime());
        hasCustomStartDischarge = timeDifference > 60000; // 1 minuto = 60,000 ms
        
        if (hasCustomStartDischarge) {
          // ✅ GUARDAR EL VALOR PERSONALIZADO ACTUAL, NO el calculado
          originalStartDischarge = startDischarge.toISOString();
          
          Logger.info("Custom Start Discharge detected", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: {
              calculatedFromETB: calculatedStartDischarge.toISOString(),
              customValue: startDischarge.toISOString(),
              differenceMinutes: Math.round(timeDifference / (1000 * 60)),
              differenceHours: Math.round(timeDifference / (1000 * 60 * 60) * 100) / 100,
              willBePersisted: true
            },
            showNotification: false,
          });
        } else {
          // ✅ NO personalizado: usar el valor calculado estándar
          originalStartDischarge = calculatedStartDischarge.toISOString();
          
          Logger.debug("Start Discharge using standard calculation", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: {
              calculatedFromETB: calculatedStartDischarge.toISOString(),
              currentValue: startDischarge.toISOString(),
              differenceMinutes: Math.round(timeDifference / (1000 * 60)),
              willBePersisted: false
            },
            showNotification: false,
          });
        }
      }

      // 🆕 LOG DE DEBUG PARA TRACKING MEJORADO
      if (hasCustomETC || hasCustomStartDischarge) {
        Logger.info("Custom DateTime values detected in roster data", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            hasCustomETC: hasCustomETC,
            hasCustomStartDischarge: hasCustomStartDischarge,
            originalETC: originalETC?.toISOString(),
            customETC: etcTime?.toISOString(),
            originalStartDischarge: originalStartDischarge,
            customStartDischarge: startDischarge?.toISOString(),
            etcDifferenceHours: hasCustomETC ? Math.round(
              (etcTime.getTime() - originalETC.getTime()) / (1000 * 60 * 60)
            ) : 0,
            startDischargeDifferenceHours: hasCustomStartDischarge ? Math.round(
              (startDischarge.getTime() - new Date(originalStartDischarge).getTime()) / (1000 * 60 * 60)
            ) : 0,
            vesselName: this.selectedShipNomination?.vesselName
          },
          showNotification: false,
        });
      }

      const rosterData = {
        shipNomination: String(this.selectedShipNomination._id),
        vesselName: this.selectedShipNomination.vesselName,
        amspecRef: this.selectedShipNomination.amspecRef,
        startDischarge: startDischarge,
        etcTime: etcTime, // 🆕 ETC personalizado del formulario
        dischargeTimeHours: dischargeHours || 0,
        totalTurns: lineData.length,
        totalSamplers: new Set(lineData.map((t) => t.samplerName)).size,

        // 🆕 NUEVAS PROPIEDADES PARA TRACKING DE ETC Y START DISCHARGE
        hasCustomETC: hasCustomETC,
        hasCustomStartDischarge: hasCustomStartDischarge,
        originalShipNominationETC: this.selectedShipNomination?.etc || null,
        originalShipNominationStartDischarge: originalStartDischarge,
        etcModificationTimestamp: hasCustomETC ? new Date().toISOString() : null,
        startDischargeModificationTimestamp: hasCustomStartDischarge ? new Date().toISOString() : null,

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
              hours: officeData.hours,
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

      // 🔧 MEJORADO: Log de datos recopilados para debugging - CORREGIDO
      Logger.success("Roster data collected successfully", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          hasOfficeSampling: !!rosterData.officeSampling,
          hasLineSampling: rosterData.lineSampling.length > 0,
          startDischarge: rosterData.startDischarge?.toISOString(),
          etcTime: rosterData.etcTime?.toISOString(),
          totalTurns: rosterData.totalTurns,
          hasCustomValues: hasCustomETC || hasCustomStartDischarge,
          customizations: {
            startDischarge: {
              isCustom: hasCustomStartDischarge,
              originalValue: rosterData.originalShipNominationStartDischarge,
              customValue: rosterData.startDischarge?.toISOString(),
              willPersist: hasCustomStartDischarge
            },
            etc: {
              isCustom: hasCustomETC,
              originalValue: rosterData.originalShipNominationETC,
              customValue: rosterData.etcTime?.toISOString(),
              willPersist: hasCustomETC
            }
          },
          persistenceInfo: {
            willPersistStartDischarge: hasCustomStartDischarge,
            willPersistETC: hasCustomETC,
            needsAutoSave: hasCustomETC || hasCustomStartDischarge,
            autoSaveTriggered: true
          }
        },
        showNotification: false,
      });

      return rosterData;

    } catch (error) {
      Logger.error("Error collecting roster data", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
      
      // Retornar datos mínimos en caso de error
      return {
        shipNomination: String(this.selectedShipNomination?._id || ''),
        vesselName: this.selectedShipNomination?.vesselName || '',
        amspecRef: this.selectedShipNomination?.amspecRef || '',
        startDischarge: null,
        etcTime: null,
        dischargeTimeHours: 0,
        totalTurns: 0,
        totalSamplers: 0,
        hasCustomETC: false,
        hasCustomStartDischarge: false,
        officeSampling: null,
        lineSampling: []
      };
    }
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

        // Trigger inmediato para cambios de Office Sampling
        const startDate = dateTimeResult.data.startDate || this.tableManager.parseDateTime?.(dateTimeResult.data.startTime) || this.parseLocalDateTime?.(dateTimeResult.data.startTime);
        const finishDate = dateTimeResult.data.finishDate || this.tableManager.parseDateTime?.(dateTimeResult.data.finishTime) || this.parseLocalDateTime?.(dateTimeResult.data.finishTime);
        this.autoSaveService.trigger('officeSamplingUpdate', {
          officeSampling: {
            sampler: { id: this.selectedShipNomination?.sampler?.id || null, name: newSamplerName },
            startTime: startDate,
            finishTime: finishDate,
            hours: parseFloat(dateTimeResult.data.hours) || 6
          }
        }, { immediate: true });
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

    // 🔍 DEBUG: Verificar si es fila 0 desde el inicio
    console.log("🔍 DEBUG: editLineSampler called for rowId:", rowId, "Is line-sampler-row-0?", rowId === "line-sampler-row-0");

    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) return;

    const samplerCell = row.querySelector("td:first-child");
    const actionCell = row.querySelector("td:last-child");
    const editButton = actionCell.querySelector('button[data-action="edit"]');

    if (!samplerCell || !editButton) return;

    // 🆕 GUARDAR VALORES ORIGINALES INMEDIATAMENTE (ANTES DE CUALQUIER ASYNC)
    const currentSampler = samplerCell.textContent.trim();
    samplerCell.setAttribute("data-original-value", currentSampler);
    
    if (rowId === "line-sampler-row-0") {
      const startCell = row.querySelector("td:nth-child(2)");
      const finishCell = row.querySelector("td:nth-child(3)");
      const hoursCell = row.querySelector("td:nth-child(4)");

      console.log("🔍 EMERGENCY SAVE: Saving original values IMMEDIATELY for rowId:", rowId);
      
      // 🛡️ GUARDAR EN EL TR PARA QUE NO SE PIERDAN AL MODIFICAR CELDAS
      if (startCell && !row.hasAttribute("data-original-start")) {
        const startHTML = startCell.innerHTML.trim();
        if (startHTML && !startHTML.includes('Select start time')) {
          row.setAttribute("data-original-start", startHTML);
          row.setAttribute("data-original-start-text", startCell.textContent.trim());
          console.log("🔍 EMERGENCY SAVED to TR - startCell:", startHTML);
        }
      }
      
      if (finishCell && !row.hasAttribute("data-original-finish")) {
        const finishHTML = finishCell.innerHTML.trim();
        if (finishHTML && !finishHTML.includes('Select finish time')) {
          row.setAttribute("data-original-finish", finishHTML);
          row.setAttribute("data-original-finish-text", finishCell.textContent.trim());
          console.log("🔍 EMERGENCY SAVED to TR - finishCell:", finishHTML);
        }
      }
      
      if (hoursCell && !row.hasAttribute("data-original-hours")) {
        const hoursText = hoursCell.textContent.trim();
        if (hoursText && hoursText !== "0") {
          row.setAttribute("data-original-hours", hoursText);
          console.log("🔍 EMERGENCY SAVED to TR - hoursCell:", hoursText);
        }
      }

      console.log("🔍 FINAL CHECK - Original values saved to TR:", {
        start: row.getAttribute("data-original-start"),
        finish: row.getAttribute("data-original-finish"), 
        hours: row.getAttribute("data-original-hours")
      });
    }

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

      // Ya se guardaron los valores originales arriba

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
      let hasDateTimeChanges = false;

      // 🆕 STEP 1: GUARDAR Y VALIDAR DATETIMEPICKERS (SOLO PRIMERA LÍNEA)
      if (rowId === "line-sampler-row-0") {
        // Verificar si hay DateTimePickers activos antes de deshabilitarlos
        const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
        const hasActiveDateTimePickers = row && (
          row.querySelector('div[id^="lineStartDateTime_"]') || 
          row.querySelector('div[id^="lineFinishDateTime_"]')
        );
        
        if (hasActiveDateTimePickers) {
          // Obtener valores originales para comparar
          const originalStartTime = row.querySelector("td:nth-child(2)")?.getAttribute("data-original-value");
          const originalFinishTime = row.querySelector("td:nth-child(3)")?.getAttribute("data-original-value");
          
          Logger.info("Original values retrieved for comparison", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: {
              originalStartTime: originalStartTime,
              originalFinishTime: originalFinishTime
            },
            showNotification: false
          });
          
          dateTimeResult = this.tableManager.disableLineSamplingDateTimeEdit(rowId);
          
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
          
          // Verificar si realmente hubo cambios en las fechas
          if (dateTimeResult.success && dateTimeResult.data) {
            const newStartTime = dateTimeResult.data.startTime;
            const newFinishTime = dateTimeResult.data.finishTime;
            
            hasDateTimeChanges = (
              newStartTime !== originalStartTime || 
              newFinishTime !== originalFinishTime
            );
            
            Logger.info("DateTime change detection for row 0", {
              module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
              data: {
                originalStartTime: originalStartTime,
                originalFinishTime: originalFinishTime,
                newStartTime: newStartTime,
                newFinishTime: newFinishTime,
                hasDateTimeChanges: hasDateTimeChanges,
                startTimeChanged: newStartTime !== originalStartTime,
                finishTimeChanged: newFinishTime !== originalFinishTime
              },
              showNotification: false
            });
          }
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
        // Trigger inmediato para cambios de Line Sampling
        await this.ensureSamplersCache();
        const samplerEntity = this.findSamplerByName(newSamplerName);
        const turnOrder = parseInt(rowId.replace('line-sampler-row-', ''));
        const currentTurnData = this.tableManager.getLineTurnByIndex?.(turnOrder) || null;

        // 🔧 DEBUG: Log de la lógica de decisión
        Logger.info("Line sampler save logic decision", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            hasDateTimeChanges: hasDateTimeChanges,
            samplerChanged: newSamplerName !== originalValue,
            willUseAutoGenerate: rowId === 'line-sampler-row-0' && hasDateTimeChanges,
            willUseLineTurnUpdate: !(rowId === 'line-sampler-row-0' && hasDateTimeChanges)
          },
          showNotification: false
        });

        if (rowId === 'line-sampler-row-0' && hasDateTimeChanges) {
          // ESCENARIO 3: Primera línea con cambio de tiempos (y posiblemente sampler): persistir schedule completo
          // Actualizar sampler en la fila actual antes de mapear
          if (currentTurnData) {
            currentTurnData.samplerName = newSamplerName;
          }
          const mappedLineTurns = await this.buildLineSamplingPayloadFromTable();
          const dischargeField = document.getElementById('dischargeTimeHours');
          const dischargeTimeHours = dischargeField ? parseFloat(dischargeField.value) || 0 : 0;
          this.autoSaveService.trigger('autoGenerate', {
            lineSampling: mappedLineTurns,
            dischargeTimeHours: dischargeTimeHours
          }, { immediate: true });
        } else {
          // Otras líneas o sin cambio de tiempos: solo update de la línea
          let startTime, finishTime, hours, blockType;
          
          if (rowId === 'line-sampler-row-0') {
            // ESCENARIO 1: Fila 0 solo con cambio de sampler (sin cambios de fecha)
            // Obtener datos actuales de la tabla
            const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
            if (row) {
              const cells = row.querySelectorAll("td");
              startTime = this.parseToDate(cells[1]?.textContent?.trim());
              finishTime = this.parseToDate(cells[2]?.textContent?.trim());
              hours = parseFloat(cells[3]?.textContent?.trim()) || 0;
            }
            blockType = this.mapHourToBlockType(startTime);
          } else {
            // Para otras filas, usar la lógica original
            startTime = this.uiManager.getDateTimeInstances()[`lineStart_${rowId}`]?.getDateTime()
              || this.parseToDate(dateTimeResult.data?.startTime)
              || this.parseToDate(currentTurnData?.startTime);
            finishTime = this.uiManager.getDateTimeInstances()[`lineFinish_${rowId}`]?.getDateTime()
              || this.parseToDate(dateTimeResult.data?.finishTime)
              || this.parseToDate(currentTurnData?.finishTime);
            hours = (typeof dateTimeResult.data?.hours === 'number' ? dateTimeResult.data.hours : null)
              || (currentTurnData ? currentTurnData.hours : 0)
              || (startTime && finishTime ? DateUtils.getHoursBetween(startTime, finishTime) : 0);
            blockType = this.mapHourToBlockType(startTime);
          }

          const saveResult = await this.autoSaveService.trigger('lineTurnUpdate', {
            rowId: rowId,
            turn: {
              sampler: { id: samplerEntity?._id || samplerEntity?.id || null, name: newSamplerName },
              startTime: startTime,
              finishTime: finishTime,
              hours: hours,
              blockType: blockType,
              turnOrder: turnOrder
            }
          }, { immediate: true });
          
          // 🔧 ACTUALIZAR UI DESPUÉS DE SAVE EXITOSO
          if (saveResult && saveResult.success) {
            this.updateLineSamplingRowAfterSave(rowId, newSamplerName, startTime, finishTime, hours);
          }
        }
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
      const currentRosterId = this.autoSaveService.getRosterId();

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

      // ✅ VALIDACIÓN 1: DESCANSO MÍNIMO (ESTRICTA para auto-generate, FLEXIBLE para edición manual)
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
        // 🔧 NUEVO: Detectar si es edición manual para mostrar modal de emergencia
        const isManualEdit = this.isManualSamplerEdit(excludeRowId);
        
        if (isManualEdit) {
          // Mostrar modal de emergencia para edición manual
          const emergencyConfirmed = await this.showEmergencyRestWarningModal(
            samplerName, 
            restValidation
          );
          
          if (!emergencyConfirmed) {
            return {
              isValid: false,
              message: `❌ ${restValidation.message}`,
              details: {
                rest: restValidation,
                type: "USER_CANCELLED",
              },
            };
          }
          
          // Usuario confirmó emergencia, continuar con validación
        } else {
          // Auto-generate: mantener validación estricta
          return {
            isValid: false,
            message: `❌ ${restValidation.message}`,
            details: {
              rest: restValidation,
              type: "STRICT_VIOLATION",
            },
          };
        }
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

      // ✅ VALIDACIÓN 3: RESTRICCIÓN DE DÍAS DE LA SEMANA (ESTRICTA)
      const dayRestrictionValidation =
        await ValidationService.validateSamplerDayRestriction(
          samplerName,
          startTime,
          currentRosterId
        );

      if (!dayRestrictionValidation.isValid) {
        return {
          isValid: false,
          message: `❌ ${dayRestrictionValidation.message}`,
          details: {
            dayRestriction: dayRestrictionValidation,
            type: "STRICT_VIOLATION",
          },
        };
      }

      // ✅ VALIDACIÓN 4: LÍMITE SEMANAL (FLEXIBLE - advertencia + confirmación)
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

      // 🆕 STEP 3B: CANCELAR DATETIMEPICKERS (para fila 0 de Line Sampling)
      if (rowId === "line-sampler-row-0") {
        Logger.info("Debug: Cancelling DateTimePickers for line-sampler-row-0", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { rowId: rowId },
          showNotification: false,
        });
        
        const dateTimeCancelled = this.tableManager.cancelLineSamplingDateTimeEdit(rowId);
        
        Logger.info("Debug: Line DateTimePickers cancellation result", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            rowId: rowId,
            dateTimeCancelled: dateTimeCancelled !== false
          },
          showNotification: false,
        });
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
   * 🔧 DETECTAR SI ES EDICIÓN MANUAL DE SAMPLER
   * Verifica si el usuario está editando manualmente un sampler
   */
  isManualSamplerEdit(rowId) {
    try {
      // Verificar si hay un botón de "save" activo (indicando edición manual)
      const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (!row) return false;
      
      const saveButton = row.querySelector('button[data-action="save"]');
      const dropdownContainer = row.querySelector('div[id^="lineSamplerDropdown_"], div[id^="samplerDropdown_"]');
      
      // Es edición manual si hay botón save activo y dropdown visible
      return !!(saveButton && dropdownContainer);
      
    } catch (error) {
      Logger.error("Error detecting manual sampler edit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { rowId: rowId },
        showNotification: false
      });
      return false;
    }
  }

  /**
   * 🔧 ACTUALIZAR UI DESPUÉS DE SAVE EXITOSO
   * Actualiza la fila de line sampling después de un save exitoso
   */
  updateLineSamplingRowAfterSave(rowId, samplerName, startTime, finishTime, hours) {
    try {
      const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (!row) return;

      const cells = row.querySelectorAll("td");
      if (cells.length < 4) return;

      // Actualizar celda del sampler
      const samplerCell = cells[0];
      samplerCell.innerHTML = `<span class="fw-medium">${samplerName}</span>`;

      // Actualizar celdas de tiempo si se proporcionaron
      if (startTime && finishTime) {
        const startTimeFormatted = this.tableManager.formatDateTime(startTime);
        const finishTimeFormatted = this.tableManager.formatDateTime(finishTime);
        
        cells[1].textContent = startTimeFormatted;
        cells[2].textContent = finishTimeFormatted;
        cells[3].textContent = hours.toString();
      }

      Logger.info("Line sampling row updated after save", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          rowId: rowId,
          samplerName: samplerName,
          startTime: startTime,
          finishTime: finishTime,
          hours: hours
        },
        showNotification: false
      });

    } catch (error) {
      Logger.error("Error updating line sampling row after save", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false
      });
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
   * 🚨 Modal de advertencia de emergencia para turnos consecutivos
   */
  showEmergencyRestWarningModal(samplerName, restValidationData) {
    return new Promise((resolve) => {
      const { violatingShifts, message } = restValidationData;
      const previousTurn = violatingShifts?.previous;
      const newTurn = violatingShifts?.current;
      
      // Calcular tiempo de descanso
      const restHours = previousTurn && newTurn ? 
        (new Date(newTurn.start) - new Date(previousTurn.end)) / (1000 * 60 * 60) : 0;

      // Crear modal HTML usando el estilo del sistema
      const modalHtml = `
        <div class="modal fade" id="emergencyRestWarningModal" tabindex="-1" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-light border-danger">
              <div class="modal-header border-danger">
                <h5 class="modal-title">
                  <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                  Emergency Assignment Warning
                </h5>
              </div>
              <div class="modal-body">
                <div class="text-center mb-3">
                  <i class="fas fa-user-clock text-danger" style="font-size: 3rem;"></i>
                </div>
                <p class="text-center mb-3">
                  <strong>${samplerName}</strong> will be assigned to consecutive shifts
                </p>
                
                <!-- Detalles de turnos -->
                <div class="alert alert-danger">
                  <div class="row text-center mb-3">
                    <div class="col-6">
                      <strong>Previous Shift:</strong><br>
                      <small class="text-muted">Ends at</small><br>
                      <span class="fs-6">${previousTurn ? this.formatDateTimeForDisplay(previousTurn.end) : 'N/A'}</span>
                    </div>
                    <div class="col-6">
                      <strong>New Shift:</strong><br>
                      <small class="text-muted">Starts at</small><br>
                      <span class="fs-6">${newTurn ? this.formatDateTimeForDisplay(newTurn.start) : 'N/A'}</span>
                    </div>
                  </div>
                  <hr class="my-2">
                  <div class="text-center">
                    <strong>Rest Time:</strong><br>
                    <span class="fs-4 text-danger">${restHours.toFixed(1)}h</span>
                    <small class="text-muted d-block">(Minimum recommended: 10h)</small>
                  </div>
                </div>
                
                <div class="alert alert-warning">
                  <i class="fas fa-info-circle me-2"></i>
                  <strong>Emergency Override:</strong> This assignment violates minimum rest time requirements. 
                  Proceed only in emergency situations.
                </div>
              </div>
              <div class="modal-footer border-danger">
                <button type="button" class="btn btn-secondary" id="cancelEmergencyRestBtn">
                  <i class="fas fa-times me-1"></i>Cancel
                </button>
                <button type="button" class="btn btn-danger" id="confirmEmergencyRestBtn">
                  <i class="fas fa-exclamation-triangle me-1"></i>Emergency Override
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Remover modal anterior si existe
      const existingModal = document.getElementById("emergencyRestWarningModal");
      if (existingModal) {
        existingModal.remove();
      }

      // Agregar modal al DOM
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Obtener elementos
      const modal = document.getElementById("emergencyRestWarningModal");
      const cancelBtn = document.getElementById("cancelEmergencyRestBtn");
      const confirmBtn = document.getElementById("confirmEmergencyRestBtn");

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
   * 🔧 FORMATEAR FECHA PARA MOSTRAR EN MODAL
   * Formatea una fecha para mostrar en el modal de emergencia
   */
  formatDateTimeForDisplay(dateTime) {
    try {
      if (!dateTime) return 'N/A';
      
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return 'N/A';
      
      // Formato: DD/MM/YYYY HH:MM
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      Logger.error("Error formatting date for display", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { dateTime: dateTime },
        showNotification: false
      });
      return 'N/A';
    }
  }

  /**
   * 🔧 MÉTODO COMPLETO CORREGIDO - SamplingRosterController.js
   * REEMPLAZAR completamente el método recalculateLineSamplingFromFirstRow()
   */

  async recalculateLineSamplingFromFirstRow(firstLineData) {
    try {
      Logger.info("🔄 Smart recalculation: Line Sampling from first row", {
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
          message: "ETC not found in form. Please set ETC time in the vessel information.",
        };
      }

      const etcDate = new Date(etcFromForm);

      // 3️⃣ CALCULAR HORAS RESTANTES DESPUÉS DE LA PRIMERA LÍNEA
      const firstLineEnd = new Date(firstLineData.finishDate);
      const totalRemainingHours = Math.round((etcDate - firstLineEnd) / (1000 * 60 * 60));

      console.log(`🔍 SMART RECALC: Initial analysis:`, {
        etcDate: etcDate.toISOString(),
        firstLineEnd: firstLineEnd.toISOString(),
        totalRemainingHours: totalRemainingHours,
        currentTurnsCount: currentTurns.length,
        firstLineHours: firstLineData.hours
      });

      // 4️⃣ VALIDACIONES BÁSICAS
      if (totalRemainingHours < 0) {
        return {
          success: false,
          message: `First line ends after ETC. First line ends at ${firstLineEnd.toLocaleString()} but ETC is ${etcDate.toLocaleString()}`,
        };
      }

      if (totalRemainingHours === 0) {
        // Solo necesitamos la primera línea
        const finalTurns = [{
          samplerName: currentTurns[0].samplerName,
          startTime: this.tableManager.formatDateTime(firstLineData.startDate),
          finishTime: this.tableManager.formatDateTime(firstLineData.finishDate),
          hours: firstLineData.hours,
        }];

        this.tableManager.populateLineSamplingTable(finalTurns);
        this.setupTableEventListeners();

        Logger.success("Line Sampling optimized to single turn", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          showNotification: true,
          notificationMessage: "Schedule optimized: Only first turn needed"
        });

        return { success: true, data: finalTurns };
      }

      // 5️⃣ ESTRATEGIA INTELIGENTE: CALCULAR TURNOS ÓPTIMOS
      const optimalStrategy = this.calculateOptimalTurnStrategy(
        totalRemainingHours, 
        currentTurns.slice(1), // Samplers disponibles (sin la primera línea)
        firstLineEnd
      );

      console.log(`🔍 SMART RECALC: Optimal strategy:`, optimalStrategy);

      // 6️⃣ CONSTRUIR TURNOS FINALES
      const recalculatedTurns = [
        // Primera línea (ya modificada)
        {
          samplerName: currentTurns[0].samplerName,
          startTime: this.tableManager.formatDateTime(firstLineData.startDate),
          finishTime: this.tableManager.formatDateTime(firstLineData.finishDate),
          hours: firstLineData.hours,
        }
      ];

      // 7️⃣ AGREGAR TURNOS RESTANTES SEGÚN ESTRATEGIA
      let currentStartTime = new Date(firstLineEnd);

      for (let i = 0; i < optimalStrategy.turns.length; i++) {
        const turnInfo = optimalStrategy.turns[i];
        const isLastTurn = i === optimalStrategy.turns.length - 1;
        
        let turnEndTime;
        if (isLastTurn) {
          // Último turno termina exactamente en ETC
          turnEndTime = new Date(etcDate);
        } else {
          // Turnos intermedios
          turnEndTime = new Date(currentStartTime);
          turnEndTime.setHours(turnEndTime.getHours() + turnInfo.hours);
        }

        const actualHours = Math.round((turnEndTime - currentStartTime) / (1000 * 60 * 60));

        recalculatedTurns.push({
          samplerName: turnInfo.samplerName,
          startTime: this.tableManager.formatDateTime(currentStartTime),
          finishTime: this.tableManager.formatDateTime(turnEndTime),
          hours: actualHours,
        });

        currentStartTime = new Date(turnEndTime);
      }

      // 8️⃣ VALIDACIÓN FINAL
      const totalHours = recalculatedTurns.reduce((sum, turn) => sum + turn.hours, 0);
      const expectedHours = Math.round((etcDate - new Date(firstLineData.startDate)) / (1000 * 60 * 60));

      console.log(`🔍 SMART RECALC: Final validation:`, {
        totalCalculatedHours: totalHours,
        expectedTotalHours: expectedHours,
        finalTurns: recalculatedTurns.map((turn, idx) => ({
          index: idx,
          sampler: turn.samplerName,
          start: turn.startTime,
          finish: turn.finishTime,
          hours: turn.hours,
        })),
        turnsEliminated: currentTurns.length - recalculatedTurns.length
      });

      // 9️⃣ ACTUALIZAR LA TABLA
      this.tableManager.populateLineSamplingTable(recalculatedTurns);
      this.setupTableEventListeners();

      const message = currentTurns.length > recalculatedTurns.length 
        ? `Schedule optimized: ${currentTurns.length - recalculatedTurns.length} turns eliminated`
        : `Schedule recalculated (${recalculatedTurns.length} turns)`;

      Logger.success("Smart Line Sampling recalculation completed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          originalTurns: currentTurns.length,
          finalTurns: recalculatedTurns.length,
          turnsEliminated: currentTurns.length - recalculatedTurns.length,
          totalHours: totalHours
        },
        showNotification: true,
        notificationMessage: message
      });

      return { success: true, data: recalculatedTurns };

    } catch (error) {
      console.error(`🔍 SMART RECALC ERROR:`, {
        errorMessage: error.message,
        errorStack: error.stack,
        firstLineData: firstLineData,
        selectedShipNomination: this.selectedShipNomination,
      });

      Logger.error("Error in smart Line Sampling recalculation", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return {
        success: false,
        message: `Smart recalculation error: ${error.message}`,
      };
    }
  }

  /**
   * 🧠 ESTRATEGIA INTELIGENTE: Calcular distribución óptima de turnos
   */
  calculateOptimalTurnStrategy(remainingHours, availableSamplers, startTime) {
    console.log(`🧠 CALCULATING OPTIMAL STRATEGY:`, {
      remainingHours: remainingHours,
      availableSamplersCount: availableSamplers.length,
      availableSamplerNames: availableSamplers.map(s => s.samplerName),
      startTime: startTime.toISOString()
    });

    // Constantes para la estrategia
    const IDEAL_TURN_HOURS = 12;
    const MIN_TURN_HOURS = 1;
    const MAX_TURN_HOURS = 18;

    // CASO 1: Horas muy pocas (1-6 horas) → Un solo turno
    if (remainingHours <= 6) {
      return {
        strategy: 'single_turn',
        turns: [{
          samplerName: availableSamplers[0].samplerName,
          hours: remainingHours
        }],
        eliminated: availableSamplers.length - 1
      };
    }

    // CASO 2: Horas ideales para un turno (7-18 horas) → Un solo turno
    if (remainingHours <= MAX_TURN_HOURS) {
      return {
        strategy: 'single_optimal',
        turns: [{
          samplerName: availableSamplers[0].samplerName,
          hours: remainingHours
        }],
        eliminated: availableSamplers.length - 1
      };
    }

    // CASO 3: Necesitamos múltiples turnos
    // Calcular cuántos turnos necesitamos idealmente
    const idealTurns = Math.ceil(remainingHours / IDEAL_TURN_HOURS);
    const maxPossibleTurns = availableSamplers.length;
    const actualTurns = Math.min(idealTurns, maxPossibleTurns);

    console.log(`🧠 MULTI-TURN ANALYSIS:`, {
      idealTurns: idealTurns,
      maxPossibleTurns: maxPossibleTurns,
      actualTurns: actualTurns,
      avgHoursPerTurn: remainingHours / actualTurns
    });

    // Distribuir horas entre los turnos de manera inteligente
    const turns = [];
    let hoursLeft = remainingHours;

    for (let i = 0; i < actualTurns; i++) {
      const isLastTurn = i === actualTurns - 1;
      let turnHours;

      if (isLastTurn) {
        // Último turno toma todas las horas restantes
        turnHours = hoursLeft;
      } else {
        // Turnos intermedios: intentar 12h pero ajustar si es necesario
        const remainingTurns = actualTurns - i;
        const avgHoursForRemainingTurns = hoursLeft / remainingTurns;
        
        if (avgHoursForRemainingTurns <= IDEAL_TURN_HOURS) {
          // Si el promedio es ≤12h, usar el promedio
          turnHours = Math.round(avgHoursForRemainingTurns);
        } else {
          // Si el promedio es >12h, usar 12h para este turno
          turnHours = IDEAL_TURN_HOURS;
        }
      }

      // Validar límites
      turnHours = Math.max(MIN_TURN_HOURS, Math.min(MAX_TURN_HOURS, turnHours));

      turns.push({
        samplerName: availableSamplers[i].samplerName,
        hours: turnHours
      });

      hoursLeft -= turnHours;
    }

    // Ajuste final: si quedaron horas, agregar al último turno
    if (hoursLeft > 0) {
      turns[turns.length - 1].hours += hoursLeft;
    } else if (hoursLeft < 0) {
      // Si nos pasamos, reducir del último turno
      turns[turns.length - 1].hours += hoursLeft; // hoursLeft es negativo
    }

    const strategy = {
      strategy: actualTurns === 1 ? 'single_adjusted' : 'multi_turn_optimized',
      turns: turns,
      eliminated: availableSamplers.length - actualTurns,
      totalHours: turns.reduce((sum, t) => sum + t.hours, 0)
    };

    console.log(`🧠 FINAL STRATEGY:`, strategy);

    return strategy;
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
    // 🎯 CREAR DATETIMEPICKERS Y CONFIGURAR CALLBACK MEJORADO
    this.uiManager.createDateTimePickers((dateTime, pickerId) => {
      // ✅ PROTECCIÓN EXISTENTE: No ejecutar durante limpieza
      if (this.isClearing || !this.selectedShipNomination) {
        return;
      }

      try {
        // 🔧 CORREGIDO: Log del callback con pickerId
        Logger.debug("DateTimePicker callback triggered", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            dateTime: dateTime?.toISOString(),
            pickerId: pickerId,
            hasValidData: !!dateTime
          },
          showNotification: false,
        });

        // 🔄 VALIDACIONES EXISTENTES
        this.validateDateTimeSequence();
        this.calculateAndUpdateETC();

        // 🔧 MEJORADO: AUTO-SAVE INMEDIATO PARA TODOS LOS CAMBIOS CRÍTICOS
        const isETCChange = pickerId && pickerId.includes('etcTime');
        const isStartDischargeChange = pickerId && pickerId.includes('startDischarge');
        
        if (isETCChange || isStartDischargeChange) {
          // 🆕 AUTO-SAVE INMEDIATO PARA CAMBIOS CRÍTICOS (ETC y Start Discharge)
          
          // 🔧 MEJORADO: Obtener valores actuales de los DateTimePickers para logging más preciso
          const dateTimeInstances = this.uiManager.getDateTimeInstances();
          const currentStartDischarge = dateTimeInstances.startDischarge?.getDateTime();
          const currentETC = dateTimeInstances.etcTime?.getDateTime();
          
          // 🔧 MEJORADO: Calcular startDischarge original desde ETB si no está disponible
          let originalStartDischarge = null;
          if (this.selectedShipNomination?.etb) {
            const originalStartDischargeTime = new Date(this.selectedShipNomination.etb);
            originalStartDischargeTime.setHours(
              originalStartDischargeTime.getHours() +
                SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET
            );
            originalStartDischarge = originalStartDischargeTime.toISOString();
          }
          
          Logger.info("Critical DateTimePicker change detected, triggering immediate save", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: {
              newDateTime: dateTime?.toISOString(),
              pickerId: pickerId,
              changeType: isETCChange ? 'etcManualChange' : 'startDischargeChange',
              originalETC: this.selectedShipNomination?.etc,
              originalStartDischarge: originalStartDischarge,
              currentStartDischarge: currentStartDischarge?.toISOString(),
              currentETC: currentETC?.toISOString(),
              shipNominationETB: this.selectedShipNomination?.etb,
              vesselName: this.selectedShipNomination?.vesselName
            },
            showNotification: false,
          });

          // Trigger inmediato para cambios críticos de tiempo
          if (isETCChange) {
            this.autoSaveService.trigger('timeUpdate', {
              startDischarge: this.uiManager.getDateTimeInstances().startDischarge?.getDateTime(),
              etcTime: dateTime,
              dischargeTimeHours: parseInt(document.getElementById("dischargeTimeHours")?.value) || 0,
              hasCustomStartDischarge: false,
              hasCustomETC: true
            }, { immediate: true });
          } else {
            this.autoSaveService.trigger('timeUpdate', {
              startDischarge: dateTime,
              etcTime: this.uiManager.getDateTimeInstances().etcTime?.getDateTime(),
              dischargeTimeHours: parseInt(document.getElementById("dischargeTimeHours")?.value) || 0,
              hasCustomStartDischarge: true,
              hasCustomETC: false
            }, { immediate: true });
          }
        } else {
          // 🔄 AUTO-SAVE NORMAL PARA OTROS CAMBIOS (con delay reducido)
          this.autoSaveService.trigger('timeUpdate', {
            startDischarge: this.uiManager.getDateTimeInstances().startDischarge?.getDateTime(),
            etcTime: this.uiManager.getDateTimeInstances().etcTime?.getDateTime(),
            dischargeTimeHours: parseInt(document.getElementById("dischargeTimeHours")?.value) || 0,
            hasCustomStartDischarge: false,
            hasCustomETC: false
          }); // Sin immediate = con debounce
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

    if (window.samplingRosterExporter && typeof window.samplingRosterExporter.export === 'function') {
      window.samplingRosterExporter.export();
    }

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
   * 🔧 NUEVO: Verificar estado de DateTimePickers
   */
  checkDateTimePickerStatus() {
    const dateTimeInstances = this.uiManager.getDateTimeInstances();
    const status = {};

    if (dateTimeInstances.startDischarge) {
      status.startDischarge = {
        hasDateTime: !!dateTimeInstances.startDischarge.getDateTime(),
        hasValidDate: dateTimeInstances.startDischarge._hasValidDate,
        isDateSelected: dateTimeInstances.startDischarge._isDateSelected,
        selectedDateTime: dateTimeInstances.startDischarge.getDateTime()?.toISOString()
      };
    }

    if (dateTimeInstances.etcTime) {
      status.etcTime = {
        hasDateTime: !!dateTimeInstances.etcTime.getDateTime(),
        hasValidDate: dateTimeInstances.etcTime._hasValidDate,
        isDateSelected: dateTimeInstances.etcTime._isDateSelected,
        selectedDateTime: dateTimeInstances.etcTime.getDateTime()?.toISOString()
      };
    }

    Logger.debug("DateTimePicker status check", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: status,
      showNotification: false,
    });

    return status;
  }

  /**
   * 🔧 NUEVO: Debug de persistencia - Verificar que los datos se guarden correctamente
   */
  debugPersistenceStatus() {
    try {
      const currentRosterId = this.autoSaveService.getRosterId();
      const dateTimeInstances = this.uiManager.getDateTimeInstances();
      
      // Obtener datos actuales de los DateTimePickers
      const currentStartDischarge = dateTimeInstances.startDischarge?.getDateTime();
      const currentETC = dateTimeInstances.etcTime?.getDateTime();
      
      // Obtener datos del ship nomination para comparar
      const shipNominationETB = this.selectedShipNomination?.etb;
      const shipNominationETC = this.selectedShipNomination?.etc;
      
      // Calcular valores estándar
      let standardStartDischarge = null;
      if (shipNominationETB) {
        standardStartDischarge = new Date(shipNominationETB);
        standardStartDischarge.setHours(
          standardStartDischarge.getHours() +
            SAMPLING_ROSTER_CONSTANTS.DEFAULT_DISCHARGE_START_OFFSET
        );
      }
      
      // Detectar personalizaciones
      const hasCustomStartDischarge = currentStartDischarge && standardStartDischarge && 
        Math.abs(currentStartDischarge.getTime() - standardStartDischarge.getTime()) > 60000;
      
      const hasCustomETC = currentETC && shipNominationETC && 
        Math.abs(currentETC.getTime() - new Date(shipNominationETC).getTime()) > 60000;
      
      const persistenceReport = {
        timestamp: new Date().toISOString(),
        rosterId: currentRosterId,
        currentValues: {
          startDischarge: currentStartDischarge?.toISOString(),
          etcTime: currentETC?.toISOString()
        },
        shipNominationValues: {
          etb: shipNominationETB,
          etc: shipNominationETC,
          standardStartDischarge: standardStartDischarge?.toISOString()
        },
        customizations: {
          hasCustomStartDischarge: hasCustomStartDischarge,
          hasCustomETC: hasCustomETC,
          startDischargeDifference: hasCustomStartDischarge ? 
            Math.round((currentStartDischarge.getTime() - standardStartDischarge.getTime()) / (1000 * 60)) : 0,
          etcDifference: hasCustomETC ? 
            Math.round((currentETC.getTime() - new Date(shipNominationETC).getTime()) / (1000 * 60)) : 0
        },
        persistenceStatus: {
          willPersistStartDischarge: hasCustomStartDischarge,
          willPersistETC: hasCustomETC,
          needsAutoSave: hasCustomStartDischarge || hasCustomETC
        }
      };
      
      console.log('🔍 PERSISTENCE DEBUG REPORT:', persistenceReport);
      
      Logger.info("Persistence status debug report generated", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: persistenceReport,
        showNotification: false,
      });
      
      return persistenceReport;
      
    } catch (error) {
      Logger.error("Error generating persistence debug report", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
      
      return { error: error.message };
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
      this.autoSaveService.trigger('generalUpdate', {
        startDischarge: this.uiManager.getDateTimeInstances().startDischarge?.getDateTime(),
        etcTime: this.uiManager.getDateTimeInstances().etcTime?.getDateTime(),
        dischargeTimeHours: parseInt(document.getElementById("dischargeTimeHours")?.value) || 0,
        officeSampling: this.tableManager.getOfficeSamplingData(),
        lineSampling: this.tableManager.getCurrentLineTurns()
      }, { immediate: true });

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
  async ensureSamplersCache() {
    if (!this.samplersCache || this.samplersCache.length === 0) {
      const res = await this.apiService.loadSamplers();
      if (res.success) {
        this.samplersCache = res.data;
      } else {
        this.samplersCache = [];
      }
    }
    return this.samplersCache;
  }

  findSamplerByName(name) {
    if (!name) return null;
    const norm = String(name).trim().toLowerCase();
    return (this.samplersCache || []).find(s => String(s.name).trim().toLowerCase() === norm) || null;
  }

  mapHourToBlockType(dateObj) {
    try {
      if (!(dateObj instanceof Date)) return 'day';
      const h = dateObj.getHours();
      return h >= SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START && h < SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START ? 'day' : 'night';
    } catch (_) {
      return 'day';
    }
  }

  parseToDate(maybeString) {
    if (!maybeString) return null;
    if (maybeString instanceof Date) return maybeString;
    // Intentar parsear mediante utilidades existentes
    const parsedFromTable = this.tableManager?.parseDateTime?.(maybeString);
    if (parsedFromTable instanceof Date && !isNaN(parsedFromTable.getTime())) return parsedFromTable;
    const parsed = new Date(maybeString);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  async buildLineSamplingPayloadFromTable() {
    await this.ensureSamplersCache();
    const rows = this.tableManager.getCurrentLineTurns();
    const payload = [];
    rows.forEach((row, index) => {
      const start = this.parseToDate(row.startTime);
      const finish = this.parseToDate(row.finishTime);
      const hours = typeof row.hours === 'number' ? row.hours : parseFloat(row.hours) || 0;
      const samplerEntity = this.findSamplerByName(row.samplerName);
      const sampler = samplerEntity
        ? { id: samplerEntity._id || samplerEntity.id, name: samplerEntity.name }
        : { id: null, name: row.samplerName || 'No Sampler Assigned' };
      const blockType = this.mapHourToBlockType(start);
      payload.push({ sampler, startTime: start, finishTime: finish, hours, blockType, turnOrder: index });
    });
    return payload;
  }
}

export default SamplingRosterController;
