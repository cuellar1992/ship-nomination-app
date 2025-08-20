const express = require('express');
const router = express.Router();
const Berth = require('../models/Berth');

// GET / - Obtener todos los berths
router.get('/', async (req, res) => {
    try {
        const { populate } = req.query;
        let query = Berth.find().sort({ name: 1 });
        
        // Si se solicita población de terminales, incluirla
        if (populate === 'terminals') {
            query = query.populate('terminals', 'name');
        }
        
        const berths = await query;
        res.json({ success: true, data: berths });
    } catch (error) {
        console.error('Error fetching berths:', error);
        res.status(500).json({ success: false, message: 'Error fetching berths' });
    }
});

// POST / - Crear nuevo berth
router.post('/', async (req, res) => {
    try {
        const { name, terminals } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        if (!terminals || !Array.isArray(terminals) || terminals.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one terminal is required' });
        }

        const berth = new Berth({ 
            name: name.trim(),
            terminals: terminals
        });
        const savedBerth = await berth.save();
        
        res.status(201).json({ success: true, data: savedBerth });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Berth already exists' });
        } else {
            console.error('Error creating berth:', error);
            res.status(500).json({ success: false, message: 'Error creating berth' });
        }
    }
});

// PUT /:id - Actualizar berth existente
router.put('/:id', async (req, res) => {
    try {
        const { name, terminals } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        if (!terminals || !Array.isArray(terminals) || terminals.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one terminal is required' });
        }

        const updatedBerth = await Berth.findByIdAndUpdate(
            req.params.id,
            { 
                name: name.trim(),
                terminals: terminals
            },
            { new: true, runValidators: true }
        );

        if (!updatedBerth) {
            return res.status(404).json({ success: false, message: 'Berth not found' });
        }

        res.json({ success: true, data: updatedBerth });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Berth name already exists' });
        } else {
            console.error('Error updating berth:', error);
            res.status(500).json({ success: false, message: 'Error updating berth' });
        }
    }
});

// DELETE /:id - Eliminar berth (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const deletedBerth = await Berth.findByIdAndDelete(req.params.id);
        
        if (!deletedBerth) {
            return res.status(404).json({ success: false, message: 'Berth not found' });
        }

        res.json({ 
            success: true, 
            message: 'Berth deleted successfully',
            data: deletedBerth 
        });
    } catch (error) {
        console.error('Error deleting berth:', error);
        res.status(500).json({ success: false, message: 'Error deleting berth' });
    }
});

// GET /debug - Debug endpoint para troubleshooting
router.get('/debug', async (req, res) => {
    try {
        const berths = await Berth.find();
        const count = await Berth.countDocuments();
        
        res.json({
            success: true,
            debug: {
                totalCount: count,
                berths: berths,
                collectionName: Berth.collection.name
            }
        });
    } catch (error) {
        console.error('Error in berths debug:', error);
        res.status(500).json({ success: false, message: 'Debug error', error: error.message });
    }
});

module.exports = router;