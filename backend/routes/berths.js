const express = require('express');
const router = express.Router();
const Berth = require('../models/Berth');

// GET / - Obtener todos los berths
router.get('/', async (req, res) => {
    try {
        const berths = await Berth.find().sort({ name: 1 });
        res.json({ success: true, data: berths });
    } catch (error) {
        console.error('Error fetching berths:', error);
        res.status(500).json({ success: false, message: 'Error fetching berths' });
    }
});

// POST / - Crear nuevo berth
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const berth = new Berth({ name: name.trim() });
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
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const updatedBerth = await Berth.findByIdAndUpdate(
            req.params.id,
            { name: name.trim() },
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