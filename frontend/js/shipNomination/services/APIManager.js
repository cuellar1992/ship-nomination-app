/**
 * API Manager Module - Gestión de APIs, datos y cache
 * Migrado desde ship-form-simple.js para mejor modularización
 */

import { SHIP_NOMINATION_CONSTANTS } from '../utils/Constants.js';

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
  }

  /**
   * Cargar datos desde todas las APIs
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
      const clientsResponse = await fetch("/api/clients");
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
      const agentsResponse = await fetch("/api/agents");
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
      const terminalsResponse = await fetch("/api/terminals");
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
      const berthsResponse = await fetch("/api/berths");
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
      const surveyorsResponse = await fetch("/api/surveyors");
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
      const samplersResponse = await fetch("/api/samplers");
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
      const chemistsResponse = await fetch("/api/chemists");
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
      const productTypesResponse = await fetch("/api/producttypes");
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
    const config =
      SINGLE_SELECT_CONFIG[fieldId] || MULTI_SELECT_CONFIG[fieldId];

    if (config && config.apiEndpoint) {
      try {
        Logger.info(`Adding "${item}" to ${fieldId} via API`, {
          module: "APIManager",
          data: { fieldId: fieldId, item: item },
          showNotification: false,
        });

        const response = await fetch(config.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: item }),
        });

        const result = await response.json();

        if (result.success) {
          Logger.success(`Added "${item}" to ${fieldId} via API`, {
            module: "APIManager",
            data: { fieldId: fieldId, item: item },
            showNotification: false,
          });

          // Recargar datos
          await this.loadApiData();

          if (onSuccess) onSuccess();

          // Add
          Logger.success(`${item} added successfully`, {
            module: "APIManager",
            showNotification: true,
            notificationMessage: `${item} added successfully!`,
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
      SINGLE_SELECT_CONFIG[fieldId] || MULTI_SELECT_CONFIG[fieldId];

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
      SINGLE_SELECT_CONFIG[fieldId] || MULTI_SELECT_CONFIG[fieldId];

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

        const response = await fetch(`${config.apiEndpoint}/${itemData._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
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
   * Validar AmSpec Reference en tiempo real
   * @param {string} amspecRef - Referencia AmSpec
   * @returns {Promise<string|null>} Error message o null si es válido
   */
  async validateAmspecRef(amspecRef) {
    if (!amspecRef || amspecRef.trim().length < 3) return null;
    try {
      const response = await fetch(
        `/api/shipnominations/check-amspec/${encodeURIComponent(
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
        `/api/shipnominations/check-clientref/${encodeURIComponent(
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
