/**
 * Form utilities for Ship Nomination System
 */

import { SHIP_NOMINATION_CONSTANTS } from './Constants.js';

export class FormUtils {
  /**
   * Validar datos del formulario
   */
  static validateFormData(formData) {
    const errors = [];
    
    // Validar vessel name
    if (!formData.vesselName || !formData.vesselName.trim()) {
      errors.push('Vessel name is required');
    } else if (formData.vesselName.length > SHIP_NOMINATION_CONSTANTS.FORM.MAX_VESSEL_NAME_LENGTH) {
      errors.push(`Vessel name must be less than ${SHIP_NOMINATION_CONSTANTS.FORM.MAX_VESSEL_NAME_LENGTH} characters`);
    }
    
    // Validar client reference si existe
    if (formData.clientRef && formData.clientRef.length > SHIP_NOMINATION_CONSTANTS.FORM.MAX_CLIENT_REF_LENGTH) {
      errors.push(`Client reference must be less than ${SHIP_NOMINATION_CONSTANTS.FORM.MAX_CLIENT_REF_LENGTH} characters`);
    }
    
    // Validar fechas
    if (formData.pilotOnBoard && formData.etb) {
      const pilotDate = new Date(formData.pilotOnBoard);
      const etbDate = new Date(formData.etb);
      
      if (etbDate < pilotDate) {
        errors.push('ETB must be after Pilot on Board time');
      }
    }
    
    return errors;
  }

  /**
   * Limpiar datos del formulario
   */
  static sanitizeFormData(formData) {
    const sanitized = { ...formData };
    
    // Limpiar strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].trim();
      }
    });
    
    return sanitized;
  }

  /**
   * Formatear fecha para display
   */
  static formatDate(date) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Parsear fecha desde string
   */
  static parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Formato: DD-MM-YYYY HH:mm
      const match = dateString.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/);
      if (match) {
        const [, day, month, year, hour, minute] = match;
        return new Date(year, month - 1, day, hour, minute);
      }
      
      // Fallback
      return new Date(dateString);
    } catch (error) {
      return null;
    }
  }

  /**
   * Recopilar datos de componentes
   */
  static collectComponentData(singleSelects, multiSelects, dateTimes) {
    const data = {};
    
    // SingleSelects
    Object.keys(singleSelects).forEach(key => {
      const instance = singleSelects[key];
      if (instance && typeof instance.getSelectedItem === 'function') {
        data[key] = instance.getSelectedItem();
      }
    });
    
    // MultiSelects
    Object.keys(multiSelects).forEach(key => {
      const instance = multiSelects[key];
      if (instance && typeof instance.getSelectedItems === 'function') {
        data[key] = instance.getSelectedItems();
      }
    });
    
    // DateTimes
    Object.keys(dateTimes).forEach(key => {
      const instance = dateTimes[key];
      if (instance && typeof instance.getDateTime === 'function') {
        data[key] = instance.getDateTime();
      }
    });
    
    return data;
  }

  /**
   * Limpiar todos los componentes
   */
  static clearAllComponents(singleSelects, multiSelects, dateTimes) {
    // Limpiar SingleSelects
    Object.values(singleSelects).forEach(instance => {
      if (instance && typeof instance.clearSelection === 'function') {
        instance.clearSelection();
      }
    });
    
    // Limpiar MultiSelects
    Object.values(multiSelects).forEach(instance => {
      if (instance && typeof instance.clearSelection === 'function') {
        instance.clearSelection();
      }
    });
    
    // Limpiar DateTimes
    Object.values(dateTimes).forEach(instance => {
      if (instance && typeof instance.clearSelection === 'function') {
        instance.clearSelection();
      }
    });
  }

  /**
   * Generar ID único
   */
  static generateId() {
    return `ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debounce function para búsquedas
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

export default FormUtils;