/**
 * Ship Form Simple - MODULARIZADO Y LIMPIO CON TABLEFILTERS
 * Clase principal que coordina todos los módulos incluyendo filtros avanzados
 * Versión: Completamente modularizada con sistema de filtros integrado
 */

import { APIManager } from "../services/APIManager.js";
import { ExcelExporter } from "../services/ExcelExporter.js";
import { ComponentFactory } from "../ui/ComponentFactory.js";
import { TableManager } from "../ui/TableManager.js";
import { TableFilters } from "../ui/TableFilters.js";
import { PaginationManager } from "../ui/PaginationManager.js";
import { FormHandler } from "../handlers/FormHandler.js";
import { CRUDOperations } from "../handlers/CRUDOperations.js";
import { Utils } from "../utils/Utils.js";
import { SHIP_NOMINATION_CONSTANTS } from "../utils/Constants.js";

class ShipFormController {
  constructor() {
    // Instancias de componentes
    this.singleSelectInstances = {};
    this.multiSelectInstances = {};
    this.dateTimeInstances = {};

    // Instancias de módulos
    this.apiManager = new APIManager();
    this.formHandler = null; // Se inicializa después de crear componentes
    this.tableManager = new TableManager();
    this.crudOperations = new CRUDOperations(
      this.tableManager,
      this.apiManager
    );

    // ⭐ NUEVA INSTANCIA: TableFilters
    this.tableFilters = null; // Se inicializa después de verificar dependencias

    // 🆕 NUEVA INSTANCIA: ExcelExporter
    this.excelExporter = null; // Se inicializa después de TableFilters

    // 🆕 NUEVA INSTANCIA: paginacion
    this.paginationManager = null; //

    // Inicializar
    this.init();
  }

  /**
   * Inicializar la aplicación
   */
  init() {
    // Esperar a que los componentes estén disponibles
    if (!ComponentFactory.areComponentsAvailable()) {
      setTimeout(() => this.init(), 100);
      return;
    }

    // Cargar datos de API primero, luego crear componentes
    this.apiManager
      .loadApiData()
      .then(() => {
        this.initializeComponents();
        this.initializeModules();
        this.loadInitialData();

        // ETB sort toggle on header
        const etbSortBtn = document.getElementById('etbSortToggle');
        if (etbSortBtn) {
          window.__etbSortDir = window.__etbSortDir || 'desc';
          const icon = etbSortBtn.querySelector('i');
          if (icon) {
            icon.className = window.__etbSortDir === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up';
          }
          etbSortBtn.addEventListener('click', () => {
            window.__etbSortDir = window.__etbSortDir === 'asc' ? 'desc' : 'asc';
            const icon = etbSortBtn.querySelector('i');
            if (icon) {
              icon.className = window.__etbSortDir === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up';
            }
            if (this.tableManager && Array.isArray(this.tableManager.shipNominations)) {
              this.tableManager.renderShipNominationsTable(this.tableManager.shipNominations);
            } else {
              this.refresh();
            }
          });
        }

        Logger.success("Simple Ship Form initialized successfully", {
          module: "ShipForm",
          components: {
            singleSelects: Object.keys(this.singleSelectInstances).length,
            multiSelects: Object.keys(this.multiSelectInstances).length,
            tableFilters: !!this.tableFilters,
          },
          showNotification: false,
        });
      })
      .catch((error) => {
        Logger.error("Error loading API data", {
          module: "ShipForm",
          error: error,
          showNotification: true,
          notificationMessage:
            "Unable to initialize form. Please refresh the page.",
        });

        // Continuar con datos mock en caso de error
        this.initializeComponents();
        this.initializeModules();
        this.loadInitialData();

        // ✅ DESPUÉS:
        Logger.warn("Simple Ship Form initialized with mock data", {
          module: "ShipForm",
          reason: "API failed",
          showNotification: false,
        });
      });
  }

  /**
   * Inicializar componentes usando ComponentFactory
   */
  initializeComponents() {
    // Crear SingleSelects
    ComponentFactory.createAllSingleSelects(
      this.singleSelectInstances,
      this.apiManager.getAllApiData(),
      {
        onItemAdd: (fieldId, item) => this.addItem(fieldId, item),
        onItemRemove: (fieldId, item) => this.removeItem(fieldId, item),
        onItemEdit: (fieldId, updatedData, originalData, index) =>
          this.editItem(fieldId, updatedData, originalData, index),
        onGetItemData: (fieldId, itemName) =>
          this.getItemData(fieldId, itemName),
        apiManager: this.apiManager, // 🆕 NUEVO: Agregar apiManager para filtrado
      }
    );

    // Crear MultiSelects
    ComponentFactory.createAllMultiSelects(
      this.multiSelectInstances,
      this.apiManager.getAllApiData(),
      {
        onItemAdd: (fieldId, item) => this.addItem(fieldId, item),
        onItemRemove: (fieldId, item) => this.removeItem(fieldId, item),
        onItemEdit: (fieldId, oldName, newName) =>
          this.editItem(fieldId, oldName, newName, null),
      }
    );

    // Crear DateTimePickers
    ComponentFactory.createAllDateTimePickers(this.dateTimeInstances, () =>
      ComponentFactory.validateDateTimeSequence(this.dateTimeInstances)
    );
  }

  /**
   * Inicializar módulos después de crear componentes (CORREGIDO)
   */
  initializeModules() {
    // Inicializar FormHandler
    this.formHandler = new FormHandler(this.apiManager, {
      singleSelectInstances: this.singleSelectInstances,
      multiSelectInstances: this.multiSelectInstances,
      dateTimeInstances: this.dateTimeInstances,
    });

    // Configurar manejadores
    this.formHandler.setupFormHandlers(() => {
      this.tableManager.loadShipNominations();
      // ⭐ NUEVA LÍNEA: Refrescar filtros cuando hay cambios
      if (this.tableFilters) {
        this.tableFilters.refreshData();
      }
    });
    this.formHandler.setupRealTimeValidations();

    // ⭐ COMENTAR ESTA LÍNEA: No inicializar filtros aquí
    // this.initializeTableFilters();
  }

  /**
   * ⭐ MÉTODO ACTUALIZADO: Inicializar TableFilters con mejor detección de datos
   */
  async initializeTableFilters() {
    // Verificar dependencias
    if (typeof TableFilters === "undefined") {
      console.warn("⚠️ TableFilters not available, retrying in 1s...");
      setTimeout(() => this.initializeTableFilters(), 1000);
      return;
    }

    if (!TableFilters.checkDependencies()) {
      console.warn("⚠️ TableFilters dependencies missing, retrying in 1s...");
      setTimeout(() => this.initializeTableFilters(), 1000);
      return;
    }

    // Verificar que DatePicker esté disponible
    if (typeof DatePicker === "undefined") {
      console.warn("⚠️ DatePicker not available, retrying...");
      setTimeout(() => this.initializeTableFilters(), 500);
      return;
    }

    // ⭐ NUEVO: Verificar que la tabla tenga datos
    const tableBody = document.getElementById("vesselsTableBody");
    if (tableBody) {
      const rows = tableBody.querySelectorAll("tr");
      Logger.debug(
        `Table has ${rows.length} rows before initializing filters`,
        {
          module: "ShipForm",
          data: { rowCount: rows.length },
          showNotification: false,
        }
      );

      if (rows.length === 0) {
        Logger.info("Table is empty, waiting for data to load", {
          module: "ShipForm",
          showNotification: false,
        });
        setTimeout(() => this.initializeTableFilters(), 2000);
        return;
      }
    }

    try {
      // Esperar a que los datos de API estén cargados
      if (!this.apiManager.isDataLoaded()) {
        await this.apiManager.loadApiData();
      }

      // Crear instancia de TableFilters
      this.tableFilters = new TableFilters(this.tableManager, this.apiManager, this.paginationManager);

      // Configurar integración bidireccional
      this.tableFilters.integrateWithTableManager(this.tableManager);

      // ⭐ NUEVA LÍNEA: Prevenir conflictos entre filtros y recargas
      this.preventFilterConflicts();

      // 🆕 NUEVA SECCIÓN: Inicializar ExcelExporter después de TableFilters
      this.initializeExcelExporter();

      Logger.success("TableFilters initialized successfully with data", {
        module: "ShipForm",
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error initializing TableFilters", {
        module: "ShipForm",
        error: error,
        showNotification: true,
        notificationMessage:
          "Failed to initialize table filters. Please refresh the page.",
      });

      // Retry en caso de error
      setTimeout(() => this.initializeTableFilters(), 3000);
    }
  }

  /**
   * ⭐ MÉTODO ACTUALIZADO: Inicializar TableFilters con mejor detección de datos
   */
  async initializeTableFilters() {
    // ... todo tu código existente del método ...

    try {
      // Esperar a que los datos de API estén cargados
      if (!this.apiManager.isDataLoaded()) {
        await this.apiManager.loadApiData();
      }

      // Crear instancia de TableFilters
      this.tableFilters = new TableFilters(this.tableManager, this.apiManager, this.paginationManager);

      // Configurar integración bidireccional
      this.tableFilters.integrateWithTableManager(this.tableManager);

      // ⭐ NUEVA LÍNEA: Prevenir conflictos entre filtros y recargas
      this.preventFilterConflicts();

      // 🆕 AGREGAR ESTA LÍNEA AL FINAL DEL TRY:
      this.initializeExcelExporter();

      Logger.success("TableFilters initialized successfully with data", {
        module: "ShipForm",
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error initializing TableFilters", {
        module: "ShipForm",
        error: error,
        showNotification: true,
        notificationMessage:
          "Failed to initialize table filters. Please refresh the page.",
      });

      // Retry en caso de error
      setTimeout(() => this.initializeTableFilters(), 3000);
    }
  }

  initializePagination() {
    if (this.tableManager) {
      this.paginationManager = new PaginationManager(this.tableManager);

      // Asegurar que el contenedor se vea desde el inicio
      const container = document.getElementById('paginationContainer');
      if (container) container.style.display = 'block';

      // Vincular selector de tamaño de página (5/10/15)
      const sizeSelect = document.getElementById('pageSizeSelect');
      if (sizeSelect) {
        // Inicializar valor actual
        sizeSelect.value = String(this.paginationManager.pageSize);
        sizeSelect.addEventListener('change', (e) => {
          const newSize = Number(e.target.value) || 10;
          this.paginationManager.setPageSize(newSize);
        });
      }

      // ⭐ CONEXIÓN SIMPLE Y DIRECTA
      setTimeout(() => {
        const allData = this.tableManager.getAllNominations();
        // Actualizar siempre (aunque no haya registros) para renderizar controles y info
        this.paginationManager.updateData(Array.isArray(allData) ? allData : []);
        Logger.debug("Pagination force-updated", {
          module: "ShipForm",
          data: { recordCount: allData?.length || 0 },
          showNotification: false,
        });
      }, 1500); // Más tiempo para asegurar carga completa

      Logger.success("Pagination initialized", {
        module: "ShipForm",
        showNotification: false,
      });
    }
  }

  /**
   * 🆕 NUEVO MÉTODO: Inicializar Excel Exporter
   */
  initializeExcelExporter() {
    // Verificar que ExcelExporter esté disponible
    if (typeof ExcelExporter === "undefined") {
      console.warn("⚠️ ExcelExporter not available, retrying in 1s...");
      setTimeout(() => this.initializeExcelExporter(), 1000);
      return;
    }

    // Verificar que SheetJS esté disponible
    if (typeof XLSX === "undefined") {
      console.warn("⚠️ SheetJS (XLSX) not available, retrying in 1s...");
      setTimeout(() => this.initializeExcelExporter(), 1000);
      return;
    }

    // Verificar que TableFilters esté inicializado
    if (!this.tableFilters) {
      console.warn("⚠️ TableFilters not initialized yet, retrying...");
      setTimeout(() => this.initializeExcelExporter(), 500);
      return;
    }

    try {
      // Crear instancia de ExcelExporter
      this.excelExporter = new ExcelExporter(
        this.tableFilters,
        this.apiManager,
        this.tableManager
      );

      Logger.success("ExcelExporter initialized successfully", {
        module: "ShipForm",
        showNotification: false,
      });
    } catch (error) {
      Logger.error("Error initializing ExcelExporter", {
        module: "ShipForm",
        error: error,
        showNotification: true,
        notificationMessage:
          "Failed to initialize Excel export feature. Please refresh the page.",
      });

      // Retry en caso de error
      setTimeout(() => this.initializeExcelExporter(), 2000);
    }
  }

  /**
   * ⭐ NUEVO MÉTODO: Verificar si hay datos disponibles para filtros
   * @returns {boolean} True si hay datos disponibles
   */
  hasTableData() {
    // Verificar en la tabla DOM
    const tableBody = document.getElementById("vesselsTableBody");
    if (tableBody) {
      const rows = tableBody.querySelectorAll("tr");
      if (rows.length > 0) {
        Logger.debug(`Found ${rows.length} rows in DOM table`, {
          module: "ShipForm",
          data: { domRows: rows.length },
          showNotification: false,
        });
        return true;
      }
    }

    // Verificar en TableManager
    if (this.tableManager) {
      if (
        this.tableManager.nominations &&
        this.tableManager.nominations.length > 0
      ) {
        Logger.debug(
          `Found ${this.tableManager.nominations.length} nominations in TableManager`,
          {
            module: "ShipForm",
            data: { nominationsCount: this.tableManager.nominations.length },
            showNotification: false,
          }
        );
        return true;
      }

      if (typeof this.tableManager.getAllNominations === "function") {
        const nominations = this.tableManager.getAllNominations();
        if (nominations && nominations.length > 0) {
          Logger.debug(
            `Found ${nominations.length} nominations via TableManager.getAllNominations()`,
            {
              module: "ShipForm",
              data: { allNominationsCount: nominations.length },
              showNotification: false,
            }
          );
          return true;
        }
      }
    }

    Logger.debug("No table data found", {
      module: "ShipForm",
      showNotification: false,
    });
    return false;
  }

  /**
   * Cargar datos iniciales
   */
  loadInitialData() {
    // Cargar tabla inicial con delay para asegurar que todo esté listo
    Logger.info("Loading initial ship nominations table", {
      module: "ShipForm",
      showNotification: false,
    });
    setTimeout(() => {
      this.tableManager.loadShipNominations();
      this.tableManager.setupTableSearch();

      // ⭐ FIX: Inicializar filtros DESPUÉS de cargar datos de tabla
      setTimeout(() => {
        //if (!this.tableFilters) {
        //  Logger.info('Initializing TableFilters after table data is loaded', {
        //    module: 'ShipForm',
        //    showNotification: false
        //  });
        // this.initializeTableFilters();
        //}
        this.setupAdvancedSearch();
        this.initializePagination();
      }, 1000); // Dar tiempo para que la tabla se llene
    }, 500);
  }

  /**
   * ⭐ NUEVO MÉTODO: Configurar búsqueda avanzada
   */
  setupAdvancedSearch() {
    // Integrar el search input existente con el nuevo sistema
    const originalSearchInput = document.getElementById("searchInput");
    const newSearchInput = document.getElementById("shipNominationSearch");

    if (originalSearchInput && newSearchInput && this.tableFilters) {
      // Sincronizar ambos inputs
      originalSearchInput.addEventListener("input", (e) => {
        newSearchInput.value = e.target.value;
        this.tableFilters.performBasicSearch(e.target.value);
      });

      newSearchInput.addEventListener("input", (e) => {
        originalSearchInput.value = e.target.value;
        this.tableFilters.performBasicSearch(e.target.value);
      });

      Logger.success("Advanced search integration completed", {
        module: "ShipForm",
        showNotification: false,
      });
    } else if (originalSearchInput && this.tableFilters) {
      // Fallback: solo usar el input original si el nuevo no existe
      originalSearchInput.addEventListener("input", (e) => {
        this.tableFilters.performBasicSearch(e.target.value);
      });

      Logger.success("Basic search integration completed", {
        module: "ShipForm",
        showNotification: false,
      });
    }

    // Inicializar filtros solo cuando se hace clic en Advanced
    const advancedButton = document.getElementById("advancedSearchToggle");
    if (advancedButton) {
      advancedButton.addEventListener("click", () => {
        if (!this.tableFilters) {
          Logger.debug("Inicializando filtros al hacer clic en Advanced", {
            module: "ShipForm",
            showNotification: false,
          });
          this.initializeTableFilters();

          // ⭐ NUEVO: Abrir el panel automáticamente después de inicializar
          setTimeout(() => {
            if (
              this.tableFilters &&
              typeof this.tableFilters.toggleAdvancedSearch === "function"
            ) {
              this.tableFilters.toggleAdvancedSearch();
              Logger.success("Panel avanzado abierto automáticamente", {
                module: "ShipForm",
                showNotification: false,
              });
            }
          }, 250);
        }
      });
    }
  }

  // ========================================
  // CALLBACKS PARA COMPONENTES
  // ========================================

  /**
   * Agregar item a través del API Manager
   * @param {string} fieldId - ID del campo
   * @param {string} item - Nombre del item
   */
  async addItem(fieldId, item) {
    // 🔍 DEBUG: Ver qué datos llegan
    console.log("🔍 addItem called with:", {
      fieldId,
      item,
      itemType: typeof item,
    });
    // 🆕 MANEJAR DATOS EXTENDIDOS (samplers con weeklyRestriction)
    if (typeof item === "object" && item.name) {
      // Modo extendido: item = { name, email, phone, weeklyRestriction }
      await this.apiManager.addItem(
        fieldId,
        item, // Pasar objeto completo
        // onSuccess callback
        async () => {
          // 🆕 ACTUALIZAR CONSTANTES si es sampler con restricción
          if (fieldId === "sampler" && item.weeklyRestriction) {
            await this.updateSamplerRestrictions(item.name, true);
          }

          await this.apiManager.loadApiData();
          this.forceModalUpdateSingleSelect(fieldId);
          if (this.tableFilters) {
            this.tableFilters.refreshData();
          }
        },
        // onError callback
        (error) => {
          Logger.error("Error in operation", {
            module: "ShipFormController",
            error: new Error(error),
            showNotification: true,
            notificationMessage: error,
          });
        }
      );
    } else {
      // Modo simple: item = "nombre"
      await this.apiManager.addItem(
        fieldId,
        item,
        async () => {
          await this.apiManager.loadApiData();
          this.forceModalUpdateSingleSelect(fieldId); // Solo para SingleSelects simples
          if (this.tableFilters) {
            this.tableFilters.refreshData();
          }
        },
        (error) => {
          Logger.error("Error in API operation", {
            module: "ShipFormController",
            error: new Error(error),
            showNotification: true,
            notificationMessage: error,
          });
        }
      );
    }
  }

  /**
   * Eliminar item a través del API Manager
   * @param {string} fieldId - ID del campo
   * @param {string} item - Nombre del item
   */
  async removeItem(fieldId, item) {
    await this.apiManager.removeItem(
      fieldId,
      item,
      async () => {
        await this.apiManager.loadApiData();

        // Detectar automáticamente si es Single o MultiSelect
        if (this.singleSelectInstances[fieldId]) {
          this.forceModalUpdateSingleSelect(fieldId);
        } else if (this.multiSelectInstances[fieldId]) {
          this.forceModalUpdateMultiSelect(fieldId);
        }

        if (this.tableFilters) {
          this.tableFilters.refreshData();
        }
      },
      (error) => {
        Logger.error("Error in API operation", {
          module: "ShipFormController",
          error: new Error(error),
          showNotification: true,
          notificationMessage: error,
        });
      }
    );
  }

  /**
   * Editar item a través del API Manager
   * @param {string} fieldId - ID del campo
   * @param {Object|string} updatedDataOrOldName - Datos actualizados (modo extendido) o nombre antiguo (modo simple)
   * @param {Object|string} originalDataOrNewName - Datos originales (modo extendido) o nombre nuevo (modo simple)
   * @param {number} index - Índice del item (solo modo extendido)
   */
  async editItem(fieldId, updatedDataOrOldName, originalDataOrNewName, index) {
    // 🆕 DETECCIÓN DE MODO: Verificar si es modo extendido o simple
    const isExtendedMode =
      typeof updatedDataOrOldName === "object" &&
      updatedDataOrOldName !== null &&
      updatedDataOrOldName.name;

    if (isExtendedMode) {
      // NUEVO: Modo extendido con datos completos (samplers, chemists, surveyors)
      const updatedData = updatedDataOrOldName;
      const originalData = originalDataOrNewName;

      await this.apiManager.updateItem(
        fieldId,
        updatedData,
        originalData,
        // onSuccess callback
        async () => {
          // 🆕 ACTUALIZAR CONSTANTES si es sampler con cambio de restricción
          if (
            fieldId === "sampler" &&
            updatedData.weeklyRestriction !== undefined
          ) {
            await this.updateSamplerRestrictions(
              updatedData.name,
              updatedData.weeklyRestriction
            );
          }

          await this.apiManager.loadApiData();
          this.forceModalUpdateSingleSelect(fieldId);
          if (this.tableFilters) {
            this.tableFilters.refreshData();
          }
        },
        // onError callback
        (error) => {
          Logger.error("Error in API operation", {
            module: "ShipFormController",
            error: new Error(error),
            showNotification: true,
            notificationMessage: error,
          });
        }
      );
    } else {
      // Modo simple solo con nombres
      const oldName = updatedDataOrOldName;
      const newName = originalDataOrNewName;

      await this.apiManager.updateItem(
        fieldId,
        { name: newName },
        oldName,
        async () => {
          await this.apiManager.loadApiData();

          // Detectar automáticamente si es Single o MultiSelect
          if (this.singleSelectInstances[fieldId]) {
            this.forceModalUpdateSingleSelect(fieldId);
          } else if (this.multiSelectInstances[fieldId]) {
            this.forceModalUpdateMultiSelect(fieldId);
          }

          if (this.tableFilters) {
            this.tableFilters.refreshData();
          }
        },
        (error) => {
          Logger.error("Error in API operation", {
            module: "ShipFormController",
            error: new Error(error),
            showNotification: true,
            notificationMessage: error,
          });
        }
      );
    }
  }

  /**
   * Obtener datos completos de un item por nombre
   * @param {string} fieldId - ID del campo
   * @param {string} itemName - Nombre del item
   * @returns {Object|null} Datos completos del item
   */
  getItemData(fieldId, itemName) {
    Logger.debug(`Getting item data for ${fieldId}: ${itemName}`, {
      module: "ShipFormController",
      showNotification: false,
    });

    if (fieldId === "sampler") {
      const sampler = this.apiManager.samplersFullData?.find(
        (s) => s.name === itemName
      );
      if (sampler) {
        Logger.debug(`Found complete data for ${itemName}`, {
          module: "ShipFormController",
          data: sampler,
          showNotification: false,
        });
        // ✅ DEVOLVER TODO EL OBJETO COMPLETO
        return sampler;
      }
    }

    if (fieldId === "chemist") {
      const chemist = this.apiManager.chemistsFullData?.find(
        (c) => c.name === itemName
      );
      if (chemist) {
        return chemist;
      }
    }

    if (fieldId === "surveyor") {
      const surveyor = this.apiManager.surveyorsFullData?.find(
        (s) => s.name === itemName
      );
      if (surveyor) {
        return surveyor;
      }
    }

    // Fallback: datos básicos
    return { name: itemName };
  }

  /**
   * Forzar actualización del modal SingleSelect
   * @param {string} fieldId - ID del campo
   */
  forceModalUpdateSingleSelect(fieldId) {
    try {
      const singleSelectInstance = this.singleSelectInstances[fieldId];
      if (!singleSelectInstance) {
        Logger.warn(`SingleSelect instance not found: ${fieldId}`, {
          module: "ShipFormController",
          showNotification: false,
        });
        return;
      }

      // Obtener datos actualizados desde la API
      const config = SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG[fieldId];
      if (config && config.apiEndpoint) {
        const updatedItems = this.apiManager.getDataByEndpoint(
          config.apiEndpoint
        );

        if (updatedItems && Array.isArray(updatedItems)) {
          singleSelectInstance.updateItemsFromAPI(updatedItems);

          Logger.debug(`SingleSelect ${fieldId} updated from API`, {
            module: "ShipFormController",
            data: { fieldId: fieldId, itemCount: updatedItems.length },
            showNotification: false,
          });
        }
      } else {
        singleSelectInstance.forceRefresh();
      }
    } catch (error) {
      Logger.error("Error updating SingleSelect modal", {
        module: "ShipFormController",
        error: error,
        showNotification: false,
      });
    }
  }

  /**
   * Forzar actualización del modal MultiSelect
   * @param {string} fieldId - ID del campo
   */
  forceModalUpdateMultiSelect(fieldId) {
    try {
      const multiSelectInstance = this.multiSelectInstances[fieldId];
      if (multiSelectInstance) {
        // 🆕 OBTENER DATOS ACTUALIZADOS DE LA API
        const config = SHIP_NOMINATION_CONSTANTS.MULTI_SELECT_CONFIG[fieldId];
        if (config && config.apiEndpoint) {
          // Obtener datos actualizados desde la API
          const updatedItems = this.apiManager.getDataByEndpoint(
            config.apiEndpoint
          );
          if (updatedItems && Array.isArray(updatedItems)) {
            // 🆕 ACTUALIZAR LISTA LOCAL DEL MULTISELECT
            if (typeof multiSelectInstance.updateItems === "function") {
              multiSelectInstance.updateItems(updatedItems);
              Logger.debug(`MultiSelect ${fieldId} items updated from API`, {
                module: "ShipFormController",
                fieldId: fieldId,
                itemCount: updatedItems.length,
                showNotification: false,
              });
            }
          }
        }

        // 🆕 ACTUALIZAR MODAL SI ESTÁ ABIERTO
        const modalId = `${fieldId}_modal`;
        const modal = document.getElementById(modalId);

        if (modal && modal.classList.contains("show")) {
          // 🆕 ACTUALIZAR LA LISTA DE ITEMS EN EL MODAL
          if (typeof multiSelectInstance.loadModalItems === "function") {
            multiSelectInstance.loadModalItems();
            Logger.debug(`Modal ${fieldId} items refreshed while open`, {
              module: "ShipFormController",
              fieldId: fieldId,
              showNotification: false,
            });
          }
        }

        Logger.debug(`MultiSelect ${fieldId} interface updated successfully`, {
          module: "ShipFormController",
          fieldId: fieldId,
          showNotification: false,
        });
      }
    } catch (error) {
      console.error("Error updating MultiSelect modal:", error);
    }
  }

  // ========================================
  // MÉTODOS PROXY PARA CRUD OPERATIONS
  // ========================================

  /**
   * Ver detalles de ship nomination
   * @param {string} nominationId - ID de la nomination
   */
  viewNomination(nominationId) {
    this.crudOperations.viewNomination(nominationId);
  }

  /**
   * Editar ship nomination
   * @param {string} nominationId - ID de la nomination
   */
  editNomination(nominationId) {
    this.crudOperations.editNomination(nominationId);
  }

  /**
   * Eliminar ship nomination
   * @param {string} nominationId - ID de la nomination
   */
  deleteNomination(nominationId) {
    this.crudOperations.deleteNomination(nominationId);
  }

  // ========================================
  // MÉTODOS PÚBLICOS PARA ACCESO EXTERNO
  // ========================================

  /**
   * Obtener instancia del formulario handler
   */
  getFormHandler() {
    return this.formHandler;
  }

  /**
   * Obtener instancia del table manager
   */
  getTableManager() {
    return this.tableManager;
  }

  /**
   * Obtener instancia del API manager
   */
  getApiManager() {
    return this.apiManager;
  }

  /**
   * Obtener instancia de CRUD operations
   */
  getCrudOperations() {
    return this.crudOperations;
  }

  /**
   * ⭐ NUEVO MÉTODO: Obtener instancia de TableFilters
   */
  getTableFilters() {
    return this.tableFilters;
  }

  /**
   * 🆕 NUEVO MÉTODO: Obtener instancia de ExcelExporter
   */
  getExcelExporter() {
    return this.excelExporter;
  }

  /**
   * ⭐ NUEVO MÉTODO: Prevenir conflictos entre filtros y recargas automáticas
   */
  preventFilterConflicts() {
    let filteringInProgress = false;

    // Interceptar applyPreset para marcar que estamos filtrando
    const originalApplyPreset = this.tableFilters.applyPreset;
    this.tableFilters.applyPreset = function (preset) {
      Logger.debug("Aplicando preset", {
        module: "ShipForm",
        data: { preset: preset },
        showNotification: false,
      });
      filteringInProgress = true;

      const result = originalApplyPreset.call(this, preset);

      setTimeout(() => {
        filteringInProgress = false;
        Logger.success("Preset aplicado completamente", {
          module: "ShipForm",
          showNotification: false,
        });
      }, 1000);

      return result;
    };

    // Bloquear recargas automáticas durante filtrado
    const originalLoad = this.tableManager.loadShipNominations;
    this.tableManager.loadShipNominations = function () {
      if (filteringInProgress) {
        Logger.warn("BLOQUEANDO recarga - filtrado en progreso", {
          module: "ShipForm",
          showNotification: false,
        });
        return;
      }

      const activeFilters =
        window.simpleShipForm.tableFilters?.getActiveFilters() || {};
      const hasActiveFilters = Object.keys(activeFilters).length > 0;

      if (hasActiveFilters) {
        Logger.warn("BLOQUEANDO recarga - hay filtros activos", {
          module: "ShipForm",
          data: { activeFilters: activeFilters },
          showNotification: false,
        });
        return;
      }

      return originalLoad.call(this);
    };
  }

  /**
   * Refrescar toda la aplicación
   */
  async refresh() {
    await this.apiManager.loadApiData();
    await this.tableManager.loadShipNominations();

    // ⭐ NUEVA LÍNEA: Refrescar filtros
    if (this.tableFilters) {
      this.tableFilters.refreshData();
    }

    // 🆕 NUEVA LÍNEA: Actualizar ExcelExporter si existe
    if (this.excelExporter) {
      this.excelExporter.updateButtonVisibility();
    }

    Logger.info("Application refreshed", {
      module: "ShipForm",
      showNotification: false,
    });
  }

  /**
   * Obtener estado completo de la aplicación
   */
  getApplicationState() {
    return {
      apiDataLoaded: this.apiManager.isDataLoaded(),
      formState: this.formHandler ? this.formHandler.getFormState() : null,
      tableStats: this.tableManager.getTableStats(),
      filtersActive: this.tableFilters
        ? Object.keys(this.tableFilters.getActiveFilters()).length
        : 0,
      filterStats: this.tableFilters
        ? this.tableFilters.getFilterStats()
        : null,
      componentsInitialized: {
        singleSelects: Object.keys(this.singleSelectInstances).length,
        multiSelects: Object.keys(this.multiSelectInstances).length,
        dateTimes: Object.keys(this.dateTimeInstances).length,
        tableFilters: !!this.tableFilters,
        excelExporter: !!this.excelExporter,
      },

      // 🆕 NUEVA SECCIÓN: Estado del ExcelExporter
      excelExportState: this.excelExporter
        ? {
            buttonVisible:
              this.excelExporter.floatingButton?.style.display !== "none",
            hasActiveFilters: this.excelExporter.hasActiveFilters(),
            hasTableData: this.excelExporter.hasTableData(),
            currentFilteredCount:
              this.excelExporter.getCurrentFilteredData()?.length || 0,
          }
        : null,
    };
  }

  /**
   * ⭐ NUEVO MÉTODO: Métodos de utilidad para filtros
   */
  getFilterConfiguration() {
    return this.tableFilters
      ? this.tableFilters.exportFilterConfiguration()
      : null;
  }

  setFilterConfiguration(config) {
    if (this.tableFilters) {
      this.tableFilters.importFilterConfiguration(config);
    }
  }

  /**
   * ⭐ NUEVO MÉTODO: Aplicar filtros programáticamente
   */
  applyFilters(filters) {
    if (this.tableFilters) {
      this.tableFilters.setFilters(filters);
    }
  }

  /**
   * ⭐ NUEVO MÉTODO: Limpiar todos los filtros
   */
  clearAllFilters() {
    if (this.tableFilters) {
      this.tableFilters.clearAllFilters();
    }
  }

  /**
   * 🆕 NUEVO: Actualizar restricciones de sampler en constantes dinámicamente
   * @param {string} samplerName - Nombre del sampler
   * @param {boolean} hasRestriction - Si tiene restricción semanal
   */
  async updateSamplerRestrictions(samplerName, hasRestriction) {
    try {
      Logger.info(`Updating restrictions for ${samplerName}`, {
        module: "ShipFormController",
        data: {
          samplerName: samplerName,
          hasRestriction: hasRestriction,
        },
        showNotification: false,
      });

      // 🔄 SINCRONIZAR CON SAMPLING ROSTER CONSTANTS
      if (
        window.SAMPLING_ROSTER_CONSTANTS &&
        window.SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS
      ) {
        // Refrescar límites desde base de datos
        await window.SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS.refreshWeeklyLimits();

        Logger.success(`Sampling Roster constants synchronized`, {
          module: "ShipFormController",
          data: {
            currentLimits: Object.keys(
              window.SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS.WEEKLY_LIMITS
            ),
            samplerUpdated: samplerName,
            restriction: hasRestriction,
          },
          showNotification: false,
        });
      }

      // 🎯 NOTIFICACIÓN AL USUARIO
      const message = hasRestriction
        ? `Weekly restriction enabled for ${samplerName} (24h/week limit)`
        : `Weekly restriction disabled for ${samplerName}`;

      Logger.success(message, {
        module: "ShipFormController",
        showNotification: true,
        notificationMessage: message,
      });

      // 🔄 ACTUALIZAR SingleSelect para reflejar cambios inmediatamente
      const samplerSelect = this.singleSelectInstances.sampler;
      if (
        samplerSelect &&
        typeof samplerSelect.isWeeklyRestrictionEnabled === "function"
      ) {
        Logger.debug("SingleSelect state will refresh on next open", {
          module: "ShipFormController",
          showNotification: false,
        });
      }
    } catch (error) {
      Logger.error("Error updating sampler restrictions", {
        module: "ShipFormController",
        error: error,
        data: { samplerName: samplerName, hasRestriction: hasRestriction },
        showNotification: true,
        notificationMessage: `Failed to update restrictions for ${samplerName}`,
      });
    }
  }
}

// ========================================
// FUNCIONES GLOBALES PARA FILTROS Y EXCEL
// ========================================

// Funciones globales para fácil acceso a filtros
window.getActiveFilters = function () {
  return window.simpleShipForm?.getTableFilters()?.getActiveFilters() || {};
};

window.setSearchFilters = function (filters) {
  const tableFilters = window.simpleShipForm?.getTableFilters();
  if (tableFilters) {
    tableFilters.setFilters(filters);
  }
};

window.clearSearchFilters = function () {
  const tableFilters = window.simpleShipForm?.getTableFilters();
  if (tableFilters) {
    tableFilters.clearAllFilters();
  }
};

window.exportFilterConfiguration = function () {
  const tableFilters = window.simpleShipForm?.getTableFilters();
  if (tableFilters) {
    return tableFilters.exportFilterConfiguration();
  }
  return null;
};

window.importFilterConfiguration = function (config) {
  const tableFilters = window.simpleShipForm?.getTableFilters();
  if (tableFilters) {
    tableFilters.importFilterConfiguration(config);
  }
};

// ⭐ NUEVA FUNCIÓN: Debug de filtros
window.debugTableFilters = function () {
  const shipForm = window.simpleShipForm;
  if (!shipForm) {
    Logger.error("SimpleShipForm not initialized", {
      module: "ShipForm",
      showNotification: false,
    });
    return;
  }

  const tableFilters = shipForm.getTableFilters();
  if (!tableFilters) {
    Logger.error("TableFilters not initialized", {
      module: "ShipForm",
      showNotification: false,
    });
    return;
  }

  Logger.debug("TableFilters Debug Info", {
    module: "ShipForm",
    showNotification: false,
  });
  Logger.debug("Active Filters", {
    module: "ShipForm",
    data: { activeFilters: tableFilters.getActiveFilters() },
    showNotification: false,
  });
  Logger.debug("Filter Stats", {
    module: "ShipForm",
    data: { filterStats: tableFilters.getFilterStats() },
    showNotification: false,
  });
  Logger.debug("HTML Elements Check", {
    module: "ShipForm",
    data: { htmlElementsCheck: tableFilters.validateHTMLElements() },
    showNotification: false,
  });
  Logger.debug("Dependencies Check", {
    module: "ShipForm",
    data: { dependenciesCheck: TableFilters.checkDependencies() },
    showNotification: false,
  });
};

// 🆕 NUEVA FUNCIÓN: Debug de ExcelExporter
window.debugExcelExporter = function () {
  const shipForm = window.simpleShipForm;
  if (!shipForm) {
    Logger.error("SimpleShipForm not initialized", {
      module: "ShipForm",
      showNotification: false,
    });
    return;
  }

  const excelExporter = shipForm.getExcelExporter();
  if (!excelExporter) {
    Logger.error("ExcelExporter not initialized", {
      module: "ShipForm",
      showNotification: false,
    });
    return;
  }

  Logger.debug("ExcelExporter Debug Info", {
    module: "ShipForm",
    showNotification: false,
  });
  Logger.debug("================================", {
    module: "ShipForm",
    showNotification: false,
  });
  Logger.debug("ExcelExporter initialized", {
    module: "ShipForm",
    data: { initialized: !!excelExporter },
    showNotification: false,
  });
  Logger.debug("SheetJS available", {
    module: "ShipForm",
    data: { sheetjsAvailable: typeof XLSX !== "undefined" },
    showNotification: false,
  });
  Logger.debug("Floating button created", {
    module: "ShipForm",
    data: { buttonCreated: !!excelExporter.floatingButton },
    showNotification: false,
  });
  Logger.debug("Button visible", {
    module: "ShipForm",
    data: {
      buttonVisible: excelExporter.floatingButton?.style.display !== "none",
    },
    showNotification: false,
  });
  Logger.debug("Has active filters", {
    module: "ShipForm",
    data: { hasActiveFilters: excelExporter.hasActiveFilters() },
    showNotification: false,
  });
  Logger.debug("Has table data", {
    module: "ShipForm",
    data: { hasTableData: excelExporter.hasTableData() },
    showNotification: false,
  });

  const filteredData = excelExporter.getCurrentFilteredData();
  Logger.debug("Current filtered data count", {
    module: "ShipForm",
    data: { filteredDataCount: filteredData?.length || 0 },
    showNotification: false,
  });

  const activeFilters = shipForm.getTableFilters()?.getActiveFilters() || {};
  Logger.debug("Active filters", {
    module: "ShipForm",
    data: { activeFiltersCount: Object.keys(activeFilters).length },
    showNotification: false,
  });

  Logger.debug("================================", {
    module: "ShipForm",
    showNotification: false,
  });

  return {
    initialized: !!excelExporter,
    sheetjsAvailable: typeof XLSX !== "undefined",
    buttonExists: !!excelExporter.floatingButton,
    buttonVisible: excelExporter.floatingButton?.style.display !== "none",
    hasFilters: excelExporter.hasActiveFilters(),
    hasData: excelExporter.hasTableData(),
    filteredCount: filteredData?.length || 0,
    activeFiltersCount: Object.keys(activeFilters).length,
  };
};

// 🆕 NUEVA FUNCIÓN: Test completo del sistema Excel
window.testExcelExportSystem = function () {
  console.clear();
  Logger.debug("TESTING COMPLETE EXCEL EXPORT SYSTEM", {
    module: "ShipForm",
    showNotification: false,
  });
  Logger.debug("========================================", {
    module: "ShipForm",
    showNotification: false,
  });

  const debugResult = window.debugExcelExporter();

  if (!debugResult.initialized) {
    Logger.error("ExcelExporter not initialized - cannot test", {
      module: "ShipForm",
      showNotification: false,
    });
    return false;
  }

  if (!debugResult.sheetjsAvailable) {
    Logger.error("SheetJS not available - check script loading", {
      module: "ShipForm",
      showNotification: false,
    });
    return false;
  }

  if (debugResult.filteredCount === 0) {
    Logger.warn("No filtered data available - apply some filters first", {
      module: "ShipForm",
      showNotification: false,
    });

    // Aplicar filtro de prueba
    const tableFilters = window.simpleShipForm?.getTableFilters();
    if (tableFilters) {
      Logger.debug("Applying test filter (This Month)", {
        module: "ShipForm",
        showNotification: false,
      });
      tableFilters.applyPreset("thisMonth");

      setTimeout(() => {
        Logger.debug("Re-testing after filter application", {
          module: "ShipForm",
          showNotification: false,
        });
        window.testExcelExportSystem();
      }, 1500);

      return;
    }
  }

  Logger.success("EXCEL EXPORT SYSTEM IS READY!", {
    module: "ShipForm",
    showNotification: false,
  });
  Logger.debug("Filtered data available", {
    module: "ShipForm",
    data: {
      filteredDataCount: debugResult.filteredCount,
      records: "records",
    },
    showNotification: false,
  });
  Logger.debug("Export button should be visible", {
    module: "ShipForm",
    data: { buttonVisible: debugResult.buttonVisible },
    showNotification: false,
  });
  return true;
};

export default ShipFormController;
