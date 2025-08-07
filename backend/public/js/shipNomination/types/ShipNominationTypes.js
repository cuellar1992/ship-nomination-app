/**
 * Type definitions for Ship Nomination System
 */

/**
 * @typedef {Object} ShipNomination
 * @property {string} _id - ID único de la nomination
 * @property {string} vesselName - Nombre del vessel
 * @property {string} clientRef - Referencia del cliente
 * @property {string} amspecRef - Referencia AmSpec
 * @property {Object} client - Información del cliente
 * @property {string} client.id - ID del cliente
 * @property {string} client.name - Nombre del cliente
 * @property {Object} agent - Información del agente
 * @property {Object} terminal - Información del terminal
 * @property {Object} berth - Información del berth
 * @property {Object} surveyor - Información del surveyor
 * @property {Object} sampler - Información del sampler
 * @property {Object} chemist - Información del chemist
 * @property {Array} productTypes - Tipos de productos
 * @property {Date} pilotOnBoard - Fecha/hora piloto a bordo
 * @property {Date} etb - Estimated Time of Berthing
 * @property {Date} etc - Estimated Time of Completion
 * @property {string} status - Estado de la nomination
 * @property {Date} createdAt - Fecha de creación
 * @property {Date} updatedAt - Fecha de actualización
 */

/**
 * @typedef {Object} ComponentInstances
 * @property {Object} singleSelects - Instancias de SingleSelect
 * @property {Object} multiSelects - Instancias de MultiSelect
 * @property {Object} dateTimes - Instancias de DateTimePicker
 */

/**
 * @typedef {Object} FormState
 * @property {boolean} isValid - Si el formulario es válido
 * @property {Array} errors - Lista de errores
 * @property {boolean} isDirty - Si hay cambios sin guardar
 * @property {boolean} isSubmitting - Si se está enviando
 */

/**
 * @typedef {Object} TableState
 * @property {Array} nominations - Lista de nominations
 * @property {Array} filteredNominations - Nominations filtradas
 * @property {string} searchTerm - Término de búsqueda
 * @property {Object} sortConfig - Configuración de ordenamiento
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Si la operación fue exitosa
 * @property {*} data - Datos de respuesta
 * @property {string} message - Mensaje de respuesta
 * @property {Array} errors - Lista de errores si los hay
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Si la validación pasó
 * @property {Array} errors - Lista de errores
 * @property {Object} data - Datos validados
 */

/**
 * Configuraciones por defecto para componentes
 */
export const DEFAULT_CONFIGS = {
  SINGLE_SELECT: {
    showSearch: true,
    showManageOption: true,
    maxHeight: '300px',
    closeOnScroll: true
  },
  
  MULTI_SELECT: {
    showSearch: true,
    showSelectAll: true,
    showManageOption: true,
    maxHeight: '300px'
  },
  
  DATE_TIME_PICKER: {
    format: 'DD-MM-YYYY HH:mm',
    minuteStep: 15,
    is24Hour: true,
    defaultTime: { hour: 12, minute: 0 }
  }
};

/**
 * Mapeos de campos para API
 */
export const FIELD_MAPPINGS = {
  // SingleSelect fields
  SINGLE_SELECTS: {
    clientName: { endpoint: '/api/clients', icon: 'fas fa-building' },
    agent: { endpoint: '/api/agents', icon: 'fas fa-handshake' },
    terminal: { endpoint: '/api/terminals', icon: 'fas fa-warehouse' },
    berth: { endpoint: '/api/berths', icon: 'fas fa-anchor' },
    surveyor: { endpoint: '/api/surveyors', icon: 'fas fa-user-tie' },
    sampler: { endpoint: '/api/samplers', icon: 'fas fa-flask' },
    chemist: { endpoint: '/api/chemists', icon: 'fas fa-microscope' }
  },
  
  // MultiSelect fields
  MULTI_SELECTS: {
    productTypes: { endpoint: '/api/producttypes', icon: 'fas fa-oil-can' }
  },
  
  // DateTime fields
  DATE_TIMES: {
    pilotOnBoard: { icon: 'fas fa-user-circle' },
    etb: { icon: 'fas fa-clock' },
    etc: { icon: 'fas fa-flag-checkered' }
  }
};

/**
 * Estados válidos para Ship Nominations
 */
export const NOMINATION_STATUSES = [
  'draft',
  'confirmed', 
  'in_progress',
  'completed',
  'cancelled'
];

/**
 * Campos requeridos para validación
 */
export const REQUIRED_FIELDS = [
  'vesselName',
  'clientName',
  'agent',
  'terminal',
  'berth',
  'surveyor',
  'sampler',
  'chemist',
  'productTypes',
  'pilotOnBoard',
  'etb',
  'etc'
];

/**
 * Expresiones regulares para validación
 */
export const VALIDATION_PATTERNS = {
  VESSEL_NAME: /^[a-zA-Z0-9\s\-_.]{1,100}$/,
  CLIENT_REF: /^[a-zA-Z0-9\-_]{0,50}$/,
  AMSPEC_REF: /^[a-zA-Z0-9\-_]{1,50}$/
};

export default {
  DEFAULT_CONFIGS,
  FIELD_MAPPINGS,
  NOMINATION_STATUSES,
  REQUIRED_FIELDS,
  VALIDATION_PATTERNS
};