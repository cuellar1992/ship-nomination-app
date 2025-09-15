/**
 * DateTime Validation Manager - Gestión de validaciones de fechas para Ship Nominations
 * Maneja las reglas de validación de offset +2h entre POB, ETB y ETC
 * 
 * Reglas implementadas:
 * - POB: Sin restricciones
 * - ETB: Mínimo POB + 2h (misma fecha) o POB + 1 día (fecha diferente)
 * - ETC: Mínimo ETB + 2h (misma fecha) o ETB + 1 día (fecha diferente)
 * - Modo edición: Preserva valores históricos pero restringe cambios futuros
 */

import { SHIP_NOMINATION_CONSTANTS } from '../utils/Constants.js';

class DateTimeValidationManager {
  constructor() {
    // Configuración de validación
    this.config = {
      minOffsetHours: 2, // Offset mínimo entre campos
      allowNextDay: true, // Permitir día siguiente para mayor flexibilidad
      preserveHistoricalData: true, // Preservar datos históricos en edición
      validationMode: 'create' // 'create' o 'edit'
    };

    // Instancias de DateTimePicker
    this.dateTimeInstances = {};
    
    // Estado de validación
    this.validationState = {
      pilotOnBoard: null,
      etb: null,
      etc: null,
      isValid: true,
      errors: []
    };

    Logger.info('DateTimeValidationManager initialized', {
      module: 'DateTimeValidationManager',
      config: this.config,
      showNotification: false
    });
  }

  /**
   * Precargar la fecha del campo dependiente al mismo día que la base,
   * preservando la hora existente o usando la hora por defecto del picker,
   * y asegurando que no viole el minDateTime calculado.
   * @param {string} targetField - 'etb' o 'etc'
   * @param {Date} baseDateTime - Fecha/hora base (POB o ETB)
   * @param {Date} minDateTime - Restricción mínima ya calculada
   */
  preloadDependentDate(targetField, baseDateTime, minDateTime) {
    try {
      const targetInstance = this.dateTimeInstances[targetField];
      if (!targetInstance || !baseDateTime) return;

      const existing = targetInstance.getDateTime?.();
      const defaultTime = targetInstance.config?.defaultTime || { hour: 9, minute: 0 };
      const baseHour = existing ? existing.getHours() : defaultTime.hour;
      const baseMinute = existing ? existing.getMinutes() : defaultTime.minute;

      // Si ya está en el mismo día, no forzar cambio de día
      const needsPreload = !existing || existing.toDateString() !== baseDateTime.toDateString();
      if (!needsPreload) return;

      let preload = new Date(baseDateTime);
      preload.setHours(baseHour, baseMinute, 0, 0);

      // Asegurar que cumpla el mínimo
      if (minDateTime && preload < minDateTime) {
        preload = new Date(minDateTime);
      }

      if (typeof targetInstance.setDateTime === 'function') {
        targetInstance.setDateTime(preload);
      }
    } catch (error) {
      Logger.warn('Error preloading dependent date', {
        module: 'DateTimeValidationManager',
        targetField: targetField,
        error: error,
        showNotification: false
      });
    }
  }

  /**
   * Configurar instancias de DateTimePicker
   * @param {Object} dateTimeInstances - Instancias de DateTimePicker
   */
  setDateTimeInstances(dateTimeInstances) {
    this.dateTimeInstances = dateTimeInstances;
    
    // 🔧 DEBUG: Verificar métodos disponibles en cada instancia
    Object.keys(dateTimeInstances).forEach(fieldId => {
      const instance = dateTimeInstances[fieldId];
      if (instance) {
        const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));
        Logger.debug(`DateTimePicker ${fieldId} methods available`, {
          module: 'DateTimeValidationManager',
          fieldId: fieldId,
          availableMethods: availableMethods,
          hasSetMinDate: typeof instance.setMinDate === 'function',
          hasSetMinDateTime: typeof instance.setMinDateTime === 'function',
          showNotification: false
        });
      }
    });
    
    Logger.debug('DateTimePicker instances configured', {
      module: 'DateTimeValidationManager',
      instances: Object.keys(dateTimeInstances),
      showNotification: false
    });
  }

  /**
   * Configurar modo de validación
   * @param {string} mode - 'create' o 'edit'
   */
  setValidationMode(mode) {
    this.config.validationMode = mode;
    
    Logger.debug('Validation mode set', {
      module: 'DateTimeValidationManager',
      mode: mode,
      showNotification: false
    });
  }

  /**
   * Aplicar validaciones y restricciones a todos los campos
   */
  setupValidations() {
    if (!this.dateTimeInstances.pilotOnBoard || 
        !this.dateTimeInstances.etb || 
        !this.dateTimeInstances.etc) {
      Logger.warning('Not all DateTimePicker instances available', {
        module: 'DateTimeValidationManager',
        available: Object.keys(this.dateTimeInstances),
        showNotification: false
      });
      return;
    }

    // Configurar validaciones encadenadas
    this.setupPilotOnBoardValidation();
    this.setupETBValidation();
    this.setupETCValidation();

    Logger.success('DateTime validations configured successfully', {
      module: 'DateTimeValidationManager',
      showNotification: false
    });
  }

  /**
   * Configurar validación para Pilot On Board (sin restricciones)
   */
  setupPilotOnBoardValidation() {
    const pilotInstance = this.dateTimeInstances.pilotOnBoard;
    
    // Guardar callback original
    const originalCallback = pilotInstance.config.onDateTimeChange;
    
    // Configurar nuevo callback con validación
    pilotInstance.config.onDateTimeChange = (dateTime) => {
      // Llamar callback original
      if (originalCallback) {
        originalCallback(dateTime);
      }

      // 🔧 DEBUG: Logging detallado de la fecha
      Logger.debug('Pilot On Board date selected', {
        module: 'DateTimeValidationManager',
        dateTime: dateTime,
        dateTimeType: typeof dateTime,
        isDate: dateTime instanceof Date,
        isValidDate: dateTime instanceof Date && !isNaN(dateTime.getTime()),
        isoString: dateTime instanceof Date ? dateTime.toISOString() : 'N/A',
        localString: dateTime instanceof Date ? dateTime.toString() : 'N/A',
        timezoneOffset: dateTime instanceof Date ? dateTime.getTimezoneOffset() : 'N/A',
        showNotification: false
      });

      // Actualizar estado
      this.validationState.pilotOnBoard = dateTime;
      
      // Recalcular restricciones para ETB
      this.updateETBRestrictions();

      // Precargar fecha de ETB al mismo día que POB respetando mínimo (POB + 2h)
      const minETBDateTime = this.calculateMinDateTime(dateTime, this.config.minOffsetHours);
      this.preloadDependentDate('etb', dateTime, minETBDateTime);
      
      Logger.debug('Pilot On Board validation applied', {
        module: 'DateTimeValidationManager',
        dateTime: dateTime,
        showNotification: false
      });
    };
  }

  /**
   * Configurar validación para ETB (dependiente de POB)
   */
  setupETBValidation() {
    const etbInstance = this.dateTimeInstances.etb;
    
    // Guardar callback original
    const originalCallback = etbInstance.config.onDateTimeChange;
    
    // Configurar nuevo callback con validación
    etbInstance.config.onDateTimeChange = (dateTime) => {
      // Llamar callback original
      if (originalCallback) {
        originalCallback(dateTime);
      }

      // 🔧 CORRECCIÓN: Validar ETB contra POB con mejor manejo de errores
      if (this.validationState.pilotOnBoard && dateTime) {
        const isValid = this.validateETB(dateTime);
        if (!isValid) {
          this.showValidationError('ETB', 'ETB must be at least 2 hours after Pilot On Board time');
          
          // 🔧 NUEVO: Limpiar selección inválida y mostrar mensaje
          try {
            if (typeof etbInstance.clearSelection === 'function') {
              etbInstance.clearSelection();
            }
          } catch (clearError) {
            Logger.warn('Error clearing invalid ETB selection', {
              module: 'DateTimeValidationManager',
              error: clearError,
              showNotification: false
            });
          }
          
          return;
        }
      }

      // Actualizar estado
      this.validationState.etb = dateTime;
      
      // Recalcular restricciones para ETC
      this.updateETCRestrictions();

      // Precargar fecha de ETC al mismo día que ETB respetando mínimo (ETB + 2h)
      const minETCDateTime = this.calculateMinDateTime(dateTime, this.config.minOffsetHours);
      this.preloadDependentDate('etc', dateTime, minETCDateTime);
      
      Logger.debug('ETB validation applied', {
        module: 'DateTimeValidationManager',
        dateTime: dateTime,
        isValid: this.validateETB(dateTime),
        showNotification: false
      });
    };
  }

  /**
   * Configurar validación para ETC (dependiente de ETB)
   */
  setupETCValidation() {
    const etcInstance = this.dateTimeInstances.etc;
    
    // Guardar callback original
    const originalCallback = etcInstance.config.onDateTimeChange;
    
    // Configurar nuevo callback con validación
    etcInstance.config.onDateTimeChange = (dateTime) => {
      // Llamar callback original
      if (originalCallback) {
        originalCallback(dateTime);
      }

      // 🔧 CORRECCIÓN: Validar ETC contra ETB con mejor manejo de errores
      if (this.validationState.etb && dateTime) {
        const isValid = this.validateETC(dateTime);
        if (!isValid) {
          this.showValidationError('ETC', 'ETC must be at least 2 hours after ETB time');
          
          // 🔧 NUEVO: Limpiar selección inválida y mostrar mensaje
          try {
            if (typeof etcInstance.clearSelection === 'function') {
              etcInstance.clearSelection();
            }
          } catch (clearError) {
            Logger.warn('Error clearing invalid ETC selection', {
              module: 'DateTimeValidationManager',
              error: clearError,
              showNotification: false
            });
          }
          
          return;
        }
      }

      // Actualizar estado
      this.validationState.etc = dateTime;
      
      Logger.debug('ETC validation applied', {
        module: 'DateTimeValidationManager',
        dateTime: dateTime,
        isValid: this.validateETC(dateTime),
        showNotification: false
      });
    };
  }

  /**
   * Actualizar restricciones para ETB basado en POB
   */
  updateETBRestrictions() {
    const etbInstance = this.dateTimeInstances.etb;
    const pilotDateTime = this.validationState.pilotOnBoard;
    
    if (!pilotDateTime || !etbInstance) return;

    // Calcular fecha/hora mínima para ETB
    const minETBDateTime = this.calculateMinDateTime(pilotDateTime, this.config.minOffsetHours);
    
    // 🔧 CORRECCIÓN: Aplicar restricción de fecha mínima
    try {
      if (typeof etbInstance.setMinDate === 'function') {
        etbInstance.setMinDate(minETBDateTime);
        Logger.debug('ETB minDate restriction applied successfully', {
          module: 'DateTimeValidationManager',
          pilotDateTime: pilotDateTime,
          minETBDateTime: minETBDateTime,
          showNotification: false
        });
      } else if (typeof etbInstance.setMinDateTime === 'function') {
        etbInstance.setMinDateTime(minETBDateTime);
        Logger.debug('ETB minDateTime restriction applied successfully', {
          module: 'DateTimeValidationManager',
          pilotDateTime: pilotDateTime,
          minETBDateTime: minETBDateTime,
          showNotification: false
        });
      } else {
        Logger.warn('ETB instance does not have setMinDate or setMinDateTime method', {
          module: 'DateTimeValidationManager',
          availableMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(etbInstance)),
          showNotification: false
        });
      }
    } catch (error) {
      Logger.error('Error applying ETB date restrictions', {
        module: 'DateTimeValidationManager',
        error: error,
        showNotification: false
      });
    }
  }

  /**
   * Actualizar restricciones para ETC basado en ETB
   */
  updateETCRestrictions() {
    const etcInstance = this.dateTimeInstances.etc;
    const etbDateTime = this.validationState.etb;
    
    if (!etbDateTime || !etcInstance) return;

    // Calcular fecha/hora mínima para ETC
    const minETCDateTime = this.calculateMinDateTime(etbDateTime, this.config.minOffsetHours);
    
    // 🔧 CORRECCIÓN: Aplicar restricción de fecha mínima
    try {
      if (typeof etcInstance.setMinDate === 'function') {
        etcInstance.setMinDate(minETCDateTime);
        Logger.debug('ETC minDate restriction applied successfully', {
          module: 'DateTimeValidationManager',
          etbDateTime: etbDateTime,
          minETCDateTime: minETCDateTime,
          showNotification: false
        });
      } else if (typeof etcInstance.setMinDateTime === 'function') {
        etcInstance.setMinDateTime(minETCDateTime);
        Logger.debug('ETC minDateTime restriction applied successfully', {
          module: 'DateTimeValidationManager',
          etbDateTime: etbDateTime,
          minETCDateTime: minETCDateTime,
          showNotification: false
        });
      } else {
        Logger.warn('ETC instance does not have setMinDate or setMinDateTime method', {
          module: 'DateTimeValidationManager',
          availableMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(etcInstance)),
          showNotification: false
        });
      }
    } catch (error) {
      Logger.error('Error applying ETC date restrictions', {
        module: 'DateTimeValidationManager',
        error: error,
        showNotification: false
      });
    }
  }

  /**
   * Calcular fecha/hora mínima basada en offset
   * @param {Date} baseDateTime - Fecha/hora base
   * @param {number} offsetHours - Horas de offset
   * @returns {Date} Fecha/hora mínima
   */
  calculateMinDateTime(baseDateTime, offsetHours) {
    if (!baseDateTime || !(baseDateTime instanceof Date) || isNaN(baseDateTime.getTime())) {
      Logger.warn('Invalid baseDateTime provided to calculateMinDateTime', {
        module: 'DateTimeValidationManager',
        baseDateTime: baseDateTime,
        showNotification: false
      });
      return null;
    }

    try {
      const minDateTime = new Date(baseDateTime);
      minDateTime.setHours(minDateTime.getHours() + offsetHours);
      
      Logger.debug('MinDateTime calculated successfully', {
        module: 'DateTimeValidationManager',
        baseDateTime: baseDateTime,
        offsetHours: offsetHours,
        minDateTime: minDateTime,
        showNotification: false
      });
      
      return minDateTime;
    } catch (error) {
      Logger.error('Error calculating minDateTime', {
        module: 'DateTimeValidationManager',
        error: error,
        baseDateTime: baseDateTime,
        offsetHours: offsetHours,
        showNotification: false
      });
      return null;
    }
  }

  /**
   * Validar ETB contra POB
   * @param {Date} etbDateTime - Fecha/hora de ETB
   * @returns {boolean} True si es válido
   */
  validateETB(etbDateTime) {
    const pilotDateTime = this.validationState.pilotOnBoard;
    if (!pilotDateTime) return true;

    const minETBDateTime = this.calculateMinDateTime(pilotDateTime, this.config.minOffsetHours);
    return etbDateTime >= minETBDateTime;
  }

  /**
   * Validar ETC contra ETB
   * @param {Date} etcDateTime - Fecha/hora de ETC
   * @returns {boolean} True si es válido
   */
  validateETC(etcDateTime) {
    const etbDateTime = this.validationState.etb;
    if (!etbDateTime) return true;

    const minETCDateTime = this.calculateMinDateTime(etbDateTime, this.config.minOffsetHours);
    return etcDateTime >= minETCDateTime;
  }

  /**
   * Cargar datos existentes en modo edición
   * @param {Object} formData - Datos del formulario
   */
  loadExistingData(formData) {
    Logger.info('Loading existing data for validation', {
      module: 'DateTimeValidationManager',
      mode: this.config.validationMode,
      showNotification: false
    });

    // Establecer modo edición
    this.setValidationMode('edit');

    // Cargar fechas existentes
    if (formData.pilotOnBoard) {
      this.validationState.pilotOnBoard = new Date(formData.pilotOnBoard);
      this.loadDateTimeValue('pilotOnBoard', this.validationState.pilotOnBoard);
    }

    if (formData.etb) {
      this.validationState.etb = new Date(formData.etb);
      this.loadDateTimeValue('etb', this.validationState.etb);
    }

    if (formData.etc) {
      this.validationState.etc = new Date(formData.etc);
      this.loadDateTimeValue('etc', this.validationState.etc);
    }

    // Aplicar restricciones basadas en datos existentes
    this.applyRestrictionsFromExistingData();

    Logger.success('Existing data loaded and restrictions applied', {
      module: 'DateTimeValidationManager',
      pilotOnBoard: this.validationState.pilotOnBoard,
      etb: this.validationState.etb,
      etc: this.validationState.etc,
      showNotification: false
    });
  }

  /**
   * Cargar valor en un DateTimePicker
   * @param {string} fieldId - ID del campo
   * @param {Date} dateTime - Fecha/hora a cargar
   */
  loadDateTimeValue(fieldId, dateTime) {
    const instance = this.dateTimeInstances[fieldId];
    if (!instance || !dateTime) return;

    try {
      // Cargar el valor
      instance.setDateTime(dateTime);
      
      Logger.debug(`DateTime value loaded for ${fieldId}`, {
        module: 'DateTimeValidationManager',
        fieldId: fieldId,
        dateTime: dateTime,
        showNotification: false
      });
    } catch (error) {
      Logger.error(`Error loading DateTime value for ${fieldId}`, {
        module: 'DateTimeValidationManager',
        fieldId: fieldId,
        error: error,
        showNotification: false
      });
    }
  }

  /**
   * Aplicar restricciones basadas en datos existentes
   */
  applyRestrictionsFromExistingData() {
    // Aplicar restricciones para ETB si hay POB
    if (this.validationState.pilotOnBoard) {
      this.updateETBRestrictions();
    }

    // Aplicar restricciones para ETC si hay ETB
    if (this.validationState.etb) {
      this.updateETCRestrictions();
    }

    Logger.debug('Restrictions applied from existing data', {
      module: 'DateTimeValidationManager',
      showNotification: false
    });
  }

  /**
   * Validar toda la secuencia de fechas
   * @returns {Object} Resultado de validación
   */
  validateAll() {
    const errors = [];
    let isValid = true;

    // Validar ETB contra POB
    if (this.validationState.pilotOnBoard && this.validationState.etb) {
      if (!this.validateETB(this.validationState.etb)) {
        errors.push('ETB must be at least 2 hours after Pilot On Board time');
        isValid = false;
      }
    }

    // Validar ETC contra ETB
    if (this.validationState.etb && this.validationState.etc) {
      if (!this.validateETC(this.validationState.etc)) {
        errors.push('ETC must be at least 2 hours after ETB time');
        isValid = false;
      }
    }

    // Actualizar estado de validación
    this.validationState.isValid = isValid;
    this.validationState.errors = errors;

    Logger.debug('All validations completed', {
      module: 'DateTimeValidationManager',
      isValid: isValid,
      errors: errors,
      showNotification: false
    });

    return {
      isValid: isValid,
      errors: errors
    };
  }

  /**
   * Mostrar error de validación
   * @param {string} fieldId - ID del campo
   * @param {string} message - Mensaje de error
   */
  showValidationError(fieldId, message) {
    Logger.warn(`Validation error for ${fieldId}`, {
      module: 'DateTimeValidationManager',
      fieldId: fieldId,
      message: message,
      showNotification: true,
      notificationMessage: message
    });
  }

  /**
   * Limpiar todas las restricciones
   */
  clearRestrictions() {
    Object.values(this.dateTimeInstances).forEach(instance => {
      if (instance) {
        try {
          // 🔧 CORRECCIÓN: Usar el nuevo método clearDateRestrictions si está disponible
          if (typeof instance.clearDateRestrictions === 'function') {
            instance.clearDateRestrictions();
          } else if (typeof instance.setMinDate === 'function') {
            instance.setMinDate(null);
          } else if (typeof instance.setMinDateTime === 'function') {
            instance.setMinDateTime(null);
          } else if (typeof instance.clearMinDate === 'function') {
            instance.clearMinDate();
          }
        } catch (error) {
          Logger.warn('Error clearing restrictions for instance', {
            module: 'DateTimeValidationManager',
            error: error,
            showNotification: false
          });
        }
      }
    });

    Logger.debug('All restrictions cleared', {
      module: 'DateTimeValidationManager',
      showNotification: false
    });
  }

  /**
   * Obtener estado actual de validación
   * @returns {Object} Estado de validación
   */
  getValidationState() {
    return { ...this.validationState };
  }

  /**
   * Resetear estado de validación
   */
  resetValidationState() {
    this.validationState = {
      pilotOnBoard: null,
      etb: null,
      etc: null,
      isValid: true,
      errors: []
    };

    Logger.debug('Validation state reset', {
      module: 'DateTimeValidationManager',
      showNotification: false
    });
  }
}

// Exportar para uso en otros módulos
export { DateTimeValidationManager };
