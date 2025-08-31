/**
 * 🚢 Roster Status Manager - Gestión Inteligente de Estados
 * Servicio para manejar estados automáticos de rosters basándose en fechas
 * y validaciones lógicas del negocio
 */

const SamplingRoster = require('../../../../models/SamplingRoster');

class RosterStatusManager {
    constructor() {
        this.statusTransitions = {
            'draft': ['confirmed', 'cancelled'],
            'confirmed': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [], // Estado final
            'cancelled': []  // Estado final
        };
        
        this.statusColors = {
            'draft': '#fbbf24',        // Warning - Amarillo
            'confirmed': '#0ea5e9',    // Info - Azul
            'in_progress': '#1fb5d4',  // Accent - Azul claro
            'completed': '#22c55e',    // Success - Verde
            'cancelled': '#ef4444'     // Error - Rojo
        };
        
        this.statusIcons = {
            'draft': 'fa-edit',
            'confirmed': 'fa-check',
            'in_progress': 'fa-spinner fa-spin',
            'completed': 'fa-check-circle',
            'cancelled': 'fa-times-circle'
        };
        
        this.statusDisplayNames = {
            'draft': 'Draft',
            'confirmed': 'Confirmed',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
    }

    /**
     * ✅ Calcular estado automático de roster basado en fechas (FLUJO INTELIGENTE)
     */
    calculateAutomaticRosterStatus(roster) {
        try {
            const now = new Date();
            
            // ✅ PASO 1: Validar fechas básicas
            if (!roster.startDischarge || !roster.etcTime) {
                console.log(`⚠️ Roster ${roster.vesselName}: Fechas de descarga no definidas`);
                return 'draft';
            }
            
            const startDischarge = new Date(roster.startDischarge);
            const etcTime = new Date(roster.etcTime);
            
            // Validar que las fechas sean válidas
            if (isNaN(startDischarge.getTime()) || isNaN(etcTime.getTime())) {
                console.log(`⚠️ Roster ${roster.vesselName}: Fechas inválidas`);
                return 'draft';
            }
            
            // ✅ PASO 2: Validar secuencia lógica de fechas
            if (startDischarge >= etcTime) {
                console.warn(`⚠️ Roster ${roster.vesselName}: startDischarge >= etcTime - Fechas inválidas`);
                return 'draft';
            }
            
            // ✅ PASO 3: Aplicar flujo inteligente de estados
            if (now < startDischarge) {
                console.log(`✅ Roster ${roster.vesselName}: Estado automático = 'confirmed' (esperando inicio)`);
                return 'confirmed';        // ✅ Confirmado: fechas válidas, esperando inicio
            } else if (now >= startDischarge && now <= etcTime) {
                console.log(`✅ Roster ${roster.vesselName}: Estado automático = 'in_progress' (operación en curso)`);
                return 'in_progress';      // ✅ En progreso: operación realmente en curso
            } else if (now > etcTime) {
                console.log(`✅ Roster ${roster.vesselName}: Estado automático = 'completed' (operación terminada)`);
                return 'completed';        // ✅ Completado: operación terminada
            }
            
            return 'draft';
            
        } catch (error) {
            console.error(`❌ Error calculando estado automático de roster ${roster.vesselName}:`, error);
            return 'draft';
        }
    }

    /**
     * ✅ Obtener estado inteligente (automático o manual)
     */
    getIntelligentRosterStatus(roster) {
        // Si el roster tiene estado manual diferente a 'draft', respetarlo
        if (roster.status && roster.status !== 'draft') {
            console.log(`📋 Roster ${roster.vesselName}: Estado manual respetado = '${roster.status}'`);
            return roster.status;
        }
        
        // Si es 'draft' o no tiene estado, calcular automáticamente
        const automaticStatus = this.calculateAutomaticRosterStatus(roster);
        console.log(`📋 Roster ${roster.vesselName}: Estado automático calculado = '${automaticStatus}'`);
        return automaticStatus;
    }

    /**
     * ✅ Validar secuencia lógica de fechas del roster
     */
    validateRosterLogicalSequence(roster) {
        const errors = [];
        const warnings = [];
        
        try {
            // ✅ Validar que office sampling esté antes de line sampling
            if (roster.officeSampling && roster.lineSampling?.length > 0) {
                const officeStart = new Date(roster.officeSampling.startTime);
                const firstLineStart = new Date(roster.lineSampling[0].startTime);
                
                if (officeStart >= firstLineStart) {
                    errors.push('Office sampling must start before line sampling');
                }
            }
            
            // ✅ Validar secuencia de line sampling
            if (roster.lineSampling?.length > 1) {
                for (let i = 0; i < roster.lineSampling.length - 1; i++) {
                    const currentEnd = new Date(roster.lineSampling[i].finishTime);
                    const nextStart = new Date(roster.lineSampling[i + 1].startTime);
                    
                    // Los turnos deben ser continuos: uno debe terminar cuando empieza el siguiente
                    if (currentEnd > nextStart) {
                        errors.push(`Line sampling ${i + 1} must end before ${i + 2} starts`);
                    }
                }
            }
            
            // ✅ Validar que las fechas de sampling estén dentro del rango de descarga
            if (roster.startDischarge && roster.etcTime) {
                const dischargeStart = new Date(roster.startDischarge);
                const dischargeEnd = new Date(roster.etcTime);
                
                if (roster.officeSampling) {
                    const officeStart = new Date(roster.officeSampling.startTime);
                    const officeEnd = new Date(roster.officeSampling.finishTime);
                    
                    if (officeStart < dischargeStart || officeEnd > dischargeEnd) {
                        warnings.push('Office sampling extends beyond discharge time range');
                    }
                }
                
                if (roster.lineSampling?.length > 0) {
                    roster.lineSampling.forEach((line, index) => {
                        const lineStart = new Date(line.startTime);
                        const lineEnd = new Date(line.finishTime);
                        
                        if (lineStart < dischargeStart || lineEnd > dischargeEnd) {
                            warnings.push(`Line sampling ${index + 1} extends beyond discharge time range`);
                        }
                    });
                }
            }
            
        } catch (error) {
            console.warn(`⚠️ Error validando secuencia lógica del roster ${roster.vesselName}:`, error);
            errors.push('Error validating logical sequence');
        }
        
        return { errors, warnings };
    }

    /**
     * ✅ Validar si se puede transicionar a un nuevo estado
     */
    canTransitionToStatus(currentStatus, newStatus) {
        const allowedTransitions = this.statusTransitions[currentStatus] || [];
        const canTransition = allowedTransitions.includes(newStatus);
        
        console.log(`🔄 Transición de estado: ${currentStatus} → ${newStatus} = ${canTransition ? '✅ Permitida' : '❌ No permitida'}`);
        
        return canTransition;
    }

    /**
     * ✅ Obtener transiciones válidas para un estado actual
     */
    getValidStatusTransitions(currentStatus) {
        return this.statusTransitions[currentStatus] || [];
    }

    /**
     * ✅ Verificar gaps de tiempo entre turnos de sampling
     */
    checkForTimeGaps(lineSampling) {
        if (!lineSampling || lineSampling.length < 2) return false;
        
        for (let i = 0; i < lineSampling.length - 1; i++) {
            const currentEnd = new Date(lineSampling[i].finishTime);
            const nextStart = new Date(lineSampling[i + 1].startTime);
            const gapHours = (nextStart - currentEnd) / (1000 * 60 * 60);
            
            if (gapHours > 2) { // Gap mayor a 2 horas
                return true;
            }
        }
        return false;
    }

    /**
     * ✅ Generar recomendaciones específicas para un roster
     */
    generateRosterRecommendations(roster, automaticStatus, validation) {
        const recommendations = [];
        
        // ✅ Recomendaciones de estado
        if (roster.status === 'draft' && automaticStatus !== 'draft') {
            recommendations.push({
                type: 'status',
                priority: 'high',
                message: `Cambiar estado de 'draft' a '${automaticStatus}' automáticamente`,
                action: 'automatic_update'
            });
        }
        
        // ✅ Recomendaciones de validación
        if (validation.errors.length > 0) {
            recommendations.push({
                type: 'validation',
                priority: 'critical',
                message: `Corregir ${validation.errors.length} error(es) lógico(s) antes de confirmar`,
                action: 'fix_errors',
                errors: validation.errors
            });
        }
        
        if (validation.warnings.length > 0) {
            recommendations.push({
                type: 'validation',
                priority: 'medium',
                message: `Revisar ${validation.warnings.length} advertencia(s) para optimizar operación`,
                action: 'review_warnings',
                warnings: validation.warnings
            });
        }
        
        // ✅ Recomendaciones de secuencia
        if (roster.lineSampling?.length > 1) {
            const hasGaps = this.checkForTimeGaps(roster.lineSampling);
            if (hasGaps) {
                recommendations.push({
                    type: 'efficiency',
                    priority: 'low',
                    message: 'Considerar optimizar turnos para reducir gaps de tiempo',
                    action: 'optimize_schedule'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * ✅ Generar reporte completo de validación de rosters
     */
    async generateRosterValidationReport() {
        try {
            const rosters = await SamplingRoster.find({});
            
            if (!rosters || rosters.length === 0) {
                return {
                    summary: 'No hay rosters para validar',
                    details: []
                };
            }

            const report = {
                summary: {
                    totalRosters: rosters.length,
                    validRosters: 0,
                    rostersWithWarnings: 0,
                    rostersWithErrors: 0,
                    statusDistribution: {}
                },
                details: []
            };

            rosters.forEach((roster, index) => {
                const originalStatus = roster.status || 'draft';
                const automaticStatus = this.calculateAutomaticRosterStatus(roster);
                const intelligentStatus = this.getIntelligentRosterStatus(roster);
                const logicalValidation = this.validateRosterLogicalSequence(roster);
                
                // Contar estados
                report.summary.statusDistribution[intelligentStatus] = 
                    (report.summary.statusDistribution[intelligentStatus] || 0) + 1;
                
                // Contar validaciones
                if (logicalValidation.errors.length === 0 && logicalValidation.warnings.length === 0) {
                    report.summary.validRosters++;
                } else if (logicalValidation.errors.length === 0) {
                    report.summary.rostersWithWarnings++;
                } else {
                    report.summary.rostersWithErrors++;
                }
                
                // Detalles del roster
                report.details.push({
                    index: index + 1,
                    vesselName: roster.vesselName,
                    amspecRef: roster.amspecRef,
                    originalStatus,
                    automaticStatus,
                    intelligentStatus,
                    validation: logicalValidation,
                    recommendations: this.generateRosterRecommendations(roster, automaticStatus, logicalValidation)
                });
            });

            console.log('📊 === REPORTE DE VALIDACIÓN DE ROSTERS ===');
            console.log('📈 Resumen:', report.summary);
            console.log('📋 Detalles:', report.details.length, 'rosters analizados');
            console.log('🔍 === FIN DEL REPORTE ===');

            return report;
            
        } catch (error) {
            console.error('❌ Error generando reporte de validación:', error);
            throw error;
        }
    }

    /**
     * ✅ Actualizar estados automáticamente en la base de datos
     */
    async updateRosterStatusesAutomatically() {
        try {
            console.log('🔄 Iniciando actualización automática de estados de rosters...');
            
            const rosters = await SamplingRoster.find({});
            let updatedCount = 0;
            let errors = [];
            
            for (const roster of rosters) {
                try {
                    const originalStatus = roster.status || 'draft';
                    const automaticStatus = this.calculateAutomaticRosterStatus(roster);
                    
                    // Solo actualizar si el estado cambió y es diferente a 'draft'
                    if (automaticStatus !== originalStatus && automaticStatus !== 'draft') {
                        // Validar que la transición sea permitida
                        if (this.canTransitionToStatus(originalStatus, automaticStatus)) {
                            roster.status = automaticStatus;
                            roster.lastStatusUpdate = new Date();
                            roster.statusUpdateReason = 'automatic_date_based';
                            
                            await roster.save();
                            updatedCount++;
                            
                            console.log(`✅ Roster ${roster.vesselName}: ${originalStatus} → ${automaticStatus}`);
                        } else {
                            console.warn(`⚠️ Roster ${roster.vesselName}: Transición no permitida ${originalStatus} → ${automaticStatus}`);
                        }
                    }
                    
                } catch (rosterError) {
                    console.error(`❌ Error actualizando roster ${roster.vesselName}:`, rosterError);
                    errors.push({
                        rosterId: roster._id,
                        vesselName: roster.vesselName,
                        error: rosterError.message
                    });
                }
            }
            
            console.log(`✅ Actualización automática completada: ${updatedCount} rosters actualizados`);
            if (errors.length > 0) {
                console.warn(`⚠️ ${errors.length} errores durante la actualización`);
            }
            
            return {
                success: true,
                updatedCount,
                errors,
                timestamp: new Date()
            };
            
        } catch (error) {
            console.error('❌ Error en actualización automática de estados:', error);
            throw error;
        }
    }

    /**
     * ✅ Obtener estadísticas de estados de rosters
     */
    async getRosterStatusStatistics() {
        try {
            const rosters = await SamplingRoster.find({});
            
            if (!rosters || rosters.length === 0) {
                return {
                    totalRosters: 0,
                    statusDistribution: {},
                    automaticStatusDistribution: {},
                    intelligentStatusDistribution: {}
                };
            }

            const statusCounts = {};
            const automaticStatusCounts = {};
            const intelligentStatusCounts = {};
            
            // Inicializar contadores
            Object.keys(this.statusTransitions).forEach(status => {
                statusCounts[status] = 0;
                automaticStatusCounts[status] = 0;
                intelligentStatusCounts[status] = 0;
            });

            // Contar estados
            rosters.forEach(roster => {
                const rosterStatus = roster.status || 'draft';
                statusCounts[rosterStatus]++;
                
                const automaticStatus = this.calculateAutomaticRosterStatus(roster);
                automaticStatusCounts[automaticStatus]++;
                
                const intelligentStatus = this.getIntelligentRosterStatus(roster);
                intelligentStatusCounts[intelligentStatus]++;
            });

            return {
                totalRosters: rosters.length,
                statusDistribution: statusCounts,
                automaticStatusDistribution: automaticStatusCounts,
                intelligentStatusDistribution: intelligentStatusCounts,
                lastUpdated: new Date()
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas de estados:', error);
            throw error;
        }
    }

    /**
     * ✅ Obtener utilidades de estado
     */
    getStatusColor(status) {
        return this.statusColors[status] || '#9ca3af';
    }

    getStatusIcon(status) {
        return this.statusIcons[status] || 'fa-circle';
    }

    getStatusDisplayName(status) {
        return this.statusDisplayNames[status] || status;
    }
}

module.exports = RosterStatusManager;
