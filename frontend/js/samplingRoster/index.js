/**
 * Sampling Roster System - Entry Point
 * Archivo: frontend/js/samplingRoster/index.js
 * 
 * Este archivo reemplaza a sampling-roster-main.js
 * Utiliza la nueva arquitectura modular
 */

import SamplingRosterController from './controllers/SamplingRosterController.js';

/**
 * Inicialización cuando el DOM esté listo
 */
document.addEventListener("DOMContentLoaded", async () => {
  Logger.info("DOM loaded - Initializing Modular Sampling Roster", {
    module: "SamplingRoster",
    showNotification: false,
  });

  // Esperar a que las dependencias estén disponibles
  const waitForDependencies = () => {
    return new Promise((resolve) => {
      const checkDependencies = () => {
        if (
          typeof SingleSelect !== "undefined" &&
          typeof Logger !== "undefined" &&
          typeof DateTimePicker !== "undefined"
        ) {
          resolve();
        } else {
          setTimeout(checkDependencies, 100);
        }
      };
      checkDependencies();
    });
  };

  try {
    await waitForDependencies();

    // Crear instancia global usando la nueva arquitectura modular
    window.samplingRosterController = new SamplingRosterController();
    await window.samplingRosterController.init();

    Logger.success("Modular Sampling Roster System ready", {
      module: "SamplingRoster",
      showNotification: false,
    });
  } catch (error) {
    Logger.error("Failed to initialize Modular Sampling Roster System", {
      module: "SamplingRoster",
      error: error,
      showNotification: true,
      notificationMessage:
        "System initialization failed. Please refresh the page.",
    });
  }
});

// Exportar para uso en otros módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = SamplingRosterController;
} else if (typeof window !== "undefined") {
  window.SamplingRosterController = SamplingRosterController;
}