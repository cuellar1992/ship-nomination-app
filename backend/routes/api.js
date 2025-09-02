// routes/api.js - Rutas API actualizadas
const express = require('express');
const router = express.Router();

// Importar todas las rutas
const clientRoutes = require('./clients');
const agentRoutes = require('./agents');
const terminalRoutes = require('./terminals');
const berthRoutes = require('./berths');  
const surveyorRoutes = require('./surveyors');
const samplersRoutes = require('./samplers');
const chemistsRoutes = require('./chemists'); 
const producttypesRoutes = require('./producttypes');
const shipnominationsRoutes = require('./shipnominations');
const samplingRosterRoutes = require('./samplingrosters');
const truckWorkDayRoutes = require('./truckworkdays');

// Registrar rutas
router.use('/clients', clientRoutes);
router.use('/agents', agentRoutes);
router.use('/terminals', terminalRoutes);
router.use('/berths', berthRoutes); 
router.use('/surveyors', surveyorRoutes);
router.use('/samplers', samplersRoutes);  
router.use('/chemists', chemistsRoutes); 
router.use('/producttypes', producttypesRoutes);
router.use('/shipnominations', shipnominationsRoutes); 
router.use('/sampling-rosters', samplingRosterRoutes);   
router.use('/truckworkdays', truckWorkDayRoutes);

// GET /api/test - Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ 
        message: 'API funcionando desde rutas organizadas', 
        timestamp: new Date().toISOString(),
        server: 'Node.js + Express',
        route: 'Modular'
    });
});

// GET /api/info - Información del sistema
router.get('/info', (req, res) => {
    res.json({
        project: 'Premium System',
        version: '1.0.0',
        frontend: 'Served by Node.js',
        backend: 'Express.js',
        status: 'running',
        routes: 'Organized'
    });
});

// GET /api/health - Estado del servidor
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// GET /api/ships - Placeholder para ships (futuro)
router.get('/ships', (req, res) => {
    res.json({
        message: 'Ships endpoint ready',
        data: [],
        count: 0
    });
});

// GET /api/roster - Placeholder para roster (futuro) 
router.get('/roster', (req, res) => {
    res.json({
        message: 'Legacy roster endpoint - Use /api/sampling-rosters instead', 
        redirect: '/api/sampling-rosters',
        data: [],
        count: 0
    });
});

module.exports = router;