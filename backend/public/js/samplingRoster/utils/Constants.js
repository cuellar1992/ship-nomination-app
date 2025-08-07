/**
 * Constants for Sampling Roster System
 */

export const SAMPLING_ROSTER_CONSTANTS = {
  // Configuración de tiempo
  OFFICE_SAMPLING_HOURS: 6,
  MAX_SAMPLER_HOURS: 12,
  MINIMUM_REST_HOURS: 10,
  
  // 🆕 Límites semanales por sampler (Laura, Ruben, Sakib = 24h/semana)
  SAMPLER_LIMITS: {
    WEEKLY_LIMITS: {
      'Laura': 24,
      'Ruben': 24,
      'Sakib': 24
      // Otros samplers sin límite (no listados = sin límite)
    }
  },
  
  DEFAULT_DISCHARGE_START_OFFSET: 3, // horas después de ETB
  
  // Bloques horarios
  DAY_BLOCK_START: 7,   // 07:00
  NIGHT_BLOCK_START: 19, // 19:00
  
  // Auto-save configuración
  AUTO_SAVE_DELAY: 2000, // 2 segundos
  
  // Estados de guardado
  SAVE_STATUS: {
    SAVED: 'saved',
    SAVING: 'saving', 
    UNSAVED: 'unsaved'
  },
  
  // Tipos de bloque
  BLOCK_TYPES: {
    DAY: 'day',
    NIGHT: 'night'
  },
  
  // APIs endpoints - Detección automática de entorno
get API_ENDPOINTS() {
  const getBaseURL = () => {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3000`;
    }
    return '';
  };
  
  const baseURL = getBaseURL();
  
  return {
    SHIP_NOMINATIONS: `${baseURL}/api/shipnominations`,
    SAMPLERS: `${baseURL}/api/samplers`,
    SAMPLING_ROSTERS: `${baseURL}/api/sampling-rosters`,
    ROSTER_BY_NOMINATION: `${baseURL}/api/sampling-rosters/by-nomination`,
    AUTO_SAVE: `${baseURL}/api/sampling-rosters/auto-save`
  };
},
  
  // Mensajes comunes
  MESSAGES: {
    NO_SHIP_NOMINATION: 'Please select a ship nomination first',
    ROSTER_CLEARED: 'Sampling roster cleared',
    AUTO_SAVE_FAILED: 'Auto-save failed. Changes may be lost.'
  },
  
  // ✅ AGREGAMOS LOG_CONFIG que faltaba
  LOG_CONFIG: {
    MODULE_NAME: 'SamplingRoster',
    SHOW_DEBUG: false,
    SHOW_SUCCESS_NOTIFICATIONS: true,
    SHOW_ERROR_NOTIFICATIONS: true
  }
};