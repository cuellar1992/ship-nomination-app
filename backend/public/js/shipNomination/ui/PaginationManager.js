/**
 * PaginationManager - Sistema de paginación frontend para Ship Nominations
 * Mantiene compatibilidad total con filtros y export existentes
 */

class PaginationManager {
  constructor(tableManager) {
    this.tableManager = tableManager;
    this.currentPage = 1;
    this.pageSize = 10; // Registros por página (consistente con Molekulis)
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
      prevBtn.addEventListener("click", () => this.goToPage(this.currentPage - 1));
    }

    // Next button
    const nextBtn = document.getElementById("nextPage");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.goToPage(this.currentPage + 1));
    }

    // Page size select
    const sizeSelect = document.getElementById("pageSizeSelect");
    if (sizeSelect) {
      sizeSelect.addEventListener("change", (e) => {
        const newSize = Number(e.target.value) || 10;
        this.setPageSize(newSize);
      });
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
        infoElement.textContent = "No results";
      } else {
        const start = startIndex + 1;
        const end = endIndex;
        infoElement.textContent = `${start}-${end} / ${this.totalRecords}`;
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
        prevBtn.setAttribute("disabled", "disabled");
      } else {
        prevBtn.removeAttribute("disabled");
      }
    }

    if (nextBtn) {
      if (this.currentPage >= totalPages) {
        nextBtn.setAttribute("disabled", "disabled");
      } else {
        nextBtn.removeAttribute("disabled");
      }
    }
  }

  /**
   * 🔢 Generar números de página
   */
  generatePageNumbers(totalPages) {
    const numbersContainer = document.getElementById("pageNumbers");
    if (!numbersContainer) return;
    numbersContainer.innerHTML = "";

    const createBtn = (page, isActive = false, isEllipsis = false) => {
      if (isEllipsis) {
        const span = document.createElement("span");
        span.className = "page-dot";
        span.textContent = "…";
        numbersContainer.appendChild(span);
        return;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = isActive ? "icon-btn page-btn active" : "icon-btn page-btn";
      btn.textContent = String(page);
      btn.addEventListener("click", () => this.goToPage(page));
      numbersContainer.appendChild(btn);
    };

    const pages = [];
    if (totalPages <= 7) {
      for (let p = 1; p <= totalPages; p++) pages.push(p);
    } else {
      const start = Math.max(2, this.currentPage - 2);
      const end = Math.min(totalPages - 1, this.currentPage + 2);
      pages.push(1);
      if (start > 2) pages.push("...");
      for (let p = start; p <= end; p++) pages.push(p);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    pages.forEach((p) => {
      if (p === "...") createBtn(0, false, true);
      else createBtn(p, p === this.currentPage, false);
    });
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

    // Mostrar siempre los controles (diseño consistente).
    container.style.display = "block";
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
