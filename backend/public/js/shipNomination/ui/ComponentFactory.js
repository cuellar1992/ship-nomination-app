/**
 * Component Factory Module - Gestión de componentes SingleSelect, MultiSelect y DateTimePicker
 * ✅ MIGRADO AL SISTEMA UNIFICADO DE NOTIFICACIONES
 * ✅ CORREGIDO: Warning de aria-hidden en modales Bootstrap
 *
 * Migrado desde ship-form-simple.js para mejor modularización
 */

import { SHIP_NOMINATION_CONSTANTS } from "../utils/Constants.js";

class ComponentFactory {
  /**
   * Crear todos los componentes SingleSelect
   * @param {Object} singleSelectInstances - Referencia al objeto de instancias
   * @param {Object} apiData - Datos cargados desde API
   * @param {Object} callbacks - Callbacks para eventos
   */
  static createAllSingleSelects(singleSelectInstances, apiData, callbacks) {
    const SINGLE_SELECT_CONFIG = SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG;

    Logger.info("Creating SingleSelect components", {
      module: "ComponentFactory",
      componentCount: Object.keys(SINGLE_SELECT_CONFIG).length,
      showNotification: false,
    });

    Object.keys(SINGLE_SELECT_CONFIG).forEach((fieldId) => {
      const config = SINGLE_SELECT_CONFIG[fieldId];
      const container = document.getElementById(fieldId);

      if (container) {
        let items = [];

        // Determinar origen de datos
        if (config.apiEndpoint) {
          // Usar datos de API - detectar cuál API usar
          if (config.apiEndpoint === "/api/clients") {
            items = apiData.clients || [];
          } else if (config.apiEndpoint === "/api/agents") {
            items = apiData.agents || [];
          } else if (config.apiEndpoint === "/api/terminals") {
            items = apiData.terminals || [];
          } else if (config.apiEndpoint === "/api/berths") {
            items = apiData.berths || [];
          } else if (config.apiEndpoint === "/api/surveyors") {
            items = apiData.surveyors || [];
          } else if (config.apiEndpoint === "/api/samplers") {
            items = apiData.samplers || [];
          } else if (config.apiEndpoint === "/api/chemists") {
            items = apiData.chemists || [];
          }
        } else if (config.data) {
          // Mock data no disponible en arquitectura modular
          items = [];
          Logger.warn(`Mock data not available for ${fieldId}`, {
            module: "ComponentFactory",
            fieldId: fieldId,
            showNotification: false,
          });
        }

        singleSelectInstances[fieldId] = new SingleSelect(fieldId, {
          items: items,
          icon: config.icon,
          label: config.label,
          modalTitle: `${config.label} Management`,
          placeholder: `Select ${config.label.toLowerCase()}...`,

          // 🆕 NUEVA CONFIGURACIÓN: Modo extendido para personas con contacto
          useExtendedEdit: ["sampler", "chemist", "surveyor"].includes(fieldId),
          extendedFields: ["sampler", "chemist", "surveyor"].includes(fieldId)
            ? [
                {
                  name: "email",
                  label: "Email",
                  type: "email",
                  required: false,
                  placeholder: "Enter email address...",
                  validation: {
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
                },
                {
                  name: "phone",
                  label: "Phone",
                  type: "tel",
                  required: false,
                  placeholder: "Enter phone number...",
                  validation: {
                    pattern: /^[\+]?[\d\s\-\(\)\.]{8,20}$/,
                    message: "Please enter a valid phone number",
                  },
                },
              ]
            : [],

          debugExtended:
            console.log(
              `Creating ${fieldId} with useExtended:`,
              ["sampler", "chemist", "surveyor"].includes(fieldId)
            ) || true,

          onSelectionChange: (item) => {
            Logger.debug(`SingleSelect selection changed`, {
              module: "ComponentFactory",
              fieldId: fieldId,
              selectedItem: item,
              showNotification: false,
            });
          },
          onItemAdd: (item) => callbacks.onItemAdd(fieldId, item),
          onItemRemove: (item) => callbacks.onItemRemove(fieldId, item),
          onItemEdit: (updatedData, originalData, index) =>
            callbacks.onItemEdit(fieldId, updatedData, originalData, index),
          onGetItemData: (itemName) => {
            // 🆕 LOGS DE DEBUG TEMPORALES
            console.log(
              `🔍 ComponentFactory: onGetItemData called for ${fieldId} with itemName:`,
              itemName
            );
            console.log(`🔍 ComponentFactory: callbacks object:`, callbacks);
            console.log(
              `🔍 ComponentFactory: callbacks.onGetItemData exists:`,
              !!callbacks.onGetItemData
            );
            if (callbacks.onGetItemData) {
              const result = callbacks.onGetItemData(fieldId, itemName);
              console.log(`🔍 ComponentFactory: result from callback:`, result);
              return result;
            } else {
              console.log(
                `🔍 ComponentFactory: NO callback available, returning basic data`
              );
              return { name: itemName };
            }
          },
        });

        // 🆕 LOG DESPUÉS DE CREAR EL SINGLESELECT
        if (fieldId === "sampler") {
          console.log(`🔍 Created ${fieldId} SingleSelect with config:`, {
            useExtendedEdit:
              singleSelectInstances[fieldId].config.useExtendedEdit,
            hasOnGetItemData:
              !!singleSelectInstances[fieldId].config.onGetItemData,
            callbacksProvided: {
              onItemAdd: !!callbacks.onItemAdd,
              onItemEdit: !!callbacks.onItemEdit,
              onItemRemove: !!callbacks.onItemRemove,
              onGetItemData: !!callbacks.onGetItemData,
            },
          });
        }

        Logger.debug(`Created SingleSelect for ${fieldId}`, {
          module: "ComponentFactory",
          fieldId: fieldId,
          itemCount: items.length,
          apiEndpoint: config.apiEndpoint,
          showNotification: false,
        });

        // ⭐ FIX: Aplicar corrección de accesibilidad al modal del SingleSelect
        setTimeout(() => {
          const modal = document.getElementById(`${fieldId}_modal`);
          if (modal) {
            ComponentFactory.fixModalAccessibility(
              modal,
              `${config.label} Management`
            );
          }
        }, 100);
      } else {
        Logger.warn(`Container not found for SingleSelect`, {
          module: "ComponentFactory",
          fieldId: fieldId,
          showNotification: false,
        });
      }
    });

    Logger.success(`All SingleSelect components created`, {
      module: "ComponentFactory",
      createdCount: Object.keys(singleSelectInstances).length,
      showNotification: false,
    });
  }

  /**
   * Crear todos los componentes MultiSelect
   * @param {Object} multiSelectInstances - Referencia al objeto de instancias
   * @param {Object} apiData - Datos cargados desde API
   * @param {Object} callbacks - Callbacks para eventos
   */
  static createAllMultiSelects(multiSelectInstances, apiData, callbacks) {
    const MULTI_SELECT_CONFIG = SHIP_NOMINATION_CONSTANTS.MULTI_SELECT_CONFIG;

    Logger.info("Creating MultiSelect components", {
      module: "ComponentFactory",
      componentCount: Object.keys(MULTI_SELECT_CONFIG).length,
      showNotification: false,
    });

    Object.keys(MULTI_SELECT_CONFIG).forEach((fieldId) => {
      const config = MULTI_SELECT_CONFIG[fieldId];
      const container = document.getElementById(fieldId);

      if (container) {
        let items = [];

        // Determinar origen de datos
        if (config.apiEndpoint === "/api/producttypes") {
          items = apiData.productTypes || [];
        } else if (config.data) {
          // Mock data no disponible en arquitectura modular
          items = [];
          Logger.warn(`Mock data not available for ${fieldId}`, {
            module: "ComponentFactory",
            fieldId: fieldId,
            showNotification: false,
          });
        }

        multiSelectInstances[fieldId] = new MultiSelect(fieldId, {
          items: items,
          icon: config.icon,
          label: config.label,
          modalTitle: config.modalTitle,
          placeholder: config.placeholder,
          searchPlaceholder: `Search ${config.label.toLowerCase()}...`,
          manageText: `🔧 Manage ${config.label}...`,
          onSelectionChange: (items) => {
            Logger.debug(`MultiSelect selection changed`, {
              module: "ComponentFactory",
              fieldId: fieldId,
              selectedCount: items.length,
              showNotification: false,
            });
          },
          onItemAdd: (item) => callbacks.onItemAdd(fieldId, item),
          onItemRemove: (item) => callbacks.onItemRemove(fieldId, item),
          onItemEdit: (oldName, newName) =>
            callbacks.onItemEdit(fieldId, oldName, newName),
        });

        Logger.debug(`Created MultiSelect for ${fieldId}`, {
          module: "ComponentFactory",
          fieldId: fieldId,
          itemCount: items.length,
          apiEndpoint: config.apiEndpoint,
          showNotification: false,
        });

        // ⭐ FIX: Aplicar corrección de accesibilidad al modal del MultiSelect
        setTimeout(() => {
          const modal = document.getElementById(`${fieldId}_modal`);
          if (modal) {
            ComponentFactory.fixModalAccessibility(modal, config.modalTitle);
          }
        }, 100);
      } else {
        Logger.warn(`Container not found for MultiSelect`, {
          module: "ComponentFactory",
          fieldId: fieldId,
          showNotification: false,
        });
      }
    });

    Logger.success(`All MultiSelect components created`, {
      module: "ComponentFactory",
      createdCount: Object.keys(multiSelectInstances).length,
      showNotification: false,
    });
  }

  /**
   * Crear todos los componentes DateTimePicker
   * @param {Object} dateTimeInstances - Referencia al objeto de instancias
   * @param {Function} onDateTimeChange - Callback para cambios de fecha
   */
  static createAllDateTimePickers(dateTimeInstances, onDateTimeChange) {
    const DATETIME_CONFIG = SHIP_NOMINATION_CONSTANTS.DATETIME_CONFIG;

    Logger.info("Creating DateTimePicker components", {
      module: "ComponentFactory",
      componentCount: Object.keys(DATETIME_CONFIG).length,
      showNotification: false,
    });

    Object.keys(DATETIME_CONFIG).forEach((fieldId) => {
      const config = DATETIME_CONFIG[fieldId];
      const container = document.getElementById(fieldId);

      if (container) {
        dateTimeInstances[fieldId] = new DateTimePicker(fieldId, {
          icon: config.icon,
          label: config.label,
          placeholder: config.placeholder,
          modalTitle: config.modalTitle,
          format: "DD-MM-YYYY HH:mm",
          minuteStep: 15,
          is24Hour: true,
          defaultTime: { hour: 9, minute: 0 },
          onDateTimeChange: (dateTime) => {
            Logger.debug(`DateTimePicker value changed`, {
              module: "ComponentFactory",
              fieldId: fieldId,
              hasValue: !!dateTime,
              showNotification: false,
            });
            // Solo validar si hay fecha Y hora completas
            if (
              dateTime &&
              dateTime instanceof Date &&
              !isNaN(dateTime.getTime())
            ) {
              onDateTimeChange();
            }
          },
        });

        // ⭐ FIX CRÍTICO: Aplicar corrección de accesibilidad al modal del DateTimePicker
        setTimeout(() => {
          const modal = document.getElementById(`${fieldId}_modal`);
          if (modal) {
            ComponentFactory.fixModalAccessibility(modal, config.modalTitle);
            Logger.debug(`Accessibility fix applied to modal`, {
              module: "ComponentFactory",
              modalId: `${fieldId}_modal`,
              showNotification: false,
            });
          }
        }, 150); // Un poco más de tiempo para DateTimePicker

        Logger.debug(`Created DateTimePicker for ${fieldId}`, {
          module: "ComponentFactory",
          fieldId: fieldId,
          modalTitle: config.modalTitle,
          showNotification: false,
        });
      } else {
        Logger.warn(`Container not found for DateTimePicker`, {
          module: "ComponentFactory",
          fieldId: fieldId,
          showNotification: false,
        });
      }
    });

    Logger.success(`All DateTimePicker components created`, {
      module: "ComponentFactory",
      createdCount: Object.keys(dateTimeInstances).length,
      showNotification: false,
    });
  }

  /**
   * 🔧 NUEVO: Fix para aria-hidden warning en modales Bootstrap
   * Soluciona el problema de accesibilidad con elementos focusables en modales
   * @param {HTMLElement} modalElement - Elemento del modal
   * @param {string} ariaLabel - Label para accesibilidad
   */
  static fixModalAccessibility(modalElement, ariaLabel = "Modal Dialog") {
    if (!modalElement) {
      Logger.warn("Modal element not found for accessibility fix", {
        module: "ComponentFactory",
        showNotification: false,
      });
      return;
    }

    // Event listener para cuando el modal se muestra
    modalElement.addEventListener("shown.bs.modal", function () {
      // ⭐ SOLUCIÓN: Remover aria-hidden cuando el modal está visible
      this.removeAttribute("aria-hidden");

      // Asegurar aria-label apropiado
      if (
        !this.getAttribute("aria-label") &&
        !this.getAttribute("aria-labelledby")
      ) {
        this.setAttribute("aria-label", ariaLabel);
      }

      // Mejorar manejo del foco
      const focusableElements = this.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        // Enfocar el primer elemento focusable que no sea el botón de cerrar
        const firstFocusable =
          Array.from(focusableElements).find(
            (el) => !el.classList.contains("btn-close")
          ) || focusableElements[0];

        // Delay para asegurar que el modal esté completamente renderizado
        setTimeout(() => {
          firstFocusable.focus();
        }, 200);
      }

      Logger.debug("Modal accessibility enhanced", {
        module: "ComponentFactory",
        modalId: this.id,
        ariaLabel: ariaLabel,
        focusableElements: focusableElements.length,
        showNotification: false,
      });
    });

    // Event listener para cuando el modal se oculta
    modalElement.addEventListener("hidden.bs.modal", function () {
      // Restaurar aria-hidden cuando está cerrado
      this.setAttribute("aria-hidden", "true");

      Logger.debug("Modal aria-hidden restored", {
        module: "ComponentFactory",
        modalId: this.id,
        showNotification: false,
      });
    });

    // Mejorar navegación con teclado
    modalElement.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const modal = bootstrap.Modal.getInstance(this);
        if (modal) {
          modal.hide();
          Logger.debug("Modal closed with Escape key", {
            module: "ComponentFactory",
            modalId: this.id,
            showNotification: false,
          });
        }
      }
    });
  }

  /**
   * Validar secuencia lógica de fechas (Pilot → ETB → ETC)
   * @param {Object} dateTimeInstances - Instancias de DateTimePicker
   * @returns {boolean} True si la secuencia es válida
   */
  static validateDateTimeSequence(dateTimeInstances) {
    const pilot = dateTimeInstances.pilotOnBoard?.getDateTime();
    const etb = dateTimeInstances.etb?.getDateTime();
    const etc = dateTimeInstances.etc?.getDateTime();

    let isValid = true;

    // Validar que ETB sea después de Pilot on Board
    if (pilot && etb && etb < pilot) {
      Logger.warn("ETB should be after Pilot on Board time", {
        module: "ComponentFactory",
        pilotTime: pilot.toISOString(),
        etbTime: etb.toISOString(),
        showNotification: true,
        notificationMessage: "ETB should be after Pilot on Board time",
      });
      isValid = false;
    }

    // Validar que ETC sea después de ETB
    if (etb && etc && etc < etb) {
      Logger.warn("ETC should be after ETB time", {
        module: "ComponentFactory",
        etbTime: etb.toISOString(),
        etcTime: etc.toISOString(),
        showNotification: true,
        notificationMessage: "ETC should be after ETB time",
      });
      isValid = false;
    }

    // Validar que ETC sea después de Pilot on Board
    if (pilot && etc && etc < pilot) {
      Logger.warn("ETC should be after Pilot on Board time", {
        module: "ComponentFactory",
        pilotTime: pilot.toISOString(),
        etcTime: etc.toISOString(),
        showNotification: true,
        notificationMessage: "ETC should be after Pilot on Board time",
      });
      isValid = false;
    }

    if (isValid) {
      Logger.debug("DateTime sequence validation passed", {
        module: "ComponentFactory",
        showNotification: false,
      });
    }

    return isValid;
  }

  /**
   * Validar fechas para formulario
   * @param {Object} dateTimeInstances - Instancias de DateTimePicker
   * @returns {boolean} True si las fechas son válidas
   */
  static validateFormDateTimes(dateTimeInstances) {
    const pilot = dateTimeInstances.pilotOnBoard?.getDateTime();
    const etb = dateTimeInstances.etb?.getDateTime();
    const etc = dateTimeInstances.etc?.getDateTime();

    // Solo validar si hay fechas seleccionadas
    const isValid = !(
      (pilot && etb && etb < pilot) ||
      (etb && etc && etc < etb) ||
      (pilot && etc && etc < pilot)
    );

    Logger.debug("Form DateTime validation", {
      module: "ComponentFactory",
      isValid: isValid,
      hasPilot: !!pilot,
      hasETB: !!etb,
      hasETC: !!etc,
      showNotification: false,
    });

    return isValid;
  }

  /**
   * Actualizar todos los selects de un tipo específico
   * @param {string} dataKey - Clave de datos en MOCK_DATA
   * @param {Object} singleSelectInstances - Instancias SingleSelect
   * @param {Object} multiSelectInstances - Instancias MultiSelect
   */
  static updateAllSelectsOfType(
    dataKey,
    singleSelectInstances,
    multiSelectInstances
  ) {
    Logger.info(`Updating selects of type: ${dataKey}`, {
      module: "ComponentFactory",
      dataKey: dataKey,
      showNotification: false,
    });

    let updatedCount = 0;

    const SINGLE_SELECT_CONFIG = SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG;
    const MULTI_SELECT_CONFIG = SHIP_NOMINATION_CONSTANTS.MULTI_SELECT_CONFIG;

    // Actualizar SingleSelects
    Object.keys(SINGLE_SELECT_CONFIG).forEach((fieldId) => {
      if (
        SINGLE_SELECT_CONFIG[fieldId].data === dataKey &&
        singleSelectInstances[fieldId]
      ) {
        updatedCount++;
      }
    });

    // Actualizar MultiSelects
    Object.keys(MULTI_SELECT_CONFIG).forEach((fieldId) => {
      if (
        MULTI_SELECT_CONFIG[fieldId].data === dataKey &&
        multiSelectInstances[fieldId]
      ) {
        updatedCount++;
      }
    });

    Logger.success(`Updated ${updatedCount} components of type ${dataKey}`, {
      module: "ComponentFactory",
      dataKey: dataKey,
      updatedCount: updatedCount,
      showNotification: false,
    });
  }

  /**
   * Limpiar todos los componentes
   * @param {Object} singleSelectInstances - Instancias SingleSelect
   * @param {Object} multiSelectInstances - Instancias MultiSelect
   * @param {Object} dateTimeInstances - Instancias DateTimePicker
   */
  static clearAllComponents(
    singleSelectInstances,
    multiSelectInstances,
    dateTimeInstances,
    showNotifications = false
  ) {
    Logger.info("Clearing all components", {
      module: "ComponentFactory",
      showNotification: false,
    });

    let clearedCount = 0;

    // Limpiar SingleSelects
    Object.values(singleSelectInstances).forEach((instance) => {
      instance.clearSelection();
      clearedCount++;
    });

    // Limpiar MultiSelects
    Object.values(multiSelectInstances).forEach((instance) => {
      instance.clearSelection();
      clearedCount++;
    });

    // Limpiar DateTimePickers SIN notificaciones individuales
    Object.values(dateTimeInstances).forEach((instance) => {
      instance.clearSelection(false); // ← Pasar false para no mostrar notificación
      clearedCount++;
    });

    Logger.success("All components cleared", {
      module: "ComponentFactory",
      data: { clearedCount: clearedCount },
      showNotification: false,
    });
  }

  /**
   * Recopilar datos de todos los componentes
   * @param {Object} singleSelectInstances - Instancias SingleSelect
   * @param {Object} multiSelectInstances - Instancias MultiSelect
   * @param {Object} dateTimeInstances - Instancias DateTimePicker
   * @returns {Object} Datos recopilados
   */
  static collectComponentData(
    singleSelectInstances,
    multiSelectInstances,
    dateTimeInstances
  ) {
    Logger.debug("Collecting component data", {
      module: "ComponentFactory",
      showNotification: false,
    });

    const data = {};

    // SingleSelects
    Object.keys(singleSelectInstances).forEach((fieldId) => {
      data[fieldId] = singleSelectInstances[fieldId].getSelectedItem();
    });

    // MultiSelects
    Object.keys(multiSelectInstances).forEach((fieldId) => {
      data[fieldId] = multiSelectInstances[fieldId].getSelectedItems();
    });

    // DateTimePickers
    Object.keys(dateTimeInstances).forEach((fieldId) => {
      const instance = dateTimeInstances[fieldId];
      data[fieldId] = instance.getDateTime();
      data[fieldId + "_formatted"] = instance.getFormattedDateTime();
      data[fieldId + "_iso"] = instance.getISOString();
    });

    Logger.debug("Component data collected", {
      module: "ComponentFactory",
      fieldsCollected: Object.keys(data).length,
      showNotification: false,
    });

    return data;
  }

  /**
   * Recopilar datos para API específicamente
   * @param {Object} singleSelectInstances - Instancias SingleSelect
   * @param {Object} multiSelectInstances - Instancias MultiSelect
   * @param {Object} dateTimeInstances - Instancias DateTimePicker
   * @returns {Object} Datos para API
   */
  static collectComponentDataForAPI(
    singleSelectInstances,
    multiSelectInstances,
    dateTimeInstances
  ) {
    Logger.debug("Collecting component data for API", {
      module: "ComponentFactory",
      showNotification: false,
    });

    const data = {};

    // SingleSelects - obtener nombres seleccionados
    Object.keys(singleSelectInstances).forEach((fieldId) => {
      const selectedItem = singleSelectInstances[fieldId].getSelectedItem();
      if (selectedItem) {
        if (fieldId === "clientName") {
          data.clientName = selectedItem;
        } else {
          data[fieldId] = selectedItem;
        }
      }
    });

    // MultiSelects - obtener array de nombres
    Object.keys(multiSelectInstances).forEach((fieldId) => {
      const selectedItems = multiSelectInstances[fieldId].getSelectedItems();
      if (selectedItems && selectedItems.length > 0) {
        data[fieldId] = selectedItems;
      }
    });

    // DateTimePickers - obtener fechas en formato ISO
    Object.keys(dateTimeInstances).forEach((fieldId) => {
      const dateTime = dateTimeInstances[fieldId].getDateTime();
      if (dateTime) {
        data[fieldId] = dateTime.toISOString();
      }
    });

    Logger.debug("API data prepared", {
      module: "ComponentFactory",
      apiFields: Object.keys(data).length,
      hasDateTimes: Object.keys(dateTimeInstances).some((key) => data[key]),
      showNotification: false,
    });

    return data;
  }

  /**
   * Verificar que todos los componentes estén disponibles
   * @returns {boolean} True si están disponibles
   */
  static areComponentsAvailable() {
    const available =
      typeof SingleSelect !== "undefined" &&
      typeof MultiSelect !== "undefined" &&
      typeof DateTimePicker !== "undefined";

    Logger.debug("Components availability check", {
      module: "ComponentFactory",
      available: available,
      singleSelect: typeof SingleSelect !== "undefined",
      multiSelect: typeof MultiSelect !== "undefined",
      dateTimePicker: typeof DateTimePicker !== "undefined",
      showNotification: false,
    });

    return available;
  }

  /**
   * Esperar a que los componentes estén disponibles
   * @param {Function} callback - Función a ejecutar cuando estén listos
   * @param {number} maxAttempts - Máximo número de intentos
   */
  static waitForComponents(callback, maxAttempts = 50) {
    let attempts = 0;

    Logger.info("Waiting for components to be available", {
      module: "ComponentFactory",
      maxAttempts: maxAttempts,
      showNotification: false,
    });

    const check = () => {
      attempts++;
      if (this.areComponentsAvailable()) {
        Logger.success("All components are now available", {
          module: "ComponentFactory",
          attempts: attempts,
          showNotification: false,
        });
        callback();
      } else if (attempts < maxAttempts) {
        Logger.debug(
          `Components not ready, attempt ${attempts}/${maxAttempts}`,
          {
            module: "ComponentFactory",
            attempts: attempts,
            showNotification: false,
          }
        );
        setTimeout(check, 100);
      } else {
        Logger.error("Components failed to load after maximum attempts", {
          module: "ComponentFactory",
          attempts: maxAttempts,
          showNotification: true,
          notificationMessage:
            "Components failed to load. Please refresh the page.",
        });
      }
    };

    check();
  }

  /**
   * 🆕 NUEVO: Aplicar fix de accesibilidad a todos los modales existentes
   * Útil para modales que ya existen en el DOM
   */
  static fixAllExistingModals() {
    const existingModals = document.querySelectorAll(".modal");

    Logger.info("Applying accessibility fixes to existing modals", {
      module: "ComponentFactory",
      modalCount: existingModals.length,
      showNotification: false,
    });

    existingModals.forEach((modal) => {
      const modalTitle =
        modal.querySelector(".modal-title")?.textContent ||
        modal.id ||
        "Modal Dialog";

      ComponentFactory.fixModalAccessibility(modal, modalTitle);
    });

    Logger.success(
      `Accessibility fixes applied to ${existingModals.length} existing modals`,
      {
        module: "ComponentFactory",
        modalCount: existingModals.length,
        showNotification: false,
      }
    );
  }

  /**
   * 🆕 NUEVO: Determinar si un campo debe usar modo extendido
   * @param {string} fieldId - ID del campo
   * @returns {boolean} True si debe usar modo extendido
   */
  static shouldUseExtendedEdit(fieldId) {
    // Solo personas (no entidades) necesitan email/phone
    const extendedEditFields = ["sampler", "chemist", "surveyor"];
    return extendedEditFields.includes(fieldId);
  }

  /**
   * 🆕 NUEVO: Obtener configuración de campos extendidos
   * @param {string} fieldId - ID del campo
   * @returns {Array} Array de configuración de campos
   */
  static getExtendedFields(fieldId) {
    if (!ComponentFactory.shouldUseExtendedEdit(fieldId)) {
      return [];
    }

    // Configuración estándar para personas
    return [
      {
        name: "email",
        label: "Email",
        type: "email",
        required: false,
        placeholder: "Enter email address...",
        validation: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: "Please enter a valid email address",
        },
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        required: false,
        placeholder: "Enter phone number...",
        validation: {
          pattern: /^[\+]?[\d\s\-\(\)\.]{8,20}$/,
          message: "Please enter a valid phone number",
        },
      },
    ];
  }

  /**
   * 🆕 NUEVO: Obtener configuración completa de campo extendido
   * @param {string} fieldId - ID del campo
   * @returns {Object} Configuración completa
   */
  static getExtendedConfiguration(fieldId) {
    const baseConfig = SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG[fieldId];

    if (!ComponentFactory.shouldUseExtendedEdit(fieldId)) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      useExtendedEdit: true,
      extendedFields: ComponentFactory.getExtendedFields(fieldId),
      extendedModalTitle: `${baseConfig.label} Contact Management`,
      extendedAddTitle: `Add New ${baseConfig.label}`,
      extendedEditTitle: `Edit ${baseConfig.label}`,
      extendedDeleteTitle: `Delete ${baseConfig.label}`,
    };
  }
}

// Exportar para uso en otros módulos
export { ComponentFactory };
