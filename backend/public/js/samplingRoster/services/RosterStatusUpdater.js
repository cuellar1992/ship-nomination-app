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

    /**
     * Actualizar el status de un roster específico
     * @param {Object} roster - El roster a actualizar
     * @returns {Object} - Resultado de la actualización
     */
    async updateRosterStatus(roster) {
        try {
            console.log(`🔄 Actualizando status del roster: ${roster.vesselName}`);
            
            const currentTime = new Date();
            let newStatus = this.statuses.CONFIRMED;
            
            // Verificar si el roster ha comenzado
            if (roster.lineSampling && roster.lineSampling.length > 0) {
                const firstTurnStart = new Date(roster.lineSampling[0].startTime);
                
                if (currentTime >= firstTurnStart) {
                    newStatus = this.statuses.IN_PROGRESS;
                    
                    // Verificar si el roster ha terminado
                    if (roster.lineSampling.length > 0) {
                        const lastTurnEnd = new Date(roster.lineSampling[roster.lineSampling.length - 1].finishTime);
                        
                        if (currentTime >= lastTurnEnd) {
                            newStatus = this.statuses.COMPLETED;
                        }
                    }
                }
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
            
            const response = await fetch(`/api/rosterStatus/${rosterId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ Status actualizado en BD: ${rosterId} → ${newStatus}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error actualizando en BD:', error);
            throw error;
        }
    }

    /**
     * Actualizar status de todos los rosters
     * @returns {Object} - Resumen de actualizaciones
     */
    async updateAllRosterStatuses() {
        try {
            console.log('🔄 Actualizando status de todos los rosters...');
            
            // Obtener todos los rosters
            const response = await fetch('/api/samplingrosters');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            const rosters = result.data || [];
            
            let updatedCount = 0;
            let errorCount = 0;
            const results = [];
            
            // Actualizar cada roster
            for (const roster of rosters) {
                const updateResult = await this.updateRosterStatus(roster);
                results.push(updateResult);
                
                if (updateResult.success && updateResult.updated) {
                    updatedCount++;
                } else if (!updateResult.success) {
                    errorCount++;
                }
            }
            
            console.log(`✅ Actualización completada: ${updatedCount} actualizados, ${errorCount} errores`);
            
            return {
                success: true,
                totalRosters: rosters.length,
                updatedCount: updatedCount,
                errorCount: errorCount,
                results: results
            };
            
        } catch (error) {
            console.error('❌ Error actualizando todos los rosters:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener estadísticas de status actuales
     * @returns {Object} - Estadísticas de status
     */
    async getStatusStatistics() {
        try {
            const response = await fetch('/api/samplingrosters');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            const rosters = result.data || [];
            
            const stats = {
                confirmed: 0,
                in_progress: 0,
                completed: 0,
                total: rosters.length
            };
            
            rosters.forEach(roster => {
                if (stats.hasOwnProperty(roster.status)) {
                    stats[roster.status]++;
                }
            });
            
            return {
                success: true,
                data: stats
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

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
