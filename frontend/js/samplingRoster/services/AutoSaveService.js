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