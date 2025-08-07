// backend/routes/samplers.js - EXTENDIDO PARA EMAILS/PHONE
const express = require('express');
const router = express.Router();
const Sampler = require('../models/Sampler');

// GET /api/samplers - Obtener todos los samplers CON INFORMACIÓN COMPLETA
router.get('/', async (req, res) => {
    try {
        const samplers = await Sampler.find({}).sort({ name: 1 });
        
        // Formatear datos para frontend con información completa
        const formattedSamplers = samplers.map(sampler => ({
            _id: sampler._id,
            name: sampler.name,
            email: sampler.email || null,
            phone: sampler.phone || null,
            hasEmail: !!(sampler.email && sampler.email.trim()),
            createdAt: sampler.createdAt,
            updatedAt: sampler.updatedAt
        }));
        
        res.json({ success: true, data: formattedSamplers });
    } catch (error) {
        console.error('Error fetching samplers:', error);
        res.status(500).json({ success: false, error: 'Error fetching samplers' });
    }
});

// POST /api/samplers - Crear nuevo sampler CON EMAIL/PHONE OPCIONALES
router.post('/', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        // Validación de campos requeridos
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Sampler name is required' 
            });
        }

        // Preparar datos del sampler
        const samplerData = { 
            name: name.trim() 
        };

        // Agregar email si se proporciona
        if (email && email.trim() !== '') {
            samplerData.email = email.trim().toLowerCase();
        }

        // Agregar phone si se proporciona
        if (phone && phone.trim() !== '') {
            samplerData.phone = phone.trim();
        }

        const sampler = new Sampler(samplerData);
        const savedSampler = await sampler.save();
        
        res.status(201).json({ 
            success: true, 
            data: savedSampler.getDisplayInfo(),
            message: `Sampler "${savedSampler.name}" created successfully`
        });
    } catch (error) {
        if (error.code === 11000) {
            // Determinar qué campo causó el error de duplicado
            if (error.keyPattern?.name) {
                res.status(400).json({ 
                    success: false, 
                    error: 'Sampler name already exists' 
                });
            } else if (error.keyPattern?.email) {
                res.status(400).json({ 
                    success: false, 
                    error: 'Email address already exists' 
                });
            } else {
                res.status(400).json({ 
                    success: false, 
                    error: 'Duplicate entry detected' 
                });
            }
        } else if (error.name === 'ValidationError') {
            // Errores de validación del modelo
            const validationErrors = Object.values(error.errors).map(err => err.message);
            res.status(400).json({ 
                success: false, 
                error: 'Validation failed',
                details: validationErrors
            });
        } else {
            console.error('Error creating sampler:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Error creating sampler' 
            });
        }
    }
});

// PUT /api/samplers/:id - Actualizar sampler CON EMAIL/PHONE
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone } = req.body;
        
        // Validación de campos requeridos
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Sampler name is required' 
            });
        }

        // Preparar datos de actualización
        const updateData = { 
            name: name.trim() 
        };

        // Manejar email (puede ser vacío para remover)
        if (email !== undefined) {
            updateData.email = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
        }

        // Manejar phone (puede ser vacío para remover)
        if (phone !== undefined) {
            updateData.phone = phone && phone.trim() !== '' ? phone.trim() : null;
        }

        const updatedSampler = await Sampler.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );
        
        if (!updatedSampler) {
            return res.status(404).json({ 
                success: false, 
                error: 'Sampler not found' 
            });
        }
        
        res.json({ 
            success: true, 
            data: updatedSampler.getDisplayInfo(),
            message: `Sampler "${updatedSampler.name}" updated successfully`
        });
    } catch (error) {
        if (error.code === 11000) {
            // Determinar qué campo causó el error de duplicado
            if (error.keyPattern?.name) {
                res.status(400).json({ 
                    success: false, 
                    error: 'Sampler name already exists' 
                });
            } else if (error.keyPattern?.email) {
                res.status(400).json({ 
                    success: false, 
                    error: 'Email address already exists' 
                });
            } else {
                res.status(400).json({ 
                    success: false, 
                    error: 'Duplicate entry detected' 
                });
            }
        } else if (error.name === 'ValidationError') {
            // Errores de validación del modelo
            const validationErrors = Object.values(error.errors).map(err => err.message);
            res.status(400).json({ 
                success: false, 
                error: 'Validation failed',
                details: validationErrors
            });
        } else {
            console.error('Error updating sampler:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Error updating sampler' 
            });
        }
    }
});

// DELETE /api/samplers/:id - Eliminar sampler CON CLEANUP
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar el sampler antes de eliminarlo para obtener información
        const samplerToDelete = await Sampler.findById(id);
        
        if (!samplerToDelete) {
            return res.status(404).json({ 
                success: false, 
                error: 'Sampler not found' 
            });
        }

        // TODO: En futuras fases, agregar cleanup de:
        // - Sampling rosters que referencien este sampler
        // - Email notifications pendientes
        // - Cualquier otra referencia
        
        // Por ahora, solo eliminación directa (como antes)
        const deletedSampler = await Sampler.findByIdAndDelete(id);
        
        res.json({ 
            success: true, 
            message: `Sampler "${deletedSampler.name}" deleted successfully`,
            data: {
                _id: deletedSampler._id,
                name: deletedSampler.name,
                email: deletedSampler.email || null,
                phone: deletedSampler.phone || null
            }
        });
    } catch (error) {
        console.error('Error deleting sampler:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting sampler' 
        });
    }
});

// GET /api/samplers/with-email - Obtener solo samplers con email configurado
router.get('/with-email', async (req, res) => {
    try {
        const samplers = await Sampler.findWithEmail().sort({ name: 1 });
        
        const formattedSamplers = samplers.map(sampler => sampler.getDisplayInfo());
        
        res.json({ 
            success: true, 
            data: formattedSamplers,
            count: formattedSamplers.length 
        });
    } catch (error) {
        console.error('Error fetching samplers with email:', error);
        res.status(500).json({ success: false, error: 'Error fetching samplers with email' });
    }
});

// GET /api/samplers/without-email - Obtener samplers sin email configurado
router.get('/without-email', async (req, res) => {
    try {
        const samplers = await Sampler.findWithoutEmail().sort({ name: 1 });
        
        const formattedSamplers = samplers.map(sampler => sampler.getDisplayInfo());
        
        res.json({ 
            success: true, 
            data: formattedSamplers,
            count: formattedSamplers.length 
        });
    } catch (error) {
        console.error('Error fetching samplers without email:', error);
        res.status(500).json({ success: false, error: 'Error fetching samplers without email' });
    }
});

// GET /api/samplers/stats - Estadísticas de samplers
router.get('/stats', async (req, res) => {
    try {
        const totalSamplers = await Sampler.countDocuments();
        const samplersWithEmail = await Sampler.countDocuments({
            email: { $exists: true, $ne: "", $ne: null }
        });
        const samplersWithPhone = await Sampler.countDocuments({
            phone: { $exists: true, $ne: "", $ne: null }
        });
        
        res.json({
            success: true,
            stats: {
                total: totalSamplers,
                withEmail: samplersWithEmail,
                withoutEmail: totalSamplers - samplersWithEmail,
                withPhone: samplersWithPhone,
                emailCoverage: totalSamplers > 0 ? Math.round((samplersWithEmail / totalSamplers) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Error fetching sampler stats:', error);
        res.status(500).json({ success: false, error: 'Error fetching sampler stats' });
    }
});

// GET /api/samplers/debug - Debug endpoint EXTENDIDO
router.get('/debug', async (req, res) => {
    try {
        const samplers = await Sampler.find({});
        
        res.json({
            success: true,
            debug: {
                total: samplers.length,
                samplers: samplers.map(s => s.getDisplayInfo()),
                timestamp: new Date().toISOString(),
                stats: {
                    withEmail: samplers.filter(s => s.email && s.email.trim()).length,
                    withPhone: samplers.filter(s => s.phone && s.phone.trim()).length
                }
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

module.exports = router;

/*
CAMBIOS REALIZADOS:
✅ POST: Acepta name, email, phone opcionales
✅ PUT: Actualiza name, email, phone (permite remover email/phone con null)
✅ GET: Devuelve información completa incluyendo hasEmail flag
✅ DELETE: Mantiene funcionalidad actual + info extendida en respuesta
✅ Nuevos endpoints: /with-email, /without-email, /stats
✅ Validación mejorada con errores específicos
✅ Compatibilidad 100% con código existente
✅ Uso de métodos del modelo (getDisplayInfo, findWithEmail, etc.)

PRÓXIMAS FASES:
- DELETE endpoint con cleanup de referencias
- Email notification integration
- Batch operations
*/