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
app.use(express.static(path.join(__dirname, '..')));

// Usar las rutas API organizadas
app.use('/api', apiRoutes);

// Ruta raíz que redirige al index.html
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Función para iniciar el servidor
async function startServer() {
    try {
        // DEBUG: Verificar archivos
        const fs = require('fs');
        const indexPath = path.join(__dirname, '..', 'index.html');
        console.log('🔍 Buscando index.html en:', indexPath);
        console.log('✅ index.html encontrado:', fs.existsSync(indexPath));
        
        // Conectar a MongoDB Atlas
        await databaseManager.connect();
        
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://seahorse-app-u8jyg.ondigitalocean.app' 
            : `http://localhost:${PORT}`;
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📁 Aplicación disponible en: ${baseUrl}`);
            console.log(`📊 Estado de MongoDB: ${databaseManager.getConnectionStatus()}`);
            console.log(`📡 Páginas disponibles:`);
            console.log(`   • ${baseUrl}/ (index.html)`);
            console.log(`   • ${baseUrl}/sampling-roster.html`);
            console.log(`   • ${baseUrl}/ship-nominations.html`);
            console.log(`📡 API endpoints:`);
            console.log(`   • ${baseUrl}/api/health`);
            console.log(`   • ${baseUrl}/api/test`);
            console.log(`   • ${baseUrl}/api/ships`);
            console.log(`   • ${baseUrl}/api/roster`);
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