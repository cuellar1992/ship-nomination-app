// backend/routes/clients.js - SIMPLIFICADO con Hard Delete
const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// GET /api/clients - Obtener todos los clients
router.get('/', async (req, res) => {
    try {
        const clients = await Client.find({})
            .sort({ name: 1 }); // Ordenar alfabéticamente
        
        res.json({
            success: true,
            data: clients,
            count: clients.length
        });
    } catch (error) {
        console.error('Error obteniendo clients:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo clients',
            error: error.message
        });
    }
});

// POST /api/clients - Crear nuevo client
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del cliente es requerido'
            });
        }
        
        const trimmedName = name.trim();
        
        // Verificar si ya existe
        const existingClient = await Client.findOne({ name: trimmedName });
        
        if (existingClient) {
            return res.status(400).json({
                success: false,
                message: 'El cliente ya existe',
                action: 'duplicate'
            });
        }
        
        // Crear nuevo client
        const newClient = new Client({
            name: trimmedName
        });
        
        await newClient.save();
        
        console.log(`✅ New client "${trimmedName}" created`);
        
        res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            action: 'created',
            data: newClient
        });
        
    } catch (error) {
        console.error('Error creando client:', error);
        
        // Manejar error de duplicado
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'El cliente ya existe',
                action: 'duplicate'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creando cliente',
            error: error.message
        });
    }
});

// PUT /api/clients/:id - Actualizar client
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del cliente es requerido'
            });
        }
        
        const trimmedName = name.trim();
        
        // Verificar que el client existe
        const clientToUpdate = await Client.findById(id);
        if (!clientToUpdate) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }
        
        // Si el nombre no cambió, solo actualizar timestamp
        if (clientToUpdate.name === trimmedName) {
            const updatedClient = await Client.findByIdAndUpdate(
                id,
                { updatedAt: new Date() },
                { new: true }
            );
            
            return res.json({
                success: true,
                message: 'Cliente actualizado',
                action: 'no_change',
                data: updatedClient
            });
        }
        
        // Verificar si otro client ya tiene ese nombre
        const existingClient = await Client.findOne({ 
            name: trimmedName,
            _id: { $ne: id }
        });
        
        if (existingClient) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe otro cliente con ese nombre',
                action: 'duplicate'
            });
        }
        
        // Actualizar el nombre
        const updatedClient = await Client.findByIdAndUpdate(
            id,
            { name: trimmedName },
            { new: true, runValidators: true }
        );
        
        console.log(`✅ Client updated: "${clientToUpdate.name}" → "${trimmedName}"`);
        
        res.json({
            success: true,
            message: 'Cliente actualizado exitosamente',
            action: 'updated',
            data: updatedClient,
            oldName: clientToUpdate.name,
            newName: trimmedName
        });
        
    } catch (error) {
        console.error('Error actualizando client:', error);
        
        // Manejar error de duplicado
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe otro cliente con ese nombre',
                action: 'duplicate'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error actualizando cliente',
            error: error.message
        });
    }
});

// DELETE /api/clients/:id - Hard delete (eliminar permanentemente)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const client = await Client.findByIdAndDelete(id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }
        
        console.log(`✅ Client hard deleted: "${client.name}"`);
        
        res.json({
            success: true,
            message: 'Cliente eliminado permanentemente',
            action: 'hard_deleted',
            clientName: client.name
        });
        
    } catch (error) {
        console.error('Error eliminando client:', error);
        res.status(500).json({
            success: false,
            message: 'Error eliminando cliente',
            error: error.message
        });
    }
});

// GET /api/clients/debug - Ver todos los clients (debug)
router.get('/debug', async (req, res) => {
    try {
        const allClients = await Client.find({})
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            debug: true,
            totalInDatabase: allClients.length,
            clients: allClients.map(client => ({
                _id: client._id,
                name: client.name,
                createdAt: client.createdAt,
                updatedAt: client.updatedAt
            }))
        });
    } catch (error) {
        console.error('Error obteniendo debug clients:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo debug clients',
            error: error.message
        });
    }
});

module.exports = router;