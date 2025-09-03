/**
 * RosterStatusUpdater.js
 * Servicio simple para actualizar el status de rosters basado en fechas
 * Se ejecuta automáticamente cuando se modifica un roster (webhook)
 */

class RosterStatusUpdater {
    constructor() {
        this.statuses = {
            CONFIRMED: 'confirmed',
            IN_PROGRESS: 'in_progress',
            COMPLETED: 'completed'
        };
    }

    // Resolver de baseURL para entorno Node (backend) o navegador
    getBaseURL() {
        try {
            if (typeof window !== 'undefined' && window.location) {
                const { protocol, hostname } = window.location;
                const port = window.location.port || '3000';
                return `${protocol}//${hostname}:${port}`;
            }
        } catch {}
        const protocol = process.env.PROTOCOL || 'http';
        const host = process.env.HOST || 'localhost';
        const port = process.env.PORT || 3000;
        return `${protocol}://${host}:${port}`;
    }

    /**
     * Actualizar el status de un roster específico
     * @param {Object} roster - El roster a actualizar
     * @returns {Object} - Resultado de la actualización
     */
    async updateRosterStatus(roster) {
        try {
            console.log(`🔄 Actualizando status del roster: ${roster.vesselName}`);
            
            // Usar la misma lógica que RosterStatusManager
            const currentTime = new Date();
            const startDischarge = new Date(roster.startDischarge);
            const etcTime = new Date(roster.etcTime);
            
            console.log(`🕐 RosterStatusUpdater - Debug fechas para ${roster.vesselName}:`);
            console.log(`   - Ahora: ${currentTime.toISOString()}`);
            console.log(`   - Start Discharge: ${startDischarge.toISOString()}`);
            console.log(`   - ETC: ${etcTime.toISOString()}`);
            
            let newStatus = this.statuses.DRAFT;
            
            // Aplicar la misma lógica que RosterStatusManager
            if (currentTime < startDischarge) {
                newStatus = this.statuses.CONFIRMED;        // Esperando inicio
            } else if (currentTime >= startDischarge && currentTime <= etcTime) {
                newStatus = this.statuses.IN_PROGRESS;      // Operación en curso
            } else if (currentTime > etcTime) {
                newStatus = this.statuses.COMPLETED;        // Operación terminada
            }
            
            // Solo actualizar si el status cambió
            if (roster.status !== newStatus) {
                console.log(`📊 Status cambiado: ${roster.status} → ${newStatus}`);
                
                // Actualizar en la base de datos
                const updateResult = await this.updateStatusInDatabase(roster._id, newStatus);
                
                return {
                    success: true,
                    rosterId: roster._id,
                    vesselName: roster.vesselName,
                    oldStatus: roster.status,
                    newStatus: newStatus,
                    updated: true
                };
            } else {
                return {
                    success: true,
                    rosterId: roster._id,
                    vesselName: roster.vesselName,
                    status: roster.status,
                    updated: false,
                    message: 'Status ya está actualizado'
                };
            }
            
        } catch (error) {
            console.error('❌ Error actualizando status del roster:', error);
            return {
                success: false,
                error: error.message,
                rosterId: roster._id
            };
        }
    }

    /**
     * Actualizar status en la base de datos
     * @param {string} rosterId - ID del roster
     * @param {string} newStatus - Nuevo status
     * @returns {Object} - Resultado de la actualización
     */
    async updateStatusInDatabase(rosterId, newStatus) {
        try {
            // Prefer direct DB update when running in backend (avoids HTTP and route mismatches)
            if (typeof module !== 'undefined' && module.exports) {
                try {
                    const SamplingRoster = require('../../../../models/SamplingRoster');
                    const RosterStatusManager = require('./RosterStatusManager');
                    const manager = new RosterStatusManager();
                    const roster = await SamplingRoster.findById(rosterId);
                    if (!roster) throw new Error('Roster not found');

                    const currentStatus = roster.status || 'draft';
                    if (!manager.canTransitionToStatus(currentStatus, newStatus)) {
                        throw new Error(`Transition not allowed: ${currentStatus} → ${newStatus}`);
                    }

                    roster.status = newStatus;
                    roster.lastStatusUpdate = new Date();
                    roster.statusUpdateReason = 'auto_webhook';
                    await roster.save();

                    console.log(`✅ Status actualizado directamente en BD: ${rosterId} → ${newStatus}`);
                    return { success: true, data: { rosterId, newStatus } };
                } catch (directErr) {
                    console.warn('⚠️ Direct DB update failed, falling back to HTTP:', directErr.message);
                    // continue to HTTP fallback below
                }
            }
            // Usar la API existente para actualizar el status
            // En Node.js, usar require para importar fetch si está disponible
            let fetch;
            if (typeof globalThis !== 'undefined' && globalThis.fetch) {
                fetch = globalThis.fetch;
            } else if (typeof require !== 'undefined') {
                try {
                    fetch = require('node-fetch');
                } catch (e) {
                    // Si node-fetch no está disponible, usar http nativo
                    return await this.updateStatusWithHttp(rosterId, newStatus);
                }
            } else {
                throw new Error('fetch no está disponible en este entorno');
            }
            
            const baseURL = this.getBaseURL();
            // Use transition endpoint defined in routes (POST /api/roster-status/transition/:rosterId)
            const response = await fetch(`${baseURL}/api/roster-status/transition/${rosterId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newStatus, reason: 'auto_webhook' })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            let resultText = await response.text();
            let result;
            try { result = JSON.parse(resultText); } catch { result = { raw: resultText }; }
            console.log(`✅ Status actualizado via HTTP: ${rosterId} → ${newStatus}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error actualizando en BD:', error);
            throw error;
        }
    }

    /**
     * (Removido) Actualizar status de todos los rosters
     */
    // async updateAllRosterStatuses() { /* Use RosterStatusManager.updateRosterStatusesAutomatically() */ }

    // async getStatusStatistics() { /* Use RosterStatusManager.getRosterStatusStatistics() */ }

    /**
     * Actualizar status usando http nativo de Node.js
     * @param {string} rosterId - ID del roster
     * @param {string} newStatus - Nuevo status
     * @returns {Object} - Resultado de la actualización
     */
    async updateStatusWithHttp(rosterId, newStatus) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const data = JSON.stringify({ status: newStatus });
            
            const options = {
                hostname: 'localhost',
                port: process.env.PORT || 3000,
                path: `/api/rosterStatus/${rosterId}`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            
            const req = http.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(result);
                        } else {
                            reject(new Error(`HTTP error! status: ${res.statusCode}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.write(data);
            req.end();
        });
    }
}

// Exportar para uso global solo en el navegador
if (typeof window !== 'undefined') {
    window.RosterStatusUpdater = RosterStatusUpdater;
}

// Exportar como módulo ES6 si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RosterStatusUpdater;
}
