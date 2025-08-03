const express = require('express');
const router = express.Router();
const Terminal = require('../models/Terminal');

// GET / - Obtener todos los terminals
router.get('/', async (req, res) => {
    try {
        const terminals = await Terminal.find().sort({ name: 1 });
        res.json({ success: true, data: terminals });
    } catch (error) {
        console.error('Error fetching terminals:', error);
        res.status(500).json({ success: false, error: 'Error fetching terminals' });
    }
});

// POST / - Crear nuevo terminal
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Terminal name is required' });
        }

        const trimmedName = name.trim();
        
        // Verificar si ya existe
        const existingTerminal = await Terminal.findOne({ 
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
        });
        
        if (existingTerminal) {
            return res.status(409).json({ success: false, error: 'Terminal already exists' });
        }

        const newTerminal = new Terminal({ name: trimmedName });
        const savedTerminal = await newTerminal.save();
        
        res.status(201).json({ success: true, data: savedTerminal });
    } catch (error) {
        console.error('Error creating terminal:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({ success: false, error: 'Terminal already exists' });
        }
        
        res.status(500).json({ success: false, error: 'Error creating terminal' });
    }
});

// PUT /:id - Actualizar terminal
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Terminal name is required' });
        }

        const trimmedName = name.trim();
        
        // Verificar si ya existe otro terminal con ese nombre
        const existingTerminal = await Terminal.findOne({ 
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
            _id: { $ne: id }
        });
        
        if (existingTerminal) {
            return res.status(409).json({ success: false, error: 'Terminal already exists' });
        }

        const updatedTerminal = await Terminal.findByIdAndUpdate(
            id,
            { name: trimmedName },
            { new: true, runValidators: true }
        );

        if (!updatedTerminal) {
            return res.status(404).json({ success: false, error: 'Terminal not found' });
        }

        res.json({ success: true, data: updatedTerminal });
    } catch (error) {
        console.error('Error updating terminal:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({ success: false, error: 'Terminal already exists' });
        }
        
        res.status(500).json({ success: false, error: 'Error updating terminal' });
    }
});

// DELETE /:id - Eliminar terminal (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedTerminal = await Terminal.findByIdAndDelete(id);

        if (!deletedTerminal) {
            return res.status(404).json({ success: false, error: 'Terminal not found' });
        }

        res.json({ success: true, message: 'Terminal deleted successfully', data: deletedTerminal });
    } catch (error) {
        console.error('Error deleting terminal:', error);
        res.status(500).json({ success: false, error: 'Error deleting terminal' });
    }
});

// GET /debug - Debug endpoint
router.get('/debug', async (req, res) => {
    try {
        const terminals = await Terminal.find();
        const count = await Terminal.countDocuments();
        
        res.json({
            message: 'Terminals debug info',
            count: count,
            terminals: terminals,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Error fetching debug info' });
    }
});

module.exports = router;