/**
 * API Manager Module - Gestión de APIs, datos y cache
 * Migrado desde ship-form-simple.js para mejor modularización
 */

import { SHIP_NOMINATION_CONSTANTS } from "../utils/Constants.js";

class APIManager {
  constructor() {
    this.apiData = {}; // Cache para datos de API
    this.clientsFullData = []; // Cache completo de clients con IDs
    this.agentsFullData = []; // Cache completo de agents con IDs
    this.terminalsFullData = []; // Cache completo de terminals con IDs
    this.berthsFullData = []; // Cache completo de berths con IDs
    this.surveyorsFullData = []; // Cache completo de surveyors con IDs
    this.samplersFullData = []; // Cache completo de samplers con IDs
    this.chemistsFullData = []; // Cache completo de chemists con IDs
    this.productTypesFullData = []; // Cache completo de product types con IDs
    this.baseURL = this.getBaseURL(); //Obtener URL Base
  }

  /**
   * Detectar automáticamente la URL base según el entorno
   */
  getBaseURL() {
    const { hostname, protocol } = window.location;

    // Si estamos en desarrollo local
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }

    // Si estamos en producción
    return "";
  }

  /**
   * 🆕 NUEVO: Obtener berths filtrados por terminal
   * @param {string} terminalName - Nombre del terminal
   * @returns {Array} Lista de berths del terminal
   */
  getBerthsByTerminal(terminalName) {
    if (!terminalName || !this.berthsFullData) {
      Logger.debug('getBerthsByTerminal: Missing data', {
        module: 'APIManager',
        data: { terminalName, hasBerthsData: !!this.berthsFullData },
        showNotification: false
      });
      return [];
    }
    
    Logger.debug('getBerthsByTerminal: Processing data', {
      module: 'APIManager',
      data: { 
        terminalName, 
        berthsCount: this.berthsFullData.length,
        sampleBerth: this.berthsFullData[0],
        allBerths: this.berthsFullData.map(b => ({ name: b.name, terminals: b.terminals }))
      },
      showNotification: false
    });
    
    const filteredBerths = this.berthsFullData
      .filter(berth => berth.terminals && berth.terminals.some(terminal => terminal.name === terminalName))
      .map(berth => berth.name);
    
    Logger.debug('getBerthsByTerminal: Filtered result', {
      module: 'APIManager',
      data: { terminalName, filteredBerths, count: filteredBerths.length },
      showNotification: false
    });
    
    return filteredBerths;
  }

  /**
   * 🆕 NUEVO: Obtener berths filtrados por terminal (por ID)
   * @param {string} terminalId - ID del terminal
   * @returns {Array} Lista de berths del terminal
   */
  getBerthsByTerminalId(terminalId) {
    if (!terminalId || !this.berthsFullData) {
      return [];
    }
    
    return this.berthsFullData
      .filter(berth => berth.terminals && berth.terminals.some(terminal => terminal._id === terminalId))
      .map(berth => berth.name);
  }

  /**
   * Cargar berths desde la API
   * @returns {Promise<void>}
   */
  async loadApiData() {
    try {
      Logger.info("Loading data from APIs", {
        module: "APIManager",
        showNotification: false,
      });

      // Cargar clients desde la API
      Logger.debug("Loading clients from API", {
        module: "APIManager",
        showNotification: false,
      });
      const clientsResponse = await fetch(`${this.baseURL}/api/clients`);
      const clientsResult = await clientsResponse.json();

      if (clientsResult.success) {
        this.clientsFullData = clientsResult.data;
        this.apiData.clients = clientsResult.data.map((client) => client.name);
        Logger.success(
          `Loaded ${this.apiData.clients.length} clients from API`,
          {
            module: "APIManager",
            data: { clientsCount: this.apiData.clients.length },
            showNotification: false,
          }
        );
      } else {
        throw new Error("Clients API response not successful");
      }

      // Cargar agents desde la API
      Logger.debug("Loading agents from API", {
        module: "APIManager",
        showNotification: false,
      });
      const agentsResponse = await fetch(`${this.baseURL}/api/agents`);
      const agentsResult = await agentsResponse.json();

      if (agentsResult.success) {
        this.agentsFullData = agentsResult.data;
        this.apiData.agents = agentsResult.data.map((agent) => agent.name);
        Logger.success(`Loaded ${this.apiData.agents.length} agents from API`, {
          module: "APIManager",
          data: { agentsCount: this.apiData.agents.length },
          showNotification: false,
        });
      } else {
        throw new Error("Agents API response not successful");
      }

      // Cargar terminals desde la API
      Logger.debug("Loading terminals from API", {
        module: "APIManager",
        showNotification: false,
      });
      const terminalsResponse = await fetch(`${this.baseURL}/api/terminals`);
      const terminalsResult = await terminalsResponse.json();

      if (terminalsResult.success) {
        this.terminalsFullData = terminalsResult.data;
        this.apiData.terminals = terminalsResult.data.map(
          (terminal) => terminal.name
        );
        Logger.success(
          `Loaded ${this.apiData.terminals.length} terminals from API`,
          {
            module: "APIManager",
            data: { terminalsCount: this.apiData.terminals.length },
            showNotification: false,
          }
        );
      } else {
        throw new Error("Terminals API response not successful");
      }

      // Cargar berths desde la API
      Logger.debug("Loading berths from API", {
        module: "APIManager",
        showNotification: false,
      });
      const berthsResponse = await fetch(`${this.baseURL}/api/berths?populate=terminals`);
      const berthsResult = await berthsResponse.json();

      if (berthsResult.success) {
        this.berthsFullData = berthsResult.data;
        this.apiData.berths = berthsResult.data.map((item) => item.name);
        Logger.success(`Loaded ${this.apiData.berths.length} berths from API`, {
          module: "APIManager",
          data: { berthsCount: this.apiData.berths.length },
          showNotification: false,
        });
      } else {
        throw new Error("Berths API response not successful");
      }

      // Cargar surveyors desde la API
      Logger.debug("Loading surveyors from API", {
        module: "APIManager",
        showNotification: false,
      });
      const surveyorsResponse = await fetch(`${this.baseURL}/api/surveyors`);
      const surveyorsResult = await surveyorsResponse.json();

      if (surveyorsResult.success) {
        this.surveyorsFullData = surveyorsResult.data;
        this.apiData.surveyors = surveyorsResult.data.map((item) => item.name);
        Logger.success(
          `Loaded ${this.apiData.surveyors.length} surveyors from API`,
          {
            module: "APIManager",
            data: { surveyorsCount: this.apiData.surveyors.length },
            showNotification: false,
          }
        );
      } else {
        throw new Error("Surveyors API response not successful");
      }

      // Cargar samplers desde la API
      Logger.debug("Loading samplers from API", {
        module: "APIManager",
        showNotification: false,
      });
      const samplersResponse = await fetch(`${this.baseURL}/api/samplers`);
      const samplersResult = await samplersResponse.json();

      if (samplersResult.success) {
        this.samplersFullData = samplersResult.data;
        this.apiData.samplers = samplersResult.data.map((item) => item.name);
        Logger.success(
          `Loaded ${this.apiData.samplers.length} samplers from API`,
          {
            module: "APIManager",
            data: { samplersCount: this.apiData.samplers.length },
            showNotification: false,
          }
        );
      } else {
        throw new Error("Samplers API response not successful");
      }

      // Cargar chemists desde la API
      Logger.debug("Loading chemists from API", {
        module: "APIManager",
        showNotification: false,
      });
      const chemistsResponse = await fetch(`${this.baseURL}/api/chemists`);
      const chemistsResult = await chemistsResponse.json();

      if (chemistsResult.success) {
        this.chemistsFullData = chemistsResult.data;
        this.apiData.chemists = chemistsResult.data.map((item) => item.name);
        Logger.success(
          `Loaded ${this.apiData.chemists.length} chemists from API`,
          {
            module: "APIManager",
            data: { chemistsCount: this.apiData.chemists.length },
            showNotification: false,
          }
        );
      } else {
        throw new Error("Chemists API response not successful");
      }

      // Cargar product types desde la API
      Logger.debug("Loading product types from API", {
        module: "APIManager",
        showNotification: false,
      });
      const productTypesResponse = await fetch(
        `${this.baseURL}/api/producttypes`
      );
      const productTypesResult = await productTypesResponse.json();

      if (productTypesResult.success) {
        this.productTypesFullData = productTypesResult.data;
        this.apiData.productTypes = productTypesResult.data.map(
          (item) => item.name
        );
        Logger.success(
          `Loaded ${this.apiData.productTypes.length} product types from API`,
          {
            module: "APIManager",
            data: { productTypesCount: this.apiData.productTypes.length },
            showNotification: false,
          }
        );
      } else {
        throw new Error("Product Types API response not successful");
      }
    } catch (error) {
      Logger.error("Error loading API data", {
        module: "APIManager",
        error: error,
        showNotification: true,
        notificationMessage: "Failed to load API data. Using fallback data.",
      });
      // Fallback a datos mock
      this.apiData.clients = ["Mobil", "BP", "Ampol SG"];
      this.apiData.agents = ["Wave Shipping", "ISS", "GAC"];
      this.apiData.terminals = ["Vopak", "Quantem", "Ampol Kurnell"];
      throw error;
    }
  }

  /**
   * Encontrar Client por nombre
   * @param {string} name - Nombre del client
   * @returns {Object|null} Client encontrado
   */
  findClientByName(name) {
    return this.clientsFullData.find((client) => client.name === name);
  }

  /**
   * Encontrar Agent por nombre
   * @param {string} name - Nombre del agent
   * @returns {Object|null} Agent encontrado
   */
  findAgentByName(name) {
    return this.agentsFullData.find((agent) => agent.name === name);
  }

  /**
   * Encontrar Terminal por nombre
   * @param {string} name - Nombre del terminal
   * @returns {Object|null} Terminal encontrado
   */
  findTerminalByName(name) {
    return this.terminalsFullData.find((terminal) => terminal.name === name);
  }

  /**
   * Encontrar Berth por nombre
   * @param {string} name - Nombre del berth
   * @returns {Object|null} Berth encontrado
   */
  findBerthByName(name) {
    return this.berthsFullData.find((berth) => berth.name === name);
  }

  /**
   * Encontrar Surveyor por nombre
   * @param {string} name - Nombre del surveyor
   * @returns {Object|null} Surveyor encontrado
   */
  findSurveyorByName(name) {
    return this.surveyorsFullData.find((surveyor) => surveyor.name === name);
  }

  /**
   * Encontrar Sampler por nombre
   * @param {string} name - Nombre del sampler
   * @returns {Object|null} Sampler encontrado
   */
  findSamplerByName(name) {
    return this.samplersFullData.find((sampler) => sampler.name === name);
  }

  /**
   * Encontrar Chemist por nombre
   * @param {string} name - Nombre del chemist
   * @returns {Object|null} Chemist encontrado
   */
  findChemistByName(name) {
    return this.chemistsFullData.find((chemist) => chemist.name === name);
  }

  /**
   * Encontrar ProductType por nombre
   * @param {string} name - Nombre del product type
   * @returns {Object|null} ProductType encontrado
   */
  findProductTypeByName(name) {
    return this.productTypesFullData.find(
      (productType) => productType.name === name
    );
  }

  /**
   * Método genérico para encontrar item por API endpoint
   * @param {string} apiEndpoint - Endpoint de la API
   * @param {string} name - Nombre del item
   * @returns {Object|null} Item encontrado
   */
  findItemByName(apiEndpoint, name) {
    if (apiEndpoint === "/api/clients") {
      return this.findClientByName(name);
    } else if (apiEndpoint === "/api/agents") {
      return this.findAgentByName(name);
    } else if (apiEndpoint === "/api/terminals") {
      return this.findTerminalByName(name);
    } else if (apiEndpoint === "/api/berths") {
      return this.findBerthByName(name);
    } else if (apiEndpoint === "/api/surveyors") {
      return this.findSurveyorByName(name);
    } else if (apiEndpoint === "/api/samplers") {
      return this.findSamplerByName(name);
    } else if (apiEndpoint === "/api/chemists") {
      return this.findChemistByName(name);
    } else if (apiEndpoint === "/api/producttypes") {
      return this.findProductTypeByName(name);
    }
    return null;
  }

  /**
   * Agregar item via API
   * @param {string} fieldId - ID del campo
   * @param {string} item - Nombre del item
   * @param {Function} onSuccess - Callback de éxito
   * @param {Function} onError - Callback de error
   */
  async addItem(fieldId, item, onSuccess, onError) {
    const itemName = typeof item === "object" ? item.name : item;
    const config =
      SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG[fieldId] ||
      SHIP_NOMINATION_CONSTANTS.MULTI_SELECT_CONFIG[fieldId];

    if (config && config.apiEndpoint) {
      try {
        const itemName = typeof item === "object" ? item.name : item;
        Logger.info(`Adding "${itemName}" to ${fieldId} via API`, {
          module: "APIManager",
          data: { fieldId: fieldId, item: item },
          showNotification: false,
        });

        const response = await fetch(config.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            typeof item === "object" && item !== null
              ? {
                  name: item.name,
                  ...(item.email &&
                    item.email.trim() !== "" && { email: item.email.trim() }),
                  ...(item.phone &&
                    item.phone.trim() !== "" && { phone: item.phone.trim() }),
                  ...(item.weeklyRestriction !== undefined && {
                    weeklyRestriction: Boolean(item.weeklyRestriction),
                  }),
                  ...(item.weekDayRestrictions && {
                    weekDayRestrictions: item.weekDayRestrictions,
                  }),
                }
              : { name: item }
          ),
        });

        const result = await response.json();

        if (result.success) {
          Logger.success(`Added "${itemName}" to ${fieldId} via API`, {
            module: "APIManager",
            data: {
              fieldId: fieldId,
              item: itemName,
              hasEmail: typeof item === "object" && !!item.email,
              hasPhone: typeof item === "object" && !!item.phone,
            },
            showNotification: false,
          });

          // Recargar datos
          await this.loadApiData();

          if (onSuccess) onSuccess();

          // Add
          Logger.success(`${itemName} added successfully`, {
            module: "APIManager",
            showNotification: true,
            notificationMessage: `${itemName} added successfully!`,
          });
        } else {
          Logger.error("Error adding item via API", {
            module: "APIManager",
            error: new Error(result.message),
            showNotification: true,
            notificationMessage: `Error: ${result.message}`,
          });
          if (onError) onError(`Error: ${result.message}`);
        }
      } catch (error) {
        Logger.error("Error adding item", {
          module: "APIManager",
          error: error,
          showNotification: true,
          notificationMessage: "Error adding item. Please try again.",
        });
        if (onError) onError("Error adding item. Please try again.");
      }
    } else {
      // Agregar a datos mock (método anterior)
      const dataKey = config.data;
      MOCK_DATA[dataKey].push(item);
      Logger.debug(`Added ${item} to ${dataKey} (mock)`, {
        module: "APIManager",
        data: { item: item, dataKey: dataKey },
        showNotification: false,
      });
      if (onSuccess) onSuccess();
    }
  }

  /**
   * Eliminar item via API
   * @param {string} fieldId - ID del campo
   * @param {string} item - Nombre del item
   * @param {Function} onSuccess - Callback de éxito
   * @param {Function} onError - Callback de error
   */
  async removeItem(fieldId, item, onSuccess, onError) {
    Logger.debug(
      `removeItem called with fieldId="${fieldId}", item="${item}"`,
      {
        module: "APIManager",
        data: { fieldId: fieldId, item: item },
        showNotification: false,
      }
    );

    const config =
      SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG[fieldId] ||
      SHIP_NOMINATION_CONSTANTS.MULTI_SELECT_CONFIG[fieldId];

    if (config && config.apiEndpoint) {
      try {
        // Encontrar el item completo con ID usando el método genérico
        const itemData = this.findItemByName(config.apiEndpoint, item);

        if (!itemData) {
          Logger.error(`Item not found in ${config.apiEndpoint}`, {
            module: "APIManager",
            data: { item: item, endpoint: config.apiEndpoint },
            showNotification: true,
            notificationMessage: `Item "${item}" not found`,
          });
          if (onError) onError(`Item "${item}" not found`);
          return;
        }

        Logger.info(
          `Deleting "${item}" (ID: ${itemData._id}) from ${fieldId} via API`,
          {
            module: "APIManager",
            data: { item: item, itemId: itemData._id, fieldId: fieldId },
            showNotification: false,
          }
        );

        const response = await fetch(`${config.apiEndpoint}/${itemData._id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (result.success) {
          Logger.success(`Deleted "${item}" from ${fieldId} via API`, {
            module: "APIManager",
            data: { item: item, fieldId: fieldId },
            showNotification: false,
          });

          // Recargar datos
          await this.loadApiData();

          if (onSuccess) onSuccess();

          // Delete
          Logger.success(`${item} deleted successfully`, {
            module: "APIManager",
            showNotification: true,
            notificationMessage: `${item} deleted successfully!`,
          });
        } else {
          Logger.error("Error deleting item via API", {
            module: "APIManager",
            error: new Error(result.message),
            showNotification: true,
            notificationMessage: `Error: ${result.message}`,
          });
          if (onError) onError(`Error: ${result.message}`);
        }
      } catch (error) {
        Logger.error("Error deleting item", {
          module: "APIManager",
          error: error,
          showNotification: true,
          notificationMessage: "Error deleting item. Please try again.",
        });
        if (onError) onError("Error deleting item. Please try again.");
      }
    } else {
      // Eliminar de datos mock (método anterior)
      const dataKey = config.data;
      if (dataKey && MOCK_DATA[dataKey]) {
        const index = MOCK_DATA[dataKey].indexOf(item);
        if (index > -1) {
          MOCK_DATA[dataKey].splice(index, 1);
          Logger.debug(`Removed ${item} from ${dataKey} (mock)`, {
            module: "APIManager",
            data: { item: item, dataKey: dataKey },
            showNotification: false,
          });
          if (onSuccess) onSuccess();
        }
      }
    }
  }

  /**
   * Editar item via API
   * @param {string} fieldId - ID del campo
   * @param {string} oldName - Nombre actual
   * @param {string} newName - Nuevo nombre
   * @param {Function} onSuccess - Callback de éxito
   * @param {Function} onError - Callback de error
   */
  async editItem(fieldId, oldName, newName, onSuccess, onError) {
    Logger.debug(
      `editItem called with fieldId="${fieldId}", oldName="${oldName}", newName="${newName}"`,
      {
        module: "APIManager",
        data: { fieldId: fieldId, oldName: oldName, newName: newName },
        showNotification: false,
      }
    );

    const config =
      SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG[fieldId] ||
      SHIP_NOMINATION_CONSTANTS.MULTI_SELECT_CONFIG[fieldId];

    if (config && config.apiEndpoint) {
      try {
        // Encontrar el item completo con ID usando el método genérico
        const itemData = this.findItemByName(config.apiEndpoint, oldName);

        if (!itemData) {
          Logger.error(`Item not found in ${config.apiEndpoint}`, {
            module: "APIManager",
            data: { oldName: oldName, endpoint: config.apiEndpoint },
            showNotification: true,
            notificationMessage: `Item "${oldName}" not found`,
          });
          if (onError) onError(`Item "${oldName}" not found`);
          return;
        }

        Logger.info(
          `Editing "${oldName}" to "${newName}" (ID: ${itemData._id}) via API`,
          {
            module: "APIManager",
            data: { oldName: oldName, newName: newName, itemId: itemData._id },
            showNotification: false,
          }
        );

        // Preparar datos de actualización
        const updateData = { name: newName };
        
        // Si newName es un objeto con datos extendidos, incluirlos
        if (typeof newName === "object" && newName !== null) {
          updateData.name = newName.name;
          if (newName.email !== undefined) {
            updateData.email = newName.email && newName.email.trim() !== "" ? newName.email.trim() : null;
          }
          if (newName.phone !== undefined) {
            updateData.phone = newName.phone && newName.phone.trim() !== "" ? newName.phone.trim() : null;
          }
          if (newName.weeklyRestriction !== undefined) {
            updateData.weeklyRestriction = Boolean(newName.weeklyRestriction);
          }
          if (newName.weekDayRestrictions) {
            updateData.weekDayRestrictions = newName.weekDayRestrictions;
          }
        }

        const response = await fetch(`${config.apiEndpoint}/${itemData._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        const result = await response.json();
        Logger.debug("PUT response", {
          module: "APIManager",
          data: { response: result },
          showNotification: false,
        });

        if (result.success) {
          Logger.success(`Edited "${oldName}" to "${newName}" via API`, {
            module: "APIManager",
            data: { oldName: oldName, newName: newName },
            showNotification: false,
          });

          // Recargar datos
          await this.loadApiData();

          if (onSuccess) onSuccess();

          // 3. Update
          Logger.success(`${oldName} updated to ${newName} successfully`, {
            module: "APIManager",
            showNotification: true,
            notificationMessage: `${oldName} updated to ${newName} successfully!`,
          });
        } else {
          Logger.error("Error editing item via API", {
            module: "APIManager",
            error: new Error(result.message),
            showNotification: true,
            notificationMessage: `Error: ${result.message}`,
          });
          if (onError) onError(`Error: ${result.message}`);
        }
      } catch (error) {
        Logger.error("Error editing item", {
          module: "APIManager",
          error: error,
          showNotification: true,
          notificationMessage: "Error editing item. Please try again.",
        });
        if (onError) onError("Error editing item. Please try again.");
      }
    } else {
      // Editar en datos mock (método anterior)
      Logger.debug(`Using mock data edit for ${fieldId}`, {
        module: "APIManager",
        data: { fieldId: fieldId },
        showNotification: false,
      });
      const dataKey = config.data;
      if (dataKey && MOCK_DATA[dataKey]) {
        const index = MOCK_DATA[dataKey].indexOf(oldName);
        if (index > -1) {
          MOCK_DATA[dataKey][index] = newName;
          Logger.debug(`Edited ${oldName} to ${newName} in ${dataKey} (mock)`, {
            module: "APIManager",
            data: { oldName: oldName, newName: newName, dataKey: dataKey },
            showNotification: false,
          });
          if (onSuccess) onSuccess();
        }
      }
    }
  }

  /**
   * 🆕 NUEVO: Actualizar item con datos extendidos via API
   * @param {string} fieldId - ID del campo
   * @param {Object} updatedData - Datos actualizados {name, email, phone, etc.}
   * @param {Object} originalData - Datos originales
   * @param {Function} onSuccess - Callback de éxito
   * @param {Function} onError - Callback de error
   */
  async updateItem(fieldId, updatedData, originalData, onSuccess, onError) {
    Logger.debug(`updateItem called with fieldId="${fieldId}"`, {
      module: "APIManager",
      data: {
        fieldId: fieldId,
        updatedName: updatedData.name,
        originalName: originalData.name || originalData,
        hasEmail: !!updatedData.email,
        hasPhone: !!updatedData.phone,
      },
      showNotification: false,
    });

    const config =
      SHIP_NOMINATION_CONSTANTS.SINGLE_SELECT_CONFIG[fieldId] ||
      SHIP_NOMINATION_CONSTANTS.MULTI_SELECT_CONFIG[fieldId];

    if (config && config.apiEndpoint) {
      try {
        // Encontrar el item completo con ID usando el nombre original
        const originalName = originalData.name || originalData;
        const itemData = this.findItemByName(config.apiEndpoint, originalName);

        if (!itemData) {
          Logger.error(`Item not found in ${config.apiEndpoint}`, {
            module: "APIManager",
            data: { originalName: originalName, endpoint: config.apiEndpoint },
            showNotification: true,
            notificationMessage: `Item "${originalName}" not found`,
          });
          if (onError) onError(`Item "${originalName}" not found`);
          return;
        }

        Logger.info(
          `Updating "${originalName}" with extended data (ID: ${itemData._id}) via API`,
          {
            module: "APIManager",
            data: {
              originalName: originalName,
              newName: updatedData.name,
              itemId: itemData._id,
              hasEmail: !!updatedData.email,
              hasPhone: !!updatedData.phone,
            },
            showNotification: false,
          }
        );

        // Preparar datos para enviar (solo enviar campos que tienen valor)
        const requestBody = { name: updatedData.name };

        if (updatedData.email !== undefined) {
          requestBody.email =
            updatedData.email && updatedData.email.trim() !== ""
              ? updatedData.email.trim()
              : null;
        }

        if (updatedData.phone !== undefined) {
          requestBody.phone =
            updatedData.phone && updatedData.phone.trim() !== ""
              ? updatedData.phone.trim()
              : null;
        }

        if (updatedData.weeklyRestriction !== undefined) {
          requestBody.weeklyRestriction = Boolean(
            updatedData.weeklyRestriction
          );
        }

        if (updatedData.weekDayRestrictions) {
          requestBody.weekDayRestrictions = updatedData.weekDayRestrictions;
        }

        const response = await fetch(`${config.apiEndpoint}/${itemData._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        Logger.debug("PUT response with extended data", {
          module: "APIManager",
          data: { response: result },
          showNotification: false,
        });

        if (result.success) {
          Logger.success(
            `Updated "${originalName}" with extended data via API`,
            {
              module: "APIManager",
              data: {
                originalName: originalName,
                newName: updatedData.name,
                email: updatedData.email || "(no email)",
                phone: updatedData.phone || "(no phone)",
              },
              showNotification: false,
            }
          );

          // Recargar datos
          await this.loadApiData();

          if (onSuccess) onSuccess();

          // Notificación de éxito
          Logger.success(`${originalName} updated successfully`, {
            module: "APIManager",
            showNotification: true,
            notificationMessage: `${originalName} updated successfully!`,
          });
        } else {
          Logger.error("Error updating item with extended data via API", {
            module: "APIManager",
            error: new Error(result.message),
            showNotification: true,
            notificationMessage: `Error: ${result.message}`,
          });
          if (onError) onError(`Error: ${result.message}`);
        }
      } catch (error) {
        Logger.error("Error updating item with extended data", {
          module: "APIManager",
          error: error,
          showNotification: true,
          notificationMessage: "Error updating item. Please try again.",
        });
        if (onError) onError("Error updating item. Please try again.");
      }
    } else {
      // Fallback: usar método simple para retrocompatibilidad
      Logger.debug(`Falling back to simple edit for ${fieldId}`, {
        module: "APIManager",
        data: { fieldId: fieldId },
        showNotification: false,
      });

      const originalName = originalData.name || originalData;
      await this.editItem(
        fieldId,
        originalName,
        updatedData.name,
        onSuccess,
        onError
      );
    }
  }

  /**
   * Validar AmSpec Reference en tiempo real
   * @param {string} amspecRef - Referencia AmSpec
   * @returns {Promise<string|null>} Error message o null si es válido
   */
  async validateAmspecRef(amspecRef) {
    if (!amspecRef || amspecRef.trim().length < 3) return null;
    try {
      const response = await fetch(
        `${this.baseURL}/api/shipnominations/check-amspec/${encodeURIComponent(
          amspecRef.trim()
        )}`
      );
      const result = await response.json();
      return result.exists
        ? `AmSpec Reference "${amspecRef}" already exists`
        : null;
    } catch (error) {
      console.error("Error validating AmSpec Ref:", error);
      return null;
    }
  }

  /**
   * Validar Client Reference en tiempo real
   * @param {string} clientRef - Referencia del cliente
   * @returns {Promise<string|null>} Error message o null si es válido
   */
  async validateClientRef(clientRef) {
    if (!clientRef || clientRef.trim().length === 0) return null;
    try {
      const response = await fetch(
        `${
          this.baseURL
        }/api/shipnominations/check-clientref/${encodeURIComponent(
          clientRef.trim()
        )}`
      );
      const result = await response.json();
      return result.exists
        ? `Client Reference "${clientRef}" already exists`
        : null;
    } catch (error) {
      console.error("Error validating Client Ref:", error);
      return null;
    }
  }

  /**
   * Obtener datos por endpoint
   * @param {string} apiEndpoint - Endpoint de la API
   * @returns {Array} Array de nombres
   */
  getDataByEndpoint(apiEndpoint) {
    if (apiEndpoint === "/api/clients") {
      return this.apiData.clients || [];
    } else if (apiEndpoint === "/api/agents") {
      return this.apiData.agents || [];
    } else if (apiEndpoint === "/api/terminals") {
      return this.apiData.terminals || [];
    } else if (apiEndpoint === "/api/berths") {
      return this.apiData.berths || [];
    } else if (apiEndpoint === "/api/surveyors") {
      return this.apiData.surveyors || [];
    } else if (apiEndpoint === "/api/samplers") {
      return this.apiData.samplers || [];
    } else if (apiEndpoint === "/api/chemists") {
      return this.apiData.chemists || [];
    } else if (apiEndpoint === "/api/producttypes") {
      return this.apiData.productTypes || [];
    }
    return [];
  }

  /**
   * Obtener todos los datos de API
   * @returns {Object} Objeto con todos los datos
   */
  getAllApiData() {
    return this.apiData;
  }

  /**
   * Verificar si los datos están cargados
   * @returns {boolean} True si están cargados
   */
  isDataLoaded() {
    return Object.keys(this.apiData).length > 0;
  }

  /**
   * Limpiar cache de datos
   */
  clearCache() {
    this.apiData = {};
    this.clientsFullData = [];
    this.agentsFullData = [];
    this.terminalsFullData = [];
    this.berthsFullData = [];
    this.surveyorsFullData = [];
    this.samplersFullData = [];
    this.chemistsFullData = [];
    this.productTypesFullData = [];
    Logger.info("API cache cleared", {
      module: "APIManager",
      showNotification: false,
    });
  }
}

// Exportar para uso en otros módulos
export { APIManager };
