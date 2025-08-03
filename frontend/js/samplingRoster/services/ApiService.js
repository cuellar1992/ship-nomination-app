/**
 * API Service for Sampling Roster System
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';

export class ApiService {
  /**
   * Cargar ship nominations desde la API
   */
  static async loadShipNominations() {
    try {
      const response = await fetch(SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.SHIP_NOMINATIONS);
      const result = await response.json();

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.message || "Failed to load ship nominations");
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Cargar samplers desde la API
   */
  static async loadSamplers() {
    try {
      const response = await fetch(SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.SAMPLERS);
      const result = await response.json();

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.message || "Failed to load samplers");
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Verificar si existe roster para un nomination
   */
  static async checkExistingRoster(nominationId) {
    try {
      const response = await fetch(`${SAMPLING_ROSTER_CONSTANTS.API_ENDPOINTS.ROSTER_BY_NOMINATION}/${nominationId}`);
      const result = await response.json();

      return {
        success: true,
        exists: result.success && result.exists,
        data: result.data || null
      };
    } catch (error) {
      return {
        success: false,
        exists: false,
        error: error.message
      };
    }
  }
}

export default ApiService;