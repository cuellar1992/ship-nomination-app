/**
 * Form Handler Module - Gestión de formularios, validaciones y envío
 * Migrado desde ship-form-simple.js para mejor modularización
 */
import { ComponentFactory } from '../ui/ComponentFactory.js'; 

class FormHandler {
  constructor(apiManager, componentInstances) {
    this.apiManager = apiManager;
    this.singleSelectInstances = componentInstances.singleSelectInstances;
    this.multiSelectInstances = componentInstances.multiSelectInstances;
    this.dateTimeInstances = componentInstances.dateTimeInstances;
  }

  /**
   * Configurar manejadores del formulario
   * @param {Function} onSubmitSuccess - Callback cuando el envío es exitoso
   */
  setupFormHandlers(onSubmitSuccess) {
    const form = document.getElementById("shipNominationForm");
    const clearBtn = document.getElementById("clearBtn");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSubmit(onSubmitSuccess);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearForm());
    }
  }

  /**
   * Configurar validaciones en tiempo real
   */
  setupRealTimeValidations() {
    // VALIDACIÓN EN TIEMPO REAL PARA AMSPEC REF
    const amspecInput = document.getElementById("amspecRef");
    if (amspecInput) {
      let amspecTimeout;
      amspecInput.addEventListener("input", (e) => {
        clearTimeout(amspecTimeout);
        amspecTimeout = setTimeout(async () => {
          const error = await this.apiManager.validateAmspecRef(e.target.value);
          this.showFieldError("amspecRef", error);
        }, 800);
      });
    }

    // VALIDACIÓN EN TIEMPO REAL PARA CLIENT REF
    const clientRefInput = document.getElementById("clientRef");
    if (clientRefInput) {
      let clientRefTimeout;
      clientRefInput.addEventListener("input", (e) => {
        clearTimeout(clientRefTimeout);
        clientRefTimeout = setTimeout(async () => {
          const error = await this.apiManager.validateClientRef(e.target.value);
          this.showFieldError("clientRef", error);
        }, 800);
      });
    }
  }

  /**
   * Manejar envío del formulario - VERSIÓN CORREGIDA
   * @param {Function} onSuccess - Callback de éxito
   */
  async handleSubmit(onSuccess) {
    Logger.info("Starting form submission", {
      module: "FormHandler",
      showNotification: false,
    });

    // Verificar si estamos en modo edición
    const form = document.getElementById("shipNominationForm");
    let isEditMode = form.dataset.editMode === "true";
    const editId = form.dataset.editId;

    Logger.debug("Form mode", {
      module: "FormHandler",
      data: { mode: isEditMode ? "EDIT" : "CREATE", editId: editId },
      showNotification: false,
    });

    // Validar secuencia de fechas antes de enviar
    if (!ComponentFactory.validateFormDateTimes(this.dateTimeInstances)) {
      Logger.error("Date/time sequence validation failed", {
        module: "FormHandler",
        showNotification: true,
        notificationMessage:
          "Please check the date/time sequence. Times should be in logical order.",
      });
      return;
    }

    // Validar referencias únicas (solo para CREATE, o para EDIT si cambió)
    const amspecRef = document.getElementById("amspecRef").value;
    const clientRef = document.getElementById("clientRef").value;

    // En modo edición, solo validar si la referencia cambió
    let skipAmspecValidation = false;
    let skipClientRefValidation = false;

    if (isEditMode && editId) {
      // Obtener datos originales para comparar
      const originalData = window.simpleShipForm
        .getCrudOperations()
        .getNominationById(editId);
      if (originalData) {
        skipAmspecValidation = amspecRef === originalData.amspecRef;
        skipClientRefValidation = clientRef === originalData.clientRef;
      }
    }

    // Validar AmSpec si es necesario
    if (!skipAmspecValidation) {
      const amspecError = await this.apiManager.validateAmspecRef(amspecRef);
      if (amspecError) {
        Logger.error("AmSpec validation failed", {
          module: "FormHandler",
          showNotification: true,
          notificationMessage: `Validation Error: ${amspecError}`,
        });
        return;
      }
    }

    // Validar Client Ref si es necesario
    if (!skipClientRefValidation && clientRef) {
      const clientRefError = await this.apiManager.validateClientRef(clientRef);
      if (clientRefError) {
        Logger.error("Client Ref validation failed", {
          module: "FormHandler",
          showNotification: true,
          notificationMessage: `Validation Error: ${clientRefError}`,
        });
        return;
      }
    }

    try {
      // Recopilar datos del formulario
      const formData = this.collectFormDataForAPI();
      Logger.debug("Form data collected", {
        module: "FormHandler",
        data: { formData: formData },
        showNotification: false,
      });

      // Validar que todos los campos requeridos estén presentes
      const validationError = this.validateRequiredFields(formData);
      if (validationError) {
        Logger.error("Required fields validation failed", {
          module: "FormHandler",
          showNotification: true,
          notificationMessage: `Validation Error: ${validationError}`,
        });
        return;
      }

      // Mostrar indicador de carga apropiado
      this.showLoadingState(true, isEditMode);

      // Preparar la llamada a la API
      const apiUrl = isEditMode
        ? `/api/shipnominations/${editId}`
        : "/api/shipnominations";
      const method = isEditMode ? "PUT" : "POST";

      Logger.info(`Sending ${method} request to API`, {
        module: "FormHandler",
        data: { method: method, url: apiUrl, requestData: formData },
        showNotification: false,
      });

      // Enviar datos al backend
      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      Logger.debug("API Response received", {
        module: "FormHandler",
        data: { response: result },
        showNotification: false,
      });

      if (result.success) {
        const action = isEditMode ? "updated" : "saved";
        Logger.success(`Ship nomination ${action} successfully`, {
          module: "FormHandler",
          data: { action: action, shipName: formData.shipName },
          showNotification: false,
        });

        // Mostrar notificación de éxito (sistema unificado)
        Logger.success(
          `Ship nomination "${formData.shipName}" ${action} successfully`,
          {
            module: "FormHandler",
            showNotification: true,
            notificationMessage: `Ship nomination "${formData.shipName}" ${action} successfully!`,
          }
        );

        // 🔥 RESTAURAR MODO ANTES DEL FINALLY
        if (isEditMode) {
          Logger.debug("Restoring CREATE mode after successful UPDATE", {
            module: "FormHandler",
            showNotification: false,
          });
          window.simpleShipForm.getCrudOperations().setCreateMode();
          // 🚨 IMPORTANTE: Cambiar la variable para que finally no ejecute showLoadingState con editMode
          isEditMode = false;
        }

        // Limpiar formulario DESPUÉS de restaurar el modo
        this.clearForm();

        // Ejecutar callback de éxito
        if (onSuccess) {
          await onSuccess();
        }
      } else {
        Logger.error(
          `Error ${isEditMode ? "updating" : "saving"} ship nomination`,
          {
            module: "FormHandler",
            error: new Error(result.error),
            showNotification: true,
            notificationMessage: `Error: ${result.error}`,
          }
        );
      }
    } catch (error) {
      Logger.error("Network error during form submission", {
        module: "FormHandler",
        error: error,
        showNotification: true,
        notificationMessage:
          "Network error. Please check your connection and try again.",
      });
    } finally {
      // 🔥 VERIFICAR MODO ACTUAL EN LUGAR DE USAR isEditMode ORIGINAL
      const form = document.getElementById("shipNominationForm");
      const currentEditMode = form.dataset.editMode === "true";

      Logger.debug("Finally - cleaning up loading state", {
        module: "FormHandler",
        data: { currentEditMode: currentEditMode },
        showNotification: false,
      });

      // Ocultar indicador de carga con el modo ACTUAL
      this.showLoadingState(false, currentEditMode);
    }
  }

  /**
   * Recopilar datos del formulario para la API
   * @returns {Object} Datos del formulario
   */
  collectFormDataForAPI() {
    const data = {};

    // Campos básicos del formulario (inputs normales)
    const form = document.getElementById("shipNominationForm");
    const basicInputs = form.querySelectorAll(
      'input[type="text"], input[type="number"], select'
    );

    basicInputs.forEach((input) => {
      if (input.id && input.value.trim() !== "") {
        // Mapear campos del frontend a nombres esperados por el backend
        if (input.id === "vesselName") {
          data.shipName = input.value.trim();
        } else {
          data[input.id] = input.value.trim();
        }
      }
    });

    // Combinar con datos de componentes
    const componentData = ComponentFactory.collectComponentDataForAPI(
      this.singleSelectInstances,
      this.multiSelectInstances,
      this.dateTimeInstances
    );

    return { ...data, ...componentData };
  }

  /**
   * Recopilar todos los datos del formulario (método completo)
   * @returns {Object} Todos los datos del formulario
   */
  collectData() {
    const data = {};

    // Inputs normales (excluir los campos que ahora son componentes)
    const form = document.getElementById("shipNominationForm");
    const inputs = form.querySelectorAll("input, select");
    inputs.forEach((input) => {
      if (
        input.id &&
        input.id !== "productTypes" &&
        input.id !== "pilotOnBoard" &&
        input.id !== "etb" &&
        input.id !== "etc"
      ) {
        data[input.id] = input.value;
      }
    });

    // Combinar con datos de componentes
    const componentData = ComponentFactory.collectComponentData(
      this.singleSelectInstances,
      this.multiSelectInstances,
      this.dateTimeInstances
    );

    return { ...data, ...componentData };
  }

  /**
   * Validar campos requeridos
   * @param {Object} data - Datos a validar
   * @returns {string|null} Error message o null si es válido
   */
  validateRequiredFields(data) {
    const requiredFields = [
      { field: "shipName", label: "Vessel Name" },
      { field: "amspecRef", label: "AmSpec Reference #" },
      { field: "clientName", label: "Client" },
      { field: "productTypes", label: "Product Types" },
      { field: "agent", label: "Agent" },
      { field: "pilotOnBoard", label: "Pilot on Board" },
      { field: "etb", label: "ETB" },
      { field: "etc", label: "ETC" },
      { field: "terminal", label: "Terminal" },
      { field: "berth", label: "Berth" },
      { field: "surveyor", label: "Surveyor" },
      { field: "sampler", label: "Sampler" },
      { field: "chemist", label: "Chemist" },
    ];

    for (const req of requiredFields) {
      if (!data[req.field]) {
        return `${req.field} (${req.label}) is required`;
      }

      // Validar que arrays no estén vacíos
      if (Array.isArray(data[req.field]) && data[req.field].length === 0) {
        return `${req.label} must have at least one selection`;
      }
    }

    return null; // No hay errores
  }

  /**
   * Mostrar/ocultar estado de carga - VERSIÓN CORREGIDA para preservar dataset
   * @param {boolean} isLoading - Si está cargando
   * @param {boolean} isEditMode - Si está en modo edición
   */
  showLoadingState(isLoading, isEditMode = false) {
    const submitBtn = document.querySelector('button[type="submit"]');

    if (submitBtn) {
      if (isLoading) {
        // 🔄 ESTADO DE CARGA
        submitBtn.disabled = true;
        if (isEditMode) {
          submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Updating...';
        } else {
          submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
      } else {
        // ✅ RESTAURAR ESTADO - SIN TOCAR CLASES NI DATASET
        submitBtn.disabled = false;

        if (isEditMode) {
          // En modo edición: solo cambiar el contenido, mantener clases
          submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i>UPDATE';
          // ❌ NO cambiar clases - ya están correctas
          // ❌ NO sobrescribir estilos
        } else {
          // En modo normal: solo cambiar el contenido, mantener clases
          submitBtn.innerHTML = '<i class="fas fa-save"></i>SAVE';
          // ❌ NO cambiar clases - ya están correctas
        }

        Logger.debug("Loading state cleared, button restored", {
          module: "FormHandler",
          showNotification: false,
        });
      }
    }
  }

  /**
   * Mostrar errores de campo
   * @param {string} fieldId - ID del campo
   * @param {string|null} errorMessage - Mensaje de error
   */
  showFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const existingError = field.parentElement.querySelector(".field-error");
    if (existingError) existingError.remove();

    if (errorMessage) {
      field.style.borderColor = "#e74c3c";
      const errorDiv = document.createElement("div");
      errorDiv.className = "field-error";
      errorDiv.style.color = "#e74c3c";
      errorDiv.style.fontSize = "12px";
      errorDiv.style.marginTop = "4px";
      errorDiv.textContent = errorMessage;
      field.parentElement.appendChild(errorDiv);
    } else {
      field.style.borderColor = "#ddd";
    }
  }

  /**
   * Limpiar formulario
   */
  clearForm() {
    document.getElementById("shipNominationForm").reset();

    ComponentFactory.clearAllComponents(
      this.singleSelectInstances,
      this.multiSelectInstances,
      this.dateTimeInstances
    );

    // 🆕 NUEVO: Limpiar validaciones de fecha
    try {
      const dateTimeValidationManager = ComponentFactory.getDateTimeValidationManager();
      if (dateTimeValidationManager) {
        dateTimeValidationManager.clearRestrictions();
        dateTimeValidationManager.resetValidationState();
        
        Logger.debug("DateTime validations cleared", {
          module: "FormHandler",
          showNotification: false,
        });
      }
    } catch (validationError) {
      Logger.error("Error clearing DateTime validations", {
        module: "FormHandler",
        error: validationError,
        showNotification: false,
      });
    }

    // UNA sola notificación global
    Logger.success("Form cleared successfully", {
      module: "FormHandler",
      showNotification: true,
      notificationMessage: "Form data cleared successfully"
    });
  }

  /**
   * Verificar si el formulario tiene datos
   * @returns {boolean} True si tiene datos
   */
  hasFormData() {
    const data = this.collectData();

    // Verificar inputs básicos
    const form = document.getElementById("shipNominationForm");
    const inputs = form.querySelectorAll(
      'input[type="text"], input[type="number"]'
    );

    for (const input of inputs) {
      if (input.value && input.value.trim() !== "") {
        return true;
      }
    }

    // Verificar componentes
    const hasSelections = Object.values(this.singleSelectInstances).some(
      (instance) => instance.getSelectedItem()
    );

    const hasMultiSelections = Object.values(this.multiSelectInstances).some(
      (instance) => instance.getSelectedItems().length > 0
    );

    const hasDates = Object.values(this.dateTimeInstances).some((instance) =>
      instance.getDateTime()
    );

    return hasSelections || hasMultiSelections || hasDates;
  }

  /**
   * Validar formulario antes de envío
   * @returns {Object} Resultado de validación
   */
  validateForm() {
    const data = this.collectFormDataForAPI();

    return {
      isValid: !this.validateRequiredFields(data),
      errors: this.validateRequiredFields(data),
      data: data,
    };
  }

  /**
   * Obtener estado del formulario
   * @returns {Object} Estado actual del formulario
   */
  getFormState() {
    return {
      hasData: this.hasFormData(),
      validation: this.validateForm(),
      componentStates: {
        singleSelects: Object.keys(this.singleSelectInstances).reduce(
          (acc, key) => {
            acc[key] = this.singleSelectInstances[key].getSelectedItem();
            return acc;
          },
          {}
        ),
        multiSelects: Object.keys(this.multiSelectInstances).reduce(
          (acc, key) => {
            acc[key] = this.multiSelectInstances[key].getSelectedItems();
            return acc;
          },
          {}
        ),
        dateTimes: Object.keys(this.dateTimeInstances).reduce((acc, key) => {
          acc[key] = this.dateTimeInstances[key].getDateTime();
          return acc;
        }, {}),
      },
    };
  }

  /**
   * Cargar datos en el formulario (para edición) - VERSIÓN DEBUG
   * @param {Object} data - Datos a cargar
   */
  loadFormData(data) {
    Logger.info("Loading form data for editing", {
      module: "FormHandler",
      data: { editData: data },
      showNotification: false,
    });

    try {
      // PASO 1: Cargar inputs básicos
      Logger.debug("Step 1: Loading basic inputs", {
        module: "FormHandler",
        showNotification: false,
      });
      Object.keys(data).forEach((key) => {
        const input = document.getElementById(key);
        if (input && typeof data[key] === "string") {
          Logger.debug(`Setting input ${key}`, {
            module: "FormHandler",
            data: { key: key, value: data[key] },
            showNotification: false,
          });
          input.value = data[key];
        }
      });
      Logger.success("Basic inputs loaded", {
        module: "FormHandler",
        showNotification: false,
      });

      // PASO 2: Cargar SingleSelects
      Logger.debug("Step 2: Loading SingleSelects", {
        module: "FormHandler",
        data: { availableInstances: Object.keys(this.singleSelectInstances) },
        showNotification: false,
      });

      Object.keys(this.singleSelectInstances).forEach((fieldId) => {
        Logger.debug(`Processing SingleSelect: ${fieldId}`, {
          module: "FormHandler",
          showNotification: false,
        });

        if (data[fieldId]) {
          Logger.debug(`Data for ${fieldId}`, {
            module: "FormHandler",
            data: { fieldId: fieldId, value: data[fieldId] },
            showNotification: false,
          });
          const instance = this.singleSelectInstances[fieldId];

          // Verificar si el método existe
          if (typeof instance.selectItem === "function") {
            Logger.debug(`Calling selectItem for ${fieldId}`, {
              module: "FormHandler",
              showNotification: false,
            });
            instance.selectItem(data[fieldId]);
          } else if (typeof instance.setSelectedItem === "function") {
            Logger.debug(`Calling setSelectedItem for ${fieldId}`, {
              module: "FormHandler",
              showNotification: false,
            });
            instance.setSelectedItem(data[fieldId]);
          } else {
            Logger.warn(`No selectItem method found for ${fieldId}`, {
              module: "FormHandler",
              data: {
                fieldId: fieldId,
                availableMethods: Object.getOwnPropertyNames(
                  Object.getPrototypeOf(instance)
                ),
              },
              showNotification: false,
            });
          }
        }
      });
      Logger.success("SingleSelects processed", {
        module: "FormHandler",
        showNotification: false,
      });

      // PASO 3: Cargar MultiSelects
      Logger.debug("Step 3: Loading MultiSelects", {
        module: "FormHandler",
        data: { availableInstances: Object.keys(this.multiSelectInstances) },
        showNotification: false,
      });

      Object.keys(this.multiSelectInstances).forEach((fieldId) => {
        Logger.debug(`Processing MultiSelect: ${fieldId}`, {
          module: "FormHandler",
          showNotification: false,
        });

        if (data[fieldId] && Array.isArray(data[fieldId])) {
          Logger.debug(`Data for ${fieldId}`, {
            module: "FormHandler",
            data: { fieldId: fieldId, value: data[fieldId] },
            showNotification: false,
          });
          const instance = this.multiSelectInstances[fieldId];

          // Verificar si el método existe
          if (typeof instance.selectItems === "function") {
            Logger.debug(`Calling selectItems for ${fieldId}`, {
              module: "FormHandler",
              showNotification: false,
            });
            instance.selectItems(data[fieldId]);
          } else if (typeof instance.setSelectedItems === "function") {
            Logger.debug(`Calling setSelectedItems for ${fieldId}`, {
              module: "FormHandler",
              showNotification: false,
            });
            instance.setSelectedItems(data[fieldId]);
          } else {
            Logger.warn(`No selectItems method found for ${fieldId}`, {
              module: "FormHandler",
              data: {
                fieldId: fieldId,
                availableMethods: Object.getOwnPropertyNames(
                  Object.getPrototypeOf(instance)
                ),
              },
              showNotification: false,
            });
          }
        }
      });
      Logger.success("MultiSelects processed", {
        module: "FormHandler",
        showNotification: false,
      });

      // PASO 4: Cargar DateTimePickers
      Logger.debug("Step 4: Loading DateTimePickers", {
        module: "FormHandler",
        data: { availableInstances: Object.keys(this.dateTimeInstances) },
        showNotification: false,
      });

      Object.keys(this.dateTimeInstances).forEach((fieldId) => {
        Logger.debug(`Processing DateTimePicker: ${fieldId}`, {
          module: "FormHandler",
          showNotification: false,
        });

        if (data[fieldId]) {
          Logger.debug(`Data for ${fieldId}`, {
            module: "FormHandler",
            data: { fieldId: fieldId, value: data[fieldId] },
            showNotification: false,
          });
          const instance = this.dateTimeInstances[fieldId];

          try {
            const date = new Date(data[fieldId]);
            Logger.debug(`Parsed date for ${fieldId}`, {
              module: "FormHandler",
              data: { fieldId: fieldId, parsedDate: date },
              showNotification: false,
            });

            // Verificar si el método existe
            if (typeof instance.setDateTime === "function") {
              Logger.debug(`Calling setDateTime for ${fieldId}`, {
                module: "FormHandler",
                showNotification: false,
              });
              instance.setDateTime(date);
            } else if (typeof instance.setValue === "function") {
              Logger.debug(`Calling setValue for ${fieldId}`, {
                module: "FormHandler",
                showNotification: false,
              });
              instance.setValue(date);
            } else {
              Logger.warn(`No setDateTime method found for ${fieldId}`, {
                module: "FormHandler",
                data: {
                  fieldId: fieldId,
                  availableMethods: Object.getOwnPropertyNames(
                    Object.getPrototypeOf(instance)
                  ),
                },
                showNotification: false,
              });
            }
          } catch (dateError) {
            Logger.error(`Error parsing date for ${fieldId}`, {
              module: "FormHandler",
              error: dateError,
              showNotification: false,
            });
          }
        }
      });
      Logger.success("DateTimePickers processed", {
        module: "FormHandler",
        showNotification: false,
      });

      // 🆕 NUEVO PASO 5: Aplicar validaciones de fecha para modo edición
      Logger.debug("Step 5: Applying DateTime validations for edit mode", {
        module: "FormHandler",
        showNotification: false,
      });

      try {
        // Obtener el validador de fechas desde ComponentFactory
        const dateTimeValidationManager = ComponentFactory.getDateTimeValidationManager();
        
        if (dateTimeValidationManager) {
          // Cargar datos existentes en el validador para aplicar restricciones
          dateTimeValidationManager.loadExistingData(data);
          
          Logger.success("DateTime validations applied for edit mode", {
            module: "FormHandler",
            showNotification: false,
          });
        } else {
          Logger.warning("DateTimeValidationManager not available", {
            module: "FormHandler",
            showNotification: false,
          });
        }
      } catch (validationError) {
        Logger.error("Error applying DateTime validations", {
          module: "FormHandler",
          error: validationError,
          showNotification: false,
        });
      }

      Logger.success("Form data loaded successfully for editing", {
        module: "FormHandler",
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error loading form data", {
        module: "FormHandler",
        error: error,
        showNotification: true,
        notificationMessage: "Error loading form data for editing",
      });
      throw error;
    }
  }
}

// Exportar para uso en otros módulos
export { FormHandler };
