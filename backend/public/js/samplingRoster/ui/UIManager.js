/**
 * UI Manager for Sampling Roster System
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';
import DateUtils from '../utils/DateUtils.js';

export class UIManager {
  constructor() {
    this.dateTimeInstances = {};
    this.shipNominationSelector = null;
  }

  /**
   * Crear DateTimePickers para Start Discharge y ETC
   */
  createDateTimePickers(onDateTimeChange) {
    // DateTimePicker para Start Discharge
    this.dateTimeInstances.startDischarge = new DateTimePicker("startDischarge", {
      icon: "fas fa-play-circle",
      label: "",
      placeholder: "Select start discharge time...",
      modalTitle: "Select Start Discharge Time",
      format: "DD/MM/YYYY HH:mm",
      minuteStep: 15,
      is24Hour: true,
      defaultTime: { hour: 9, minute: 0 },
      onDateTimeChange: onDateTimeChange
    });

    // DateTimePicker para ETC
    this.dateTimeInstances.etcTime = new DateTimePicker("etcTime", {
      icon: "fas fa-flag-checkered",
      label: "",
      placeholder: "Select completion time...",
      modalTitle: "Select Estimated Time of Completion",
      format: "DD/MM/YYYY HH:mm",
      minuteStep: 15,
      is24Hour: true,
      defaultTime: { hour: 18, minute: 0 },
      onDateTimeChange: onDateTimeChange
    });

    // Ocultar labels
    this.hideDateTimePickerLabels();
    
    // Sobrescribir formateo para usar /
    this.setupDateTimeFormatting();
  }

  /**
   * Ocultar labels de DateTimePickers
   */
  hideDateTimePickerLabels() {
    setTimeout(() => {
      const startLabel = document.querySelector("#startDischarge .datetime-picker-label");
      const etcLabel = document.querySelector("#etcTime .datetime-picker-label");
      
      if (startLabel) startLabel.style.display = "none";
      if (etcLabel) etcLabel.style.display = "none";
    }, 100);
  }

  /**
   * Configurar formateo de fechas para DateTimePickers
   */
  setupDateTimeFormatting() {
    if (this.dateTimeInstances.startDischarge) {
      this.dateTimeInstances.startDischarge.formatDateTime = DateUtils.formatDateTime;
    }
    if (this.dateTimeInstances.etcTime) {
      this.dateTimeInstances.etcTime.formatDateTime = DateUtils.formatDateTime;
    }
  }

  /**
   * Crear selector de ship nominations
   */
  createShipNominationSelector(shipNominationsData, onSelectionChange) {
    const selectorItems = shipNominationsData.map((nomination) => {
      const displayText = nomination.amspecRef
        ? `${nomination.vesselName} (${nomination.amspecRef})`
        : nomination.vesselName;

      return {
        id: nomination._id,
        displayText: displayText,
        originalData: nomination,
      };
    });

    this.shipNominationSelector = new SingleSelect("shipNominationSelector", {
      items: selectorItems.map((item) => item.displayText),
      icon: "fas fa-ship",
      label: "Ship Nomination",
      placeholder: "Select ship nomination...",
      searchPlaceholder: "Search by vessel name or AmSpec...",
      modalTitle: "Ship Nominations Available",
      showManageOption: false,
      onSelectionChange: (selectedDisplayText) => {
        onSelectionChange(selectedDisplayText, selectorItems);
      },
    });

    return this.shipNominationSelector;
  }

  /**
   * Establecer valor de un campo
   */
  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value || "";
    }
  }

  /**
   * Obtener valor de un campo
   */
  getFieldValue(fieldId) {
    const field = document.getElementById(fieldId);
    return field ? field.value.trim() : "";
  }

  /**
   * Limpiar campos del formulario
   */
  clearVesselInfoFields() {
    const fieldIds = [
      "vesselName", "berthName", "amspecRef", "pilotOnBoard", "etbTime",
      "dischargeTimeHours", "cargoProducts", "surveyorName",
      "preDischargeChemist", "postDischargeChemist"
    ];

    fieldIds.forEach(fieldId => this.setFieldValue(fieldId, ""));

    // Limpiar DateTimePickers
    if (this.dateTimeInstances.startDischarge) {
      this.dateTimeInstances.startDischarge.clearSelection(false);
    }
    if (this.dateTimeInstances.etcTime) {
      this.dateTimeInstances.etcTime.clearSelection(false);
    }
  }

  /**
   * Actualizar indicador de estado de guardado
   */
  updateSaveStatus(status) {
    const saveIndicator = document.getElementById("saveStatus");
    if (!saveIndicator) return;

    switch (status) {
      case SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED:
        saveIndicator.innerHTML = '<i class="fas fa-check-circle text-success"></i> All changes saved';
        break;
      case SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVING:
        saveIndicator.innerHTML = '<i class="fas fa-spinner fa-spin text-primary"></i> Saving changes...';
        break;
      case SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED:
        saveIndicator.innerHTML = '<i class="fas fa-exclamation-circle text-warning"></i> Unsaved changes';
        break;
    }
  }

  /**
   * Formatear product types para mostrar
   */
  formatProductTypes(productTypes) {
    if (!productTypes || !Array.isArray(productTypes)) return "";

    try {
      const productNames = productTypes
        .map(product => product?.name || product || "")
        .filter(name => name.length > 0);

      return productNames.join(", ");
    } catch (error) {
      return "";
    }
  }

  /**
   * Obtener instancias de DateTimePickers
   */
  getDateTimeInstances() {
    return this.dateTimeInstances;
  }

  /**
   * Obtener selector de ship nominations
   */
  getShipNominationSelector() {
    return this.shipNominationSelector;
  }
}

export default UIManager;