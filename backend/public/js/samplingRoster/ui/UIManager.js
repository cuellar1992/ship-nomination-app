/**
 * UI Manager for Sampling Roster System
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';
import DateUtils from '../utils/DateUtils.js';

export class UIManager {
  constructor() {
    this.dateTimeInstances = {};
    this.shipNominationSelector = null;
    this.currentSearchItems = [];
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
 * Crear selector de ship nominations con búsqueda dinámica
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

  // Inicializar currentSearchItems con los items originales
  this.currentSearchItems = selectorItems;

  this.shipNominationSelector = new SingleSelect("shipNominationSelector", {
    items: selectorItems.map((item) => item.displayText),
    icon: "fas fa-ship",
    label: "Ship Nomination",
    placeholder: "Select ship nomination...",
    searchPlaceholder: "Search by vessel name or AmSpec...",
    modalTitle: "Ship Nominations Available",
    showManageOption: false,
    onSelectionChange: (selectedDisplayText) => {
      // Usar currentSearchItems (que pueden ser originales o de búsqueda)
      onSelectionChange(selectedDisplayText, this.currentSearchItems);
    },
  });

  // Configurar búsqueda dinámica
  this.setupDynamicSearch(onSelectionChange);
  this.setupDropdownCleanup();

  return this.shipNominationSelector;
}

/**
 * Configurar búsqueda dinámica
 */
setupDynamicSearch(onSelectionChange) {
  // PASO 1: Interceptar apertura del dropdown para configurar búsqueda dinámica
  const originalOpenDropdown = this.shipNominationSelector.openDropdown;
  this.shipNominationSelector.openDropdown = async () => {
    // Llamar al método original
    originalOpenDropdown.call(this.shipNominationSelector);
    
    // Configurar búsqueda dinámica después de que se cree el dropdown
    setTimeout(() => {
      this.configureSearchInput();
    }, 100);
    
    // Solo restaurar si no hay búsqueda activa
    setTimeout(async () => {
      const currentSearchInput = document.querySelector('#shipNominationSelector_search');
      if (currentSearchInput && currentSearchInput.value.trim() === '') {
        await this.restoreOriginalItems();
      }
    }, 150);
  };
}

/**
 * Configurar el input de búsqueda para búsqueda dinámica
 */
configureSearchInput() {
  const searchInput = document.querySelector('#shipNominationSelector_search');
  
  if (!searchInput) {
    console.warn('Search input not found for dynamic search configuration');
    return;
  }
  
  console.log('Configuring dynamic search input...');
  
  // PASO 1: Deshabilitar función filterItems del SingleSelect
  if (this.shipNominationSelector && this.shipNominationSelector.filterItems) {
    this.shipNominationSelector.filterItems = () => {
      console.log('Local filter disabled - using dynamic search');
    };
  }
  
  // PASO 2: Remover todos los event listeners existentes clonando el input
  const newInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newInput, searchInput);
  
  let searchTimeout;
  
  // PASO 3: Configurar nuevo event listener para búsqueda dinámica
  newInput.addEventListener('input', async (e) => {
    const searchTerm = e.target.value.trim();
    
    console.log('Dynamic search triggered:', searchTerm);
    
    clearTimeout(searchTimeout);
    
    if (searchTerm.length >= 2) {
      // Búsqueda al servidor con debounce
      searchTimeout = setTimeout(async () => {
        console.log('Performing server search for:', searchTerm);
        await this.performDynamicSearch(searchTerm);
      }, 500);
      
    } else if (searchTerm.length === 0) {
      // Campo vacío - restaurar originales
      console.log('Empty search - restoring original items');
      await this.restoreOriginalItems();
      
    } else {
      // 1 carácter - filtrar localmente en items actuales
      this.filterCurrentItems(searchTerm);
    }
  });
  
  // PASO 4: Evitar que el input cierre el dropdown
  newInput.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // PASO 5: Auto-focus después de configurar
  setTimeout(() => newInput.focus(), 50);
  
  console.log('Dynamic search configured successfully');
}

/**
 * Configurar limpieza al cerrar dropdown
 */
setupDropdownCleanup() {
  if (this.shipNominationSelector) {
    const originalCloseDropdown = this.shipNominationSelector.closeDropdown;
    this.shipNominationSelector.closeDropdown = () => {
      // Limpiar búsqueda al cerrar
      setTimeout(() => {
        const searchInput = document.querySelector('#shipNominationSelector_search');
        if (searchInput) {
          searchInput.value = '';
        }
      }, 100);
      
      // Llamar al método original
      originalCloseDropdown.call(this.shipNominationSelector);
    };
  }
}

/**
 * Realizar búsqueda dinámica al servidor
 */
async performDynamicSearch(searchTerm) {
  try {
    console.log('Performing dynamic search for:', searchTerm);
    
    const result = await window.samplingRosterController.apiService.loadShipNominations(searchTerm);
    
    if (result.success && result.data.length > 0) {
      // Convertir a formato SingleSelect
      const searchItems = result.data.map((nomination) => {
        const displayText = nomination.amspecRef
          ? `${nomination.vesselName} (${nomination.amspecRef})`
          : nomination.vesselName;

        return {
          id: nomination._id,
          displayText: displayText,
          originalData: nomination,
        };
      });
      
      // Actualizar items del SingleSelect
      this.shipNominationSelector.updateItems(
        searchItems.map(item => item.displayText)
      );
      
      // Guardar items de búsqueda
      this.currentSearchItems = searchItems;
      
      console.log(`Found ${result.data.length} results for "${searchTerm}"`);
    } else {
      // No hay resultados
      this.shipNominationSelector.updateItems([]);
      this.currentSearchItems = [];
      console.log(`No results found for "${searchTerm}"`);
    }
  } catch (error) {
    console.error('Error in dynamic search:', error);
  }
}

/**
 * Restaurar items originales (5 más recientes)
 */
async restoreOriginalItems() {
  try {
    const result = await window.samplingRosterController.apiService.loadShipNominations('', 'recent');
    
    if (result.success) {
      const originalItems = result.data.map((nomination) => {
        const displayText = nomination.amspecRef
          ? `${nomination.vesselName} (${nomination.amspecRef})`
          : nomination.vesselName;

        return {
          id: nomination._id,
          displayText: displayText,
          originalData: nomination,
        };
      });
      
      this.shipNominationSelector.updateItems(
        originalItems.map(item => item.displayText)
      );
      
      this.currentSearchItems = originalItems;
      window.samplingRosterController.shipNominationsData = result.data;
      
      console.log('Restored original 5 items');
    }
  } catch (error) {
    console.error('Error restoring original items:', error);
  }
}

/**
 * Filtrar items actuales localmente
 */
filterCurrentItems(searchTerm) {
  if (!searchTerm) {
    // Mostrar todos los items actuales
    this.shipNominationSelector.updateItems(
      this.currentSearchItems.map(item => item.displayText)
    );
    return;
  }
  
  const filtered = this.currentSearchItems.filter(item => 
    item.displayText.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log(`Local filter: "${searchTerm}" found ${filtered.length} items`);
  
  this.shipNominationSelector.updateItems(
    filtered.map(item => item.displayText)
  );
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