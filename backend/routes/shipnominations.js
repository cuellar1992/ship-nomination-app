// backend/routes/shipnominations.js
const express = require('express');
const router = express.Router();
const ShipNomination = require('../models/ShipNomination');

// Importar modelos para validación de referencias
const Client = require('../models/Client');
const Agent = require('../models/Agent');
const Terminal = require('../models/Terminal');
const Berth = require('../models/Berth');
const Surveyor = require('../models/Surveyor');
const Sampler = require('../models/Sampler');
const Chemist = require('../models/Chemist');
const ProductType = require('../models/ProductType');

// GET /api/shipnominations - Obtener todas las ship nominations
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            terminal, 
            startDate, 
            endDate,
            sortBy = 'etb',
            sortOrder = 'asc'
        } = req.query;

        // Construir filtros
        const filters = {};
        
        if (status) {
            filters.status = status;
        }
        
        if (terminal) {
            filters['terminal.name'] = new RegExp(terminal, 'i');
        }
        
        if (startDate || endDate) {
            filters.etb = {};
            if (startDate) filters.etb.$gte = new Date(startDate);
            if (endDate) filters.etb.$lte = new Date(endDate);
        }

        // Configurar ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Ejecutar consulta con paginación
        const shipNominations = await ShipNomination
            .find(filters)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        // Contar total para paginación
        const total = await ShipNomination.countDocuments(filters);

        res.json({
            success: true,
            data: shipNominations,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching ship nominations:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error fetching ship nominations' 
        });
    }
});

// GET /api/shipnominations/stats/summary - Estadísticas generales
router.get('/stats/summary', async (req, res) => {
    try {
        const totalNominations = await ShipNomination.countDocuments();
        const statusCounts = await ShipNomination.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const thisMonthCount = await ShipNomination.countDocuments({
            createdAt: { $gte: thisMonth }
        });

        res.json({
            success: true,
            data: {
                totalNominations,
                statusBreakdown: statusCounts,
                thisMonthCount
            }
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error getting statistics' 
        });
    }
});

// GET /api/shipnominations/debug - Debug endpoint
router.get('/debug', async (req, res) => {
    try {
        const shipNominations = await ShipNomination.find({}).limit(5);
        const count = await ShipNomination.countDocuments();
        
        res.json({
            success: true,
            debug: {
                total: count,
                sample: shipNominations,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Debug endpoint error' 
        });
    }
});

// GET /api/shipnominations/:id - Obtener una ship nomination específica
router.get('/:id', async (req, res) => {
    try {
        const shipNomination = await ShipNomination.findById(req.params.id);
        
        if (!shipNomination) {
            return res.status(404).json({
                success: false,
                error: 'Ship nomination not found'
            });
        }

        res.json({ success: true, data: shipNomination });
    } catch (error) {
        console.error('Error fetching ship nomination:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error fetching ship nomination' 
        });
    }
});

// POST /api/shipnominations - Crear nueva ship nomination
router.post('/', async (req, res) => {
    try {
        console.log('📨 Received data:', req.body);

        const {
            shipName,   	// Del input HTML
            amspecRef,      // Del input HTML
            clientRef,      // Del input HTML (opcional)
            clientName,     // Del SingleSelect
            agent,          // Del SingleSelect
            terminal,       // Del SingleSelect
            berth,          // Del SingleSelect
            surveyor,       // Del SingleSelect
            sampler,        // Del SingleSelect
            chemist,        // Del SingleSelect
            productTypes,   // Del MultiSelect
            pilotOnBoard,   // Del DateTimePicker
            etb,            // Del DateTimePicker
            etc,            // Del DateTimePicker
            notes
        } = req.body;

        // ========================================
        // VALIDACIONES BÁSICAS
        // ========================================
        if (!shipName || !amspecRef) {
            return res.status(400).json({
                success: false,
                error: 'Vessel name and AmSpec Reference # are required'
            });
        }

        // ========================================
        // HELPER PARA VALIDAR REFERENCIAS
        // ========================================
        const findReference = async (Model, name, fieldName) => {
            if (!name) {
                throw new Error(`${fieldName} is required`);
            }
            const item = await Model.findOne({ name: name.trim() });
            if (!item) {
                throw new Error(`${fieldName} "${name}" not found`);
            }
            return { id: item._id, name: item.name };
        };

        // ========================================
        // VALIDAR Y OBTENER REFERENCIAS
        // ========================================
        console.log('🔍 Validating references...');
        
        const clientReference = await findReference(Client, clientName, 'Client');
        const agentRef = await findReference(Agent, agent, 'Agent');
        const terminalRef = await findReference(Terminal, terminal, 'Terminal');
        const berthRef = await findReference(Berth, berth, 'Berth');
        const surveyorRef = await findReference(Surveyor, surveyor, 'Surveyor');
        const samplerRef = await findReference(Sampler, sampler, 'Sampler');
        const chemistRef = await findReference(Chemist, chemist, 'Chemist');

        // ========================================
        // VALIDAR PRODUCT TYPES (ARRAY)
        // ========================================
        if (!productTypes || !Array.isArray(productTypes) || productTypes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one product type is required'
            });
        }

        const productTypeRefs = [];
        for (const productTypeName of productTypes) {
            const productType = await ProductType.findOne({ name: productTypeName.trim() });
            if (!productType) {
                return res.status(400).json({
                    success: false,
                    error: `Product type "${productTypeName}" not found`
                });
            }
            productTypeRefs.push({ id: productType._id, name: productType.name });
        }

        // ========================================
        // VALIDAR FECHAS
        // ========================================
        const pilotDate = new Date(pilotOnBoard);
        const etbDate = new Date(etb);
        const etcDate = new Date(etc);

        if (isNaN(pilotDate.getTime()) || isNaN(etbDate.getTime()) || isNaN(etcDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Please provide valid dates.'
            });
        }

        // ========================================
        // CREAR SHIP NOMINATION
        // ========================================
        console.log('💾 Creating ship nomination...');
        
        const shipNomination = new ShipNomination({
            // Campos HTML
            vesselName: shipName.trim(),
            amspecRef: amspecRef.trim(),
            clientRef: clientRef ? clientRef.trim() : undefined,
            
            // Referencias SingleSelect
            client: clientReference,
            agent: agentRef,
            terminal: terminalRef,
            berth: berthRef,
            surveyor: surveyorRef,
            sampler: samplerRef,
            chemist: chemistRef,
            
            // MultiSelect
            productTypes: productTypeRefs,
            
            // DateTimePickers
            pilotOnBoard: pilotDate,
            etb: etbDate,
            etc: etcDate,
            
            // Opcional
            notes: notes ? notes.trim() : undefined
        });

        const savedShipNomination = await shipNomination.save();
        console.log('✅ Ship nomination saved with ID:', savedShipNomination._id);

        res.status(201).json({ 
            success: true, 
            data: savedShipNomination,
            message: `Ship nomination for "${shipName}" created successfully`
        });

    } catch (error) {
        console.error('❌ Error creating ship nomination:', error);
        
        if (error.message.includes('not found') || error.message.includes('required')) {
            res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        } else if (error.name === 'ValidationError') {
            res.status(400).json({ 
                success: false, 
                error: `Validation failed: ${error.message}` 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Error creating ship nomination' 
            });
        }
    }
});

// PUT /api/shipnominations/:id - Actualizar ship nomination
router.put('/:id', async (req, res) => {
    try {
        console.log('📨 PUT - Received data for update:', req.body);
        console.log('📋 Updating nomination ID:', req.params.id);

        // Verificar que la nomination existe
        const existingNomination = await ShipNomination.findById(req.params.id);
        
        if (!existingNomination) {
            return res.status(404).json({
                success: false,
                error: 'Ship nomination not found'
            });
        }

        const {
            shipName,       // Del input HTML
            amspecRef,      // Del input HTML
            clientRef,      // Del input HTML (opcional)
            clientName,     // Del SingleSelect
            agent,          // Del SingleSelect
            terminal,       // Del SingleSelect
            berth,          // Del SingleSelect
            surveyor,       // Del SingleSelect
            sampler,        // Del SingleSelect
            chemist,        // Del SingleSelect
            productTypes,   // Del MultiSelect
            pilotOnBoard,   // Del DateTimePicker
            etb,            // Del DateTimePicker
            etc,            // Del DateTimePicker
            notes
        } = req.body;

        // ========================================
        // VALIDACIONES BÁSICAS
        // ========================================
        if (!shipName || !amspecRef) {
            return res.status(400).json({
                success: false,
                error: 'Vessel name and AmSpec Reference # are required'
            });
        }

        // ========================================
        // HELPER PARA VALIDAR REFERENCIAS (REUTILIZADO DEL POST)
        // ========================================
        const findReference = async (Model, name, fieldName) => {
            if (!name) {
                throw new Error(`${fieldName} is required`);
            }
            const item = await Model.findOne({ name: name.trim() });
            if (!item) {
                throw new Error(`${fieldName} "${name}" not found`);
            }
            return { id: item._id, name: item.name };
        };

        // ========================================
        // VALIDAR Y OBTENER REFERENCIAS
        // ========================================
        console.log('🔍 Validating references for update...');
        
        const clientReference = await findReference(Client, clientName, 'Client');
        const agentRef = await findReference(Agent, agent, 'Agent');
        const terminalRef = await findReference(Terminal, terminal, 'Terminal');
        const berthRef = await findReference(Berth, berth, 'Berth');
        const surveyorRef = await findReference(Surveyor, surveyor, 'Surveyor');
        const samplerRef = await findReference(Sampler, sampler, 'Sampler');
        const chemistRef = await findReference(Chemist, chemist, 'Chemist');

        // ========================================
        // VALIDAR PRODUCT TYPES (ARRAY)
        // ========================================
        if (!productTypes || !Array.isArray(productTypes) || productTypes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one product type is required'
            });
        }

        const productTypeRefs = [];
        for (const productTypeName of productTypes) {
            const productType = await ProductType.findOne({ name: productTypeName.trim() });
            if (!productType) {
                return res.status(400).json({
                    success: false,
                    error: `Product type "${productTypeName}" not found`
                });
            }
            productTypeRefs.push({ id: productType._id, name: productType.name });
        }

        // ========================================
        // VALIDAR FECHAS
        // ========================================
        const pilotDate = new Date(pilotOnBoard);
        const etbDate = new Date(etb);
        const etcDate = new Date(etc);

        if (isNaN(pilotDate.getTime()) || isNaN(etbDate.getTime()) || isNaN(etcDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Please provide valid dates.'
            });
        }

        // ========================================
        // PREPARAR DATOS PARA ACTUALIZACIÓN
        // ========================================
        const updateData = {
            // Campos HTML
            vesselName: shipName.trim(),
            amspecRef: amspecRef.trim(),
            clientRef: clientRef ? clientRef.trim() : undefined,
            
            // Referencias SingleSelect
            client: clientReference,
            agent: agentRef,
            terminal: terminalRef,
            berth: berthRef,
            surveyor: surveyorRef,
            sampler: samplerRef,
            chemist: chemistRef,
            
            // MultiSelect
            productTypes: productTypeRefs,
            
            // DateTimePickers
            pilotOnBoard: pilotDate,
            etb: etbDate,
            etc: etcDate,
            
            // Opcional
            notes: notes ? notes.trim() : undefined,
            
            // Actualizar timestamp
            updatedAt: new Date()
        };

        console.log('💾 Updating ship nomination with processed data...');
        console.log('📋 Update data:', updateData);

        // ========================================
        // ACTUALIZAR SHIP NOMINATION
        // ========================================
        const updatedNomination = await ShipNomination.findByIdAndUpdate(
            req.params.id,
            updateData,
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        );

        console.log('✅ Ship nomination updated successfully:', updatedNomination._id);

        res.json({ 
            success: true, 
            data: updatedNomination,
            message: `Ship nomination "${shipName}" updated successfully`
        });

    } catch (error) {
        console.error('❌ Error updating ship nomination:', error);
        
        if (error.message.includes('not found') || error.message.includes('required')) {
            res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        } else if (error.name === 'ValidationError') {
            res.status(400).json({ 
                success: false, 
                error: `Validation failed: ${error.message}` 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Error updating ship nomination' 
            });
        }
    }
});

// DELETE /api/shipnominations/:id - Eliminar ship nomination
router.delete('/:id', async (req, res) => {
    try {
        const deletedNomination = await ShipNomination.findByIdAndDelete(req.params.id);
        
        if (!deletedNomination) {
            return res.status(404).json({
                success: false,
                error: 'Ship nomination not found'
            });
        }

        res.json({ 
            success: true, 
            message: `Ship nomination "${deletedNomination.vesselName}" deleted successfully`,
            data: deletedNomination 
        });
    } catch (error) {
        console.error('Error deleting ship nomination:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting ship nomination' 
        });
    }
});

// ===============================
// ✅ RUTAS DE VALIDACIÓN EN TIEMPO REAL
// ===============================

// GET /api/shipnominations/check-amspec/:amspecRef
router.get('/check-amspec/:amspecRef', async (req, res) => {
    try {
        const exists = await ShipNomination.exists({ amspecRef: req.params.amspecRef.trim() });
        res.json({ exists: !!exists });
    } catch (error) {
        console.error('❌ Error checking amspecRef:', error);
        res.status(500).json({ exists: false, error: 'Internal server error' });
    }
});

// GET /api/shipnominations/check-clientref/:clientRef
router.get('/check-clientref/:clientRef', async (req, res) => {
    try {
        const exists = await ShipNomination.exists({ clientRef: req.params.clientRef.trim() });
        res.json({ exists: !!exists });
    } catch (error) {
        console.error('❌ Error checking clientRef:', error);
        res.status(500).json({ exists: false, error: 'Internal server error' });
    }
});


module.exports = router;