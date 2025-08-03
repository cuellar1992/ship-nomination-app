/**
 * PaginationManager - Sistema de paginación frontend para Ship Nominations
 * Mantiene compatibilidad total con filtros y export existentes
 */

class PaginationManager {
  constructor(tableManager) {
    this.tableManager = tableManager;
    this.currentPage = 1;
    this.pageSize = 25; // Registros por página
    this.totalRecords = 0;
    this.currentData = []; // Datos actuales (con filtros aplicados)
    this.paginatedData = []; // Datos de la página actual

    this.init();
  }

  /**
   * 🔧 Inicializar sistema de paginación
   */
  init() {
    this.setupEventListeners();
    Logger.success("PaginationManager initialized", {
      module: "PaginationManager",
      data: { pageSize: this.pageSize },
      showNotification: false,
    });
  }

  /**
   * 👂 Configurar event listeners
   */
  setupEventListeners() {
    // Previous button
    const prevBtn = document.getElementById("prevPage");
    if (prevBtn) {
      prevBtn.addEventListener("click", () =>
        this.goToPage(this.currentPage - 1)
      );
    }

    // Next button
    const nextBtn = document.getElementById("nextPage");
    if (nextBtn) {
      nextBtn.addEventListener("click", () =>
        this.goToPage(this.currentPage + 1)
      );
    }
  }

  /**
   * 📊 Actualizar datos y aplicar paginación
   * @param {Array} data - Datos completos (con filtros aplicados)
   */
  updateData(data) {
    this.currentData = data || [];
    this.totalRecords = this.currentData.length;

    // Reset a página 1 cuando cambian los datos
    this.currentPage = 1;

    this.updatePagination();
    this.updateVisibility();

    Logger.info("Pagination updated", {
      module: "PaginationManager",
      data: {
        totalRecords: this.totalRecords,
        pageSize: this.pageSize,
      },
      showNotification: false,
    });
  }

  /**
   * 🔄 Actualizar paginación y renderizar página actual
   */
  updatePagination() {
    // Calcular páginas
    const totalPages = Math.ceil(this.totalRecords / this.pageSize);

    // Validar página actual
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Calcular índices
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.totalRecords);

    // Obtener datos de página actual
    this.paginatedData = this.currentData.slice(startIndex, endIndex);

    // Renderizar datos paginados
    this.renderCurrentPage();

    // Actualizar controles
    this.updateControls(totalPages, startIndex, endIndex);
  }

  /**
   * 🎨 Renderizar página actual en la tabla
   */
  renderCurrentPage() {
    if (
      this.tableManager &&
      typeof this.tableManager.renderShipNominationsTable === "function"
    ) {
      // ⭐ USAR MÉTODO EXISTENTE - Mantiene compatibilidad total
      this.tableManager.renderShipNominationsTable(this.paginatedData);
    }
  }

  /**
   * 🎛️ Actualizar controles de navegación
   */
  updateControls(totalPages, startIndex, endIndex) {
    // Actualizar información
    this.updateInfo(startIndex, endIndex);

    // Actualizar botones de navegación
    this.updateNavigationButtons(totalPages);

    // Generar números de página
    this.generatePageNumbers(totalPages);
  }

  /**
   * ℹ️ Actualizar información de resultados
   */
  updateInfo(startIndex, endIndex) {
    const infoElement = document.getElementById("paginationInfo");
    if (infoElement) {
      if (this.totalRecords === 0) {
        infoElement.textContent = "No results found";
      } else {
        const start = startIndex + 1;
        const end = endIndex;
        infoElement.textContent = `Showing ${start}-${end} of ${this.totalRecords} results`;
      }
    }
  }

  /**
   * 🔘 Actualizar botones Previous/Next
   */
  updateNavigationButtons(totalPages) {
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (prevBtn) {
      if (this.currentPage <= 1) {
        prevBtn.classList.add("disabled");
      } else {
        prevBtn.classList.remove("disabled");
      }
    }

    if (nextBtn) {
      if (this.currentPage >= totalPages) {
        nextBtn.classList.add("disabled");
      } else {
        nextBtn.classList.remove("disabled");
      }
    }
  }

  /**
   * 🔢 Generar números de página
   */
  generatePageNumbers(totalPages) {
    const controlsContainer = document.getElementById("paginationControls");
    if (!controlsContainer) return;

    // Remover números existentes
    const existingNumbers = controlsContainer.querySelectorAll(".page-number");
    existingNumbers.forEach((num) => num.remove());

    // Generar nuevos números (máximo 5 páginas visibles)
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Ajustar si hay menos páginas al inicio
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Buscar el botón Next para insertar antes de él
    const nextBtn = document.getElementById("nextPage");

    for (let i = startPage; i <= endPage; i++) {
      const pageItem = document.createElement("li");
      pageItem.className = `page-item page-number ${
        i === this.currentPage ? "active" : ""
      }`;

      const pageButton = document.createElement("button");
      pageButton.className = "page-link";
      pageButton.type = "button";
      pageButton.textContent = i;

      pageButton.addEventListener("click", () => this.goToPage(i));

      pageItem.appendChild(pageButton);

      // Insertar antes del botón Next
      if (nextBtn) {
        controlsContainer.insertBefore(pageItem, nextBtn);
      }
    }
  }

  /**
   * 🔄 Ir a página específica
   */
  goToPage(page) {
    const totalPages = Math.ceil(this.totalRecords / this.pageSize);

    if (page < 1 || page > totalPages) return;

    this.currentPage = page;
    this.updatePagination();

    Logger.info(`Navigated to page ${page} of ${totalPages}`, {
      module: "PaginationManager",
      data: {
        currentPage: page,
        totalPages: totalPages,
      },
      showNotification: false,
    });
  }

  /**
   * 👁️ Actualizar visibilidad de controles
   */
  updateVisibility() {
    const container = document.getElementById("paginationContainer");
    if (!container) return;

    // Mostrar paginación solo si hay más de una página O hay filtros activos
    const totalPages = Math.ceil(this.totalRecords / this.pageSize);
    const shouldShow = totalPages > 1 || this.hasActiveFilters();

    if (shouldShow) {
      container.style.display = "block";
    } else {
      container.style.display = "none";
    }
  }

  /**
   * 🔍 Verificar si hay filtros activos (helper)
   */
  hasActiveFilters() {
    // Verificar si el total de datos actuales es diferente al total real
    // Esto indica que hay filtros aplicados
    const allData = this.tableManager?.getAllNominations() || [];
    return this.currentData.length !== allData.length;
  }

  /**
   * 📊 Obtener datos de página actual para export
   */
  getCurrentPageData() {
    return this.paginatedData;
  }

  /**
   * 📊 Obtener todos los datos filtrados para export
   */
  getAllFilteredData() {
    return this.currentData;
  }

  /**
   * ⚙️ Configurar tamaño de página
   */
  setPageSize(newSize) {
    this.pageSize = newSize;
    this.currentPage = 1; // Reset a primera página
    this.updatePagination();

    Logger.info(`Page size changed to ${newSize}`, {
      module: "PaginationManager",
      data: { newPageSize: newSize },
      showNotification: false,
    });
  }

  /**
   * 📈 Obtener estadísticas de paginación
   */
  getStats() {
    const totalPages = Math.ceil(this.totalRecords / this.pageSize);

    return {
      currentPage: this.currentPage,
      totalPages: totalPages,
      pageSize: this.pageSize,
      totalRecords: this.totalRecords,
      currentPageRecords: this.paginatedData.length,
      hasNextPage: this.currentPage < totalPages,
      hasPrevPage: this.currentPage > 1,
    };
  }

  /**
   * 🔄 Reset paginación (útil al cambiar filtros)
   */
  reset() {
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * 🧹 Limpiar paginación
   */
  destroy() {
    const container = document.getElementById("paginationContainer");
    if (container) {
      container.style.display = "none";
    }

    Logger.info("PaginationManager destroyed", {
      module: "PaginationManager",
      showNotification: false,
    });
  }
}

// Exportar para uso en otros módulos
export { PaginationManager };
