/**
 * API Client
 * Handles communication between frontend and backend
 */

class APIClient {
    constructor() {
        // Detectar automáticamente el entorno y configurar la URL base
        this.baseURL = this.getBaseURL();
    }

    // Método para detectar automáticamente la URL base según el entorno
    getBaseURL() {
        const { hostname, protocol, port } = window.location;
        
        // Si estamos en desarrollo local
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:3000/api`;
        }
        
        // Si estamos en producción
        return `/api`;
    }

    // Método genérico para hacer requests
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET requests
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST requests
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Métodos específicos para cada endpoint
    async getSystemInfo() {
        return this.get('/info');
    }

    async getHealthStatus() {
        return this.get('/health');
    }

    async getShips() {
        return this.get('/ships');
    }

    async getRoster() {
        return this.get('/roster');
    }

    async testConnection() {
        return this.get('/test');
    }
}

// Crear instancia global del cliente API
window.API = new APIClient();

// Test de conexión al cargar
document.addEventListener('DOMContentLoaded', async function() {
   try {
       const response = await window.API.testConnection();
       Logger.success('Backend conectado', {
           module: 'APIClient',
           data: { message: response.message },
           showNotification: false
       });
   } catch (error) {
       Logger.error('Error conectando con backend', {
           module: 'APIClient',
           error: error,
           showNotification: true,
           notificationMessage: 'Failed to connect to backend. Please check your connection.'
       });
   }
});