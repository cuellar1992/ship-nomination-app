/**
 * 🚢 Roster Status Routes - API para gestión automática de estados
 * Rutas para manejar estados automáticos de rosters basándose en fechas
 */

const express = require('express');
const router = express.Router();
const RosterStatusManager = require('../public/js/samplingRoster/services/RosterStatusManager');

// Instanciar el gestor de estados
const statusManager = new RosterStatusManager();

/**
 * GET /api/roster-status/statistics
 * Obtener estadísticas de estados de rosters
 */
router.get('/statistics', async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas de estados de rosters...');
        
        const statistics = await statusManager.getRosterStatusStatistics();
        
        res.json({
            success: true,
            message: 'Estadísticas de estados obtenidas correctamente',
            data: statistics
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de estados:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas de estados',
            error: error.message
        });
    }
});

/**
 * GET /api/roster-status/validation-report
 * Generar reporte completo de validación de rosters
 */
router.get('/validation-report', async (req, res) => {
    try {
        console.log('📋 Generando reporte de validación de rosters...');
        
        const report = await statusManager.generateRosterValidationReport();
        
        res.json({
            success: true,
            message: 'Reporte de validación generado correctamente',
            data: report
        });
        
    } catch (error) {
        console.error('❌ Error generando reporte de validación:', error);
        res.status(500).json({
            success: false,
            message: 'Error generando reporte de validación',
            error: error.message
        });
    }
});

/**
 * POST /api/roster-status/update-automatically
 * Actualizar estados de rosters automáticamente basándose en fechas
 */
router.post('/update-automatically', async (req, res) => {
    try {
        console.log('🔄 Iniciando actualización automática de estados...');
        
        const result = await statusManager.updateRosterStatusesAutomatically();
        
        res.json({
            success: true,
            message: 'Estados actualizados automáticamente',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error en actualización automática:', error);
        res.status(500).json({
            success: false,
            message: 'Error en actualización automática de estados',
            error: error.message
        });
    }
});

/**
 * POST /api/roster-status/validate-roster/:rosterId
 * Validar un roster específico
 */
router.post('/validate-roster/:rosterId', async (req, res) => {
    try {
        const { rosterId } = req.params;
        console.log(`🔍 Validando roster ${rosterId}...`);
        
        // Buscar el roster en la base de datos
        const SamplingRoster = require('../models/SamplingRoster');
        const roster = await SamplingRoster.findById(rosterId);
        
        if (!roster) {
            return res.status(404).json({
                success: false,
                message: 'Roster no encontrado'
            });
        }
        
        // Validar el roster
        const validation = statusManager.validateRosterLogicalSequence(roster);
        const automaticStatus = statusManager.calculateAutomaticRosterStatus(roster);
        const intelligentStatus = statusManager.getIntelligentRosterStatus(roster);
        const recommendations = statusManager.generateRosterRecommendations(roster, automaticStatus, validation);
        
        const result = {
            rosterId: roster._id,
            vesselName: roster.vesselName,
            amspecRef: roster.amspecRef,
            currentStatus: roster.status || 'draft',
            automaticStatus,
            intelligentStatus,
            validation,
            recommendations,
            validTransitions: statusManager.getValidStatusTransitions(intelligentStatus)
        };
        
        res.json({
            success: true,
            message: 'Roster validado correctamente',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error validando roster:', error);
        res.status(500).json({
            success: false,
            message: 'Error validando roster',
            error: error.message
        });
    }
});

/**
 * POST /api/roster-status/transition/:rosterId
 * Transicionar un roster a un nuevo estado (con validación)
 */
router.post('/transition/:rosterId', async (req, res) => {
    try {
        const { rosterId } = req.params;
        const { newStatus, reason } = req.body;
        
        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: 'Nuevo estado es requerido'
            });
        }
        
        console.log(`🔄 Transicionando roster ${rosterId} a estado '${newStatus}'...`);
        
        // Buscar el roster
        const SamplingRoster = require('../models/SamplingRoster');
        const roster = await SamplingRoster.findById(rosterId);
        
        if (!roster) {
            return res.status(404).json({
                success: false,
                message: 'Roster no encontrado'
            });
        }
        
        const currentStatus = roster.status || 'draft';
        
        // Validar transición
        if (!statusManager.canTransitionToStatus(currentStatus, newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Transición no permitida: ${currentStatus} → ${newStatus}`,
                data: {
                    currentStatus,
                    newStatus,
                    validTransitions: statusManager.getValidStatusTransitions(currentStatus)
                }
            });
        }
        
        // Actualizar estado
        roster.status = newStatus;
        roster.lastStatusUpdate = new Date();
        roster.statusUpdateReason = reason || 'manual_transition';
        
        await roster.save();
        
        console.log(`✅ Roster ${roster.vesselName}: ${currentStatus} → ${newStatus}`);
        
        res.json({
            success: true,
            message: 'Estado transicionado correctamente',
            data: {
                rosterId: roster._id,
                vesselName: roster.vesselName,
                previousStatus: currentStatus,
                newStatus,
                transitionTime: roster.lastStatusUpdate,
                reason: roster.statusUpdateReason
            }
        });
        
    } catch (error) {
        console.error('❌ Error transicionando estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error transicionando estado',
            error: error.message
        });
    }
});

/**
 * GET /api/roster-status/status-info
 * Obtener información sobre los estados disponibles
 */
router.get('/status-info', (req, res) => {
    try {
        const statusInfo = {
            availableStatuses: Object.keys(statusManager.statusTransitions),
            statusTransitions: statusManager.statusTransitions,
            statusColors: statusManager.statusColors,
            statusIcons: statusManager.statusIcons,
            statusDisplayNames: statusManager.statusDisplayNames
        };
        
        res.json({
            success: true,
            message: 'Información de estados obtenida correctamente',
            data: statusInfo
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo información de estados:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo información de estados',
            error: error.message
        });
    }
});

/**
 * POST /api/roster-status/webhook-update
 * Webhook automático para actualizar status cuando se modifica un roster
 * Se llama automáticamente desde el frontend cuando se guarda un roster
 */
router.post('/webhook-update', async (req, res) => {
    try {
        const { rosterId, rosterData } = req.body;
        
        if (!rosterId || !rosterData) {
            return res.status(400).json({
                success: false,
                message: 'rosterId y rosterData son requeridos'
            });
        }
        
        console.log(`🔄 Webhook: Actualizando status del roster ${rosterId}...`);
        
        // Usar el nuevo servicio simple para actualizar el status
        const RosterStatusUpdater = require('../public/js/samplingRoster/services/RosterStatusUpdater');
        const statusUpdater = new RosterStatusUpdater();
        
        const updateResult = await statusUpdater.updateRosterStatus(rosterData);
        
        if (updateResult.success) {
            res.json({
                success: true,
                message: 'Status actualizado via webhook',
                data: updateResult
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Error actualizando status via webhook',
                data: updateResult
            });
        }
        
    } catch (error) {
        console.error('❌ Error en webhook de actualización:', error);
        res.status(500).json({
            success: false,
            message: 'Error en webhook de actualización',
            error: error.message
        });
    }
});

module.exports = router;
