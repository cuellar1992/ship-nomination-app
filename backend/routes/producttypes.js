// backend/routes/producttypes.js
const express = require('express');
const router = express.Router();
const ProductType = require('../models/ProductType');

// GET /api/producttypes - Obtener todos los product types
router.get('/', async (req, res) => {
    try {
        const productTypes = await ProductType.find({}).sort({ name: 1 });
        res.json({ success: true, data: productTypes });
    } catch (error) {
        console.error('Error fetching product types:', error);
        res.status(500).json({ success: false, error: 'Error fetching product types' });
    }
});

// POST /api/producttypes - Crear nuevo product type
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Product type name is required' 
            });
        }

        const productType = new ProductType({ name: name.trim() });
        const savedProductType = await productType.save();
        
        res.status(201).json({ success: true, data: savedProductType });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ 
                success: false, 
                error: 'Product type name already exists' 
            });
        } else {
            console.error('Error creating product type:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Error creating product type' 
            });
        }
    }
});

// PUT /api/producttypes/:id - Actualizar product type
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Product type name is required' 
            });
        }

        const updatedProductType = await ProductType.findByIdAndUpdate(
            id, 
            { name: name.trim() }, 
            { new: true, runValidators: true }
        );
        
        if (!updatedProductType) {
            return res.status(404).json({ 
                success: false, 
                error: 'Product type not found' 
            });
        }
        
        res.json({ success: true, data: updatedProductType });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ 
                success: false, 
                error: 'Product type name already exists' 
            });
        } else {
            console.error('Error updating product type:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Error updating product type' 
            });
        }
    }
});

// DELETE /api/producttypes/:id - Eliminar product type (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedProductType = await ProductType.findByIdAndDelete(id);
        
        if (!deletedProductType) {
            return res.status(404).json({ 
                success: false, 
                error: 'Product type not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Product type "${deletedProductType.name}" deleted successfully`,
            data: deletedProductType 
        });
    } catch (error) {
        console.error('Error deleting product type:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting product type' 
        });
    }
});

// GET /api/producttypes/debug - Debug endpoint
router.get('/debug', async (req, res) => {
    try {
        const productTypes = await ProductType.find({});
        res.json({
            success: true,
            debug: {
                total: productTypes.length,
                productTypes: productTypes,
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