// backend/routes/samplers.js
const express = require('express');
const router = express.Router();
const Sampler = require('../models/Sampler');

// GET /api/samplers - Obtener todos los samplers
router.get('/', async (req, res) => {
    try {
        const samplers = await Sampler.find({}).sort({ name: 1 });
        res.json({ success: true, data: samplers });
    } catch (error) {
        console.error('Error fetching samplers:', error);
        res.status(500).json({ success: false, error: 'Error fetching samplers' });
    }
});

// POST /api/samplers - Crear nuevo sampler
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Sampler name is required' 
            });
        }

        const sampler = new Sampler({ name: name.trim() });
        const savedSampler = await sampler.save();
        
        res.status(201).json({ success: true, data: savedSampler });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ 
                success: false, 
                error: 'Sampler name already exists' 
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

// PUT /api/samplers/:id - Actualizar sampler
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Sampler name is required' 
            });
        }

        const updatedSampler = await Sampler.findByIdAndUpdate(
            id, 
            { name: name.trim() }, 
            { new: true, runValidators: true }
        );
        
        if (!updatedSampler) {
            return res.status(404).json({ 
                success: false, 
                error: 'Sampler not found' 
            });
        }
        
        res.json({ success: true, data: updatedSampler });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ 
                success: false, 
                error: 'Sampler name already exists' 
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

// DELETE /api/samplers/:id - Eliminar sampler (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedSampler = await Sampler.findByIdAndDelete(id);
        
        if (!deletedSampler) {
            return res.status(404).json({ 
                success: false, 
                error: 'Sampler not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Sampler "${deletedSampler.name}" deleted successfully`,
            data: deletedSampler 
        });
    } catch (error) {
        console.error('Error deleting sampler:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting sampler' 
        });
    }
});

// GET /api/samplers/debug - Debug endpoint
router.get('/debug', async (req, res) => {
    try {
        const samplers = await Sampler.find({});
        res.json({
            success: true,
            debug: {
                total: samplers.length,
                samplers: samplers,
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

module.exports = router;