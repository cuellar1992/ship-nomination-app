/**
 * migrateRosterStatuses.js
 * Script de migración para actualizar el status de todos los rosters existentes
 * Ejecutar: node scripts/migrateRosterStatuses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Conectar a MongoDB
async function connectToDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ship-nomination';
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        process.exit(1);
    }
}

// Esquema para SamplingRoster (solo para la migración)
const samplingRosterSchema = new mongoose.Schema({
    vesselName: String,
    amspecRef: String,
    startDischarge: Date,
    etcTime: Date,
    lineSampling: [{
        startTime: Date,
        finishTime: Date
    }],
    status: String,
    totalSamplers: Number,
    totalTurns: Number,
    createdAt: Date,
    updatedAt: Date
}, { collection: 'sampling_rosters' }); // ✅ Colección correcta

const SamplingRoster = mongoose.model('SamplingRoster', samplingRosterSchema);

// Clase para actualizar status de rosters
class RosterStatusMigrator {
    constructor() {
        this.statuses = {
            CONFIRMED: 'confirmed',
            IN_PROGRESS: 'in_progress',
            COMPLETED: 'completed'
        };
    }

    /**
     * Calcular el nuevo status basado en fechas
     * @param {Object} roster - El roster a analizar
     * @returns {string} - Nuevo status calculado
     */
    calculateRosterStatus(roster) {
        const currentTime = new Date();
        let newStatus = this.statuses.CONFIRMED;

        // Si no hay lineSampling, mantener como confirmed
        if (!roster.lineSampling || roster.lineSampling.length === 0) {
            return this.statuses.CONFIRMED;
        }

        // Verificar si el roster ha comenzado
        const firstTurnStart = new Date(roster.lineSampling[0].startTime);
        
        if (currentTime >= firstTurnStart) {
            newStatus = this.statuses.IN_PROGRESS;
            
            // Verificar si el roster ha terminado
            const lastTurnEnd = new Date(roster.lineSampling[roster.lineSampling.length - 1].finishTime);
            
            if (currentTime >= lastTurnEnd) {
                newStatus = this.statuses.COMPLETED;
            }
        }

        return newStatus;
    }

    /**
     * Actualizar el status de un roster en la base de datos
     * @param {Object} roster - El roster a actualizar
     * @returns {Object} - Resultado de la actualización
     */
    async updateRosterStatus(roster) {
        try {
            const newStatus = this.calculateRosterStatus(roster);
            
            // Solo actualizar si el status cambió
            if (roster.status !== newStatus) {
                console.log(`🔄 ${roster.vesselName}: ${roster.status} → ${newStatus}`);
                
                // Actualizar en la base de datos
                await SamplingRoster.findByIdAndUpdate(roster._id, {
                    status: newStatus,
                    updatedAt: new Date()
                });
                
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
            console.error(`❌ Error actualizando ${roster.vesselName}:`, error.message);
            return {
                success: false,
                error: error.message,
                rosterId: roster._id,
                vesselName: roster.vesselName
            };
        }
    }

    /**
     * Migrar todos los rosters existentes
     */
    async migrateAllRosters() {
        try {
            console.log('🔄 Iniciando migración de status de rosters...');
            
            // Obtener todos los rosters
            const rosters = await SamplingRoster.find({});
            console.log(`📊 Total de rosters encontrados: ${rosters.length}`);
            
            if (rosters.length === 0) {
                console.log('ℹ️ No hay rosters para migrar');
                return { success: true, totalRosters: 0, updatedCount: 0, errorCount: 0, results: [] };
            }

            let updatedCount = 0;
            let errorCount = 0;
            const results = [];
            
            // Mostrar estado actual
            console.log('\n📋 Estado actual de los rosters:');
            const currentStats = {};
            rosters.forEach(roster => {
                currentStats[roster.status] = (currentStats[roster.status] || 0) + 1;
            });
            
            Object.entries(currentStats).forEach(([status, count]) => {
                console.log(`   • ${status}: ${count}`);
            });

            console.log('\n🔄 Procesando rosters...');
            
            // Actualizar cada roster
            for (const roster of rosters) {
                const result = await this.updateRosterStatus(roster);
                results.push(result);
                
                if (result.success && result.updated) {
                    updatedCount++;
                } else if (!result.success) {
                    errorCount++;
                }
            }
            
            // Mostrar resumen
            console.log('\n📊 Resumen de la migración:');
            console.log(`   • Total procesados: ${rosters.length}`);
            console.log(`   • Actualizados: ${updatedCount}`);
            console.log(`   • Sin cambios: ${rosters.length - updatedCount - errorCount}`);
            console.log(`   • Errores: ${errorCount}`);
            
            // Mostrar estado final
            const finalStats = {};
            results.forEach(result => {
                if (result.success) {
                    const status = result.updated ? result.newStatus : result.status;
                    finalStats[status] = (finalStats[status] || 0) + 1;
                }
            });
            
            console.log('\n📋 Estado final de los rosters:');
            Object.entries(finalStats).forEach(([status, count]) => {
                console.log(`   • ${status}: ${count}`);
            });
            
            // Mostrar detalles de cambios
            const changedRosters = results.filter(r => r.success && r.updated);
            if (changedRosters.length > 0) {
                console.log('\n🔄 Rosters actualizados:');
                changedRosters.forEach(result => {
                    console.log(`   • ${result.vesselName}: ${result.oldStatus} → ${result.newStatus}`);
                });
            }
            
            return {
                success: true,
                totalRosters: rosters.length,
                updatedCount: updatedCount,
                errorCount: errorCount,
                results: results
            };
            
        } catch (error) {
            console.error('❌ Error en la migración:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Función principal
async function main() {
    try {
        console.log('🚀 Iniciando migración de status de rosters...\n');
        
        // Conectar a la base de datos
        await connectToDatabase();
        
        // Crear migrador y ejecutar migración
        const migrator = new RosterStatusMigrator();
        const result = await migrator.migrateAllRosters();
        
        if (result.success) {
            console.log('\n✅ Migración completada exitosamente!');
        } else {
            console.log('\n❌ La migración falló:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
    } finally {
        // Cerrar conexión
        await mongoose.disconnect();
        console.log('\n🔌 Conexión a MongoDB cerrada');
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = RosterStatusMigrator;
