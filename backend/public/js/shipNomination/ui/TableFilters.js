/**
 * TableFilters Module - Sistema de filtros avanzados para Ship Nominations
 * Adaptado de AdvancedSearchManager para arquitectura modular
 * Integración con TableManager y APIManager existentes
 */

class TableFilters {
  constructor(tableManager, apiManager) {
    this.tableManager = tableManager;
    this.apiManager = apiManager;
    this.isAdvancedOpen = false;
    this.activeFilters = {};
    this.originalNominations = [];
    this.filteredNominations = [];
    this.datePickerInstances = {}; // Para almacenar instancias de DatePicker
    this.singleSelectInstances = {};
    this.multiSelectInstances = {};
    this.componentsInitialized = false;

    this.init();
  }

  init() {
    this.setupDatePickers();
    this.setupEventListeners();
    this.populateFilterOptions();
    this.updateResultsSummary();

    Logger.success("TableFilters initialized successfully", {
      module: "TableFilters",
      showNotification: false,
    });
  }

  // NUEVO: Configurar DatePickers para filtros de fecha
  setupDatePickers() {
    // DatePicker para "ETB From"
    this.datePickerInstances.etbFrom = new DatePicker("etbFromDatePicker", {
      label: "",
      placeholder: "From",
      icon: "fas fa-calendar-alt",
      modalTitle: "Select ETB Start Date",
      format: "DD-MM-YYYY",
      clearable: true,
      onDateChange: (date) => {
        // Actualizar el input original si existe
        const etbFromInput = document.getElementById("etbDateFrom");
        if (etbFromInput) {
          etbFromInput.value = date
            ? this.datePickerInstances.etbFrom.getDateValue()
            : "";
        }
        this.updateActiveFilters();
      },
    });

    // DatePicker para "ETB To"
    this.datePickerInstances.etbTo = new DatePicker("etbToDatePicker", {
      label: "",
      placeholder: "To",
      icon: "fas fa-calendar-alt",
      modalTitle: "Select ETB End Date",
      format: "DD-MM-YYYY",
      clearable: true,
      onDateChange: (date) => {
        // Actualizar el input original si existe
        const etbToInput = document.getElementById("etbDateTo");
        if (etbToInput) {
          etbToInput.value = date
            ? this.datePickerInstances.etbTo.getDateValue()
            : "";
        }
        this.updateActiveFilters();
      },
    });

    Logger.success("DatePickers initialized for advanced filters", {
      module: "TableFilters",
      showNotification: false,
    });
  }

  // NUEVO MÉTODO: setupSingleSelects()
  setupSingleSelects() {
    Logger.debug("Setting up SingleSelect instances for filters", {
      module: "TableFilters",
      showNotification: false,
    });

    // Agent Filter
    this.singleSelectInstances.filterAgent = new SingleSelect(
      "filterAgentContainer",
      {
        placeholder: "Any Agent",
        label: "Agent",
        icon: "fas fa-handshake",
        data: [], // Se poblará dinámicamente
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Agent filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    // Surveyor Filter
    this.singleSelectInstances.filterSurveyor = new SingleSelect(
      "filterSurveyorContainer",
      {
        placeholder: "Any Surveyor",
        label: "Surveyor",
        icon: "fas fa-user-tie",
        data: [],
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Surveyor filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    // Sampler Filter
    this.singleSelectInstances.filterSampler = new SingleSelect(
      "filterSamplerContainer",
      {
        placeholder: "Any Sampler",
        label: "Sampler",
        icon: "fas fa-vial",
        data: [],
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Sampler filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    // Chemist Filter
    this.singleSelectInstances.filterChemist = new SingleSelect(
      "filterChemistContainer",
      {
        placeholder: "Any Chemist",
        label: "Chemist",
        icon: "fas fa-flask",
        data: [],
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Chemist filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    // Terminal Filter
    this.singleSelectInstances.filterTerminal = new SingleSelect(
      "filterTerminalContainer",
      {
        placeholder: "Any Terminal",
        label: "Terminal",
        icon: "fas fa-warehouse",
        data: [],
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Terminal filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    // Berth Filter
    this.singleSelectInstances.filterBerth = new SingleSelect(
      "filterBerthContainer",
      {
        placeholder: "Any Berth",
        label: "Berth",
        icon: "fas fa-anchor",
        data: [],
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Berth filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    // Client Filter
    this.singleSelectInstances.filterClients = new SingleSelect(
      "filterClientsContainer",
      {
        placeholder: "Any Client",
        label: "Client",
        icon: "fas fa-building",
        data: [],
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Client filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    Logger.success("SingleSelect instances created for filters", {
      module: "TableFilters",
      showNotification: false,
    });
  }

  // NUEVO MÉTODO: setupMultiSelects()
  setupMultiSelects() {
    Logger.debug("Setting up MultiSelect instances for filters", {
      module: "TableFilters",
      showNotification: false,
    });

    // Product Types Filter (MultiSelect)
    this.multiSelectInstances.filterProductTypes = new MultiSelect(
      "filterProductTypesContainer",
      {
        placeholder: "Any Product Types",
        label: "Product Types",
        icon: "fas fa-oil-can",
        data: [],
        clearable: true,
        showSearch: false,
        showManageOption: false,
        onSelectionChange: (selected) => {
          Logger.debug("Product Types filter changed", {
            module: "TableFilters",
            data: { selected: selected },
            showNotification: false,
          });
          this.updateActiveFilters();
        },
      }
    );

    Logger.success("MultiSelect instances created for filters", {
      module: "TableFilters",
      showNotification: false,
    });
  }

  setupEventListeners() {
    // Basic search (mantener funcionalidad existente)
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.performBasicSearch(e.target.value);
      });
    }

    // Advanced search toggle
    const advancedToggle = document.getElementById("advancedSearchToggle");
    if (advancedToggle) {
      advancedToggle.addEventListener("click", () => {
        this.toggleAdvancedSearch();
      });
    }

    // Preset buttons
    document.querySelectorAll(".btn-preset").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.applyPreset(e.target.dataset.preset);
      });
    });

    // Filter inputs
    this.setupFilterInputListeners();

    // Action buttons
    const applyBtn = document.getElementById("applyFilters");
    const clearBtn = document.getElementById("clearAllFilters");

    if (applyBtn) {
      applyBtn.addEventListener("click", () => this.applyAdvancedFilters());
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearAllFilters());
    }
  }

  setupFilterInputListeners() {
    // Month y year filters
    ["filterMonth", "filterYear"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("change", () => this.updateActiveFilters());
      }
    });

    // Dropdown filters
    [
      "filterClients",
      "filterSurveyor",
      "filterTerminal",
      "filterBerth",
      "filterAgent",
      "filterSampler",
      "filterChemist",
    ].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("change", () => this.updateActiveFilters());
      }
    });

    // Product type checkboxes (will be setup after population)
  }

  toggleAdvancedSearch() {
    const panel = document.getElementById("advancedSearchPanel");
    const toggleIcon = document.getElementById("toggleIcon");
    const toggleText = document.getElementById("toggleText");

    if (this.isAdvancedOpen) {
      // Close
      panel.style.display = "none";
      toggleIcon.className = "fas fa-chevron-down ms-2";
      toggleText.textContent = "Advanced";
      this.isAdvancedOpen = false;
    } else {
      // Open
      if (!this.componentsInitialized) {
        this.setupSingleSelects();
        this.setupMultiSelects();
        this.populateAdvancedComponents();
        this.componentsInitialized = true;
      }
      panel.style.display = "block";
      toggleIcon.className = "fas fa-chevron-up ms-2";
      toggleText.textContent = "Simple";
      this.isAdvancedOpen = true;
    }
  }

  populateFilterOptions() {
    // Solo verificar que los datos básicos estén disponibles
    const nominations = this.getAllNominations();

    if (!nominations || nominations.length === 0) {
      Logger.warn("No nominations data available for filters", {
        module: "TableFilters",
        showNotification: false,
      });
      return;
    }

    Logger.success("Basic filter validation complete", {
      module: "TableFilters",
      showNotification: false,
    });
  }

  populateAdvancedComponents() {
    Logger.debug("Populating advanced filter components", {
      module: "TableFilters",
      showNotification: false,
    });

    // Poblar SingleSelect instances
    this.populateSingleSelectFromAPI("filterClients", "clients");
    this.populateSingleSelectFromAPI("filterAgent", "agents");
    this.populateSingleSelectFromAPI("filterSurveyor", "surveyors");
    this.populateSingleSelectFromAPI("filterSampler", "samplers");
    this.populateSingleSelectFromAPI("filterChemist", "chemists");
    this.populateSingleSelectFromAPI("filterTerminal", "terminals");
    this.populateSingleSelectFromAPI("filterBerth", "berths");

    // Poblar MultiSelect cuando esté implementado
    this.populateMultiSelectFromAPI("filterProductTypes", "productTypes");

    Logger.success("Advanced components populated", {
      module: "TableFilters",
      showNotification: false,
    });
  }

  // NUEVO MÉTODO: populateSingleSelectFromAPI() - Para llenar SingleSelect con datos
  populateSingleSelectFromAPI(instanceKey, apiDataKey) {
    const singleSelectInstance = this.singleSelectInstances[instanceKey];
    if (!singleSelectInstance) {
      console.warn(`SingleSelect instance ${instanceKey} not found`);
      return;
    }

    // Obtener datos desde APIManager
    const apiData = this.apiManager.getAllApiData();
    const items = apiData[apiDataKey] || [];

    if (items.length === 0) {
      console.warn(`No ${apiDataKey} data available`);
      singleSelectInstance.updateData([]);
      return;
    }

    // Actualizar datos del SingleSelect
    singleSelectInstance.updateItems(items);
    Logger.success(`Updated ${instanceKey} with ${items.length} items`, {
      module: "TableFilters",
      data: { instanceKey: instanceKey, itemCount: items.length },
      showNotification: false,
    });
  }

  // NUEVO MÉTODO: populateMultiSelectFromAPI()
  populateMultiSelectFromAPI(instanceKey, apiDataKey) {
    const multiSelectInstance = this.multiSelectInstances[instanceKey];
    if (!multiSelectInstance) {
      console.warn(`MultiSelect instance ${instanceKey} not found`);
      return;
    }

    const apiData = this.apiManager.getAllApiData();
    const items = apiData[apiDataKey] || [];

    if (items.length === 0) {
      console.warn(`No ${apiDataKey} data available`);
      multiSelectInstance.updateItems([]);
      return;
    }

    multiSelectInstance.updateItems(items);
    Logger.success(`Updated ${instanceKey} with ${items.length} items`, {
      module: "TableFilters",
      data: { instanceKey: instanceKey, itemCount: items.length },
      showNotification: false,
    });
  }

  populateSelectFromAPI(selectId, apiDataKey, fieldName) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    // Obtener datos desde APIManager
    const apiData = this.apiManager.getAllApiData();
    const items = apiData[apiDataKey] || [];

    if (items.length === 0) {
      selectElement.innerHTML = `<option value="">No ${apiDataKey} available</option>`;
      return;
    }

    // Generar opciones
    const defaultOption =
      fieldName === "clientName"
        ? "Any Client"
        : `Any ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
    selectElement.innerHTML =
      `<option value="">${defaultOption}</option>` +
      items.map((item) => `<option value="${item}">${item}</option>`).join("");
  }

  populateProductTypeFilters() {
    const container = document.getElementById("productTypeFilters");
    if (!container) return;

    // Obtener product types desde APIManager
    const apiData = this.apiManager.getAllApiData();
    const productTypes = apiData.productTypes || [];

    if (productTypes.length === 0) {
      container.innerHTML =
        '<p style="color: var(--text-muted); font-size: 0.85rem;">No product types available</p>';
      return;
    }

    container.innerHTML = productTypes
      .map(
        (product) => `
            <label style="
                display: flex; 
                align-items: center; 
                gap: 0.5rem; 
                color: var(--text-secondary);
                font-size: 0.85rem;
                cursor: pointer;
            ">
                <input type="checkbox" 
                       value="${product}" 
                       class="product-filter-checkbox"
                       style="
                           accent-color: var(--accent-primary);
                           transform: scale(1.1);
                       ">
                <span>${product}</span>
            </label>
        `
      )
      .join("");

    // Add event listeners to checkboxes
    container
      .querySelectorAll(".product-filter-checkbox")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => this.updateActiveFilters());
      });
  }

  /**
   * Obtener todas las nominations con múltiples estrategias de fallback
   * @returns {Array} Array de nominations
   */
  getAllNominations() {
    Logger.debug("TableFilters: Attempting to get nominations data", {
      module: "TableFilters",
      showNotification: false,
    });

    // ESTRATEGIA 1: Desde TableManager.nominations (propiedad directa)
    if (this.tableManager && this.tableManager.nominations) {
      const nominations = this.tableManager.nominations;
      if (Array.isArray(nominations) && nominations.length > 0) {
        Logger.success(
          `Got ${nominations.length} nominations from TableManager.nominations`,
          {
            module: "TableFilters",
            data: {
              nominationsCount: nominations.length,
              source: "TableManager.nominations",
            },
            showNotification: false,
          }
        );
        this._gettingNominations = false;
        return nominations;
      }
    }

    // ESTRATEGIA 2: Desde TableManager métodos públicos
    if (this.tableManager) {
      // Intentar getAllNominations()
      if (typeof this.tableManager.getAllNominations === "function") {
        const nominations = this.tableManager.getAllNominations();
        if (Array.isArray(nominations) && nominations.length > 0) {
          Logger.success(
            `Got ${nominations.length} nominations from TableManager.getAllNominations()`,
            {
              module: "TableFilters",
              data: {
                nominationsCount: nominations.length,
                source: "TableManager.getAllNominations()",
              },
              showNotification: false,
            }
          );
          this._gettingNominations = false;
          return nominations;
        }
      }

      // Intentar getTableData()
      if (typeof this.tableManager.getTableData === "function") {
        const nominations = this.tableManager.getTableData();
        if (Array.isArray(nominations) && nominations.length > 0) {
          Logger.success(
            `Got ${nominations.length} nominations from TableManager.getTableData()`,
            {
              module: "TableFilters",
              data: {
                nominationsCount: nominations.length,
                source: "TableManager.getTableData()",
              },
              showNotification: false,
            }
          );
          this._gettingNominations = false;
          return nominations;
        }
      }
    }

    // ESTRATEGIA 3: Desde window.simpleShipForm global
    if (window.simpleShipForm) {
      const tableManager = window.simpleShipForm.getTableManager();
      if (tableManager) {
        // Intentar propiedad nominations
        if (
          tableManager.nominations &&
          Array.isArray(tableManager.nominations)
        ) {
          const nominations = tableManager.nominations;
          if (nominations.length > 0) {
            Logger.success(
              `Got ${nominations.length} nominations from global TableManager.nominations`,
              {
                module: "TableFilters",
                data: {
                  nominationsCount: nominations.length,
                  source: "global TableManager.nominations",
                },
                showNotification: false,
              }
            );
            this._gettingNominations = false;
            return nominations;
          }
        }

        // Intentar métodos
        if (typeof tableManager.getAllNominations === "function") {
          const nominations = tableManager.getAllNominations();
          if (Array.isArray(nominations) && nominations.length > 0) {
            Logger.success(
              `Got ${nominations.length} nominations from global TableManager.getAllNominations()`,
              {
                module: "TableFilters",
                data: {
                  nominationsCount: nominations.length,
                  source: "global TableManager.getAllNominations()",
                },
                showNotification: false,
              }
            );
            this._gettingNominations = false;
            return nominations;
          }
        }
      }
    }

    // ESTRATEGIA 4: Extraer desde el DOM de la tabla
    Logger.info("Fallback: Extracting nominations from DOM table", {
      module: "TableFilters",
      showNotification: false,
    });
    const domData = this.extractNominationsFromTable();
    if (domData && domData.length > 0) {
      Logger.success(`Got ${domData.length} nominations from DOM extraction`, {
        module: "TableFilters",
        data: {
          nominationsCount: domData.length,
          source: "DOM extraction",
        },
        showNotification: false,
      });
      this._gettingNominations = false;
      return domData;
    }

    // ESTRATEGIA 5: Usar datos de API directamente
    if (
      this.apiManager &&
      typeof this.apiManager.getAllApiData === "function"
    ) {
      Logger.info("Fallback: Attempting to fetch from API directly", {
        module: "TableFilters",
        showNotification: false,
      });
      // Intentar obtener desde cache de API (esto no tendrá ship nominations, pero evita el error)
      const apiData = this.apiManager.getAllApiData();
      Logger.debug("Available API data keys", {
        module: "TableFilters",
        data: { apiDataKeys: Object.keys(apiData) },
        showNotification: false,
      });

      // Por ahora retornar array vacío para evitar error
      Logger.warn("No ship nominations found, returning empty array", {
        module: "TableFilters",
        showNotification: false,
      });
      this._gettingNominations = false;
      return [];
    }

    // ÚLTIMA ESTRATEGIA: Array vacío
    Logger.warn(
      "No nominations data found from any source, returning empty array",
      {
        module: "TableFilters",
        showNotification: false,
      }
    );
    this._gettingNominations = false;
    return [];
  }

  /**
   * Extraer nominations desde el DOM de la tabla (MEJORADO)
   * @returns {Array} Array de nominations extraídas
   */
  extractNominationsFromTable() {
    // Intentar múltiples selectores de tabla
    const possibleTableIds = [
      "shipNominationsTableBody",
      "vesselsTableBody",
      "nominationsTableBody",
    ];

    let tableBody = null;
    for (const id of possibleTableIds) {
      tableBody = document.getElementById(id);
      if (tableBody) {
        Logger.debug(`Found table body with ID: ${id}`, {
          module: "TableFilters",
          data: { tableId: id },
          showNotification: false,
        });
        break;
      }
    }

    // Si no encuentra por ID, buscar por clase o selector
    if (!tableBody) {
      tableBody = document.querySelector(
        "table tbody, .ship-table tbody, .table tbody"
      );
      if (tableBody) {
        Logger.debug("Found table body by selector", {
          module: "TableFilters",
          showNotification: false,
        });
      }
    }

    if (!tableBody) {
      Logger.warn("No table body found for DOM extraction", {
        module: "TableFilters",
        showNotification: false,
      });
      return [];
    }

    const rows = tableBody.querySelectorAll("tr[data-nomination-id], tr");
    if (rows.length === 0) {
      Logger.warn("No table rows found for extraction", {
        module: "TableFilters",
        showNotification: false,
      });
      return [];
    }

    Logger.info(`Extracting data from ${rows.length} table rows`, {
      module: "TableFilters",
      data: { rowCount: rows.length },
      showNotification: false,
    });

    return Array.from(rows)
      .map((row, index) => {
        try {
          // Obtener ID de la nomination
          const nominationId = row.dataset.nominationId || `extracted_${index}`;

          // Extraer datos de celdas (ajustar según estructura de tu tabla)
          const cells = row.querySelectorAll("td");
          if (cells.length === 0) {
            return null; // Skip header rows
          }

          return {
            id: nominationId,
            vesselName: cells[0]?.textContent?.trim() || "",
            amspecRef: cells[1]?.textContent?.trim() || "",
            clientRef: cells[2]?.textContent?.trim() || "",
            clientName: cells[3]?.textContent?.trim() || "",
            productTypes: this.extractProductTypesFromCell(cells[4]),
            agent: cells[5]?.textContent?.trim() || "",
            pilotOnBoard: cells[6]?.textContent?.trim() || "",
            etb: cells[7]?.textContent?.trim() || "",
            etc: cells[8]?.textContent?.trim() || "",
            terminal: cells[9]?.textContent?.trim() || "",
            berth: cells[10]?.textContent?.trim() || "",
            surveyor: cells[11]?.textContent?.trim() || "",
            sampler: cells[12]?.textContent?.trim() || "",
            chemist: cells[13]?.textContent?.trim() || "",
            status: cells[14]?.textContent?.trim() || "pending",
          };
        } catch (error) {
          Logger.warn("Error extracting row data", {
            module: "TableFilters",
            error: error,
            showNotification: false,
          });
          return null;
        }
      })
      .filter((nomination) => nomination !== null);
  }

  /**
   * Extraer product types desde celda de tabla (MEJORADO)
   * @param {HTMLElement} cell - Celda de la tabla
   * @returns {Array} Array de product types
   */
  extractProductTypesFromCell(cell) {
    if (!cell) return [];

    try {
      // Intentar múltiples selectores para product tags
      const possibleSelectors = [
        ".product-tag-table",
        ".product-tag",
        ".badge",
        "span",
      ];

      let tags = [];
      for (const selector of possibleSelectors) {
        tags = cell.querySelectorAll(selector);
        if (tags.length > 0) break;
      }

      if (tags.length > 0) {
        return Array.from(tags)
          .map((tag) => tag.textContent.trim())
          .filter((text) => text.length > 0);
      }

      // Fallback: usar texto completo de la celda
      const cellText = cell.textContent.trim();
      if (cellText) {
        // Intentar separar por comas o espacios
        return cellText.split(/[,\s]+/).filter((text) => text.length > 0);
      }

      return [];
    } catch (error) {
      console.warn("⚠️ Error extracting product types:", error);
      return [];
    }
  }

  performBasicSearch(searchTerm) {
    // Si hay filtros avanzados activos, buscar dentro de resultados filtrados
    const nominationsToSearch =
      Object.keys(this.activeFilters).length > 0
        ? this.filteredNominations
        : this.getAllNominations();

    if (!searchTerm.trim()) {
      // Si no hay término de búsqueda, mostrar nominations filtradas o todas
      if (Object.keys(this.activeFilters).length > 0) {
        this.renderFilteredResults(this.filteredNominations);
      } else {
        this.tableManager.loadShipNominations();
        this.updateResultsSummary();
      }
      return;
    }

    // Realizar búsqueda básica
    const term = searchTerm.toLowerCase();
    const searchResults = nominationsToSearch.filter(
      (nomination) =>
        nomination.vesselName.toLowerCase().includes(term) ||
        (nomination.clientName?.some(c => c.name.toLowerCase().includes(term)) ||
        (nomination.client?.name && nomination.client.name.toLowerCase().includes(term))) ||
        (nomination.agent?.name &&
          nomination.agent.name.toLowerCase().includes(term)) ||
        (typeof nomination.agent === "string" &&
          nomination.agent.toLowerCase().includes(term)) ||
        (nomination.terminal?.name &&
          nomination.terminal.name.toLowerCase().includes(term)) ||
        (typeof nomination.terminal === "string" &&
          nomination.terminal.toLowerCase().includes(term)) ||
        (nomination.berth?.name &&
          nomination.berth.name.toLowerCase().includes(term)) ||
        (typeof nomination.berth === "string" &&
          nomination.berth.toLowerCase().includes(term)) ||
        nomination.amspecRef.toLowerCase().includes(term) ||
        (nomination.clientRef &&
          nomination.clientRef.toLowerCase().includes(term)) ||
        (nomination.productTypes || []).some((product) => {
          const productName =
            typeof product === "string" ? product : product?.name || "";
          return productName.toLowerCase().includes(term);
        })
    );

    this.renderFilteredResults(searchResults);
    this.updateResultsSummary(searchResults.length, `matching "${searchTerm}"`);
  }

  // Presets usando DatePickers
  applyPreset(presetType) {
    // Clear existing filters first
    this.clearAllFilters();

    const now = new Date();
    let startDate, endDate;

    switch (presetType) {
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        this.datePickerInstances.etbFrom.setDate(startDate);
        this.datePickerInstances.etbTo.setDate(endDate);
        break;

      case "thisWeek":
        const firstDayOfWeek = new Date(
          now.setDate(now.getDate() - now.getDay())
        );
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        this.datePickerInstances.etbFrom.setDate(firstDayOfWeek);
        this.datePickerInstances.etbTo.setDate(lastDayOfWeek);
        break;

      case "pending":
        // ETB in the future
        this.datePickerInstances.etbFrom.setDate(new Date());
        break;

      case "completed":
        // ETB in the past
        this.datePickerInstances.etbTo.setDate(new Date());
        break;
    }

    // Update active preset button
    document.querySelectorAll(".btn-preset").forEach((btn) => {
      btn.classList.remove("active");
    });
    const presetBtn = document.querySelector(`[data-preset="${presetType}"]`);
    if (presetBtn) presetBtn.classList.add("active");

    // Apply the preset filters
    this.applyAdvancedFilters();
  }

  // Incluir DatePickers en filtros activos
  updateActiveFilters() {
    this.activeFilters = {};

    // Date filters usando DatePickers
    const etbFromDate = this.datePickerInstances.etbFrom?.getDate();
    const etbToDate = this.datePickerInstances.etbTo?.getDate();

    if (etbFromDate) {
      this.activeFilters.etbFrom =
        this.datePickerInstances.etbFrom.getDateValue();
    }
    if (etbToDate) {
      this.activeFilters.etbTo = this.datePickerInstances.etbTo.getDateValue();
    }

    // Month/Year filters
    const monthElement = document.getElementById("filterMonth");
    const yearElement = document.getElementById("filterYear");

    if (monthElement?.value) this.activeFilters.month = monthElement.value;
    if (yearElement?.value) this.activeFilters.year = yearElement.value;

    // ⭐ NUEVA LÓGICA: SingleSelect instances
    if (this.singleSelectInstances) {
      Object.keys(this.singleSelectInstances).forEach((key) => {
        const instance = this.singleSelectInstances[key];
        if (instance && instance.selectedItem) {
          // Mapear nombres de instancia a nombres de filtro
          const filterName = key.replace("filter", "").toLowerCase();
          this.activeFilters[filterName] = instance.selectedItem;
        }
      });
    }

    // ⭐ NUEVA LÓGICA: MultiSelect instances
    if (this.multiSelectInstances) {
      Object.keys(this.multiSelectInstances).forEach((key) => {
        const instance = this.multiSelectInstances[key];
        if (
          instance &&
          instance.selectedItems &&
          instance.selectedItems.length > 0
        ) {
          const filterName = key.replace("filter", "").toLowerCase();
          this.activeFilters[filterName] = instance.selectedItems;
        }
      });
    }

    this.updateFilterChips();
  }

  applyAdvancedFilters() {
    this.updateActiveFilters();

    if (Object.keys(this.activeFilters).length === 0) {
      // No filters, show all nominations
      this.filteredNominations = this.getAllNominations();
      this.tableManager.loadShipNominations();
      this.updateResultsSummary();
      return;
    }

    const allNominations = this.getAllNominations();
    this.filteredNominations = allNominations.filter((nomination) =>
      this.matchesFilters(nomination)
    );

    this.renderFilteredResults(this.filteredNominations);
    this.updateResultsSummary(this.filteredNominations.length);

    // Auto-close advanced panel after applying filters
    if (this.isAdvancedOpen) {
      this.toggleAdvancedSearch();
    }
  }

  matchesFilters(nomination) {
    // Date filters
    if (this.activeFilters.etbFrom || this.activeFilters.etbTo) {
      if (!nomination.etb) return false;

      const nominationETB = new Date(nomination.etb);

      if (this.activeFilters.etbFrom) {
        const fromDate = new Date(this.activeFilters.etbFrom);
        if (nominationETB < fromDate) return false;
      }

      if (this.activeFilters.etbTo) {
        const toDate = new Date(this.activeFilters.etbTo);
        toDate.setHours(23, 59, 59); // Include the entire day
        if (nominationETB > toDate) return false;
      }
    }

    // Month/Year filters
    if (this.activeFilters.month || this.activeFilters.year) {
      if (!nomination.etb) return false;

      const nominationDate = new Date(nomination.etb);

      if (this.activeFilters.month) {
        if (
          nominationDate.getMonth() + 1 !==
          parseInt(this.activeFilters.month)
        )
          return false;
      }

      if (this.activeFilters.year) {
        if (nominationDate.getFullYear() !== parseInt(this.activeFilters.year))
          return false;
      }
    }

    // Client filters
    if (this.activeFilters.clients) {
  let hasMatchingClient = false;
  
  // Verificar clientName array (nuevo formato)
  if (nomination.clientName) {
    hasMatchingClient = nomination.clientName.some(c => 
      this.activeFilters.clients.includes(c.name)
    );
  }
  
  // Fallback para client singular (legacy)
  if (!hasMatchingClient && nomination.client?.name) {
    hasMatchingClient = this.activeFilters.clients.includes(nomination.client.name);
  }
  
  if (!hasMatchingClient) {
    return false;
  }
}

    // Personnel and location filters - CORREGIDO
    const simpleFilters = [
      "agent",
      "surveyor",
      "sampler",
      "chemist",
      "terminal",
      "berth",
    ];
    for (const filter of simpleFilters) {
      if (this.activeFilters[filter]) {
        const nominationValue = nomination[filter];
        const filterValue = this.activeFilters[filter];

        // ⭐ CORRECCIÓN: Usar .name para objetos
        let matches = false;
        if (typeof nominationValue === "object" && nominationValue?.name) {
          matches = nominationValue.name === filterValue;
        } else if (typeof nominationValue === "string") {
          matches = nominationValue === filterValue;
        }

        if (!matches) return false;
      }
    }

    /// Product type filters - CORREGIDO
    if (this.activeFilters.producttypes) {
      if (!nomination.productTypes || nomination.productTypes.length === 0)
        return false;

      const hasMatchingProduct = this.activeFilters.producttypes.some(
        (filterProduct) => {
          return nomination.productTypes.some((nominationProduct) => {
            // ⭐ CORRECCIÓN: Product Types son objetos con .name
            const productName = nominationProduct?.name || nominationProduct;
            return productName === filterProduct;
          });
        }
      );
      if (!hasMatchingProduct) return false;
    }

    return true;
  }

  renderFilteredResults(nominations) {
    Logger.info("Rendering filtered results", {
      module: "TableFilters",
      data: { nominationsCount: nominations.length },
      showNotification: false,
    });

    // Usar el método existente del TableManager
    if (
      this.tableManager &&
      typeof this.tableManager.renderShipNominationsTable === "function"
    ) {
      this.tableManager.renderShipNominationsTable(nominations);
    } else {
      // Fallback: renderizar directamente en la tabla
      this.renderTableDirectly(nominations);
    }
  }

  renderTableDirectly(nominations) {
    const tableBody = document.getElementById("shipNominationsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    nominations.forEach((nomination) => {
      const row = this.createTableRow(nomination);
      tableBody.appendChild(row);
    });
  }

  createTableRow(nomination) {
    const row = document.createElement("tr");
    row.dataset.nominationId = nomination.id;

    // Esta función necesitaría implementarse según el formato exacto de tu tabla
    // Por ahora, crear una versión básica
    row.innerHTML = `
            <td>${nomination.vesselName}</td>
            <td>${nomination.amspecRef}</td>
            <td>${nomination.clientRef}</td>
            <td>${nomination.clientName}</td>
            <td>${this.formatProductTypes(nomination.productTypes)}</td>
            <td>${nomination.agent}</td>
            <td>${nomination.pilotOnBoard}</td>
            <td>${nomination.etb}</td>
            <td>${nomination.etc}</td>
            <td>${nomination.terminal}</td>
            <td>${nomination.berth}</td>
            <td>${nomination.surveyor}</td>
            <td>${nomination.sampler}</td>
            <td>${nomination.chemist}</td>
            <td>${nomination.status}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="window.simpleShipForm.viewNomination('${
                  nomination.id
                }')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.simpleShipForm.editNomination('${
                  nomination.id
                }')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.simpleShipForm.deleteNomination('${
                  nomination.id
                }')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

    return row;
  }

  formatProductTypes(productTypes) {
    if (!productTypes || productTypes.length === 0) return "";

    return productTypes
      .map((product) => `<span class="product-tag-table">${product}</span>`)
      .join(" ");
  }

  updateFilterChips() {
    const container = document.getElementById("activeFiltersContainer");
    if (!container) return;

    container.innerHTML = "";

    Object.entries(this.activeFilters).forEach(([key, value]) => {
      let chipText = "";

      switch (key) {
        case "etbFrom":
          chipText = `ETB From: ${new Date(value).toLocaleDateString()}`;
          break;
        case "etbTo":
          chipText = `ETB To: ${new Date(value).toLocaleDateString()}`;
          break;
        case "month":
          const monthNames = [
            "",
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          chipText = `Month: ${monthNames[parseInt(value)]}`;
          break;
        case "year":
          chipText = `Year: ${value}`;
          break;
        case "clients":
          chipText = `Clients: ${
            value.length > 1 ? `${value.length} selected` : value[0]
          }`;
          break;
        case "agent":
          chipText = `Agent: ${value}`;
          break;
        case "surveyor":
          chipText = `Surveyor: ${value}`;
          break;
        case "sampler":
          chipText = `Sampler: ${value}`;
          break;
        case "chemist":
          chipText = `Chemist: ${value}`;
          break;
        case "terminal":
          chipText = `Terminal: ${value}`;
          break;
        case "berth":
          chipText = `Berth: ${value}`;
          break;
        case "productTypes":
          chipText = `Products: ${
            value.length > 1 ? `${value.length} selected` : value[0]
          }`;
          break;
      }

      if (chipText) {
        const chip = document.createElement("div");
        chip.className = "filter-chip";
        chip.innerHTML = `
                    <span>${chipText}</span>
                    <div class="remove-chip" data-filter-key="${key}">
                        <i class="fas fa-times"></i>
                    </div>
                `;

        chip.querySelector(".remove-chip").addEventListener("click", () => {
          this.removeFilter(key);
        });

        container.appendChild(chip);
      }
    });
  }

  // Limpiar filtros incluye DatePickers
  removeFilter(filterKey) {
    // Clear the specific filter
    switch (filterKey) {
      case "etbFrom":
        this.datePickerInstances.etbFrom.clearSelection(false); // ← SIN notificación
        break;
      case "etbTo":
        this.datePickerInstances.etbTo.clearSelection(false); // ← SIN notificación
        break;
      case "month":
        const monthElement = document.getElementById("filterMonth");
        if (monthElement) monthElement.value = "";
        break;
      case "year":
        const yearElement = document.getElementById("filterYear");
        if (yearElement) yearElement.value = "";
        break;
      case "clients":
        const clientsElement = document.getElementById("filterClients");
        if (clientsElement) clientsElement.selectedIndex = -1;
        break;
      case "agent":
        const agentElement = document.getElementById("filterAgent");
        if (agentElement) agentElement.value = "";
        break;
      case "surveyor":
        const surveyorElement = document.getElementById("filterSurveyor");
        if (surveyorElement) surveyorElement.value = "";
        break;
      case "sampler":
        const samplerElement = document.getElementById("filterSampler");
        if (samplerElement) samplerElement.value = "";
        break;
      case "chemist":
        const chemistElement = document.getElementById("filterChemist");
        if (chemistElement) chemistElement.value = "";
        break;
      case "terminal":
        const terminalElement = document.getElementById("filterTerminal");
        if (terminalElement) terminalElement.value = "";
        break;
      case "berth":
        const berthElement = document.getElementById("filterBerth");
        if (berthElement) berthElement.value = "";
        break;
      case "productTypes":
        document
          .querySelectorAll(".product-filter-checkbox")
          .forEach((checkbox) => {
            checkbox.checked = false;
          });
        break;
    }

    // Remove from active filters
    delete this.activeFilters[filterKey];

    // Reapply remaining filters
    this.applyAdvancedFilters();
  }

  // Limpiar todos los filtros incluye DatePickers
  clearAllFilters() {
    // Clear DatePickers
     this.datePickerInstances.etbFrom.clearSelection(false);  // ← SIN notificación
    this.datePickerInstances.etbTo.clearSelection(false); // ← SIN notificación

    // Clear all form inputs
    const filterIds = ["filterMonth", "filterYear", "filterClients"];
    filterIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        if (element.tagName === "SELECT") {
          element.selectedIndex = 0;
        } else {
          element.value = "";
        }
      }
    });

    // Clear SingleSelect instances
    Object.values(this.singleSelectInstances).forEach((instance) => {
      if (instance && typeof instance.clearSelection === "function") {
        instance.clearSelection();
      }
    });

    // Clear MultiSelect instances
    Object.values(this.multiSelectInstances).forEach((instance) => {
      if (instance && typeof instance.clearSelection === "function") {
        instance.clearSelection();
      }
    });

    // Clear basic search
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";

    // Clear preset buttons
    document.querySelectorAll(".btn-preset").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Reset filters
    this.activeFilters = {};
    this.filteredNominations = [];

    // Show all nominations
    this.tableManager.loadShipNominations();
    this.updateResultsSummary();
    this.updateFilterChips();

    // ✅ NOTIFICACIÓN GLOBAL 
    Logger.success("All filters cleared", {
        module: 'TableFilters',
        showNotification: true,
        notificationMessage: "All filters cleared successfully"
    });
  }

  updateResultsSummary(count = null, description = "") {
    const summaryElement = document.getElementById("resultsCount");
    const containerElement = document.getElementById("resultsCountContainer");

    if (!summaryElement || !containerElement) return;

    const totalNominations = this.getAllNominations().length;
    const displayCount = count !== null ? count : totalNominations;

    // Determinar si mostrar el contenedor
    const hasSearch =
      document.getElementById("searchInput")?.value.trim().length > 0;
    const hasFilters = Object.keys(this.activeFilters).length > 0;
    const shouldShow = hasSearch || hasFilters || description.length > 0;

    if (shouldShow) {
      containerElement.style.display = "block";

      if (count === null && Object.keys(this.activeFilters).length === 0) {
        summaryElement.textContent = `Showing all ${totalNominations} nominations`;
      } else if (description) {
        summaryElement.textContent = `Showing ${displayCount} of ${totalNominations} nominations ${description}`;
      } else if (Object.keys(this.activeFilters).length > 0) {
        const filterCount = Object.keys(this.activeFilters).length;
        summaryElement.textContent = `Showing ${displayCount} of ${totalNominations} nominations (${filterCount} filter${
          filterCount > 1 ? "s" : ""
        } applied)`;
      } else {
        summaryElement.textContent = `Showing ${displayCount} of ${totalNominations} nominations`;
      }
    } else {
      containerElement.style.display = "none";
    }
  }

  // Public API para integración
  refreshData() {
    this.populateFilterOptions();
    if (Object.keys(this.activeFilters).length > 0) {
      this.applyAdvancedFilters();
    } else {
      this.updateResultsSummary();
    }
  }

  // Get current filter state for export/import
  getActiveFilters() {
    return { ...this.activeFilters };
  }

  // Set filters programáticamente incluye DatePickers
  setFilters(filters) {
    this.clearAllFilters();

    Object.entries(filters).forEach(([key, value]) => {
      switch (key) {
        case "etbFrom":
          this.datePickerInstances.etbFrom.setDate(new Date(value));
          break;
        case "etbTo":
          this.datePickerInstances.etbTo.setDate(new Date(value));
          break;
        case "month":
          const monthElement = document.getElementById("filterMonth");
          if (monthElement) monthElement.value = value;
          break;
        case "year":
          const yearElement = document.getElementById("filterYear");
          if (yearElement) yearElement.value = value;
          break;
        case "clients":
          const clientsSelect = document.getElementById("filterClients");
          if (clientsSelect) {
            Array.from(clientsSelect.options).forEach((option) => {
              option.selected = value.includes(option.value);
            });
          }
          break;
        case "agent":
          const agentElement = document.getElementById("filterAgent");
          if (agentElement) agentElement.value = value;
          break;
        case "surveyor":
          const surveyorElement = document.getElementById("filterSurveyor");
          if (surveyorElement) surveyorElement.value = value;
          break;
        case "sampler":
          const samplerElement = document.getElementById("filterSampler");
          if (samplerElement) samplerElement.value = value;
          break;
        case "chemist":
          const chemistElement = document.getElementById("filterChemist");
          if (chemistElement) chemistElement.value = value;
          break;
        case "terminal":
          const terminalElement = document.getElementById("filterTerminal");
          if (terminalElement) terminalElement.value = value;
          break;
        case "berth":
          const berthElement = document.getElementById("filterBerth");
          if (berthElement) berthElement.value = value;
          break;
        case "productTypes":
          document
            .querySelectorAll(".product-filter-checkbox")
            .forEach((checkbox) => {
              checkbox.checked = value.includes(checkbox.value);
            });
          break;
      }
    });

    this.applyAdvancedFilters();
  }

  // Destruir DatePickers al limpiar
  destroy() {
    // Destroy DatePicker instances
    Object.values(this.datePickerInstances).forEach((instance) => {
      if (instance && typeof instance.destroy === "function") {
        instance.destroy();
      }
    });
    this.datePickerInstances = {};

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.removeEventListener("input", this.performBasicSearch);
    }

    Logger.info("TableFilters destroyed", {
      module: "TableFilters",
      showNotification: false,
    });
  }

  // Métodos de utilidad para integración con TableManager
  integrateWithTableManager(tableManager) {
    this.tableManager = tableManager;

    // Hook into TableManager events si están disponibles
    if (typeof tableManager.onDataChange === "function") {
      const originalOnDataChange = tableManager.onDataChange.bind(tableManager);
      tableManager.onDataChange = () => {
        originalOnDataChange();
        this.refreshData();
      };
    }
  }

  // Método para obtener estadísticas de filtros
  getFilterStats() {
    const allNominations = this.getAllNominations();
    const filteredCount = this.filteredNominations.length;
    const totalCount = allNominations.length;

    return {
      total: totalCount,
      filtered: filteredCount,
      hidden: totalCount - filteredCount,
      activeFilters: Object.keys(this.activeFilters).length,
      filterDetails: { ...this.activeFilters },
    };
  }

  // Método para exportar configuración de filtros
  exportFilterConfiguration() {
    return {
      filters: this.getActiveFilters(),
      timestamp: new Date().toISOString(),
      version: "1.0",
    };
  }

  // Método para importar configuración de filtros
  importFilterConfiguration(config) {
    if (config.filters) {
      this.setFilters(config.filters);

      Logger.success("Filter configuration imported successfully", {
        module: "TableFilters",
        showNotification: true,
        notificationMessage: "Filter configuration imported successfully!",
      });
    }
  }

  // Método para validar que todos los elementos HTML necesarios existen
  validateHTMLElements() {
    const requiredElements = [
      "searchInput",
      "advancedSearchToggle",
      "advancedSearchPanel",
      "etbFromDatePicker",
      "etbToDatePicker",
      "productTypeFilters",
      "activeFiltersContainer",
      "resultsCount",
    ];

    const missingElements = requiredElements.filter(
      (id) => !document.getElementById(id)
    );

    if (missingElements.length > 0) {
      console.warn("TableFilters: Missing HTML elements:", missingElements);
      return false;
    }

    return true;
  }

  // Método estático para verificar dependencias
  static checkDependencies() {
    const dependencies = [
      { name: "DatePicker", check: () => typeof DatePicker !== "undefined" },
      {
        name: "Bootstrap Modal",
        check: () => typeof bootstrap !== "undefined" && bootstrap.Modal,
      },
      {
        name: "TableManager",
        check: () =>
          window.simpleShipForm && window.simpleShipForm.getTableManager,
      },
      {
        name: "APIManager",
        check: () =>
          window.simpleShipForm && window.simpleShipForm.getApiManager,
      },
    ];

    const missing = dependencies.filter((dep) => !dep.check());

    if (missing.length > 0) {
      console.error(
        "TableFilters dependencies missing:",
        missing.map((dep) => dep.name)
      );
      return false;
    }

    return true;
  }
}

// Exportar para uso en otros módulos
export { TableFilters };
