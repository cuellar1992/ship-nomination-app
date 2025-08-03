const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

// GET / - Obtener todos los agents
router.get('/', async (req, res) => {
    try {
        const agents = await Agent.find().sort({ name: 1 });
        res.json({ success: true, data: agents });
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ error: 'Error fetching agents' });
    }
});

// POST / - Crear nuevo agent
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Agent name is required' });
        }

        const trimmedName = name.trim();
        
        // Verificar si ya existe
        const existingAgent = await Agent.findOne({ 
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
        });
        
        if (existingAgent) {
            return res.status(409).json({ error: 'Agent already exists' });
        }

        const newAgent = new Agent({ name: trimmedName });
        const savedAgent = await newAgent.save();
        
        res.status(201).json({ success: true, data: savedAgent });
    } catch (error) {
        console.error('Error creating agent:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Agent already exists' });
        }
        
        res.status(500).json({ error: 'Error creating agent' });
    }
});

// PUT /:id - Actualizar agent
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Agent name is required' });
        }

        const trimmedName = name.trim();
        
        // Verificar si ya existe otro agent con ese nombre
        const existingAgent = await Agent.findOne({ 
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
            _id: { $ne: id }
        });
        
        if (existingAgent) {
            return res.status(409).json({ error: 'Agent already exists' });
        }

        const updatedAgent = await Agent.findByIdAndUpdate(
            id,
            { name: trimmedName },
            { new: true, runValidators: true }
        );

        if (!updatedAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json({ success: true, data: updatedAgent });
    } catch (error) {
        console.error('Error updating agent:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Agent already exists' });
        }
        
        res.status(500).json({ error: 'Error updating agent' });
    }
});

// DELETE /:id - Eliminar agent (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedAgent = await Agent.findByIdAndDelete(id);

        if (!deletedAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json({ success: true, message: 'Agent deleted successfully', data: deletedAgent });
    } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ error: 'Error deleting agent' });
    }
});

// GET /debug - Debug endpoint
router.get('/debug', async (req, res) => {
    try {
        const agents = await Agent.find();
        const count = await Agent.countDocuments();
        
        res.json({
            message: 'Agents debug info',
            count: count,
            agents: agents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Error fetching debug info' });
    }
});

module.exports = router;