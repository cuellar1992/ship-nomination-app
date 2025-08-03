/**
 * Sampling Roster Main Controller - Sistema Independiente
 * ✅ SEPARADO COMPLETAMENTE del Ship Nominations System
 * ✅ Solo CONSUME datos de ship nominations (READ-ONLY)
 * ✅ No interfiere con funcionalidades existentes
 */

class SamplingRosterController {
  constructor() {
    this.shipNominationsData = []; // Cache de ship nominations (READ-ONLY)
    this.shipNominationSelector = null; // Instancia del SingleSelect
    this.selectedShipNomination = null; // Ship nomination seleccionado
    this.dateTimeInstances = {}; // Instancias de DateTimePicker
    this.isInitialized = false;
    this.currentRosterId = null; // null = nuevo, ObjectId = existente
    this.autoSaveTimeout = null;
    this.hasUnsavedChanges = false;
    this.isAutoSaveEnabled = true;
    this.saveStatus = "saved"; // 'saved', 'saving', 'unsaved'

    Logger.info(
      "SamplingRosterController initialized with backend integration",
      {
        module: "SamplingRoster",
        showNotification: false,
      }
    );
  }

  /**
   * Inicializar el sistema de Sampling Roster
   */
  async init() {
    try {
      Logger.info("Initializing Sampling Roster System", {
        module: "SamplingRoster",
        showNotification: false,
      });

      // Paso 1: Cargar datos desde la API de ship nominations (READ-ONLY)
      await this.loadShipNominations();

      // Paso 2: Crear el SingleSelect para seleccionar ship nominations
      this.createShipNominationSelector();

      // Paso 3: Crear DateTimePickers para Start Discharge y ETC
      this.createDateTimePickers();

      // Paso 4: Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;

      Logger.success("Sampling Roster System initialized successfully", {
        module: "SamplingRoster",
        data: {
          shipNominationsCount: this.shipNominationsData.length,
          hasSelector: !!this.shipNominationSelector,
          dateTimePickersCount: Object.keys(this.dateTimeInstances).length,
        },
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Failed to initialize Sampling Roster System", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage:
          "Failed to initialize Sampling Roster. Please refresh the page.",
      });
    }
  }

  /**
   * Cargar ship nominations desde la API (READ-ONLY)
   */
  async loadShipNominations() {
    try {
      Logger.info("Loading ship nominations data (READ-ONLY)", {
        module: "SamplingRoster",
        showNotification: false,
      });

      const response = await fetch("/api/shipnominations");
      const result = await response.json();

      if (result.success && result.data) {
        this.shipNominationsData = result.data;

        Logger.success("Ship nominations data loaded", {
          module: "SamplingRoster",
          data: { count: this.shipNominationsData.length },
          showNotification: false,
        });
      } else {
        throw new Error(result.message || "Failed to load ship nominations");
      }
    } catch (error) {
      Logger.error("Error loading ship nominations", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage:
          "Unable to load ship nominations. Please check your connection.",
      });

      // Fallback: array vacío
      this.shipNominationsData = [];
    }
  }

  /**
   * Crear DateTimePickers para Start Discharge y ETC
   */
  createDateTimePickers() {
    Logger.info("Creating DateTimePickers for sampling roster", {
      module: "SamplingRoster",
      showNotification: false,
    });

    // DateTimePicker para Start Discharge (sin label)
    this.dateTimeInstances.startDischarge = new DateTimePicker(
      "startDischarge",
      {
        icon: "fas fa-play-circle",
        label: "", // ✅ VACÍO - No mostrar label
        placeholder: "Select start discharge time...",
        modalTitle: "Select Start Discharge Time",
        format: "DD/MM/YYYY HH:mm",
        minuteStep: 15,
        is24Hour: true,
        defaultTime: { hour: 9, minute: 0 },
        onDateTimeChange: (dateTime) => {
          Logger.debug("Start Discharge time changed", {
            module: "SamplingRoster",
            hasValue: !!dateTime,
            showNotification: false,
          });
          this.validateDateTimeSequence();
          this.calculateAndUpdateETC();
        },
      }
    );

    // ✅ OCULTAR label después de crear la instancia
    setTimeout(() => {
      const startLabel = document.querySelector(
        "#startDischarge .datetime-picker-label"
      );
      if (startLabel) {
        startLabel.style.display = "none";
      }
    }, 100);

    // ✅ SOBRESCRIBIR método formatDateTime para usar /
    this.dateTimeInstances.startDischarge.formatDateTime = function (date) {
      if (!date) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    // DateTimePicker para ETC (sin label)
    this.dateTimeInstances.etcTime = new DateTimePicker("etcTime", {
      icon: "fas fa-flag-checkered",
      label: "", // ✅ VACÍO - No mostrar label
      placeholder: "Select completion time...",
      modalTitle: "Select Estimated Time of Completion",
      format: "DD/MM/YYYY HH:mm",
      minuteStep: 15,
      is24Hour: true,
      defaultTime: { hour: 18, minute: 0 },
      onDateTimeChange: (dateTime) => {
        Logger.debug("ETC time changed", {
          module: "SamplingRoster",
          hasValue: !!dateTime,
          showNotification: false,
        });
        this.validateDateTimeSequence();
      },
    });

    // ✅ OCULTAR label después de crear la instancia
    setTimeout(() => {
      const etcLabel = document.querySelector(
        "#etcTime .datetime-picker-label"
      );
      if (etcLabel) {
        etcLabel.style.display = "none";
      }
    }, 100);

    // ✅ SOBRESCRIBIR método formatDateTime para usar /
    this.dateTimeInstances.etcTime.formatDateTime = function (date) {
      if (!date) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    Logger.success("DateTimePickers created successfully", {
      module: "SamplingRoster",
      data: {
        startDischarge: !!this.dateTimeInstances.startDischarge,
        etcTime: !!this.dateTimeInstances.etcTime,
      },
      showNotification: false,
    });
  }
  createShipNominationSelector() {
    Logger.info("Creating ship nomination selector", {
      module: "SamplingRoster",
      showNotification: false,
    });

    // Preparar items para el selector (vessel name + amspec ref para identificación)
    const selectorItems = this.shipNominationsData.map((nomination) => {
      const displayText = nomination.amspecRef
        ? `${nomination.vesselName} (${nomination.amspecRef})`
        : nomination.vesselName;

      return {
        id: nomination._id,
        displayText: displayText,
        originalData: nomination,
      };
    });

    // Crear instancia del SingleSelect
    this.shipNominationSelector = new SingleSelect("shipNominationSelector", {
      items: selectorItems.map((item) => item.displayText),
      icon: "fas fa-ship",
      label: "Ship Nomination",
      placeholder: "Select ship nomination...",
      searchPlaceholder: "Search by vessel name or AmSpec...",
      modalTitle: "Ship Nominations Available",
      showManageOption: false, // ✅ CRÍTICO: No permitir gestión desde sampling roster
      onSelectionChange: (selectedDisplayText) => {
        this.handleShipNominationSelection(selectedDisplayText, selectorItems);
      },
    });

    Logger.success("Ship nomination selector created", {
      module: "SamplingRoster",
      data: {
        itemCount: selectorItems.length,
        hasManageOption: false,
      },
      showNotification: false,
    });
  }

  /**
   * Manejar la selección de ship nomination con verificación de roster existente
   */
  async handleShipNominationSelection(selectedDisplayText, selectorItems) {
    if (!selectedDisplayText) {
      // Limpiar campos si no hay selección
      this.clearVesselInfoFields();
      this.selectedShipNomination = null;
      this.currentRosterId = null;
      this.updateSaveStatus("saved");
      return;
    }

    // Encontrar el ship nomination seleccionado
    const selectedItem = selectorItems.find(
      (item) => item.displayText === selectedDisplayText
    );

    if (selectedItem) {
      this.selectedShipNomination = selectedItem.originalData;

      Logger.info("Ship nomination selected", {
        module: "SamplingRoster",
        data: {
          vesselName: this.selectedShipNomination.vesselName,
          amspecRef: this.selectedShipNomination.amspecRef,
          nominationId: this.selectedShipNomination._id,
        },
        showNotification: false,
      });

      // 🆕 VERIFICAR SI EXISTE ROSTER
      await this.loadOrCreateRoster(this.selectedShipNomination._id);

      // Auto-poblar campos de vessel information
      this.populateVesselInfoFields();

      Logger.success("Vessel information populated", {
        module: "SamplingRoster",
        showNotification: true,
        notificationMessage: `Loaded vessel: ${this.selectedShipNomination.vesselName}`,
      });
    }
  }

  /**
   * 🆕 Cargar roster existente o preparar para crear nuevo
   */
  async loadOrCreateRoster(nominationId) {
    try {
      Logger.info("Checking for existing roster", {
        module: "SamplingRoster",
        data: { nominationId: nominationId },
        showNotification: false,
      });

      const response = await fetch(
        `/api/sampling-rosters/by-nomination/${nominationId}`
      );
      const result = await response.json();

      if (result.success && result.exists) {
        // CARGAR ROSTER EXISTENTE
        this.currentRosterId = result.data._id;
        await this.loadExistingRoster(result.data);

        Logger.success("Existing roster loaded", {
          module: "SamplingRoster",
          data: {
            rosterId: this.currentRosterId,
            vesselName: result.data.vesselName,
            totalHours: result.data.dischargeTimeHours,
            status: result.data.status,
          },
          showNotification: true,
          notificationMessage: "Loaded existing sampling roster",
        });
      } else {
        // PREPARAR PARA NUEVO ROSTER
        this.currentRosterId = null;
        this.clearSamplingTables();

        Logger.info("Ready for new roster", {
          module: "SamplingRoster",
          data: { nominationId: nominationId },
          showNotification: true,
          notificationMessage: "Ready to create new sampling roster",
        });
      }

      this.updateSaveStatus("saved");
    } catch (error) {
      Logger.error("Error checking roster existence", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Unable to load roster information",
      });
    }
  }

  /**
   * 🆕 Cargar datos de roster existente en la interfaz
   */
  async loadExistingRoster(rosterData) {
    try {
      Logger.info("Loading existing roster data", {
        module: "SamplingRoster",
        data: { rosterId: rosterData._id },
        showNotification: false,
      });

      // Cargar tiempos
      if (rosterData.startDischarge) {
        const startDischargeTime = new Date(rosterData.startDischarge);
        this.dateTimeInstances.startDischarge.setDateTime(startDischargeTime);
      }

      if (rosterData.etcTime) {
        const etcTime = new Date(rosterData.etcTime);
        this.dateTimeInstances.etcTime.setDateTime(etcTime);
      }

      // Cargar Discharge Time Hours
      if (rosterData.dischargeTimeHours) {
        this.setFieldValue(
          "dischargeTimeHours",
          rosterData.dischargeTimeHours.toString()
        );
      }

      // Cargar Office Sampling
      if (rosterData.officeSampling) {
        await this.loadOfficeSamplingFromRoster(rosterData.officeSampling);
      }

      // Cargar Line Sampling
      if (rosterData.lineSampling && rosterData.lineSampling.length > 0) {
        await this.loadLineSamplingFromRoster(rosterData.lineSampling);
      }

      Logger.success("Existing roster data loaded completely", {
        module: "SamplingRoster",
        data: {
          officeSamplingLoaded: !!rosterData.officeSampling,
          lineSamplingTurns: rosterData.lineSampling?.length || 0,
          dischargeHours: rosterData.dischargeTimeHours,
        },
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error loading existing roster data", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Error loading existing roster data",
      });
    }
  }

  /**
   * 🆕 Cargar Office Sampling desde roster existente
   */
  async loadOfficeSamplingFromRoster(officeSamplingData) {
    const tableBody = document.getElementById("officeSamplingTableBody");
    if (!tableBody) return;

    const samplerName =
      officeSamplingData.sampler?.name || "No Sampler Assigned";
    const startTime = this.formatDateTime(officeSamplingData.startTime);
    const finishTime = this.formatDateTime(officeSamplingData.finishTime);
    const hours = officeSamplingData.hours || 6;

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

    // Setup event listeners
    this.setupOfficeSamplingEventListeners();

    Logger.debug("Office Sampling loaded from roster", {
      module: "SamplingRoster",
      data: { samplerName, hours },
      showNotification: false,
    });
  }

  /**
   * 🆕 Cargar Line Sampling desde roster existente
   */
  async loadLineSamplingFromRoster(lineSamplingData) {
    const tableBody = document.getElementById("lineSamplingTableBody");
    if (!tableBody) return;

    // Limpiar tabla existente
    tableBody.innerHTML = "";

    // Crear filas para cada turno
    lineSamplingData.forEach((turn, index) => {
      const row = document.createElement("tr");
      row.setAttribute("data-row-id", `line-sampler-row-${index}`);

      const samplerName = turn.sampler?.name || "No Sampler Assigned";
      const startTime = this.formatDateTime(turn.startTime);
      const finishTime = this.formatDateTime(turn.finishTime);
      const hours = turn.hours || 0;

      row.innerHTML = `
      <td class="fw-medium">${samplerName}</td>
      <td>${startTime}</td>
      <td>${finishTime}</td>
      <td class="text-center">${hours}</td>
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

    // Setup event listeners
    this.setupLineSamplingEventListeners();

    Logger.debug("Line Sampling loaded from roster", {
      module: "SamplingRoster",
      data: { turnsLoaded: lineSamplingData.length },
      showNotification: false,
    });
  }

  /**
   * 🆕 Trigger auto-save con delay (debounced)
   */
  triggerAutoSave(changeType = "general") {
    if (!this.isAutoSaveEnabled || !this.selectedShipNomination) return;

    this.hasUnsavedChanges = true;
    this.updateSaveStatus("unsaved");

    // Clear timeout anterior
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Auto-save después de 2 segundos de inactividad
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave(changeType);
    }, 2000);

    Logger.debug("Auto-save scheduled", {
      module: "SamplingRoster",
      data: { changeType: changeType, delay: "2s" },
      showNotification: false,
    });
  }

  /**
   * 🆕 Trigger auto-save inmediato
   */
  triggerAutoSaveImmediate(changeType) {
    if (!this.isAutoSaveEnabled || !this.selectedShipNomination) return;

    // Cancel delayed save
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    this.performAutoSave(changeType);
  }

  /**
   * 🆕 Ejecutar auto-save
   */
  async performAutoSave(changeType) {
  if (!this.selectedShipNomination) return;

  try {
    this.updateSaveStatus("saving");

    const rosterData = this.collectCurrentRosterData();

    // 🚨 Validación adicional solo si es un nuevo roster
    if (!this.currentRosterId) {
      const lineData = rosterData.lineSampling || [];

      // Si no hay turnos, se evita enviar el POST para no fallar la validación del backend
      if (lineData.length === 0) {
        Logger.warn("Auto-save skipped: new roster without line sampling data", {
          module: "SamplingRoster",
          showNotification: false,
        });

        this.updateSaveStatus("unsaved"); // opcional: mostrar que no se guardó
        return;
      }
    }

    let response;
    if (this.currentRosterId) {
      // UPDATE roster existente
      response = await fetch(
        `/api/sampling-rosters/auto-save/${this.currentRosterId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeType: changeType,
            data: rosterData,
          }),
        }
      );
    } else {
      // CREATE nuevo roster
      response = await fetch("/api/sampling-rosters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rosterData),
      });
    }

    const result = await response.json();

    if (result.success) {
      if (!this.currentRosterId) {
        this.currentRosterId = result.data._id;
      }

      this.hasUnsavedChanges = false;
      this.updateSaveStatus("saved");

      Logger.success("Auto-save completed", {
        module: "SamplingRoster",
        data: {
          changeType: changeType,
          rosterId: this.currentRosterId,
          vesselName: this.selectedShipNomination.vesselName,
        },
        showNotification: false, // Sin notificación para auto-save
      });
    } else {
      throw new Error(result.message || "Auto-save failed");
    }
  } catch (error) {
    this.updateSaveStatus("unsaved");

    Logger.error("Auto-save failed", {
      module: "SamplingRoster",
      error: error,
      showNotification: true,
      notificationMessage: "Auto-save failed. Changes may be lost.",
    });
  }
}

  /**
   * 🆕 Recopilar datos actuales del roster
   */
  collectCurrentRosterData() {
    const officeData = this.getOfficeSamplingData();
    const lineData = this.getCurrentLineTurns();
    const dischargeHours = this.getDischargeTimeHours();
    const startDischarge = this.dateTimeInstances.startDischarge?.getDateTime();
    const etcTime = this.dateTimeInstances.etcTime?.getDateTime();

    return {
      shipNomination: String(this.selectedShipNomination._id),
      vesselName: this.selectedShipNomination.vesselName,
      amspecRef: this.selectedShipNomination.amspecRef,
      startDischarge: startDischarge,
      etcTime: etcTime,
      dischargeTimeHours: dischargeHours || 0,

      totalTurns: lineData.length,
      totalSamplers: new Set(lineData.map((t) => t.samplerName)).size,

      officeSampling: officeData
        ? {
            sampler: {
              id:
                this.selectedShipNomination.sampler?.id ||
                this.selectedShipNomination.sampler,
              name: officeData.samplerName,
            },
            startTime: this.parseDateTime(officeData.startTime),
            finishTime: this.parseDateTime(officeData.finishTime),
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
        startTime: this.parseDateTime(turn.startTime),
        finishTime: this.parseDateTime(turn.finishTime),
        hours: turn.hours,
        blockType: this.determineBlockType(turn.startTime),
        turnOrder: index,
      })),
    };
  }

  /**
   * 🆕 Determinar tipo de bloque (day/night)
   */
  determineBlockType(timeString) {
    const time = this.parseDateTime(timeString);
    if (!time) return "day";

    const hour = time.getHours();
    return hour >= 7 && hour < 19 ? "day" : "night";
  }

  /**
   * 🆕 Actualizar estado visual de guardado
   */
  updateSaveStatus(status) {
    this.saveStatus = status;

    // TODO: Actualizar indicador visual en la UI
    const saveIndicator = document.getElementById("saveStatus");
    if (saveIndicator) {
      switch (status) {
        case "saved":
          saveIndicator.innerHTML =
            '<i class="fas fa-check-circle text-success"></i> All changes saved';
          break;
        case "saving":
          saveIndicator.innerHTML =
            '<i class="fas fa-spinner fa-spin text-primary"></i> Saving changes...';
          break;
        case "unsaved":
          saveIndicator.innerHTML =
            '<i class="fas fa-exclamation-circle text-warning"></i> Unsaved changes';
          break;
      }
    }

    Logger.debug("Save status updated", {
      module: "SamplingRoster",
      data: { status: status },
      showNotification: false,
    });
  }

  /**
   * Auto-poblar campos de vessel information
   */
  populateVesselInfoFields() {
    if (!this.selectedShipNomination) return;

    const nomination = this.selectedShipNomination;

    Logger.info("Populating vessel info fields", {
      module: "SamplingRoster",
      data: { vesselName: nomination.vesselName },
      showNotification: false,
    });

    try {
      // Campos básicos
      this.setFieldValue("vesselName", nomination.vesselName);
      this.setFieldValue("amspecRef", nomination.amspecRef);

      // Berth (puede ser objeto o string)
      const berthName = nomination.berth?.name || nomination.berth || "";
      this.setFieldValue("berthName", berthName);

      // Fechas con formateo para campos readonly
      this.setFieldValue(
        "pilotOnBoard",
        this.formatDateTime(nomination.pilotOnBoard)
      );
      this.setFieldValue("etbTime", this.formatDateTime(nomination.etb));

      // DateTimePickers - establecer valores iniciales basados en ship nomination
      if (nomination.etb) {
        // Start Discharge = ETB + 3 horas por defecto
        const startDischargeTime = new Date(nomination.etb);
        startDischargeTime.setHours(startDischargeTime.getHours() + 3);
        this.dateTimeInstances.startDischarge.setDateTime(startDischargeTime);

        Logger.debug("Start Discharge time calculated", {
          module: "SamplingRoster",
          data: {
            etb: this.formatDateTime(nomination.etb),
            startDischarge: this.formatDateTime(startDischargeTime),
            hoursAdded: 3,
          },
          showNotification: false,
        });
      }

      if (nomination.etc) {
        // ETC usar la fecha del ship nomination
        const etcTime = new Date(nomination.etc);
        this.dateTimeInstances.etcTime.setDateTime(etcTime);
      }

      // Product Types (array de objetos o strings)
      const productNames = this.formatProductTypes(nomination.productTypes);
      this.setFieldValue("cargoProducts", productNames);

      // Surveyor (puede ser objeto o string)
      const surveyorName =
        nomination.surveyor?.name || nomination.surveyor || "";
      this.setFieldValue("surveyorName", surveyorName);

      // Chemist para Pre y Post Discharge Testing (mismo chemist)
      const chemistName = nomination.chemist?.name || nomination.chemist || "";
      this.setFieldValue("preDischargeChemist", chemistName);
      this.setFieldValue("postDischargeChemist", chemistName);

      // Auto-poblar Office Sampling Table  ← NUEVA LÍNEA
      this.populateOfficeSamplingTable();

      Logger.success("All vessel info fields populated", {
        module: "SamplingRoster",
        data: {
          vesselName: nomination.vesselName,
          fieldsPopulated: 10, // Actualizado: ahora son 10 campos
          dateTimePickersSet: 2,
        },
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error populating vessel info fields", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Error loading vessel information",
      });
    }
  }

  /**
   * Limpiar campos de vessel information
   */
  clearVesselInfoFields() {
    Logger.info("Clearing vessel info fields", {
      module: "SamplingRoster",
      showNotification: false,
    });

    const fieldIds = [
      "vesselName",
      "berthName",
      "amspecRef",
      "pilotOnBoard",
      "etbTime",
      "dischargeTimeHours",
      "cargoProducts",
      "surveyorName",
      "preDischargeChemist",
      "postDischargeChemist",
    ];

    fieldIds.forEach((fieldId) => {
      this.setFieldValue(fieldId, "");
    });

    // Limpiar DateTimePickers sin mostrar notificaciones individuales
    if (this.dateTimeInstances.startDischarge) {
      this.dateTimeInstances.startDischarge.clearSelection(false);
    }
    if (this.dateTimeInstances.etcTime) {
      this.dateTimeInstances.etcTime.clearSelection(false);
    }

    Logger.debug("Vessel info fields cleared", {
      module: "SamplingRoster",
      data: {
        fieldsCleared: fieldIds.length,
        dateTimePickersCleared: 2,
      },
      showNotification: false,
    });

    // Limpiar Office Sampling Table  ← NUEVA LÍNEA
    this.clearOfficeSamplingTable();
  }

  /**
   * Establecer valor de un campo
   */
  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value || "";
      Logger.debug(`Field updated: ${fieldId}`, {
        module: "SamplingRoster",
        data: { fieldId: fieldId, hasValue: !!value },
        showNotification: false,
      });
    } else {
      Logger.warn(`Field not found: ${fieldId}`, {
        module: "SamplingRoster",
        data: { fieldId: fieldId },
        showNotification: false,
      });
    }
  }

  /**
   * Validar secuencia lógica de fechas (Start Discharge → ETC)
   */
  validateDateTimeSequence() {
    const startDischarge = this.dateTimeInstances.startDischarge?.getDateTime();
    const etcTime = this.dateTimeInstances.etcTime?.getDateTime();

    // Solo validar si ambas fechas están seleccionadas
    if (startDischarge && etcTime && etcTime < startDischarge) {
      Logger.warn("ETC should be after Start Discharge time", {
        module: "SamplingRoster",
        data: {
          startDischarge: startDischarge.toISOString(),
          etcTime: etcTime.toISOString(),
        },
        showNotification: true,
        notificationMessage: "ETC should be after Start Discharge time",
      });
      return false;
    }

    Logger.debug("DateTime sequence validation passed", {
      module: "SamplingRoster",
      data: {
        hasStartDischarge: !!startDischarge,
        hasETC: !!etcTime,
        isValid: true,
      },
      showNotification: false,
    });

    return true;
  }
  formatDateTime(dateValue) {
    if (!dateValue) return "";

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";

      // Formato: DD/MM/YYYY HH:mm
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      Logger.warn("Error formatting date", {
        module: "SamplingRoster",
        error: error,
        data: { dateValue: dateValue },
        showNotification: false,
      });
      return "";
    }
  }

  /**
   * Formatear product types para mostrar
   */
  formatProductTypes(productTypes) {
    if (!productTypes || !Array.isArray(productTypes)) return "";

    try {
      const productNames = productTypes
        .map((product) => {
          return product?.name || product || "";
        })
        .filter((name) => name.length > 0);

      return productNames.join(", ");
    } catch (error) {
      Logger.warn("Error formatting product types", {
        module: "SamplingRoster",
        error: error,
        data: { productTypes: productTypes },
        showNotification: false,
      });
      return "";
    }
  }

  /**
   * Setup event listeners para el sistema
   */
  setupEventListeners() {
    Logger.info("Setting up event listeners", {
      module: "SamplingRoster",
      showNotification: false,
    });

    // Listener para el botón Clear
    const clearBtn = document.getElementById("clearRosterBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.handleClearRoster());
    }

    // Listener para el botón Auto Generate (futuro)
    const autoGenerateBtn = document.getElementById("autoGenerateBtn");
    if (autoGenerateBtn) {
      autoGenerateBtn.addEventListener("click", () =>
        this.handleAutoGenerate()
      );
    }

    // Listener para el botón Export (futuro)
    const exportBtn = document.getElementById("exportRosterBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.handleExportRoster());
    }

    // Listener para el botón Save (futuro)
    const saveBtn = document.getElementById("saveRosterBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => this.handleSaveRoster());
    }

    // Listener para Discharge Time (Hrs) - recalcular ETC automáticamente
    const dischargeTimeField = document.getElementById("dischargeTimeHours");
    if (dischargeTimeField) {
      dischargeTimeField.addEventListener("input", () => {
        this.calculateAndUpdateETC();
        this.triggerAutoSave("dischargeTimeChange");
      });
    }

    Logger.success("Event listeners configured", {
      module: "SamplingRoster",
      data: {
        clearBtn: !!clearBtn,
        autoGenerateBtn: !!autoGenerateBtn,
        exportBtn: !!exportBtn,
        saveBtn: !!saveBtn,
        dischargeTimeField: !!dischargeTimeField,
      },
      showNotification: false,
    });
  }

  /**
   * Manejar Clear Roster
   */
  handleClearRoster() {
    Logger.info("Clear roster requested", {
      module: "SamplingRoster",
      showNotification: false,
    });

    // Limpiar selector
    if (this.shipNominationSelector) {
      this.shipNominationSelector.clearSelection();
    }

    // Limpiar campos
    this.clearVesselInfoFields();

    // Limpiar tablas de sampling
    this.clearSamplingTables();

    // Limpiar Line Sampling
    this.clearLineSamplingTable();

    // Limpiar estado de ship nomination
    this.selectedShipNomination = null;

    // Reset backend state:
    this.currentRosterId = null;
    this.hasUnsavedChanges = false;
    this.updateSaveStatus("saved");

    // Clear auto-save timeout:
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    Logger.success("Roster cleared successfully", {
      module: "SamplingRoster",
      showNotification: true,
      notificationMessage: "Sampling roster cleared",
    });
  }

  /**
   * Limpiar tablas de sampling
   */
  clearSamplingTables() {
    // Office Sampling Table
    const officeTableBody = document.getElementById("officeSamplingTableBody");
    if (officeTableBody) {
      officeTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-clipboard-list"></i>
            Office sampling schedule will appear here after selecting a ship nomination
          </td>
        </tr>
      `;
    }

    // Line Sampling Table
    const lineTableBody = document.getElementById("lineSamplingTableBody");
    if (lineTableBody) {
      lineTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-flask"></i>
            Line sampling schedule will appear here after selecting a ship nomination
          </td>
        </tr>
      `;
    }

    Logger.debug("Sampling tables cleared", {
      module: "SamplingRoster",
      showNotification: false,
    });
  }

  /**
   * 🆕 Auto-poblar tabla Office Sampling con datos del ship nomination
   */
  async populateOfficeSamplingTable() {
    if (!this.selectedShipNomination) return;

    const nomination = this.selectedShipNomination;

    Logger.info("Populating Office Sampling table", {
      module: "SamplingRoster",
      data: { vesselName: nomination.vesselName },
      showNotification: false,
    });

    try {
      // Datos para la tabla
      const samplerName = nomination.sampler?.name || "No Sampler Assigned";
      const startOffice = this.formatDateTime(nomination.pilotOnBoard); // Mismo que POB

      // Calcular FINISH SAMPLING = POB + 6 horas
      let finishSampling = "";
      if (nomination.pilotOnBoard) {
        const pobDate = new Date(nomination.pilotOnBoard);
        const finishDate = new Date(pobDate);
        finishDate.setHours(finishDate.getHours() + 6);
        finishSampling = this.formatDateTime(finishDate);
      }

      const hours = "6"; // Siempre 6 horas

      // Crear fila de la tabla
      const tableBody = document.getElementById("officeSamplingTableBody");
      if (tableBody) {
        tableBody.innerHTML = `
        <tr data-row-id="office-sampler-row">
          <td class="fw-medium">${samplerName}</td>
          <td>${startOffice}</td>
          <td>${finishSampling}</td>
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

        // Setup event listeners para los botones
        this.setupOfficeSamplingEventListeners();

        Logger.success("Office Sampling table populated", {
          module: "SamplingRoster",
          data: {
            samplerName: samplerName,
            startOffice: startOffice,
            finishSampling: finishSampling,
            hours: hours,
          },
          showNotification: false,
        });
      }
    } catch (error) {
      Logger.error("Error populating Office Sampling table", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Error loading office sampling data",
      });
    }
  }

  /**
   * 🆕 Limpiar tabla Office Sampling
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

      Logger.debug("Office Sampling table cleared", {
        module: "SamplingRoster",
        showNotification: false,
      });
    }
  }

  /**
   * 🆕 Setup event listeners para Office Sampling (event delegation)
   */
  setupOfficeSamplingEventListeners() {
    const tableBody = document.getElementById("officeSamplingTableBody");
    if (!tableBody) return;

    // Remover listeners existentes para evitar duplicados
    tableBody.removeEventListener("click", this.handleOfficeSamplingClick);

    // Event delegation para todos los botones
    this.handleOfficeSamplingClick = (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const rowId = button.dataset.rowId;

      switch (action) {
        case "edit":
          this.editOfficeSampler(rowId);
          break;
        case "save":
          this.saveSamplerEdit(rowId);
          break;
      }
    };

    tableBody.addEventListener("click", this.handleOfficeSamplingClick);

    Logger.debug("Office Sampling event listeners configured", {
      module: "SamplingRoster",
      showNotification: false,
    });
  }

  /**
   * 🆕 Modo edición para sampler
   */
  async editOfficeSampler(rowId) {
    Logger.info("Edit office sampler requested", {
      module: "SamplingRoster",
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
          module: "SamplingRoster",
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
      await this.initializeSamplerSelector(
        dropdown,
        samplersData,
        currentSampler
      );

      // Transformar botón EDIT → SAVE
      editButton.innerHTML = '<i class="fas fa-check"></i>';
      editButton.setAttribute("data-action", "save");
      editButton.setAttribute("title", "Save Changes");
      editButton.className = "btn btn-primary-premium btn-edit-item";
      editButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      Logger.success("Edit mode activated", {
        module: "SamplingRoster",
        data: {
          rowId: rowId,
          currentSampler: currentSampler,
          availableSamplers: samplersData.length,
        },
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error activating edit mode", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Unable to edit sampler. Please try again.",
      });
    }
  }

  /**
   * 🆕 Guardar edición de sampler
   */
  saveSamplerEdit(rowId) {
    Logger.info("Save sampler edit requested", {
      module: "SamplingRoster",
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
      // Obtener SingleSelect instance
      const samplerSelector = dropdownContainer.samplerSelector;
      if (!samplerSelector) {
        throw new Error("SingleSelect instance not found");
      }

      // Obtener nuevo valor seleccionado
      const newSamplerName =
        samplerSelector.getSelectedItem() || "No Sampler Assigned";
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
      saveButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      // Log del cambio
      if (newSamplerName !== originalValue) {
        Logger.success("Sampler updated successfully", {
          module: "SamplingRoster",
          data: {
            rowId: rowId,
            from: originalValue,
            to: newSamplerName,
          },
          showNotification: true,
          notificationMessage: `Sampler updated to: ${newSamplerName}`,
        });

        this.triggerAutoSaveImmediate("samplerEdit");

        // ✅ Sincronizar también primera fila de Line Sampling (row 0)
        const firstLineRow = document.querySelector(
          'tr[data-row-id="line-sampler-row-0"]'
        );
        if (firstLineRow) {
          const samplerCell = firstLineRow.querySelector("td:first-child");

          // Solo actualizar si el valor actual es igual al anterior de Office Sampling
          if (samplerCell && samplerCell.textContent.trim() === originalValue) {
            samplerCell.innerHTML = `<span class="fw-medium">${newSamplerName}</span>`;

            Logger.info(
              "Line Sampling row 0 updated to match Office Sampling",
              {
                module: "SamplingRoster",
                data: {
                  from: originalValue,
                  to: newSamplerName,
                },
                showNotification: false,
              }
            );
          }
        }
      } else {
        Logger.info("No changes made to sampler", {
          module: "SamplingRoster",
          data: { rowId: rowId, sampler: newSamplerName },
          showNotification: false,
        });
      }
    } catch (error) {
      Logger.error("Error saving sampler edit", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Unable to save changes. Please try again.",
      });
    }
  }

  /**
   * 🆕 Obtener datos de samplers desde API
   */
  async getSamplersData() {
    try {
      Logger.debug("Loading samplers data", {
        module: "SamplingRoster",
        showNotification: false,
      });

      const response = await fetch("/api/samplers");
      const result = await response.json();

      if (result.success && result.data) {
        Logger.debug("Samplers data loaded", {
          module: "SamplingRoster",
          data: { count: result.data.length },
          showNotification: false,
        });

        return result.data;
      } else {
        throw new Error(result.message || "Failed to load samplers");
      }
    } catch (error) {
      Logger.error("Error loading samplers", {
        module: "SamplingRoster",
        error: error,
        showNotification: false,
      });

      return [];
    }
  }

  /**
   * 🆕 Crear dropdown simple para selección de sampler
   */
  createSamplerDropdown(samplersData, currentSampler) {
    // Crear contenedor temporal único para el SingleSelect
    const containerId = `samplerDropdown_${Date.now()}`;
    const container = document.createElement("div");
    container.id = containerId;
    container.style.minWidth = "200px";

    Logger.debug("Sampler dropdown container created", {
      module: "SamplingRoster",
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
   * 🆕 Inicializar SingleSelect después de que el contenedor esté en DOM
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
          module: "SamplingRoster",
          showNotification: false,
        });
      }
    }, 100);

    // Guardar referencia para acceso posterior
    container.samplerSelector = samplerSelector;

    Logger.debug("SingleSelect sampler selector initialized", {
      module: "SamplingRoster",
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
   * 🆕 Auto Generate mejorado - con update inteligente y auto-save
   */
  async handleAutoGenerate() {
    if (!this.selectedShipNomination) {
      Logger.warn("No ship nomination selected for auto generate", {
        module: "SamplingRoster",
        showNotification: true,
        notificationMessage: "Please select a ship nomination first",
      });
      return;
    }

    Logger.info("Starting Auto Generate Line Sampling Schedule", {
      module: "SamplingRoster",
      data: { vesselName: this.selectedShipNomination.vesselName },
      showNotification: false,
    });

    try {
      // Validar que Office Sampling existe
      const officeRow = document.querySelector(
        'tr[data-row-id="office-sampler-row"]'
      );
      if (!officeRow) {
        Logger.warn("Office Sampling not found", {
          module: "SamplingRoster",
          showNotification: true,
          notificationMessage:
            "Office Sampling must be loaded first. Please select a ship nomination.",
        });
        return;
      }

      // Validar Discharge Time (Hrs)
      const dischargeTimeHours = this.getDischargeTimeHours();
      if (!dischargeTimeHours || dischargeTimeHours <= 6) {
        Logger.warn("Invalid Discharge Time", {
          module: "SamplingRoster",
          showNotification: true,
          notificationMessage:
            "Discharge Time (Hrs) must be greater than 6 hours",
        });
        return;
      }

      // 🆕 LÓGICA INTELIGENTE: Detectar si es creación o edición
      const existingRoster = this.currentRosterId
        ? await this.getCurrentRosterFromBackend()
        : null;

      if (
        existingRoster &&
        existingRoster.dischargeTimeHours !== dischargeTimeHours
      ) {
        // MODO EDICIÓN: Actualizar roster existente
        await this.updateExistingRoster(existingRoster, dischargeTimeHours);
      } else {
        // MODO CREACIÓN: Generar nuevo schedule
        await this.generateLineSamplingSchedule(dischargeTimeHours);
      }

      // 🆕 AUTO-SAVE INMEDIATO
      this.triggerAutoSaveImmediate("autoGenerate");

      Logger.success("Line Sampling Schedule generated successfully", {
        module: "SamplingRoster",
        data: {
          vesselName: this.selectedShipNomination.vesselName,
          totalHours: dischargeTimeHours,
          mode: existingRoster ? "update" : "create",
        },
        showNotification: true,
        notificationMessage: `Line Sampling Schedule ${
          existingRoster ? "updated" : "generated"
        } for ${dischargeTimeHours} hours`,
      });
    } catch (error) {
      Logger.error("Error generating Line Sampling Schedule", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Unable to generate schedule. Please try again.",
      });
    }
  }

  /**
   * 🆕 Obtener roster actual desde backend
   */
  async getCurrentRosterFromBackend() {
    if (!this.currentRosterId) return null;

    try {
      const response = await fetch(
        `/api/sampling-rosters/${this.currentRosterId}`
      );
      const result = await response.json();

      return result.success ? result.data : null;
    } catch (error) {
      Logger.error("Error fetching current roster", {
        module: "SamplingRoster",
        error: error,
      });
      return null;
    }
  }

  /**
   * 🆕 Actualizar roster existente con nueva duración
   */
  async updateExistingRoster(existingRoster, newTotalHours) {
    const hoursDifference = newTotalHours - existingRoster.dischargeTimeHours;

    Logger.info(`Updating existing roster`, {
      module: "SamplingRoster",
      data: {
        from: existingRoster.dischargeTimeHours,
        to: newTotalHours,
        difference: hoursDifference,
      },
      showNotification: false,
    });

    if (hoursDifference > 0) {
      // EXPANDIR ROSTER - Agregar más samplers
      Logger.info(`Expanding roster by ${hoursDifference} hours`, {
        module: "SamplingRoster",
        showNotification: true,
        notificationMessage: `Adding ${hoursDifference} hours to schedule...`,
      });

      await this.expandRosterSchedule(existingRoster, hoursDifference);
    } else if (hoursDifference < 0) {
      // CONTRAER ROSTER - Remover samplers finales
      Logger.info(`Reducing roster by ${Math.abs(hoursDifference)} hours`, {
        module: "SamplingRoster",
        showNotification: true,
        notificationMessage: `Removing ${Math.abs(
          hoursDifference
        )} hours from schedule...`,
      });

      await this.reduceRosterSchedule(
        existingRoster,
        Math.abs(hoursDifference)
      );
    } else {
      // Sin cambios en horas, regenerar con misma duración
      await this.generateLineSamplingSchedule(newTotalHours);
    }
  }

  /**
   * 🆕 Expandir roster schedule (agregar horas)
   */
  async expandRosterSchedule(existingRoster, additionalHours) {
    const lineTurns = this.getCurrentLineTurns();
    const samplersData = await this.getSamplersData();

    if (lineTurns.length === 0) {
      // No hay turnos existentes, generar completo
      await this.generateLineSamplingSchedule(
        existingRoster.dischargeTimeHours + additionalHours
      );
      return;
    }

    // Obtener último turno para continuar desde ahí
    const lastTurn = lineTurns[lineTurns.length - 1];
    const continueFromTime = this.parseDateTime(lastTurn.finishTime);

    // Generar turnos adicionales
    const additionalTurns = this.calculateAdditionalTurns(
      continueFromTime,
      additionalHours,
      samplersData,
      existingRoster.officeSampling.sampler.name
    );

    // Combinar turnos existentes + nuevos
    const allTurns = [...lineTurns, ...additionalTurns];
    this.populateLineSamplingTable(allTurns);

    Logger.success(
      `Roster expanded with ${additionalTurns.length} additional turns`,
      {
        module: "SamplingRoster",
        showNotification: true,
        notificationMessage: `Added ${additionalHours} hours to schedule`,
      }
    );
  }

  /**
   * 🆕 Reducir roster schedule (quitar horas)
   */
  async reduceRosterSchedule(existingRoster, hoursToRemove) {
    const lineTurns = this.getCurrentLineTurns();
    let remainingToRemove = hoursToRemove;

    // Remover desde el final hacia atrás
    const updatedTurns = [];

    for (let i = lineTurns.length - 1; i >= 0 && remainingToRemove > 0; i--) {
      const turn = lineTurns[i];

      if (turn.hours <= remainingToRemove) {
        // Remover turno completo
        remainingToRemove -= turn.hours;
        Logger.debug(
          `Removing complete turn: ${turn.samplerName} (${turn.hours}h)`
        );
      } else {
        // Reducir turno parcialmente
        const newHours = turn.hours - remainingToRemove;
        const newFinishTime = this.calculateNewFinishTime(
          turn.startTime,
          newHours
        );

        const updatedTurn = {
          ...turn,
          hours: newHours,
          finishTime: newFinishTime,
        };

        updatedTurns.unshift(updatedTurn);
        remainingToRemove = 0;
        Logger.debug(`Reducing turn: ${turn.samplerName} to ${newHours}h`);
      }

      if (remainingToRemove === 0) {
        // Agregar turnos restantes (no modificados)
        for (let j = i - 1; j >= 0; j--) {
          updatedTurns.unshift(lineTurns[j]);
        }
        break;
      }
    }

    // Actualizar tabla
    this.populateLineSamplingTable(updatedTurns);

    Logger.success(`Roster reduced by ${hoursToRemove} hours`, {
      module: "SamplingRoster",
      showNotification: true,
      notificationMessage: `Removed ${hoursToRemove} hours from schedule`,
    });
  }

  /**
   * 🆕 Calcular turnos adicionales para expansión
   */
  calculateAdditionalTurns(
    startTime,
    additionalHours,
    samplersData,
    officeSamplerName
  ) {
    const additionalTurns = [];
    let currentStartTime = new Date(startTime);
    let remainingHours = additionalHours;
    let samplerIndex = 0;

    while (remainingHours > 0) {
      // Determinar próximo bloque horario
      const nextBlockTime = this.getNextBlockTime(currentStartTime);

      // Calcular horas para este turno
      const hoursToNextBlock = this.getHoursToTime(
        currentStartTime,
        nextBlockTime
      );
      const turnHours = Math.min(remainingHours, hoursToNextBlock, 12);

      // Calcular tiempo de finalización
      const turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(turnEndTime.getHours() + turnHours);

      // Seleccionar sampler (rotación simple)
      const assignedSampler = this.getNextAvailableSampler(
        samplersData,
        samplerIndex,
        officeSamplerName
      );
      samplerIndex++;

      // Crear turno
      const turn = {
        samplerName: assignedSampler.name,
        startTime: this.formatDateTime(currentStartTime),
        finishTime: this.formatDateTime(turnEndTime),
        hours: turnHours,
      };

      additionalTurns.push(turn);

      // Preparar para próximo turno
      currentStartTime = new Date(turnEndTime);
      remainingHours -= turnHours;
    }

    return additionalTurns;
  }

  /**
   * 🆕 Calcular nuevo tiempo de finalización
   */
  calculateNewFinishTime(startTimeString, hours) {
    const startTime = this.parseDateTime(startTimeString);
    if (!startTime) return startTimeString;

    const finishTime = new Date(startTime);
    finishTime.setHours(finishTime.getHours() + hours);

    return this.formatDateTime(finishTime);
  }

  /**
   * 🆕 Obtener Discharge Time (Hrs) del formulario
   */
  getDischargeTimeHours() {
    const dischargeField = document.getElementById("dischargeTimeHours");
    if (!dischargeField || !dischargeField.value.trim()) {
      return null;
    }

    const hours = parseInt(dischargeField.value.trim(), 10); // 🆕 parseInt para enteros

    // Validar que es un número entero válido y mayor que 0
    if (isNaN(hours) || hours <= 0) {
      Logger.debug("Invalid discharge time hours", {
        module: "SamplingRoster",
        data: {
          inputValue: dischargeField.value,
          parsedValue: hours,
          isValid: false,
        },
        showNotification: false,
      });
      return null;
    }

    return hours;
  }

  /**
   * 🆕 Generar Line Sampling Schedule completo
   */
  async generateLineSamplingSchedule(totalDischargeHours) {
    Logger.info("Calculating Line Sampling Schedule", {
      module: "SamplingRoster",
      data: { totalHours: totalDischargeHours },
      showNotification: false,
    });

    // Obtener datos de Office Sampling
    const officeData = this.getOfficeSamplingData();
    if (!officeData) {
      throw new Error("Office Sampling data not found");
    }

    // Obtener lista de samplers disponibles
    const samplersData = await this.getSamplersData();
    if (!samplersData || samplersData.length === 0) {
      throw new Error("No samplers available");
    }

    // Calcular turnos de Line Sampling
    const lineTurns = this.calculateLineSamplingTurns(
      officeData,
      totalDischargeHours,
      samplersData
    );

    // Generar tabla Line Sampling
    this.populateLineSamplingTable(lineTurns);

    Logger.success("Line Sampling calculation completed", {
      module: "SamplingRoster",
      data: {
        turnsGenerated: lineTurns.length,
        totalHours: totalDischargeHours,
        officeFinish: officeData.finishTime,
      },
      showNotification: false,
    });
  }

  /**
   * 🆕 Obtener datos de Office Sampling de la tabla
   */
  getOfficeSamplingData() {
    const officeRow = document.querySelector(
      'tr[data-row-id="office-sampler-row"]'
    );
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
   * 🆕 Obtener turnos actuales de Line Sampling desde la tabla DOM
   */
  getCurrentLineTurns() {
    const turns = [];
    const lineRows = document.querySelectorAll(
      'tr[data-row-id^="line-sampler-row-"]'
    );

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

    Logger.debug("Current line turns retrieved", {
      module: "SamplingRoster",
      data: { turnsCount: turns.length },
      showNotification: false,
    });

    return turns;
  }

  /**
   * 🆕 Calcular turnos de Line Sampling con lógica de bloques
   */
  calculateLineSamplingTurns(officeData, totalHours, samplersData) {
    const turns = [];

    // Parsear tiempo de finalización de Office Sampling
    const officeFinishDate = this.parseDateTime(officeData.finishTime);
    if (!officeFinishDate) {
      throw new Error("Invalid Office Sampling finish time");
    }

    let currentStartTime = new Date(officeFinishDate);
    let remainingHours = totalHours; // ✅ 80h completas desde FIN Office Sampling (descarga real)
    let samplerIndex = 0;
    let isFirstTurn = true; // ✅ Flag para identificar primer turno

    Logger.debug("Starting Line Sampling calculation", {
      module: "SamplingRoster",
      data: {
        officeFinish: officeData.finishTime,
        officeSampler: officeData.samplerName,
        officeHours: officeData.hours,
        remainingHours: remainingHours,
        availableSamplers: samplersData.length,
      },
      showNotification: false,
    });

    while (remainingHours > 0) {
      // Determinar próximo bloque horario (07:00 o 19:00)
      const nextBlockTime = this.getNextBlockTime(currentStartTime);

      // Calcular horas para este turno
      const hoursToNextBlock = this.getHoursToTime(
        currentStartTime,
        nextBlockTime
      );
      const turnHours = Math.min(remainingHours, hoursToNextBlock, 12);

      // Calcular tiempo de finalización del turno
      const turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(turnEndTime.getHours() + turnHours);

      // ✅ CORRECCIÓN: Primer turno usa mismo sampler de Office Sampling
      let assignedSampler;
      if (isFirstTurn) {
        // Primer turno: mismo sampler de Office Sampling para completar ciclo
        assignedSampler = { name: officeData.samplerName };
        isFirstTurn = false;

        Logger.debug("First Line turn assigned to Office sampler", {
          module: "SamplingRoster",
          data: {
            officeSampler: officeData.samplerName,
            officeHours: officeData.hours,
            lineHours: turnHours,
            totalHours: officeData.hours + turnHours,
          },
          showNotification: false,
        });
      } else {
        // Turnos siguientes: rotación automática (excluyendo sampler de Office si ya completó 12h)
        assignedSampler = this.getNextAvailableSampler(
          samplersData,
          samplerIndex,
          officeData.samplerName
        );
        samplerIndex++;
      }

      // Crear turno
      const turn = {
        samplerName: assignedSampler.name,
        startTime: this.formatDateTime(currentStartTime),
        finishTime: this.formatDateTime(turnEndTime),
        hours: turnHours,
      };

      turns.push(turn);

      // Preparar para próximo turno
      currentStartTime = new Date(turnEndTime);
      remainingHours -= turnHours;

      Logger.debug(`Turn ${turns.length} calculated`, {
        module: "SamplingRoster",
        data: {
          sampler: turn.samplerName,
          start: turn.startTime,
          finish: turn.finishTime,
          hours: turn.hours,
          remainingHours: remainingHours,
          isOfficeSamplerContinuation:
            turn.samplerName === officeData.samplerName,
        },
        showNotification: false,
      });
    }

    return turns;
  }

  /**
   * 🆕 Obtener próximo sampler disponible con lógica de rotación
   */
  getNextAvailableSampler(samplersData, samplerIndex, officeSamplerName) {
    // Rotación simple por ahora - en futuro podríamos agregar lógica más compleja
    // para evitar que el sampler de Office tenga más turnos si ya completó 12h
    const selectedSampler = samplersData[samplerIndex % samplersData.length];

    Logger.debug("Next sampler selected", {
      module: "SamplingRoster",
      data: {
        selectedSampler: selectedSampler.name,
        samplerIndex: samplerIndex,
        officeSampler: officeSamplerName,
      },
      showNotification: false,
    });

    return selectedSampler;
  }

  /**
   * 🆕 Obtener próximo bloque horario (07:00 o 19:00)
   */
  getNextBlockTime(currentTime) {
    const nextBlock = new Date(currentTime);
    const currentHour = currentTime.getHours();

    if (currentHour < 7) {
      // Si es antes de las 07:00, próximo bloque es 07:00 del mismo día
      nextBlock.setHours(7, 0, 0, 0);
    } else if (currentHour < 19) {
      // Si es entre 07:00-19:00, próximo bloque es 19:00 del mismo día
      nextBlock.setHours(19, 0, 0, 0);
    } else {
      // Si es después de las 19:00, próximo bloque es 07:00 del día siguiente
      nextBlock.setDate(nextBlock.getDate() + 1);
      nextBlock.setHours(7, 0, 0, 0);
    }

    return nextBlock;
  }

  /**
   * 🆕 Calcular horas entre dos tiempos
   */
  getHoursToTime(startTime, endTime) {
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60)); // Convertir a horas
  }

  /**
   * 🆕 Parsear string de fecha/hora a Date object
   */
  parseDateTime(dateTimeString) {
    if (!dateTimeString) return null;

    try {
      // Formato esperado: DD/MM/YYYY HH:mm
      const [datePart, timePart] = dateTimeString.split(" ");
      const [day, month, year] = datePart.split("/");
      const [hours, minutes] = timePart.split(":");

      const date = new Date(year, month - 1, day, hours, minutes);

      // Validar que la fecha es válida
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }

      return date;
    } catch (error) {
      Logger.error("Error parsing date time", {
        module: "SamplingRoster",
        error: error,
        data: { dateTimeString: dateTimeString },
        showNotification: false,
      });
      return null;
    }
  }

  /**
   * 🆕 Calcular y actualizar ETC automáticamente
   * ETC = Start Discharge + Discharge Time (Hrs)
   */
  calculateAndUpdateETC() {
    const startDischarge = this.dateTimeInstances.startDischarge?.getDateTime();
    const dischargeHours = this.getDischargeTimeHours();

    Logger.debug("Calculating ETC automatically", {
      module: "SamplingRoster",
      data: {
        hasStartDischarge: !!startDischarge,
        dischargeHours: dischargeHours,
        shouldCalculate: !!(
          startDischarge &&
          dischargeHours &&
          dischargeHours > 0
        ),
      },
      showNotification: false,
    });

    // 🆕 TRIGGER AUTO-SAVE si se calculó ETC exitosamente
    if (startDischarge && dischargeHours && dischargeHours > 0) {
      // Validar que discharge hours es entero
      if (!Number.isInteger(dischargeHours)) {
        Logger.warn("Discharge Time must be a whole number", {
          module: "SamplingRoster",
          data: { dischargeHours: dischargeHours },
          showNotification: false,
        });
        return;
      }

      // Calcular nuevo ETC
      const etcTime = new Date(startDischarge);
      etcTime.setHours(etcTime.getHours() + dischargeHours);

      // Actualizar DateTimePicker ETC
      this.dateTimeInstances.etcTime.setDateTime(etcTime);

      Logger.debug("ETC updated automatically", {
        module: "SamplingRoster",
        data: {
          startDischarge: this.formatDateTime(startDischarge),
          dischargeHours: dischargeHours,
          calculatedETC: this.formatDateTime(etcTime),
        },
        showNotification: false,
      });

      // Ejecutar validación de secuencia después del cálculo
      this.validateDateTimeSequence();
      this.triggerAutoSave("timeCalculation");
    } else {
      Logger.debug("ETC auto-calculation skipped", {
        module: "SamplingRoster",
        data: {
          reason: !startDischarge
            ? "No Start Discharge"
            : !dischargeHours
            ? "No Discharge Hours"
            : dischargeHours <= 0
            ? "Invalid Discharge Hours"
            : "Unknown",
        },
        showNotification: false,
      });
    }
  }

  /**
   * 🆕 Poblar tabla Line Sampling con turnos calculados
   */
  populateLineSamplingTable(turns) {
    const tableBody = document.getElementById("lineSamplingTableBody");
    if (!tableBody) {
      throw new Error("Line Sampling table body not found");
    }

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

    // Setup event listeners para los botones edit
    this.setupLineSamplingEventListeners();

    Logger.success("Line Sampling table populated", {
      module: "SamplingRoster",
      data: { turnsCreated: turns.length },
      showNotification: false,
    });
  }

  /**
   * 🆕 Setup event listeners para Line Sampling (event delegation)
   */
  setupLineSamplingEventListeners() {
    const tableBody = document.getElementById("lineSamplingTableBody");
    if (!tableBody) return;

    // Remover listeners existentes para evitar duplicados
    tableBody.removeEventListener("click", this.handleLineSamplingClick);

    // Event delegation para todos los botones
    this.handleLineSamplingClick = (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const rowId = button.dataset.rowId;

      switch (action) {
        case "edit":
          // 🔒 Bloquear edición de la primera fila (asignada desde Office Sampling)
          if (rowId === "line-sampler-row-0") {
            Logger.info(
              "Edit blocked for first Line Sampling row (linked to Office Sampling)",
              {
                module: "SamplingRoster",
                data: { rowId: rowId },
                showNotification: true,
                notificationMessage:
                  "This sampler is managed via Office Sampling and cannot be edited here.",
              }
            );
            return;
          }

          this.editLineSampler(rowId);
          break;
        case "save":
          this.saveLineSamplerEdit(rowId);
          break;
      }
    };

    tableBody.addEventListener("click", this.handleLineSamplingClick);

    Logger.debug("Line Sampling event listeners configured", {
      module: "SamplingRoster",
      showNotification: false,
    });
  }

  /**
   * 🆕 Limpiar tabla Line Sampling
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

      Logger.debug("Line Sampling table cleared", {
        module: "SamplingRoster",
        showNotification: false,
      });
    }
  }

  /**
   * 🆕 Modo edición para Line Sampler
   */
  async editLineSampler(rowId) {
    Logger.info("Edit line sampler requested", {
      module: "SamplingRoster",
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
          module: "SamplingRoster",
          showNotification: true,
          notificationMessage: "No samplers available for selection",
        });
        return;
      }

      // Guardar valor actual
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

      // AHORA inicializar SingleSelect (después de que esté en DOM)
      await this.initializeLineSamplerSelector(
        dropdown,
        samplersData,
        currentSampler
      );

      // Transformar botón EDIT → SAVE
      editButton.innerHTML = '<i class="fas fa-check"></i>';
      editButton.setAttribute("data-action", "save");
      editButton.setAttribute("title", "Save Changes");
      editButton.className = "btn btn-primary-premium btn-edit-item";
      editButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      Logger.success("Line sampler edit mode activated", {
        module: "SamplingRoster",
        data: {
          rowId: rowId,
          currentSampler: currentSampler,
          availableSamplers: samplersData.length,
        },
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error activating line sampler edit mode", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Unable to edit sampler. Please try again.",
      });
    }
  }

  /**
   * 🆕 Guardar edición de Line Sampler con validación de 12h máximo
   */
  saveLineSamplerEdit(rowId) {
    Logger.info("Save line sampler edit requested", {
      module: "SamplingRoster",
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
      // Obtener SingleSelect instance
      const samplerSelector = dropdownContainer.samplerSelector;
      if (!samplerSelector) {
        throw new Error("SingleSelect instance not found");
      }

      // Obtener nuevo valor seleccionado
      const newSamplerName =
        samplerSelector.getSelectedItem() || "No Sampler Assigned";
      const originalValue = samplerCell.getAttribute("data-original-value");

      // Validar que el sampler no exceda 12 horas totales
      const validationResult = this.validateSamplerHours(newSamplerName, rowId);
      if (!validationResult.isValid) {
        Logger.warn("Sampler hours validation failed", {
          module: "SamplingRoster",
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
      saveButton.style.cssText =
        "padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;";

      // Log del cambio
      if (newSamplerName !== originalValue) {
        Logger.success("Line sampler updated successfully", {
          module: "SamplingRoster",
          data: {
            rowId: rowId,
            from: originalValue,
            to: newSamplerName,
            totalHours: validationResult.totalHours,
          },
          showNotification: true,
          notificationMessage: `Line sampler updated to: ${newSamplerName}`,
        });
        this.triggerAutoSaveImmediate("samplerEdit");
      } else {
        Logger.info("No changes made to line sampler", {
          module: "SamplingRoster",
          data: { rowId: rowId, sampler: newSamplerName },
          showNotification: false,
        });
      }
    } catch (error) {
      Logger.error("Error saving line sampler edit", {
        module: "SamplingRoster",
        error: error,
        showNotification: true,
        notificationMessage: "Unable to save changes. Please try again.",
      });
    }
  }

  /**
   * 🆕 Validar que un sampler no exceda 12 horas totales
   */
  validateSamplerHours(samplerName, excludeRowId = null) {
    let totalHours = 0;

    // Verificar horas en Office Sampling
    const officeRow = document.querySelector(
      'tr[data-row-id="office-sampler-row"]'
    );
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
    const lineRows = document.querySelectorAll(
      'tr[data-row-id^="line-sampler-row-"]'
    );
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
      module: "SamplingRoster",
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

  /**
   * 🆕 Crear contenedor para dropdown elegante Line Sampler
   */
  createLineSamplerDropdown(samplersData, currentSampler) {
    // Crear contenedor temporal único para el SingleSelect
    const containerId = `lineSamplerDropdown_${Date.now()}`;
    const container = document.createElement("div");
    container.id = containerId;
    container.style.minWidth = "200px";

    Logger.debug("Line sampler dropdown container created", {
      module: "SamplingRoster",
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
   * 🆕 Inicializar SingleSelect para Line Sampler después de que el contenedor esté en DOM
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
          module: "SamplingRoster",
          showNotification: false,
        });
      }
    }, 100);

    // Guardar referencia para acceso posterior
    container.samplerSelector = samplerSelector;

    Logger.debug("SingleSelect line sampler selector initialized", {
      module: "SamplingRoster",
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
   * Placeholder para Export (futuro desarrollo)
   */
  handleExportRoster() {
    if (!this.selectedShipNomination) {
      Logger.warn("No ship nomination selected for export", {
        module: "SamplingRoster",
        showNotification: true,
        notificationMessage: "Please select a ship nomination first",
      });
      return;
    }

    Logger.info("Export sampling roster", {
      module: "SamplingRoster",
      data: { vesselName: this.selectedShipNomination.vesselName },
      showNotification: true,
      notificationMessage: "Export feature coming soon...",
    });
  }

  /**
   * Placeholder para Save (futuro desarrollo)
   */
  handleSaveRoster() {
    if (!this.selectedShipNomination) {
      Logger.warn("No ship nomination selected for save", {
        module: "SamplingRoster",
        showNotification: true,
        notificationMessage: "Please select a ship nomination first",
      });
      return;
    }

    Logger.info("Save sampling roster", {
      module: "SamplingRoster",
      data: { vesselName: this.selectedShipNomination.vesselName },
      showNotification: true,
      notificationMessage: "Save feature coming soon...",
    });
  }

  /**
   * Obtener ship nomination seleccionado
   */
  getSelectedShipNomination() {
    return this.selectedShipNomination;
  }

  /**
   * Verificar si el sistema está inicializado
   */
  isReady() {
    return this.isInitialized && !!this.shipNominationSelector;
  }

  /**
   * Refrescar datos de ship nominations
   */
  async refreshShipNominations() {
    Logger.info("Refreshing ship nominations data", {
      module: "SamplingRoster",
      showNotification: false,
    });

    await this.loadShipNominations();

    // Recrear selector con nuevos datos
    if (this.shipNominationSelector) {
      this.createShipNominationSelector();
    }

    Logger.success("Ship nominations data refreshed", {
      module: "SamplingRoster",
      data: { count: this.shipNominationsData.length },
      showNotification: true,
      notificationMessage: "Ship nominations updated",
    });
  }

  /**
   * Destruir instancia
   */
  destroy() {
    Logger.info("Destroying SamplingRosterController", {
      module: "SamplingRoster",
      showNotification: false,
    });

    if (this.shipNominationSelector) {
      this.shipNominationSelector.destroy();
      this.shipNominationSelector = null;
    }

    this.shipNominationsData = [];
    this.selectedShipNomination = null;
    this.isInitialized = false;

    Logger.success("SamplingRosterController destroyed", {
      module: "SamplingRoster",
      showNotification: false,
    });
  }
}

// Inicialización cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", async () => {
  Logger.info("DOM loaded - Initializing Sampling Roster", {
    module: "SamplingRoster",
    showNotification: false,
  });

  // Esperar a que las dependencias estén disponibles
  const waitForDependencies = () => {
    return new Promise((resolve) => {
      const checkDependencies = () => {
        if (
          typeof SingleSelect !== "undefined" &&
          typeof Logger !== "undefined" &&
          typeof DateTimePicker !== "undefined"
        ) {
          resolve();
        } else {
          setTimeout(checkDependencies, 100);
        }
      };
      checkDependencies();
    });
  };

  try {
    await waitForDependencies();

    // Crear instancia global
    window.samplingRosterController = new SamplingRosterController();
    await window.samplingRosterController.init();

    Logger.success("Sampling Roster System ready", {
      module: "SamplingRoster",
      showNotification: false,
    });
  } catch (error) {
    Logger.error("Failed to initialize Sampling Roster System", {
      module: "SamplingRoster",
      error: error,
      showNotification: true,
      notificationMessage:
        "System initialization failed. Please refresh the page.",
    });
  }
});

// Exportar para uso en otros módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = SamplingRosterController;
} else if (typeof window !== "undefined") {
  window.SamplingRosterController = SamplingRosterController;
}