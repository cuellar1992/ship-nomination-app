/**
 * Auto Save Service for Sampling Roster System
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';

export class AutoSaveService {
  constructor() {
    this.autoSaveTimeout = null;
    this.hasUnsavedChanges = false;
    this.isAutoSaveEnabled = true;
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED;
    this.currentRosterId = null;
  }

  /**
   * Trigger auto-save con delay (debounced)
   */
  triggerAutoSave(changeType = "general", dataCollector) {
    if (!this.isAutoSaveEnabled) return;

    this.hasUnsavedChanges = true;
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED;

    // Clear timeout anterior
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Auto-save después de 2 segundos de inactividad
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave(changeType, dataCollector);
    }, SAMPLING_ROSTER_CONSTANTS.AUTO_SAVE_DELAY);
  }

  /**
   * Trigger auto-save inmediato
   */
  triggerAutoSaveImmediate(changeType, dataCollector) {
    if (!this.isAutoSaveEnabled) return;

    // Cancel delayed save
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    this.performAutoSave(changeType, dataCollector);
  }

  /**
   * Ejecutar auto-save
   */
  async performAutoSave(changeType, dataCollector) {
    try {
      this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVING;

      const rosterData = dataCollector();

      // ✅ VALIDACIÓN MEJORADA: Verificar datos críticos antes de enviar
      if (!rosterData) {
        throw new Error("No roster data available for auto-save");
      }

      // ✅ VALIDACIÓN CRÍTICA: Verificar que startDischarge y etcTime estén presentes
      if (!rosterData.startDischarge || !rosterData.etcTime) {
        console.warn('⚠️ Auto-save validation: Missing critical time data', {
          hasStartDischarge: !!rosterData.startDischarge,
          hasETC: !!rosterData.etcTime,
          startDischarge: rosterData.startDischarge,
          etcTime: rosterData.etcTime
        });
        
        // No fallar, pero loggear la advertencia
      }

      // ✅ VALIDACIÓN: Verificar Office Sampling data
      if (!rosterData.officeSampling || !rosterData.officeSampling.startTime || !rosterData.officeSampling.finishTime) {
        console.warn('⚠️ Auto-save validation: Missing Office Sampling data', {
          hasOfficeSampling: !!rosterData.officeSampling,
          startTime: rosterData.officeSampling?.startTime,
          finishTime: rosterData.officeSampling?.finishTime
        });
      }

      // Validación adicional solo si es un nuevo roster
      if (!this.currentRosterId) {
        const lineData = rosterData.lineSampling || [];

        // Si no hay turnos, evitar enviar POST
        if (lineData.length === 0) {
          this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED;
          return {
            success: false,
            message: "Auto-save skipped: new roster without line sampling data"
          };
        }
      }

      // ✅ LOGGING MEJORADO: Mostrar qué datos se van a enviar
      console.log('💾 Auto-save data being sent:', {
        changeType: changeType,
        hasRosterId: !!this.currentRosterId,
        rosterId: this.currentRosterId,
        startDischarge: rosterData.startDischarge,
        etcTime: rosterData.etcTime,
        hasCustomStartDischarge: rosterData.hasCustomStartDischarge,
        hasCustomETC: rosterData.hasCustomETC,
        officeSampling: rosterData.officeSampling ? {
          startTime: rosterData.officeSampling.startTime,
          finishTime: rosterData.officeSampling.finishTime,
          hours: rosterData.officeSampling.hours
        } : null
      });

      let response;
      if (this.currentRosterId) {
        // UPDATE roster existente
        response = await fetch(
          `${SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.AUTO_SAVE}/${this.currentRosterId}`,
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
        response = await fetch(SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.SAMPLING_ROSTERS, {
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
        this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED;

        // ✅ LOGGING DE ÉXITO MEJORADO
        console.log('✅ Auto-save completed successfully:', {
          changeType: changeType,
          rosterId: this.currentRosterId,
          message: result.message
        });

        return {
          success: true,
          message: "Auto-save completed",
          rosterId: this.currentRosterId
        };
      } else {
        throw new Error(result.message || "Auto-save failed");
      }
    } catch (error) {
      this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED;

      // ✅ LOGGING DE ERROR MEJORADO
      console.error('❌ Auto-save failed:', {
        changeType: changeType,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Habilitar/deshabilitar auto-save
   */
  setAutoSaveEnabled(enabled) {
    this.isAutoSaveEnabled = enabled;
    
    if (!enabled && this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
  }

  /**
   * Obtener estado de guardado
   */
  getSaveStatus() {
    return this.saveStatus;
  }

  /**
   * Verificar si hay cambios sin guardar
   */
  hasUnsaved() {
    return this.hasUnsavedChanges;
  }

  /**
   * Establecer ID del roster actual
   */
  setCurrentRosterId(rosterId) {
    this.currentRosterId = rosterId;
  }

  /**
   * Obtener ID del roster actual
   */
  getCurrentRosterId() {
    return this.currentRosterId;
  }

  /**
   * Limpiar estado
   */
  clearState() {
    this.currentRosterId = null;
    this.hasUnsavedChanges = false;
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED;
    
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
  }

  /**
   * Establecer estado manualmente
   */
  setSaveStatus(status) {
    this.saveStatus = status;
  }

  /**
   * Marcar como modificado
   */
  markAsModified() {
    this.hasUnsavedChanges = true;
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED;
  }

  /**
   * Marcar como guardado
   */
  markAsSaved() {
    this.hasUnsavedChanges = false;
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED;
  }
}

export default AutoSaveService;