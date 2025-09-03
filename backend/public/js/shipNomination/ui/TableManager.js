/**
 * Table Manager Module - Gestión de tabla, búsqueda y filtros
 * Migrado desde ship-form-simple.js para mejor modularización
 */

import { Utils } from "../utils/Utils.js";

class TableManager {
  constructor() {
    this.shipNominations = []; // Cache de ship nominations
    this.filteredData = []; // Datos filtrados actualmente
    this.searchTerm = ""; // Término de búsqueda actual
  }

  /**
   * Cargar ship nominations desde la API y actualizar la tabla
   * @returns {Promise<void>}
   */
  async loadShipNominations() {
    Logger.info("Loading ship nominations from API", {
      module: "TableManager",
      showNotification: false,
    });

    try {
      // Mostrar indicador de carga en la tabla
      // Hacer fetch a la API
      const response = await fetch("/api/shipnominations");
      const result = await response.json();

      Logger.debug("API Response", {
        module: "TableManager",
        data: { response: result },
        showNotification: false,
      });

      if (result.success) {
        Logger.success(`Loaded ${result.data.length} ship nominations`, {
          module: "TableManager",
          count: result.data.length,
          showNotification: false,
        });

        // Guardar datos en instancia para uso posterior
        this.shipNominations = result.data;
        this.filteredData = result.data; // Inicialmente sin filtros

        // Renderizar la tabla
        this.renderShipNominationsTable(result.data);

        // Mostrar información de paginación si existe
        if (result.pagination) {
          this.updatePaginationInfo(result.pagination);
        }
      } else {
        Logger.error("Error loading ship nominations", {
          module: "TableManager",
          error: result.error,
          showNotification: true,
          notificationMessage:
            "Unable to load ship nominations. Please try again.",
        });
        this.showTableError("Error loading ship nominations");
      }
    } catch (error) {
      console.error("❌ Network error loading ship nominations:", error);
      this.showTableError("Network error. Please check your connection.");
    } finally {
      // Ocultar indicador de carga
      this.showTableLoadingState(false);
    }
  }

  /**
   * Renderizar ship nominations en la tabla HTML
   * @param {Array} shipNominations - Array de ship nominations
   */
  renderShipNominationsTable(shipNominations) {
    Logger.info("Rendering ship nominations table", {
      module: "TableManager",
      data: { nominationsCount: shipNominations?.length || 0 },
      showNotification: false,
    });

    const tableBody = document.getElementById("vesselsTableBody");

    if (!shipNominations || shipNominations.length === 0) {
      // Mostrar mensaje de tabla vacía
      tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-muted">
                        <i class="fas fa-ship"></i> No ship nominations found
                    </td>
                </tr>
            `;
      return;
    }

    // Orden por ETB si hay preferencia de orden
    const sortDir = window.__etbSortDir || 'asc';
    const sorted = [...shipNominations].sort((a,b) => {
      const da = new Date(a.etb || a.createdAt || 0);
      const db = new Date(b.etb || b.createdAt || 0);
      return sortDir === 'asc' ? da - db : db - da;
    });

    // Generar filas de la tabla
    const tableRows = sorted
      .map((nomination) => {
        return this.createTableRow(nomination);
      })
      .join("");

    // Insertar en la tabla
    tableBody.innerHTML = tableRows;

    Logger.success(
      `Rendered ${shipNominations.length} ship nominations in table`,
      {
        module: "TableManager",
        data: { renderedCount: shipNominations.length },
        showNotification: false,
      }
    );
  }

  /**
   * Crear una fila de tabla para una ship nomination - VERSIÓN CON COLORES UNIFICADOS
   * @param {Object} nomination - Ship nomination data
   * @returns {string} HTML de la fila
   */
  createTableRow(nomination) {
    // Formatear datos para mostrar
    const vesselName = nomination.vesselName || "N/A";
    const amspecRef = nomination.amspecRef || "N/A";
    const clientName = nomination.clientName
      ? nomination.clientName.map((c) => c.name).join(", ")
      : nomination.client?.name || "N/A";
    const productTypes = Utils.formatProductTypes(
      nomination.productTypes,
      "table"
    );
    const etbFormatted = Utils.formatDate(nomination.etb, "table");
    const etcFormatted = Utils.formatDate(nomination.etc, "table");
    const berthName = nomination.berth?.name || "N/A";

    // Status badge con color
    const statusBadge = Utils.createStatusBadge(nomination.status);

    return `
        <tr data-nomination-id="${nomination._id}">
            <td>
                <div class="d-flex align-items-center">
                    <i class="fas fa-ship me-2" style="color: #1fb5d4;"></i>
                    <div>
                        <div class="fw-bold">${vesselName}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge bg-secondary">${amspecRef}</span>
            </td>
            <td>
                <i class="fas fa-building me-1" style="color: #1fb5d4;"></i>
                ${clientName}
            </td>
            <td>
                ${productTypes}
            </td>
            <td>
                <div class="text-nowrap">
                    <i class="fas fa-clock me-1" style="color: #1fb5d4;"></i>
                    ${etbFormatted}
                </div>
            </td>
            <td>
                <div class="text-nowrap">
                    <i class="fas fa-clock me-1" style="color: #1fb5d4;"></i>
                    ${etcFormatted}
                </div>
            </td>
            <td>
                <i class="fas fa-anchor me-1" style="color: #1fb5d4;"></i>
                ${berthName}
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-info btn-sm" 
                            onclick="window.simpleShipForm.viewNomination('${nomination._id}')"
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-warning btn-sm" 
                            onclick="window.simpleShipForm.editNomination('${nomination._id}')"
                            title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" 
                            onclick="window.simpleShipForm.deleteNomination('${nomination._id}')"
                            title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
  }

  /**
   * Filtrar tabla por término de búsqueda
   * @param {string} searchTerm - Término de búsqueda
   */
  filterTable(searchTerm) {
    if (!this.shipNominations) {
      console.warn("⚠️ No ship nominations data loaded yet");
      return;
    }

    this.searchTerm = searchTerm.toLowerCase();

    if (this.searchTerm === "") {
      // Si no hay término de búsqueda, mostrar todos
      this.filteredData = this.shipNominations;
    } else {
      // Filtrar datos
      this.filteredData = this.shipNominations.filter((nomination) => {
        return (
          nomination.vesselName?.toLowerCase().includes(this.searchTerm) ||
          nomination.amspecRef?.toLowerCase().includes(this.searchTerm) ||
          nomination.client?.name?.toLowerCase().includes(this.searchTerm) ||
          nomination.berth?.name?.toLowerCase().includes(this.searchTerm) ||
          nomination.terminal?.name?.toLowerCase().includes(this.searchTerm) ||
          nomination.productTypes?.some((pt) =>
            pt.name?.toLowerCase().includes(this.searchTerm)
          )
        );
      });
    }

    Logger.info(`Filtered nominations`, {
      module: "TableManager",
      data: {
        filteredCount: this.filteredData.length,
        totalCount: this.shipNominations.length,
      },
      showNotification: false,
    });
    this.renderShipNominationsTable(this.filteredData);
  }

  /**
   * Configurar buscador de tabla
   */
  setupTableSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      let searchTimeout;

      searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.trim();

        // Debounce: esperar 300ms después de que el usuario deje de escribir
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.filterTable(searchTerm);
        }, 300);
      });

      Logger.success("Table search configured", {
        module: "TableManager",
        showNotification: false,
      });
    }
  }

  /**
   * Mostrar/ocultar estado de carga en la tabla
   * @param {boolean} isLoading - Si está cargando
   */
  showTableLoadingState(isLoading) {
    const tableBody = document.getElementById("vesselsTableBody");

    if (isLoading) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-spinner fa-spin"></i> Loading ship nominations...
                    </td>
                </tr>
            `;
    }
    // Si no está cargando, no hacer nada aquí (renderShipNominationsTable se encargará)
  }

  /**
   * Mostrar mensaje de error en la tabla
   * @param {string} errorMessage - Mensaje de error
   */
  showTableError(errorMessage) {
    const tableBody = document.getElementById("vesselsTableBody");
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle"></i> ${errorMessage}
                </td>
            </tr>
        `;
  }

  /**
   * Actualizar información de paginación (para uso futuro)
   * @param {Object} pagination - Información de paginación
   */
  updatePaginationInfo(pagination) {
    Logger.debug("Pagination info", {
      module: "TableManager",
      data: { pagination: pagination },
      showNotification: false,
    });
    // Por ahora solo log, en pasos futuros podemos agregar UI de paginación
  }

  /**
   * Encontrar nomination por ID
   * @param {string} nominationId - ID de la nomination
   * @returns {Object|null} Nomination encontrada
   */
  findNominationById(nominationId) {
    return this.shipNominations?.find((n) => n._id === nominationId) || null;
  }

  /**
   * Obtener todas las ship nominations
   * @returns {Array} Array de ship nominations
   */
  getAllNominations() {
    return this.shipNominations;
  }

  /**
   * Obtener datos filtrados actuales
   * @returns {Array} Array de ship nominations filtradas
   */
  getFilteredNominations() {
    return this.filteredData;
  }

  /**
   * Obtener término de búsqueda actual
   * @returns {string} Término de búsqueda
   */
  getCurrentSearchTerm() {
    return this.searchTerm;
  }

  /**
   * Limpiar búsqueda y mostrar todos los datos
   */
  clearSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = "";
      this.filterTable("");
    }
  }

  /**
   * Refrescar tabla con datos actuales
   */
  refreshTable() {
    if (this.searchTerm) {
      this.filterTable(this.searchTerm);
    } else {
      this.renderShipNominationsTable(this.shipNominations);
    }
  }

  /**
   * Ordenar tabla por columna
   * @param {string} column - Nombre de la columna
   * @param {string} direction - 'asc' o 'desc'
   */
  sortTable(column, direction = "asc") {
    if (!this.filteredData || this.filteredData.length === 0) return;

    const sortedData = [...this.filteredData].sort((a, b) => {
      let valueA, valueB;

      switch (column) {
        case "vessel":
          valueA = a.vesselName || "";
          valueB = b.vesselName || "";
          break;
        case "amspec":
          valueA = a.amspecRef || "";
          valueB = b.amspecRef || "";
          break;
        case "client":
          valueA = a.client?.name || "";
          valueB = b.client?.name || "";
          break;
        case "etb":
          valueA = new Date(a.etb || 0);
          valueB = new Date(b.etb || 0);
          break;
        case "etc":
          valueA = new Date(a.etc || 0);
          valueB = new Date(b.etc || 0);
          break;
        case "berth":
          valueA = a.berth?.name || "";
          valueB = b.berth?.name || "";
          break;
        default:
          return 0;
      }

      if (direction === "asc") {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });

    this.filteredData = sortedData;
    this.renderShipNominationsTable(sortedData);

    Logger.info(`Table sorted by ${column} (${direction})`, {
      module: "TableManager",
      data: {
        sortColumn: column,
        sortDirection: direction,
        recordCount: sortedData.length,
      },
      showNotification: false,
    });
  }

  /**
   * Obtener estadísticas de la tabla
   * @returns {Object} Estadísticas
   */
  getTableStats() {
    return {
      total: this.shipNominations.length,
      filtered: this.filteredData.length,
      searchTerm: this.searchTerm,
      hasSearch: this.searchTerm.length > 0,
    };
  }

  /**
   * Exportar datos filtrados (preparación para futuras funciones)
   * @param {string} format - Formato de exportación ('csv', 'json')
   * @returns {string} Datos exportados
   */
  exportFilteredData(format = "json") {
    if (format === "json") {
      return JSON.stringify(this.filteredData, null, 2);
    } else if (format === "csv") {
      // Implementación básica de CSV
      const headers = ["Vessel", "AmSpec Ref", "Client", "ETB", "ETC", "Berth"];
      const rows = this.filteredData.map((n) => [
        n.vesselName || "",
        n.amspecRef || "",
        n.client?.name || "",
        n.etb || "",
        n.etc || "",
        n.berth?.name || "",
      ]);

      return [headers, ...rows].map((row) => row.join(",")).join("\n");
    }

    return "";
  }
}

// Exportar para uso en otros módulos
export { TableManager };
