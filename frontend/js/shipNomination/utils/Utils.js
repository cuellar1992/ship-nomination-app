/**
 * Utils Module - Funciones de utilidad para formateo y helpers
 * Migrado desde ship-form-simple.js para mejor modularización
 */

class Utils {
  /**
   * Formatear fecha/hora para diferentes contextos
   * @param {string} dateString - Fecha en formato ISO
   * @param {string} mode - 'table' o 'modal'
   * @returns {string} Fecha formateada
   */
  static formatDate(dateString, mode = "table") {
    if (!dateString) return mode === "modal" ? "Not specified" : "N/A";

    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      if (mode === "modal") {
        // Para modal: formato completo
        return `${day}/${month}/${year} at ${hours}:${minutes}`;
      } else {
        // Para tabla: formato con línea
        return `${day}/${month}/${year}<br><small class="text-muted">${hours}:${minutes}</small>`;
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  }

  /**
   * Formatear product types para diferentes contextos - VERSIÓN CON COLORES UNIFICADOS
   * @param {Array} productTypes - Array de objetos con name
   * @param {string} mode - 'table' o 'modal'
   * @returns {string} HTML formateado
   */
  static formatProductTypes(productTypes, mode = "table") {
    if (!productTypes || productTypes.length === 0) {
      return '<span class="text-muted">N/A</span>';
    }

    // Estilo unificado con color accent del sistema
    const badgeStyle =
      'style="background-color: #1fb5d4; color: white; border: none;"';
    const secondaryBadgeStyle =
      'style="background-color: #6c757d; color: white; border: none;"';

    if (mode === "modal") {
      // Para modal: mostrar todos los product types con color unificado
      return productTypes
        .map((pt) => `<span class="badge me-1" ${badgeStyle}>${pt.name}</span>`)
        .join("");
    } else {
      // Para tabla: mostrar compacto con color unificado
      if (productTypes.length === 1) {
        return `<span class="badge" ${badgeStyle}>${productTypes[0].name}</span>`;
      }

      const firstProduct = productTypes[0].name;
      const remainingCount = productTypes.length - 1;

      return `
            <span class="badge" ${badgeStyle}>${firstProduct}</span>
            ${
              remainingCount > 0
                ? `<span class="badge ms-1" ${secondaryBadgeStyle}>+${remainingCount}</span>`
                : ""
            }
        `;
    }
  }

  /**
   * Crear badge de status con diseño unificado - VERSIÓN CON COLORES ACCENT
   * @param {string} status - Estado de la ship nomination
   * @returns {string} HTML del badge
   */
  static createStatusBadge(status) {
    const statusConfig = {
      draft: { color: "secondary", icon: "fa-edit", text: "Draft" },
      confirmed: { color: "accent", icon: "fa-check", text: "Confirmed" },
      in_progress: { color: "accent", icon: "fa-clock", text: "In Progress" },
      completed: {
        color: "accent",
        icon: "fa-flag-checkered",
        text: "Completed",
      },
      cancelled: { color: "secondary", icon: "fa-times", text: "Cancelled" },
    };

    const config = statusConfig[status] || statusConfig["draft"];

    // Usar colores unificados con el sistema accent
    const badgeStyle =
      config.color === "accent"
        ? 'style="background-color: #1fb5d4; color: white; border: none;"'
        : 'style="background-color: #6c757d; color: white; border: none;"';

    return `<span class="badge" ${badgeStyle}>
                <i class="fas ${config.icon} me-1"></i>${config.text}
            </span>`;
  }

  /**
   * Validar que un valor no esté vacío
   * @param {any} value - Valor a validar
   * @returns {boolean} True si tiene contenido válido
   */
  static isNotEmpty(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  /**
   * Escapar HTML para prevenir XSS
   * @param {string} str - String a escapar
   * @returns {string} String escapado
   */
  static escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Generar ID único para elementos
   * @param {string} prefix - Prefijo opcional
   * @returns {string} ID único
   */
  static generateUniqueId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debounce function para evitar llamadas excesivas
   * @param {Function} func - Función a ejecutar
   * @param {number} wait - Tiempo de espera en ms
   * @returns {Function} Función debounced
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

  /**
   * Formatear bytes a formato legible
   * @param {number} bytes - Número de bytes
   * @returns {string} Formato legible (KB, MB, etc.)
   */
  static formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Copiar texto al clipboard
   * @param {string} text - Texto a copiar
   * @returns {Promise<boolean>} True si se copió exitosamente
   */
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      return false;
    }
  }

  /**
   * Logging con timestamp y colores
   * @param {string} level - 'info', 'warn', 'error', 'success'
   * @param {string} message - Mensaje a mostrar
   * @param {any} data - Datos adicionales opcionales
   */
  static log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: "color: #1fb5d4",
      warn: "color: #f39c12",
      error: "color: #e74c3c",
      success: "color: #27ae60",
    };

    const style = colors[level] || colors.info;
    Logger.debug(`[${timestamp}] ${message}`, {
      module: "Utils",
      data: { level: level, timestamp: timestamp, originalData: data || "" },
      showNotification: false,
    });
  }
}

// Exportar para uso en otros módulos
export { Utils };
