/**
 * Incremental Save Service for Sampling Roster System
 * Guarda solo cambios incrementales, no el roster completo
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';

export class IncrementalSaveService {
  constructor() {
    this.debounceTimer = null;
    this.currentRosterId = null;
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED;
    this.isEnabled = true;
  }

  setRosterId(rosterId) {
    this.currentRosterId = rosterId;
  }

  getRosterId() {
    return this.currentRosterId;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled && this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  markUnsaved() {
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED;
  }

  getSaveStatus() {
    return this.saveStatus;
  }

  hasUnsaved() {
    return this.saveStatus === SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED;
  }

  clearState() {
    this.currentRosterId = null;
    this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Dispara un guardado incremental con debounce
   */
  trigger(changeType, payload, options = { immediate: false }) {
    if (!this.isEnabled || !this.currentRosterId) return;
    this.markUnsaved();

    if (options.immediate) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      return this.perform(changeType, payload);
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.perform(changeType, payload);
    }, SAMPLING_ROSTER_CONSTANTS.AUTO_SAVE_DELAY);
  }

  /**
   * Ejecuta el guardado incremental
   */
  async perform(changeType, payload) {
    try {
      this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVING;

      const response = await fetch(
        `${SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.AUTO_SAVE}/${this.currentRosterId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changeType, data: payload })
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Incremental save failed');
      }

      this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.SAVED;
      return { success: true, rosterId: result.data?._id };
    } catch (error) {
      this.saveStatus = SAMPLING_ROSTER_CONSTANTS.SAVE_STATUS.UNSAVED;
      console.error('❌ Incremental save error:', { changeType, error });
      return { success: false, error: error.message };
    }
  }
}

export default IncrementalSaveService;


