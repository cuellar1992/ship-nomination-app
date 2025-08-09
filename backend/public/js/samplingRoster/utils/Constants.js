/**
 * Constants for Sampling Roster System
 */

export const SAMPLING_ROSTER_CONSTANTS = {
  // Configuración de tiempo
  OFFICE_SAMPLING_HOURS: 6,
  MAX_SAMPLER_HOURS: 12,
  MINIMUM_REST_HOURS: 10,
  
  // 🆕 Límites semanales por sampler (SE CARGAN DINÁMICAMENTE DESDE BD)
SAMPLER_LIMITS: {
  WEEKLY_LIMITS: {}, // Se inicializa vacío, se carga desde API
  
  // 🆕 NUEVO: Función para cargar límites desde base de datos
  async loadWeeklyLimitsFromDatabase() {
    try {
      // Obtener URL base
      const getBaseURL = () => {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return `${protocol}//${hostname}:3000`;
        }
        return '';
      };
      
      const baseURL = getBaseURL();
      const response = await fetch(`${baseURL}/api/samplers`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Limpiar límites anteriores
        this.WEEKLY_LIMITS = {};
        
        // Cargar samplers con restricción desde BD
        result.data.forEach(sampler => {
          if (sampler.weeklyRestriction === true) {
            this.WEEKLY_LIMITS[sampler.name] = 24;
          }
        });
        
        console.log('✅ Weekly limits loaded from database:', this.WEEKLY_LIMITS);
        return this.WEEKLY_LIMITS;
      }
    } catch (error) {
      console.error('❌ Error loading weekly limits from database:', error);
      
      // Fallback: usar límites hardcodeados como respaldo
      this.WEEKLY_LIMITS = {
        'Laura': 24,
        'Ruben': 24,
        'Sakib': 24
      };
      console.warn('⚠️ Using fallback hardcoded limits:', this.WEEKLY_LIMITS);
    }
    
    return this.WEEKLY_LIMITS;
  },
  
  // 🆕 NUEVO: Función para refrescar límites
  async refreshWeeklyLimits() {
    return await this.loadWeeklyLimitsFromDatabase();
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

// 🆕 INICIALIZACIÓN AUTOMÁTICA: Cargar límites al importar el módulo
if (typeof window !== 'undefined') {
  // Hacer constantes disponibles globalmente
  window.SAMPLING_ROSTER_CONSTANTS = SAMPLING_ROSTER_CONSTANTS;
  
  // Cargar límites semanales automáticamente cuando esté listo el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS.loadWeeklyLimitsFromDatabase();
      }, 1000);
    });
  } else {
    // DOM ya está listo
    setTimeout(() => {
      SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS.loadWeeklyLimitsFromDatabase();
    }, 1000);
  }
}