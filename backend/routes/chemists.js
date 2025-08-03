// backend/routes/chemists.js
const express = require('express');
const router = express.Router();
const Chemist = require('../models/Chemist');

// GET /api/chemists - Obtener todos los chemists
router.get('/', async (req, res) => {
    try {
        const chemists = await Chemist.find({}).sort({ name: 1 });
        res.json({ success: true, data: chemists });
    } catch (error) {
        console.error('Error fetching chemists:', error);
        res.status(500).json({ success: false, error: 'Error fetching chemists' });
    }
});

// POST /api/chemists - Crear nuevo chemist
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Chemist name is required' 
            });
        }

        const chemist = new Chemist({ name: name.trim() });
        const savedChemist = await chemist.save();
        
        res.status(201).json({ success: true, data: savedChemist });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ 
                success: false, 
                error: 'Chemist name already exists' 
            });
        } else {
            console.error('Error creating chemist:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Error creating chemist' 
            });
        }
    }
});

// PUT /api/chemists/:id - Actualizar chemist
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Chemist name is required' 
            });
        }

        const updatedChemist = await Chemist.findByIdAndUpdate(
            id, 
            { name: name.trim() }, 
            { new: true, runValidators: true }
        );
        
        if (!updatedChemist) {
            return res.status(404).json({ 
                success: false, 
                error: 'Chemist not found' 
            });
        }
        
        res.json({ success: true, data: updatedChemist });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ 
                success: false, 
                error: 'Chemist name already exists' 
            });
        } else {
            console.error('Error updating chemist:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Error updating chemist' 
            });
        }
    }
});

// DELETE /api/chemists/:id - Eliminar chemist (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedChemist = await Chemist.findByIdAndDelete(id);
        
        if (!deletedChemist) {
            return res.status(404).json({ 
                success: false, 
                error: 'Chemist not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Chemist "${deletedChemist.name}" deleted successfully`,
            data: deletedChemist 
        });
    } catch (error) {
        console.error('Error deleting chemist:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting chemist' 
        });
    }
});

// GET /api/chemists/debug - Debug endpoint
router.get('/debug', async (req, res) => {
    try {
        const chemists = await Chemist.find({});
        res.json({
            success: true,
            debug: {
                total: chemists.length,
                chemists: chemists,
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