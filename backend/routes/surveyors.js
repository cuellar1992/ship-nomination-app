const express = require('express');
const router = express.Router();
const Surveyor = require('../models/Surveyor');

// GET / - Obtener todos los surveyors CON INFORMACIÓN COMPLETA
router.get('/', async (req, res) => {
    try {
        const surveyors = await Surveyor.find({}).sort({ name: 1 });
        
        // IMPORTANTE: Asegurar que _id esté presente, NO id
        const formattedSurveyors = surveyors.map(surveyor => ({
            _id: surveyor._id,  // USAR _id, no id
            name: surveyor.name,
            email: surveyor.email || null,
            phone: surveyor.phone || null,
            hasEmail: !!(surveyor.email && surveyor.email.trim()),
            createdAt: surveyor.createdAt,
            updatedAt: surveyor.updatedAt
        }));
        
        res.json({ success: true, data: formattedSurveyors });
    } catch (error) {
        console.error('Error fetching surveyors:', error);
        res.status(500).json({ success: false, message: 'Error fetching surveyors' });
    }
});

// POST / - Crear nuevo surveyor CON EMAIL/PHONE OPCIONALES
router.post('/', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        // Preparar datos con campos extendidos
        const surveyorData = { name: name.trim() };
        
        if (email && email.trim() !== '') {
            surveyorData.email = email.trim().toLowerCase();
        }
        if (phone && phone.trim() !== '') {
            surveyorData.phone = phone.trim();
        }

        const surveyor = new Surveyor(surveyorData);
        const savedSurveyor = await surveyor.save();
        
        // Devolver datos formateados consistentemente con _id
        const responseData = {
            _id: savedSurveyor._id,  // USAR _id
            name: savedSurveyor.name,
            email: savedSurveyor.email || null,
            phone: savedSurveyor.phone || null,
            hasEmail: !!(savedSurveyor.email && savedSurveyor.email.trim()),
            createdAt: savedSurveyor.createdAt,
            updatedAt: savedSurveyor.updatedAt
        };
        
        res.status(201).json({ 
            success: true, 
            data: responseData,
            message: `Surveyor "${savedSurveyor.name}" created successfully`
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Surveyor already exists' });
        } else if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            res.status(400).json({ 
                success: false, 
                error: 'Validation failed',
                details: validationErrors
            });
        } else {
            console.error('Error creating surveyor:', error);
            res.status(500).json({ success: false, message: 'Error creating surveyor' });
        }
    }
});

// PUT /:id - Actualizar surveyor existente CON EMAIL/PHONE
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        // Preparar datos de actualización con campos extendidos
        const updateData = { name: name.trim() };
        
        // Manejar email (puede ser vacío para remover)
        if (email !== undefined) {
            updateData.email = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
        }
        
        // Manejar phone (puede ser vacío para remover)
        if (phone !== undefined) {
            updateData.phone = phone && phone.trim() !== '' ? phone.trim() : null;
        }

        const updatedSurveyor = await Surveyor.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedSurveyor) {
            return res.status(404).json({ success: false, message: 'Surveyor not found' });
        }

        // Devolver datos formateados consistentemente con _id
        const responseData = {
            _id: updatedSurveyor._id,  // USAR _id
            name: updatedSurveyor.name,
            email: updatedSurveyor.email || null,
            phone: updatedSurveyor.phone || null,
            hasEmail: !!(updatedSurveyor.email && updatedSurveyor.email.trim()),
            createdAt: updatedSurveyor.createdAt,
            updatedAt: updatedSurveyor.updatedAt
        };

        res.json({ 
            success: true, 
            data: responseData,
            message: `Surveyor "${updatedSurveyor.name}" updated successfully`
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Surveyor name already exists' });
        } else if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            res.status(400).json({ 
                success: false, 
                error: 'Validation failed',
                details: validationErrors
            });
        } else {
            console.error('Error updating surveyor:', error);
            res.status(500).json({ success: false, message: 'Error updating surveyor' });
        }
    }
});

// DELETE /:id - Eliminar surveyor (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedSurveyor = await Surveyor.findByIdAndDelete(id);
        
        if (!deletedSurveyor) {
            return res.status(404).json({ success: false, message: 'Surveyor not found' });
        }

        res.json({ 
            success: true, 
            message: `Surveyor "${deletedSurveyor.name}" deleted successfully`,
            data: {
                _id: deletedSurveyor._id,  // USAR _id
                name: deletedSurveyor.name,
                email: deletedSurveyor.email || null,
                phone: deletedSurveyor.phone || null
            }
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
                surveyors: surveyors.map(s => ({
                    _id: s._id,  // USAR _id
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone || null,
                    hasEmail: !!(s.email && s.email.trim()),
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt
                })),
                collectionName: Surveyor.collection.name,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in surveyors debug:', error);
        res.status(500).json({ success: false, message: 'Debug error', error: error.message });
    }
});

module.exports = router;