/**
 * SingleSelect Scrollbar Fix - Solución Permanente
 * Aplica el scrollbar azul automáticamente cuando se carga la página
 */

// Aplicar fix permanente del scrollbar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  // Solo aplicar si no existe ya
  if (!document.getElementById("singleselect-permanent-scrollbar")) {
    Logger.info("Aplicando fix permanente del scrollbar SingleSelect", {
      module: "ShipForm",
      showNotification: false,
    });

    const style = document.createElement("style");
    style.id = "singleselect-permanent-scrollbar";
    style.textContent = `
            /* SingleSelect Scrollbar Fix */
            .dropdown-menu-overlay {
                scrollbar-width: thin !important;
                scrollbar-color: #1fb5d4 #151a23 !important;
            }
            .dropdown-menu-overlay::-webkit-scrollbar {
                width: 8px !important;
            }
            .dropdown-menu-overlay::-webkit-scrollbar-track {
                background: #151a23 !important;
                border-radius: 4px !important;
            }
            .dropdown-menu-overlay::-webkit-scrollbar-thumb {
                background: #1fb5d4 !important;
                border-radius: 4px !important;
            }
            .dropdown-menu-overlay::-webkit-scrollbar-thumb:hover {
                background: #0284c7 !important;
            }
            
            /* Modal del SingleSelect */
            .items-list {
                scrollbar-width: thin !important;
                scrollbar-color: #1fb5d4 #151a23 !important;
            }
            .items-list::-webkit-scrollbar {
                width: 8px !important;
            }
            .items-list::-webkit-scrollbar-track {
                background: #151a23 !important;
                border-radius: 4px !important;
            }
            .items-list::-webkit-scrollbar-thumb {
                background: #1fb5d4 !important;
                border-radius: 4px !important;
            }
            .items-list::-webkit-scrollbar-thumb:hover {
                background: #0284c7 !important;
            }
        `;

    document.head.appendChild(style);
    Logger.success("SingleSelect scrollbar fix aplicado permanentemente", {
      module: "ShipForm",
      showNotification: false,
    });
  } else {
    Logger.info("SingleSelect scrollbar fix ya existe", {
      module: "ShipForm",
      showNotification: false,
    });
  }
});
