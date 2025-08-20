/**
 * Constants for Ship Nomination System
 * ✅ CORREGIDO - Sin referencia circular
 */

export const SHIP_NOMINATION_CONSTANTS = {
  // Configuración de formulario
  FORM: {
    MAX_VESSEL_NAME_LENGTH: 100,
    MAX_CLIENT_REF_LENGTH: 50,
    MIN_SEARCH_CHARS: 2
  },
  
  // Estados de nomination
  STATUS: {
    DRAFT: 'draft',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  
  // Configuración de API endpoints
  API_ENDPOINTS: {
  SHIP_NOMINATIONS: '/ship-nomination-complete-backend/api/shipnominations',
  CLIENTS: '/ship-nomination-complete-backend/api/clients',
  AGENTS: '/ship-nomination-complete-backend/api/agents',
  TERMINALS: '/ship-nomination-complete-backend/api/terminals',
  BERTHS: '/ship-nomination-complete-backend/api/berths',
  SURVEYORS: '/ship-nomination-complete-backend/api/surveyors',
  SAMPLERS: '/ship-nomination-complete-backend/api/samplers',
  CHEMISTS: '/ship-nomination-complete-backend/api/chemists',
  PRODUCT_TYPES: '/ship-nomination-complete-backend/api/producttypes'
},
  
  // ✅ AGREGAR CONFIGURACIONES FALTANTES:
  SINGLE_SELECT_CONFIG: {    
    agent: {
      label: 'Agent',
      icon: 'fas fa-handshake',
      apiEndpoint: '/api/agents'
    },
    terminal: {
      label: 'Terminal',
      icon: 'fas fa-warehouse',
      apiEndpoint: '/api/terminals'
    },
    berth: {
      label: 'Berth',
      icon: 'fas fa-anchor',
      apiEndpoint: '/api/berths'
    },
    surveyor: {
      label: 'Surveyor',
      icon: 'fas fa-user-tie',
      apiEndpoint: '/api/surveyors'
    },
    sampler: {
      label: 'Sampler',
      icon: 'fas fa-vial',
      apiEndpoint: '/api/samplers'
    },
    chemist: {
      label: 'Chemist',
      icon: 'fas fa-flask',
      apiEndpoint: '/api/chemists'
    }
  },
  
  MULTI_SELECT_CONFIG: {
    clientName: {
    label: 'Client',
    icon: 'fas fa-building',
    modalTitle: 'Client Management',
    placeholder: 'Select clients...',
    apiEndpoint: '/api/clients'
  },
  productTypes: {
    label: 'Product Types',
    icon: 'fas fa-oil-can',
    modalTitle: 'Product Types Management',
    placeholder: 'Select product types...',
    apiEndpoint: '/api/producttypes'
  }   
  },
  
  DATETIME_CONFIG: {
    pilotOnBoard: {
      label: 'Pilot on Board',
      icon: 'fas fa-ship',
      placeholder: 'Select pilot on board time...',
      modalTitle: 'Select Pilot on Board Time'
    },
    etb: {
      label: 'ETB (Estimated Time of Berthing)',
      icon: 'fas fa-clock',
      placeholder: 'Select ETB...',
      modalTitle: 'Select ETB'
    },
    etc: {
      label: 'ETC (Estimated Time of Completion)',
      icon: 'fas fa-flag-checkered',
      placeholder: 'Select ETC...',
      modalTitle: 'Select ETC'
    }
  },
  
  // Configuración de componentes
  COMPONENT_CONFIG: {
    DATETIME_PICKER: {
      FORMAT: 'DD-MM-YYYY HH:mm',
      MINUTE_STEP: 15,
      IS_24_HOUR: true
    },
    SINGLE_SELECT: {
      MAX_HEIGHT: '300px',
      SHOW_SEARCH: true,
      SHOW_MANAGE: true
    },
    MULTI_SELECT: {
      MAX_HEIGHT: '300px',
      SHOW_SEARCH: true,
      SHOW_SELECT_ALL: true
    }
  },

  // 🆕 NUEVA CONFIGURACIÓN: Reglas de validación de fechas
  DATETIME_VALIDATION: {
    // Offset mínimo entre campos (en horas)
    MIN_OFFSET_HOURS: 2,
    
    // Permitir día siguiente para mayor flexibilidad
    ALLOW_NEXT_DAY: true,
    
    // Preservar datos históricos en modo edición
    PRESERVE_HISTORICAL_DATA: true,
    
    // Mensajes de error personalizados
    ERROR_MESSAGES: {
      ETB_TOO_EARLY: 'ETB must be at least 2 hours after Pilot On Board time',
      ETC_TOO_EARLY: 'ETC must be at least 2 hours after ETB time',
      INVALID_SEQUENCE: 'Date/time sequence is invalid. Please check the order.',
      REQUIRED_FIELD: 'This field is required for validation'
    },
    
    // Configuración de validación por campo
    FIELD_RULES: {
      pilotOnBoard: {
        required: true,
        hasRestrictions: false, // Sin restricciones
        description: 'Pilot On Board time (no restrictions)'
      },
      etb: {
        required: true,
        hasRestrictions: true,
        dependsOn: 'pilotOnBoard',
        minOffsetHours: 2,
        description: 'Estimated Time of Berthing (min: POB + 2h)'
      },
      etc: {
        required: true,
        hasRestrictions: true,
        dependsOn: 'etb',
        minOffsetHours: 2,
        description: 'Estimated Time of Completion (min: ETB + 2h)'
      }
    }
  },
  
  // Mensajes del sistema
  MESSAGES: {
    LOADING: 'Loading data...',
    NO_DATA: 'No data available',
    SAVE_SUCCESS: 'Ship nomination saved successfully',
    DELETE_CONFIRM: 'Are you sure you want to delete this nomination?',
    FORM_INVALID: 'Please fill in all required fields'
  },
  
  // Configuración de logging
  LOG_CONFIG: {
    MODULE_NAME: 'ShipNomination',
    SHOW_DEBUG: false,
    SHOW_SUCCESS_NOTIFICATIONS: true,
    SHOW_ERROR_NOTIFICATIONS: true
  }
};

export default SHIP_NOMINATION_CONSTANTS;