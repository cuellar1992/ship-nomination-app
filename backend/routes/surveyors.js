const express = require('express');
const router = express.Router();
const Surveyor = require('../models/Surveyor');

// GET / - Obtener todos los surveyors
router.get('/', async (req, res) => {
    try {
        const surveyors = await Surveyor.find().sort({ name: 1 });
        res.json({ success: true, data: surveyors });
    } catch (error) {
        console.error('Error fetching surveyors:', error);
        res.status(500).json({ success: false, message: 'Error fetching surveyors' });
    }
});

// POST / - Crear nuevo surveyor
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const surveyor = new Surveyor({ name: name.trim() });
        const savedSurveyor = await surveyor.save();
        
        res.status(201).json({ success: true, data: savedSurveyor });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Surveyor already exists' });
        } else {
            console.error('Error creating surveyor:', error);
            res.status(500).json({ success: false, message: 'Error creating surveyor' });
        }
    }
});

// PUT /:id - Actualizar surveyor existente
router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const updatedSurveyor = await Surveyor.findByIdAndUpdate(
            req.params.id,
            { name: name.trim() },
            { new: true, runValidators: true }
        );

        if (!updatedSurveyor) {
            return res.status(404).json({ success: false, message: 'Surveyor not found' });
        }

        res.json({ success: true, data: updatedSurveyor });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Surveyor name already exists' });
        } else {
            console.error('Error updating surveyor:', error);
            res.status(500).json({ success: false, message: 'Error updating surveyor' });
        }
    }
});

// DELETE /:id - Eliminar surveyor (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const deletedSurveyor = await Surveyor.findByIdAndDelete(req.params.id);
        
        if (!deletedSurveyor) {
            return res.status(404).json({ success: false, message: 'Surveyor not found' });
        }

        res.json({ 
            success: true, 
            message: 'Surveyor deleted successfully',
            data: deletedSurveyor 
        });
    } catch (error) {
        console.error('Error deleting surveyor:', error);
        res.status(500).json({ success: false, message: 'Error deleting surveyor' });
    }
});

// GET /debug - Debug endpoint para troubleshooting
router.get('/debug', async (req, res) => {
    try {
        const surveyors = await Surveyor.find();
        const count = await Surveyor.countDocuments();
        
        res.json({
            success: true,
            debug: {
                totalCount: count,
                surveyors: surveyors,
                collectionName: Surveyor.collection.name
            }
        });
    } catch (error) {
        console.error('Error in surveyors debug:', error);
        res.status(500).json({ success: false, message: 'Debug error', error: error.message });
    }
});

module.exports = router;