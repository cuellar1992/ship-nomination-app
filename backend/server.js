// server.js - Servidor con MongoDB Atlas
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const path = require('path');

// Importar módulos
const databaseManager = require('./config/database');
const apiRoutes = require('./routes/api');

// Crear la aplicación Express
const app = express();

// Puerto donde correrá el servidor
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(express.json()); // Para parsear JSON
app.use(express.urlencoded({ extended: true })); // Para parsear formularios

// Servir archivos estáticos desde la carpeta raíz del proyecto
app.use(express.static(path.join(__dirname, 'public')));

// Usar las rutas API organizadas
app.use('/api', apiRoutes);

// Ruta raíz que redirige al index.html
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Función para iniciar el servidor
async function startServer() {
    try {
        // DEBUG: Verificar archivos en la nueva ubicación
        const fs = require('fs');
        const indexPath = path.join(__dirname, 'public', 'index.html');
        console.log('🔍 Buscando index.html en:', indexPath);
        console.log('✅ index.html encontrado:', fs.existsSync(indexPath));
        
        // Verificar contenido de la carpeta public
        const publicDir = path.join(__dirname, 'public');
        if (fs.existsSync(publicDir)) {
            console.log('📁 Archivos en /public:', fs.readdirSync(publicDir));
        }
        
        // Conectar a MongoDB Atlas
        await databaseManager.connect();
        
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://monkfish-app-aej83.ondigitalocean.app' 
            : `http://localhost:${PORT}`;
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 ========================================`);
            console.log(`🚢 SHIP NOMINATION SYSTEM v2.4 - Auto-save Incremental`);
            console.log(`🚀 ========================================`);
            console.log(`📡 Servidor corriendo en puerto ${PORT}`);
            console.log(`🌐 Aplicación disponible en: ${baseUrl}`);
            console.log(`📊 Estado de MongoDB: ${databaseManager.getConnectionStatus()}`);
            console.log(`\n📁 Páginas disponibles:`);
            console.log(`   • ${baseUrl}/ (index.html)`);
            console.log(`   • ${baseUrl}/sampling-roster.html`);
            console.log(`   • ${baseUrl}/ship-nominations.html`);
            console.log(`\n📡 API endpoints principales:`);
            console.log(`   • ${baseUrl}/api/health - Estado del servidor`);
            console.log(`   • ${baseUrl}/api/info - Información del sistema`);
            console.log(`   • ${baseUrl}/api/test - Ruta de prueba`);
            console.log(`\n📡 API endpoints de negocio:`);
            console.log(`   • ${baseUrl}/api/shipnominations - Gestión de nominaciones`);
            console.log(`   • ${baseUrl}/api/sampling-rosters - Cronogramas de muestreo`);
            console.log(`   • ${baseUrl}/api/samplers - Gestión de muestreadores`);
            console.log(`   • ${baseUrl}/api/surveyors - Gestión de inspectores`);
            console.log(`   • ${baseUrl}/api/chemists - Gestión de químicos`);
            console.log(`   • ${baseUrl}/api/clients - Gestión de clientes`);
            console.log(`   • ${baseUrl}/api/agents - Gestión de agentes`);
            console.log(`   • ${baseUrl}/api/terminals - Gestión de terminales`);
            console.log(`   • ${baseUrl}/api/berths - Gestión de muelles`);
            console.log(`   • ${baseUrl}/api/producttypes - Tipos de productos`);
            console.log(`\n📊 Total: 25+ endpoints RESTful implementados`);
            console.log(`🚀 ========================================\n`);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando el servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre graceful del servidor
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando servidor...');
    await databaseManager.disconnect();
    process.exit(0);
});

// Iniciar servidor
startServer();