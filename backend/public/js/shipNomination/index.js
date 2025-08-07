/**
 * Ship Nomination System - Entry Point
 * Archivo: frontend/js/shipNomination/index.js
 */

import ShipFormController from './controllers/ShipFormController.js';
import { SHIP_NOMINATION_CONSTANTS } from './utils/Constants.js';

/**
 * Inicialización cuando el DOM esté listo
 */
document.addEventListener("DOMContentLoaded", async () => {
  // ✅ PREVENIR MÚLTIPLES INICIALIZACIONES:
  if (window.simpleShipForm) {
    console.log('⚠️ ShipFormController already initialized, skipping');
    return;
  }

  Logger.info("DOM loaded - Initializing Modular Ship Nomination System", {
    module: SHIP_NOMINATION_CONSTANTS.LOG_CONFIG.MODULE_NAME,
    showNotification: false,
  });

  // Esperar a que las dependencias estén disponibles
  const waitForDependencies = () => {
    return new Promise((resolve) => {
      const checkDependencies = () => {
        if (
          typeof SingleSelect !== "undefined" &&
          typeof MultiSelect !== "undefined" &&
          typeof DateTimePicker !== "undefined" &&
          typeof Logger !== "undefined"
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

    // ✅ CREAR SOLO UNA VEZ (el constructor ya llama a init() internamente):
    window.simpleShipForm = new ShipFormController();

    Logger.success("Modular Ship Nomination System ready", {
      module: SHIP_NOMINATION_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      showNotification: false,
    });
  } catch (error) {
    Logger.error("Failed to initialize Modular Ship Nomination System", {
      module: SHIP_NOMINATION_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      error: error,
      showNotification: true,
      notificationMessage:
        "System initialization failed. Please refresh the page.",
    });
  }
});